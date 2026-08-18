import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  Receipt,
  Clock,
  Wallet,
  UserCheck,
  ChevronRight,
  Cake,
  PartyPopper,
  Radio,
  PlaneTakeoff,
  UserPlus,
  Timer,
  Users,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { SkeletonStatRow } from '../components/Skeleton'
import { Avatar } from '../components/Avatar'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function firstName(fullName) {
  if (!fullName) return ''
  return fullName.split(' ')[0]
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// Does a recurring month/day date (birthday, anniversary) fall within the next `days` days?
function daysUntilAnnual(dateStr, days) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const src = new Date(dateStr)
  let next = new Date(today.getFullYear(), src.getMonth(), src.getDate())
  if (next < today) next = new Date(today.getFullYear() + 1, src.getMonth(), src.getDate())
  const diff = Math.round((next - today) / 86400000)
  return diff <= days ? diff : null
}

function relativeTime(ts) {
  const diffMs = Date.now() - new Date(ts).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function elapsedSince(ts) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 60000))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function Home() {
  const { profile, company } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ employeeCount: 0, pendingLeave: 0, pendingExpenses: 0, openRoles: 0 })
  const [actionItems, setActionItems] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [runningNow, setRunningNow] = useState([])
  const [outToday, setOutToday] = useState([])
  const [attendanceToday, setAttendanceToday] = useState({ present: 0, late: 0, absent: 0, onLeave: 0 })
  const [activity, setActivity] = useState([])
  const [teamFaces, setTeamFaces] = useState([])

  const load = useCallback(async () => {
    setLoading(true)

    const todayStr = new Date().toISOString().slice(0, 10)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

    const [
      { count: employeeCount },
      { data: leaveRows },
      { data: expenseRows },
      { data: correctionRows },
      { data: payrollRuns },
      { count: openRoles },
      { data: probationRows },
      { data: birthdayRows },
      { data: runningTimerRows },
      { data: outTodayRows },
      { data: attendanceTodayRows },
      { data: recentJoinerRows },
      { data: leaveDecidedRows },
      { data: expenseDecidedRows },
      { data: payrollFinalizedRows },
      { data: timesheetDecidedRows },
      { data: teamFaceRows },
    ] = await Promise.all([
      supabase.from('employees').select('id', { count: 'exact', head: true }).in('employment_status', ['training', 'probation', 'confirmed']),
      supabase.from('leave_requests').select('id, employees(full_name), leave_types(name), days_requested').eq('status', 'pending'),
      supabase.from('expense_claims').select('id, employees(full_name), amount').eq('status', 'submitted'),
      supabase.from('attendance_corrections').select('id, employees(full_name)').eq('status', 'pending'),
      supabase.from('payroll_runs').select('id, status, payroll_periods(label)').neq('status', 'finalized'),
      supabase.from('job_openings').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('employees').select('id, full_name, confirmation_date').in('employment_status', ['training', 'probation']).not('confirmation_date', 'is', null),
      supabase.from('employees').select('id, full_name, date_of_birth, joining_date').in('employment_status', ['training', 'probation', 'confirmed']),
      supabase.from('running_timers').select('id, employee_id, started_at, employees(full_name, photo_url), projects(name)').order('started_at', { ascending: true }),
      supabase
        .from('leave_requests')
        .select('id, employees(full_name, photo_url), leave_types(name)')
        .eq('status', 'approved')
        .lte('start_date', todayStr)
        .gte('end_date', todayStr),
      supabase.from('attendance').select('status').eq('attendance_date', todayStr),
      supabase
        .from('employees')
        .select('id, full_name, joining_date')
        .in('employment_status', ['training', 'probation', 'confirmed'])
        .gte('joining_date', thirtyDaysAgo)
        .order('joining_date', { ascending: false })
        .limit(5),
      supabase
        .from('leave_requests')
        .select('id, status, reviewed_at, employees(full_name), leave_types(name)')
        .in('status', ['approved', 'rejected'])
        .not('reviewed_at', 'is', null)
        .order('reviewed_at', { ascending: false })
        .limit(5),
      supabase
        .from('expense_claims')
        .select('id, status, reviewed_at, amount, employees(full_name)')
        .in('status', ['approved', 'rejected'])
        .not('reviewed_at', 'is', null)
        .order('reviewed_at', { ascending: false })
        .limit(5),
      supabase
        .from('payroll_runs')
        .select('id, finalized_at, payroll_periods(label)')
        .eq('status', 'finalized')
        .not('finalized_at', 'is', null)
        .order('finalized_at', { ascending: false })
        .limit(3),
      supabase
        .from('timesheets')
        .select('id, status, approved_at, period_start, period_end, employees(full_name)')
        .in('status', ['approved', 'rejected'])
        .not('approved_at', 'is', null)
        .order('approved_at', { ascending: false })
        .limit(5),
      supabase.from('employees').select('id, full_name, photo_url').in('employment_status', ['training', 'probation', 'confirmed']).order('full_name').limit(18),
    ])

    const items = []

    if (leaveRows?.length) {
      items.push({
        key: 'leave',
        icon: CalendarDays,
        text: `${leaveRows.length} leave request${leaveRows.length > 1 ? 's' : ''} awaiting approval`,
        detail: leaveRows.slice(0, 3).map((r) => r.employees?.full_name).filter(Boolean).join(', '),
        to: '/app/leave',
      })
    }

    if (expenseRows?.length) {
      items.push({
        key: 'expenses',
        icon: Receipt,
        text: `${expenseRows.length} expense claim${expenseRows.length > 1 ? 's' : ''} awaiting review`,
        detail: expenseRows.slice(0, 3).map((r) => r.employees?.full_name).filter(Boolean).join(', '),
        to: '/app/expenses',
      })
    }

    if (correctionRows?.length) {
      items.push({
        key: 'corrections',
        icon: Clock,
        text: `${correctionRows.length} attendance correction${correctionRows.length > 1 ? 's' : ''} pending`,
        detail: correctionRows.slice(0, 3).map((r) => r.employees?.full_name).filter(Boolean).join(', '),
        to: '/app/attendance',
      })
    }

    for (const run of payrollRuns ?? []) {
      items.push({
        key: `payroll-${run.id}`,
        icon: Wallet,
        text: `Payroll for ${run.payroll_periods?.label} is ${run.status === 'draft' ? 'not yet calculated' : 'awaiting finalization'}`,
        detail: null,
        to: '/app/payroll',
      })
    }

    const probationSoon = (probationRows ?? [])
      .map((e) => ({ ...e, daysLeft: e.confirmation_date ? Math.round((new Date(e.confirmation_date) - new Date()) / 86400000) : null }))
      .filter((e) => e.daysLeft !== null && e.daysLeft >= 0 && e.daysLeft <= 14)

    if (probationSoon.length) {
      items.push({
        key: 'probation',
        icon: UserCheck,
        text: `${probationSoon.length} probation${probationSoon.length > 1 ? 's' : ''} ending within 2 weeks`,
        detail: probationSoon.slice(0, 3).map((e) => e.full_name).join(', '),
        to: '/app/people',
      })
    }

    setActionItems(items)

    const upcomingList = []
    for (const e of birthdayRows ?? []) {
      const bDays = daysUntilAnnual(e.date_of_birth, 14)
      if (bDays !== null) upcomingList.push({ key: `bday-${e.id}`, icon: Cake, text: `${e.full_name}'s birthday`, when: bDays === 0 ? 'Today' : bDays === 1 ? 'Tomorrow' : `In ${bDays} days` })
      const aDays = daysUntilAnnual(e.joining_date, 14)
      if (aDays !== null) upcomingList.push({ key: `anniv-${e.id}`, icon: PartyPopper, text: `${e.full_name}'s work anniversary`, when: aDays === 0 ? 'Today' : aDays === 1 ? 'Tomorrow' : `In ${aDays} days` })
    }
    upcomingList.sort((a, b) => (a.when === 'Today' ? -1 : 0) - (b.when === 'Today' ? -1 : 0))
    setUpcoming(upcomingList.slice(0, 6))

    setRunningNow(runningTimerRows ?? [])
    setOutToday(outTodayRows ?? [])

    const counts = { present: 0, late: 0, absent: 0, onLeave: 0 }
    for (const row of attendanceTodayRows ?? []) {
      if (row.status === 'present') counts.present++
      else if (row.status === 'late') counts.late++
      else if (row.status === 'absent') counts.absent++
      else if (row.status === 'on_leave') counts.onLeave++
    }
    setAttendanceToday(counts)

    const feed = []
    for (const e of recentJoinerRows ?? []) {
      feed.push({ key: `join-${e.id}`, icon: UserPlus, text: `${e.full_name} joined the team`, time: e.joining_date, to: `/app/people/${e.id}` })
    }
    for (const r of leaveDecidedRows ?? []) {
      feed.push({
        key: `leave-${r.id}`,
        icon: CalendarDays,
        text: `${r.employees?.full_name}'s ${r.leave_types?.name ?? ''} leave was ${r.status}`,
        time: r.reviewed_at,
        to: '/app/leave',
      })
    }
    for (const r of expenseDecidedRows ?? []) {
      feed.push({
        key: `expense-${r.id}`,
        icon: Receipt,
        text: `${r.employees?.full_name}'s expense claim was ${r.status}`,
        time: r.reviewed_at,
        to: '/app/expenses',
      })
    }
    for (const r of payrollFinalizedRows ?? []) {
      feed.push({ key: `payroll-${r.id}`, icon: Wallet, text: `Payroll for ${r.payroll_periods?.label} was finalized`, time: r.finalized_at, to: '/app/payroll' })
    }
    for (const r of timesheetDecidedRows ?? []) {
      feed.push({
        key: `ts-${r.id}`,
        icon: Timer,
        text: `${r.employees?.full_name}'s timesheet was ${r.status}`,
        time: r.approved_at,
        to: '/app/timesheet',
      })
    }
    feed.sort((a, b) => new Date(b.time) - new Date(a.time))
    setActivity(feed.slice(0, 8))

    setTeamFaces(teamFaceRows ?? [])

    setStats({
      employeeCount: employeeCount ?? 0,
      pendingLeave: leaveRows?.length ?? 0,
      pendingExpenses: expenseRows?.length ?? 0,
      openRoles: openRoles ?? 0,
    })

    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="page-inner">
      <p className="page-eyebrow">HOME</p>
      <h1 className="page-title">
        {greeting()}, {firstName(profile?.full_name)}
      </h1>
      <p className="page-subtitle">{company?.name}</p>

      <div className={`stat-row${loading ? '' : ' content-reveal'}`} key={loading ? 'loading' : 'loaded'}>
        <div className="stat-card">
          <span className="stat-label">Team size</span>
          <span className="stat-value">{loading ? '—' : stats.employeeCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending leave</span>
          <span className="stat-value">{loading ? '—' : stats.pendingLeave}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending expenses</span>
          <span className="stat-value">{loading ? '—' : stats.pendingExpenses}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Open roles</span>
          <span className="stat-value">{loading ? '—' : stats.openRoles}</span>
        </div>
      </div>

      {!loading && (
        <div className="today-grid content-reveal">
          <div className="today-card">
            <div className="today-card-head">
              <span className="today-card-title"><Radio size={13} /> On the clock now</span>
              <span className="today-card-count">{runningNow.length}</span>
            </div>
            {runningNow.length === 0 ? (
              <p className="today-empty">No one's timer is running.</p>
            ) : (
              <div className="avatar-stack">
                {runningNow.slice(0, 6).map((t) => (
                  <span key={t.id} className="avatar-stack-item" data-tooltip={`${t.employees?.full_name} · ${t.projects?.name ?? 'No project'} · ${elapsedSince(t.started_at)}`}>
                    <Avatar name={t.employees?.full_name} photoUrl={t.employees?.photo_url} size={28} />
                    <span className="avatar-stack-live-dot" />
                  </span>
                ))}
                {runningNow.length > 6 && <span className="avatar-stack-more">+{runningNow.length - 6}</span>}
              </div>
            )}
          </div>

          <div className="today-card">
            <div className="today-card-head">
              <span className="today-card-title"><PlaneTakeoff size={13} /> Out today</span>
              <span className="today-card-count">{outToday.length}</span>
            </div>
            {outToday.length === 0 ? (
              <p className="today-empty">Everyone's around today.</p>
            ) : (
              <div className="avatar-stack">
                {outToday.slice(0, 6).map((r) => (
                  <span key={r.id} className="avatar-stack-item" data-tooltip={`${r.employees?.full_name} · ${r.leave_types?.name ?? 'Leave'}`}>
                    <Avatar name={r.employees?.full_name} photoUrl={r.employees?.photo_url} size={28} />
                  </span>
                ))}
                {outToday.length > 6 && <span className="avatar-stack-more">+{outToday.length - 6}</span>}
              </div>
            )}
          </div>

          <div className="today-card">
            <div className="today-card-head">
              <span className="today-card-title"><Clock size={13} /> Attendance today</span>
              <span className="today-card-count">{attendanceToday.present + attendanceToday.late}</span>
            </div>
            {attendanceToday.present + attendanceToday.late + attendanceToday.absent + attendanceToday.onLeave === 0 ? (
              <p className="today-empty">No attendance marked yet today.</p>
            ) : (
              <div className="attendance-bars">
                {[
                  { label: 'Present', value: attendanceToday.present, color: 'var(--teal-deep)' },
                  { label: 'Late', value: attendanceToday.late, color: 'var(--gold)' },
                  { label: 'Absent', value: attendanceToday.absent, color: 'var(--danger)' },
                ].map((row) => {
                  const total = attendanceToday.present + attendanceToday.late + attendanceToday.absent + attendanceToday.onLeave
                  const pct = total > 0 ? Math.round((row.value / total) * 100) : 0
                  return (
                    <div key={row.label} className="attendance-bar-row">
                      <span className="attendance-bar-label">{row.label}</span>
                      <span className="attendance-bar-track">
                        <span className="attendance-bar-fill" style={{ width: `${pct}%`, background: row.color }} />
                      </span>
                      <span className="attendance-bar-value">{row.value}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <section className="attention-section">
        <h2 className="section-heading">Needs your attention</h2>

        {loading ? (
          <SkeletonStatRow count={4} />
        ) : actionItems.length === 0 ? (
          <div className="empty-state">
            <p>Nothing pending right now.</p>
            <p className="muted">
              Leave requests, expense claims, payroll status, and probation dates will show up here as they need action.
            </p>
          </div>
        ) : (
          <ul className="attention-list" style={{ listStyle: 'none' }}>
            {actionItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.key}>
                  <Link to={item.to} className="attention-item">
                    <span className="attention-item-body">
                      <span className="attention-item-icon"><Icon size={15} /></span>
                      <span>
                        {item.text}
                        {item.detail && <span className="muted" style={{ display: 'block', fontSize: 12 }}>{item.detail}</span>}
                      </span>
                    </span>
                    <ChevronRight size={16} className="attention-item-chevron" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {!loading && upcoming.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2 className="section-heading">Coming up</h2>
          <div className="report-section" style={{ marginBottom: 0 }}>
            {upcoming.map((u) => {
              const Icon = u.icon
              return (
                <div key={u.key} className="upcoming-row">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Icon size={15} style={{ color: 'var(--gold)' }} />
                    {u.text}
                  </span>
                  <span className="muted mono">{u.when}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {!loading && activity.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2 className="section-heading">Recent activity</h2>
          <div className="report-section" style={{ marginBottom: 0 }}>
            {activity.map((a) => {
              const Icon = a.icon
              return (
                <Link key={a.key} to={a.to} className="activity-row">
                  <span className="activity-row-icon"><Icon size={13} /></span>
                  <span>{a.text}</span>
                  <span className="activity-row-time">{relativeTime(a.time)}</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {!loading && teamFaces.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2 className="section-heading"><Users size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Team</h2>
          <div className="team-strip">
            {teamFaces.map((e) => (
              <Link key={e.id} to={`/app/people/${e.id}`} className="team-strip-item" data-tooltip={e.full_name}>
                <Avatar name={e.full_name} photoUrl={e.photo_url} size={40} />
                <span className="team-strip-name">{firstName(e.full_name)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
