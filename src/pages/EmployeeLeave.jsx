import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const EMPTY_FORM = {
  leave_type_id: '',
  start_date: new Date().toISOString().slice(0, 10),
  end_date: new Date().toISOString().slice(0, 10),
  reason: '',
}

export default function EmployeeLeave() {
  const { employeeRecord, company, profile } = useAuth()
  const [balances, setBalances] = useState([])
  const [requests, setRequests] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [loading, setLoading] = useState(true)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!employeeRecord) return
    setLoading(true)
    const year = new Date().getFullYear()
    const [{ data: b }, { data: r }, { data: t }] = await Promise.all([
      supabase.from('v_leave_usage').select('leave_type, entitled_days, used_days, remaining_days').eq('employee_id', employeeRecord.id).eq('year', year),
      supabase.from('leave_requests').select('id, start_date, end_date, days_requested, reason, status, leave_types(name)').eq('employee_id', employeeRecord.id).order('created_at', { ascending: false }),
      supabase.from('leave_types').select('id, name, is_paid').order('name'),
    ])
    setBalances(b ?? [])
    setRequests(r ?? [])
    setLeaveTypes(t ?? [])
    setLoading(false)
  }, [employeeRecord])

  useEffect(() => {
    load()
  }, [load])

  function openNew() {
    setForm({ ...EMPTY_FORM })
    setError(null)
    setDrawerOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const { error: saveError } = await supabase.from('leave_requests').insert({
      company_id: company.id,
      employee_id: employeeRecord.id,
      leave_type_id: form.leave_type_id,
      start_date: form.start_date,
      end_date: form.end_date,
      reason: form.reason || null,
      requested_by: profile.id,
    })

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    toast.success('Leave request submitted')
    setDrawerOpen(false)
    load()
  }

  return (
    <div className="page-inner" style={{ maxWidth: 900 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">EMPLOYEE PORTAL</p>
          <h1 className="page-title">Leave</h1>
        </div>
        <button className="btn-primary btn-icon" onClick={openNew}>
          <Plus size={16} /> Request leave
        </button>
      </div>

      {loading ? (
        <p className="muted" style={{ marginTop: 20 }}>Loading…</p>
      ) : (
        <>
          <p className="section-heading">Balance this year</p>
          {balances.length === 0 ? (
            <p className="muted">No balance set yet — check with HR.</p>
          ) : (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
              {balances.map((b) => (
                <div key={b.leave_type} className="mini-card" style={{ minWidth: 140 }}>
                  <div className="muted" style={{ fontSize: 12 }}>{b.leave_type}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>{b.remaining_days}</div>
                  <div className="muted" style={{ fontSize: 11 }}>of {b.entitled_days} days</div>
                </div>
              ))}
            </div>
          )}

          <p className="section-heading">Your requests</p>
          {requests.length === 0 ? (
            <div className="empty-state"><p>No leave requests yet.</p></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Type</th><th>Dates</th><th>Days</th><th>Status</th></tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} style={{ cursor: 'default' }}>
                    <td>{r.leave_types?.name}</td>
                    <td className="mono">{formatDate(r.start_date)}{r.end_date !== r.start_date ? ` – ${formatDate(r.end_date)}` : ''}</td>
                    <td className="mono">{r.days_requested ?? '—'}</td>
                    <td><span className={`status-badge status-${r.status}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Request leave">
        <form onSubmit={handleSubmit} className="drawer-form">
          <label className="field">
            <span>Leave type</span>
            <select required value={form.leave_type_id} onChange={(e) => setForm({ ...form, leave_type_id: e.target.value })}>
              <option value="">— Select —</option>
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}{!t.is_paid ? ' (unpaid)' : ''}</option>
              ))}
            </select>
          </label>

          <div className="field-row">
            <label className="field">
              <span>Start date</span>
              <input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </label>
            <label className="field">
              <span>End date</span>
              <input type="date" required min={form.start_date} value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </label>
          </div>

          <label className="field">
            <span>Reason</span>
            <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Optional" />
          </label>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Submitting…' : 'Submit request'}
          </button>
        </form>
      </Drawer>
    </div>
  )
}
