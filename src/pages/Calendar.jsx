import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { ChevronLeftIcon } from '../components/ui/chevron-left'
import { ChevronRightIcon } from '../components/ui/chevron-right'
import { PlusIcon } from '../components/ui/plus'
import { SquarePenIcon } from '../components/ui/square-pen'
import { DeleteIcon } from '../components/ui/delete'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'
import { SkeletonBlock } from '../components/Skeleton'
import { CalendarEventForm, EVENT_CATEGORIES, eventCategoryColor, eventCategoryLabel } from '../components/CalendarEventForm'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function monthGrid(year, month) {
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7 // days since Monday
  const start = new Date(year, month, 1 - startOffset)
  const days = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d)
  }
  return days
}

function formatTimeRange(ev) {
  if (!ev.start_time) return 'All day'
  const fmt = (t) => t.slice(0, 5)
  return ev.end_time ? `${fmt(ev.start_time)} – ${fmt(ev.end_time)}` : fmt(ev.start_time)
}

export default function CalendarPage() {
  const { company } = useAuth()
  const today = new Date()
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [loading, setLoading] = useState(true)
  const [eventsByDay, setEventsByDay] = useState(new Map())
  const [selectedKey, setSelectedKey] = useState(dateKey(today))
  const [dayDrawerOpen, setDayDrawerOpen] = useState(false)
  const [formMode, setFormMode] = useState(null) // null | 'new' | <company_events row being edited>
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null)

  const days = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor])
  const todayKey = dateKey(today)

  const load = useCallback(async () => {
    setLoading(true)
    const rangeStart = dateKey(days[0])
    const rangeEnd = dateKey(days[days.length - 1])

    const [{ data: holidayRows }, { data: leaveRows }, { data: employeeRows }, { data: projectRows }, { data: eventRows }] = await Promise.all([
      supabase.from('holidays').select('id, name, holiday_date').eq('company_id', company.id).gte('holiday_date', rangeStart).lte('holiday_date', rangeEnd),
      supabase
        .from('leave_requests')
        .select('id, start_date, end_date, employees(full_name), leave_types(name)')
        .eq('company_id', company.id)
        .eq('status', 'approved')
        .lte('start_date', rangeEnd)
        .gte('end_date', rangeStart),
      supabase
        .from('employees')
        .select('id, full_name, date_of_birth, joining_date')
        .eq('company_id', company.id)
        .in('employment_status', ['training', 'probation', 'confirmed']),
      supabase
        .from('projects')
        .select('id, name, expected_completion_date')
        .eq('company_id', company.id)
        .eq('status', 'active')
        .gte('expected_completion_date', rangeStart)
        .lte('expected_completion_date', rangeEnd),
      supabase
        .from('company_events')
        .select('*')
        .eq('company_id', company.id)
        .lte('event_date', rangeEnd)
        .gte('event_date', rangeStart) // narrowed further below for multi-day events starting earlier
        .order('event_date'),
    ])

    // Multi-day events can start before this month's visible range but
    // still overlap it (e.g. a 3-day visit spanning a month boundary) --
    // the query above only catches events *starting* in range, so fetch
    // those separately rather than widening the main query's date filter
    // (which would also need an unbounded lower date otherwise).
    const { data: spanningEventRows } = await supabase
      .from('company_events')
      .select('*')
      .eq('company_id', company.id)
      .lt('event_date', rangeStart)
      .gte('end_date', rangeStart)

    const allEventRows = [...(eventRows ?? []), ...(spanningEventRows ?? [])]

    const byDay = new Map()
    function push(key, entry) {
      if (!byDay.has(key)) byDay.set(key, [])
      byDay.get(key).push(entry)
    }

    for (const h of holidayRows ?? []) {
      push(h.holiday_date, { type: 'holiday', label: h.name })
    }

    for (const l of leaveRows ?? []) {
      for (const d of days) {
        const key = dateKey(d)
        if (key >= l.start_date && key <= l.end_date) {
          push(key, { type: 'leave', label: `${l.employees?.full_name ?? 'Someone'} — ${l.leave_types?.name ?? 'Leave'}` })
        }
      }
    }

    for (const e of employeeRows ?? []) {
      for (const d of days) {
        if (e.date_of_birth) {
          const dob = new Date(`${e.date_of_birth}T00:00:00`)
          if (dob.getMonth() === d.getMonth() && dob.getDate() === d.getDate()) {
            push(dateKey(d), { type: 'birthday', label: `${e.full_name}'s birthday` })
          }
        }
        if (e.joining_date) {
          const anniv = new Date(`${e.joining_date}T00:00:00`)
          if (anniv.getMonth() === d.getMonth() && anniv.getDate() === d.getDate() && anniv.getFullYear() !== d.getFullYear()) {
            push(dateKey(d), { type: 'anniversary', label: `${e.full_name}'s work anniversary` })
          }
        }
      }
    }

    for (const p of projectRows ?? []) {
      push(p.expected_completion_date, { type: 'project', label: `${p.name} due` })
    }

    // Company events: category itself is used as `type` so the existing
    // one-dot-per-kind rendering below works unchanged -- only the CSS
    // color classes are new.
    for (const ev of allEventRows) {
      const start = ev.event_date
      const end = ev.end_date ?? ev.event_date
      for (const d of days) {
        const key = dateKey(d)
        if (key >= start && key <= end) {
          push(key, { type: ev.category, label: ev.title, event: ev })
        }
      }
    }

    setEventsByDay(byDay)
    setLoading(false)
  }, [days, company.id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setConfirmingDeleteId(null)
    setFormMode(null)
  }, [selectedKey])

  function prevMonth() {
    setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }))
  }

  function nextMonth() {
    setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }))
  }

  function selectDay(key) {
    setSelectedKey(key)
    setDayDrawerOpen(true)
  }

  async function deleteEvent(id) {
    const { error } = await supabase.from('company_events').delete().eq('id', id)
    if (error) { toast.error(error.message || 'Failed to delete event'); return }
    toast.success('Event deleted')
    setConfirmingDeleteId(null)
    load()
  }

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const selectedEvents = eventsByDay.get(selectedKey) ?? []
  const selectedDayEntries = selectedEvents.filter((e) => !e.event)
  const selectedCompanyEvents = selectedEvents.filter((e) => e.event).map((e) => e.event)
  // De-dupe: a multi-day event overlapping the selected day was pushed
  // once already (one row per day it spans), never more than once per
  // day, but guard anyway since this list drives Edit/Delete actions.
  const uniqueCompanyEvents = [...new Map(selectedCompanyEvents.map((ev) => [ev.id, ev])).values()]

  return (
    <div className="page-inner" style={{ maxWidth: 900 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">COMPANY</p>
          <h1 className="page-title">Calendar</h1>
        </div>
      </div>

      <div className="calendar-nav">
        <button type="button" className="btn-icon-round" onClick={prevMonth} aria-label="Previous month">
          <ChevronLeftIcon size={15} />
        </button>
        <span className="calendar-month-label">{monthLabel}</span>
        <button type="button" className="btn-icon-round" onClick={nextMonth} aria-label="Next month">
          <ChevronRightIcon size={15} />
        </button>
      </div>

      {loading ? (
        <SkeletonBlock rows={6} />
      ) : (
        <>
          <div className="calendar-grid">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="calendar-weekday">{label}</div>
            ))}
            {days.map((d) => {
              const key = dateKey(d)
              const inMonth = d.getMonth() === cursor.month
              const events = eventsByDay.get(key) ?? []
              const kinds = [...new Set(events.map((e) => e.type))]
              return (
                <button
                  type="button"
                  key={key}
                  className={`calendar-cell${inMonth ? '' : ' outside'}${key === todayKey ? ' today' : ''}${key === selectedKey ? ' selected' : ''}`}
                  onClick={() => selectDay(key)}
                >
                  <span className="calendar-cell-date">{d.getDate()}</span>
                  {kinds.length > 0 && (
                    <span className="calendar-cell-dots">
                      {kinds.map((k) => (
                        <span key={k} className={`calendar-dot calendar-dot-${k}`} />
                      ))}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="calendar-legend">
            <span><span className="calendar-dot calendar-dot-holiday" /> Holiday</span>
            <span><span className="calendar-dot calendar-dot-leave" /> Leave</span>
            <span><span className="calendar-dot calendar-dot-birthday" /> Birthday</span>
            <span><span className="calendar-dot calendar-dot-anniversary" /> Anniversary</span>
            <span><span className="calendar-dot calendar-dot-project" /> Project due</span>
            {EVENT_CATEGORIES.map((c) => (
              <span key={c.value}><span className="calendar-dot" style={{ background: c.color }} /> {c.label}</span>
            ))}
          </div>
        </>
      )}

      <Drawer
        open={dayDrawerOpen}
        onClose={() => setDayDrawerOpen(false)}
        title={new Date(`${selectedKey}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
      >
        {formMode ? (
          <CalendarEventForm
            companyId={company.id}
            defaultDate={selectedKey}
            editing={formMode === 'new' ? null : formMode}
            onCancel={() => setFormMode(null)}
            onDone={() => { setFormMode(null); load() }}
          />
        ) : (
          <div className="drawer-form">
            {selectedDayEntries.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>Nothing else on this day.</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {selectedDayEntries.map((e, i) => (
                  <li key={i} className="upcoming-row">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`calendar-dot calendar-dot-${e.type}`} />
                      {e.label}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="page-header-row" style={{ marginTop: 10 }}>
              <p className="section-heading" style={{ margin: 0 }}>Company events</p>
              <button type="button" className="btn-primary btn-icon" style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={() => setFormMode('new')}>
                <PlusIcon size={13} /> Add event
              </button>
            </div>

            {uniqueCompanyEvents.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>No company events on this day.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {uniqueCompanyEvents.map((ev) => (
                  <div key={ev.id} className="calendar-event-card" style={{ borderLeftColor: eventCategoryColor(ev.category) }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{ev.title}</div>
                        <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                          {eventCategoryLabel(ev.category)} · {formatTimeRange(ev)}
                          {ev.end_date && ev.end_date !== ev.event_date ? ` · ${ev.event_date} → ${ev.end_date}` : ''}
                        </div>
                        {ev.description && <p style={{ margin: '6px 0 0', fontSize: 12.5 }}>{ev.description}</p>}
                      </div>
                      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                        <button type="button" className="link-button" onClick={() => setFormMode(ev)} aria-label="Edit event" data-tooltip="Edit">
                          <SquarePenIcon size={14} />
                        </button>
                        <button type="button" className="link-button" style={{ color: 'var(--danger)' }} onClick={() => setConfirmingDeleteId(ev.id)} aria-label="Delete event" data-tooltip="Delete">
                          <DeleteIcon size={14} />
                        </button>
                      </div>
                    </div>
                    {confirmingDeleteId === ev.id && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12 }}>
                        <span className="muted">Delete this event?</span>
                        <button type="button" className="link-button" style={{ color: 'var(--danger)', fontSize: 12 }} onClick={() => deleteEvent(ev.id)}>Yes, delete</button>
                        <button type="button" className="link-button" style={{ fontSize: 12 }} onClick={() => setConfirmingDeleteId(null)}>Cancel</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}
