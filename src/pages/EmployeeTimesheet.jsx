import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { Loader2, Square, AlertTriangle } from 'lucide-react'
import { ChevronLeftIcon } from '../components/ui/chevron-left'
import { ChevronRightIcon } from '../components/ui/chevron-right'
import { PlusIcon } from '../components/ui/plus'
import { PlayIcon } from '../components/ui/play'
import { RotateCCWIcon } from '../components/ui/rotate-ccw'
import { SendIcon } from '../components/ui/send'
import { CircleCheckIcon } from '../components/ui/circle-check'
import { LockIcon } from '../components/ui/lock'
import { SquareStackIcon } from '../components/ui/square-stack'
import { SunIcon } from '../components/ui/sun'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'
import { SkeletonBlock } from '../components/Skeleton'
import { TimesheetWeekGrid } from '../components/TimesheetWeekGrid'
import { SearchableSelect } from '../components/SearchableSelect'

const EMPTY_FORM = { project_id: '', task_id: '', hours: '', billable: true, notes: '' }

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function shiftDate(dateStr, delta) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function weekRange(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  const day = d.getDay() // 0=Sun..6=Sat
  const mondayOffset = day === 0 ? -6 : 1 - day
  const start = shiftDate(dateStr, mondayOffset)
  const end = shiftDate(start, 6)
  return { start, end }
}

function formatDateLong(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function minutesToHoursLabel(mins) {
  const h = mins / 60
  return Number.isInteger(h) ? String(h) : h.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

const STATUS_COPY = {
  draft: { label: 'Draft', icon: null },
  submitted: { label: 'Submitted — awaiting approval', icon: SendIcon },
  approved: { label: 'Approved', icon: CircleCheckIcon },
  rejected: { label: 'Changes requested', icon: AlertTriangle },
  locked: { label: 'Locked', icon: LockIcon },
}

export default function EmployeeTimesheet() {
  const { employeeRecord, company, profile } = useAuth()
  const [view, setView] = useState('week')
  const [date, setDate] = useState(todayStr())

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [memberProjectIds, setMemberProjectIds] = useState(new Set())
  const [restrictedProjectIds, setRestrictedProjectIds] = useState(new Set())

  const [timesheetRow, setTimesheetRow] = useState(null)
  const [weekTotals, setWeekTotals] = useState({ totalMinutes: 0, billableMinutes: 0, entryCount: 0 })
  const [submitting, setSubmitting] = useState(false)

  const [timer, setTimer] = useState(null) // running_timers row, or null
  const [timerBusy, setTimerBusy] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [startForm, setStartForm] = useState({ project_id: '', task_id: '', billable: true, notes: '' })

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [entryDate, setEntryDate] = useState(date)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const { start: weekStart, end: weekEnd } = weekRange(date)
  const status = timesheetRow?.status ?? 'draft'
  const editable = status === 'draft' || status === 'rejected'

  const loadLookups = useCallback(async () => {
    const [{ data: projs }, { data: tsks }, { data: members }] = await Promise.all([
      supabase.from('projects').select('id, name, clients(name)').eq('status', 'active').order('name'),
      supabase.from('timesheet_tasks').select('id, name').eq('status', 'active').order('name'),
      supabase.from('project_members').select('project_id, employee_id'),
    ])
    setProjects(projs ?? [])
    setTasks(tsks ?? [])
    const restricted = new Set((members ?? []).map((m) => m.project_id))
    const mine = new Set((members ?? []).filter((m) => m.employee_id === employeeRecord?.id).map((m) => m.project_id))
    setRestrictedProjectIds(restricted)
    setMemberProjectIds(mine)
  }, [employeeRecord])

  const loadTimer = useCallback(async () => {
    if (!employeeRecord) return
    const { data } = await supabase
      .from('running_timers')
      .select('id, started_at, project_id, task_id, billable, notes, projects(name), timesheet_tasks(name)')
      .eq('employee_id', employeeRecord.id)
      .maybeSingle()
    setTimer(data ?? null)
  }, [employeeRecord])

  const loadDay = useCallback(async () => {
    if (!employeeRecord) return
    setLoading(true)
    const { data: dayRows } = await supabase
      .from('time_entries')
      .select('id, project_id, task_id, duration_minutes, billable, notes, status, projects(name, clients(name)), timesheet_tasks(name)')
      .eq('employee_id', employeeRecord.id)
      .eq('entry_date', date)
      .order('created_at', { ascending: false })
    setEntries(dayRows ?? [])
    setLoading(false)
  }, [employeeRecord, date])

  const loadTimesheetStatus = useCallback(async () => {
    if (!employeeRecord) return
    const { data } = await supabase
      .from('timesheets')
      .select('id, status, submitted_at, approved_at, rejection_reason, total_minutes, billable_minutes')
      .eq('employee_id', employeeRecord.id)
      .eq('period_start', weekStart)
      .maybeSingle()
    setTimesheetRow(data ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeRecord, weekStart])

  useEffect(() => { loadLookups() }, [loadLookups])
  useEffect(() => { loadDay() }, [loadDay])
  useEffect(() => { loadTimer() }, [loadTimer])
  useEffect(() => { loadTimesheetStatus() }, [loadTimesheetStatus])

  // The full weekly grid doesn't fit a phone screen -- fall back to the
  // day-by-day view there instead of squeezing the desktop table.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 760px)')
    function handle() { if (mq.matches) setView('day') }
    handle()
    mq.addEventListener('change', handle)
    return () => mq.removeEventListener('change', handle)
  }, [])

  // Tick the live elapsed-time display while a timer is running.
  useEffect(() => {
    if (!timer) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [timer])

  const dayTotalMinutes = entries.reduce((sum, e) => sum + e.duration_minutes, 0)
  const elapsedMs = timer ? now - new Date(timer.started_at).getTime() : 0

  async function commitTimer(runningTimer) {
    const minutes = Math.round((Date.now() - new Date(runningTimer.started_at).getTime()) / 60000)
    if (minutes <= 0) {
      await supabase.from('running_timers').delete().eq('id', runningTimer.id)
      return
    }
    const { error: insertError } = await supabase.from('time_entries').insert({
      company_id: company.id,
      employee_id: employeeRecord.id,
      project_id: runningTimer.project_id,
      task_id: runningTimer.task_id,
      entry_date: new Date(runningTimer.started_at).toISOString().slice(0, 10),
      duration_minutes: minutes,
      billable: runningTimer.billable,
      notes: runningTimer.notes || null,
      submitted_by: profile.id,
    })
    await supabase.from('running_timers').delete().eq('id', runningTimer.id)
    if (insertError) toast.error(insertError.message || 'Failed to save the timer as an entry')
  }

  async function startTimer(projectId, taskId, billable, notes) {
    if (!projectId) {
      toast.error('Pick a project first')
      return
    }
    setTimerBusy(true)
    if (timer) {
      await commitTimer(timer)
      toast.success('Previous timer stopped and logged')
    }
    const { error: startError } = await supabase.from('running_timers').insert({
      company_id: company.id,
      employee_id: employeeRecord.id,
      project_id: projectId,
      task_id: taskId || null,
      billable: billable ?? true,
      notes: notes || null,
    })
    setTimerBusy(false)
    if (startError) {
      toast.error(startError.message || 'Failed to start timer')
      return
    }
    toast.success('Timer started')
    setStartForm({ project_id: '', task_id: '', billable: true, notes: '' })
    await loadTimer()
    await loadDay()
  }

  async function stopTimer() {
    if (!timer) return
    setTimerBusy(true)
    await commitTimer(timer)
    setTimerBusy(false)
    setTimer(null)
    toast.success('Timer stopped and logged')
    await loadDay()
  }

  function openAdd(forDate) {
    setForm(EMPTY_FORM)
    setEntryDate(forDate ?? date)
    setError(null)
    setDrawerOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const minutes = Math.round(Number(form.hours) * 60)
    if (!minutes || minutes <= 0) {
      setError('Enter a valid number of hours')
      return
    }

    setSaving(true)
    const { error: saveError } = await supabase.from('time_entries').insert({
      company_id: company.id,
      employee_id: employeeRecord.id,
      project_id: form.project_id,
      task_id: form.task_id || null,
      entry_date: entryDate,
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

    toast.success('Time logged')
    setDrawerOpen(false)
    loadDay()
  }

  async function submitTimesheet() {
    if (weekTotals.entryCount === 0) {
      toast.error('Add some time before submitting')
      return
    }
    setSubmitting(true)
    const { data: tsRow, error: upsertError } = await supabase
      .from('timesheets')
      .upsert({
        company_id: company.id,
        employee_id: employeeRecord.id,
        period_start: weekStart,
        period_end: weekEnd,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        total_minutes: weekTotals.totalMinutes,
        billable_minutes: weekTotals.billableMinutes,
        rejection_reason: null,
      }, { onConflict: 'employee_id,period_start' })
      .select()
      .single()

    if (upsertError) {
      toast.error(upsertError.message || 'Failed to submit timesheet')
      setSubmitting(false)
      return
    }

    await supabase.from('time_entries')
      .update({ timesheet_id: tsRow.id })
      .eq('employee_id', employeeRecord.id)
      .gte('entry_date', weekStart)
      .lte('entry_date', weekEnd)

    setSubmitting(false)
    toast.success('Timesheet submitted for approval')
    loadTimesheetStatus()
  }

  const projectOptions = useMemo(() => projects
    .filter((p) => !restrictedProjectIds.has(p.id) || memberProjectIds.has(p.id))
    .map((p) => ({ value: p.id, label: p.name, group: p.clients?.name || 'No client' })),
  [projects, restrictedProjectIds, memberProjectIds])

  const taskOptions = useMemo(() => tasks.map((t) => ({ value: t.id, label: t.name })), [tasks])

  const statusInfo = STATUS_COPY[status]
  const isCurrentWeek = weekStart <= todayStr() && weekEnd >= todayStr()
  const todayDow = new Date(`${todayStr()}T00:00:00`).getDay() // 0=Sun, 4=Thu, 5=Fri, 6=Sat
  const lateInWeek = todayDow === 0 || todayDow >= 4
  const showMissingHoursWarning = isCurrentWeek && lateInWeek && status === 'draft' && weekTotals.entryCount === 0

  return (
    <div className="page-inner" style={{ maxWidth: 980 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">EMPLOYEE PORTAL</p>
          <h1 className="page-title">Timesheet</h1>
        </div>
        <button className="btn-primary btn-icon" onClick={() => openAdd()}>
          <PlusIcon size={16} /> Add entry
        </button>
      </div>

      <div className="report-section">
        {timer ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className="status-dot" style={{ background: 'var(--accent-hover)' }} />
            <div style={{ flex: 1, minWidth: 160 }}>
              <strong>{timer.projects?.name}{timer.timesheet_tasks?.name ? ` · ${timer.timesheet_tasks.name}` : ''}</strong>
              {timer.notes && <div className="muted" style={{ fontSize: 12 }}>{timer.notes}</div>}
            </div>
            <span className="mono" style={{ fontSize: 20, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {formatElapsed(elapsedMs)}
            </span>
            <button className="btn-danger btn-icon" onClick={stopTimer} disabled={timerBusy}>
              <Square size={14} /> Stop
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
            <label className="field" style={{ flex: 1, minWidth: 180 }}>
              <span>Project</span>
              <SearchableSelect options={projectOptions} value={startForm.project_id} onChange={(v) => setStartForm({ ...startForm, project_id: v })} placeholder="Select project" />
            </label>
            <label className="field" style={{ flex: 1, minWidth: 140 }}>
              <span>Task</span>
              <SearchableSelect options={taskOptions} value={startForm.task_id} onChange={(v) => setStartForm({ ...startForm, task_id: v })} placeholder="Optional" />
            </label>
            <label className="field" style={{ minWidth: 160 }}>
              <span>Note</span>
              <input value={startForm.notes} onChange={(e) => setStartForm({ ...startForm, notes: e.target.value })} placeholder="Optional" />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 9, whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={startForm.billable} onChange={(e) => setStartForm({ ...startForm, billable: e.target.checked })} /> Billable
            </label>
            <button
              className="btn-primary btn-icon"
              disabled={timerBusy}
              onClick={() => startTimer(startForm.project_id, startForm.task_id, startForm.billable, startForm.notes)}
            >
              <PlayIcon size={14} /> Start timer
            </button>
          </div>
        )}
      </div>

      <div className="tabs">
        <button className={`tab-button ts-week-tab${view === 'week' ? ' active' : ''}`} onClick={() => setView('week')}><SquareStackIcon size={15} /> Week</button>
        <button className={`tab-button${view === 'day' ? ' active' : ''}`} onClick={() => setView('day')}><SunIcon size={15} /> Day</button>
      </div>

      <div className="date-nav">
        <button className="date-nav-btn" onClick={() => setDate((d) => shiftDate(d, view === 'week' ? -7 : -1))} aria-label="Previous">
          <ChevronLeftIcon size={16} />
        </button>
        <span className="date-nav-label">
          {view === 'day' ? formatDateLong(date) : `Week of ${formatDateLong(weekStart)}`}
        </span>
        <button className="date-nav-btn" onClick={() => setDate((d) => shiftDate(d, view === 'week' ? 7 : 1))} aria-label="Next">
          <ChevronRightIcon size={16} />
        </button>
        {date !== todayStr() && (
          <button className="link-button" onClick={() => setDate(todayStr())}>Jump to today</button>
        )}
      </div>

      {view === 'week' && (
        <>
          <div className="ts-status-bar">
            <span className={`status-badge status-${status}`}>
              {statusInfo.icon && <statusInfo.icon size={12} />}
              {statusInfo.label}
            </span>
            {status === 'rejected' && timesheetRow?.rejection_reason && (
              <span className="muted" style={{ fontSize: 13 }}>“{timesheetRow.rejection_reason}”</span>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className="muted mono" style={{ fontSize: 13 }}>{minutesToHoursLabel(weekTotals.totalMinutes)}h this week</span>
              {editable && (
                <button className="btn-primary btn-icon" onClick={submitTimesheet} disabled={submitting}>
                  {submitting && <Loader2 size={14} className="btn-spinner" />}
                  <SendIcon size={14} /> {status === 'rejected' ? 'Resubmit' : 'Submit for approval'}
                </button>
              )}
            </div>
          </div>
          {showMissingHoursWarning && (
            <div className="ts-warning-banner">
              <AlertTriangle size={14} />
              No time logged yet this week — don't forget to fill in your timesheet before it's due.
            </div>
          )}
        </>
      )}

      {view === 'day' && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <div className="mini-card" style={{ minWidth: 140 }}>
            <div className="muted" style={{ fontSize: 12 }}>Day total</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>{minutesToHoursLabel(dayTotalMinutes)}h</div>
          </div>
        </div>
      )}

      {view === 'week' ? (
        <TimesheetWeekGrid
          employeeId={employeeRecord?.id}
          date={date}
          company={company}
          profile={profile}
          projects={projects}
          tasks={tasks}
          restrictedProjectIds={restrictedProjectIds}
          memberProjectIds={memberProjectIds}
          readOnly={!editable}
          onTotalsChange={setWeekTotals}
        />
      ) : loading ? (
        <SkeletonBlock rows={3} />
      ) : entries.length === 0 ? (
        <div className="empty-state"><p>No time logged for this day.</p></div>
      ) : (
        entries.map((e) => (
          <div key={e.id} className="mini-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
              <strong style={{ fontSize: 14 }}>{e.projects?.name}{e.timesheet_tasks?.name ? ` · ${e.timesheet_tasks.name}` : ''}</strong>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="mono">{minutesToHoursLabel(e.duration_minutes)}h</span>
                {editable && (
                  <button
                    className="link-button"
                    style={{ display: 'flex' }}
                    aria-label="Start a new timer for this"
                    data-tooltip="Restart"
                    onClick={() => startTimer(e.project_id, e.task_id, e.billable, null)}
                  >
                    <RotateCCWIcon size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="muted" style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
              {e.projects?.clients?.name}
              {!e.billable && <span className="ts-nonbillable-badge">Non-billable</span>}
            </div>
            {e.notes && <div className="muted" style={{ fontSize: 12 }}>{e.notes}</div>}
            <span className={`status-badge status-${e.status}`} style={{ width: 'fit-content' }}>{e.status}</span>
          </div>
        ))
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={`Log time · ${formatDateLong(entryDate)}`}>
        <form onSubmit={handleSubmit} className="drawer-form">
          <label className="field">
            <span>Project</span>
            <SearchableSelect options={projectOptions} value={form.project_id} onChange={(v) => setForm({ ...form, project_id: v })} placeholder="Select project" />
          </label>

          <label className="field">
            <span>Task</span>
            <SearchableSelect options={taskOptions} value={form.task_id} onChange={(v) => setForm({ ...form, task_id: v })} placeholder="Optional" />
          </label>

          <label className="field">
            <span>Date</span>
            <input type="date" required value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </label>

          <label className="field">
            <span>Hours</span>
            <input type="number" min="0.25" step="0.25" required value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={form.billable} onChange={(e) => setForm({ ...form, billable: e.target.checked })} /> Billable
          </label>

          <label className="field">
            <span>Notes</span>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
          </label>

          {!form.project_id && (
            <p className="muted" style={{ fontSize: 12, margin: 0 }}>Pick a project to log time against.</p>
          )}

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={saving || !form.project_id}>
            {saving && <Loader2 size={14} className="btn-spinner" />}
            {saving ? 'Saving…' : 'Log time'}
          </button>
        </form>
      </Drawer>
    </div>
  )
}
