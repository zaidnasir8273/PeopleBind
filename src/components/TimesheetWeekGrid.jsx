import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { SkeletonBlock } from './Skeleton'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function shiftDate(dateStr, delta) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

function weekRange(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  const day = d.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const start = shiftDate(dateStr, mondayOffset)
  const end = shiftDate(start, 6)
  return { start, end }
}

function projectLabel(p) {
  return p ? `${p.name}${p.clients?.name ? ` (${p.clients.name})` : ''}` : ''
}

// A week grid of project+task rows against Mon..Sun columns, with cells
// editable in place (click a cell, type a number, Enter/blur to save).
// A cell backed by more than one time_entry (rare -- someone logged the
// same project/task twice on the same day) is shown read-only, since a
// single typed number can't unambiguously represent two separate entries.
export function TimesheetWeekGrid({ employeeId, date, company, profile, projects, tasks }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [manualRows, setManualRows] = useState([])
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [addForm, setAddForm] = useState({ project_id: '', task_id: '' })

  const load = useCallback(async () => {
    if (!employeeId) return
    setLoading(true)
    const { start, end } = weekRange(date)
    const { data } = await supabase
      .from('time_entries')
      .select('id, entry_date, hours, project_id, task_id, status, projects(name, clients(name)), timesheet_tasks(name)')
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
      rowMap.set(mr.key, { ...mr, days: Array.from({ length: 7 }, () => ({ hours: 0, entryId: null, count: 0 })) })
    }

    for (const e of entries) {
      const key = `${e.project_id}:${e.task_id ?? ''}`
      if (!rowMap.has(key)) {
        rowMap.set(key, {
          key,
          project_id: e.project_id,
          task_id: e.task_id,
          label: `${e.projects?.name ?? '—'}${e.timesheet_tasks?.name ? ` · ${e.timesheet_tasks.name}` : ''}`,
          days: Array.from({ length: 7 }, () => ({ hours: 0, entryId: null, count: 0 })),
        })
      }
      const dayIndex = Math.round((new Date(`${e.entry_date}T00:00:00`) - new Date(`${start}T00:00:00`)) / 86400000)
      if (dayIndex < 0 || dayIndex > 6) continue
      const cell = rowMap.get(key).days[dayIndex]
      cell.hours += Number(e.hours)
      cell.count += 1
      cell.entryId = cell.count === 1 ? e.id : null // only single-entry cells are directly editable
    }

    return [...rowMap.values()]
  }, [entries, manualRows, date])

  const weekTotal = entries.reduce((sum, e) => sum + Number(e.hours), 0)

  function startEdit(row, dayIndex) {
    const cell = row.days[dayIndex]
    if (cell.count > 1) return
    setEditingCell({ key: row.key, dayIndex })
    setEditValue(cell.hours > 0 ? String(cell.hours) : '')
  }

  async function saveCell(row, dayIndex) {
    const cell = row.days[dayIndex]
    const hours = editValue.trim() === '' ? 0 : Number(editValue)
    setEditingCell(null)

    if (Number.isNaN(hours) || hours < 0) {
      toast.error('Enter a valid number of hours')
      return
    }
    if (hours === cell.hours) return

    if (hours === 0) {
      if (cell.entryId) {
        const { error } = await supabase.from('time_entries').delete().eq('id', cell.entryId)
        if (error) { toast.error(error.message); return }
      }
    } else if (cell.entryId) {
      const { error } = await supabase.from('time_entries').update({ hours }).eq('id', cell.entryId)
      if (error) { toast.error(error.message); return }
    } else {
      const entryDate = shiftDate(weekRange(date).start, dayIndex)
      const { error } = await supabase.from('time_entries').insert({
        company_id: company.id,
        employee_id: employeeId,
        project_id: row.project_id,
        task_id: row.task_id,
        entry_date: entryDate,
        hours,
        submitted_by: profile.id,
      })
      if (error) { toast.error(error.message); return }
    }
    load()
  }

  function addRow() {
    if (!addForm.project_id) return
    const key = `${addForm.project_id}:${addForm.task_id || ''}`
    if (rows.some((r) => r.key === key)) {
      toast.error('That project/task is already on the grid')
      return
    }
    const project = projects.find((p) => p.id === addForm.project_id)
    const task = tasks.find((t) => t.id === addForm.task_id)
    setManualRows((prev) => [...prev, {
      key,
      project_id: addForm.project_id,
      task_id: addForm.task_id || null,
      label: `${project?.name ?? '—'}${task?.name ? ` · ${task.name}` : ''}`,
    }])
    setAddForm({ project_id: '', task_id: '' })
  }

  if (loading) return <SkeletonBlock rows={3} />

  return (
    <div>
      {rows.length === 0 ? (
        <div className="empty-state" style={{ marginBottom: 16 }}><p>No time logged this week yet.</p></div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Project · Task</th>
              {WEEKDAY_LABELS.map((label) => <th key={label} className="mono">{label}</th>)}
              <th className="mono">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} style={{ cursor: 'default' }}>
                <td>{row.label}</td>
                {row.days.map((cell, i) => {
                  const isEditing = editingCell?.key === row.key && editingCell?.dayIndex === i
                  return (
                    <td key={i} className="mono" style={{ cursor: cell.count > 1 ? 'default' : 'pointer', minWidth: 56 }}>
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          step="0.25"
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => saveCell(row, i)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.currentTarget.blur()
                            if (e.key === 'Escape') setEditingCell(null)
                          }}
                          style={{ width: 52, padding: '4px 6px', fontSize: 13 }}
                        />
                      ) : (
                        <span
                          onClick={() => startEdit(row, i)}
                          data-tooltip={cell.count > 1 ? `${cell.count} entries — edit individually` : undefined}
                          style={{ color: cell.hours > 0 ? 'var(--ink)' : 'var(--ink-faint)' }}
                        >
                          {cell.hours > 0 ? cell.hours : '—'}
                        </span>
                      )}
                    </td>
                  )
                })}
                <td className="mono"><strong>{row.days.reduce((a, b) => a + b.hours, 0)}</strong></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={8} />
              <td className="mono"><strong>{weekTotal}</strong></td>
            </tr>
          </tfoot>
        </table>
      )}

      <div className="field-row" style={{ maxWidth: 420, alignItems: 'flex-end', marginTop: rows.length === 0 ? 0 : 16 }}>
        <label className="field" style={{ flex: 1 }}>
          <span>Project</span>
          <select value={addForm.project_id} onChange={(e) => setAddForm({ ...addForm, project_id: e.target.value })}>
            <option value="">— Select —</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{projectLabel(p)}</option>)}
          </select>
        </label>
        <label className="field" style={{ flex: 1 }}>
          <span>Task</span>
          <select value={addForm.task_id} onChange={(e) => setAddForm({ ...addForm, task_id: e.target.value })}>
            <option value="">—</option>
            {tasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <button type="button" className="btn-secondary btn-icon" onClick={addRow} style={{ marginBottom: 2 }}>
          <Plus size={14} /> Add row
        </button>
      </div>
    </div>
  )
}
