import { supabase } from './supabase'

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

function sumByDate(rows, dateKey, valueFn) {
  const byDate = new Map()
  for (const r of rows) {
    const d = r[dateKey]
    if (!d) continue
    byDate.set(d, (byDate.get(d) ?? 0) + valueFn(r))
  }
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }))
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
  attendance_present: {
    label: 'Present days', unit: '', trend: true,
    fetch: async (from, to, company, filters) => {
      if (noEmployeesMatch(filters)) return EMPTY_METRIC
      const { data } = await withEmployeeFilter(supabase.from('attendance').select('attendance_date, employee_id').eq('company_id', company.id).eq('status', 'present').gte('attendance_date', from).lte('attendance_date', to), filters)
      const series = sumByDate(data ?? [], 'attendance_date', () => 1)
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
  attendance_absent: {
    label: 'Absent days', unit: '', trend: true, higherIsBetter: false,
    fetch: async (from, to, company, filters) => {
      if (noEmployeesMatch(filters)) return EMPTY_METRIC
      const { data } = await withEmployeeFilter(supabase.from('attendance').select('attendance_date, employee_id').eq('company_id', company.id).eq('status', 'absent').gte('attendance_date', from).lte('attendance_date', to), filters)
      const series = sumByDate(data ?? [], 'attendance_date', () => 1)
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
  attendance_late: {
    label: 'Late days', unit: '', trend: true, higherIsBetter: false,
    fetch: async (from, to, company, filters) => {
      if (noEmployeesMatch(filters)) return EMPTY_METRIC
      const { data } = await withEmployeeFilter(supabase.from('attendance').select('attendance_date, employee_id').eq('company_id', company.id).eq('status', 'late').gte('attendance_date', from).lte('attendance_date', to), filters)
      const series = sumByDate(data ?? [], 'attendance_date', () => 1)
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
  leave_days_taken: {
    label: 'Leave days taken', unit: '', trend: true,
    fetch: async (from, to, company, filters) => {
      if (noEmployeesMatch(filters)) return EMPTY_METRIC
      const { data } = await withEmployeeFilter(supabase.from('leave_requests').select('start_date, days_requested, employee_id').eq('company_id', company.id).eq('status', 'approved').gte('start_date', from).lte('start_date', to), filters)
      const series = sumByDate(data ?? [], 'start_date', (r) => Number(r.days_requested ?? 0))
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
  payroll_net: {
    label: 'Payroll net pay', unit: 'Rs', trend: true,
    fetch: async (from, to, company, filters) => {
      if (noEmployeesMatch(filters)) return EMPTY_METRIC
      const { data } = await withEmployeeFilter(supabase.from('payroll_items').select('amount, component_type, created_at, employee_id').eq('company_id', company.id).gte('created_at', from).lte('created_at', `${to}T23:59:59`), filters)
      const rows = (data ?? []).map((r) => ({ date: r.created_at.slice(0, 10), value: (r.component_type === 'earning' ? 1 : -1) * Number(r.amount ?? 0) }))
      const series = sumByDate(rows, 'date', (r) => r.value)
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
  payroll_gross: {
    label: 'Payroll gross earnings', unit: 'Rs', trend: true,
    fetch: async (from, to, company, filters) => {
      if (noEmployeesMatch(filters)) return EMPTY_METRIC
      const { data } = await withEmployeeFilter(supabase.from('payroll_items').select('amount, created_at, employee_id').eq('company_id', company.id).eq('component_type', 'earning').gte('created_at', from).lte('created_at', `${to}T23:59:59`), filters)
      const rows = (data ?? []).map((r) => ({ date: r.created_at.slice(0, 10), amount: r.amount }))
      const series = sumByDate(rows, 'date', (r) => Number(r.amount ?? 0))
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
  expense_total: {
    label: 'Expenses claimed', unit: 'Rs', trend: true, higherIsBetter: false,
    fetch: async (from, to, company, filters) => {
      if (noEmployeesMatch(filters)) return EMPTY_METRIC
      const { data } = await withEmployeeFilter(supabase.from('expense_claims').select('amount, expense_date, employee_id').eq('company_id', company.id).in('status', ['approved', 'reimbursed']).gte('expense_date', from).lte('expense_date', to), filters)
      const series = sumByDate(data ?? [], 'expense_date', (r) => Number(r.amount ?? 0))
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
      const series = sumByDate(rows, 'date', () => 1)
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
  timesheet_hours: {
    label: 'Timesheet hours logged', unit: 'h', trend: true,
    fetch: async (from, to, company, filters) => {
      if (noEmployeesMatch(filters)) return EMPTY_METRIC
      const { data } = await withEmployeeFilter(supabase.from('time_entries').select('duration_minutes, entry_date, employee_id').eq('company_id', company.id).gte('entry_date', from).lte('entry_date', to), filters)
      const series = sumByDate(data ?? [], 'entry_date', (r) => Number(r.duration_minutes ?? 0) / 60)
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
  overtime_hours: {
    label: 'Overtime hours', unit: 'h', trend: true,
    fetch: async (from, to, company, filters) => {
      if (noEmployeesMatch(filters)) return EMPTY_METRIC
      const { data } = await withEmployeeFilter(supabase.from('overtime_records').select('minutes, work_date, employee_id').eq('company_id', company.id).gte('work_date', from).lte('work_date', to), filters)
      const series = sumByDate(data ?? [], 'work_date', (r) => Number(r.minutes ?? 0) / 60)
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
      const series = sumByDate(rows, 'date', () => 1)
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
  },
}

export const DASHBOARD_LEADERBOARD_KEYS = Object.keys(DASHBOARD_LEADERBOARDS)
