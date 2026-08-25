import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { SkeletonTable } from '../components/Skeleton'

function formatDateTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const STATUSES = ['new', 'contacted', 'closed']

export default function PlatformSalesInquiries() {
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('new')

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('sales_inquiries').select('*').order('created_at', { ascending: false })
    if (filter !== 'all') query = query.eq('status', filter)
    const { data } = await query
    setInquiries(data ?? [])
    setLoading(false)
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  async function updateStatus(id, status) {
    const { error } = await supabase.from('sales_inquiries').update({ status }).eq('id', id)
    if (error) {
      toast.error(error.message || 'Failed to update status')
      return
    }
    load()
  }

  return (
    <div className="page-inner" style={{ maxWidth: 1100 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">PLATFORM ADMIN</p>
          <h1 className="page-title">Price quote requests</h1>
        </div>
      </div>

      <div className="field-row" style={{ maxWidth: 200, marginBottom: 4 }}>
        <label className="field">
          <span>Show</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="closed">Closed</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>

      {loading ? (
        <SkeletonTable rows={4} columns={7} />
      ) : inquiries.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>No {filter === 'all' ? '' : filter} quote requests.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Submitted</th><th>Name</th><th>Company</th><th>Email</th><th>Phone</th><th>Team size</th><th>Message</th><th>Status</th></tr>
          </thead>
          <tbody>
            {inquiries.map((inq) => (
              <tr key={inq.id} style={{ cursor: 'default' }}>
                <td className="mono">{formatDateTime(inq.created_at)}</td>
                <td>{inq.full_name}</td>
                <td>{inq.company_name}</td>
                <td><a href={`mailto:${inq.work_email}`}>{inq.work_email}</a></td>
                <td>{inq.phone || '—'}</td>
                <td>{inq.team_size || '—'}</td>
                <td>
                  {inq.message ? (
                    <div className="muted" style={{ fontSize: 12, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {inq.message}
                    </div>
                  ) : '—'}
                </td>
                <td>
                  <select
                    value={inq.status}
                    onChange={(e) => updateStatus(inq.id, e.target.value)}
                    style={{ fontSize: 12, padding: '3px 6px' }}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
