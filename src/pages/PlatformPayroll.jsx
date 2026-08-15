import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { SkeletonTable } from '../components/Skeleton'

function fmt(n) {
  return 'Rs. ' + Number(n ?? 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function PlatformPayroll() {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('open')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: runRows }, { data: summaryRows }] = await Promise.all([
      supabase
        .from('payroll_runs')
        .select('id, status, created_at, companies(name), payroll_periods(label, period_start)')
        .order('created_at', { ascending: false }),
      supabase.from('v_payroll_run_summary').select('payroll_run_id, employee_count, total_net'),
    ])
    const summaryByRun = {}
    for (const s of summaryRows ?? []) summaryByRun[s.payroll_run_id] = s
    setRuns((runRows ?? []).map((r) => ({ ...r, summary: summaryByRun[r.id] })))
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const visible = filter === 'open' ? runs.filter((r) => r.status !== 'finalized') : runs

  return (
    <div className="page-inner" style={{ maxWidth: 1000 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">PLATFORM ADMIN</p>
          <h1 className="page-title">Payroll monitor</h1>
        </div>
      </div>

      <div className="field-row" style={{ maxWidth: 240, marginBottom: 4 }}>
        <label className="field">
          <span>Show</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="open">Not yet finalized</option>
            <option value="all">All runs</option>
          </select>
        </label>
      </div>

      {loading ? (
        <SkeletonTable rows={5} columns={6} />
      ) : visible.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>{filter === 'open' ? 'Nothing stuck — every run is finalized.' : 'No payroll runs yet.'}</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Period</th>
              <th>Status</th>
              <th>Employees</th>
              <th>Net</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} style={{ cursor: 'default' }}>
                <td>{r.companies?.name}</td>
                <td>{r.payroll_periods?.label}</td>
                <td><span className={`status-badge status-${r.status === 'finalized' ? 'approved' : r.status}`}>{r.status}</span></td>
                <td className="mono">{r.summary?.employee_count ?? '—'}</td>
                <td className="mono">{r.summary ? fmt(r.summary.total_net) : '—'}</td>
                <td className="mono">{formatDate(r.created_at?.slice(0, 10))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
