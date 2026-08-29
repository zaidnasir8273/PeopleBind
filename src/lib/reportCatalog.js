import { supabase } from './supabase'
import { IdCardIcon } from '../components/ui/id-card'
import { AlarmClockIcon } from '../components/ui/alarm-clock'
import { HandCoinsIcon } from '../components/ui/hand-coins'
import { DollarSignIcon } from '../components/ui/dollar-sign'
import { FileChartLineIcon } from '../components/ui/file-chart-line'
import { CalendarCheck2Icon } from '../components/ui/calendar-check-2'
import { GraduationCapIcon } from '../components/ui/graduation-cap'
import { FolderOpenIcon } from '../components/ui/folder-open'

// Categories mirror the pasted report catalog 1:1. Each report is either
// `{ chart: true }` (rendered by one of the existing hand-built chart
// blocks already in Reports.jsx) or a table definition: `{ fetch, columns }`.
// A report can also be `{ unavailable: 'reason' }` for the handful that
// need schema/features this app doesn't have yet -- flagged in the nav
// rather than silently dropped.
//
// Every `fetch` takes the current company as its only argument and every
// query is scoped by `company_id` -- these all relied on RLS alone before,
// which only scopes normal company users correctly, not platform admins
// viewing a company via "View as" (their RLS branch has no company filter
// by design, so they'd otherwise see every company's reports merged
// together).

function fmtDate(d) {
  if (!d) return '—'
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtMoney(n) {
  return 'Rs. ' + Number(n ?? 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

// Merges an employee-side payroll_items deduction with the matching
// employer-side payroll_employer_contributions row, keyed by
// (component/contribution name, employee, payroll run) -- a scheme that's
// entirely employer-funded (no employee row) or entirely employee-funded
// still shows up correctly, with the missing side reported as 0, rather
// than only ever reflecting whichever side has a payroll_items row.
async function fetchStatutoryContribution(names, company) {
  const [{ data: empData }, { data: erData }] = await Promise.all([
    supabase
      .from('payroll_items')
      .select('component_name, amount, employee_id, payroll_run_id, employees(full_name, employee_code), payroll_runs(payroll_periods(label))')
      .eq('company_id', company.id)
      .in('component_name', names),
    supabase
      .from('payroll_employer_contributions')
      .select('contribution_type, amount, employee_id, payroll_run_id, employees(full_name, employee_code), payroll_runs(payroll_periods(label))')
      .eq('company_id', company.id)
      .in('contribution_type', names),
  ])

  const key = (scheme, employeeId, runId) => `${scheme}_${employeeId}_${runId}`
  const rows = new Map()

  for (const r of empData ?? []) {
    rows.set(key(r.component_name, r.employee_id, r.payroll_run_id), {
      scheme: r.component_name, code: r.employees?.employee_code ?? '—', employee: r.employees?.full_name ?? '—',
      period: r.payroll_runs?.payroll_periods?.label ?? '—', employee_amount: Number(r.amount ?? 0), employer_amount: 0,
    })
  }
  for (const r of erData ?? []) {
    const k = key(r.contribution_type, r.employee_id, r.payroll_run_id)
    const existing = rows.get(k)
    if (existing) existing.employer_amount = Number(r.amount ?? 0)
    else rows.set(k, {
      scheme: r.contribution_type, code: r.employees?.employee_code ?? '—', employee: r.employees?.full_name ?? '—',
      period: r.payroll_runs?.payroll_periods?.label ?? '—', employee_amount: 0, employer_amount: Number(r.amount ?? 0),
    })
  }

  return [...rows.values()]
}

export const REPORT_CATEGORIES = [
  {
    key: 'overview',
    label: 'Employee Overview',
    color: 'forest',
    icon: IdCardIcon,
    submodules: [
      { key: 'ov-directory', label: 'Employee Directory' },
      { key: 'ov-details', label: 'Employee Details' },
      { key: 'ov-hire', label: 'Employee Hire' },
      { key: 'ov-pay-elements', label: 'Pay Elements' },
      { key: 'ov-timeline', label: 'Employee Timeline' },
      { key: 'ov-gross-salary', label: 'Employee Gross Salary' },
      { key: 'ov-headcount', label: 'Department Head Count' },
    ],
  },
  {
    key: 'attendance',
    label: 'Attendance Reports',
    color: 'moss',
    icon: AlarmClockIcon,
    submodules: [
      { key: 'att-daily-summary', label: 'Daily Attendance Summary' },
      { key: 'att-summary', label: 'Attendance Summary' },
      { key: 'att-register', label: 'Attendance Register' },
      { key: 'att-activity', label: 'Attendance Activity' },
      { key: 'att-overtime-detail', label: 'Overtime Register Detail' },
      { key: 'att-overtime-summary', label: 'Overtime Register Summary' },
      { key: 'att-timesheet', label: 'Time Sheet Report' },
      { key: 'att-time-entry-summary', label: 'Time Entry Summary' },
      { key: 'att-night-shift', label: 'Night Shift Report' },
      { key: 'att-vs-leave', label: 'Attendance vs Leave Balance' },
    ],
  },
  {
    key: 'fund',
    label: 'Fund Reports',
    color: 'bottle',
    icon: HandCoinsIcon,
    submodules: [
      { key: 'fund-pf-summary', label: 'Provident Fund Summary' },
      { key: 'fund-pf-detail', label: 'Provident Fund Detail' },
      { key: 'fund-social-security', label: 'Provincial Social Security' },
    ],
  },
  {
    key: 'income',
    label: 'Income Reports',
    color: 'olive',
    icon: DollarSignIcon,
    submodules: [
      { key: 'inc-bank-transaction', label: 'Bank Transaction' },
      { key: 'inc-tax-summary', label: 'Income Tax Summary' },
      { key: 'inc-tax-detail', label: 'Income Tax Detail' },
      { key: 'inc-fbr-withholding', label: 'FBR Monthly Withholding Statement' },
    ],
  },
  {
    key: 'payroll',
    label: 'Payroll Reports',
    color: 'sage',
    icon: FileChartLineIcon,
    submodules: [
      { key: 'pay-by-period', label: 'Payroll by Period' },
      { key: 'pay-employee-summary', label: 'Employee Summary' },
      { key: 'pay-detail', label: 'Payroll Detail' },
      { key: 'pay-reconciliation', label: 'Payroll Reconciliation' },
      { key: 'pay-expenses', label: 'Expense Report' },
      { key: 'pay-eobi', label: 'EOBI' },
      { key: 'pay-professional-tax', label: 'Professional Tax' },
      { key: 'pay-tax-certificate', label: 'Tax Certificate' },
      { key: 'pay-dept-summary', label: 'Department-wise Payroll Summary' },
    ],
  },
  {
    key: 'leave',
    label: 'Leave Reports',
    color: 'forest',
    icon: CalendarCheck2Icon,
    submodules: [
      { key: 'leave-detail', label: 'Leave Detail Report' },
      { key: 'leave-balance', label: 'Employee Leave Balance' },
      { key: 'leave-usage', label: 'Leave Usage' },
    ],
  },
  {
    key: 'recruitment',
    label: 'Recruitment Reports',
    color: 'moss',
    icon: GraduationCapIcon,
    submodules: [
      { key: 'rec-today', label: "Today's Candidates" },
      { key: 'rec-by-source', label: 'Candidate by Source' },
      { key: 'rec-by-status', label: 'Candidate by Status' },
      { key: 'rec-openings-vs-candidates', label: 'Job Openings vs Candidates' },
      { key: 'rec-interviews', label: 'Interviews' },
      { key: 'rec-openings-by-type', label: 'Job Openings by Type' },
    ],
  },
  {
    key: 'other',
    label: 'Other Reports',
    color: 'bottle',
    icon: FolderOpenIcon,
    submodules: [
      { key: 'oth-audit-log', label: 'Audit Logs' },
      { key: 'oth-company-docs', label: 'Company Docs' },
      { key: 'oth-employee-docs', label: 'Employee Docs' },
      { key: 'oth-loan-ledger', label: 'Loan Ledger' },
      { key: 'oth-tasks', label: 'Tasks Report' },
    ],
  },
]

const ACTIVE_STATUSES = ['training', 'probation', 'confirmed']

export const REPORT_DEFINITIONS = {
  // ---------- Employee Overview ----------
  'ov-directory': {
    fetch: async (company) => {
      const { data } = await supabase
        .from('employees')
        .select('employee_code, full_name, designations(name), departments!employees_department_id_fkey(name), employment_status, joining_date')
        .eq('company_id', company.id)
        .in('employment_status', ACTIVE_STATUSES)
        .order('full_name')
      return (data ?? []).map((e) => ({
        code: e.employee_code, name: e.full_name, designation: e.designations?.name ?? '—',
        department: e.departments?.name ?? '—', status: e.employment_status, joined: fmtDate(e.joining_date),
      }))
    },
    columns: [
      { key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'designation', label: 'Designation' },
      { key: 'department', label: 'Department' }, { key: 'status', label: 'Status' }, { key: 'joined', label: 'Joined' },
    ],
  },
  'ov-details': {
    fetch: async (company) => {
      const { data } = await supabase
        .from('employees')
        .select('employee_code, full_name, personal_email, phone, cnic, date_of_birth, gender, address')
        .eq('company_id', company.id)
        .in('employment_status', ACTIVE_STATUSES)
        .order('full_name')
      return (data ?? []).map((e) => ({
        code: e.employee_code, name: e.full_name, email: e.personal_email ?? '—', phone: e.phone ?? '—',
        cnic: e.cnic ?? '—', dob: fmtDate(e.date_of_birth), gender: e.gender ?? '—', address: e.address ?? '—',
      }))
    },
    columns: [
      { key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' }, { key: 'cnic', label: 'CNIC' }, { key: 'dob', label: 'Date of birth' },
      { key: 'gender', label: 'Gender' }, { key: 'address', label: 'Address' },
    ],
  },
  'ov-hire': {
    fetch: async (company) => {
      const { data } = await supabase
        .from('employees')
        .select('employee_code, full_name, joining_date, employment_status, designations(name), employment_types(name)')
        .eq('company_id', company.id)
        .in('employment_status', ACTIVE_STATUSES)
        .order('joining_date', { ascending: false })
      return (data ?? []).map((e) => ({
        code: e.employee_code, name: e.full_name, joined: fmtDate(e.joining_date),
        designation: e.designations?.name ?? '—', type: e.employment_types?.name ?? '—', status: e.employment_status,
      }))
    },
    columns: [
      { key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'joined', label: 'Joining date' },
      { key: 'designation', label: 'Designation' }, { key: 'type', label: 'Employment type' }, { key: 'status', label: 'Status' },
    ],
  },
  'ov-pay-elements': {
    fetch: async (company) => {
      const { data } = await supabase
        .from('employee_salary_components')
        .select('amount, effective_from, effective_to, employees(full_name, employee_code), payroll_components(name, component_type)')
        .eq('company_id', company.id)
        .order('effective_from', { ascending: false })
      return (data ?? []).map((r) => ({
        employee: r.employees?.full_name ?? '—', code: r.employees?.employee_code ?? '—', component: r.payroll_components?.name ?? '—',
        type: r.payroll_components?.component_type ?? '—', amount: fmtMoney(r.amount), from: fmtDate(r.effective_from), to: r.effective_to ? fmtDate(r.effective_to) : 'Ongoing',
      }))
    },
    columns: [
      { key: 'employee', label: 'Employee' }, { key: 'code', label: 'Code' }, { key: 'component', label: 'Component' },
      { key: 'type', label: 'Type' }, { key: 'amount', label: 'Amount' }, { key: 'from', label: 'From' }, { key: 'to', label: 'To' },
    ],
  },
  'ov-timeline': {
    fetch: async (company) => {
      const { data } = await supabase
        .from('employment_history')
        .select('effective_from, effective_to, reason, employees(full_name, employee_code), departments(name), designations(name)')
        .eq('company_id', company.id)
        .order('effective_from', { ascending: false })
      return (data ?? []).map((r) => ({
        employee: r.employees?.full_name ?? '—', code: r.employees?.employee_code ?? '—', department: r.departments?.name ?? '—',
        designation: r.designations?.name ?? '—', from: fmtDate(r.effective_from), to: r.effective_to ? fmtDate(r.effective_to) : 'Current', reason: r.reason ?? '—',
      }))
    },
    columns: [
      { key: 'employee', label: 'Employee' }, { key: 'code', label: 'Code' }, { key: 'department', label: 'Department' },
      { key: 'designation', label: 'Designation' }, { key: 'from', label: 'From' }, { key: 'to', label: 'To' }, { key: 'reason', label: 'Reason' },
    ],
  },
  'ov-gross-salary': {
    fetch: async (company) => {
      const { data } = await supabase.from('employee_salary_components').select('amount, employees(full_name, employee_code), payroll_components(name)').eq('company_id', company.id).is('effective_to', null)
      const byEmployee = new Map()
      for (const r of data ?? []) {
        const key = r.employees?.employee_code ?? r.employees?.full_name
        if (!byEmployee.has(key)) byEmployee.set(key, { code: r.employees?.employee_code ?? '—', name: r.employees?.full_name ?? '—', gross: 0 })
        byEmployee.get(key).gross += Number(r.amount ?? 0)
      }
      return [...byEmployee.values()].map((r) => ({ ...r, gross: fmtMoney(r.gross) })).sort((a, b) => a.name.localeCompare(b.name))
    },
    columns: [{ key: 'code', label: 'Code' }, { key: 'name', label: 'Employee' }, { key: 'gross', label: 'Current gross salary' }],
  },
  'ov-headcount': { chart: true },

  // ---------- Attendance ----------
  'att-daily-summary': {
    fetch: async (company) => {
      const today = new Date().toISOString().slice(0, 10)
      const { data } = await supabase.from('attendance').select('status').eq('company_id', company.id).eq('attendance_date', today)
      const counts = {}
      for (const r of data ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1
      return Object.entries(counts).map(([status, count]) => ({ status, count }))
    },
    columns: [{ key: 'status', label: "Today's status" }, { key: 'count', label: 'Employees' }],
  },
  'att-summary': { chart: true },
  'att-register': {
    fetch: async (company) => {
      const thirtyDaysAgo = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)
      const { data } = await supabase
        .from('attendance')
        .select('attendance_date, status, worked_minutes, late_minutes, employees(full_name, employee_code)')
        .eq('company_id', company.id)
        .gte('attendance_date', thirtyDaysAgo)
        .order('attendance_date', { ascending: false })
      return (data ?? []).map((r) => ({
        date: fmtDate(r.attendance_date), code: r.employees?.employee_code ?? '—', employee: r.employees?.full_name ?? '—',
        status: r.status, worked: r.worked_minutes ? `${Math.round(r.worked_minutes / 60)}h` : '—', late: r.late_minutes ? `${r.late_minutes}m` : '—',
      }))
    },
    columns: [
      { key: 'date', label: 'Date' }, { key: 'code', label: 'Code' }, { key: 'employee', label: 'Employee' },
      { key: 'status', label: 'Status' }, { key: 'worked', label: 'Worked' }, { key: 'late', label: 'Late by' },
    ],
  },
  'att-activity': {
    fetch: async (company) => {
      const sevenDaysAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)
      const { data } = await supabase
        .from('attendance')
        .select('attendance_date, check_in, check_out, source, employees(full_name)')
        .eq('company_id', company.id)
        .gte('attendance_date', sevenDaysAgo)
        .order('attendance_date', { ascending: false })
      return (data ?? []).map((r) => ({
        date: fmtDate(r.attendance_date), employee: r.employees?.full_name ?? '—',
        checkIn: r.check_in ? new Date(r.check_in).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—',
        checkOut: r.check_out ? new Date(r.check_out).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—',
        source: r.source ?? '—',
      }))
    },
    columns: [
      { key: 'date', label: 'Date' }, { key: 'employee', label: 'Employee' }, { key: 'checkIn', label: 'Check in' },
      { key: 'checkOut', label: 'Check out' }, { key: 'source', label: 'Source' },
    ],
  },
  'att-overtime-detail': {
    fetch: async (company) => {
      const { data } = await supabase
        .from('overtime_records')
        .select('work_date, minutes, rate_multiplier, approval_status, payroll_status, employees(full_name, employee_code)')
        .eq('company_id', company.id)
        .order('work_date', { ascending: false })
        .limit(200)
      return (data ?? []).map((r) => ({
        date: fmtDate(r.work_date), code: r.employees?.employee_code ?? '—', employee: r.employees?.full_name ?? '—',
        hours: (Number(r.minutes ?? 0) / 60).toFixed(1), rate: `${r.rate_multiplier}x`, approval: r.approval_status, payroll: r.payroll_status,
      }))
    },
    columns: [
      { key: 'date', label: 'Date' }, { key: 'code', label: 'Code' }, { key: 'employee', label: 'Employee' },
      { key: 'hours', label: 'Hours' }, { key: 'rate', label: 'Rate' }, { key: 'approval', label: 'Approval' }, { key: 'payroll', label: 'Payroll status' },
    ],
  },
  'att-overtime-summary': {
    fetch: async (company) => {
      const { data } = await supabase.from('overtime_records').select('minutes, employees(full_name, employee_code)').eq('company_id', company.id)
      const byEmployee = new Map()
      for (const r of data ?? []) {
        const key = r.employees?.employee_code ?? r.employees?.full_name
        if (!byEmployee.has(key)) byEmployee.set(key, { code: r.employees?.employee_code ?? '—', name: r.employees?.full_name ?? '—', minutes: 0, count: 0 })
        const row = byEmployee.get(key)
        row.minutes += Number(r.minutes ?? 0)
        row.count += 1
      }
      return [...byEmployee.values()].map((r) => ({ code: r.code, name: r.name, entries: r.count, hours: (r.minutes / 60).toFixed(1) })).sort((a, b) => b.hours - a.hours)
    },
    columns: [{ key: 'code', label: 'Code' }, { key: 'name', label: 'Employee' }, { key: 'entries', label: 'Entries' }, { key: 'hours', label: 'Total hours' }],
  },
  'att-timesheet': {
    fetch: async (company) => {
      const { data } = await supabase
        .from('timesheets')
        .select('period_start, period_end, status, submitted_at, employees(full_name, employee_code)')
        .eq('company_id', company.id)
        .order('period_start', { ascending: false })
        .limit(100)
      return (data ?? []).map((r) => ({
        code: r.employees?.employee_code ?? '—', employee: r.employees?.full_name ?? '—',
        period: `${fmtDate(r.period_start)} – ${fmtDate(r.period_end)}`, status: r.status, submitted: r.submitted_at ? fmtDate(r.submitted_at) : '—',
      }))
    },
    columns: [{ key: 'code', label: 'Code' }, { key: 'employee', label: 'Employee' }, { key: 'period', label: 'Period' }, { key: 'status', label: 'Status' }, { key: 'submitted', label: 'Submitted' }],
  },
  'att-time-entry-summary': {
    fetch: async (company) => {
      const { data } = await supabase.from('time_entries').select('duration_minutes, employees(full_name, employee_code), projects(name)').eq('company_id', company.id)
      const byEmployee = new Map()
      for (const r of data ?? []) {
        const key = r.employees?.employee_code ?? r.employees?.full_name
        if (!byEmployee.has(key)) byEmployee.set(key, { code: r.employees?.employee_code ?? '—', name: r.employees?.full_name ?? '—', minutes: 0 })
        byEmployee.get(key).minutes += Number(r.duration_minutes ?? 0)
      }
      return [...byEmployee.values()].map((r) => ({ code: r.code, name: r.name, hours: (r.minutes / 60).toFixed(1) })).sort((a, b) => b.hours - a.hours)
    },
    columns: [{ key: 'code', label: 'Code' }, { key: 'name', label: 'Employee' }, { key: 'hours', label: 'Total logged hours' }],
  },
  'att-night-shift': {
    fetch: async (company) => {
      const { data } = await supabase.from('shifts').select('id, name, start_time, end_time').eq('company_id', company.id).order('name')
      const nightShifts = (data ?? []).filter((s) => s.start_time && (s.start_time >= '18:00:00' || s.start_time < '06:00:00'))
      return nightShifts.map((s) => ({ name: s.name, start: s.start_time?.slice(0, 5) ?? '—', end: s.end_time?.slice(0, 5) ?? '—' }))
    },
    columns: [{ key: 'name', label: 'Shift' }, { key: 'start', label: 'Start' }, { key: 'end', label: 'End' }],
  },
  'att-vs-leave': {
    fetch: async (company) => {
      const { data } = await supabase.from('leave_balances').select('entitled_days, carried_forward_days, used_days, employees(full_name, employee_code), leave_types(name)').eq('company_id', company.id)
      return (data ?? []).map((r) => ({
        code: r.employees?.employee_code ?? '—', employee: r.employees?.full_name ?? '—', type: r.leave_types?.name ?? '—',
        entitled: r.entitled_days, used: r.used_days, remaining: Number(r.entitled_days ?? 0) + Number(r.carried_forward_days ?? 0) - Number(r.used_days ?? 0),
      }))
    },
    columns: [
      { key: 'code', label: 'Code' }, { key: 'employee', label: 'Employee' }, { key: 'type', label: 'Leave type' },
      { key: 'entitled', label: 'Entitled' }, { key: 'used', label: 'Used' }, { key: 'remaining', label: 'Remaining' },
    ],
  },

  // ---------- Fund ----------
  'fund-pf-summary': {
    fetch: async (company) => {
      const rows = await fetchStatutoryContribution(['Provident Fund'], company)
      const byEmployee = new Map()
      for (const r of rows) {
        if (!byEmployee.has(r.code)) byEmployee.set(r.code, { code: r.code, employee: r.employee, employee_total: 0, employer_total: 0 })
        const row = byEmployee.get(r.code)
        row.employee_total += r.employee_amount
        row.employer_total += r.employer_amount
      }
      return [...byEmployee.values()].map((r) => ({ ...r, employee_total: fmtMoney(r.employee_total), employer_total: fmtMoney(r.employer_total) }))
    },
    columns: [{ key: 'code', label: 'Code' }, { key: 'employee', label: 'Employee' }, { key: 'employee_total', label: 'Employee contributed' }, { key: 'employer_total', label: 'Employer contributed' }],
  },
  'fund-pf-detail': {
    fetch: async (company) => {
      const rows = await fetchStatutoryContribution(['Provident Fund'], company)
      return rows.map((r) => ({
        code: r.code, employee: r.employee, period: r.period,
        employee_amount: fmtMoney(r.employee_amount), employer_amount: fmtMoney(r.employer_amount),
      }))
    },
    columns: [
      { key: 'code', label: 'Code' }, { key: 'employee', label: 'Employee' }, { key: 'period', label: 'Period' },
      { key: 'employee_amount', label: 'Employee contributed' }, { key: 'employer_amount', label: 'Employer contributed' },
    ],
  },
  'fund-social-security': {
    fetch: async (company) => {
      const rows = await fetchStatutoryContribution(['SESSI', 'PESSI', 'KPESSI', 'BESSI'], company)
      return rows.map((r) => ({
        scheme: r.scheme, code: r.code, employee: r.employee, period: r.period,
        employee_amount: fmtMoney(r.employee_amount), employer_amount: fmtMoney(r.employer_amount),
      }))
    },
    columns: [
      { key: 'scheme', label: 'Scheme' }, { key: 'code', label: 'Code' }, { key: 'employee', label: 'Employee' }, { key: 'period', label: 'Period' },
      { key: 'employee_amount', label: 'Employee deducted' }, { key: 'employer_amount', label: 'Employer contribution' },
    ],
  },

  // ---------- Income ----------
  'inc-bank-transaction': {
    fetch: async (company) => {
      const { data } = await supabase
        .from('payroll_items')
        .select('amount, employees(full_name, employee_code, bank_name, bank_account_number), payroll_runs(payroll_periods(label))')
        .eq('company_id', company.id)
        .eq('component_type', 'earning')
        .in('component_name', ['Basic Salary'])
      const byEmployee = new Map()
      for (const r of data ?? []) {
        const key = r.employees?.employee_code
        if (!key || byEmployee.has(key)) continue
        byEmployee.set(key, {
          code: key, name: r.employees?.full_name ?? '—', bank: r.employees?.bank_name ?? '—',
          account: r.employees?.bank_account_number ?? '—', amount: fmtMoney(r.amount),
        })
      }
      return [...byEmployee.values()]
    },
    columns: [{ key: 'code', label: 'Code' }, { key: 'name', label: 'Employee' }, { key: 'bank', label: 'Bank' }, { key: 'account', label: 'Account #' }, { key: 'amount', label: 'Amount' }],
  },
  'inc-tax-summary': {
    fetch: async (company) => {
      const { data } = await supabase.from('payroll_items').select('amount, employees(full_name, employee_code)').eq('company_id', company.id).eq('component_name', 'Income Tax')
      const byEmployee = new Map()
      for (const r of data ?? []) {
        const key = r.employees?.employee_code ?? r.employees?.full_name
        if (!byEmployee.has(key)) byEmployee.set(key, { code: r.employees?.employee_code ?? '—', name: r.employees?.full_name ?? '—', total: 0 })
        byEmployee.get(key).total += Number(r.amount ?? 0)
      }
      return [...byEmployee.values()].map((r) => ({ ...r, total: fmtMoney(r.total) }))
    },
    columns: [{ key: 'code', label: 'Code' }, { key: 'name', label: 'Employee' }, { key: 'total', label: 'Total tax deducted' }],
  },
  'inc-tax-detail': {
    fetch: async (company) => {
      const { data } = await supabase
        .from('payroll_items')
        .select('amount, created_at, employees(full_name, employee_code), payroll_runs(payroll_periods(label))')
        .eq('company_id', company.id)
        .eq('component_name', 'Income Tax')
        .order('created_at', { ascending: false })
      return (data ?? []).map((r) => ({
        code: r.employees?.employee_code ?? '—', employee: r.employees?.full_name ?? '—',
        period: r.payroll_runs?.payroll_periods?.label ?? '—', amount: fmtMoney(r.amount),
      }))
    },
    columns: [{ key: 'code', label: 'Code' }, { key: 'employee', label: 'Employee' }, { key: 'period', label: 'Period' }, { key: 'amount', label: 'Tax deducted' }],
  },
  'inc-fbr-withholding': {
    fetch: async (company) => {
      const { data } = await supabase
        .from('payroll_items')
        .select('amount, employees(full_name, employee_code, cnic), payroll_runs(payroll_periods(label))')
        .eq('company_id', company.id)
        .eq('component_name', 'Income Tax')
        .order('created_at', { ascending: false })
      return (data ?? []).map((r) => ({
        cnic: r.employees?.cnic ?? '—', code: r.employees?.employee_code ?? '—', employee: r.employees?.full_name ?? '—',
        period: r.payroll_runs?.payroll_periods?.label ?? '—', withheld: fmtMoney(r.amount),
      }))
    },
    columns: [
      { key: 'cnic', label: 'CNIC' }, { key: 'code', label: 'Code' }, { key: 'employee', label: 'Employee' },
      { key: 'period', label: 'Period' }, { key: 'withheld', label: 'Tax withheld' },
    ],
  },

  // ---------- Payroll ----------
  'pay-by-period': { chart: true },
  'pay-employee-summary': {
    fetch: async (company) => {
      const { data } = await supabase.from('payroll_items').select('amount, component_type, employees(full_name, employee_code)').eq('company_id', company.id)
      const byEmployee = new Map()
      for (const r of data ?? []) {
        const key = r.employees?.employee_code ?? r.employees?.full_name
        if (!byEmployee.has(key)) byEmployee.set(key, { code: r.employees?.employee_code ?? '—', name: r.employees?.full_name ?? '—', earnings: 0, deductions: 0 })
        const row = byEmployee.get(key)
        if (r.component_type === 'earning') row.earnings += Number(r.amount ?? 0)
        else row.deductions += Number(r.amount ?? 0)
      }
      return [...byEmployee.values()].map((r) => ({ code: r.code, name: r.name, earnings: fmtMoney(r.earnings), deductions: fmtMoney(r.deductions), net: fmtMoney(r.earnings - r.deductions) }))
    },
    columns: [{ key: 'code', label: 'Code' }, { key: 'name', label: 'Employee' }, { key: 'earnings', label: 'Total earnings' }, { key: 'deductions', label: 'Total deductions' }, { key: 'net', label: 'Net' }],
  },
  'pay-detail': {
    fetch: async (company) => {
      const { data } = await supabase
        .from('payroll_items')
        .select('component_name, component_type, amount, employees(full_name, employee_code), payroll_runs(payroll_periods(label))')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(300)
      return (data ?? []).map((r) => ({
        code: r.employees?.employee_code ?? '—', employee: r.employees?.full_name ?? '—', period: r.payroll_runs?.payroll_periods?.label ?? '—',
        component: r.component_name, type: r.component_type, amount: fmtMoney(r.amount),
      }))
    },
    columns: [
      { key: 'code', label: 'Code' }, { key: 'employee', label: 'Employee' }, { key: 'period', label: 'Period' },
      { key: 'component', label: 'Component' }, { key: 'type', label: 'Type' }, { key: 'amount', label: 'Amount' },
    ],
  },
  'pay-reconciliation': {
    fetch: async (company) => {
      const { data } = await supabase.from('payroll_runs').select('status, payroll_periods(label), payroll_items(amount, component_type)').eq('company_id', company.id)
      return (data ?? []).map((run) => {
        const earnings = (run.payroll_items ?? []).filter((i) => i.component_type === 'earning').reduce((s, i) => s + Number(i.amount ?? 0), 0)
        const deductions = (run.payroll_items ?? []).filter((i) => i.component_type !== 'earning').reduce((s, i) => s + Number(i.amount ?? 0), 0)
        return { period: run.payroll_periods?.label ?? '—', status: run.status, earnings: fmtMoney(earnings), deductions: fmtMoney(deductions), net: fmtMoney(earnings - deductions) }
      })
    },
    columns: [{ key: 'period', label: 'Period' }, { key: 'status', label: 'Status' }, { key: 'earnings', label: 'Earnings' }, { key: 'deductions', label: 'Deductions' }, { key: 'net', label: 'Net' }],
  },
  'pay-expenses': { chart: true },
  'pay-eobi': {
    fetch: async (company) => {
      const rows = await fetchStatutoryContribution(['EOBI'], company)
      return rows.map((r) => ({
        code: r.code, employee: r.employee, period: r.period,
        employee_amount: fmtMoney(r.employee_amount), employer_amount: fmtMoney(r.employer_amount),
      }))
    },
    columns: [
      { key: 'code', label: 'Code' }, { key: 'employee', label: 'Employee' }, { key: 'period', label: 'Period' },
      { key: 'employee_amount', label: 'Employee deducted' }, { key: 'employer_amount', label: 'Employer contribution' },
    ],
  },
  'pay-professional-tax': {
    fetch: async (company) => {
      const { data } = await supabase
        .from('payroll_items')
        .select('amount, employees(full_name, employee_code), payroll_runs(payroll_periods(label))')
        .eq('company_id', company.id)
        .eq('component_name', 'Professional Tax')
        .order('created_at', { ascending: false })
      return (data ?? []).map((r) => ({ code: r.employees?.employee_code ?? '—', employee: r.employees?.full_name ?? '—', period: r.payroll_runs?.payroll_periods?.label ?? '—', amount: fmtMoney(r.amount) }))
    },
    columns: [{ key: 'code', label: 'Code' }, { key: 'employee', label: 'Employee' }, { key: 'period', label: 'Period' }, { key: 'amount', label: 'Professional tax deducted' }],
  },
  'pay-tax-certificate': {
    fetch: async (company) => {
      const yearStart = `${new Date().getFullYear()}-01-01`
      const { data } = await supabase.from('payroll_items').select('amount, created_at, employees(full_name, employee_code)').eq('company_id', company.id).eq('component_name', 'Income Tax').gte('created_at', yearStart)
      const byEmployee = new Map()
      for (const r of data ?? []) {
        const key = r.employees?.employee_code ?? r.employees?.full_name
        if (!byEmployee.has(key)) byEmployee.set(key, { code: r.employees?.employee_code ?? '—', name: r.employees?.full_name ?? '—', total: 0 })
        byEmployee.get(key).total += Number(r.amount ?? 0)
      }
      return [...byEmployee.values()].map((r) => ({ ...r, year: new Date().getFullYear(), total: fmtMoney(r.total) }))
    },
    columns: [{ key: 'code', label: 'Code' }, { key: 'name', label: 'Employee' }, { key: 'year', label: 'Tax year' }, { key: 'total', label: 'Total tax deducted (YTD)' }],
  },
  'pay-dept-summary': {
    fetch: async (company) => {
      const { data } = await supabase.from('payroll_items').select('amount, component_type, employees(departments!employees_department_id_fkey(name))').eq('company_id', company.id)
      const byDept = new Map()
      for (const r of data ?? []) {
        const dept = r.employees?.departments?.name ?? 'Unassigned'
        if (!byDept.has(dept)) byDept.set(dept, { department: dept, earnings: 0, deductions: 0 })
        const row = byDept.get(dept)
        if (r.component_type === 'earning') row.earnings += Number(r.amount ?? 0)
        else row.deductions += Number(r.amount ?? 0)
      }
      return [...byDept.values()].map((r) => ({ department: r.department, earnings: fmtMoney(r.earnings), deductions: fmtMoney(r.deductions), net: fmtMoney(r.earnings - r.deductions) }))
    },
    columns: [{ key: 'department', label: 'Department' }, { key: 'earnings', label: 'Earnings' }, { key: 'deductions', label: 'Deductions' }, { key: 'net', label: 'Net' }],
  },

  // ---------- Leave ----------
  'leave-detail': {
    fetch: async (company) => {
      const { data } = await supabase
        .from('leave_requests')
        .select('start_date, end_date, days_requested, status, employees(full_name, employee_code), leave_types(name)')
        .eq('company_id', company.id)
        .order('start_date', { ascending: false })
        .limit(200)
      return (data ?? []).map((r) => ({
        code: r.employees?.employee_code ?? '—', employee: r.employees?.full_name ?? '—', type: r.leave_types?.name ?? '—',
        dates: `${fmtDate(r.start_date)} – ${fmtDate(r.end_date)}`, days: r.days_requested, status: r.status,
      }))
    },
    columns: [{ key: 'code', label: 'Code' }, { key: 'employee', label: 'Employee' }, { key: 'type', label: 'Type' }, { key: 'dates', label: 'Dates' }, { key: 'days', label: 'Days' }, { key: 'status', label: 'Status' }],
  },
  'leave-balance': {
    fetch: async (company) => {
      const { data } = await supabase.from('leave_balances').select('entitled_days, carried_forward_days, used_days, employees(full_name, employee_code), leave_types(name)').eq('company_id', company.id)
      return (data ?? [])
        .map((r) => ({
          code: r.employees?.employee_code ?? '—', employee: r.employees?.full_name ?? '—', type: r.leave_types?.name ?? '—',
          entitled: r.entitled_days, used: r.used_days, remaining: Number(r.entitled_days ?? 0) + Number(r.carried_forward_days ?? 0) - Number(r.used_days ?? 0),
        }))
        .sort((a, b) => a.remaining - b.remaining)
    },
    columns: [{ key: 'code', label: 'Code' }, { key: 'employee', label: 'Employee' }, { key: 'type', label: 'Type' }, { key: 'entitled', label: 'Entitled' }, { key: 'used', label: 'Used' }, { key: 'remaining', label: 'Remaining' }],
  },
  'leave-usage': { chart: true },

  // ---------- Recruitment ----------
  'rec-today': {
    fetch: async (company) => {
      const today = new Date().toISOString().slice(0, 10)
      const { data } = await supabase.from('candidates').select('full_name, email, phone, source, created_at').eq('company_id', company.id).gte('created_at', `${today}T00:00:00`)
      return (data ?? []).map((c) => ({ name: c.full_name, email: c.email ?? '—', phone: c.phone ?? '—', source: c.source ?? '—' }))
    },
    columns: [{ key: 'name', label: 'Candidate' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'source', label: 'Source' }],
  },
  'rec-by-source': {
    fetch: async (company) => {
      const { data } = await supabase.from('candidates').select('source').eq('company_id', company.id)
      const counts = {}
      for (const r of data ?? []) { const s = r.source || 'Unknown'; counts[s] = (counts[s] ?? 0) + 1 }
      return Object.entries(counts).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count)
    },
    columns: [{ key: 'source', label: 'Source' }, { key: 'count', label: 'Candidates' }],
  },
  'rec-by-status': {
    fetch: async (company) => {
      const { data } = await supabase.from('applications').select('stage, candidates(full_name), job_openings(title)').eq('company_id', company.id).order('stage')
      return (data ?? []).map((r) => ({ candidate: r.candidates?.full_name ?? '—', opening: r.job_openings?.title ?? '—', stage: r.stage }))
    },
    columns: [{ key: 'candidate', label: 'Candidate' }, { key: 'opening', label: 'Job opening' }, { key: 'stage', label: 'Stage' }],
  },
  'rec-openings-vs-candidates': {
    fetch: async (company) => {
      const { data } = await supabase.from('job_openings').select('title, status, applications(id)').eq('company_id', company.id)
      return (data ?? []).map((r) => ({ opening: r.title, status: r.status, candidates: r.applications?.length ?? 0 }))
    },
    columns: [{ key: 'opening', label: 'Job opening' }, { key: 'status', label: 'Status' }, { key: 'candidates', label: 'Candidates' }],
  },
  'rec-interviews': {
    fetch: async (company) => {
      const { data } = await supabase
        .from('interviews')
        .select('round, status, scheduled_at, rating, applications(candidates(full_name), job_openings(title))')
        .eq('company_id', company.id)
        .order('scheduled_at', { ascending: false })
      return (data ?? []).map((r) => ({
        candidate: r.applications?.candidates?.full_name ?? '—', opening: r.applications?.job_openings?.title ?? '—',
        round: r.round ?? '—', scheduled: r.scheduled_at ? fmtDate(r.scheduled_at) : '—', status: r.status, rating: r.rating ?? '—',
      }))
    },
    columns: [{ key: 'candidate', label: 'Candidate' }, { key: 'opening', label: 'Job opening' }, { key: 'round', label: 'Round' }, { key: 'scheduled', label: 'Scheduled' }, { key: 'status', label: 'Status' }, { key: 'rating', label: 'Rating' }],
  },
  'rec-openings-by-type': {
    fetch: async (company) => {
      const { data } = await supabase.from('job_openings').select('employment_types(name)').eq('company_id', company.id)
      const counts = {}
      for (const r of data ?? []) { const t = r.employment_types?.name || 'Unspecified'; counts[t] = (counts[t] ?? 0) + 1 }
      return Object.entries(counts).map(([type, count]) => ({ type, count }))
    },
    columns: [{ key: 'type', label: 'Employment type' }, { key: 'count', label: 'Openings' }],
  },

  // ---------- Other ----------
  'oth-audit-log': {
    fetch: async (company) => {
      const { data } = await supabase.from('audit_log').select('action, table_name, created_at, profiles(full_name, email)').eq('company_id', company.id).order('created_at', { ascending: false }).limit(200)
      return (data ?? []).map((r) => ({ when: fmtDate(r.created_at), who: r.profiles?.full_name || r.profiles?.email || '—', action: r.action, table: r.table_name }))
    },
    columns: [{ key: 'when', label: 'When' }, { key: 'who', label: 'Who' }, { key: 'action', label: 'Action' }, { key: 'table', label: 'Table' }],
  },
  'oth-company-docs': {
    fetch: async (company) => {
      const { data } = await supabase.from('documents').select('doc_type, file_path, uploaded_at, expiry_date').eq('company_id', company.id).is('employee_id', null).order('uploaded_at', { ascending: false })
      return (data ?? []).map((r) => ({ type: r.doc_type ?? '—', file: r.file_path?.split('/').pop() ?? '—', uploaded: fmtDate(r.uploaded_at), expires: r.expiry_date ? fmtDate(r.expiry_date) : '—' }))
    },
    columns: [{ key: 'type', label: 'Type' }, { key: 'file', label: 'File' }, { key: 'uploaded', label: 'Uploaded' }, { key: 'expires', label: 'Expires' }],
  },
  'oth-employee-docs': {
    fetch: async (company) => {
      const { data } = await supabase.from('documents').select('doc_type, file_path, uploaded_at, expiry_date, employees(full_name, employee_code)').eq('company_id', company.id).not('employee_id', 'is', null).order('uploaded_at', { ascending: false })
      return (data ?? []).map((r) => ({ code: r.employees?.employee_code ?? '—', employee: r.employees?.full_name ?? '—', type: r.doc_type ?? '—', uploaded: fmtDate(r.uploaded_at), expires: r.expiry_date ? fmtDate(r.expiry_date) : '—' }))
    },
    columns: [{ key: 'code', label: 'Code' }, { key: 'employee', label: 'Employee' }, { key: 'type', label: 'Type' }, { key: 'uploaded', label: 'Uploaded' }, { key: 'expires', label: 'Expires' }],
  },
  'oth-loan-ledger': {
    fetch: async (company) => {
      const { data } = await supabase.from('loans').select('loan_type, principal_amount, installment_amount, status, start_date, employees(full_name, employee_code)').eq('company_id', company.id).order('start_date', { ascending: false })
      return (data ?? []).map((r) => ({
        code: r.employees?.employee_code ?? '—', employee: r.employees?.full_name ?? '—', type: r.loan_type ?? '—',
        principal: fmtMoney(r.principal_amount), installment: fmtMoney(r.installment_amount), status: r.status, started: fmtDate(r.start_date),
      }))
    },
    columns: [{ key: 'code', label: 'Code' }, { key: 'employee', label: 'Employee' }, { key: 'type', label: 'Type' }, { key: 'principal', label: 'Principal' }, { key: 'installment', label: 'Installment' }, { key: 'status', label: 'Status' }, { key: 'started', label: 'Started' }],
  },
  'oth-tasks': {
    fetch: async (company) => {
      const { data } = await supabase.from('onboarding_tasks').select('title, category, status, due_date, employees(full_name, employee_code)').eq('company_id', company.id).order('due_date', { ascending: true })
      return (data ?? []).map((r) => ({ code: r.employees?.employee_code ?? '—', employee: r.employees?.full_name ?? '—', task: r.title, category: r.category ?? '—', due: r.due_date ? fmtDate(r.due_date) : '—', status: r.status }))
    },
    columns: [{ key: 'code', label: 'Code' }, { key: 'employee', label: 'Employee' }, { key: 'task', label: 'Task' }, { key: 'category', label: 'Category' }, { key: 'due', label: 'Due' }, { key: 'status', label: 'Status' }],
    note: 'Onboarding tasks are the closest existing match for a general "Tasks Report" — this app has no separate general task system.',
  },
}
