import { supabase } from './supabase'
import { parseFormula, evalFormula, referencedMetrics } from './formulaEngine'

// Each metric mirrors PetroBind's DASH_METRICS shape (see js/dashboard-engine.js
// in that project): { label, unit, trend, fetch(from, to, company, filters) => { value, series } }.
// `series` is a [{date, value}] array used by line/bar/area charts; metrics
// without a natural daily breakdown (headcount, open roles, loan balance)
// just return an empty series and render as a number/leaderboard only.
// Every query below explicitly filters by company_id -- a platform admin's
// RLS branch has no company filter of its own (by design, for
// /platform-admin/* management), so "View as company" only actually scopes
// the data if these queries filter it themselves.
//
// `filters` (optional, from the dashboard's employee/department/team/branch
// pickers) has shape:
//   { departmentId, teamId, branchId, employeeId, employeeIds }
// `departmentId`/`teamId`/`branchId`/`employeeId` are the raw picked values
// (or null). `employeeIds` is resolved once, up in Dashboards.jsx, from
// whichever of those are set, ANDed together against `employees` -- null
// when no filter is active, otherwise an array (possibly empty) of matching
// employee ids. Most metrics below key off `employeeIds` alone, since their
// underlying table only has an employee_id column, not department/team/
// branch directly. A few exceptions are called out where they apply.

// Every calendar date in [from, to] inclusive, as YYYY-MM-DD strings.
function eachDate(from, to) {
  const start = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)
  const dates = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) dates.push(d.toISOString().slice(0, 10))
  return dates
}

// Zero-fills a {date,value} series to include every day in [from, to] --
// without this, a line/area/bar/combo chart's x-axis silently compresses
// to only the dates that happen to have data, which reads as "the chart
// doesn't span the range I picked" even though the underlying fetch was
// correctly scoped to it.
function fillDateRange(series, from, to) {
  const byDate = new Map(series.map((r) => [r.date, r.value]))
  return eachDate(from, to).map((date) => ({ date, value: byDate.get(date) ?? 0 }))
}

function sumByDate(rows, dateKey, valueFn, from, to) {
  const byDate = new Map()
  for (const r of rows) {
    const d = r[dateKey]
    if (!d) continue
    byDate.set(d, (byDate.get(d) ?? 0) + valueFn(r))
  }
  const series = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }))
  return from && to ? fillDateRange(series, from, to) : series
}

const EMPTY_METRIC = { value: 0, series: [] }

// true once employeeIds has been resolved to a concrete (possibly empty)
// list and that list is empty -- i.e. the filter combination matches nobody,
// so every employee-scoped metric can short-circuit without a DB round trip.
function noEmployeesMatch(filters) {
  return !!filters?.employeeIds && filters.employeeIds.length === 0
}

function withEmployeeFilter(query, filters, column = 'employee_id') {
  return filters?.employeeIds ? query.in(column, filters.employeeIds) : query
}

function dayBefore(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

// Point-in-time headcount used by the turnover/retention metrics below:
// active as of `date` if they'd already joined by then and either
// haven't exited yet or exit after `date`. Queries `employees` directly
// (same reasoning as `headcount` itself) so it applies the raw picked
// filters, not the resolved employeeIds list.
async function countEmployeesAsOf(date, company, filters) {
  let query = supabase.from('employees').select('id', { count: 'exact', head: true })
    .eq('company_id', company.id).lte('joining_date', date)
    .or(`exit_date.is.null,exit_date.gt.${date}`)
  if (filters?.departmentId) query = query.eq('department_id', filters.departmentId)
  if (filters?.teamId) query = query.eq('team_id', filters.teamId)
  if (filters?.branchId) query = query.eq('branch_id', filters.branchId)
  if (filters?.employeeId) query = query.eq('id', filters.employeeId)
  const { count } = await query
  return count ?? 0
}

async function countDepartures(from, to, company, filters, statuses) {
  let query = supabase.from('employees').select('id', { count: 'exact', head: true })
    .eq('company_id', company.id).in('employment_status', statuses)
    .gte('exit_date', from).lte('exit_date', to)
  if (filters?.departmentId) query = query.eq('department_id', filters.departmentId)
  if (filters?.teamId) query = query.eq('team_id', filters.teamId)
  if (filters?.branchId) query = query.eq('branch_id', filters.branchId)
  if (filters?.employeeId) query = query.eq('id', filters.employeeId)
  const { count } = await query
  return count ?? 0
}

export const DASHBOARD_METRICS = {
  headcount: {
    label: 'Headcount', unit: '', trend: false,
    // queries `employees` directly, so it applies the raw picked filters
    // rather than the resolved employeeIds list.
    fetch: async (_from, _to, company, filters) => {
      let query = supabase.from('employees').select('id', { count: 'exact', head: true }).eq('company_id', company.id).in('employment_status', ['training', 'probation', 'confirmed'])
      if (filters?.departmentId) query = query.eq('department_id', filters.departmentId)
      if (filters?.teamId) query = query.eq('team_id', filters.teamId)
      if (filters?.branchId) query = query.eq('branch_id', filters.branchId)
      if (filters?.employeeId) query = query.eq('id', filters.employeeId)
      const { count } = await query
      return { value: count ?? 0, series: [] }
    },
  },
  // Turnover/retention/hiring-velocity -- period-aggregate rates and
  // durations (trend: false, series: [], same shape as headcount above),
  // not daily sums. A daily "turnover rate" would be a meaningless
  // granularity no HR team actually reports at; these render as number/
  // progress/gauge widgets exactly like headcount already does, including
  // the existing target_value support on progress/gauge for free.
  turnover_rate: {
    label: 'Turnover rate', unit: '%', trend: false, higherIsBetter: false,
    fetch: async (from, to, company, filters) => {
      const [beginHC, endHC, departures] = await Promise.all([
        countEmployeesAsOf(dayBefore(from), company, filters),
        countEmployeesAsOf(to, company, filters),
        countDepartures(from, to, company, filters, ['resigned', 'terminated']),
      ])
      const avgHC = (beginHC + endHC) / 2
      return { value: avgHC > 0 ? Math.round((departures / avgHC) * 1000) / 10 : 0, series: [] }
    },
  },
  voluntary_turnover_rate: {
    label: 'Voluntary turnover rate', unit: '%', trend: false, higherIsBetter: false,
    fetch: async (from, to, company, filters) => {
      const [beginHC, endHC, departures] = await Promise.all([
        countEmployeesAsOf(dayBefore(from), company, filters),
        countEmployeesAsOf(to, company, filters),
        countDepartures(from, to, company, filters, ['resigned']),
      ])
      const avgHC = (beginHC + endHC) / 2
      return { value: avgHC > 0 ? Math.round((departures / avgHC) * 1000) / 10 : 0, series: [] }
    },
  },
  involuntary_turnover_rate: {
    label: 'Involuntary turnover rate', unit: '%', trend: false, higherIsBetter: false,
    fetch: async (from, to, company, filters) => {
      const [beginHC, endHC, departures] = await Promise.all([
        countEmployeesAsOf(dayBefore(from), company, filters),
        countEmployeesAsOf(to, company, filters),
        countDepartures(from, to, company, filters, ['terminated']),
      ])
      const avgHC = (beginHC + endHC) / 2
      return { value: avgHC > 0 ? Math.round((departures / avgHC) * 1000) / 10 : 0, series: [] }
    },
  },
  // Scoped to *voluntary* departures only, unlike the three turnover
  // metrics above -- an involuntary departure is a company decision, not
  // a "regrettable" loss in the usual HR sense. "Regrettable" = their own
  // most recent performance review (before leaving) was a 4+ out of 5,
  // same rating scale as avg_overall_performance_rating.
  regrettable_turnover_rate: {
    label: 'Regrettable turnover rate', unit: '%', trend: false, higherIsBetter: false,
    fetch: async (from, to, company, filters) => {
      const REGRETTABLE_RATING_THRESHOLD = 4
      let query = supabase.from('employees')
        .select('id, performance_reviews(overall_rating, submitted_at, status)')
        .eq('company_id', company.id).eq('employment_status', 'resigned')
        .gte('exit_date', from).lte('exit_date', to)
      if (filters?.departmentId) query = query.eq('department_id', filters.departmentId)
      if (filters?.teamId) query = query.eq('team_id', filters.teamId)
      if (filters?.branchId) query = query.eq('branch_id', filters.branchId)
      if (filters?.employeeId) query = query.eq('id', filters.employeeId)
      const [{ data: departed }, beginHC, endHC] = await Promise.all([
        query,
        countEmployeesAsOf(dayBefore(from), company, filters),
        countEmployeesAsOf(to, company, filters),
      ])
      let regrettable = 0
      for (const emp of departed ?? []) {
        const reviews = (emp.performance_reviews ?? []).filter((r) => (r.status === 'submitted' || r.status === 'acknowledged') && r.overall_rating != null)
        if (reviews.length === 0) continue
        const latest = reviews.sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))[0]
        if (Number(latest.overall_rating) >= REGRETTABLE_RATING_THRESHOLD) regrettable++
      }
      const avgHC = (beginHC + endHC) / 2
      return { value: avgHC > 0 ? Math.round((regrettable / avgHC) * 1000) / 10 : 0, series: [] }
    },
  },
  // Deliberately a different denominator than turnover above (beginning
  // headcount only, not the average) -- matches the standard HR
  // retention-rate formula, not an inconsistency to reconcile.
  retention_rate: {
    label: 'Retention rate', unit: '%', trend: false,
    fetch: async (from, to, company, filters) => {
      const [beginHC, departures] = await Promise.all([
        countEmployeesAsOf(dayBefore(from), company, filters),
        countDepartures(from, to, company, filters, ['resigned', 'terminated']),
      ])
      const value = beginHC > 0 ? Math.round(((beginHC - departures) / beginHC) * 1000) / 10 : 100
      return { value, series: [] }
    },
  },
  // Department/branch filters only -- a job opening has no team or
  // assigned-employee link, same reasoning as open_roles/
  // headcount_by_department below.
  time_to_hire: {
    label: 'Time to hire (days)', unit: 'days', trend: false, higherIsBetter: false,
    fetch: async (from, to, company, filters) => {
      let query = supabase.from('employees')
        .select('joining_date, application:applications!source_application_id(applied_at, job_openings(department_id, branch_id))')
        .eq('company_id', company.id).not('source_application_id', 'is', null)
        .gte('joining_date', from).lte('joining_date', to)
      const { data } = await query
      const rows = (data ?? []).filter((r) => {
        if (!r.application?.applied_at) return false
        const jo = r.application.job_openings
        if (filters?.departmentId && jo?.department_id !== filters.departmentId) return false
        if (filters?.branchId && jo?.branch_id !== filters.branchId) return false
        return true
      })
      if (rows.length === 0) return { value: 0, series: [] }
      const days = rows.map((r) => (new Date(r.joining_date) - new Date(r.application.applied_at.slice(0, 10))) / 86400000)
      return { value: Math.round((days.reduce((s, d) => s + d, 0) / days.length) * 10) / 10, series: [] }
    },
  },
  time_to_fill: {
    label: 'Time to fill (days)', unit: 'days', trend: false, higherIsBetter: false,
    fetch: async (from, to, company, filters) => {
      let query = supabase.from('job_openings').select('opened_at, closed_at, department_id, branch_id')
        .eq('company_id', company.id).eq('status', 'filled').not('closed_at', 'is', null)
        .gte('closed_at', from).lte('closed_at', to)
      if (filters?.departmentId) query = query.eq('department_id', filters.departmentId)
      if (filters?.branchId) query = query.eq('branch_id', filters.branchId)
      const { data } = await query
      if (!data || data.length === 0) return { value: 0, series: [] }
      const days = data.map((r) => (new Date(r.closed_at) - new Date(r.opened_at)) / 86400000)
      return { value: Math.round((days.reduce((s, d) => s + d, 0) / days.length) * 10) / 10, series: [] }
    },
  },
  attendance_present: {
    label: 'Present days', unit: '', trend: true,
    fetch: async (from, to, company, filters) => {
      if (noEmployeesMatch(filters)) return EMPTY_METRIC
      const { data } = await withEmployeeFilter(supabase.from('attendance').select('attendance_date, employee_id').eq('company_id', company.id).eq('status', 'present').gte('attendance_date', from).lte('attendance_date', to), filters)
      const series = sumByDate(data ?? [], 'attendance_date', () => 1, from, to)
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
  attendance_absent: {
    label: 'Absent days', unit: '', trend: true, higherIsBetter: false,
    fetch: async (from, to, company, filters) => {
      if (noEmployeesMatch(filters)) return EMPTY_METRIC
      const { data } = await withEmployeeFilter(supabase.from('attendance').select('attendance_date, employee_id').eq('company_id', company.id).eq('status', 'absent').gte('attendance_date', from).lte('attendance_date', to), filters)
      const series = sumByDate(data ?? [], 'attendance_date', () => 1, from, to)
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
  attendance_late: {
    label: 'Late days', unit: '', trend: true, higherIsBetter: false,
    fetch: async (from, to, company, filters) => {
      if (noEmployeesMatch(filters)) return EMPTY_METRIC
      const { data } = await withEmployeeFilter(supabase.from('attendance').select('attendance_date, employee_id').eq('company_id', company.id).eq('status', 'late').gte('attendance_date', from).lte('attendance_date', to), filters)
      const series = sumByDate(data ?? [], 'attendance_date', () => 1, from, to)
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
  leave_days_taken: {
    label: 'Leave days taken', unit: '', trend: true,
    fetch: async (from, to, company, filters) => {
      if (noEmployeesMatch(filters)) return EMPTY_METRIC
      const { data } = await withEmployeeFilter(supabase.from('leave_requests').select('start_date, days_requested, employee_id').eq('company_id', company.id).eq('status', 'approved').gte('start_date', from).lte('start_date', to), filters)
      const series = sumByDate(data ?? [], 'start_date', (r) => Number(r.days_requested ?? 0), from, to)
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
  payroll_net: {
    label: 'Payroll net pay', unit: 'Rs', trend: true,
    fetch: async (from, to, company, filters) => {
      if (noEmployeesMatch(filters)) return EMPTY_METRIC
      const { data } = await withEmployeeFilter(supabase.from('payroll_items').select('amount, component_type, created_at, employee_id').eq('company_id', company.id).gte('created_at', from).lte('created_at', `${to}T23:59:59`), filters)
      const rows = (data ?? []).map((r) => ({ date: r.created_at.slice(0, 10), value: (r.component_type === 'earning' ? 1 : -1) * Number(r.amount ?? 0) }))
      const series = sumByDate(rows, 'date', (r) => r.value, from, to)
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
  payroll_gross: {
    label: 'Payroll gross earnings', unit: 'Rs', trend: true,
    fetch: async (from, to, company, filters) => {
      if (noEmployeesMatch(filters)) return EMPTY_METRIC
      const { data } = await withEmployeeFilter(supabase.from('payroll_items').select('amount, created_at, employee_id').eq('company_id', company.id).eq('component_type', 'earning').gte('created_at', from).lte('created_at', `${to}T23:59:59`), filters)
      const rows = (data ?? []).map((r) => ({ date: r.created_at.slice(0, 10), amount: r.amount }))
      const series = sumByDate(rows, 'date', (r) => Number(r.amount ?? 0), from, to)
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
  expense_total: {
    label: 'Expenses claimed', unit: 'Rs', trend: true, higherIsBetter: false,
    fetch: async (from, to, company, filters) => {
      if (noEmployeesMatch(filters)) return EMPTY_METRIC
      const { data } = await withEmployeeFilter(supabase.from('expense_claims').select('amount, expense_date, employee_id').eq('company_id', company.id).in('status', ['approved', 'reimbursed']).gte('expense_date', from).lte('expense_date', to), filters)
      const series = sumByDate(data ?? [], 'expense_date', (r) => Number(r.amount ?? 0), from, to)
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
  open_roles: {
    label: 'Open roles', unit: '', trend: false,
    // job_openings has its own department_id/branch_id -- no employee or
    // team link (a posting isn't assigned to a person or a team), so only
    // those two filters apply here.
    fetch: async (_from, _to, company, filters) => {
      let query = supabase.from('job_openings').select('id', { count: 'exact', head: true }).eq('company_id', company.id).eq('status', 'open')
      if (filters?.departmentId) query = query.eq('department_id', filters.departmentId)
      if (filters?.branchId) query = query.eq('branch_id', filters.branchId)
      const { count } = await query
      return { value: count ?? 0, series: [] }
    },
  },
  new_candidates: {
    label: 'New candidates', unit: '', trend: true,
    // candidates has no employee/department/team/branch link at all (they
    // aren't employees yet) -- this metric ignores the filters entirely.
    fetch: async (from, to, company) => {
      const { data } = await supabase.from('candidates').select('created_at').eq('company_id', company.id).gte('created_at', from).lte('created_at', `${to}T23:59:59`)
      const rows = (data ?? []).map((r) => ({ date: r.created_at.slice(0, 10) }))
      const series = sumByDate(rows, 'date', () => 1, from, to)
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
  timesheet_hours: {
    label: 'Timesheet hours logged', unit: 'h', trend: true,
    fetch: async (from, to, company, filters) => {
      if (noEmployeesMatch(filters)) return EMPTY_METRIC
      const { data } = await withEmployeeFilter(supabase.from('time_entries').select('duration_minutes, entry_date, employee_id').eq('company_id', company.id).gte('entry_date', from).lte('entry_date', to), filters)
      const series = sumByDate(data ?? [], 'entry_date', (r) => Number(r.duration_minutes ?? 0) / 60, from, to)
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
  overtime_hours: {
    label: 'Overtime hours', unit: 'h', trend: true,
    fetch: async (from, to, company, filters) => {
      if (noEmployeesMatch(filters)) return EMPTY_METRIC
      const { data } = await withEmployeeFilter(supabase.from('overtime_records').select('minutes, work_date, employee_id').eq('company_id', company.id).gte('work_date', from).lte('work_date', to), filters)
      const series = sumByDate(data ?? [], 'work_date', (r) => Number(r.minutes ?? 0) / 60, from, to)
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
  loan_outstanding: {
    label: 'Loan balance outstanding', unit: 'Rs', trend: false, higherIsBetter: false,
    // loan_installments has no employee_id of its own -- it hangs off
    // loans.employee_id, so an employee/department/team/branch filter has
    // to resolve the matching loan ids first.
    fetch: async (_from, _to, company, filters) => {
      let loanIds = null
      if (filters?.employeeIds) {
        if (filters.employeeIds.length === 0) return EMPTY_METRIC
        const { data: loans } = await supabase.from('loans').select('id').eq('company_id', company.id).in('employee_id', filters.employeeIds)
        loanIds = (loans ?? []).map((l) => l.id)
        if (loanIds.length === 0) return EMPTY_METRIC
      }
      let query = supabase.from('loan_installments').select('due_amount').eq('company_id', company.id).eq('status', 'pending')
      if (loanIds) query = query.in('loan_id', loanIds)
      const { data } = await query
      return { value: (data ?? []).reduce((s, r) => s + Number(r.due_amount ?? 0), 0), series: [] }
    },
  },
  avg_overall_performance_rating: {
    label: 'Avg. performance rating', unit: '/5', trend: true,
    fetch: async (from, to, company, filters) => {
      if (noEmployeesMatch(filters)) return EMPTY_METRIC
      const { data } = await withEmployeeFilter(supabase.from('performance_reviews').select('overall_rating, submitted_at, employee_id').eq('company_id', company.id).in('status', ['submitted', 'acknowledged']).not('overall_rating', 'is', null).gte('submitted_at', from).lte('submitted_at', `${to}T23:59:59`), filters)
      const rows = (data ?? []).map((r) => ({ date: r.submitted_at.slice(0, 10), amount: Number(r.overall_rating) }))
      const sums = new Map()
      const counts = new Map()
      for (const r of rows) {
        sums.set(r.date, (sums.get(r.date) ?? 0) + r.amount)
        counts.set(r.date, (counts.get(r.date) ?? 0) + 1)
      }
      const series = [...sums.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, sum]) => ({ date, value: Math.round((sum / counts.get(date)) * 100) / 100 }))
      const overallAvg = rows.length > 0 ? Math.round((rows.reduce((s, r) => s + r.amount, 0) / rows.length) * 100) / 100 : 0
      return { value: overallAvg, series }
    },
  },
  performance_reviews_completed: {
    label: 'Reviews completed', unit: '', trend: true,
    fetch: async (from, to, company, filters) => {
      if (noEmployeesMatch(filters)) return EMPTY_METRIC
      const { data } = await withEmployeeFilter(supabase.from('performance_reviews').select('submitted_at, employee_id').eq('company_id', company.id).in('status', ['submitted', 'acknowledged']).gte('submitted_at', from).lte('submitted_at', `${to}T23:59:59`), filters)
      const rows = (data ?? []).map((r) => ({ date: r.submitted_at.slice(0, 10) }))
      const series = sumByDate(rows, 'date', () => 1, from, to)
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
}

export const DASHBOARD_METRIC_KEYS = Object.keys(DASHBOARD_METRICS)

// Leaderboard breakdowns -- a small, separate set (not every metric needs
// one) covering the dimensions most worth ranking by. Each returns
// [{label, value}], sorted desc, for the 'leaderboard' chart type.
export const DASHBOARD_LEADERBOARDS = {
  overtime_by_employee: {
    label: 'Overtime hours by employee',
    fetch: async (from, to, company, filters) => {
      if (noEmployeesMatch(filters)) return []
      const { data } = await withEmployeeFilter(supabase.from('overtime_records').select('minutes, work_date, employee_id, employees(full_name)').eq('company_id', company.id).gte('work_date', from).lte('work_date', to), filters)
      const byEmployee = new Map()
      for (const r of data ?? []) {
        const name = r.employees?.full_name ?? 'Unknown'
        byEmployee.set(name, (byEmployee.get(name) ?? 0) + Number(r.minutes ?? 0) / 60)
      }
      return [...byEmployee.entries()].map(([label, value]) => ({ label, value: Math.round(value * 10) / 10 })).sort((a, b) => b.value - a.value).slice(0, 10)
    },
    // Same query as fetch(), but the raw per-day rows for one clicked
    // employee instead of the grouped total -- powers the drill-down
    // click on a leaderboard row / pie slice.
    drillFetch: async (label, from, to, company, filters) => {
      const { data } = await withEmployeeFilter(supabase.from('overtime_records').select('minutes, work_date, employee_id, employees(full_name)').eq('company_id', company.id).gte('work_date', from).lte('work_date', to), filters)
      return (data ?? [])
        .filter((r) => (r.employees?.full_name ?? 'Unknown') === label)
        .map((r) => ({ date: r.work_date, value: Math.round((Number(r.minutes ?? 0) / 60) * 10) / 10 }))
        .sort((a, b) => a.date.localeCompare(b.date))
    },
  },
  expenses_by_category: {
    label: 'Expenses by category',
    fetch: async (from, to, company, filters) => {
      if (noEmployeesMatch(filters)) return []
      const { data } = await withEmployeeFilter(supabase.from('expense_claims').select('amount, expense_date, employee_id, expense_categories(name)').eq('company_id', company.id).in('status', ['approved', 'reimbursed']).gte('expense_date', from).lte('expense_date', to), filters)
      const byCategory = new Map()
      for (const r of data ?? []) {
        const name = r.expense_categories?.name ?? 'Uncategorized'
        byCategory.set(name, (byCategory.get(name) ?? 0) + Number(r.amount ?? 0))
      }
      return [...byCategory.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
    },
    drillFetch: async (label, from, to, company, filters) => {
      const { data } = await withEmployeeFilter(supabase.from('expense_claims').select('amount, expense_date, employee_id, expense_categories(name)').eq('company_id', company.id).in('status', ['approved', 'reimbursed']).gte('expense_date', from).lte('expense_date', to), filters)
      return (data ?? [])
        .filter((r) => (r.expense_categories?.name ?? 'Uncategorized') === label)
        .map((r) => ({ date: r.expense_date, value: Number(r.amount ?? 0) }))
        .sort((a, b) => a.date.localeCompare(b.date))
    },
  },
  headcount_by_department: {
    label: 'Headcount by department',
    // queries `employees` directly (rather than the pre-aggregated
    // v_headcount_by_department view) so team/branch/employee filters can
    // narrow the population before grouping by department. A department
    // filter still applies too -- it just collapses the chart to one bar,
    // which is the correct (if degenerate) answer to "headcount, filtered
    // to just this department".
    fetch: async (_from, _to, company, filters) => {
      let query = supabase.from('employees').select('department_id, departments!employees_department_id_fkey(name)').eq('company_id', company.id).in('employment_status', ['training', 'probation', 'confirmed'])
      if (filters?.departmentId) query = query.eq('department_id', filters.departmentId)
      if (filters?.teamId) query = query.eq('team_id', filters.teamId)
      if (filters?.branchId) query = query.eq('branch_id', filters.branchId)
      if (filters?.employeeId) query = query.eq('id', filters.employeeId)
      const { data } = await query
      const byDept = new Map()
      for (const r of data ?? []) {
        const name = r.departments?.name ?? 'Unassigned'
        byDept.set(name, (byDept.get(name) ?? 0) + 1)
      }
      return [...byDept.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
    },
    // No natural "date" per row here (a headcount snapshot, not a time
    // series) -- the drill-down instead lists the actual employees that
    // make up the clicked department's bar.
    drillFetch: async (label, _from, _to, company, filters) => {
      let query = supabase.from('employees').select('full_name, department_id, departments!employees_department_id_fkey(name)').eq('company_id', company.id).in('employment_status', ['training', 'probation', 'confirmed'])
      if (filters?.departmentId) query = query.eq('department_id', filters.departmentId)
      if (filters?.teamId) query = query.eq('team_id', filters.teamId)
      if (filters?.branchId) query = query.eq('branch_id', filters.branchId)
      if (filters?.employeeId) query = query.eq('id', filters.employeeId)
      const { data } = await query
      return (data ?? [])
        .filter((r) => (r.departments?.name ?? 'Unassigned') === label)
        .map((r) => ({ date: null, value: r.full_name }))
        .sort((a, b) => String(a.value).localeCompare(String(b.value)))
    },
  },
  overall_rating_by_employee: {
    label: 'Performance rating by employee',
    fetch: async (from, to, company, filters) => {
      if (noEmployeesMatch(filters)) return []
      const { data } = await withEmployeeFilter(supabase.from('performance_reviews').select('overall_rating, submitted_at, employee_id, employees(full_name)').eq('company_id', company.id).in('status', ['submitted', 'acknowledged']).not('overall_rating', 'is', null).gte('submitted_at', from).lte('submitted_at', `${to}T23:59:59`), filters)
      const byEmployee = new Map()
      const counts = new Map()
      for (const r of data ?? []) {
        const name = r.employees?.full_name ?? 'Unknown'
        byEmployee.set(name, (byEmployee.get(name) ?? 0) + Number(r.overall_rating ?? 0))
        counts.set(name, (counts.get(name) ?? 0) + 1)
      }
      return [...byEmployee.entries()].map(([label, sum]) => ({ label, value: Math.round((sum / counts.get(label)) * 100) / 100 })).sort((a, b) => b.value - a.value).slice(0, 10)
    },
    drillFetch: async (label, from, to, company, filters) => {
      const { data } = await withEmployeeFilter(supabase.from('performance_reviews').select('overall_rating, submitted_at, employee_id, employees(full_name)').eq('company_id', company.id).in('status', ['submitted', 'acknowledged']).not('overall_rating', 'is', null).gte('submitted_at', from).lte('submitted_at', `${to}T23:59:59`), filters)
      return (data ?? [])
        .filter((r) => (r.employees?.full_name ?? 'Unknown') === label)
        .map((r) => ({ date: r.submitted_at.slice(0, 10), value: Number(r.overall_rating ?? 0) }))
        .sort((a, b) => a.date.localeCompare(b.date))
    },
  },
}

export const DASHBOARD_LEADERBOARD_KEYS = Object.keys(DASHBOARD_LEADERBOARDS)

// Stacked-bar sources -- one row per date, one numeric key per series
// (Recharts' stacked-bar wants wide format: {date, present, absent, ...}).
// One concrete source rather than a generic "any metric x any dimension"
// engine, same proportionate choice as the leaderboards above.
export const DASHBOARD_STACKED = {
  attendance_by_status: {
    label: 'Attendance by status',
    seriesKeys: ['present', 'absent', 'late', 'on_leave'],
    fetch: async (from, to, company, filters) => {
      if (noEmployeesMatch(filters)) return []
      const { data } = await withEmployeeFilter(supabase.from('attendance').select('attendance_date, status, employee_id').eq('company_id', company.id).gte('attendance_date', from).lte('attendance_date', to), filters)
      const byDate = new Map()
      for (const r of data ?? []) {
        const row = byDate.get(r.attendance_date) ?? { date: r.attendance_date, present: 0, absent: 0, late: 0, on_leave: 0 }
        if (row[r.status] !== undefined) row[r.status] += 1
        byDate.set(r.attendance_date, row)
      }
      for (const date of eachDate(from, to)) {
        if (!byDate.has(date)) byDate.set(date, { date, present: 0, absent: 0, late: 0, on_leave: 0 })
      }
      return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
    },
  },
}

export const DASHBOARD_STACKED_KEYS = Object.keys(DASHBOARD_STACKED)

// 2D cross-tab sources shared by both the heatmap (color-scaled grid) and
// pivot (plain numeric grid) chart types -- one data shape, two renderers.
export const DASHBOARD_CROSSTABS = {
  leave_days_by_type: {
    label: 'Leave days by employee x type',
    fetch: async (from, to, company, filters) => {
      if (noEmployeesMatch(filters)) return { rows: [], columns: [], cells: [] }
      const { data } = await withEmployeeFilter(supabase.from('leave_requests').select('days_requested, start_date, employee_id, employees(full_name), leave_types(name)').eq('company_id', company.id).eq('status', 'approved').gte('start_date', from).lte('start_date', to), filters)
      const rowSet = new Set()
      const colSet = new Set()
      const totals = new Map()
      for (const r of data ?? []) {
        const row = r.employees?.full_name ?? 'Unknown'
        const col = r.leave_types?.name ?? 'Unspecified'
        rowSet.add(row)
        colSet.add(col)
        const key = `${row} ${col}`
        totals.set(key, (totals.get(key) ?? 0) + Number(r.days_requested ?? 0))
      }
      const rows = [...rowSet].sort()
      const columns = [...colSet].sort()
      const cells = []
      for (const row of rows) {
        for (const col of columns) {
          const value = totals.get(`${row} ${col}`) ?? 0
          if (value > 0) cells.push({ row, col, value })
        }
      }
      return { rows, columns, cells }
    },
  },
}

export const DASHBOARD_CROSSTAB_KEYS = Object.keys(DASHBOARD_CROSSTABS)

// Funnel sources -- an ordered sequence of stages with a count each.
export const DASHBOARD_FUNNELS = {
  recruitment_pipeline: {
    label: 'Recruitment pipeline',
    stages: ['applied', 'screening', 'interview', 'offer', 'hired'],
    fetch: async (from, to, company) => {
      const { data } = await supabase.from('applications').select('stage, applied_at').eq('company_id', company.id).gte('applied_at', from).lte('applied_at', `${to}T23:59:59`)
      const counts = new Map()
      for (const r of data ?? []) counts.set(r.stage, (counts.get(r.stage) ?? 0) + 1)
      // A candidate currently sitting in "offer" also passed through
      // "applied"/"screening"/"interview" -- a funnel counts everyone who
      // reached at least this stage, not just who's stuck there now, so
      // each stage's count includes everyone at or past it.
      const stages = ['applied', 'screening', 'interview', 'offer', 'hired']
      const atLeast = stages.map((_, i) => stages.slice(i).reduce((sum, s) => sum + (counts.get(s) ?? 0), 0))
      return stages.map((stage, i) => ({ stage, value: atLeast[i] }))
    },
  },
}

export const DASHBOARD_FUNNEL_KEYS = Object.keys(DASHBOARD_FUNNELS)

// Calculated/formula metrics -- evaluates a formula (e.g. "expense_total
// / payroll_gross * 100") over the built-in DASHBOARD_METRICS registry,
// via the hand-rolled parser in lib/formulaEngine.js (no eval). Returns
// the same {value, series} shape as a built-in metric so it drops
// straight into number/line/bar/area/combo/progress/gauge widgets.
export const DATE_PRESET_OPTIONS = [
  { value: 'last_7', label: 'Last 7 days' },
  { value: 'last_30', label: 'Last 30 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'ytd', label: 'Year to date' },
]

function isoRange(from, to) {
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

function resolveDatePreset(preset) {
  const now = new Date()
  if (preset === 'last_7') return isoRange(new Date(now.getTime() - 6 * 86400000), now)
  if (preset === 'last_30') return isoRange(new Date(now.getTime() - 29 * 86400000), now)
  if (preset === 'this_month') return isoRange(new Date(now.getFullYear(), now.getMonth(), 1), now)
  if (preset === 'last_month') return isoRange(new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth(), 0))
  if (preset === 'ytd') return isoRange(new Date(now.getFullYear(), 0, 1), now)
  return null
}

// The immediately preceding period of equal length -- e.g. range Aug 1-30
// (30 days) compares against Jul 2-31.
export function priorPeriod(from, to) {
  const fromDate = new Date(`${from}T00:00:00`)
  const toDate = new Date(`${to}T00:00:00`)
  const days = Math.round((toDate - fromDate) / 86400000) + 1
  const priorTo = new Date(fromDate.getTime() - 86400000)
  const priorFrom = new Date(priorTo.getTime() - (days - 1) * 86400000)
  return isoRange(priorFrom, priorTo)
}

function shiftYearBack(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setFullYear(d.getFullYear() - 1)
  return d.toISOString().slice(0, 10)
}

// A widget inherits the dashboard's date range unless it sets its own
// (preset or custom) -- same inherit-unless-overridden precedence used
// for the filters below and, elsewhere in this app, for who gets a
// notification (check_expiring_documents' permission-holder lookup).
export function resolveEffectiveRange(widget, dashboardRange) {
  if (widget.date_mode === 'custom' && widget.date_from && widget.date_to) return { from: widget.date_from, to: widget.date_to }
  if (widget.date_mode === 'preset') {
    const preset = resolveDatePreset(widget.date_preset)
    if (preset) return preset
  }
  return dashboardRange
}

// null return means "no comparison" (comparison_mode: 'none').
export function resolveComparisonRange(widget, effectiveRange) {
  const mode = widget.comparison_mode === 'inherit' ? 'previous_period' : widget.comparison_mode
  if (mode === 'none') return null
  if (mode === 'custom' && widget.comparison_from && widget.comparison_to) return { from: widget.comparison_from, to: widget.comparison_to }
  if (mode === 'yoy') return { from: shiftYearBack(effectiveRange.from), to: shiftYearBack(effectiveRange.to) }
  return priorPeriod(effectiveRange.from, effectiveRange.to)
}

// A widget's own filter picks override the dashboard's, per dimension --
// unset (undefined) on the widget means "inherit this one dimension".
export function resolveEffectiveFilterValues(widget, dashboardFilters) {
  const override = widget.filters || {}
  return {
    departmentId: override.departmentId ?? dashboardFilters.departmentId ?? '',
    teamId: override.teamId ?? dashboardFilters.teamId ?? '',
    branchId: override.branchId ?? dashboardFilters.branchId ?? '',
    employeeId: override.employeeId ?? dashboardFilters.employeeId ?? '',
  }
}

export async function evaluateCalculatedMetric(formula, from, to, company, filters) {
  const ast = parseFormula(formula)
  const keys = [...referencedMetrics(ast)]
  const unknown = keys.filter((k) => !DASHBOARD_METRICS[k])
  if (unknown.length > 0) throw new Error(`Unknown metric${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}`)

  const results = await Promise.all(keys.map((k) => DASHBOARD_METRICS[k].fetch(from, to, company, filters)))
  const valueByKey = {}
  const seriesByKey = {}
  keys.forEach((k, i) => { valueByKey[k] = results[i].value; seriesByKey[k] = results[i].series })
  const value = evalFormula(ast, valueByKey)

  // Combined series: union every component metric's dates, evaluate the
  // formula at each (0 for any metric with no row on that date).
  const allDates = new Set()
  keys.forEach((k) => seriesByKey[k].forEach((r) => allDates.add(r.date)))
  const series = [...allDates].sort().map((date) => {
    const rowValues = {}
    keys.forEach((k) => {
      const row = seriesByKey[k].find((r) => r.date === date)
      rowValues[k] = row ? row.value : 0
    })
    return { date, value: evalFormula(ast, rowValues) }
  })

  return { value, series }
}
