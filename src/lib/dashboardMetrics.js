import { supabase } from './supabase'

// Each metric mirrors PetroBind's DASH_METRICS shape (see js/dashboard-engine.js
// in that project): { label, unit, trend, fetch(from, to) => { value, series } }.
// `series` is a [{date, value}] array used by line/bar/area charts; metrics
// without a natural daily breakdown (headcount, open roles, loan balance)
// just return an empty series and render as a number/leaderboard only.
// company scoping happens via RLS -- every query below is already
// company_id-filtered server-side, same as the rest of this app.

function sumByDate(rows, dateKey, valueFn) {
  const byDate = new Map()
  for (const r of rows) {
    const d = r[dateKey]
    if (!d) continue
    byDate.set(d, (byDate.get(d) ?? 0) + valueFn(r))
  }
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }))
}

export const DASHBOARD_METRICS = {
  headcount: {
    label: 'Headcount', unit: '', trend: false,
    fetch: async () => {
      const { count } = await supabase.from('employees').select('id', { count: 'exact', head: true }).in('employment_status', ['training', 'probation', 'confirmed'])
      return { value: count ?? 0, series: [] }
    },
  },
  attendance_present: {
    label: 'Present days', unit: '', trend: true,
    fetch: async (from, to) => {
      const { data } = await supabase.from('attendance').select('attendance_date').eq('status', 'present').gte('attendance_date', from).lte('attendance_date', to)
      const series = sumByDate(data ?? [], 'attendance_date', () => 1)
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
  attendance_absent: {
    label: 'Absent days', unit: '', trend: true, higherIsBetter: false,
    fetch: async (from, to) => {
      const { data } = await supabase.from('attendance').select('attendance_date').eq('status', 'absent').gte('attendance_date', from).lte('attendance_date', to)
      const series = sumByDate(data ?? [], 'attendance_date', () => 1)
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
  attendance_late: {
    label: 'Late days', unit: '', trend: true, higherIsBetter: false,
    fetch: async (from, to) => {
      const { data } = await supabase.from('attendance').select('attendance_date').eq('status', 'late').gte('attendance_date', from).lte('attendance_date', to)
      const series = sumByDate(data ?? [], 'attendance_date', () => 1)
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
  leave_days_taken: {
    label: 'Leave days taken', unit: '', trend: true,
    fetch: async (from, to) => {
      const { data } = await supabase.from('leave_requests').select('start_date, days_requested').eq('status', 'approved').gte('start_date', from).lte('start_date', to)
      const series = sumByDate(data ?? [], 'start_date', (r) => Number(r.days_requested ?? 0))
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
  payroll_net: {
    label: 'Payroll net pay', unit: 'Rs', trend: true,
    fetch: async (from, to) => {
      const { data } = await supabase.from('payroll_items').select('amount, component_type, created_at').gte('created_at', from).lte('created_at', `${to}T23:59:59`)
      const rows = (data ?? []).map((r) => ({ date: r.created_at.slice(0, 10), value: (r.component_type === 'earning' ? 1 : -1) * Number(r.amount ?? 0) }))
      const series = sumByDate(rows, 'date', (r) => r.value)
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
  payroll_gross: {
    label: 'Payroll gross earnings', unit: 'Rs', trend: true,
    fetch: async (from, to) => {
      const { data } = await supabase.from('payroll_items').select('amount, created_at').eq('component_type', 'earning').gte('created_at', from).lte('created_at', `${to}T23:59:59`)
      const rows = (data ?? []).map((r) => ({ date: r.created_at.slice(0, 10), amount: r.amount }))
      const series = sumByDate(rows, 'date', (r) => Number(r.amount ?? 0))
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
  expense_total: {
    label: 'Expenses claimed', unit: 'Rs', trend: true, higherIsBetter: false,
    fetch: async (from, to) => {
      const { data } = await supabase.from('expense_claims').select('amount, expense_date').in('status', ['approved', 'reimbursed']).gte('expense_date', from).lte('expense_date', to)
      const series = sumByDate(data ?? [], 'expense_date', (r) => Number(r.amount ?? 0))
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
  open_roles: {
    label: 'Open roles', unit: '', trend: false,
    fetch: async () => {
      const { count } = await supabase.from('job_openings').select('id', { count: 'exact', head: true }).eq('status', 'open')
      return { value: count ?? 0, series: [] }
    },
  },
  new_candidates: {
    label: 'New candidates', unit: '', trend: true,
    fetch: async (from, to) => {
      const { data } = await supabase.from('candidates').select('created_at').gte('created_at', from).lte('created_at', `${to}T23:59:59`)
      const rows = (data ?? []).map((r) => ({ date: r.created_at.slice(0, 10) }))
      const series = sumByDate(rows, 'date', () => 1)
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
  timesheet_hours: {
    label: 'Timesheet hours logged', unit: 'h', trend: true,
    fetch: async (from, to) => {
      const { data } = await supabase.from('time_entries').select('duration_minutes, entry_date').gte('entry_date', from).lte('entry_date', to)
      const series = sumByDate(data ?? [], 'entry_date', (r) => Number(r.duration_minutes ?? 0) / 60)
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
  overtime_hours: {
    label: 'Overtime hours', unit: 'h', trend: true,
    fetch: async (from, to) => {
      const { data } = await supabase.from('overtime_records').select('minutes, work_date').gte('work_date', from).lte('work_date', to)
      const series = sumByDate(data ?? [], 'work_date', (r) => Number(r.minutes ?? 0) / 60)
      return { value: series.reduce((s, r) => s + r.value, 0), series }
    },
  },
  loan_outstanding: {
    label: 'Loan balance outstanding', unit: 'Rs', trend: false, higherIsBetter: false,
    fetch: async () => {
      const { data } = await supabase.from('loan_installments').select('due_amount').eq('status', 'pending')
      return { value: (data ?? []).reduce((s, r) => s + Number(r.due_amount ?? 0), 0), series: [] }
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
    fetch: async (from, to) => {
      const { data } = await supabase.from('overtime_records').select('minutes, work_date, employees(full_name)').gte('work_date', from).lte('work_date', to)
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
    fetch: async (from, to) => {
      const { data } = await supabase.from('expense_claims').select('amount, expense_date, expense_categories(name)').in('status', ['approved', 'reimbursed']).gte('expense_date', from).lte('expense_date', to)
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
    fetch: async () => {
      const { data } = await supabase.from('v_headcount_by_department').select('department_name, employee_count')
      return (data ?? []).map((r) => ({ label: r.department_name ?? 'Unassigned', value: r.employee_count })).sort((a, b) => b.value - a.value)
    },
  },
}

export const DASHBOARD_LEADERBOARD_KEYS = Object.keys(DASHBOARD_LEADERBOARDS)
