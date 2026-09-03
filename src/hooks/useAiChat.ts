import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type PendingAction = {
  id: string
  description: string
  resolved?: 'executed' | 'cancelled' | 'failed' | 'already_resolved' | 'not_found'
  resolvedMessage?: string
}

export type Source = { id: string; title: string }
export type ChatMessage = { role: 'user' | 'assistant'; content: string; isError?: boolean; pendingAction?: PendingAction; sources?: Source[] | null }
export type ThreadSummary = { id: string; title: string | null; updated_at: string }

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

// Reconstructs the same outcome text the edge function generates live, for
// a pending action being redisplayed from history (only its final `status`
// and `description` are stored, not the exact server message).
function describeResolvedAction(status: string, description: string): string {
  if (status === 'executed') return `Done -- ${description.replace(/^(Approve|Reject) /, (m) => m.toLowerCase())}`
  if (status === 'cancelled') return 'Cancelled -- no changes were made.'
  if (status === 'failed') return "This couldn't be completed -- it may have already been decided elsewhere."
  return 'Already resolved.'
}

/**
 * All the stateful chat logic PeopleBind AI needs, shared between the
 * topbar popover (AiAssistant.tsx) and the dedicated full-page module
 * (pages/AiChat.tsx) so the two never drift out of sync with each other.
 */
export function useAiChat(company: { id: string } | null) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [loadingThreads, setLoadingThreads] = useState(false)
  const [sending, setSending] = useState(false)
  const [waitingLabelIndex, setWaitingLabelIndex] = useState(0)
  const [resolvingActionId, setResolvingActionId] = useState<string | null>(null)

  const loadMessagesInto = useCallback(async (id: string) => {
    const [{ data: msgRows }, { data: actionRows }] = await Promise.all([
      supabase.from('ai_messages').select('id, role, content, sources').eq('conversation_id', id).order('created_at', { ascending: true }),
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
      return { role: m.role as 'user' | 'assistant', content: m.content, pendingAction, sources: (m as any).sources ?? null }
    })
    setMessages(loaded)
  }, [])

  const loadThreads = useCallback(async () => {
    if (!company) return
    setLoadingThreads(true)
    const { data } = await supabase
      .from('ai_conversations')
      .select('id, title, updated_at')
      .eq('company_id', company.id)
      .order('updated_at', { ascending: false })
      .limit(50)
    setThreads(data ?? [])
    setLoadingThreads(false)
  }, [company])

  // Resume the most recent conversation, rather than always starting
  // blank -- closing the popover, navigating away, or reloading the full
  // page shouldn't lose where you left off. Exposed (not just run on
  // mount) because the popover stays mounted for the whole session --
  // without re-checking on each open, it would only ever reflect
  // whatever was most recent the moment the app first loaded, missing
  // any conversation started since via the other surface.
  const resumeLatest = useCallback(async () => {
    if (!company) return
    const { data: existing } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('company_id', company.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!existing) return
    setConversationId(existing.id)
    await loadMessagesInto(existing.id)
  }, [company, loadMessagesInto])

  useEffect(() => {
    resumeLatest()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company])

  useEffect(() => {
    if (!sending) return
    setWaitingLabelIndex(0)
    const interval = setInterval(() => {
      setWaitingLabelIndex((i) => (i + 1) % WAITING_LABELS.length)
    }, 1500)
    return () => clearInterval(interval)
  }, [sending])

  async function send(draft: string) {
    const body = draft.trim()
    if (!body || !company || sending) return
    setSending(true)
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
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply, pendingAction, sources: data.sources ?? null }])
    }
    setSending(false)
    loadThreads()
  }

  // Only ever reachable from a real Confirm/Cancel click -- never from
  // anything typed in chat. Re-validated server-side against live data
  // before anything is actually applied.
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

  function startNewChat() {
    setConversationId(null)
    setMessages([])
  }

  async function openThread(id: string) {
    if (id === conversationId) return
    setConversationId(id)
    await loadMessagesInto(id)
  }

  async function renameConversation(id: string, title: string) {
    const trimmed = title.trim()
    if (!trimmed) return
    const { error } = await supabase.from('ai_conversations').update({ title: trimmed }).eq('id', id)
    if (!error) setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, title: trimmed } : t)))
  }

  async function deleteConversation(id: string) {
    const { error } = await supabase.from('ai_conversations').delete().eq('id', id)
    if (error) return
    setThreads((prev) => prev.filter((t) => t.id !== id))
    if (id === conversationId) {
      setConversationId(null)
      setMessages([])
    }
  }

  return {
    conversationId,
    messages,
    threads,
    loadingThreads,
    sending,
    waitingLabelIndex,
    waitingLabels: WAITING_LABELS,
    resolvingActionId,
    send,
    resolveAction,
    startNewChat,
    loadThreads,
    openThread,
    renameConversation,
    deleteConversation,
    resumeLatest,
  }
}
