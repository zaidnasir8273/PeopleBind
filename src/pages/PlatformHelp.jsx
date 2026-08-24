import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { PlusIcon } from '../components/ui/plus'
import { DeleteIcon } from '../components/ui/delete'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'
import { SkeletonBlock } from '../components/Skeleton'
import { renderMarkdown } from '../lib/markdown'

const EMPTY_ARTICLE = { title: '', body: '', status: 'draft' }

function formatDateTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function PlatformHelp() {
  const { profile } = useAuth()
  const [categories, setCategories] = useState([])
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)

  const [newCategoryName, setNewCategoryName] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)

  const [articleDrawerOpen, setArticleDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_ARTICLE)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const loadCategories = useCallback(async () => {
    const { data } = await supabase.from('help_categories').select('id, name, sort_order').order('sort_order').order('name')
    setCategories(data ?? [])
    if (data && data.length > 0) setSelectedCategoryId((prev) => prev ?? data[0].id)
  }, [])

  const loadArticles = useCallback(async () => {
    if (!selectedCategoryId) {
      setArticles([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase.from('help_articles').select('id, title, status, updated_at').eq('category_id', selectedCategoryId).order('sort_order').order('title')
    setArticles(data ?? [])
    setLoading(false)
  }, [selectedCategoryId])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  useEffect(() => {
    loadArticles()
  }, [loadArticles])

  async function addCategory() {
    if (!newCategoryName.trim()) return
    setAddingCategory(true)
    const { data, error: saveError } = await supabase.from('help_categories').insert({ name: newCategoryName.trim(), created_by: profile.id }).select().single()
    setAddingCategory(false)
    if (saveError) {
      toast.error(saveError.message)
      return
    }
    toast.success('Category added')
    setNewCategoryName('')
    await loadCategories()
    setSelectedCategoryId(data.id)
  }

  async function removeCategory(id) {
    const { error: removeError } = await supabase.from('help_categories').delete().eq('id', id)
    if (removeError) {
      if (removeError.code === '23503') {
        toast.error("Can't remove — this category still has articles in it.")
      } else {
        toast.error(removeError.message || 'Failed to remove')
      }
      return
    }
    toast.success('Category removed')
    if (selectedCategoryId === id) setSelectedCategoryId(null)
    loadCategories()
  }

  function openNewArticle() {
    setEditingId(null)
    setForm(EMPTY_ARTICLE)
    setError(null)
    setArticleDrawerOpen(true)
  }

  function openEditArticle(article) {
    setEditingId(article.id)
    supabase.from('help_articles').select('title, body, status').eq('id', article.id).single().then(({ data }) => {
      if (data) setForm(data)
    })
    setError(null)
    setArticleDrawerOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const payload = {
      title: form.title,
      body: form.body,
      status: form.status,
      category_id: selectedCategoryId,
    }

    const { error: saveError } = editingId
      ? await supabase.from('help_articles').update(payload).eq('id', editingId)
      : await supabase.from('help_articles').insert({ ...payload, created_by: profile.id })

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      toast.error(saveError.message || 'Something went wrong')
      return
    }

    toast.success(editingId ? 'Article updated' : 'Article created')
    setArticleDrawerOpen(false)
    loadArticles()
  }

  async function removeArticle(id) {
    const { error: removeError } = await supabase.from('help_articles').delete().eq('id', id)
    if (removeError) {
      toast.error(removeError.message || 'Failed to remove')
      return
    }
    toast.success('Article removed')
    loadArticles()
  }

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId)

  return (
    <div className="page-inner" style={{ maxWidth: 1100 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">PLATFORM ADMIN</p>
          <h1 className="page-title">Documentation</h1>
        </div>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        This is PeopleBind's official documentation — visible to every company's users, and used to ground the AI
        support agent's answers. Only published articles are shown to users or used by the AI.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, marginTop: 20 }}>
        <div>
          <p className="section-heading">Categories</p>
          {categories.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                className={`tab-button${selectedCategoryId === c.id ? ' active' : ''}`}
                style={{ display: 'block', width: '100%', textAlign: 'left', marginRight: 0, borderBottom: 'none', padding: '8px 6px', borderRadius: 'var(--radius)' }}
                onClick={() => setSelectedCategoryId(c.id)}
              >
                {c.name}
              </button>
              <button className="link-button" aria-label="Remove category" onClick={() => removeCategory(c.id)}>
                <DeleteIcon size={13} />
              </button>
            </div>
          ))}
          <div className="lookup-add">
            <input placeholder="New category" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCategory()} />
            <button type="button" className="lookup-add-btn" disabled={addingCategory} onClick={addCategory} aria-label="Add category">
              <PlusIcon size={15} />
            </button>
          </div>
        </div>

        <div>
          {!selectedCategory ? (
            <div className="empty-state" style={{ marginTop: 20 }}>
              <p>No category selected.</p>
              <p className="muted">Add a category on the left to start writing articles.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                <button className="btn-primary btn-icon" onClick={openNewArticle}>
                  <PlusIcon size={16} /> New article
                </button>
              </div>

              {loading ? (
                <SkeletonBlock rows={4} />
              ) : articles.length === 0 ? (
                <div className="empty-state" style={{ marginTop: 20 }}>
                  <p>No articles in {selectedCategory.name} yet.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead><tr><th>Title</th><th>Status</th><th>Updated</th><th></th></tr></thead>
                  <tbody>
                    {articles.map((a) => (
                      <tr key={a.id} onClick={() => openEditArticle(a)}>
                        <td>{a.title}</td>
                        <td><span className={`status-badge status-${a.status === 'published' ? 'approved' : 'pending'}`}>{a.status}</span></td>
                        <td className="mono">{formatDateTime(a.updated_at)}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button className="btn-icon-round reject" onClick={() => removeArticle(a.id)} aria-label="Remove">
                            <DeleteIcon size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>

      <Drawer open={articleDrawerOpen} onClose={() => setArticleDrawerOpen(false)} title={editingId ? 'Edit article' : 'New article'} wide>
        <form onSubmit={handleSubmit} className="drawer-form">
          <label className="field">
            <span>Title</span>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Status</span>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <label className="field">
              <span>Body (Markdown)</span>
              <textarea rows={16} className="mono" style={{ fontSize: 13 }} required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </label>
            <div className="field">
              <span>Preview</span>
              <div className="report-section" style={{ marginBottom: 0, maxHeight: 380, overflowY: 'auto' }}>
                {renderMarkdown(form.body)}
              </div>
            </div>
          </div>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={saving} style={{ alignSelf: 'flex-start' }}>
            {saving && <Loader2 size={14} className="btn-spinner" />}
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create article'}
          </button>
        </form>
      </Drawer>
    </div>
  )
}
