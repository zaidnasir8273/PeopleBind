import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { Trash2, Loader2 } from 'lucide-react'
import { PlusIcon } from './ui/plus'
import { CheckIcon } from './ui/check'
import { supabase } from '../lib/supabase'
import { SkeletonBlock } from './Skeleton'
import { SearchableSelect } from './SearchableSelect'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function shiftDate(dateStr, delta) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function weekRange(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  const day = d.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const start = shiftDate(dateStr, mondayOffset)
  const end = shiftDate(start, 6)
  return { start, end }
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Durations are stored as integer minutes; the grid still speaks in hours to the user.
function minutesToHours(mins) {
  const h = mins / 60
  return Number.isInteger(h) ? String(h) : h.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

function hoursToMinutes(value) {
  const n = parseFloat(value)
  if (Number.isNaN(n) || n < 0) return null
  return Math.round(n * 60)
}

// A week grid of project+task+billable rows against Mon..Sun columns, cells
// editable in place (click a cell, type hours + an optional note, save).
// A cell backed by more than one time_entry (rare -- someone logged the same
// row twice on the same day) is shown read-only, since a single typed number
// can't unambiguously represent two separate entries.
export function TimesheetWeekGrid({
  employeeId,
  date,
  company,
  profile,
  projects,
  tasks,
  restrictedProjectIds,
  memberProjectIds,
  readOnly = false,
  onTotalsChange,
}) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [manualRows, setManualRows] = useState([])
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [editNote, setEditNote] = useState('')
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ project_id: '', task_id: '', billable: true })
  const [copying, setCopying] = useState(false)

  const load = useCallback(async () => {
    if (!employeeId) return
    setLoading(true)
    const { start, end } = weekRange(date)
    const { data } = await supabase
      .from('time_entries')
      .select('id, entry_date, duration_minutes, billable, notes, project_id, task_id, status, projects(name, clients(name)), timesheet_tasks(name)')
      .eq('employee_id', employeeId)
      .gte('entry_date', start)
      .lte('entry_date', end)
    setEntries(data ?? [])
    setLoading(false)
  }, [employeeId, date])

  useEffect(() => {
    setManualRows([])
    load()
  }, [load])

  const rows = useMemo(() => {
    const { start } = weekRange(date)
    const rowMap = new Map()

    for (const mr of manualRows) {
      rowMap.set(mr.key, { ...mr, days: Array.from({ length: 7 }, () => ({ minutes: 0, entryId: null, count: 0, note: '' })) })
    }

    for (const e of entries) {
      const key = `${e.project_id}:${e.task_id ?? ''}:${e.billable}`
      if (!rowMap.has(key)) {
        rowMap.set(key, {
          key,
          project_id: e.project_id,
          task_id: e.task_id,
          billable: e.billable,
          label: `${e.projects?.name ?? '—'}${e.timesheet_tasks?.name ? ` · ${e.timesheet_tasks.name}` : ''}`,
          clientName: e.projects?.clients?.name ?? null,
          days: Array.from({ length: 7 }, () => ({ minutes: 0, entryId: null, count: 0, note: '' })),
        })
      }
      const dayIndex = Math.round((new Date(`${e.entry_date}T00:00:00`) - new Date(`${start}T00:00:00`)) / 86400000)
      if (dayIndex < 0 || dayIndex > 6) continue
      const cell = rowMap.get(key).days[dayIndex]
      cell.minutes += e.duration_minutes
      cell.count += 1
      cell.entryId = cell.count === 1 ? e.id : null
      cell.note = cell.count === 1 ? (e.notes || '') : ''
    }

    return [...rowMap.values()].sort((a, b) => a.label.localeCompare(b.label))
  }, [entries, manualRows, date])

  const weekTotalMinutes = entries.reduce((sum, e) => sum + e.duration_minutes, 0)
  const billableMinutes = entries.filter((e) => e.billable).reduce((sum, e) => sum + e.duration_minutes, 0)

  useEffect(() => {
    onTotalsChange?.({ totalMinutes: weekTotalMinutes, billableMinutes, entryCount: entries.length })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekTotalMinutes, billableMinutes, entries.length])

  function startEdit(row, dayIndex) {
    if (readOnly) return
    const cell = row.days[dayIndex]
    if (cell.count > 1) return
    setEditingCell({ key: row.key, dayIndex })
    setEditValue(cell.minutes > 0 ? minutesToHours(cell.minutes) : '')
    setEditNote(cell.note || '')
  }

  async function saveCell(row, dayIndex) {
    const cell = row.days[dayIndex]
    const minutes = editValue.trim() === '' ? 0 : hoursToMinutes(editValue)
    const note = editNote.trim() || null
    setEditingCell(null)

    if (minutes === null) {
      toast.error('Enter a valid number of hours')
      return
    }
    if (minutes === cell.minutes && note === (cell.note || null)) return

    setSaveState('saving')

    if (minutes === 0) {
      if (cell.entryId) {
        const { error } = await supabase.from('time_entries').delete().eq('id', cell.entryId)
        if (error) { toast.error(error.message); setSaveState('idle'); return }
      }
    } else if (cell.entryId) {
      const { error } = await supabase.from('time_entries').update({ duration_minutes: minutes, notes: note }).eq('id', cell.entryId)
      if (error) { toast.error(error.message); setSaveState('idle'); return }
    } else {
      const entryDate = shiftDate(weekRange(date).start, dayIndex)
      const { error } = await supabase.from('time_entries').insert({
        company_id: company.id,
        employee_id: employeeId,
        project_id: row.project_id,
        task_id: row.task_id,
        entry_date: entryDate,
        duration_minutes: minutes,
        billable: row.billable,
        notes: note,
        submitted_by: profile.id,
      })
      if (error) { toast.error(error.message); setSaveState('idle'); return }
    }
    await load()
    setSaveState('saved')
    setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 2000)
  }

  function addRow() {
    if (!addForm.project_id) return
    const key = `${addForm.project_id}:${addForm.task_id || ''}:${addForm.billable}`
    if (rows.some((r) => r.key === key)) {
      toast.error('That row is already on the grid')
      return
    }
    const project = projects.find((p) => p.id === addForm.project_id)
    const task = tasks.find((t) => t.id === addForm.task_id)
    setManualRows((prev) => [...prev, {
      key,
      project_id: addForm.project_id,
      task_id: addForm.task_id || null,
      billable: addForm.billable,
      label: `${project?.name ?? '—'}${task?.name ? ` · ${task.name}` : ''}`,
      clientName: project?.clients?.name ?? null,
    }])
    setAddForm({ project_id: '', task_id: '', billable: true })
    setAddOpen(false)
  }

  async function removeRow(row) {
    const idsToDelete = row.days.filter((d) => d.entryId).map((d) => d.entryId)
    setManualRows((prev) => prev.filter((r) => r.key !== row.key))
    if (idsToDelete.length === 0) return
    const { error } = await supabase.from('time_entries').delete().in('id', idsToDelete)
    if (error) { toast.error(error.message); return }
    toast.success('Row removed')
    load()
  }

  async function copyPreviousWeek() {
    setCopying(true)
    const { start } = weekRange(date)
    const prevStart = shiftDate(start, -7)
    const prevEnd = shiftDate(start, -1)
    const { data: prevEntries } = await supabase
      .from('time_entries')
      .select('project_id, task_id, billable, projects(name, clients(name)), timesheet_tasks(name)')
      .eq('employee_id', employeeId)
      .gte('entry_date', prevStart)
      .lte('entry_date', prevEnd)
    setCopying(false)

    if (!prevEntries || prevEntries.length === 0) {
      toast.error('No entries found in the previous week')
      return
    }

    const seen = new Set(rows.map((r) => r.key))
    const newRows = []
    for (const e of prevEntries) {
      const key = `${e.project_id}:${e.task_id ?? ''}:${e.billable}`
      if (seen.has(key)) continue
      seen.add(key)
      newRows.push({
        key,
        project_id: e.project_id,
        task_id: e.task_id,
        billable: e.billable,
        label: `${e.projects?.name ?? '—'}${e.timesheet_tasks?.name ? ` · ${e.timesheet_tasks.name}` : ''}`,
        clientName: e.projects?.clients?.name ?? null,
      })
    }

    if (newRows.length === 0) {
      toast("Last week's projects are already on this week's grid")
      return
    }
    setManualRows((prev) => [...prev, ...newRows])
    toast.success(`Added ${newRows.length} project${newRows.length > 1 ? 's' : ''} from last week`)
  }

  const projectOptions = useMemo(() => projects
    .filter((p) => !restrictedProjectIds?.has(p.id) || memberProjectIds?.has(p.id))
    .map((p) => ({ value: p.id, label: p.name, group: p.clients?.name || 'No client' })),
  [projects, restrictedProjectIds, memberProjectIds])

  const taskOptions = useMemo(() => tasks.map((t) => ({ value: t.id, label: t.name })), [tasks])

  if (loading) return <SkeletonBlock rows={3} />

  const { start: weekStart } = weekRange(date)
  const today = todayStr()

  return (
    <div>
      <div className="ts-grid-toolbar">
        {saveState !== 'idle' && (
          <span className="ts-save-indicator">
            {saveState === 'saving' ? (
              <><Loader2 size={12} className="btn-spinner" /> Saving…</>
            ) : (
              <><CheckIcon size={12} /> Saved</>
            )}
          </span>
        )}
        {!readOnly && rows.length > 0 && (
          <button type="button" className="link-button" onClick={copyPreviousWeek} disabled={copying}>
            {copying ? 'Copying…' : 'Copy previous week'}
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="empty-state ts-empty-state">
          <p style={{ fontWeight: 600, margin: 0 }}>No time recorded yet</p>
          <p className="muted" style={{ margin: 0 }}>Start tracking your work or add a project to your timesheet.</p>
          {!readOnly && (
            <button type="button" className="btn-primary btn-icon" onClick={() => setAddOpen(true)}>
              <PlusIcon size={14} /> Add time
            </button>
          )}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table ts-week-table">
            <thead>
              <tr>
                <th>Project · Task</th>
                {WEEKDAY_LABELS.map((label, i) => (
                  <th key={label} className={`mono${shiftDate(weekStart, i) === today ? ' ts-today-col' : ''}`}>{label}</th>
                ))}
                <th className="mono">Total</th>
                {!readOnly && <th></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td>
                    <div>{row.label}</div>
                    {(row.clientName || !row.billable) && (
                      <div className="muted" style={{ fontSize: 11, display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                        {row.clientName}
                        {!row.billable && <span className="ts-nonbillable-badge">Non-billable</span>}
                      </div>
                    )}
                  </td>
                  {row.days.map((cell, i) => {
                    const isEditing = editingCell?.key === row.key && editingCell?.dayIndex === i
                    const isToday = shiftDate(weekStart, i) === today
                    return (
                      <td key={i} className={`mono ts-cell${isToday ? ' ts-today-col' : ''}`} style={{ position: 'relative' }}>
                        {isEditing ? (
                          <div className="ts-cell-editor">
                            <input
                              type="text"
                              inputMode="decimal"
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveCell(row, i)
                                if (e.key === 'Escape') setEditingCell(null)
                              }}
                              placeholder="0"
                            />
                            <textarea
                              placeholder="Note (optional)"
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value)}
                              rows={2}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                              <button type="button" className="link-button" onClick={() => setEditingCell(null)}>Cancel</button>
                              <button type="button" className="btn-primary" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => saveCell(row, i)}>Save</button>
                            </div>
                          </div>
                        ) : (
                          <span
                            className="ts-cell-value"
                            onClick={() => startEdit(row, i)}
                            data-tooltip={cell.count > 1 ? `${cell.count} entries — edit individually` : (cell.note || undefined)}
                            style={{ color: cell.minutes > 0 ? 'var(--ink)' : 'var(--ink-faint)', cursor: readOnly ? 'default' : 'pointer' }}
                          >
                            {cell.minutes > 0 ? minutesToHours(cell.minutes) : '—'}
                            {cell.note && <span className="ts-note-dot" />}
                          </span>
                        )}
                      </td>
                    )
                  })}
                  <td className="mono"><strong>{minutesToHours(row.days.reduce((a, b) => a + b.minutes, 0))}</strong></td>
                  {!readOnly && (
                    <td>
                      <button type="button" className="link-button" style={{ color: 'var(--danger)', display: 'flex' }} aria-label="Remove row" onClick={() => removeRow(row)}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={readOnly ? 8 : 9}>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <span className="muted" style={{ fontSize: 12 }}>Billable: <strong style={{ color: 'var(--ink)' }}>{minutesToHours(billableMinutes)}h</strong></span>
                    <span className="muted" style={{ fontSize: 12 }}>Non-billable: <strong style={{ color: 'var(--ink)' }}>{minutesToHours(weekTotalMinutes - billableMinutes)}h</strong></span>
                    <span className="muted" style={{ fontSize: 12, marginLeft: 'auto' }}>Week total: <strong style={{ color: 'var(--ink)' }}>{minutesToHours(weekTotalMinutes)}h</strong></span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {!readOnly && rows.length > 0 && (
        addOpen ? (
          <div className="ts-add-row">
            <SearchableSelect options={projectOptions} value={addForm.project_id} onChange={(v) => setAddForm((f) => ({ ...f, project_id: v }))} placeholder="Select project" />
            <SearchableSelect options={taskOptions} value={addForm.task_id} onChange={(v) => setAddForm((f) => ({ ...f, task_id: v }))} placeholder="Select task (optional)" />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={addForm.billable} onChange={(e) => setAddForm((f) => ({ ...f, billable: e.target.checked }))} /> Billable
            </label>
            <button type="button" className="btn-primary btn-icon" onClick={addRow}><PlusIcon size={14} /> Add</button>
            <button type="button" className="link-button" onClick={() => setAddOpen(false)}>Cancel</button>
          </div>
        ) : (
          <button type="button" className="btn-secondary btn-icon" onClick={() => setAddOpen(true)} style={{ marginTop: 12 }}>
            <PlusIcon size={14} /> Add project
          </button>
        )
      )}
    </div>
  )
}
