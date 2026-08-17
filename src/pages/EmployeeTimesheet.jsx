import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Plus, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'
import { SkeletonBlock } from '../components/Skeleton'

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

export default function EmployeeTimesheet() {
  const { employeeRecord, company, profile } = useAuth()
  const [date, setDate] = useState(todayStr())
  const [entries, setEntries] = useState([])
  const [weekTotal, setWeekTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const loadLookups = useCallback(async () => {
    const [{ data: projs }, { data: tsks }] = await Promise.all([
      supabase.from('projects').select('id, name, client_name').eq('status', 'active').order('name'),
      supabase.from('timesheet_tasks').select('id, name').eq('status', 'active').order('name'),
    ])
    setProjects(projs ?? [])
    setTasks(tsks ?? [])
  }, [])

  const load = useCallback(async () => {
    if (!employeeRecord) return
    setLoading(true)
    const { start, end } = weekRange(date)
    const [{ data: dayRows }, { data: weekRows }] = await Promise.all([
      supabase
        .from('time_entries')
        .select('id, hours, notes, status, projects(name, client_name), timesheet_tasks(name)')
        .eq('employee_id', employeeRecord.id)
        .eq('entry_date', date)
        .order('created_at', { ascending: false }),
      supabase
        .from('time_entries')
        .select('hours')
        .eq('employee_id', employeeRecord.id)
        .gte('entry_date', start)
        .lte('entry_date', end),
    ])
    setEntries(dayRows ?? [])
    setWeekTotal((weekRows ?? []).reduce((sum, r) => sum + Number(r.hours), 0))
    setLoading(false)
  }, [employeeRecord, date])

  useEffect(() => {
    loadLookups()
  }, [loadLookups])

  useEffect(() => {
    load()
  }, [load])

  const dayTotal = entries.reduce((sum, e) => sum + Number(e.hours), 0)

  function openAdd() {
    setForm(EMPTY_FORM)
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
      entry_date: date,
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
        <button className="btn-primary btn-icon" onClick={openAdd}>
          <Plus size={16} /> Add entry
        </button>
      </div>

      <div className="date-nav">
        <button className="date-nav-btn" onClick={() => setDate((d) => shiftDate(d, -1))} aria-label="Previous day">
          <ChevronLeft size={16} />
        </button>
        <span className="date-nav-label">{formatDateLong(date)}</span>
        <button className="date-nav-btn" onClick={() => setDate((d) => shiftDate(d, 1))} aria-label="Next day">
          <ChevronRight size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <div className="mini-card" style={{ minWidth: 140 }}>
          <div className="muted" style={{ fontSize: 12 }}>Day total</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>{dayTotal}h</div>
        </div>
        <div className="mini-card" style={{ minWidth: 140 }}>
          <div className="muted" style={{ fontSize: 12 }}>Week total</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>{weekTotal}h</div>
        </div>
      </div>

      {loading ? (
        <SkeletonBlock rows={3} />
      ) : entries.length === 0 ? (
        <div className="empty-state"><p>No time logged for this day.</p></div>
      ) : (
        entries.map((e) => (
          <div key={e.id} className="mini-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <strong style={{ fontSize: 14 }}>{e.projects?.name}{e.timesheet_tasks?.name ? ` · ${e.timesheet_tasks.name}` : ''}</strong>
              <span className="mono">{e.hours}h</span>
            </div>
            {e.projects?.client_name && <div className="muted" style={{ fontSize: 12 }}>{e.projects.client_name}</div>}
            {e.notes && <div className="muted" style={{ fontSize: 12 }}>{e.notes}</div>}
            <span className={`status-badge status-${e.status}`} style={{ width: 'fit-content' }}>{e.status}</span>
          </div>
        ))
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={`Log time · ${formatDateLong(date)}`}>
        <form onSubmit={handleSubmit} className="drawer-form">
          <label className="field">
            <span>Project</span>
            <select required value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
              <option value="">— Select —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.client_name ? ` (${p.client_name})` : ''}</option>)}
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
