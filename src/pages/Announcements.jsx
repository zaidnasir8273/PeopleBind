import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { PlusIcon } from '../components/ui/plus'
import { DeleteIcon } from '../components/ui/delete'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'
import { SkeletonBlock } from '../components/Skeleton'

function formatDateTime(ts) {
  return new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Announcements() {
  const { company, profile } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [composing, setComposing] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', pinned: false })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('announcements')
      .select('id, title, body, pinned, created_at, author_profile_id, profiles(full_name, email)')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
    setItems(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openCompose() {
    setForm({ title: '', body: '', pinned: false })
    setComposing(true)
  }

  async function post() {
    if (!form.title.trim() || !form.body.trim() || !company) return
    setSaving(true)
    const { error } = await supabase.from('announcements').insert({
      company_id: company.id,
      author_profile_id: profile.id,
      title: form.title.trim(),
      body: form.body.trim(),
      pinned: form.pinned,
    })
    setSaving(false)
    if (error) {
      toast.error(error.message || 'Failed to post announcement')
      return
    }
    toast.success('Announcement posted')
    setComposing(false)
    load()
  }

  async function remove(id) {
    const { error } = await supabase.from('announcements').delete().eq('id', id)
    if (error) {
      toast.error(error.message || 'Failed to delete')
      return
    }
    setItems((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="page-inner" style={{ maxWidth: 760 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">COMPANY</p>
          <h1 className="page-title">Announcements</h1>
        </div>
        <button type="button" className="btn-primary" onClick={openCompose} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <PlusIcon size={15} />
          New announcement
        </button>
      </div>

      {loading ? (
        <SkeletonBlock rows={4} />
      ) : items.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>No announcements yet.</p>
        </div>
      ) : (
        <div className="feed-list">
          {items.map((a) => (
            <div key={a.id} className="feed-card">
              <div className="feed-card-head">
                <span className="feed-card-title">
                  {a.pinned && <span className="tab-count" style={{ marginRight: 8 }}>Pinned</span>}
                  {a.title}
                </span>
                {a.author_profile_id === profile?.id && (
                  <button type="button" className="link-button" aria-label="Delete" onClick={() => remove(a.id)}>
                    <DeleteIcon size={14} />
                  </button>
                )}
              </div>
              <p className="feed-card-body">{a.body}</p>
              <span className="feed-card-meta">
                {a.profiles?.full_name || a.profiles?.email || 'Someone'} · {formatDateTime(a.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}

      <Drawer open={composing} onClose={() => setComposing(false)} title="New announcement">
        <div className="drawer-form">
          <label className="field">
            <span>Title</span>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
          </label>
          <label className="field">
            <span>Message</span>
            <textarea rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
            Pin to top
          </label>
          <button
            type="button"
            className="btn-primary"
            disabled={saving || !form.title.trim() || !form.body.trim()}
            onClick={post}
            style={{ alignSelf: 'flex-start' }}
          >
            {saving ? 'Posting…' : 'Post announcement'}
          </button>
        </div>
      </Drawer>
    </div>
  )
}
