import { useEffect, useState, useCallback, useMemo } from 'react'
import { ChevronLeftIcon } from '../components/ui/chevron-left'
import { ChevronRightIcon } from '../components/ui/chevron-right'
import { supabase } from '../lib/supabase'
import { SkeletonBlock } from '../components/Skeleton'

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

export default function CalendarPage() {
  const today = new Date()
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [loading, setLoading] = useState(true)
  const [eventsByDay, setEventsByDay] = useState(new Map())
  const [selectedKey, setSelectedKey] = useState(dateKey(today))

  const days = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor])
  const todayKey = dateKey(today)

  const load = useCallback(async () => {
    setLoading(true)
    const rangeStart = dateKey(days[0])
    const rangeEnd = dateKey(days[days.length - 1])

    const [{ data: holidayRows }, { data: leaveRows }, { data: employeeRows }, { data: projectRows }] = await Promise.all([
      supabase.from('holidays').select('id, name, holiday_date').gte('holiday_date', rangeStart).lte('holiday_date', rangeEnd),
      supabase
        .from('leave_requests')
        .select('id, start_date, end_date, employees(full_name), leave_types(name)')
        .eq('status', 'approved')
        .lte('start_date', rangeEnd)
        .gte('end_date', rangeStart),
      supabase
        .from('employees')
        .select('id, full_name, date_of_birth, joining_date')
        .in('employment_status', ['training', 'probation', 'confirmed']),
      supabase
        .from('projects')
        .select('id, name, expected_completion_date')
        .eq('status', 'active')
        .gte('expected_completion_date', rangeStart)
        .lte('expected_completion_date', rangeEnd),
    ])

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

    setEventsByDay(byDay)
    setLoading(false)
  }, [days])

  useEffect(() => {
    load()
  }, [load])

  function prevMonth() {
    setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }))
  }

  function nextMonth() {
    setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }))
  }

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const selectedEvents = eventsByDay.get(selectedKey) ?? []

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
                  onClick={() => setSelectedKey(key)}
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
          </div>

          <section style={{ marginTop: 28 }}>
            <h2 className="section-heading">
              {new Date(`${selectedKey}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
            {selectedEvents.length === 0 ? (
              <p className="muted">Nothing on this day.</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {selectedEvents.map((e, i) => (
                  <li key={i} className="upcoming-row">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`calendar-dot calendar-dot-${e.type}`} />
                      {e.label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
