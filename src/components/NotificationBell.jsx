import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function relativeTime(ts) {
  const diffMs = Date.now() - new Date(ts).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

// The notification triggers don't set a link column yet, so derive a sensible
// destination from the notification type until that's wired up server-side.
function deriveLink(n, portal) {
  if (n.link) return n.link
  if (n.type?.startsWith('leave_')) return portal === 'employee' ? '/employee/leave' : '/app/leave'
  if (n.type?.startsWith('expense_')) return portal === 'employee' ? null : '/app/expenses'
  if (n.type === 'payslip_available') return portal === 'employee' ? '/employee/payslips' : '/app/payroll'
  return null
}

export function NotificationBell({ portal = 'app' }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const load = useCallback(async () => {
    if (!profile) return
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, link, read_at, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
    setItems(data ?? [])
  }, [profile])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel(`notifications:${profile.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, (payload) => {
        setItems((prev) => [payload.new, ...prev])
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile])

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const unreadCount = items.filter((n) => !n.read_at).length

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null)
  }

  async function handleClickItem(n) {
    if (!n.read_at) {
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read_at: new Date().toISOString() } : i)))
      supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', n.id).then(() => {})
    }
    const to = deriveLink(n, portal)
    if (to) {
      navigate(to)
      setOpen(false)
    }
  }

  return (
    <div className="notif-bell-wrap" ref={ref}>
      <button className="notif-bell" onClick={() => setOpen((v) => !v)} aria-label="Notifications">
        <Bell size={17} strokeWidth={2} />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-panel-header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button className="link-button" style={{ fontSize: 12 }} onClick={markAllRead}>Mark all read</button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="muted" style={{ padding: '20px 16px', fontSize: 13 }}>Nothing yet.</p>
          ) : (
            <div className="notif-list">
              {items.map((n) => (
                <button key={n.id} className={`notif-item${!n.read_at ? ' unread' : ''}`} onClick={() => handleClickItem(n)}>
                  {!n.read_at && <span className="notif-dot" />}
                  <span className="notif-item-body">
                    <span className="notif-item-title">{n.title}</span>
                    {n.body && <span className="notif-item-text">{n.body}</span>}
                    <span className="notif-item-time">{relativeTime(n.created_at)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
