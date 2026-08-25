import { useEffect, useState, useCallback, useRef } from 'react'
import { MessageCircleIcon } from './ui/message-circle'
import { SendIcon } from './ui/send'
import { PlusIcon } from './ui/plus'
import { ClockIcon } from './ui/clock'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Database } from '../lib/database.types'

type Message = Database['public']['Tables']['support_messages']['Row']
type ThreadSummary = { id: string; last_message_at: string; preview: string | null }

const WAITING_LABELS = ['Typing', 'Processing', 'Baking your reply']
const WAITING_TIMEOUT_MS = 45000
// Must exactly match ESCALATION_ACK in the generate-support-draft edge
// function -- used to detect that a thread has been handed to a human,
// so later messages don't show a "typing" indicator that nothing will
// ever answer automatically.
const ESCALATION_ACK = "Thanks for the extra detail -- I'm looping in a member of our support team to take a closer look at this. They'll follow up here shortly."

// Scans backward for the last admin message to determine whether this
// thread is currently waiting on a human (the ack was the last thing
// sent) vs. still eligible for an instant AI reply.
function computeEscalated(msgs: Message[]): boolean {
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i]
    if (m.sender_is_platform_admin) return m.body === ESCALATION_ACK
  }
  return false
}

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
  const [escalated, setEscalated] = useState(false)
  const [view, setView] = useState<'chat' | 'history'>('chat')
  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [loadingThreads, setLoadingThreads] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const waitingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // A company can have many threads (customers can start a new chat any
  // time); this always resumes the most recently active one rather than
  // assuming there's exactly one.
  const ensureThread = useCallback(async () => {
    if (!company) return null
    const { data: existing } = await supabase
      .from('support_threads')
      .select('id')
      .eq('company_id', company.id)
      .order('last_message_at', { ascending: false })
      .limit(1)
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

  const loadMessagesInto = useCallback(async (id: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('thread_id', id)
      .order('created_at', { ascending: true })
    setMessages(data ?? [])
    setEscalated(computeEscalated(data ?? []))
  }, [])

  useEffect(() => {
    if (!company) return
    let cancelled = false
    ;(async () => {
      const { data: existing } = await supabase
        .from('support_threads')
        .select('id')
        .eq('company_id', company.id)
        .order('last_message_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (cancelled) return
      if (existing) {
        setThreadId(existing.id)
        await loadMessagesInto(existing.id)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [company, loadMessagesInto])

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
          setEscalated((prev) => (msg.body === ESCALATION_ACK ? true : !msg.is_ai_generated ? false : prev))
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
      // Once a thread's been handed to a human (the escalation ack was
      // the last thing sent), nothing replies automatically anymore --
      // showing a "typing" indicator on every message from here on
      // would just imply a bot reply that's never coming.
      if (!escalated) {
        setWaiting(true)
        if (waitingTimeoutRef.current) clearTimeout(waitingTimeoutRef.current)
        waitingTimeoutRef.current = setTimeout(() => setWaiting(false), WAITING_TIMEOUT_MS)
      }
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

  async function startNewChat() {
    if (!company) return
    const { data: created, error } = await supabase
      .from('support_threads')
      .insert({ company_id: company.id })
      .select('id')
      .single()
    if (error) return
    if (waitingTimeoutRef.current) clearTimeout(waitingTimeoutRef.current)
    setThreadId(created.id)
    setMessages([])
    setEscalated(false)
    setWaiting(false)
    setDraft('')
    setView('chat')
  }

  async function openHistory() {
    if (!company) return
    setView('history')
    setLoadingThreads(true)
    const { data: threadRows } = await supabase
      .from('support_threads')
      .select('id, last_message_at')
      .eq('company_id', company.id)
      .order('last_message_at', { ascending: false })
    const rows = threadRows ?? []
    // One extra query per thread to grab its latest message as a preview --
    // a company's support history is small, so this stays cheap.
    const withPreviews = await Promise.all(
      rows.map(async (t): Promise<ThreadSummary> => {
        const { data: last } = await supabase
          .from('support_messages')
          .select('body')
          .eq('thread_id', t.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        return { id: t.id, last_message_at: t.last_message_at, preview: last?.body ?? null }
      })
    )
    setThreads(withPreviews)
    setLoadingThreads(false)
  }

  async function openThread(id: string) {
    if (id === threadId) {
      setView('chat')
      return
    }
    if (waitingTimeoutRef.current) clearTimeout(waitingTimeoutRef.current)
    setWaiting(false)
    setThreadId(id)
    await loadMessagesInto(id)
    setView('chat')
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
            <span>{view === 'history' ? 'Conversations' : 'Support'}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {view === 'history' ? (
                <button type="button" className="link-button" onClick={() => setView('chat')} style={{ fontSize: 12.5 }}>
                  Back
                </button>
              ) : (
                <>
                  <button type="button" className="link-button" onClick={openHistory} aria-label="Past conversations" data-tooltip="Past conversations">
                    <ClockIcon size={14} />
                  </button>
                  {messages.length > 0 && (
                    <button type="button" className="link-button" onClick={startNewChat} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5 }}>
                      <PlusIcon size={13} /> New chat
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="support-chat-list" ref={listRef}>
            {view === 'history' ? (
              loadingThreads ? (
                <p className="muted" style={{ padding: '20px 16px', fontSize: 13 }}>Loading…</p>
              ) : threads.length === 0 ? (
                <p className="muted" style={{ padding: '20px 16px', fontSize: 13 }}>No past conversations yet.</p>
              ) : (
                threads.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`support-chat-thread-item${t.id === threadId ? ' active' : ''}`}
                    onClick={() => openThread(t.id)}
                  >
                    <span className="support-chat-thread-preview">{t.preview || '(no messages yet)'}</span>
                    <span className="support-chat-thread-time">{relativeTime(t.last_message_at)}</span>
                  </button>
                ))
              )
            ) : messages.length === 0 ? (
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
            {view === 'chat' && waiting && (
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

          {view === 'chat' && (
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
          )}
        </div>
      )}
    </div>
  )
}
