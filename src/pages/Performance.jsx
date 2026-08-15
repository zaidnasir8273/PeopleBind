import { useEffect, useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'

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
    const { data } = await supabase.from('employees').select('id, employee_code, full_name').eq('employment_status', 'active').order('full_name')
    setEmployees(data ?? [])
  }, [])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  return (
    <div className="page-inner" style={{ maxWidth: 1000 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">PERFORMANCE</p>
          <h1 className="page-title">Performance</h1>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-button${tab === 'goals' ? ' active' : ''}`} onClick={() => setTab('goals')}>Goals</button>
        <button className={`tab-button${tab === 'reviews' ? ' active' : ''}`} onClick={() => setTab('reviews')}>Reviews</button>
        <button className={`tab-button${tab === 'feedback' ? ' active' : ''}`} onClick={() => setTab('feedback')}>Feedback</button>
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
      return
    }

    setDrawerOpen(false)
    load()
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
        <button className="btn-primary btn-icon" onClick={openNew}>
          <Plus size={16} /> New goal
        </button>
      </div>

      {loading ? (
        <p className="muted" style={{ marginTop: 20 }}>Loading…</p>
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

  const [reviewDrawerOpen, setReviewDrawerOpen] = useState(false)
  const [editingReview, setEditingReview] = useState(null)
  const [reviewForm, setReviewForm] = useState(EMPTY_REVIEW)
  const [reviewSaving, setReviewSaving] = useState(false)
  const [reviewError, setReviewError] = useState(null)

  const loadLookups = useCallback(async () => {
    const [{ data: cycleRows }, { data: profileRows }] = await Promise.all([
      supabase.from('review_cycles').select('id, name, cycle_start, cycle_end, status').order('cycle_start', { ascending: false }),
      supabase.from('profiles').select('id, full_name, email'),
    ])
    setCycles(cycleRows ?? [])
    setProfiles(profileRows ?? [])
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
      return
    }
    setCycleDrawerOpen(false)
    loadLookups()
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

    const { error: saveError } = editingReview
      ? await supabase.from('performance_reviews').update(payload).eq('id', editingReview.id)
      : await supabase.from('performance_reviews').insert({ ...payload, company_id: company.id })

    setReviewSaving(false)

    if (saveError) {
      setReviewError(saveError.message)
      return
    }

    setReviewDrawerOpen(false)
    loadReviews()
  }

  async function setReviewStatus(id, status) {
    const patch = { status }
    if (status === 'submitted') patch.submitted_at = new Date().toISOString()
    if (status === 'acknowledged') patch.acknowledged_at = new Date().toISOString()
    await supabase.from('performance_reviews').update(patch).eq('id', id)
    loadReviews()
  }

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
          <Plus size={16} /> New review
        </button>
      </div>

      {loading ? (
        <p className="muted" style={{ marginTop: 20 }}>Loading…</p>
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
          <button type="submit" className="btn-primary" disabled={cycleSaving}>{cycleSaving ? 'Creating…' : 'Create cycle'}</button>
        </form>
      </Drawer>

      <Drawer open={reviewDrawerOpen} onClose={() => setReviewDrawerOpen(false)} title={editingReview ? 'Edit review' : 'New review'}>
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

          <label className="field">
            <span>Overall rating (1–5)</span>
            <input type="number" min="1" max="5" value={reviewForm.overall_rating} onChange={(e) => setReviewForm({ ...reviewForm, overall_rating: e.target.value })} />
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
      return
    }
    setDrawerOpen(false)
    load()
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
        <button className="btn-primary btn-icon" onClick={openNew}>
          <Plus size={16} /> Add note
        </button>
      </div>

      {loading ? (
        <p className="muted" style={{ marginTop: 20 }}>Loading…</p>
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
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Add note'}</button>
        </form>
      </Drawer>
    </>
  )
}
