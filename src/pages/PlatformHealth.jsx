import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { SkeletonTable } from '../components/Skeleton'

const STALE_PAYROLL_DAYS = 35

function formatDate(ts) {
  if (!ts) return 'never'
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysSince(ts) {
  if (!ts) return null
  return Math.floor((Date.now() - new Date(ts).getTime()) / 86400000)
}

export default function PlatformHealth() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('v_company_health')
      .select('*')
      .order('company_name')
    setRows(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="page-inner" style={{ maxWidth: 1100 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">PLATFORM ADMIN</p>
          <h1 className="page-title">Company health</h1>
          <p className="page-subtitle">Pending approvals, payroll cadence, and open tickets across every company.</p>
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={5} columns={7} />
      ) : rows.length === 0 ? (
        <div className="empty-state"><p>No companies yet.</p></div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Employees</th>
              <th>Pending leave</th>
              <th>Pending expenses</th>
              <th>Pending corrections</th>
              <th>Last payroll run</th>
              <th>Open tickets</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const staleDays = daysSince(r.last_payroll_run_at)
              const stalePayroll = staleDays === null || staleDays > STALE_PAYROLL_DAYS
              const issues = r.pending_leave_requests + r.pending_expense_claims + r.pending_attendance_corrections + r.open_support_tickets
              const needsAttention = issues > 0 || stalePayroll
              return (
                <tr key={r.company_id} style={{ cursor: 'default' }}>
                  <td>
                    {r.company_name}
                    {r.is_demo && <span className="tab-count" style={{ marginLeft: 8, background: 'var(--ink-soft)' }}>demo</span>}
                  </td>
                  <td className="mono">{r.employee_count}</td>
                  <td className="mono" style={{ color: r.pending_leave_requests > 0 ? 'var(--warning)' : 'var(--ink-soft)' }}>{r.pending_leave_requests}</td>
                  <td className="mono" style={{ color: r.pending_expense_claims > 0 ? 'var(--warning)' : 'var(--ink-soft)' }}>{r.pending_expense_claims}</td>
                  <td className="mono" style={{ color: r.pending_attendance_corrections > 0 ? 'var(--warning)' : 'var(--ink-soft)' }}>{r.pending_attendance_corrections}</td>
                  <td className="mono" style={{ color: stalePayroll ? 'var(--danger)' : 'var(--ink-soft)' }}>
                    {formatDate(r.last_payroll_run_at)}{staleDays !== null && stalePayroll ? ` (${staleDays}d ago)` : ''}
                  </td>
                  <td className="mono" style={{ color: r.open_support_tickets > 0 ? 'var(--warning)' : 'var(--ink-soft)' }}>{r.open_support_tickets}</td>
                  <td>
                    <span className={`status-badge status-${needsAttention ? 'pending' : 'active'}`}>
                      {needsAttention ? 'Needs attention' : 'Healthy'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
