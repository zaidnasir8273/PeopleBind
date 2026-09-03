import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { BotIcon } from './ui/bot'
import { SendIcon } from './ui/send'
import { PlusIcon } from './ui/plus'
import { ClockIcon } from './ui/clock'
import { useAuth } from '../context/AuthContext'
import { renderMarkdown } from '../lib/markdown'
import { useAiChat } from '../hooks/useAiChat'
import { hasExploredAi, markAiExplored, onAiExplored } from '../lib/aiFeatureBadge'

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

export function AiAssistant() {
  const { company } = useAuth()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'chat' | 'history'>('chat')
  const [draft, setDraft] = useState('')
  const [showNewBadge, setShowNewBadge] = useState(() => !hasExploredAi())
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const {
    conversationId,
    messages,
    threads,
    loadingThreads,
    sending,
    waitingLabelIndex,
    waitingLabels,
    resolvingActionId,
    send,
    resolveAction,
    startNewChat,
    loadThreads,
    openThread,
    resumeLatest,
  } = useAiChat(company)

  // The popover mounts once for the whole session (it lives in AppShell's
  // topbar), so its initial "resume most recent" fetch only ever reflects
  // whatever was latest the moment the app first loaded. Re-check every
  // time it's opened so a conversation started since -- e.g. via the
  // dedicated PeopleBind AI page -- shows up here too, without needing a
  // full reload.
  useEffect(() => {
    if (open) {
      resumeLatest()
      markAiExplored()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Explored via the dedicated /app/ai page instead of this popover --
  // markAiExplored() there fires the same event, so the badge hides
  // immediately here too rather than waiting for a reload.
  useEffect(() => onAiExplored(() => setShowNewBadge(false)), [])

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

  function handleSend() {
    const body = draft.trim()
    if (!body) return
    setDraft('')
    send(body)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleStartNewChat() {
    startNewChat()
    setDraft('')
    setView('chat')
  }

  async function openHistory() {
    setView('history')
    await loadThreads()
  }

  async function handleOpenThread(id: string) {
    await openThread(id)
    setView('chat')
  }

  return (
    <div className="notif-bell-wrap" ref={ref}>
      <button className="notif-bell" onClick={() => setOpen((v) => !v)} aria-label="PeopleBind AI" data-tooltip="Ask PeopleBind AI">
        <BotIcon size={19} />
        {showNewBadge && <span className="ai-new-badge">New</span>}
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
                    <button type="button" className="link-button" onClick={handleStartNewChat} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5 }}>
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
                    onClick={() => handleOpenThread(t.id)}
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
                  {m.sources && m.sources.length > 0 && (
                    <div className="ai-chat-sources">
                      <span className="muted">Sources:</span>
                      {m.sources.map((s, si) => (
                        <span key={s.id}>
                          <Link to={`/app/help?article=${s.id}`}>{s.title}</Link>
                          {si < m.sources!.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
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
                <span className="support-chat-typing-label">{waitingLabels[waitingLabelIndex]}…</span>
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
              <button type="button" className="btn-icon-round" onClick={handleSend} disabled={sending || !draft.trim()} aria-label="Send">
                <SendIcon size={15} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
