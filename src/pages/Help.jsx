import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { SkeletonBlock } from '../components/Skeleton'
import { renderMarkdown } from '../lib/markdown'
import { BookTextIcon } from '../components/ui/book-text'

function groupByCategory(cats, arts) {
  return (cats ?? [])
    .map((c) => ({ ...c, articles: (arts ?? []).filter((a) => a.category_id === c.id) }))
    .filter((c) => c.articles.length > 0)
}

function HelpSection({ title, categories, selectedArticleId, onSelectArticle }) {
  if (categories.length === 0) return null
  return (
    <div style={{ marginBottom: 22 }}>
      <p className="section-heading">{title}</p>
      {categories.map((c) => (
        <div key={c.id} style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13.5, margin: '4px 0' }}>
            <BookTextIcon size={14} /> {c.name}
          </div>
          {c.articles.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`tab-button${selectedArticleId === a.id ? ' active' : ''}`}
              style={{ display: 'block', width: '100%', textAlign: 'left', marginRight: 0, borderBottom: 'none', padding: '7px 6px', borderRadius: 'var(--radius)', fontSize: 13.5 }}
              onClick={() => onSelectArticle(a.id)}
            >
              {a.title}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

export default function Help() {
  const { company } = useAuth()
  const [globalCategories, setGlobalCategories] = useState([])
  const [companyCategories, setCompanyCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedArticleId, setSelectedArticleId] = useState(null)
  const [article, setArticle] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    // help_categories/help_articles.company_id is nullable -- null means
    // global PeopleBind-authored content, shared with every company, so
    // this needs an OR filter (not a plain eq) scoped server-side, rather
    // than fetching every company's rows and filtering client-side (which
    // still leaked every other company's category/article metadata over
    // the wire even though only global+own ever got displayed).
    const [{ data: cats }, { data: arts }] = await Promise.all([
      supabase.from('help_categories').select('id, name, sort_order, company_id').or(`company_id.eq.${company?.id},company_id.is.null`).order('sort_order').order('name'),
      supabase.from('help_articles').select('id, title, category_id, sort_order').or(`company_id.eq.${company?.id},company_id.is.null`).eq('status', 'published').order('sort_order').order('title'),
    ])

    const global = groupByCategory((cats ?? []).filter((c) => !c.company_id), arts)
    const own = groupByCategory((cats ?? []).filter((c) => c.company_id === company?.id), arts)

    setGlobalCategories(global)
    setCompanyCategories(own)

    const firstArticle = own[0]?.articles[0]?.id ?? global[0]?.articles[0]?.id ?? null
    if (firstArticle) setSelectedArticleId((prev) => prev ?? firstArticle)
    setLoading(false)
  }, [company?.id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!selectedArticleId) {
      setArticle(null)
      return
    }
    let active = true
    supabase.from('help_articles').select('id, title, body').eq('id', selectedArticleId).or(`company_id.eq.${company?.id},company_id.is.null`).eq('status', 'published').maybeSingle().then(({ data }) => {
      if (active) setArticle(data)
    })
    return () => { active = false }
  }, [selectedArticleId, company?.id])

  const hasAnyArticles = globalCategories.length > 0 || companyCategories.length > 0

  return (
    <div className="page-inner" style={{ maxWidth: 1100 }}>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Help &amp; Support</h1>
        </div>
      </div>

      {loading ? (
        <SkeletonBlock rows={5} />
      ) : !hasAnyArticles ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>No help articles published yet.</p>
          <p className="muted">Check back soon, or reach out via Support for help in the meantime.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24, marginTop: 12 }}>
          <nav>
            <HelpSection title={company ? `${company.name} Documentation` : 'Company Documentation'} categories={companyCategories} selectedArticleId={selectedArticleId} onSelectArticle={setSelectedArticleId} />
            <HelpSection title="PeopleBind Documentation" categories={globalCategories} selectedArticleId={selectedArticleId} onSelectArticle={setSelectedArticleId} />
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
