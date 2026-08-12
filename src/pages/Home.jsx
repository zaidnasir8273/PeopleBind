import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { profile, company } = useAuth()
  const [employeeCount, setEmployeeCount] = useState(null)
  const [pendingLeave, setPendingLeave] = useState([])
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadStats() {
      const [{ count }, { data: leaveRows }] = await Promise.all([
        supabase.from('employees').select('id', { count: 'exact', head: true }),
        supabase
          .from('leave_requests')
          .select('id, start_date, end_date, days_requested, employees(full_name), leave_types(name)')
          .eq('status', 'pending')
          .order('start_date', { ascending: true })
          .limit(5),
      ])

      if (cancelled) return
      setEmployeeCount(count ?? 0)
      setPendingLeave(leaveRows ?? [])
      setLoadingStats(false)
    }

    loadStats()
    return () => {
      cancelled = true
    }
  }, [])

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
          <span className="stat-value">{loadingStats ? '—' : employeeCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending leave requests</span>
          <span className="stat-value">{loadingStats ? '—' : pendingLeave.length}</span>
        </div>
      </div>

      <section className="attention-section">
        <h2 className="section-heading">Needs your attention</h2>

        {loadingStats ? (
          <p className="muted">Loading…</p>
        ) : pendingLeave.length === 0 ? (
          <div className="empty-state">
            <p>Nothing pending right now.</p>
            <p className="muted">
              Leave requests, payroll exceptions, and approvals will show up
              here as they come in.
            </p>
          </div>
        ) : (
          <ul className="attention-list">
            {pendingLeave.map((row) => (
              <li key={row.id} className="attention-item">
                <span>
                  <strong>{row.employees?.full_name ?? 'Employee'}</strong> requested{' '}
                  {row.leave_types?.name?.toLowerCase() ?? 'leave'} · {row.days_requested} day
                  {row.days_requested === 1 ? '' : 's'}
                </span>
                <span className="muted">
                  {formatDate(row.start_date)} – {formatDate(row.end_date)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

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
