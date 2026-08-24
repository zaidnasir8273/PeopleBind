import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { SendIcon } from '../components/ui/send'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { SkeletonBlock } from '../components/Skeleton'

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

export default function PlatformSupportChat() {
  const { profile } = useAuth()
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeThreadId, setActiveThreadId] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [aiDraft, setAiDraft] = useState(null)
  const [regenerating, setRegenerating] = useState(false)
  const [sendingAiDraft, setSendingAiDraft] = useState(false)
  const listRef = useRef(null)

  const loadThreads = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('support_threads')
      .select('id, status, last_message_at, companies(name), support_messages(sender_is_platform_admin, body, created_at)')
      .order('last_message_at', { ascending: false })
      .order('created_at', { foreignTable: 'support_messages', ascending: false })
      .limit(1, { foreignTable: 'support_messages' })
    setThreads(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  useEffect(() => {
    if (!activeThreadId) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('support_messages')
        .select('*')
        .eq('thread_id', activeThreadId)
        .order('created_at', { ascending: true })
      if (!cancelled) setMessages(data ?? [])
    })()

    const channel = supabase
      .channel(`platform_support_messages:${activeThreadId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `thread_id=eq.${activeThreadId}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new])
        loadThreads()
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [activeThreadId, loadThreads])

  useEffect(() => {
    setAiDraft(null)
    if (!activeThreadId) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('support_message_drafts')
        .select('body')
        .eq('thread_id', activeThreadId)
        .maybeSingle()
      if (!cancelled) setAiDraft(data?.body ?? null)
    })()

    const channel = supabase
      .channel(`support_message_drafts:${activeThreadId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_message_drafts', filter: `thread_id=eq.${activeThreadId}` }, (payload) => {
        if (payload.eventType === 'DELETE') setAiDraft(null)
        else setAiDraft(payload.new.body)
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [activeThreadId])

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages.length])

  async function send() {
    const body = draft.trim()
    if (!body || !activeThreadId || sending) return
    setSending(true)
    setDraft('')
    const { error } = await supabase.from('support_messages').insert({
      thread_id: activeThreadId,
      sender_profile_id: profile.id,
      sender_is_platform_admin: true,
      body,
    })
    setSending(false)
    if (error) toast.error(error.message || 'Failed to send')
  }

  async function sendAiDraft() {
    const body = (aiDraft ?? '').trim()
    if (!body || !activeThreadId || sendingAiDraft) return
    setSendingAiDraft(true)
    const { error } = await supabase.from('support_messages').insert({
      thread_id: activeThreadId,
      sender_profile_id: profile.id,
      sender_is_platform_admin: true,
      body,
    })
    if (!error) await supabase.from('support_message_drafts').delete().eq('thread_id', activeThreadId)
    setSendingAiDraft(false)
    if (error) toast.error(error.message || 'Failed to send')
  }

  async function dismissAiDraft() {
    if (!activeThreadId) return
    await supabase.from('support_message_drafts').delete().eq('thread_id', activeThreadId)
    setAiDraft(null)
  }

  async function regenerateAiDraft() {
    if (!activeThreadId || regenerating) return
    setRegenerating(true)
    const { data, error } = await supabase.functions.invoke('generate-support-draft', { body: { type: 'chat', thread_id: activeThreadId } })
    setRegenerating(false)
    if (error) {
      toast.error('Failed to generate a suggestion')
      return
    }
    setAiDraft(data?.draft ?? aiDraft)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const activeThread = threads.find((t) => t.id === activeThreadId)

  return (
    <div className="page-inner" style={{ maxWidth: 1100 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">PLATFORM ADMIN</p>
          <h1 className="page-title">Live chat</h1>
        </div>
      </div>

      <div className="platform-chat-shell">
        <div className="platform-chat-threads">
          {loading ? (
            <SkeletonBlock rows={5} />
          ) : threads.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 20 }}>
              <p>No conversations yet.</p>
            </div>
          ) : (
            threads.map((t) => {
              const latest = t.support_messages?.[0]
              const needsReply = latest && !latest.sender_is_platform_admin
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`platform-chat-thread-item${activeThreadId === t.id ? ' active' : ''}`}
                  onClick={() => setActiveThreadId(t.id)}
                >
                  <span className="platform-chat-thread-top">
                    <span className="platform-chat-thread-company">{t.companies?.name ?? '—'}</span>
                    {needsReply && <span className="platform-chat-thread-dot" />}
                  </span>
                  {latest && (
                    <span className="platform-chat-thread-preview">{latest.body}</span>
                  )}
                  <span className="platform-chat-thread-time">{relativeTime(t.last_message_at)}</span>
                </button>
              )
            })
          )}
        </div>

        <div className="platform-chat-conversation">
          {!activeThread ? (
            <div className="empty-state" style={{ margin: 'auto' }}>
              <p>Select a conversation.</p>
            </div>
          ) : (
            <>
              <div className="platform-chat-conversation-header">{activeThread.companies?.name}</div>
              <div className="support-chat-list" ref={listRef} style={{ flex: 1 }}>
                {messages.map((m) => (
                  <div key={m.id} className={`support-chat-msg${m.sender_is_platform_admin ? ' from-self' : ' from-admin'}`}>
                    <p className="support-chat-msg-body">{m.body}</p>
                    <span className="support-chat-msg-time">{relativeTime(m.created_at)}</span>
                  </div>
                ))}
              </div>
              {aiDraft !== null && (
                <div style={{ background: 'var(--surface-alt, #f7f7f8)', border: '1px solid var(--line)', borderRadius: 8, padding: 10, margin: '0 12px 8px' }}>
                  <p className="muted" style={{ margin: '0 0 6px', fontSize: 12 }}>AI suggested reply — review and edit before sending</p>
                  <textarea
                    rows={2}
                    style={{ width: '100%', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
                    value={aiDraft}
                    onChange={(e) => setAiDraft(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button type="button" className="btn-primary" style={{ padding: '5px 10px', fontSize: 12 }} disabled={sendingAiDraft || !aiDraft.trim()} onClick={sendAiDraft}>
                      {sendingAiDraft && <Loader2 size={13} className="btn-spinner" />}
                      Send
                    </button>
                    <button type="button" className="btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }} disabled={regenerating} onClick={regenerateAiDraft}>
                      {regenerating ? 'Generating…' : 'Regenerate'}
                    </button>
                    <button type="button" className="link-button" style={{ fontSize: 12 }} onClick={dismissAiDraft}>Dismiss</button>
                  </div>
                </div>
              )}
              <div className="support-chat-input-row">
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={handleKeyDown} placeholder="Reply…" rows={1} />
                <button type="button" className="btn-icon-round" onClick={send} disabled={sending || !draft.trim()} aria-label="Send">
                  <SendIcon size={15} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
