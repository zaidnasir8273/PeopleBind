import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { SkeletonTable } from '../components/Skeleton'

function formatDateTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function PlatformTickets() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('open')
  const [drafts, setDrafts] = useState({})
  const [regenerating, setRegenerating] = useState(null)
  const [sending, setSending] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('support_tickets')
      .select('id, subject, message, status, created_at, closed_at, ai_draft_resolution, resolution, companies(name), profiles(full_name, email)')
      .order('created_at', { ascending: false })
    if (filter === 'open') query = query.eq('status', 'open')
    const { data } = await query
    setTickets(data ?? [])
    setDrafts((prev) => {
      const next = { ...prev }
      for (const t of data ?? []) {
        if (next[t.id] === undefined) next[t.id] = t.ai_draft_resolution ?? ''
      }
      return next
    })
    setLoading(false)
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  async function regenerate(id) {
    setRegenerating(id)
    const { data, error } = await supabase.functions.invoke('generate-support-draft', { body: { type: 'ticket', ticket_id: id } })
    setRegenerating(null)
    if (error) {
      toast.error('Failed to generate a suggestion')
      return
    }
    setDrafts((prev) => ({ ...prev, [id]: data?.draft ?? prev[id] }))
  }

  async function sendAndClose(id) {
    const text = (drafts[id] ?? '').trim()
    if (!text) return
    setSending(id)
    const { error } = await supabase
      .from('support_tickets')
      .update({ resolution: text, status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', id)
    setSending(null)
    if (error) {
      toast.error(error.message || 'Failed to send resolution')
      return
    }
    toast.success('Resolution sent, ticket closed')
    load()
  }

  async function closeTicket(id) {
    const { error } = await supabase.from('support_tickets').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', id)
    if (error) {
      toast.error(error.message || 'Failed to close ticket')
      return
    }
    toast.success('Ticket closed')
    load()
  }

  return (
    <div className="page-inner" style={{ maxWidth: 1000 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">PLATFORM ADMIN</p>
          <h1 className="page-title">Support tickets</h1>
        </div>
      </div>

      <div className="field-row" style={{ maxWidth: 200, marginBottom: 4 }}>
        <label className="field">
          <span>Show</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="open">Open</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>

      {loading ? (
        <SkeletonTable rows={4} columns={5} />
      ) : tickets.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>{filter === 'open' ? 'No open tickets.' : 'No tickets yet.'}</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Submitted</th><th>Company</th><th>From</th><th>Subject</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} style={{ cursor: 'default' }}>
                <td className="mono">{formatDateTime(t.created_at)}</td>
                <td>{t.companies?.name ?? '—'}</td>
                <td>{t.profiles?.full_name || t.profiles?.email || '—'}</td>
                <td>
                  <b>{t.subject}</b>
                  {t.message && (
                    <div className="muted" style={{ fontSize: 12, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.message}
                    </div>
                  )}
                </td>
                <td><span className={`status-badge status-${t.status === 'open' ? 'pending' : 'approved'}`}>{t.status}</span></td>
                <td></td>
              </tr>
            ))}
            {tickets.map((t) => t.status === 'open' && (
              <tr key={`${t.id}-draft`} style={{ cursor: 'default' }}>
                <td colSpan={6} style={{ background: 'var(--surface-alt, #f7f7f8)', padding: '10px 14px' }}>
                  <p className="muted" style={{ margin: '0 0 6px', fontSize: 12 }}>
                    {drafts[t.id] ? 'AI suggested resolution — review and edit before sending' : regenerating === t.id ? 'Generating suggested reply…' : 'No suggestion yet.'}
                  </p>
                  <textarea
                    rows={3}
                    style={{ width: '100%', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
                    value={drafts[t.id] ?? ''}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))}
                    placeholder="Write a resolution reply…"
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ padding: '5px 10px', fontSize: 12 }}
                      disabled={sending === t.id || !(drafts[t.id] ?? '').trim()}
                      onClick={() => sendAndClose(t.id)}
                    >
                      {sending === t.id && <Loader2 size={13} className="btn-spinner" />}
                      Send &amp; close
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '5px 10px', fontSize: 12 }}
                      disabled={regenerating === t.id}
                      onClick={() => regenerate(t.id)}
                    >
                      {regenerating === t.id ? 'Generating…' : drafts[t.id] ? 'Regenerate' : 'Generate suggestion'}
                    </button>
                    <button type="button" className="link-button" style={{ fontSize: 12 }} onClick={() => closeTicket(t.id)}>
                      Close without reply
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
