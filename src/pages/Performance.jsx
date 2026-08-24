import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { PlusIcon } from '../components/ui/plus'
import { WaypointsIcon } from '../components/ui/waypoints'
import { StampIcon } from '../components/ui/stamp'
import { MessageSquareIcon } from '../components/ui/message-square'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'
import { SkeletonTable, SkeletonBlock } from '../components/Skeleton'
import { STANDARD_KPI_METRICS } from '../lib/kpiMetrics'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const EMPTY_GOAL = { employee_id: '', title: '', description: '', target_date: '', status: 'not_started' }
const EMPTY_REVIEW = { employee_id: '', review_cycle_id: '', reviewer_id: '', overall_rating: '', comments: '' }
const EMPTY_CYCLE = { name: '', cycle_start: '', cycle_end: '' }
const EMPTY_NOTE = { employee_id: '', note: '' }

export default function Performance() {
  const { profile, company } = useAuth()
  const [tab, setTab] = useState('goals')
  const [employees, setEmployees] = useState([])

  const loadEmployees = useCallback(async () => {
    const { data } = await supabase.from('employees').select('id, employee_code, full_name').in('employment_status', ['training', 'probation', 'confirmed']).order('full_name')
    setEmployees(data ?? [])
  }, [])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  return (
    <div className="page-inner" style={{ maxWidth: 1000 }}>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Performance</h1>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-button${tab === 'goals' ? ' active' : ''}`} onClick={() => setTab('goals')}><WaypointsIcon size={15} /> Goals</button>
        <button className={`tab-button${tab === 'reviews' ? ' active' : ''}`} onClick={() => setTab('reviews')}><StampIcon size={15} /> Reviews</button>
        <button className={`tab-button${tab === 'feedback' ? ' active' : ''}`} onClick={() => setTab('feedback')}><MessageSquareIcon size={15} /> Feedback</button>
      </div>

      {tab === 'goals' && <GoalsTab employees={employees} profile={profile} company={company} />}
      {tab === 'reviews' && <ReviewsTab employees={employees} profile={profile} company={company} />}
      {tab === 'feedback' && <FeedbackTab employees={employees} profile={profile} company={company} />}
    </div>
  )
}

/* =========================== GOALS =========================== */

function GoalsTab({ employees, profile, company }) {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_GOAL)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('goals')
      .select('id, employee_id, title, description, target_date, status, employees(full_name, employee_code)')
      .order('target_date', { ascending: true, nullsFirst: false })
    setGoals(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openNew() {
    setEditingId(null)
    setForm(EMPTY_GOAL)
    setError(null)
    setDrawerOpen(true)
  }

  function openEdit(goal) {
    setEditingId(goal.id)
    setForm({
      employee_id: goal.employee_id,
      title: goal.title,
      description: goal.description || '',
      target_date: goal.target_date || '',
      status: goal.status,
    })
    setError(null)
    setDrawerOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const payload = {
      employee_id: form.employee_id,
      title: form.title,
      description: form.description || null,
      target_date: form.target_date || null,
      status: form.status,
    }

    const { error: saveError } = editingId
      ? await supabase.from('goals').update(payload).eq('id', editingId)
      : await supabase.from('goals').insert({ ...payload, company_id: company.id, created_by: profile.id })

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      toast.error(saveError.message || 'Something went wrong')
      return
    }

    toast.success(editingId ? 'Goal updated' : 'Goal created')
    setDrawerOpen(false)
    load()
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
        <button className="btn-primary btn-icon" onClick={openNew}>
          <PlusIcon size={16} /> New goal
        </button>
      </div>

      {loading ? (
        <SkeletonTable rows={5} columns={4} />
      ) : goals.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>No goals yet.</p>
          <p className="muted">Set a goal for an employee to start tracking progress.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Goal</th>
              <th>Target date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {goals.map((g) => (
              <tr key={g.id} onClick={() => openEdit(g)}>
                <td>
                  {g.employees?.full_name}
                  <span className="mono" style={{ display: 'block', color: 'var(--ink-soft)', fontSize: 12 }}>
                    {g.employees?.employee_code}
                  </span>
                </td>
                <td>{g.title}</td>
                <td className="mono">{formatDate(g.target_date)}</td>
                <td><span className={`status-badge status-${g.status === 'completed' ? 'approved' : g.status === 'cancelled' ? 'rejected' : 'pending'}`}>{g.status.replace('_', ' ')}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editingId ? 'Edit goal' : 'New goal'}>
        <form onSubmit={handleSubmit} className="drawer-form">
          <label className="field">
            <span>Employee</span>
            <select required value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
              <option value="">— Select —</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Title</span>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>

          <label className="field">
            <span>Description</span>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Target date</span>
              <input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
            </label>
            <label className="field">
              <span>Status</span>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="not_started">Not started</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
          </div>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={14} className="btn-spinner" />}
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create goal'}
          </button>
        </form>
      </Drawer>
    </>
  )
}

/* =========================== REVIEWS =========================== */

function ReviewsTab({ employees, profile, company }) {
  const [cycles, setCycles] = useState([])
  const [profiles, setProfiles] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCycleId, setActiveCycleId] = useState('all')

  const [cycleDrawerOpen, setCycleDrawerOpen] = useState(false)
  const [cycleForm, setCycleForm] = useState(EMPTY_CYCLE)
  const [cycleSaving, setCycleSaving] = useState(false)
  const [cycleError, setCycleError] = useState(null)

  const [kpiCatalog, setKpiCatalog] = useState([])
  const [kpiDrawerOpen, setKpiDrawerOpen] = useState(false)
  const [managingCycle, setManagingCycle] = useState(null)
  const [selectedKpiIds, setSelectedKpiIds] = useState(new Set())
  const [weightOverrides, setWeightOverrides] = useState({})
  const [kpiSaving, setKpiSaving] = useState(false)

  const [reviewDrawerOpen, setReviewDrawerOpen] = useState(false)
  const [editingReview, setEditingReview] = useState(null)
  const [reviewForm, setReviewForm] = useState(EMPTY_REVIEW)
  const [reviewSaving, setReviewSaving] = useState(false)
  const [reviewError, setReviewError] = useState(null)

  const [cycleKpis, setCycleKpis] = useState([])
  const [kpiScores, setKpiScores] = useState({})
  const [computing, setComputing] = useState({})
  const [savingScores, setSavingScores] = useState(false)

  const loadLookups = useCallback(async () => {
    const [{ data: cycleRows }, { data: profileRows }, { data: kpiRows }] = await Promise.all([
      supabase.from('review_cycles').select('id, name, cycle_start, cycle_end, status').order('cycle_start', { ascending: false }),
      supabase.from('profiles').select('id, full_name, email'),
      supabase.from('kpi_definitions').select('id, name, kpi_type, metric_key, weight').eq('status', 'active').order('kpi_type').order('name'),
    ])
    setCycles(cycleRows ?? [])
    setProfiles(profileRows ?? [])
    setKpiCatalog(kpiRows ?? [])
  }, [])

  const loadReviews = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('performance_reviews')
      .select('id, employee_id, overall_rating, comments, status, submitted_at, acknowledged_at, reviewer_id, review_cycle_id, employees(full_name, employee_code), review_cycles(name)')
      .order('created_at', { ascending: false })
    if (activeCycleId !== 'all') query = query.eq('review_cycle_id', activeCycleId)
    const { data } = await query
    setReviews(data ?? [])
    setLoading(false)
  }, [activeCycleId])

  useEffect(() => {
    loadLookups()
  }, [loadLookups])

  useEffect(() => {
    loadReviews()
  }, [loadReviews])

  function openNewCycle() {
    setCycleForm(EMPTY_CYCLE)
    setCycleError(null)
    setCycleDrawerOpen(true)
  }

  async function handleCycleSubmit(e) {
    e.preventDefault()
    setCycleError(null)
    setCycleSaving(true)
    const { error: saveError } = await supabase.from('review_cycles').insert({
      company_id: company.id,
      name: cycleForm.name,
      cycle_start: cycleForm.cycle_start,
      cycle_end: cycleForm.cycle_end,
    })
    setCycleSaving(false)
    if (saveError) {
      setCycleError(saveError.message)
      toast.error(saveError.message || 'Something went wrong')
      return
    }
    toast.success('Review cycle created')
    setCycleDrawerOpen(false)
    loadLookups()
  }

  async function openManageKpis(cycle) {
    setManagingCycle(cycle)
    const { data } = await supabase.from('review_cycle_kpis').select('kpi_definition_id, weight_override').eq('review_cycle_id', cycle.id)
    setSelectedKpiIds(new Set((data ?? []).map((r) => r.kpi_definition_id)))
    const overrides = {}
    for (const r of data ?? []) if (r.weight_override != null) overrides[r.kpi_definition_id] = String(r.weight_override)
    setWeightOverrides(overrides)
    setKpiDrawerOpen(true)
  }

  function toggleKpi(id) {
    setSelectedKpiIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleKpiSave() {
    setKpiSaving(true)
    await supabase.from('review_cycle_kpis').delete().eq('review_cycle_id', managingCycle.id)
    const rows = [...selectedKpiIds].map((kpi_definition_id) => ({
      company_id: company.id,
      review_cycle_id: managingCycle.id,
      kpi_definition_id,
      weight_override: weightOverrides[kpi_definition_id] ? Number(weightOverrides[kpi_definition_id]) : null,
    }))
    const { error: saveError } = rows.length > 0 ? await supabase.from('review_cycle_kpis').insert(rows) : { error: null }
    setKpiSaving(false)
    if (saveError) {
      toast.error(saveError.message || 'Failed to save KPI selection')
      return
    }
    toast.success('KPI selection saved')
    setKpiDrawerOpen(false)
  }

  const loadScorecard = useCallback(async (cycleId, reviewId) => {
    if (!cycleId) {
      setCycleKpis([])
      setKpiScores({})
      return
    }
    const { data: ckRows } = await supabase
      .from('review_cycle_kpis')
      .select('id, weight_override, kpi_definitions(id, name, kpi_type, metric_key, weight)')
      .eq('review_cycle_id', cycleId)
      .order('sort_order')
    setCycleKpis(ckRows ?? [])

    if (reviewId) {
      const { data: scoreRows } = await supabase
        .from('performance_review_kpi_scores')
        .select('kpi_definition_id, score, computed_value, notes')
        .eq('performance_review_id', reviewId)
      const map = {}
      for (const s of scoreRows ?? []) map[s.kpi_definition_id] = { score: s.score, computed_value: s.computed_value, notes: s.notes || '' }
      setKpiScores(map)
    } else {
      setKpiScores({})
    }
  }, [])

  useEffect(() => {
    if (reviewDrawerOpen) loadScorecard(reviewForm.review_cycle_id, editingReview?.id)
  }, [reviewDrawerOpen, reviewForm.review_cycle_id, editingReview?.id, loadScorecard])

  async function computeStandardKpi(kpiDef) {
    const cycle = cycles.find((c) => c.id === reviewForm.review_cycle_id)
    if (!cycle || !reviewForm.employee_id) return
    setComputing((p) => ({ ...p, [kpiDef.id]: true }))
    const metric = STANDARD_KPI_METRICS[kpiDef.metric_key]
    const rawValue = metric ? await metric.fetch(reviewForm.employee_id, cycle.cycle_start, cycle.cycle_end) : null
    const score = metric ? metric.normalize(rawValue) : null
    setComputing((p) => ({ ...p, [kpiDef.id]: false }))
    setKpiScores((prev) => ({ ...prev, [kpiDef.id]: { score: score ?? '', computed_value: rawValue, notes: prev[kpiDef.id]?.notes || '' } }))
  }

  function setScoreValue(kpiId, score) {
    setKpiScores((prev) => ({ ...prev, [kpiId]: { ...prev[kpiId], score } }))
  }

  function setScoreNotes(kpiId, notes) {
    setKpiScores((prev) => ({ ...prev, [kpiId]: { ...prev[kpiId], notes } }))
  }

  async function saveScorecard() {
    if (!editingReview) return
    setSavingScores(true)
    const rows = Object.entries(kpiScores)
      .filter(([, v]) => v.score !== '' && v.score != null)
      .map(([kpi_definition_id, v]) => ({
        company_id: company.id,
        performance_review_id: editingReview.id,
        kpi_definition_id,
        score: Number(v.score),
        computed_value: v.computed_value ?? null,
        notes: v.notes || null,
      }))
    if (rows.length === 0) {
      setSavingScores(false)
      return
    }
    const { error: saveError } = await supabase.from('performance_review_kpi_scores').upsert(rows, { onConflict: 'performance_review_id,kpi_definition_id' })
    setSavingScores(false)
    if (saveError) {
      toast.error(saveError.message || 'Failed to save KPI scores')
      return
    }
    toast.success('KPI scores saved')
    loadReviews()
    const { data: refreshed } = await supabase.from('performance_reviews').select('overall_rating').eq('id', editingReview.id).single()
    if (refreshed) setReviewForm((prev) => ({ ...prev, overall_rating: refreshed.overall_rating ?? '' }))
  }

  function openNewReview() {
    setEditingReview(null)
    setReviewForm({ ...EMPTY_REVIEW, reviewer_id: profile.id, review_cycle_id: activeCycleId !== 'all' ? activeCycleId : '' })
    setReviewError(null)
    setReviewDrawerOpen(true)
  }

  function openEditReview(review) {
    setEditingReview(review)
    setReviewForm({
      employee_id: review.employee_id,
      review_cycle_id: review.review_cycle_id || '',
      reviewer_id: review.reviewer_id || profile.id,
      overall_rating: review.overall_rating ?? '',
      comments: review.comments || '',
    })
    setReviewError(null)
    setReviewDrawerOpen(true)
  }

  async function handleReviewSubmit(e) {
    e.preventDefault()
    setReviewError(null)
    setReviewSaving(true)

    const payload = {
      employee_id: reviewForm.employee_id,
      review_cycle_id: reviewForm.review_cycle_id || null,
      reviewer_id: reviewForm.reviewer_id || null,
      overall_rating: reviewForm.overall_rating ? Number(reviewForm.overall_rating) : null,
      comments: reviewForm.comments || null,
    }

    if (editingReview) {
      const { error: saveError } = await supabase.from('performance_reviews').update(payload).eq('id', editingReview.id)
      setReviewSaving(false)
      if (saveError) {
        setReviewError(saveError.message)
        toast.error(saveError.message || 'Something went wrong')
        return
      }
      toast.success('Review updated')
      loadReviews()
      return
    }

    const { data: inserted, error: saveError } = await supabase.from('performance_reviews').insert({ ...payload, company_id: company.id }).select().single()
    setReviewSaving(false)

    if (saveError) {
      setReviewError(saveError.message)
      toast.error(saveError.message || 'Something went wrong')
      return
    }

    toast.success('Review draft created')
    loadReviews()
    // stay open, now in edit mode, so a cycle with attached KPIs can be scored immediately
    setEditingReview(inserted)
  }

  async function setReviewStatus(id, status) {
    const patch = { status }
    if (status === 'submitted') patch.submitted_at = new Date().toISOString()
    if (status === 'acknowledged') patch.acknowledged_at = new Date().toISOString()
    await supabase.from('performance_reviews').update(patch).eq('id', id)
    toast.success(status === 'submitted' ? 'Review submitted' : 'Review acknowledged')
    loadReviews()
  }

  const hasKpiScores = Object.keys(kpiScores).length > 0

  return (
    <>
      <div className="field-row" style={{ alignItems: 'flex-end', gap: 12, marginBottom: 4 }}>
        <label className="field" style={{ maxWidth: 240 }}>
          <span>Cycle</span>
          <select value={activeCycleId} onChange={(e) => setActiveCycleId(e.target.value)}>
            <option value="all">All cycles</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <button className="link-button" onClick={openNewCycle} style={{ marginBottom: 10 }}>+ New cycle</button>
        <div style={{ flex: 1 }} />
        <button className="btn-primary btn-icon" onClick={openNewReview} style={{ marginBottom: 2 }}>
          <PlusIcon size={16} /> New review
        </button>
      </div>

      {cycles.length > 0 && (
        <div className="report-section" style={{ marginBottom: 20 }}>
          <p className="section-heading">Review cycles</p>
          <table className="data-table">
            <thead><tr><th>Name</th><th>Dates</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {cycles.map((c) => (
                <tr key={c.id} style={{ cursor: 'default' }}>
                  <td>{c.name}</td>
                  <td className="mono">{formatDate(c.cycle_start)} – {formatDate(c.cycle_end)}</td>
                  <td><span className="status-badge">{c.status}</span></td>
                  <td><button className="link-button" onClick={() => openManageKpis(c)}>Manage KPIs</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={5} columns={6} />
      ) : reviews.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>No reviews yet.</p>
          <p className="muted">Drafts stay private to the reviewer until submitted.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Cycle</th>
              <th>Reviewer</th>
              <th>Rating</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id} onClick={() => openEditReview(r)}>
                <td>
                  {r.employees?.full_name}
                  <span className="mono" style={{ display: 'block', color: 'var(--ink-soft)', fontSize: 12 }}>
                    {r.employees?.employee_code}
                  </span>
                </td>
                <td>{r.review_cycles?.name ?? '—'}</td>
                <td>{profiles.find((p) => p.id === r.reviewer_id)?.full_name ?? '—'}</td>
                <td className="mono">{r.overall_rating ? `${r.overall_rating}/5` : '—'}</td>
                <td><span className={`status-badge status-${r.status === 'acknowledged' ? 'approved' : r.status === 'submitted' ? 'pending' : ''}`}>{r.status}</span></td>
                <td onClick={(e) => e.stopPropagation()}>
                  {r.status === 'draft' && (
                    <button className="link-button" onClick={() => setReviewStatus(r.id, 'submitted')}>Submit</button>
                  )}
                  {r.status === 'submitted' && (
                    <button className="link-button" onClick={() => setReviewStatus(r.id, 'acknowledged')}>Mark acknowledged</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Drawer open={cycleDrawerOpen} onClose={() => setCycleDrawerOpen(false)} title="New review cycle">
        <form onSubmit={handleCycleSubmit} className="drawer-form">
          <label className="field">
            <span>Name</span>
            <input required placeholder="e.g. 2026 Mid-Year" value={cycleForm.name} onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })} />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Start</span>
              <input type="date" required value={cycleForm.cycle_start} onChange={(e) => setCycleForm({ ...cycleForm, cycle_start: e.target.value })} />
            </label>
            <label className="field">
              <span>End</span>
              <input type="date" required min={cycleForm.cycle_start} value={cycleForm.cycle_end} onChange={(e) => setCycleForm({ ...cycleForm, cycle_end: e.target.value })} />
            </label>
          </div>
          {cycleError && <p className="field-error">{cycleError}</p>}
          <button type="submit" className="btn-primary" disabled={cycleSaving}>
            {cycleSaving && <Loader2 size={14} className="btn-spinner" />}
            {cycleSaving ? 'Creating…' : 'Create cycle'}
          </button>
        </form>
      </Drawer>

      <Drawer open={kpiDrawerOpen} onClose={() => setKpiDrawerOpen(false)} title={`Manage KPIs · ${managingCycle?.name ?? ''}`}>
        <div className="drawer-form">
          <p className="muted" style={{ margin: 0 }}>
            Pick which KPIs apply to this cycle. Reviewers score against these when reviewing an employee in this cycle.
          </p>

          {kpiCatalog.length === 0 ? (
            <p className="muted">No KPIs in the catalog yet — add some in Settings → Performance.</p>
          ) : (
            <>
              <p className="section-heading" style={{ marginBottom: 4 }}>Standard</p>
              {kpiCatalog.filter((k) => k.kpi_type === 'standard').map((k) => (
                <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <input type="checkbox" checked={selectedKpiIds.has(k.id)} onChange={() => toggleKpi(k.id)} />
                  <span style={{ flex: 1, fontSize: 13.5 }}>{k.name}</span>
                  {selectedKpiIds.has(k.id) && (
                    <input
                      type="number" min="0.01" step="0.01" placeholder={String(k.weight)} style={{ width: 70 }}
                      value={weightOverrides[k.id] ?? ''}
                      onChange={(e) => setWeightOverrides({ ...weightOverrides, [k.id]: e.target.value })}
                    />
                  )}
                </div>
              ))}

              <p className="section-heading" style={{ marginBottom: 4, marginTop: 12 }}>Custom</p>
              {kpiCatalog.filter((k) => k.kpi_type === 'custom').length === 0 ? (
                <p className="muted" style={{ fontSize: 12 }}>No custom KPIs yet.</p>
              ) : (
                kpiCatalog.filter((k) => k.kpi_type === 'custom').map((k) => (
                  <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <input type="checkbox" checked={selectedKpiIds.has(k.id)} onChange={() => toggleKpi(k.id)} />
                    <span style={{ flex: 1, fontSize: 13.5 }}>{k.name}</span>
                    {selectedKpiIds.has(k.id) && (
                      <input
                        type="number" min="0.01" step="0.01" placeholder={String(k.weight)} style={{ width: 70 }}
                        value={weightOverrides[k.id] ?? ''}
                        onChange={(e) => setWeightOverrides({ ...weightOverrides, [k.id]: e.target.value })}
                      />
                    )}
                  </div>
                ))
              )}
            </>
          )}

          <button type="button" className="btn-primary" disabled={kpiSaving} onClick={handleKpiSave} style={{ alignSelf: 'flex-start' }}>
            {kpiSaving && <Loader2 size={14} className="btn-spinner" />}
            {kpiSaving ? 'Saving…' : 'Save KPI selection'}
          </button>
        </div>
      </Drawer>

      <Drawer open={reviewDrawerOpen} onClose={() => setReviewDrawerOpen(false)} title={editingReview ? 'Edit review' : 'New review'} wide>
        <form onSubmit={handleReviewSubmit} className="drawer-form">
          <label className="field">
            <span>Employee</span>
            <select required disabled={!!editingReview} value={reviewForm.employee_id} onChange={(e) => setReviewForm({ ...reviewForm, employee_id: e.target.value })}>
              <option value="">— Select —</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
          </label>

          <div className="field-row">
            <label className="field">
              <span>Cycle</span>
              <select value={reviewForm.review_cycle_id} onChange={(e) => setReviewForm({ ...reviewForm, review_cycle_id: e.target.value })}>
                <option value="">—</option>
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Reviewer</span>
              <select value={reviewForm.reviewer_id} onChange={(e) => setReviewForm({ ...reviewForm, reviewer_id: e.target.value })}>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                ))}
              </select>
            </label>
          </div>

          {editingReview && cycleKpis.length > 0 && (
            <div className="report-section" style={{ marginBottom: 0 }}>
              <p className="section-heading">KPI scorecard</p>
              <table className="data-table">
                <thead><tr><th>KPI</th><th>Score (1–5)</th><th>Notes</th></tr></thead>
                <tbody>
                  {cycleKpis.map((ck) => {
                    const kpi = ck.kpi_definitions
                    const current = kpiScores[kpi.id] || {}
                    return (
                      <tr key={kpi.id} style={{ cursor: 'default' }}>
                        <td>
                          {kpi.name}
                          {kpi.kpi_type === 'standard' && (
                            <span className="muted" style={{ display: 'block', fontSize: 11 }}>
                              {current.computed_value != null
                                ? `Computed: ${Math.round(current.computed_value * 100)}%`
                                : (
                                  <button type="button" className="link-button" style={{ fontSize: 11 }} disabled={computing[kpi.id]} onClick={() => computeStandardKpi(kpi)}>
                                    {computing[kpi.id] ? 'Computing…' : 'Compute from data'}
                                  </button>
                                )}
                            </span>
                          )}
                        </td>
                        <td>
                          <input
                            type="number" min="1" max="5" step="0.1" style={{ width: 70 }}
                            value={current.score ?? ''}
                            onChange={(e) => setScoreValue(kpi.id, e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            style={{ fontSize: 12.5 }}
                            value={current.notes ?? ''}
                            placeholder="Optional"
                            onChange={(e) => setScoreNotes(kpi.id, e.target.value)}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <button type="button" className="btn-secondary" disabled={savingScores} onClick={saveScorecard} style={{ marginTop: 10 }}>
                {savingScores && <Loader2 size={14} className="btn-spinner" />}
                {savingScores ? 'Saving…' : 'Save KPI scores'}
              </button>
            </div>
          )}

          <label className="field">
            <span>Overall rating (1–5){hasKpiScores ? ' (computed from KPI scores)' : ''}</span>
            <input
              type="number" min="1" max="5" step="0.01" disabled={hasKpiScores}
              value={reviewForm.overall_rating}
              onChange={(e) => setReviewForm({ ...reviewForm, overall_rating: e.target.value })}
            />
          </label>

          <label className="field">
            <span>Comments</span>
            <input value={reviewForm.comments} onChange={(e) => setReviewForm({ ...reviewForm, comments: e.target.value })} placeholder="Optional" />
          </label>

          <p className="muted" style={{ margin: 0 }}>
            Saved as a draft — visible only to the reviewer until it's submitted.
          </p>

          {reviewError && <p className="field-error">{reviewError}</p>}

          <button type="submit" className="btn-primary" disabled={reviewSaving}>
            {reviewSaving && <Loader2 size={14} className="btn-spinner" />}
            {reviewSaving ? 'Saving…' : editingReview ? 'Save changes' : 'Create draft review'}
          </button>
        </form>
      </Drawer>
    </>
  )
}

/* =========================== FEEDBACK =========================== */

function FeedbackTab({ employees, profile, company }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_NOTE)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('feedback_notes')
      .select('id, note, created_at, employees(full_name, employee_code), given_by')
      .order('created_at', { ascending: false })
      .limit(200)
    setNotes(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openNew() {
    setForm(EMPTY_NOTE)
    setError(null)
    setDrawerOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const { error: saveError } = await supabase.from('feedback_notes').insert({
      company_id: company.id,
      employee_id: form.employee_id,
      note: form.note,
      given_by: profile.id,
    })
    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      toast.error(saveError.message || 'Something went wrong')
      return
    }
    toast.success('Feedback note added')
    setDrawerOpen(false)
    load()
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
        <button className="btn-primary btn-icon" onClick={openNew}>
          <PlusIcon size={16} /> Add note
        </button>
      </div>

      {loading ? (
        <SkeletonBlock rows={4} />
      ) : notes.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>No feedback notes yet.</p>
          <p className="muted">Quick, informal notes for an employee's ongoing record — separate from formal reviews.</p>
        </div>
      ) : (
        notes.map((n) => (
          <div key={n.id} className="mini-card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{n.employees?.full_name}</strong>
              <span className="muted mono" style={{ fontSize: 12 }}>{formatDateTime(n.created_at)}</span>
            </div>
            <p style={{ margin: 0 }}>{n.note}</p>
          </div>
        ))
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Add feedback note">
        <form onSubmit={handleSubmit} className="drawer-form">
          <label className="field">
            <span>Employee</span>
            <select required value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
              <option value="">— Select —</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Note</span>
            <input required value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </label>
          {error && <p className="field-error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={14} className="btn-spinner" />}
            {saving ? 'Saving…' : 'Add note'}
          </button>
        </form>
      </Drawer>
    </>
  )
}
