import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { PlusIcon } from '../components/ui/plus'
import { DeleteIcon } from '../components/ui/delete'
import { DownloadIcon } from '../components/ui/download'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'
import { SkeletonBlock } from '../components/Skeleton'

const ATTACHMENT_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,image/jpeg,image/png,image/webp'
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024

function formatDateTime(ts) {
  return new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function Announcements() {
  const { company, profile } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [composing, setComposing] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', pinned: false })
  const [attachFiles, setAttachFiles] = useState([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('announcements')
      .select('id, title, body, pinned, created_at, author_profile_id, profiles(full_name, email), announcement_attachments(id, file_path, file_name, file_size, content_type)')
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
    setAttachFiles([])
    setComposing(true)
  }

  function addFiles(fileList) {
    const incoming = Array.from(fileList)
    const oversized = incoming.find((f) => f.size > MAX_ATTACHMENT_BYTES)
    if (oversized) {
      toast.error(`${oversized.name} is over the 15MB limit`)
      return
    }
    setAttachFiles((prev) => [...prev, ...incoming])
  }

  function removeFile(index) {
    setAttachFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function post() {
    if (!form.title.trim() || !form.body.trim() || !company) return
    setSaving(true)

    const { data: inserted, error } = await supabase
      .from('announcements')
      .insert({
        company_id: company.id,
        author_profile_id: profile.id,
        title: form.title.trim(),
        body: form.body.trim(),
        pinned: form.pinned,
      })
      .select()
      .single()

    if (error) {
      setSaving(false)
      toast.error(error.message || 'Failed to post announcement')
      return
    }

    for (const file of attachFiles) {
      const path = `${company.id}/${inserted.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error: uploadError } = await supabase.storage.from('announcement-attachments').upload(path, file)
      if (uploadError) {
        toast.error(`Couldn't attach ${file.name}: ${uploadError.message}`)
        continue
      }
      await supabase.from('announcement_attachments').insert({
        announcement_id: inserted.id,
        company_id: company.id,
        file_path: path,
        file_name: file.name,
        file_size: file.size,
        content_type: file.type || null,
        uploaded_by: profile.id,
      })
    }

    setSaving(false)
    toast.success('Announcement posted')
    setComposing(false)
    load()
  }

  async function remove(announcement) {
    const paths = (announcement.announcement_attachments ?? []).map((a) => a.file_path)
    if (paths.length > 0) {
      await supabase.storage.from('announcement-attachments').remove(paths)
    }
    const { error } = await supabase.from('announcements').delete().eq('id', announcement.id)
    if (error) {
      toast.error(error.message || 'Failed to delete')
      return
    }
    setItems((prev) => prev.filter((a) => a.id !== announcement.id))
  }

  async function openAttachment(attachment) {
    const { data, error } = await supabase.storage.from('announcement-attachments').createSignedUrl(attachment.file_path, 60)
    if (error || !data) {
      toast.error("Couldn't open that file")
      return
    }
    window.open(data.signedUrl, '_blank')
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
                  <button type="button" className="link-button" aria-label="Delete" onClick={() => remove(a)}>
                    <DeleteIcon size={14} />
                  </button>
                )}
              </div>
              <p className="feed-card-body">{a.body}</p>

              {a.announcement_attachments?.length > 0 && (
                <div className="feed-attachments">
                  {a.announcement_attachments.map((att) => (
                    <button key={att.id} type="button" className="feed-attachment-chip" onClick={() => openAttachment(att)}>
                      <DownloadIcon size={12} />
                      {att.file_name}
                      {att.file_size ? <span className="feed-attachment-size">{formatBytes(att.file_size)}</span> : null}
                    </button>
                  ))}
                </div>
              )}

              <span className="feed-card-meta">
                {a.author_profile_id ? (a.profiles?.full_name || a.profiles?.email || 'Someone') : 'PeopleBind'} · {formatDateTime(a.created_at)}
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

          <label className="field">
            <span>Attachments</span>
            <input type="file" multiple accept={ATTACHMENT_ACCEPT} onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
          </label>
          <p className="muted" style={{ margin: 0 }}>PDF, Word, Excel, or image — up to 15MB each. Use this for supporting documents like govt notifications or company forms.</p>

          {attachFiles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {attachFiles.map((f, i) => (
                <div key={`${f.name}-${i}`} className="compose-attachment-row">
                  <span>{f.name} <span className="muted">({formatBytes(f.size)})</span></span>
                  <button type="button" className="link-button" aria-label="Remove file" onClick={() => removeFile(i)}>
                    <DeleteIcon size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

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
