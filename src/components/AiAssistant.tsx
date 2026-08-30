import { useEffect, useState, useRef } from 'react'
import { BotIcon } from './ui/bot'
import { SendIcon } from './ui/send'
import { PlusIcon } from './ui/plus'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { renderMarkdown } from '../lib/markdown'

type ChatMessage = { role: 'user' | 'assistant'; content: string; isError?: boolean }

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

export function AiAssistant() {
  const { company } = useAuth()
  const [open, setOpen] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [waitingLabelIndex, setWaitingLabelIndex] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [open, messages.length, sending])

  useEffect(() => {
    if (!sending) return
    setWaitingLabelIndex(0)
    const interval = setInterval(() => {
      setWaitingLabelIndex((i) => (i + 1) % WAITING_LABELS.length)
    }, 1500)
    return () => clearInterval(interval)
  }, [sending])

  async function send() {
    const body = draft.trim()
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
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
    }
    setSending(false)
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
  }

  return (
    <div className="notif-bell-wrap" ref={ref}>
      <button className="notif-bell" onClick={() => setOpen((v) => !v)} aria-label="PeopleBind AI" data-tooltip="Ask PeopleBind AI">
        <BotIcon size={19} />
      </button>

      {open && (
        <div className="notif-panel ai-chat-panel">
          <div className="notif-panel-header">
            <span>PeopleBind AI</span>
            {messages.length > 0 && (
              <button type="button" className="link-button" onClick={startNewChat} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5 }}>
                <PlusIcon size={13} /> New chat
              </button>
            )}
          </div>

          <div className="ai-chat-list" ref={listRef}>
            {messages.length === 0 ? (
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
                <span className="support-chat-typing-label">{WAITING_LABELS[waitingLabelIndex]}…</span>
              </div>
            )}
          </div>

          <div className="support-chat-input-row">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask PeopleBind AI…"
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
