import { useEffect, useRef, useState } from 'react'
import { PlusIcon } from '../components/ui/plus'
import { SendIcon } from '../components/ui/send'
import { DeleteIcon } from '../components/ui/delete'
import { SquarePenIcon } from '../components/ui/square-pen'
import { BotIcon } from '../components/ui/bot'
import { useAuth } from '../context/AuthContext'
import { renderMarkdown } from '../lib/markdown'
import { useAiChat } from '../hooks/useAiChat'

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

export default function AiChat() {
  const { company } = useAuth()
  const [draft, setDraft] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
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
    renameConversation,
    deleteConversation,
  } = useAiChat(company)

  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages.length, sending])

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

  function startRename(id: string, currentTitle: string | null) {
    setConfirmingDeleteId(null)
    setRenamingId(id)
    setRenameDraft(currentTitle || '')
  }

  function commitRename(id: string) {
    if (renameDraft.trim()) renameConversation(id, renameDraft)
    setRenamingId(null)
  }

  return (
    <div className="page-inner" style={{ maxWidth: 1100 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">AI</p>
          <h1 className="page-title">PeopleBind AI</h1>
        </div>
      </div>

      <div className="ai-page-card">
        <div className="ai-page-sidebar">
          <button type="button" className="btn-secondary ai-page-new-chat" onClick={startNewChat}>
            <PlusIcon size={14} /> New chat
          </button>
          <div className="ai-page-thread-list">
            {loadingThreads ? (
              <p className="muted" style={{ padding: '12px', fontSize: 12.5 }}>Loading…</p>
            ) : threads.length === 0 ? (
              <p className="muted" style={{ padding: '12px', fontSize: 12.5 }}>No conversations yet.</p>
            ) : (
              threads.map((t) => (
                <div key={t.id} className={`ai-page-thread-item${t.id === conversationId ? ' active' : ''}`}>
                  {renamingId === t.id ? (
                    <input
                      autoFocus
                      className="ai-page-thread-rename-input"
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onBlur={() => commitRename(t.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(t.id)
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                    />
                  ) : confirmingDeleteId === t.id ? (
                    <span className="ai-page-thread-confirm">
                      <span className="muted" style={{ fontSize: 12 }}>Delete this chat?</span>
                      <button
                        type="button"
                        className="link-button"
                        style={{ color: 'var(--danger)', fontSize: 12 }}
                        onClick={() => { deleteConversation(t.id); setConfirmingDeleteId(null) }}
                      >
                        Yes
                      </button>
                      <button type="button" className="link-button" style={{ fontSize: 12 }} onClick={() => setConfirmingDeleteId(null)}>
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <>
                      <button type="button" className="ai-page-thread-open" onClick={() => openThread(t.id)}>
                        <span className="ai-page-thread-title">{t.title || '(no messages yet)'}</span>
                        <span className="support-chat-thread-time">{relativeTime(t.updated_at)}</span>
                      </button>
                      <span className="ai-page-thread-actions">
                        <button
                          type="button"
                          className="ai-page-thread-icon-btn"
                          aria-label="Rename conversation"
                          onClick={() => startRename(t.id, t.title)}
                        >
                          <SquarePenIcon size={12} />
                        </button>
                        <button
                          type="button"
                          className="ai-page-thread-icon-btn danger"
                          aria-label="Delete conversation"
                          onClick={() => setConfirmingDeleteId(t.id)}
                        >
                          <DeleteIcon size={12} />
                        </button>
                      </span>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="ai-page-chat">
          <div className="ai-page-messages" ref={listRef}>
            <div className="ai-page-messages-inner">
              {messages.length === 0 ? (
                <div className="ai-page-empty">
                  <BotIcon size={28} />
                  <p className="muted" style={{ fontSize: 14, marginTop: 10, marginBottom: 4 }}>
                    Ask about your team's attendance, leave, payroll, performance, or company policies.
                  </p>
                  <p className="muted" style={{ fontSize: 13 }}>
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
              {sending && (
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
          </div>

          <div className="ai-page-input-row">
            <div className="ai-page-input-inner">
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
          </div>
        </div>
      </div>
    </div>
  )
}
