import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { Plus, Check, X as XIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'
import { SkeletonTable } from '../components/Skeleton'

const EMPTY_ENTRY = {
  employee_id: '',
  project_id: '',
  task_id: '',
  entry_date: new Date().toISOString().slice(0, 10),
  hours: '',
  notes: '',
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_FILTERS = ['all', 'pending', 'approved', 'rejected']

export default function Timesheet() {
  const { profile, company } = useAuth()

  const [employees, setEmployees] = useState([])
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_ENTRY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

  const loadLookups = useCallback(async () => {
    const [{ data: emps }, { data: projs }, { data: tsks }] = await Promise.all([
      supabase.from('employees').select('id, employee_code, full_name').eq('employment_status', 'active').order('full_name'),
      supabase.from('projects').select('id, name, clients(name)').eq('status', 'active').order('name'),
      supabase.from('timesheet_tasks').select('id, name').eq('status', 'active').order('name'),
    ])
    setEmployees(emps ?? [])
    setProjects(projs ?? [])
    setTasks(tsks ?? [])
  }, [])

  const loadEntries = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('time_entries')
      .select('id, entry_date, hours, notes, status, created_at, employees(full_name, employee_code), projects(name, clients(name)), timesheet_tasks(name)')
      .order('entry_date', { ascending: false })
    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    const { data } = await query.limit(200)
    setEntries(data ?? [])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => {
    loadLookups()
  }, [loadLookups])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  const pendingCount = useMemo(() => entries.filter((e) => e.status === 'pending').length, [entries])

  function openNewEntry() {
    setForm(EMPTY_ENTRY)
    setError(null)
    setDrawerOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const { error: saveError } = await supabase.from('time_entries').insert({
      company_id: company.id,
      employee_id: form.employee_id,
      project_id: form.project_id,
      task_id: form.task_id || null,
      entry_date: form.entry_date,
      hours: Number(form.hours),
      notes: form.notes || null,
      submitted_by: profile.id,
    })

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      toast.error(saveError.message || 'Something went wrong')
      return
    }

    toast.success('Time entry logged')
    setDrawerOpen(false)
    loadEntries()
  }

  async function review(id, status) {
    const { error: reviewError } = await supabase
      .from('time_entries')
      .update({ status, reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
      .eq('id', id)
    if (!reviewError) {
      toast.success(status === 'approved' ? 'Entry approved' : 'Entry rejected')
      loadEntries()
    } else {
      toast.error(reviewError.message)
    }
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAllPending() {
    const pendingIds = entries.filter((e) => e.status === 'pending').map((e) => e.id)
    setSelectedIds((prev) => (prev.size === pendingIds.length ? new Set() : new Set(pendingIds)))
  }

  async function bulkReview(status) {
    setBulkBusy(true)
    const ids = [...selectedIds]
    const { error: bulkError } = await supabase
      .from('time_entries')
      .update({ status, reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
      .in('id', ids)
    setBulkBusy(false)
    if (!bulkError) {
      toast.success(`${ids.length} entr${ids.length > 1 ? 'ies' : 'y'} ${status}`)
      setSelectedIds(new Set())
      loadEntries()
    } else {
      toast.error(bulkError.message)
    }
  }

  return (
    <div className="page-inner" style={{ maxWidth: 980 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">TIMESHEET</p>
          <h1 className="page-title">Timesheet</h1>
        </div>
        <button className="btn-primary btn-icon" onClick={openNewEntry}>
          <Plus size={16} /> Log time
        </button>
      </div>

      <div className="field-row" style={{ maxWidth: 220, marginBottom: 4 }}>
        <label className="field">
          <span>Status</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>{s === 'all' ? 'All' : s[0].toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </label>
      </div>

      {selectedIds.size > 0 && (
        <div className="bulk-action-bar">
          <span>{selectedIds.size} selected</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" disabled={bulkBusy} onClick={() => bulkReview('approved')}>Approve selected</button>
            <button className="btn-secondary" disabled={bulkBusy} onClick={() => bulkReview('rejected')}>Reject selected</button>
            <button className="link-button" onClick={() => setSelectedIds(new Set())}>Clear</button>
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={6} columns={7} />
      ) : entries.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>{pendingCount > 0 ? 'No entries.' : 'Nothing pending.'}</p>
          <p className="muted">Logged time will show up here for review.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}>
                <input
                  type="checkbox"
                  checked={selectedIds.size > 0 && selectedIds.size === entries.filter((e) => e.status === 'pending').length}
                  onChange={toggleSelectAllPending}
                />
              </th>
              <th>Employee</th>
              <th>Project</th>
              <th>Task</th>
              <th>Date</th>
              <th>Hours</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td onClick={(ev) => ev.stopPropagation()}>
                  {e.status === 'pending' && (
                    <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggleSelect(e.id)} />
                  )}
                </td>
                <td>
                  {e.employees?.full_name}
                  <span className="mono" style={{ display: 'block', color: 'var(--ink-soft)', fontSize: 12 }}>{e.employees?.employee_code}</span>
                </td>
                <td>{e.projects?.name}{e.projects?.clients?.name ? <span className="muted" style={{ display: 'block', fontSize: 12 }}>{e.projects.clients.name}</span> : null}</td>
                <td>{e.timesheet_tasks?.name ?? '—'}</td>
                <td className="mono">{formatDate(e.entry_date)}</td>
                <td className="mono">{e.hours}</td>
                <td><span className={`status-badge status-${e.status}`}>{e.status}</span></td>
                <td>
                  {e.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-icon-round approve" onClick={() => review(e.id, 'approved')} aria-label="Approve">
                        <Check size={14} />
                      </button>
                      <button className="btn-icon-round reject" onClick={() => review(e.id, 'rejected')} aria-label="Reject">
                        <XIcon size={14} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Log time">
        <form onSubmit={handleSubmit} className="drawer-form">
          <label className="field">
            <span>Employee</span>
            <select required value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
              <option value="">— Select —</option>
              {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
            </select>
          </label>

          <label className="field">
            <span>Project</span>
            <select required value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
              <option value="">— Select —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.clients?.name ? ` (${p.clients.name})` : ''}</option>)}
            </select>
          </label>

          <label className="field">
            <span>Task</span>
            <select value={form.task_id} onChange={(e) => setForm({ ...form, task_id: e.target.value })}>
              <option value="">—</option>
              {tasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>

          <div className="field-row">
            <label className="field">
              <span>Date</span>
              <input type="date" required value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} />
            </label>
            <label className="field">
              <span>Hours</span>
              <input type="number" min="0.25" step="0.25" required value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
            </label>
          </div>

          <label className="field">
            <span>Notes</span>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
          </label>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Log time'}
          </button>
        </form>
      </Drawer>
    </div>
  )
}
