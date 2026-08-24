import { useEffect, useState, useCallback, useRef } from 'react'
import { MessageCircleIcon } from './ui/message-circle'
import { SendIcon } from './ui/send'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Database } from '../lib/database.types'

type Message = Database['public']['Tables']['support_messages']['Row']

const WAITING_LABELS = ['Typing', 'Processing', 'Baking your reply']
const WAITING_TIMEOUT_MS = 45000

function relativeTime(ts: string) {
  const diffMs = Date.now() - new Date(ts).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

export function SupportChat() {
  const { profile, company } = useAuth()
  const [open, setOpen] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [unread, setUnread] = useState(0)
  const [waiting, setWaiting] = useState(false)
  const [waitingLabelIndex, setWaitingLabelIndex] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const waitingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const ensureThread = useCallback(async () => {
    if (!company) return null
    const { data: existing } = await supabase
      .from('support_threads')
      .select('id')
      .eq('company_id', company.id)
      .maybeSingle()
    if (existing) return existing.id
    const { data: created, error } = await supabase
      .from('support_threads')
      .insert({ company_id: company.id })
      .select('id')
      .single()
    if (error) return null
    return created.id
  }, [company])

  useEffect(() => {
    if (!company) return
    let cancelled = false
    ;(async () => {
      const { data: existing } = await supabase
        .from('support_threads')
        .select('id')
        .eq('company_id', company.id)
        .maybeSingle()
      if (cancelled) return
      if (existing) {
        setThreadId(existing.id)
        const { data } = await supabase
          .from('support_messages')
          .select('*')
          .eq('thread_id', existing.id)
          .order('created_at', { ascending: true })
        if (!cancelled) setMessages(data ?? [])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [company])

  useEffect(() => {
    if (!threadId) return
    const channel = supabase
      .channel(`support_messages:${threadId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `thread_id=eq.${threadId}` }, (payload) => {
        const msg = payload.new as Message
        setMessages((prev) => [...prev, msg])
        if (msg.sender_is_platform_admin) {
          setWaiting(false)
          if (waitingTimeoutRef.current) clearTimeout(waitingTimeoutRef.current)
          if (!open) setUnread((n) => n + 1)
        }
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [threadId, open])

  useEffect(() => {
    if (open) setUnread(0)
  }, [open])

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [open, messages.length, waiting])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function send() {
    const body = draft.trim()
    if (!body || !profile || sending) return
    setSending(true)
    setDraft('')
    let tid = threadId
    if (!tid) {
      tid = await ensureThread()
      setThreadId(tid)
    }
    if (tid) {
      await supabase.from('support_messages').insert({
        thread_id: tid,
        sender_profile_id: profile.id,
        sender_is_platform_admin: false,
        body,
      })
      setWaiting(true)
      if (waitingTimeoutRef.current) clearTimeout(waitingTimeoutRef.current)
      waitingTimeoutRef.current = setTimeout(() => setWaiting(false), WAITING_TIMEOUT_MS)
    }
    setSending(false)
  }

  useEffect(() => {
    if (!waiting) return
    setWaitingLabelIndex(0)
    const interval = setInterval(() => {
      setWaitingLabelIndex((i) => (i + 1) % WAITING_LABELS.length)
    }, 1600)
    return () => clearInterval(interval)
  }, [waiting])

  useEffect(() => {
    return () => {
      if (waitingTimeoutRef.current) clearTimeout(waitingTimeoutRef.current)
    }
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="notif-bell-wrap" ref={ref}>
      <button className="notif-bell" onClick={() => setOpen((v) => !v)} aria-label="Support chat" data-tooltip="Support">
        <MessageCircleIcon size={19} />
        {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel support-chat-panel">
          <div className="notif-panel-header">
            <span>Support</span>
          </div>

          <div className="support-chat-list" ref={listRef}>
            {messages.length === 0 ? (
              <p className="muted" style={{ padding: '20px 16px', fontSize: 13 }}>
                Message our team and we'll get back to you here.
              </p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`support-chat-msg${m.sender_is_platform_admin ? ' from-admin' : ' from-self'}`}>
                  <p className="support-chat-msg-body">{m.body}</p>
                  <span className="support-chat-msg-time">{relativeTime(m.created_at)}</span>
                </div>
              ))
            )}
            {waiting && (
              <div className="support-chat-typing">
                <div className="support-chat-typing-bubble">
                  <span className="support-chat-typing-dot" />
                  <span className="support-chat-typing-dot" />
                  <span className="support-chat-typing-dot" />
                </div>
                <span className="support-chat-typing-label">{WAITING_LABELS[waitingLabelIndex]}…</span>
              </div>
            )}
          </div>

          <div className="support-chat-input-row">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message…"
              rows={1}
            />
            <button type="button" className="btn-icon-round" onClick={send} disabled={sending || !draft.trim()} aria-label="Send">
              <SendIcon size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
