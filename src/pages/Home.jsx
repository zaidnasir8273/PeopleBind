import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Receipt, Clock, Wallet, UserCheck, ChevronRight, Cake, PartyPopper } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { SkeletonStatRow } from '../components/Skeleton'

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

export default function Home() {
  const { profile, company } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ employeeCount: 0, pendingLeave: 0, pendingExpenses: 0, openRoles: 0 })
  const [actionItems, setActionItems] = useState([])
  const [upcoming, setUpcoming] = useState([])

  const load = useCallback(async () => {
    setLoading(true)

    const [
      { count: employeeCount },
      { data: leaveRows },
      { data: expenseRows },
      { data: correctionRows },
      { data: payrollRuns },
      { count: openRoles },
      { data: probationRows },
      { data: birthdayRows },
    ] = await Promise.all([
      supabase.from('employees').select('id', { count: 'exact', head: true }).eq('employment_status', 'active'),
      supabase.from('leave_requests').select('id, employees(full_name), leave_types(name), days_requested').eq('status', 'pending'),
      supabase.from('expense_claims').select('id, employees(full_name), amount').eq('status', 'submitted'),
      supabase.from('attendance_corrections').select('id, employees(full_name)').eq('status', 'pending'),
      supabase.from('payroll_runs').select('id, status, payroll_periods(label)').neq('status', 'finalized'),
      supabase.from('job_openings').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('employees').select('id, full_name, confirmation_date').eq('employment_status', 'active').not('confirmation_date', 'is', null),
      supabase.from('employees').select('id, full_name, date_of_birth, joining_date').eq('employment_status', 'active'),
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

      <div className="stat-row">
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
    </div>
  )
}
