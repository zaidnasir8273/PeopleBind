import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { SkeletonBlock, SkeletonTable } from '../components/Skeleton'
import { StaggerContainer, StaggerItem } from '../components/motion'
import { AnimatedNumber } from '../components/motion/AnimatedNumber'

const STALE_PAYROLL_DAYS = 35
const PREVIEW_LIMIT = 8

function formatDate(ts) {
  if (!ts) return 'never'
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function relativeTime(ts) {
  if (!ts) return ''
  const diffMs = Date.now() - new Date(ts).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

function daysSince(ts) {
  if (!ts) return null
  return Math.floor((Date.now() - new Date(ts).getTime()) / 86400000)
}

function needsAttention(r) {
  const staleDays = daysSince(r.last_payroll_run_at)
  const stalePayroll = staleDays === null || staleDays > STALE_PAYROLL_DAYS
  const issues = r.pending_leave_requests + r.pending_expense_claims + r.pending_attendance_corrections + r.open_support_tickets
  return issues > 0 || stalePayroll
}

export default function PlatformDashboard() {
  const [health, setHealth] = useState([])
  const [openTicketCount, setOpenTicketCount] = useState(0)
  const [ticketPreview, setTicketPreview] = useState([])
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: h }, { count: tc }, { data: tp }, { data: th }] = await Promise.all([
      supabase.from('v_company_health').select('*').order('company_name'),
      supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase
        .from('support_tickets')
        .select('id, subject, created_at, companies(name)')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(PREVIEW_LIMIT),
      supabase
        .from('support_threads')
        .select('id, last_message_at, companies(name), support_messages(sender_is_platform_admin, body, created_at)')
        .order('last_message_at', { ascending: false })
        .order('created_at', { foreignTable: 'support_messages', ascending: false })
        .limit(1, { foreignTable: 'support_messages' }),
    ])
    setHealth(h ?? [])
    setOpenTicketCount(tc ?? 0)
    setTicketPreview(tp ?? [])
    setThreads(th ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="page-inner" style={{ maxWidth: 1100 }}>
        <SkeletonBlock rows={2} />
        <SkeletonTable rows={5} columns={7} />
      </div>
    )
  }

  const realCompanies = health.filter((r) => !r.is_demo)
  const totalEmployees = realCompanies.reduce((sum, r) => sum + r.employee_count, 0)
  const attentionCount = health.filter(needsAttention).length
  const threadsNeedingReply = threads.filter((t) => {
    const latest = t.support_messages?.[0]
    return latest && !latest.sender_is_platform_admin
  })

  return (
    <div className="page-inner" style={{ maxWidth: 1100 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">PLATFORM ADMIN</p>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Everything across every company, at a glance.</p>
        </div>
      </div>

      <StaggerContainer as="div" className="stat-row">
        <StaggerItem as="div" className="stat-card">
          <span className="stat-label">Companies</span>
          <AnimatedNumber value={realCompanies.length} className="stat-value" />
          {attentionCount > 0 && (
            <span className="muted" style={{ fontSize: 12 }}>{attentionCount} need attention</span>
          )}
        </StaggerItem>
        <StaggerItem as="div" className="stat-card">
          <span className="stat-label">Employees</span>
          <AnimatedNumber value={totalEmployees} className="stat-value" />
        </StaggerItem>
        <StaggerItem as="div" className="stat-card">
          <span className="stat-label">Open tickets</span>
          <AnimatedNumber value={openTicketCount} className="stat-value" />
        </StaggerItem>
        <StaggerItem as="div" className="stat-card">
          <span className="stat-label">Chats awaiting reply</span>
          <AnimatedNumber value={threadsNeedingReply.length} className="stat-value" />
        </StaggerItem>
      </StaggerContainer>

      <div className="report-section">
        <div className="report-section-head">
          <p className="section-heading">Company health</p>
          <Link to="/platform-admin/companies" className="btn-secondary" style={{ padding: '6px 12px', fontSize: 13, textDecoration: 'none' }}>
            Manage companies →
          </Link>
        </div>
        {health.length === 0 ? (
          <p className="muted">No companies yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Employees</th>
                <th>Pending leave</th>
                <th>Pending expenses</th>
                <th>Pending corrections</th>
                <th>Last payroll run</th>
                <th>Open tickets</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {health.map((r) => {
                const staleDays = daysSince(r.last_payroll_run_at)
                const stalePayroll = staleDays === null || staleDays > STALE_PAYROLL_DAYS
                const attention = needsAttention(r)
                return (
                  <tr key={r.company_id} style={{ cursor: 'default' }}>
                    <td>
                      {r.company_name}
                      {r.is_demo && <span className="tab-count" style={{ marginLeft: 8, background: 'var(--ink-soft)' }}>demo</span>}
                    </td>
                    <td className="mono">{r.employee_count}</td>
                    <td className="mono" style={{ color: r.pending_leave_requests > 0 ? 'var(--warning)' : 'var(--ink-soft)' }}>{r.pending_leave_requests}</td>
                    <td className="mono" style={{ color: r.pending_expense_claims > 0 ? 'var(--warning)' : 'var(--ink-soft)' }}>{r.pending_expense_claims}</td>
                    <td className="mono" style={{ color: r.pending_attendance_corrections > 0 ? 'var(--warning)' : 'var(--ink-soft)' }}>{r.pending_attendance_corrections}</td>
                    <td className="mono" style={{ color: stalePayroll ? 'var(--danger)' : 'var(--ink-soft)' }}>
                      {formatDate(r.last_payroll_run_at)}{staleDays !== null && stalePayroll ? ` (${staleDays}d ago)` : ''}
                    </td>
                    <td className="mono" style={{ color: r.open_support_tickets > 0 ? 'var(--warning)' : 'var(--ink-soft)' }}>{r.open_support_tickets}</td>
                    <td>
                      <span className={`status-badge status-${attention ? 'pending' : 'active'}`}>
                        {attention ? 'Needs attention' : 'Healthy'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="report-section">
        <div className="report-section-head">
          <p className="section-heading">Open tickets</p>
          <Link to="/platform-admin/tickets" className="btn-secondary" style={{ padding: '6px 12px', fontSize: 13, textDecoration: 'none' }}>
            View all →
          </Link>
        </div>
        {ticketPreview.length === 0 ? (
          <p className="muted">No open tickets.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Submitted</th><th>Company</th><th>Subject</th></tr>
            </thead>
            <tbody>
              {ticketPreview.map((t) => (
                <tr key={t.id} style={{ cursor: 'default' }}>
                  <td className="mono">{formatDateTime(t.created_at)}</td>
                  <td>{t.companies?.name ?? '—'}</td>
                  <td>{t.subject}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="report-section">
        <div className="report-section-head">
          <p className="section-heading">Chats awaiting reply</p>
          <Link to="/platform-admin/chat" className="btn-secondary" style={{ padding: '6px 12px', fontSize: 13, textDecoration: 'none' }}>
            View all →
          </Link>
        </div>
        {threadsNeedingReply.length === 0 ? (
          <p className="muted">All caught up.</p>
        ) : (
          <div className="lookup-list">
            {threadsNeedingReply.slice(0, PREVIEW_LIMIT).map((t) => (
              <div key={t.id} className="lookup-row">
                <span>
                  <strong>{t.companies?.name ?? '—'}</strong>
                  <span className="muted" style={{ marginLeft: 8 }}>{t.support_messages?.[0]?.body}</span>
                </span>
                <span className="muted mono" style={{ fontSize: 11 }}>{relativeTime(t.last_message_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
