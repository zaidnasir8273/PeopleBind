import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
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

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('support_tickets')
      .select('id, subject, message, status, created_at, closed_at, companies(name), profiles(full_name, email)')
      .order('created_at', { ascending: false })
    if (filter === 'open') query = query.eq('status', 'open')
    const { data } = await query
    setTickets(data ?? [])
    setLoading(false)
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

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
                <td>
                  {t.status === 'open' && (
                    <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => closeTicket(t.id)}>Close</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
