import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'

function fmt(n) {
  return 'Rs. ' + Number(n ?? 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

export default function EmployeePayslips() {
  const { employeeRecord } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeRun, setActiveRun] = useState(null)

  const load = useCallback(async () => {
    if (!employeeRecord) return
    setLoading(true)
    const { data } = await supabase
      .from('payroll_items')
      .select('id, component_name, component_type, amount, notes, payroll_run_id, payroll_runs(status, created_at, payroll_periods(label, period_start, period_end))')
      .eq('employee_id', employeeRecord.id)
    setItems((data ?? []).filter((i) => i.payroll_runs?.status === 'finalized'))
    setLoading(false)
  }, [employeeRecord])

  useEffect(() => {
    load()
  }, [load])

  const runs = useMemo(() => {
    const byRun = {}
    for (const item of items) {
      if (!byRun[item.payroll_run_id]) {
        byRun[item.payroll_run_id] = { id: item.payroll_run_id, label: item.payroll_runs?.payroll_periods?.label, created_at: item.payroll_runs?.created_at, earnings: 0, deductions: 0, items: [] }
      }
      byRun[item.payroll_run_id].items.push(item)
      if (item.component_type === 'earning') byRun[item.payroll_run_id].earnings += Number(item.amount)
      else byRun[item.payroll_run_id].deductions += Number(item.amount)
    }
    return Object.values(byRun).sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  }, [items])

  return (
    <div className="page-inner" style={{ maxWidth: 900 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">EMPLOYEE PORTAL</p>
          <h1 className="page-title">Payslips</h1>
        </div>
      </div>

      {loading ? (
        <p className="muted" style={{ marginTop: 20 }}>Loading…</p>
      ) : runs.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>No payslips yet.</p>
          <p className="muted">They'll show up here once a payroll run including you is finalized.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Period</th><th>Earnings</th><th>Deductions</th><th>Net</th></tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} onClick={() => setActiveRun(r)}>
                <td>{r.label}</td>
                <td className="mono">{fmt(r.earnings)}</td>
                <td className="mono">{fmt(r.deductions)}</td>
                <td className="mono">{fmt(r.earnings - r.deductions)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Drawer open={!!activeRun} onClose={() => setActiveRun(null)} title={activeRun?.label}>
        {activeRun && (
          <div className="payslip-drawer">
            {activeRun.items.map((item) => (
              <div key={item.id} className={`payslip-row${item.component_type === 'deduction' ? ' deduction' : ''}`}>
                <div>
                  <span className="label">{item.component_name}</span>
                  {item.notes && <span className="payslip-note">{item.notes}</span>}
                </div>
                <span className="amount">{item.component_type === 'deduction' ? '– ' : ''}{fmt(item.amount)}</span>
              </div>
            ))}
            <div className="payslip-row total">
              <span className="label">Net salary</span>
              <span className="amount">{fmt(activeRun.earnings - activeRun.deductions)}</span>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
