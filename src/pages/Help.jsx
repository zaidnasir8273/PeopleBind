import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { SkeletonBlock } from '../components/Skeleton'
import { renderMarkdown } from '../lib/markdown'
import { BookTextIcon } from '../components/ui/book-text'

export default function Help() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedArticleId, setSelectedArticleId] = useState(null)
  const [article, setArticle] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: cats } = await supabase.from('help_categories').select('id, name, sort_order').order('sort_order').order('name')
    const { data: arts } = await supabase.from('help_articles').select('id, title, category_id, sort_order').eq('status', 'published').order('sort_order').order('title')
    const withArticles = (cats ?? [])
      .map((c) => ({ ...c, articles: (arts ?? []).filter((a) => a.category_id === c.id) }))
      .filter((c) => c.articles.length > 0)
    setCategories(withArticles)
    if (withArticles.length > 0 && withArticles[0].articles.length > 0) {
      setSelectedArticleId((prev) => prev ?? withArticles[0].articles[0].id)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!selectedArticleId) {
      setArticle(null)
      return
    }
    let active = true
    supabase.from('help_articles').select('id, title, body').eq('id', selectedArticleId).eq('status', 'published').maybeSingle().then(({ data }) => {
      if (active) setArticle(data)
    })
    return () => { active = false }
  }, [selectedArticleId])

  return (
    <div className="page-inner" style={{ maxWidth: 1100 }}>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Help &amp; Support</h1>
        </div>
      </div>

      {loading ? (
        <SkeletonBlock rows={5} />
      ) : categories.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>No help articles published yet.</p>
          <p className="muted">Check back soon, or reach out via Support for help in the meantime.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24, marginTop: 12 }}>
          <nav>
            {categories.map((c) => (
              <div key={c.id} style={{ marginBottom: 18 }}>
                <p className="section-heading" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BookTextIcon size={14} /> {c.name}
                </p>
                {c.articles.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={`tab-button${selectedArticleId === a.id ? ' active' : ''}`}
                    style={{ display: 'block', width: '100%', textAlign: 'left', marginRight: 0, borderBottom: 'none', padding: '7px 6px', borderRadius: 'var(--radius)', fontSize: 13.5 }}
                    onClick={() => setSelectedArticleId(a.id)}
                  >
                    {a.title}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <div className="report-section" style={{ marginBottom: 0 }}>
            {!article ? (
              <p className="muted">Select an article to read it.</p>
            ) : (
              <>
                <h2 style={{ marginTop: 0 }}>{article.title}</h2>
                {renderMarkdown(article.body)}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
