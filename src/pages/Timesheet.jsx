import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { Loader2, AlertTriangle } from 'lucide-react'
import { PlusIcon } from '../components/ui/plus'
import { CheckIcon } from '../components/ui/check'
import { XIcon } from '../components/ui/x'
import { ClockIcon } from '../components/ui/clock'
import { WalletIcon } from '../components/ui/wallet'
import { BanIcon } from '../components/ui/ban'
import { SendIcon } from '../components/ui/send'
import { CircleCheckIcon } from '../components/ui/circle-check'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'
import { SkeletonTable, SkeletonBlock } from '../components/Skeleton'
import { TimesheetWeekGrid } from '../components/TimesheetWeekGrid'
import { SearchableSelect } from '../components/SearchableSelect'

const TEAL = '#1f7a63'
const TEAL_DEEP = '#123f33'
const GOLD = '#c98a2e'
const LINE_COLOR = '#e2ddd0'
const INK_SOFT = '#5a6472'
const axisStyle = { fontSize: 12, fontFamily: 'Inter, sans-serif', fill: INK_SOFT }
const tooltipStyle = { fontSize: 13, fontFamily: 'Inter, sans-serif', borderRadius: 8, border: `1px solid ${LINE_COLOR}` }

function shiftDate(dateStr, delta) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function weekRange(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  const day = d.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const start = shiftDate(dateStr, mondayOffset)
  return { start, end: shiftDate(start, 6) }
}

function formatDateLong(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function minutesToHoursLabel(mins) {
  const h = (mins || 0) / 60
  return Number.isInteger(h) ? String(h) : h.toFixed(1)
}

const EMPTY_ENTRY = {
  employee_id: '',
  project_id: '',
  task_id: '',
  entry_date: todayStr(),
  hours: '',
  billable: true,
  notes: '',
}

const STATUS_FILTERS = ['all', 'pending', 'approved', 'rejected']
const TEAM_STATUS_FILTERS = ['submitted', 'approved', 'rejected', 'locked', 'all']

export default function Timesheet() {
  const { profile, company } = useAuth()

  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])

  const [view, setView] = useState('team')

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_ENTRY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

  const loadLookups = useCallback(async () => {
    const [{ data: emps }, { data: depts }, { data: projs }, { data: tsks }] = await Promise.all([
      supabase.from('employees').select('id, employee_code, full_name, department_id, departments!employees_department_id_fkey(name)').in('employment_status', ['training', 'probation', 'confirmed']).order('full_name'),
      supabase.from('departments').select('id, name').eq('status', 'active').order('name'),
      supabase.from('projects').select('id, name, clients(name)').eq('status', 'active').order('name'),
      supabase.from('timesheet_tasks').select('id, name').eq('status', 'active').order('name'),
    ])
    setEmployees(emps ?? [])
    setDepartments(depts ?? [])
    setProjects(projs ?? [])
    setTasks(tsks ?? [])
  }, [])

  const loadEntries = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('time_entries')
      .select('id, entry_date, duration_minutes, billable, notes, status, created_at, employees(full_name, employee_code), projects(name, clients(name)), timesheet_tasks(name)')
      .order('entry_date', { ascending: false })
    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    const { data } = await query.limit(200)
    setEntries(data ?? [])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { loadLookups() }, [loadLookups])
  useEffect(() => { if (view === 'entries') loadEntries() }, [loadEntries, view])

  const pendingCount = useMemo(() => entries.filter((e) => e.status === 'pending').length, [entries])

  function openNewEntry() {
    setForm(EMPTY_ENTRY)
    setError(null)
    setDrawerOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const minutes = Math.round(Number(form.hours) * 60)
    if (!form.employee_id || !form.project_id || !minutes || minutes <= 0) {
      setError('Fill in employee, project, and a valid number of hours')
      return
    }

    setSaving(true)
    const { error: saveError } = await supabase.from('time_entries').insert({
      company_id: company.id,
      employee_id: form.employee_id,
      project_id: form.project_id,
      task_id: form.task_id || null,
      entry_date: form.entry_date,
      duration_minutes: minutes,
      billable: form.billable,
      notes: form.notes || null,
      submitted_by: profile.id,
    })
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      toast.error(saveError.message || 'Something went wrong')
      return
    }

    toast.success('Time entry logged')
    setDrawerOpen(false)
    loadEntries()
  }

  async function review(id, status) {
    const { error: reviewError } = await supabase
      .from('time_entries')
      .update({ status, reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
      .eq('id', id)
    if (!reviewError) {
      toast.success(status === 'approved' ? 'Entry approved' : 'Entry rejected')
      loadEntries()
    } else {
      toast.error(reviewError.message)
    }
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAllPending() {
    const pendingIds = entries.filter((e) => e.status === 'pending').map((e) => e.id)
    setSelectedIds((prev) => (prev.size === pendingIds.length ? new Set() : new Set(pendingIds)))
  }

  async function bulkReview(status) {
    setBulkBusy(true)
    const ids = [...selectedIds]
    const { error: bulkError } = await supabase
      .from('time_entries')
      .update({ status, reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
      .in('id', ids)
    setBulkBusy(false)
    if (!bulkError) {
      toast.success(`${ids.length} entr${ids.length > 1 ? 'ies' : 'y'} ${status}`)
      setSelectedIds(new Set())
      loadEntries()
    } else {
      toast.error(bulkError.message)
    }
  }

  const projectOptions = useMemo(() => projects.map((p) => ({ value: p.id, label: p.name, group: p.clients?.name || 'No client' })), [projects])
  const taskOptions = useMemo(() => tasks.map((t) => ({ value: t.id, label: t.name })), [tasks])
  const employeeOptions = useMemo(() => employees.map((e) => ({ value: e.id, label: e.full_name, sublabel: e.employee_code })), [employees])

  return (
    <div className="page-inner" style={{ maxWidth: 1080 }}>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Timesheets</h1>
        </div>
        <button className="btn-primary btn-icon" onClick={openNewEntry}>
          <PlusIcon size={16} /> Log time
        </button>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab-button ${view === 'team' ? 'active' : ''}`} onClick={() => setView('team')}>Team timesheets</button>
        <button className={`tab-button ${view === 'entries' ? 'active' : ''}`} onClick={() => setView('entries')}>Entries</button>
        <button className={`tab-button ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>Dashboard</button>
      </div>

      {view === 'team' && (
        <TeamTimesheetsTab employees={employees} departments={departments} projects={projects} tasks={tasks} profile={profile} company={company} />
      )}

      {view === 'dashboard' && (
        <DashboardTab employees={employees} />
      )}

      {view === 'entries' && (
        <>
          <div className="field-row" style={{ maxWidth: 220, marginBottom: 4 }}>
            <label className="field">
              <span>Status</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                {STATUS_FILTERS.map((s) => (
                  <option key={s} value={s}>{s === 'all' ? 'All' : s[0].toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </label>
          </div>

          {selectedIds.size > 0 && (
            <div className="bulk-action-bar">
              <span>{selectedIds.size} selected</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-secondary" disabled={bulkBusy} onClick={() => bulkReview('approved')}>Approve selected</button>
                <button className="btn-secondary" disabled={bulkBusy} onClick={() => bulkReview('rejected')}>Reject selected</button>
                <button className="link-button" onClick={() => setSelectedIds(new Set())}>Clear</button>
              </div>
            </div>
          )}

          {loading ? (
            <SkeletonTable rows={6} columns={8} />
          ) : entries.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 20 }}>
              <p>{pendingCount > 0 ? 'No entries.' : 'Nothing pending.'}</p>
              <p className="muted">Logged time will show up here for review.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size > 0 && selectedIds.size === entries.filter((e) => e.status === 'pending').length}
                      onChange={toggleSelectAllPending}
                    />
                  </th>
                  <th>Employee</th>
                  <th>Project</th>
                  <th>Task</th>
                  <th>Date</th>
                  <th>Hours</th>
                  <th>Billable</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td onClick={(ev) => ev.stopPropagation()}>
                      {e.status === 'pending' && (
                        <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggleSelect(e.id)} />
                      )}
                    </td>
                    <td>
                      {e.employees?.full_name}
                      <span className="mono" style={{ display: 'block', color: 'var(--ink-soft)', fontSize: 12 }}>{e.employees?.employee_code}</span>
                    </td>
                    <td>{e.projects?.name}{e.projects?.clients?.name ? <span className="muted" style={{ display: 'block', fontSize: 12 }}>{e.projects.clients.name}</span> : null}</td>
                    <td>{e.timesheet_tasks?.name ?? '—'}</td>
                    <td className="mono">{formatDate(e.entry_date)}</td>
                    <td className="mono">{minutesToHoursLabel(e.duration_minutes)}h</td>
                    <td>{e.billable ? <CheckIcon size={14} style={{ color: 'var(--accent)' }} /> : <span className="muted">—</span>}</td>
                    <td><span className={`status-badge status-${e.status}`}>{e.status}</span></td>
                    <td>
                      {e.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn-icon-round approve" onClick={() => review(e.id, 'approved')} aria-label="Approve">
                            <CheckIcon size={14} />
                          </button>
                          <button className="btn-icon-round reject" onClick={() => review(e.id, 'rejected')} aria-label="Reject">
                            <XIcon size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Log time">
        <form onSubmit={handleSubmit} className="drawer-form">
          <label className="field">
            <span>Employee</span>
            <SearchableSelect options={employeeOptions} value={form.employee_id} onChange={(v) => setForm({ ...form, employee_id: v })} placeholder="Select employee" />
          </label>

          <label className="field">
            <span>Project</span>
            <SearchableSelect options={projectOptions} value={form.project_id} onChange={(v) => setForm({ ...form, project_id: v })} placeholder="Select project" />
          </label>

          <label className="field">
            <span>Task</span>
            <SearchableSelect options={taskOptions} value={form.task_id} onChange={(v) => setForm({ ...form, task_id: v })} placeholder="Optional" />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Date</span>
              <input type="date" required value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} />
            </label>
            <label className="field">
              <span>Hours</span>
              <input type="number" min="0.25" step="0.25" required value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
            </label>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={form.billable} onChange={(e) => setForm({ ...form, billable: e.target.checked })} /> Billable
          </label>

          <label className="field">
            <span>Notes</span>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
          </label>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Log time'}
          </button>
        </form>
      </Drawer>
    </div>
  )
}

/* =========================== TEAM TIMESHEETS =========================== */

function TeamTimesheetsTab({ employees, departments, projects, tasks, profile, company }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const [employeeFilter, setEmployeeFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('submitted')
  const [dateFilter, setDateFilter] = useState('')

  const [selected, setSelected] = useState(null) // timesheet row, drawer target
  const [reasonDraft, setReasonDraft] = useState('')
  const [showReasonFor, setShowReasonFor] = useState(null) // 'reject' | 'request_changes' | null
  const [actionBusy, setActionBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('timesheets')
      .select('id, employee_id, period_start, period_end, status, submitted_at, approved_at, rejection_reason, total_minutes, billable_minutes, employees(full_name, employee_code, department_id, departments!employees_department_id_fkey(name))')
      .order('submitted_at', { ascending: false })
      .limit(200)
    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    if (employeeFilter) query = query.eq('employee_id', employeeFilter)
    if (dateFilter) query = query.lte('period_start', dateFilter).gte('period_end', dateFilter)
    const { data } = await query
    setRows(data ?? [])
    setLoading(false)
  }, [statusFilter, employeeFilter, dateFilter])

  useEffect(() => { load() }, [load])

  const filteredRows = useMemo(() => {
    if (!departmentFilter) return rows
    return rows.filter((r) => r.employees?.department_id === departmentFilter)
  }, [rows, departmentFilter])

  function openDrawer(row) {
    setSelected(row)
    setShowReasonFor(null)
    setReasonDraft('')
  }

  async function approve() {
    setActionBusy(true)
    const { error } = await supabase.from('timesheets')
      .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: profile.id, rejection_reason: null })
      .eq('id', selected.id)
    setActionBusy(false)
    if (error) { toast.error(error.message); return }
    toast.success('Timesheet approved')
    setSelected(null)
    load()
  }

  async function sendBack(kind) {
    if (!reasonDraft.trim()) {
      toast.error('A reason is required')
      return
    }
    setActionBusy(true)
    const { error } = await supabase.from('timesheets')
      .update({ status: 'rejected', rejection_reason: reasonDraft.trim(), approved_at: null, approved_by: null })
      .eq('id', selected.id)
    setActionBusy(false)
    if (error) { toast.error(error.message); return }
    toast.success(kind === 'reject' ? 'Timesheet rejected' : 'Changes requested')
    setSelected(null)
    load()
  }

  return (
    <div>
      <div className="field-row" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <label className="field" style={{ minWidth: 180 }}>
          <span>Employee</span>
          <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}>
            <option value="">All employees</option>
            {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
          </select>
        </label>
        <label className="field" style={{ minWidth: 160 }}>
          <span>Department</span>
          <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
            <option value="">All departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <label className="field" style={{ minWidth: 160 }}>
          <span>Status</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {TEAM_STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>{s === 'all' ? 'All' : s[0].toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </label>
        <label className="field" style={{ minWidth: 160 }}>
          <span>Week containing</span>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        </label>
      </div>

      {loading ? (
        <SkeletonTable rows={6} columns={7} />
      ) : filteredRows.length === 0 ? (
        <div className="empty-state">
          <p>No timesheets match these filters.</p>
          <p className="muted">Submitted weekly timesheets will show up here for approval.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Week</th>
              <th>Total hours</th>
              <th>Billable</th>
              <th>Non-billable</th>
              <th>Status</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => (
              <tr key={r.id} onClick={() => openDrawer(r)}>
                <td>
                  {r.employees?.full_name}
                  <span className="mono" style={{ display: 'block', color: 'var(--ink-soft)', fontSize: 12 }}>{r.employees?.departments?.name ?? '—'}</span>
                </td>
                <td className="mono">{formatDate(r.period_start)} – {formatDate(r.period_end)}</td>
                <td className="mono">{minutesToHoursLabel(r.total_minutes)}h</td>
                <td className="mono">{minutesToHoursLabel(r.billable_minutes)}h</td>
                <td className="mono">{minutesToHoursLabel(r.total_minutes - r.billable_minutes)}h</td>
                <td><span className={`status-badge status-${r.status}`}>{r.status}</span></td>
                <td className="mono">{r.submitted_at ? formatDate(r.submitted_at.slice(0, 10)) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.employees?.full_name} · Week of ${formatDateLong(selected.period_start)}` : ''} wide>
        {selected && (
          <div style={{ padding: '0 24px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <span className={`status-badge status-${selected.status}`}>{selected.status}</span>
              <span className="muted mono" style={{ fontSize: 13 }}>
                {minutesToHoursLabel(selected.total_minutes)}h total · {minutesToHoursLabel(selected.billable_minutes)}h billable
              </span>
              {selected.submitted_at && <span className="muted" style={{ fontSize: 12 }}>Submitted {formatDate(selected.submitted_at.slice(0, 10))}</span>}
            </div>

            {selected.status === 'rejected' && selected.rejection_reason && (
              <div className="ts-warning-banner" style={{ marginBottom: 16 }}>
                <AlertTriangle size={14} />
                “{selected.rejection_reason}”
              </div>
            )}

            <TimesheetWeekGrid
              employeeId={selected.employee_id}
              date={selected.period_start}
              company={company}
              profile={profile}
              projects={projects}
              tasks={tasks}
              restrictedProjectIds={new Set()}
              memberProjectIds={new Set()}
              readOnly={selected.status === 'locked'}
            />

            {selected.status === 'submitted' && (
              <div style={{ marginTop: 20, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
                {showReasonFor ? (
                  <div className="drawer-form" style={{ padding: 0 }}>
                    <label className="field">
                      <span>Reason {showReasonFor === 'reject' ? 'for rejection' : 'for requesting changes'}</span>
                      <textarea rows={3} value={reasonDraft} onChange={(e) => setReasonDraft(e.target.value)} placeholder="Explain what needs to change…" />
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-danger" disabled={actionBusy} onClick={() => sendBack(showReasonFor)}>
                        {actionBusy && <Loader2 size={14} className="btn-spinner" />} {showReasonFor === 'reject' ? 'Confirm rejection' : 'Send back for changes'}
                      </button>
                      <button className="link-button" onClick={() => setShowReasonFor(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn-primary btn-icon" disabled={actionBusy} onClick={approve}>
                      <CircleCheckIcon size={14} /> Approve
                    </button>
                    <button className="btn-secondary btn-icon" onClick={() => setShowReasonFor('request_changes')}>
                      <SendIcon size={14} /> Request changes
                    </button>
                    <button className="btn-danger btn-icon" onClick={() => setShowReasonFor('reject')}>
                      <XIcon size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}

/* =========================== DASHBOARD =========================== */

function DashboardTab({ employees }) {
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState([])
  const [submittedCount, setSubmittedCount] = useState(0)
  const [missingCount, setMissingCount] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    const { start: weekStart, end: weekEnd } = weekRange(todayStr())
    const eightWeeksAgo = shiftDate(weekRange(todayStr()).start, -7 * 7)

    const [{ data: entryRows }, { count: pendingApprovals }, { data: thisWeekTimesheets }] = await Promise.all([
      supabase.from('time_entries')
        .select('employee_id, project_id, entry_date, duration_minutes, billable, employees(full_name), projects(name)')
        .gte('entry_date', eightWeeksAgo)
        .lte('entry_date', weekEnd),
      supabase.from('timesheets').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
      supabase.from('timesheets').select('employee_id').gte('period_start', weekStart).lte('period_start', weekStart).in('status', ['submitted', 'approved', 'locked']),
    ])

    setEntries(entryRows ?? [])
    setSubmittedCount(pendingApprovals ?? 0)

    const submittedEmployeeIds = new Set((thisWeekTimesheets ?? []).map((t) => t.employee_id))
    setMissingCount(employees.filter((e) => !submittedEmployeeIds.has(e.id)).length)

    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees.length])

  useEffect(() => { if (employees.length >= 0) load() }, [load])

  const { start: weekStart, end: weekEnd } = weekRange(todayStr())
  const thisWeekEntries = useMemo(() => entries.filter((e) => e.entry_date >= weekStart && e.entry_date <= weekEnd), [entries, weekStart, weekEnd])

  const totalMinutes = thisWeekEntries.reduce((s, e) => s + e.duration_minutes, 0)
  const billableMinutes = thisWeekEntries.filter((e) => e.billable).reduce((s, e) => s + e.duration_minutes, 0)
  const nonBillableMinutes = totalMinutes - billableMinutes
  const utilization = totalMinutes > 0 ? Math.round((billableMinutes / totalMinutes) * 100) : 0

  const byEmployee = useMemo(() => {
    const map = new Map()
    for (const e of thisWeekEntries) {
      const name = e.employees?.full_name ?? 'Unknown'
      map.set(name, (map.get(name) ?? 0) + e.duration_minutes / 60)
    }
    return [...map.entries()].map(([name, hours]) => ({ name, hours: Math.round(hours * 10) / 10 })).sort((a, b) => b.hours - a.hours).slice(0, 8)
  }, [thisWeekEntries])

  const byProject = useMemo(() => {
    const map = new Map()
    for (const e of thisWeekEntries) {
      const name = e.projects?.name ?? 'Unknown'
      map.set(name, (map.get(name) ?? 0) + e.duration_minutes / 60)
    }
    return [...map.entries()].map(([name, hours]) => ({ name, hours: Math.round(hours * 10) / 10 })).sort((a, b) => b.hours - a.hours).slice(0, 8)
  }, [thisWeekEntries])

  const billableSplit = [
    { name: 'This week', billable: Math.round((billableMinutes / 60) * 10) / 10, nonBillable: Math.round((nonBillableMinutes / 60) * 10) / 10 },
  ]

  const weeklyTrend = useMemo(() => {
    const buckets = []
    for (let i = 7; i >= 0; i--) {
      const wStart = shiftDate(weekStart, -7 * i)
      const wEnd = shiftDate(wStart, 6)
      const mins = entries.filter((e) => e.entry_date >= wStart && e.entry_date <= wEnd).reduce((s, e) => s + e.duration_minutes, 0)
      buckets.push({ label: formatDate(wStart).replace(/\d{4}$/, '').trim(), hours: Math.round((mins / 60) * 10) / 10 })
    }
    return buckets
  }, [entries, weekStart])

  if (loading) return <SkeletonBlock rows={4} />

  return (
    <div>
      <div className="stat-row" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
        <StatTile icon={ClockIcon} label="Total hours (this week)" value={`${minutesToHoursLabel(totalMinutes)}h`} />
        <StatTile icon={WalletIcon} label="Billable hours" value={`${minutesToHoursLabel(billableMinutes)}h`} />
        <StatTile icon={BanIcon} label="Non-billable hours" value={`${minutesToHoursLabel(nonBillableMinutes)}h`} />
        <StatTile icon={Send} label="Pending approvals" value={submittedCount} />
        <StatTile icon={AlertTriangle} label="Missing this week" value={missingCount} />
        <StatTile icon={CheckCircle2} label="Utilization" value={`${utilization}%`} />
      </div>

      <div className="report-section">
        <p className="section-heading">Hours by employee — this week</p>
        {byEmployee.length === 0 ? <p className="muted" style={{ padding: '24px 0' }}>No time logged this week yet.</p> : (
          <ResponsiveContainer width="100%" height={Math.max(180, byEmployee.length * 32)}>
            <BarChart data={byEmployee} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid stroke={LINE_COLOR} horizontal={false} />
              <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} width={120} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}h`} />
              <Bar dataKey="hours" fill={TEAL_DEEP} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="report-section">
        <p className="section-heading">Billable vs non-billable — this week</p>
        {totalMinutes === 0 ? <p className="muted" style={{ padding: '24px 0' }}>No time logged this week yet.</p> : (
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={billableSplit} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid stroke={LINE_COLOR} horizontal={false} />
              <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}h`} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'Inter, sans-serif' }} />
              <Bar dataKey="billable" name="Billable" stackId="a" fill={TEAL} radius={[6, 0, 0, 6]} />
              <Bar dataKey="nonBillable" name="Non-billable" stackId="a" fill={LINE_COLOR} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="report-section">
        <p className="section-heading">Hours by project — this week</p>
        {byProject.length === 0 ? <p className="muted" style={{ padding: '24px 0' }}>No time logged this week yet.</p> : (
          <ResponsiveContainer width="100%" height={Math.max(180, byProject.length * 32)}>
            <BarChart data={byProject} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid stroke={LINE_COLOR} horizontal={false} />
              <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} width={120} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}h`} />
              <Bar dataKey="hours" fill={GOLD} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="report-section">
        <p className="section-heading">Weekly hours trend — last 8 weeks</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={weeklyTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid stroke={LINE_COLOR} vertical={false} />
            <XAxis dataKey="label" tick={axisStyle} axisLine={{ stroke: LINE_COLOR }} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}h`} />
            <Line type="monotone" dataKey="hours" name="Total hours" stroke={TEAL_DEEP} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function StatTile({ icon: Icon, label, value }) {
  return (
    <div className="stat-card">
      <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Icon size={13} /> {label}</span>
      <span className="stat-value" style={{ fontSize: 22 }}>{value}</span>
    </div>
  )
}
