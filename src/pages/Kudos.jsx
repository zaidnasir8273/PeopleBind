import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { PlusIcon } from '../components/ui/plus'
import { Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'
import { Avatar } from '../components/Avatar'
import { SkeletonBlock } from '../components/Skeleton'

const CATEGORIES = ['Great work', 'Team player', 'Above and beyond', 'Milestone']

function relativeTime(ts) {
  const diffMs = Date.now() - new Date(ts).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function Kudos() {
  const { company, employeeRecord } = useAuth()
  const [items, setItems] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [composing, setComposing] = useState(false)
  const [form, setForm] = useState({ to_employee_id: '', category: CATEGORIES[0], message: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: kudosRows }, { data: employeeRows }] = await Promise.all([
      supabase
        .from('kudos')
        .select('id, category, message, created_at, from_employee_id, to_employee_id, from:employees!kudos_from_employee_id_fkey(full_name, photo_url), to:employees!kudos_to_employee_id_fkey(full_name, photo_url)')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('employees').select('id, full_name').in('employment_status', ['training', 'probation', 'confirmed']).order('full_name'),
    ])
    setItems(kudosRows ?? [])
    setEmployees(employeeRows ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openCompose() {
    setForm({ to_employee_id: '', category: CATEGORIES[0], message: '' })
    setComposing(true)
  }

  async function post() {
    if (!form.message.trim() || !company || !employeeRecord) return
    setSaving(true)
    const { error } = await supabase.from('kudos').insert({
      company_id: company.id,
      from_employee_id: employeeRecord.id,
      to_employee_id: form.to_employee_id || null,
      category: form.category || null,
      message: form.message.trim(),
    })
    setSaving(false)
    if (error) {
      toast.error(error.message || 'Failed to post')
      return
    }
    toast.success('Posted!')
    setComposing(false)
    load()
  }

  async function remove(id) {
    const { error } = await supabase.from('kudos').delete().eq('id', id)
    if (error) {
      toast.error(error.message || 'Failed to delete')
      return
    }
    setItems((prev) => prev.filter((k) => k.id !== id))
  }

  return (
    <div className="page-inner" style={{ maxWidth: 760 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">COMPANY</p>
          <h1 className="page-title">Celebrate wins</h1>
        </div>
        <button type="button" className="btn-primary" onClick={openCompose} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <PlusIcon size={15} />
          Give kudos
        </button>
      </div>

      {loading ? (
        <SkeletonBlock rows={4} />
      ) : items.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>No kudos yet.</p>
          <p className="muted">Give a teammate some recognition — it'll show up here for everyone.</p>
        </div>
      ) : (
        <div className="feed-list">
          {items.map((k) => (
            <div key={k.id} className="feed-card">
              <div className="feed-card-head">
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar name={k.from?.full_name} photoUrl={k.from?.photo_url} size={26} />
                  <span className="feed-card-title">
                    {k.from?.full_name ?? 'Someone'}
                    {k.to?.full_name && <> → {k.to.full_name}</>}
                  </span>
                  {k.category && <span className="tab-count">{k.category}</span>}
                </span>
                {k.from_employee_id === employeeRecord?.id && (
                  <button type="button" className="link-button" aria-label="Delete" onClick={() => remove(k.id)}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <p className="feed-card-body">{k.message}</p>
              <span className="feed-card-meta">{relativeTime(k.created_at)}</span>
            </div>
          ))}
        </div>
      )}

      <Drawer open={composing} onClose={() => setComposing(false)} title="Give kudos">
        <div className="drawer-form">
          <label className="field">
            <span>To (optional — leave blank to celebrate a team win)</span>
            <select value={form.to_employee_id} onChange={(e) => setForm({ ...form, to_employee_id: e.target.value })}>
              <option value="">Everyone / team</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Category</span>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Message</span>
            <textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} autoFocus />
          </label>
          <button
            type="button"
            className="btn-primary"
            disabled={saving || !form.message.trim()}
            onClick={post}
            style={{ alignSelf: 'flex-start' }}
          >
            {saving ? 'Posting…' : 'Post'}
          </button>
        </div>
      </Drawer>
    </div>
  )
}
