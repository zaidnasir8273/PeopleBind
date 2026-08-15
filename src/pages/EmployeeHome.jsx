import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { SkeletonStatRow } from '../components/Skeleton'

function fmt(n) {
  return 'Rs. ' + Number(n ?? 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

export default function EmployeeHome() {
  const { employeeRecord } = useAuth()
  const [leaveSummary, setLeaveSummary] = useState(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [latestPayslip, setLatestPayslip] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!employeeRecord) return
    setLoading(true)

    const year = new Date().getFullYear()

    const [{ data: balances }, { data: pending }, { data: items }] = await Promise.all([
      supabase.from('v_leave_usage').select('leave_type, entitled_days, used_days, remaining_days').eq('employee_id', employeeRecord.id).eq('year', year),
      supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('employee_id', employeeRecord.id).eq('status', 'pending'),
      supabase
        .from('payroll_items')
        .select('amount, component_type, payroll_run_id, payroll_runs(status, created_at, payroll_periods(label))')
        .eq('employee_id', employeeRecord.id),
    ])

    const totalRemaining = (balances ?? []).reduce((sum, b) => sum + Number(b.remaining_days), 0)
    setLeaveSummary({ totalRemaining, types: balances ?? [] })
    setPendingCount(pending?.length ?? 0)

    const finalizedItems = (items ?? []).filter((i) => i.payroll_runs?.status === 'finalized')
    const byRun = {}
    for (const item of finalizedItems) {
      if (!byRun[item.payroll_run_id]) byRun[item.payroll_run_id] = { label: item.payroll_runs?.payroll_periods?.label, net: 0, created_at: item.payroll_runs?.created_at }
      byRun[item.payroll_run_id].net += item.component_type === 'earning' ? Number(item.amount) : -Number(item.amount)
    }
    const runs = Object.values(byRun).sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    setLatestPayslip(runs[0] ?? null)

    setLoading(false)
  }, [employeeRecord])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="page-inner" style={{ maxWidth: 900 }}>
        <SkeletonStatRow count={3} />
      </div>
    )
  }

  return (
    <div className="page-inner" style={{ maxWidth: 900 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">EMPLOYEE PORTAL</p>
          <h1 className="page-title">Hi, {employeeRecord?.full_name?.split(' ')[0]}</h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 8 }}>
        <div className="report-section" style={{ marginBottom: 0 }}>
          <p className="section-heading">Leave remaining</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: 0 }}>
            {leaveSummary?.totalRemaining ?? 0} <span style={{ fontSize: 14, color: 'var(--ink-soft)', fontWeight: 500 }}>days</span>
          </p>
          <Link to="/employee/leave" className="link-button" style={{ fontSize: 13 }}>Request leave →</Link>
        </div>

        <div className="report-section" style={{ marginBottom: 0 }}>
          <p className="section-heading">Pending requests</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: 0 }}>{pendingCount}</p>
          <Link to="/employee/leave" className="link-button" style={{ fontSize: 13 }}>View leave →</Link>
        </div>

        <div className="report-section" style={{ marginBottom: 0 }}>
          <p className="section-heading">Latest payslip</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, margin: 0 }}>
            {latestPayslip ? fmt(latestPayslip.net) : '—'}
          </p>
          <Link to="/employee/payslips" className="link-button" style={{ fontSize: 13 }}>View payslips →</Link>
        </div>
      </div>
    </div>
  )
}
