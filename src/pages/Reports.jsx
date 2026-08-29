import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { DownloadIcon } from '../components/ui/download'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { SkeletonBlock, SkeletonTable } from '../components/Skeleton'
import { REPORT_CATEGORIES, REPORT_DEFINITIONS } from '../lib/reportCatalog'
import { csvEscape, exportCsv } from '../lib/csv'

const TEAL = '#1f7a63'
const TEAL_DEEP = '#123f33'
const GOLD = '#c98a2e'
const RED = '#b0473f'
const LINE = '#e2ddd0'
const INK_SOFT = '#5a6472'

function fmt(n) {
  return 'Rs. ' + Number(n ?? 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

function monthLabel(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}

function monthsAgo(n) {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const axisStyle = { fontSize: 12, fontFamily: 'Inter, sans-serif', fill: INK_SOFT }
const tooltipStyle = { fontSize: 13, fontFamily: 'Inter, sans-serif', borderRadius: 8, border: `1px solid ${LINE}` }

function ReportsNav({ tab, setTab }) {
  const [expanded, setExpanded] = useState(() => new Set())

  function toggleModule(key) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function selectSubmodule(moduleKey, submoduleKey) {
    setTab(submoduleKey)
    setExpanded((prev) => new Set(prev).add(moduleKey))
  }

  return (
    <nav className="settings-nav">
      {REPORT_CATEGORIES.map((mod) => {
        const isExpanded = expanded.has(mod.key)
        const isActiveModule = mod.submodules.some((s) => s.key === tab)
        const Icon = mod.icon

        return (
          <div key={mod.key} className="settings-module">
            <button
              type="button"
              className={`settings-module-header${isActiveModule ? ' active' : ''}`}
              onClick={() => toggleModule(mod.key)}
              aria-expanded={isExpanded}
            >
              <span className={`settings-module-icon settings-module-icon-${mod.color}`}>
                <Icon size={17} />
              </span>
              <span className="settings-module-label">{mod.label}</span>
              <ChevronDown size={14} className={`settings-module-chevron${isExpanded ? ' expanded' : ''}`} />
            </button>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  className="settings-submodule-list"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  {mod.submodules.map((sub) => (
                    <button
                      key={sub.key}
                      type="button"
                      className={`settings-submodule-item${tab === sub.key ? ' active' : ''}`}
                      onClick={() => selectSubmodule(mod.key, sub.key)}
                    >
                      {tab === sub.key && (
                        <motion.span
                          layoutId="reports-active-pill"
                          className="settings-submodule-pill"
                          transition={{ duration: 0.2 }}
                        />
                      )}
                      {sub.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </nav>
  )
}

function ReportTable({ reportKey, label }) {
  const { company } = useAuth()
  const def = REPORT_DEFINITIONS[reportKey]
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    setRows(null)
    setError(null)
    if (!def || def.unavailable) return
    def.fetch(company)
      .then((data) => { if (active) setRows(data) })
      .catch((e) => { if (active) setError(e.message || 'Failed to load report') })
    return () => { active = false }
  }, [def, company.id])

  if (!def) {
    return <div className="empty-state"><p>Report not found.</p></div>
  }

  if (def.unavailable) {
    return (
      <div className="empty-state">
        <p>Not available yet.</p>
        <p className="muted">{def.unavailable}</p>
      </div>
    )
  }

  return (
    <div className="report-section" style={{ marginBottom: 0 }}>
      <div className="report-section-head">
        <p className="section-heading" style={{ margin: 0 }}>{label}</p>
        {rows && rows.length > 0 && (
          <button type="button" className="link-button" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }} onClick={() => exportCsv(label, def.columns, rows)}>
            <DownloadIcon size={13} />
            Export CSV
          </button>
        )}
      </div>
      {def.note && <p className="muted" style={{ fontSize: 12, marginTop: -4 }}>{def.note}</p>}
      {error ? (
        <p className="muted" style={{ padding: '24px 0' }}>{error}</p>
      ) : rows === null ? (
        <SkeletonTable rows={5} columns={def.columns.length} />
      ) : rows.length === 0 ? (
        <p className="muted" style={{ padding: '24px 0' }}>No data for this report yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>{def.columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ cursor: 'default' }}>
                  {def.columns.map((c) => <td key={c.key}>{r[c.key] ?? '—'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ReportSection({ title, stat, extra, children }) {
  return (
    <div className="report-section" style={{ marginBottom: 0 }}>
      <div className="report-section-head">
        <p className="section-heading" style={{ margin: 0 }}>{title}</p>
        {stat && <span className="report-stat">{stat}</span>}
        {extra}
      </div>
      {children}
    </div>
  )
}

function EmptyChart({ text }) {
  return <p className="muted" style={{ padding: '24px 0' }}>{text}</p>
}

function HeadcountChart({ headcount }) {
  const total = headcount.reduce((sum, r) => sum + Number(r.count), 0)
  return (
    <ReportSection title="Headcount by department" stat={`${total} active`}>
      {headcount.length === 0 ? (
        <EmptyChart text="No active employees yet." />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={headcount} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid stroke={LINE} vertical={false} />
            <XAxis dataKey="name" tick={axisStyle} axisLine={{ stroke: LINE }} tickLine={false} />
            <YAxis allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" name="Employees" fill={TEAL_DEEP} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ReportSection>
  )
}

function AttendanceMonthlyChart({ attendance }) {
  return (
    <ReportSection title="Attendance — last 6 months">
      {attendance.length === 0 ? (
        <EmptyChart text="No attendance recorded in this window." />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={attendance} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid stroke={LINE} vertical={false} />
            <XAxis dataKey="label" tick={axisStyle} axisLine={{ stroke: LINE }} tickLine={false} />
            <YAxis allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'Inter, sans-serif' }} />
            <Bar dataKey="present" name="Present" stackId="a" fill={TEAL} />
            <Bar dataKey="late" name="Late" stackId="a" fill={GOLD} />
            <Bar dataKey="absent" name="Absent" stackId="a" fill={RED} />
            <Bar dataKey="leave" name="On leave" stackId="a" fill={LINE} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ReportSection>
  )
}

function LeaveUsageChart({ leave, leaveYear, setLeaveYear }) {
  return (
    <ReportSection
      title="Leave usage"
      extra={
        <select value={leaveYear} onChange={(e) => setLeaveYear(Number(e.target.value))} style={{ fontSize: 13 }}>
          {[leaveYear - 1, leaveYear, leaveYear + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      }
    >
      {leave.length === 0 ? (
        <EmptyChart text={`No leave balances set for ${leaveYear}.`} />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={leave} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid stroke={LINE} vertical={false} />
            <XAxis dataKey="type" tick={axisStyle} axisLine={{ stroke: LINE }} tickLine={false} />
            <YAxis allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'Inter, sans-serif' }} />
            <Bar dataKey="entitled" name="Entitled" fill={LINE} radius={[6, 6, 0, 0]} />
            <Bar dataKey="used" name="Used" fill={GOLD} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ReportSection>
  )
}

function ExpensesChart({ expenseTrend, expenseByCategory }) {
  return (
    <ReportSection title="Expenses — last 6 months">
      {expenseTrend.length === 0 ? (
        <EmptyChart text="No approved or reimbursed claims in this window." />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={expenseTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke={LINE} vertical={false} />
              <XAxis dataKey="label" tick={axisStyle} axisLine={{ stroke: LINE }} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
              <Line type="monotone" dataKey="total" name="Total claimed" stroke={TEAL_DEEP} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          {expenseByCategory.length > 0 && (
            <>
              <p className="section-heading" style={{ margin: '16px 0 8px' }}>By category — most recent month</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={expenseByCategory} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke={LINE} horizontal={false} />
                  <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} width={110} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
                  <Bar dataKey="amount" fill={GOLD} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </>
      )}
    </ReportSection>
  )
}

function PayrollChart({ payroll }) {
  return (
    <ReportSection title="Payroll by period">
      {payroll.length === 0 ? (
        <EmptyChart text="No payroll runs calculated yet." />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={payroll} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid stroke={LINE} vertical={false} />
            <XAxis dataKey="period_label" tick={axisStyle} axisLine={{ stroke: LINE }} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
            <Bar dataKey="total_net" name="Net pay" fill={TEAL} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ReportSection>
  )
}

export default function Reports() {
  const { company } = useAuth()
  const [tab, setTab] = useState('ov-directory')
  const [headcount, setHeadcount] = useState([])
  const [attendance, setAttendance] = useState([])
  const [leave, setLeave] = useState([])
  const [leaveYear, setLeaveYear] = useState(new Date().getFullYear())
  const [expenseTrend, setExpenseTrend] = useState([])
  const [expenseByCategory, setExpenseByCategory] = useState([])
  const [payroll, setPayroll] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    const [
      { data: headcountRows },
      { data: attendanceRows },
      { data: leaveRows },
      { data: expenseRows },
      { data: payrollRuns },
      { data: payrollSummary },
    ] = await Promise.all([
      supabase.from('v_headcount_by_department').select('department_name, employee_count').eq('company_id', company.id),
      supabase.from('v_attendance_monthly').select('month, present_days, late_days, absent_days, leave_days').eq('company_id', company.id).gte('month', monthsAgo(6)),
      supabase.from('v_leave_usage').select('leave_type, entitled_days, used_days, remaining_days').eq('company_id', company.id).eq('year', leaveYear),
      supabase.from('v_expense_summary').select('month, category_name, claim_count, total_amount').eq('company_id', company.id).gte('month', monthsAgo(6)),
      supabase.from('payroll_runs').select('id, payroll_periods(period_start, label)').eq('company_id', company.id),
      supabase.from('v_payroll_run_summary').select('payroll_run_id, period_label, employee_count, total_earnings, total_deductions, total_net').eq('company_id', company.id),
    ])

    setHeadcount((headcountRows ?? []).map((r) => ({ name: r.department_name ?? 'Unassigned', count: r.employee_count })))

    const attByMonth = {}
    for (const r of attendanceRows ?? []) {
      const key = r.month
      if (!attByMonth[key]) attByMonth[key] = { month: key, present: 0, late: 0, absent: 0, leave: 0 }
      attByMonth[key].present += r.present_days
      attByMonth[key].late += r.late_days
      attByMonth[key].absent += r.absent_days
      attByMonth[key].leave += r.leave_days
    }
    setAttendance(
      Object.values(attByMonth)
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((r) => ({ ...r, label: monthLabel(r.month) }))
    )

    const leaveByType = {}
    for (const r of leaveRows ?? []) {
      if (!leaveByType[r.leave_type]) leaveByType[r.leave_type] = { type: r.leave_type, entitled: 0, used: 0 }
      leaveByType[r.leave_type].entitled += Number(r.entitled_days)
      leaveByType[r.leave_type].used += Number(r.used_days)
    }
    setLeave(Object.values(leaveByType))

    const expByMonth = {}
    for (const r of expenseRows ?? []) {
      if (!expByMonth[r.month]) expByMonth[r.month] = { month: r.month, total: 0 }
      expByMonth[r.month].total += Number(r.total_amount)
    }
    const sortedExpMonths = Object.values(expByMonth).sort((a, b) => a.month.localeCompare(b.month))
    setExpenseTrend(sortedExpMonths.map((r) => ({ ...r, label: monthLabel(r.month) })))

    const latestMonth = sortedExpMonths[sortedExpMonths.length - 1]?.month
    setExpenseByCategory(
      (expenseRows ?? [])
        .filter((r) => r.month === latestMonth)
        .map((r) => ({ name: r.category_name, amount: Number(r.total_amount) }))
    )

    const periodStartByRun = {}
    for (const run of payrollRuns ?? []) periodStartByRun[run.id] = run.payroll_periods?.period_start
    setPayroll(
      (payrollSummary ?? [])
        .map((s) => ({ ...s, period_start: periodStartByRun[s.payroll_run_id] }))
        .sort((a, b) => (a.period_start ?? '').localeCompare(b.period_start ?? ''))
    )

    setLoading(false)
  }, [leaveYear, company.id])

  useEffect(() => {
    load()
  }, [load])

  const def = REPORT_DEFINITIONS[tab]

  return (
    <div className="page-inner" style={{ maxWidth: 1180 }}>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Reports</h1>
        </div>
      </div>

      <div className="settings-shell">
        <ReportsNav tab={tab} setTab={setTab} />

        <div className="settings-content">
          {loading ? (
            <SkeletonBlock rows={6} />
          ) : def?.chart ? (
            <>
              {tab === 'ov-headcount' && <HeadcountChart headcount={headcount} />}
              {tab === 'pay-by-period' && <PayrollChart payroll={payroll} />}
              {tab === 'pay-expenses' && <ExpensesChart expenseTrend={expenseTrend} expenseByCategory={expenseByCategory} />}
              {tab === 'leave-usage' && <LeaveUsageChart leave={leave} leaveYear={leaveYear} setLeaveYear={setLeaveYear} />}
              {tab === 'att-summary' && <AttendanceMonthlyChart attendance={attendance} />}
            </>
          ) : (
            <ReportTable reportKey={tab} label={REPORT_CATEGORIES.flatMap((c) => c.submodules).find((s) => s.key === tab)?.label ?? tab} />
          )}
        </div>
      </div>
    </div>
  )
}
