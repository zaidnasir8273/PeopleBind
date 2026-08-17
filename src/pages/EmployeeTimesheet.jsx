import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Plus, Loader2, Play, Square, RotateCcw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'
import { SkeletonBlock } from '../components/Skeleton'
import { TimesheetWeekGrid } from '../components/TimesheetWeekGrid'

const EMPTY_FORM = { project_id: '', task_id: '', hours: '', notes: '' }

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function shiftDate(dateStr, delta) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
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

export default function EmployeeTimesheet() {
  const { employeeRecord, company, profile } = useAuth()
  const [view, setView] = useState('day')
  const [date, setDate] = useState(todayStr())

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])

  const [timer, setTimer] = useState(null) // running_timers row, or null
  const [timerBusy, setTimerBusy] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [startForm, setStartForm] = useState({ project_id: '', task_id: '' })

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [entryDate, setEntryDate] = useState(date)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const loadLookups = useCallback(async () => {
    const [{ data: projs }, { data: tsks }] = await Promise.all([
      supabase.from('projects').select('id, name, clients(name)').eq('status', 'active').order('name'),
      supabase.from('timesheet_tasks').select('id, name').eq('status', 'active').order('name'),
    ])
    setProjects(projs ?? [])
    setTasks(tsks ?? [])
  }, [])

  const loadTimer = useCallback(async () => {
    if (!employeeRecord) return
    const { data } = await supabase
      .from('running_timers')
      .select('id, started_at, project_id, task_id, notes, projects(name), timesheet_tasks(name)')
      .eq('employee_id', employeeRecord.id)
      .maybeSingle()
    setTimer(data ?? null)
  }, [employeeRecord])

  const load = useCallback(async () => {
    if (!employeeRecord) return
    setLoading(true)
    const { data: dayRows } = await supabase
      .from('time_entries')
      .select('id, project_id, task_id, hours, notes, status, projects(name, clients(name)), timesheet_tasks(name)')
      .eq('employee_id', employeeRecord.id)
      .eq('entry_date', date)
      .order('created_at', { ascending: false })
    setEntries(dayRows ?? [])
    setLoading(false)
  }, [employeeRecord, date])

  useEffect(() => {
    loadLookups()
  }, [loadLookups])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    loadTimer()
  }, [loadTimer])

  // Tick the live elapsed-time display while a timer is running.
  useEffect(() => {
    if (!timer) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [timer])

  const dayTotal = entries.reduce((sum, e) => sum + Number(e.hours), 0)
  const elapsedMs = timer ? now - new Date(timer.started_at).getTime() : 0

  async function commitTimer(runningTimer) {
    const hours = Math.round(((Date.now() - new Date(runningTimer.started_at).getTime()) / 3600000) * 100) / 100
    if (hours <= 0) {
      await supabase.from('running_timers').delete().eq('id', runningTimer.id)
      return
    }
    const { error: insertError } = await supabase.from('time_entries').insert({
      company_id: company.id,
      employee_id: employeeRecord.id,
      project_id: runningTimer.project_id,
      task_id: runningTimer.task_id,
      entry_date: new Date(runningTimer.started_at).toISOString().slice(0, 10),
      hours,
      notes: runningTimer.notes || null,
      submitted_by: profile.id,
    })
    await supabase.from('running_timers').delete().eq('id', runningTimer.id)
    if (insertError) toast.error(insertError.message || 'Failed to save the timer as an entry')
  }

  async function startTimer(projectId, taskId) {
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
    })
    setTimerBusy(false)
    if (startError) {
      toast.error(startError.message || 'Failed to start timer')
      return
    }
    toast.success('Timer started')
    await loadTimer()
    await load()
  }

  async function stopTimer() {
    if (!timer) return
    setTimerBusy(true)
    await commitTimer(timer)
    setTimerBusy(false)
    setTimer(null)
    toast.success('Timer stopped and logged')
    await load()
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
    setSaving(true)

    const { error: saveError } = await supabase.from('time_entries').insert({
      company_id: company.id,
      employee_id: employeeRecord.id,
      project_id: form.project_id,
      task_id: form.task_id || null,
      entry_date: entryDate,
      hours: Number(form.hours),
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
    load()
  }

  return (
    <div className="page-inner" style={{ maxWidth: 900 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">EMPLOYEE PORTAL</p>
          <h1 className="page-title">Timesheet</h1>
        </div>
        <button className="btn-primary btn-icon" onClick={() => openAdd()}>
          <Plus size={16} /> Add entry
        </button>
      </div>

      <div className="report-section">
        {timer ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className="status-dot" style={{ background: 'var(--accent-hover)' }} />
            <div style={{ flex: 1, minWidth: 160 }}>
              <strong>{timer.projects?.name}{timer.timesheet_tasks?.name ? ` · ${timer.timesheet_tasks.name}` : ''}</strong>
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
            <label className="field" style={{ flex: 1, minWidth: 160 }}>
              <span>Project</span>
              <select value={startForm.project_id} onChange={(e) => setStartForm({ ...startForm, project_id: e.target.value })}>
                <option value="">— Select —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.clients?.name ? ` (${p.clients.name})` : ''}</option>)}
              </select>
            </label>
            <label className="field" style={{ flex: 1, minWidth: 140 }}>
              <span>Task</span>
              <select value={startForm.task_id} onChange={(e) => setStartForm({ ...startForm, task_id: e.target.value })}>
                <option value="">—</option>
                {tasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <button
              className="btn-primary btn-icon"
              disabled={timerBusy}
              onClick={() => startTimer(startForm.project_id, startForm.task_id)}
            >
              <Play size={14} /> Start timer
            </button>
          </div>
        )}
      </div>

      <div className="tabs">
        <button className={`tab-button${view === 'day' ? ' active' : ''}`} onClick={() => setView('day')}>Day</button>
        <button className={`tab-button${view === 'week' ? ' active' : ''}`} onClick={() => setView('week')}>Week</button>
      </div>

      <div className="date-nav">
        <button className="date-nav-btn" onClick={() => setDate((d) => shiftDate(d, view === 'week' ? -7 : -1))} aria-label="Previous">
          <ChevronLeft size={16} />
        </button>
        <span className="date-nav-label">
          {view === 'day' ? formatDateLong(date) : `Week of ${formatDateLong(weekRange(date).start)}`}
        </span>
        <button className="date-nav-btn" onClick={() => setDate((d) => shiftDate(d, view === 'week' ? 7 : 1))} aria-label="Next">
          <ChevronRight size={16} />
        </button>
      </div>

      {view === 'day' && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <div className="mini-card" style={{ minWidth: 140 }}>
            <div className="muted" style={{ fontSize: 12 }}>Day total</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>{dayTotal}h</div>
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonBlock rows={3} />
      ) : view === 'day' ? (
        entries.length === 0 ? (
          <div className="empty-state"><p>No time logged for this day.</p></div>
        ) : (
          entries.map((e) => (
            <div key={e.id} className="mini-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                <strong style={{ fontSize: 14 }}>{e.projects?.name}{e.timesheet_tasks?.name ? ` · ${e.timesheet_tasks.name}` : ''}</strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="mono">{e.hours}h</span>
                  <button
                    className="link-button"
                    style={{ display: 'flex' }}
                    aria-label="Start a new timer for this"
                    data-tooltip="Restart"
                    onClick={() => startTimer(e.project_id, e.task_id)}
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>
              {e.projects?.clients?.name && <div className="muted" style={{ fontSize: 12 }}>{e.projects.clients.name}</div>}
              {e.notes && <div className="muted" style={{ fontSize: 12 }}>{e.notes}</div>}
              <span className={`status-badge status-${e.status}`} style={{ width: 'fit-content' }}>{e.status}</span>
            </div>
          ))
        )
      ) : (
        <TimesheetWeekGrid
          employeeId={employeeRecord?.id}
          date={date}
          company={company}
          profile={profile}
          projects={projects}
          tasks={tasks}
        />
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={`Log time · ${formatDateLong(entryDate)}`}>
        <form onSubmit={handleSubmit} className="drawer-form">
          <label className="field">
            <span>Project</span>
            <select required value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
              <option value="">— Select —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.clients?.name ? ` (${p.clients.name})` : ''}</option>)}
            </select>
          </label>

          <label className="field">
            <span>Task</span>
            <select value={form.task_id} onChange={(e) => setForm({ ...form, task_id: e.target.value })}>
              <option value="">—</option>
              {tasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>

          <label className="field">
            <span>Date</span>
            <input type="date" required value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </label>

          <label className="field">
            <span>Hours</span>
            <input type="number" min="0.25" step="0.25" required value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
          </label>

          <label className="field">
            <span>Notes</span>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
          </label>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={14} className="btn-spinner" />}
            {saving ? 'Saving…' : 'Log time'}
          </button>
        </form>
      </Drawer>
    </div>
  )
}
