import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'
import { SkeletonTable } from '../components/Skeleton'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const EMPTY_FORM = { asset_type: '', description: '', assigned_date: new Date().toISOString().slice(0, 10) }
const COMMON_TYPES = ['Laptop', 'Monitor', 'Phone', 'ID card', 'Vehicle', 'SIM card']

export default function Assets() {
  const { profile, company } = useAuth()
  const [employees, setEmployees] = useState([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(false)
  const [assignedCount, setAssignedCount] = useState(0)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const loadEmployees = useCallback(async () => {
    const { data } = await supabase.from('employees').select('id, employee_code, full_name').in('employment_status', ['training', 'probation', 'confirmed']).order('full_name')
    setEmployees(data ?? [])
  }, [])

  const loadAssignedCount = useCallback(async () => {
    const { count } = await supabase.from('assets').select('id', { count: 'exact', head: true }).eq('status', 'assigned')
    setAssignedCount(count ?? 0)
  }, [])

  const loadAssets = useCallback(async () => {
    if (!selectedEmployeeId) {
      setAssets([])
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('assets')
      .select('id, asset_type, description, assigned_date, returned_date, status')
      .eq('employee_id', selectedEmployeeId)
      .order('assigned_date', { ascending: false })
    setAssets(data ?? [])
    setLoading(false)
  }, [selectedEmployeeId])

  useEffect(() => {
    loadEmployees()
    loadAssignedCount()
  }, [loadEmployees, loadAssignedCount])

  useEffect(() => {
    loadAssets()
  }, [loadAssets])

  function openAssign() {
    setForm({ ...EMPTY_FORM })
    setError(null)
    setDrawerOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const { error: saveError } = await supabase.from('assets').insert({
      company_id: company.id,
      employee_id: selectedEmployeeId,
      asset_type: form.asset_type,
      description: form.description || null,
      assigned_date: form.assigned_date,
      status: 'assigned',
    })

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      toast.error(saveError.message || 'Something went wrong')
      return
    }

    toast.success('Asset assigned')
    setDrawerOpen(false)
    loadAssets()
    loadAssignedCount()
  }

  async function markReturned(asset) {
    const { error } = await supabase
      .from('assets')
      .update({ status: 'returned', returned_date: new Date().toISOString().slice(0, 10) })
      .eq('id', asset.id)
    if (!error) {
      toast.success('Marked as returned')
      loadAssets()
      loadAssignedCount()
    }
  }

  async function markLost(asset) {
    const { error } = await supabase.from('assets').update({ status: 'lost' }).eq('id', asset.id)
    if (!error) {
      toast.success('Marked as lost')
      loadAssets()
      loadAssignedCount()
    }
  }

  return (
    <div className="page-inner" style={{ maxWidth: 900 }}>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Assets</h1>
        </div>
        <span className="report-stat">{assignedCount} currently assigned</span>
      </div>

      <div className="field-row" style={{ maxWidth: 320, marginBottom: 4, alignItems: 'flex-end', gap: 12 }}>
        <label className="field" style={{ flex: 1 }}>
          <span>Employee</span>
          <select value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)}>
            <option value="">— Select employee —</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.full_name}</option>
            ))}
          </select>
        </label>
        {selectedEmployeeId && (
          <button className="btn-primary btn-icon" onClick={openAssign} style={{ marginBottom: 2 }}>
            <Plus size={16} /> Assign asset
          </button>
        )}
      </div>

      {!selectedEmployeeId ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>Select an employee to view or assign their equipment.</p>
        </div>
      ) : loading ? (
        <SkeletonTable rows={5} columns={6} />
      ) : assets.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>No assets assigned yet.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Type</th><th>Description</th><th>Assigned</th><th>Returned</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id} style={{ cursor: 'default' }}>
                <td>{a.asset_type}</td>
                <td>{a.description || '—'}</td>
                <td className="mono">{formatDate(a.assigned_date)}</td>
                <td className="mono">{a.returned_date ? formatDate(a.returned_date) : '—'}</td>
                <td>
                  <span className={`status-badge status-${a.status === 'assigned' ? 'active' : a.status === 'lost' ? 'rejected' : ''}`}>{a.status}</span>
                </td>
                <td>
                  {a.status === 'assigned' && (
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button className="link-button" onClick={() => markReturned(a)}>Mark returned</button>
                      <button className="link-button" onClick={() => markLost(a)}>Mark lost</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Assign asset">
        <form onSubmit={handleSubmit} className="drawer-form">
          <label className="field">
            <span>Asset type</span>
            <input required list="asset-types" value={form.asset_type} onChange={(e) => setForm({ ...form, asset_type: e.target.value })} placeholder="e.g. Laptop" />
            <datalist id="asset-types">
              {COMMON_TYPES.map((t) => <option key={t} value={t} />)}
            </datalist>
          </label>

          <label className="field">
            <span>Description</span>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. MacBook Air, serial ABC123" />
          </label>

          <label className="field">
            <span>Assigned date</span>
            <input type="date" required value={form.assigned_date} onChange={(e) => setForm({ ...form, assigned_date: e.target.value })} />
          </label>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={14} className="btn-spinner" />}
            {saving ? 'Assigning…' : 'Assign'}
          </button>
        </form>
      </Drawer>
    </div>
  )
}
