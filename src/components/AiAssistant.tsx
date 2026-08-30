import { useEffect, useState, useRef, useCallback } from 'react'
import { BotIcon } from './ui/bot'
import { SendIcon } from './ui/send'
import { PlusIcon } from './ui/plus'
import { ClockIcon } from './ui/clock'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { renderMarkdown } from '../lib/markdown'

type PendingAction = {
  id: string
  description: string
  resolved?: 'executed' | 'cancelled' | 'failed' | 'already_resolved' | 'not_found'
  resolvedMessage?: string
}

type ChatMessage = { role: 'user' | 'assistant'; content: string; isError?: boolean; pendingAction?: PendingAction }
type ThreadSummary = { id: string; title: string | null; updated_at: string }

const WAITING_LABELS = ['Thinking', 'Checking the data', 'Almost there']

async function extractErrorMessage(error: unknown): Promise<string> {
  // supabase-js functions.invoke() puts a non-2xx response's body on
  // error.context (a Response) rather than in a plain message string --
  // read it to surface the edge function's actual error text (e.g. the
  // rate-limit message) instead of a generic "non-2xx status" string.
  const err = error as { context?: Response; message?: string } | null
  if (err?.context) {
    try {
      const body = await err.context.clone().json()
      if (body?.error) return body.error
    } catch {
      // fall through to the generic message below
    }
  }
  return err?.message || 'Something went wrong. Please try again.'
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

// Reconstructs the same outcome text the edge function generates live, for
// a pending action being redisplayed from history (only its final `status`
// and `description` are stored, not the exact server message).
function describeResolvedAction(status: string, description: string): string {
  if (status === 'executed') return `Done -- ${description.replace(/^(Approve|Reject) /, (m) => m.toLowerCase())}`
  if (status === 'cancelled') return 'Cancelled -- no changes were made.'
  if (status === 'failed') return "This couldn't be completed -- it may have already been decided elsewhere."
  return 'Already resolved.'
}

export function AiAssistant() {
  const { company } = useAuth()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'chat' | 'history'>('chat')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [loadingThreads, setLoadingThreads] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [waitingLabelIndex, setWaitingLabelIndex] = useState(0)
  const [resolvingActionId, setResolvingActionId] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const loadMessagesInto = useCallback(async (id: string) => {
    const [{ data: msgRows }, { data: actionRows }] = await Promise.all([
      supabase.from('ai_messages').select('id, role, content').eq('conversation_id', id).order('created_at', { ascending: true }),
      supabase.from('ai_actions').select('id, message_id, description, status').eq('conversation_id', id),
    ])
    const actionByMessageId = new Map((actionRows ?? []).filter((a) => a.message_id).map((a) => [a.message_id as string, a]))
    const loaded: ChatMessage[] = (msgRows ?? []).map((m) => {
      const action = actionByMessageId.get(m.id)
      const pendingAction: PendingAction | undefined = action
        ? {
            id: action.id,
            description: action.description,
            resolved: action.status === 'proposed' ? undefined : (action.status as PendingAction['resolved']),
            resolvedMessage: action.status === 'proposed' ? undefined : describeResolvedAction(action.status, action.description),
          }
        : undefined
      return { role: m.role as 'user' | 'assistant', content: m.content, pendingAction }
    })
    setMessages(loaded)
  }, [])

  // Resume the most recent conversation on open, rather than always
  // starting blank -- closing the panel or navigating away shouldn't lose
  // where you left off.
  useEffect(() => {
    if (!company) return
    let cancelled = false
    ;(async () => {
      const { data: existing } = await supabase
        .from('ai_conversations')
        .select('id')
        .eq('company_id', company.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (cancelled || !existing) return
      setConversationId(existing.id)
      await loadMessagesInto(existing.id)
    })()
    return () => { cancelled = true }
  }, [company, loadMessagesInto])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Bridge from CommandPalette's "Ask PeopleBind AI: ..." result -- the
  // two components are siblings in AppShell's topbar with no shared
  // state, so a window event is the smallest way to let one open and
  // drive the other without a bigger refactor for one wire-up.
  useEffect(() => {
    function handleAskAi(e: Event) {
      const query = (e as CustomEvent<{ query: string }>).detail?.query
      if (!query) return
      setOpen(true)
      setView('chat')
      send(query)
    }
    window.addEventListener('peoplebind:ask-ai', handleAskAi)
    return () => window.removeEventListener('peoplebind:ask-ai', handleAskAi)
  })

  useEffect(() => {
    if (open && view === 'chat' && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [open, view, messages.length, sending])

  useEffect(() => {
    if (!sending) return
    setWaitingLabelIndex(0)
    const interval = setInterval(() => {
      setWaitingLabelIndex((i) => (i + 1) % WAITING_LABELS.length)
    }, 1500)
    return () => clearInterval(interval)
  }, [sending])

  async function send(overrideBody?: string) {
    const body = overrideBody ?? draft.trim()
    if (!body || !company || sending) return
    setSending(true)
    setDraft('')
    setMessages((prev) => [...prev, { role: 'user', content: body }])

    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: { conversation_id: conversationId, message: body, company_id: company.id },
    })

    if (error || !data?.reply) {
      const message = await extractErrorMessage(error)
      setMessages((prev) => [...prev, { role: 'assistant', content: message, isError: true }])
    } else {
      if (data.conversation_id) setConversationId(data.conversation_id)
      const pendingAction: PendingAction | undefined = data.pendingAction
        ? { id: data.pendingAction.id, description: data.pendingAction.description }
        : undefined
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply, pendingAction }])
    }
    setSending(false)
  }

  // Only ever reachable from a real Confirm/Cancel click below -- never
  // from anything typed in chat. Re-validated server-side against live
  // data before anything is actually applied.
  async function resolveAction(messageIndex: number, actionId: string, confirm: boolean) {
    if (!company || resolvingActionId) return
    setResolvingActionId(actionId)

    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: { action_id: actionId, confirm, company_id: company.id },
    })

    const outcome = data?.outcome ?? 'failed'
    const resolvedMessage = error ? await extractErrorMessage(error) : (data?.message ?? 'Something went wrong.')

    setMessages((prev) =>
      prev.map((m, i) =>
        i === messageIndex && m.pendingAction
          ? { ...m, pendingAction: { ...m.pendingAction, resolved: outcome, resolvedMessage } }
          : m
      )
    )
    setResolvingActionId(null)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function startNewChat() {
    setConversationId(null)
    setMessages([])
    setDraft('')
    setView('chat')
  }

  async function openHistory() {
    if (!company) return
    setView('history')
    setLoadingThreads(true)
    const { data } = await supabase
      .from('ai_conversations')
      .select('id, title, updated_at')
      .eq('company_id', company.id)
      .order('updated_at', { ascending: false })
      .limit(20)
    setThreads(data ?? [])
    setLoadingThreads(false)
  }

  async function openThread(id: string) {
    if (id === conversationId) {
      setView('chat')
      return
    }
    setConversationId(id)
    await loadMessagesInto(id)
    setView('chat')
  }

  return (
    <div className="notif-bell-wrap" ref={ref}>
      <button className="notif-bell" onClick={() => setOpen((v) => !v)} aria-label="PeopleBind AI" data-tooltip="Ask PeopleBind AI">
        <BotIcon size={19} />
      </button>

      {open && (
        <div className="notif-panel ai-chat-panel">
          <div className="notif-panel-header">
            <span>{view === 'history' ? 'Conversations' : 'PeopleBind AI'}</span>
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

          <div className="ai-chat-list" ref={listRef}>
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
                    className={`support-chat-thread-item${t.id === conversationId ? ' active' : ''}`}
                    onClick={() => openThread(t.id)}
                  >
                    <span className="support-chat-thread-preview">{t.title || '(no messages yet)'}</span>
                    <span className="support-chat-thread-time">{relativeTime(t.updated_at)}</span>
                  </button>
                ))
              )
            ) : messages.length === 0 ? (
              <div style={{ padding: '20px 16px' }}>
                <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
                  Ask about your team's attendance, leave, payroll, performance, or company policies.
                </p>
                <p className="muted" style={{ fontSize: 12 }}>
                  Try: "How many employees do we have?" or "What's our leave policy?"
                </p>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`ai-chat-msg${m.role === 'assistant' ? ' from-assistant' : ' from-self'}${m.isError ? ' is-error' : ''}`}>
                  {m.role === 'assistant' ? (
                    <div className="ai-chat-msg-body">{renderMarkdown(m.content)}</div>
                  ) : (
                    <p className="ai-chat-msg-body">{m.content}</p>
                  )}
                  {m.pendingAction && (
                    <div className="ai-chat-action">
                      {m.pendingAction.resolved ? (
                        <span className="muted" style={{ fontSize: 12.5 }}>{m.pendingAction.resolvedMessage}</span>
                      ) : (
                        <>
                          <span style={{ fontSize: 12.5 }}>{m.pendingAction.description}</span>
                          <span style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                            <button
                              type="button"
                              className="btn-primary"
                              style={{ padding: '4px 12px', fontSize: 12.5 }}
                              disabled={resolvingActionId === m.pendingAction.id}
                              onClick={() => resolveAction(i, m.pendingAction!.id, true)}
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              className="link-button"
                              style={{ fontSize: 12.5 }}
                              disabled={resolvingActionId === m.pendingAction.id}
                              onClick={() => resolveAction(i, m.pendingAction!.id, false)}
                            >
                              Cancel
                            </button>
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
            {view === 'chat' && sending && (
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
                placeholder="Ask PeopleBind AI…"
                rows={1}
              />
              <button type="button" className="btn-icon-round" onClick={() => send()} disabled={sending || !draft.trim()} aria-label="Send">
                <SendIcon size={15} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
