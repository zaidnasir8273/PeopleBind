import { supabase } from './supabase'

// Per-employee sibling of dashboardMetrics.js's registry pattern. Each entry
// is { label, unit, higherIsBetter, fetch(employeeId, from, to) => rawValue
// | null, normalize(rawValue) => 1-5 | null }. fetch returns null (not 0)
// when the employee has no qualifying rows in the period -- that's "not
// enough data", not a punitive worst score. company scoping happens via
// RLS, same as the rest of this app.

function higherIsBetterBand(value) {
  if (value == null) return null
  if (value >= 0.95) return 5
  if (value >= 0.85) return 4
  if (value >= 0.70) return 3
  if (value >= 0.50) return 2
  return 1
}

function lowerIsBetterBand(value) {
  if (value == null) return null
  if (value <= 0.05) return 5
  if (value <= 0.15) return 4
  if (value <= 0.30) return 3
  if (value <= 0.50) return 2
  return 1
}

export const STANDARD_KPI_METRICS = {
  attendance_rate: {
    label: 'Attendance rate', unit: '%', higherIsBetter: true,
    fetch: async (employeeId, from, to) => {
      const { data } = await supabase.from('attendance').select('status').eq('employee_id', employeeId).gte('attendance_date', from).lte('attendance_date', to)
      if (!data || data.length === 0) return null
      const present = data.filter((r) => r.status === 'present' || r.status === 'late').length
      return present / data.length
    },
    normalize: higherIsBetterBand,
  },
  punctuality_rate: {
    label: 'Punctuality rate', unit: '%', higherIsBetter: true,
    fetch: async (employeeId, from, to) => {
      const { data } = await supabase.from('attendance').select('status, late_minutes').eq('employee_id', employeeId).gte('attendance_date', from).lte('attendance_date', to).in('status', ['present', 'late'])
      if (!data || data.length === 0) return null
      const onTime = data.filter((r) => !r.late_minutes || r.late_minutes === 0).length
      return onTime / data.length
    },
    normalize: higherIsBetterBand,
  },
  unplanned_leave_rate: {
    label: 'Unplanned leave rate', unit: '%', higherIsBetter: false,
    fetch: async (employeeId, from, to) => {
      const { data } = await supabase.from('leave_requests').select('start_date, created_at').eq('employee_id', employeeId).eq('status', 'approved').gte('start_date', from).lte('start_date', to)
      if (!data || data.length === 0) return null
      const unplanned = data.filter((r) => {
        const noticeDays = (new Date(`${r.start_date}T00:00:00`) - new Date(r.created_at)) / (1000 * 60 * 60 * 24)
        return noticeDays < 2
      }).length
      return unplanned / data.length
    },
    normalize: lowerIsBetterBand,
  },
  timesheet_rejection_rate: {
    label: 'Timesheet rejection rate', unit: '%', higherIsBetter: false,
    fetch: async (employeeId, from, to) => {
      const { data } = await supabase.from('timesheets').select('status').eq('employee_id', employeeId).gte('period_start', from).lte('period_end', to)
      if (!data || data.length === 0) return null
      const rejected = data.filter((r) => r.status === 'rejected').length
      return rejected / data.length
    },
    normalize: lowerIsBetterBand,
  },
  billable_utilization: {
    label: 'Billable utilization', unit: '%', higherIsBetter: true,
    fetch: async (employeeId, from, to) => {
      const { data } = await supabase.from('timesheets').select('total_minutes, billable_minutes').eq('employee_id', employeeId).gte('period_start', from).lte('period_end', to)
      const rows = (data ?? []).filter((r) => r.total_minutes > 0)
      if (rows.length === 0) return null
      const avg = rows.reduce((sum, r) => sum + r.billable_minutes / r.total_minutes, 0) / rows.length
      return avg
    },
    normalize: higherIsBetterBand,
  },
  expense_approval_rate: {
    label: 'Expense approval rate', unit: '%', higherIsBetter: true,
    fetch: async (employeeId, from, to) => {
      const { data } = await supabase.from('expense_claims').select('status').eq('employee_id', employeeId).gte('expense_date', from).lte('expense_date', to).in('status', ['approved', 'reimbursed', 'rejected'])
      if (!data || data.length === 0) return null
      const approved = data.filter((r) => r.status === 'approved' || r.status === 'reimbursed').length
      return approved / data.length
    },
    normalize: higherIsBetterBand,
  },
  onboarding_completion_rate: {
    label: 'Onboarding completion rate', unit: '%', higherIsBetter: true,
    fetch: async (employeeId, from, to) => {
      const { data } = await supabase.from('onboarding_tasks').select('status').eq('employee_id', employeeId).gte('due_date', from).lte('due_date', to)
      if (!data || data.length === 0) return null
      const completed = data.filter((r) => r.status === 'completed').length
      return completed / data.length
    },
    normalize: higherIsBetterBand,
  },
  goal_completion_rate: {
    label: 'Goal completion rate', unit: '%', higherIsBetter: true,
    fetch: async (employeeId, from, to) => {
      const { data } = await supabase.from('goals').select('status').eq('employee_id', employeeId).gte('target_date', from).lte('target_date', to)
      if (!data || data.length === 0) return null
      const completed = data.filter((r) => r.status === 'completed').length
      return completed / data.length
    },
    normalize: higherIsBetterBand,
  },
}

export const STANDARD_KPI_METRIC_KEYS = Object.keys(STANDARD_KPI_METRICS)
