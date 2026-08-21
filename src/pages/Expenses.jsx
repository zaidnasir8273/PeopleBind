import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { PlusIcon } from '../components/ui/plus'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'
import { SkeletonTable } from '../components/Skeleton'

function fmt(n) {
  return 'Rs. ' + Number(n ?? 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const EMPTY_CLAIM = {
  employee_id: '',
  category_id: '',
  amount: '',
  expense_date: new Date().toISOString().slice(0, 10),
  description: '',
  receipt_url: '',
}

const STATUS_FILTERS = ['all', 'submitted', 'changes_requested', 'approved', 'rejected', 'reimbursed']

export default function Expenses() {
  const { profile, company } = useAuth()

  const [employees, setEmployees] = useState([])
  const [categories, setCategories] = useState([])
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  const [newDrawerOpen, setNewDrawerOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_CLAIM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [reviewClaim, setReviewClaim] = useState(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [reviewSaving, setReviewSaving] = useState(false)

  const loadLookups = useCallback(async () => {
    const [{ data: emps }, { data: cats }] = await Promise.all([
      supabase.from('employees').select('id, employee_code, full_name').in('employment_status', ['training', 'probation', 'confirmed']).order('full_name'),
      supabase.from('expense_categories').select('id, name, requires_receipt, max_amount').eq('status', 'active').order('name'),
    ])
    setEmployees(emps ?? [])
    setCategories(cats ?? [])
  }, [])

  const loadClaims = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('expense_claims')
      .select('id, amount, expense_date, description, receipt_url, status, review_notes, employees(full_name, employee_code), expense_categories(name)')
      .order('expense_date', { ascending: false })
    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    const { data } = await query.limit(200)
    setClaims(data ?? [])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => {
    loadLookups()
  }, [loadLookups])

  useEffect(() => {
    loadClaims()
  }, [loadClaims])

  const selectedCategory = categories.find((c) => c.id === form.category_id)

  function openNew() {
    setForm({ ...EMPTY_CLAIM })
    setError(null)
    setNewDrawerOpen(true)
  }

  async function createCategory(name) {
    if (!name.trim()) return null
    const { data, error: insertError } = await supabase
      .from('expense_categories')
      .insert({ company_id: company.id, name: name.trim() })
      .select()
      .single()
    if (insertError) {
      setError(insertError.message)
      toast.error(insertError.message)
      return null
    }
    await loadLookups()
    return data.id
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const { error: saveError } = await supabase.from('expense_claims').insert({
      company_id: company.id,
      employee_id: form.employee_id,
      category_id: form.category_id,
      amount: Number(form.amount),
      expense_date: form.expense_date,
      description: form.description || null,
      receipt_url: form.receipt_url || null,
    })

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      toast.error(saveError.message)
      return
    }

    toast.success('Expense claim submitted')
    setNewDrawerOpen(false)
    loadClaims()
  }

  function openReview(claim) {
    setReviewClaim(claim)
    setReviewNotes(claim.review_notes || '')
  }

  async function submitReview(status) {
    if (!reviewClaim) return
    setReviewSaving(true)
    const { error: reviewError } = await supabase
      .from('expense_claims')
      .update({
        status,
        review_notes: reviewNotes || null,
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', reviewClaim.id)

    setReviewSaving(false)

    if (!reviewError) {
      const labels = { approved: 'Claim approved', rejected: 'Claim rejected', changes_requested: 'Changes requested' }
      toast.success(labels[status] ?? 'Claim updated')
      setReviewClaim(null)
      loadClaims()
    }
  }

  const isActionable = reviewClaim && ['submitted', 'changes_requested'].includes(reviewClaim.status)

  return (
    <div className="page-inner" style={{ maxWidth: 980 }}>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Expenses</h1>
        </div>
        <button className="btn-primary btn-icon" onClick={openNew}>
          <PlusIcon size={16} /> New claim
        </button>
      </div>

      <div className="field-row" style={{ maxWidth: 220, marginBottom: 4 }}>
        <label className="field">
          <span>Status</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>{s === 'all' ? 'All' : s.replace('_', ' ')}</option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <SkeletonTable rows={5} columns={5} />
      ) : claims.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>No expense claims.</p>
          <p className="muted">New claims will show up here for review.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((c) => (
              <tr key={c.id} onClick={() => openReview(c)}>
                <td>
                  {c.employees?.full_name}
                  <span className="mono" style={{ display: 'block', color: 'var(--ink-soft)', fontSize: 12 }}>
                    {c.employees?.employee_code}
                  </span>
                </td>
                <td>{c.expense_categories?.name}</td>
                <td className="mono">{fmt(c.amount)}</td>
                <td className="mono">{formatDate(c.expense_date)}</td>
                <td><span className={`status-badge status-${c.status}`}>{c.status.replace('_', ' ')}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Drawer open={newDrawerOpen} onClose={() => setNewDrawerOpen(false)} title="New expense claim">
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

          <CategorySelect
            value={form.category_id}
            options={categories}
            onChange={(id) => setForm({ ...form, category_id: id })}
            onCreate={(name) => createCategory(name).then((id) => id && setForm((f) => ({ ...f, category_id: id })))}
          />
          {selectedCategory && (
            <p className="muted" style={{ margin: 0 }}>
              {selectedCategory.requires_receipt ? 'Requires a receipt. ' : ''}
              {selectedCategory.max_amount ? `Max ${fmt(selectedCategory.max_amount)}.` : ''}
            </p>
          )}

          <div className="field-row">
            <label className="field">
              <span>Amount</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Date</span>
              <input
                type="date"
                required
                value={form.expense_date}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
              />
            </label>
          </div>

          <label className="field">
            <span>Description</span>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
          </label>

          <label className="field">
            <span>Receipt link</span>
            <input
              value={form.receipt_url}
              onChange={(e) => setForm({ ...form, receipt_url: e.target.value })}
              placeholder="Optional URL"
            />
          </label>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={14} className="btn-spinner" />}
            {saving ? 'Saving…' : 'Submit claim'}
          </button>
        </form>
      </Drawer>

      <Drawer
        open={!!reviewClaim}
        onClose={() => setReviewClaim(null)}
        title={reviewClaim ? `${reviewClaim.employees?.full_name} · ${reviewClaim.expense_categories?.name}` : ''}
      >
        {reviewClaim && (
          <div className="drawer-form">
            <div className="field-row">
              <div className="field">
                <span>Amount</span>
                <p style={{ margin: 0, fontFamily: 'var(--font-mono)' }}>{fmt(reviewClaim.amount)}</p>
              </div>
              <div className="field">
                <span>Date</span>
                <p style={{ margin: 0, fontFamily: 'var(--font-mono)' }}>{formatDate(reviewClaim.expense_date)}</p>
              </div>
            </div>

            {reviewClaim.description && (
              <div className="field">
                <span>Description</span>
                <p style={{ margin: 0 }}>{reviewClaim.description}</p>
              </div>
            )}

            {reviewClaim.receipt_url && (
              <div className="field">
                <span>Receipt</span>
                <a href={reviewClaim.receipt_url} target="_blank" rel="noreferrer" className="link-button">View receipt</a>
              </div>
            )}

            <div className="field">
              <span>Status</span>
              <p style={{ margin: 0 }}>
                <span className={`status-badge status-${reviewClaim.status}`}>{reviewClaim.status.replace('_', ' ')}</span>
              </p>
            </div>

            {isActionable ? (
              <>
                <label className="field">
                  <span>Notes {`(optional, shown to the employee)`}</span>
                  <input value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="btn-primary" disabled={reviewSaving} onClick={() => submitReview('approved')}>
                    Approve
                  </button>
                  <button type="button" className="btn-primary" disabled={reviewSaving} onClick={() => submitReview('changes_requested')} style={{ background: 'var(--gold)' }}>
                    Request changes
                  </button>
                  <button type="button" className="btn-primary" disabled={reviewSaving} onClick={() => submitReview('rejected')} style={{ background: '#b0473f' }}>
                    Reject
                  </button>
                </div>
              </>
            ) : (
              reviewClaim.review_notes && (
                <div className="field">
                  <span>Review notes</span>
                  <p style={{ margin: 0 }}>{reviewClaim.review_notes}</p>
                </div>
              )
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}

function CategorySelect({ value, options, onChange, onCreate }) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  if (adding) {
    return (
      <div className="field">
        <span>Category</span>
        <div className="lookup-add" style={{ marginTop: 0 }}>
          <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New category" />
          <button
            type="button"
            className="lookup-add-btn"
            aria-label="Add category"
            onClick={() => {
              onCreate(newName)
              setNewName('')
              setAdding(false)
            }}
          >
            <PlusIcon size={15} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <label className="field">
      <span>Category</span>
      <select
        required
        value={value}
        onChange={(e) => {
          if (e.target.value === '__new__') setAdding(true)
          else onChange(e.target.value)
        }}
      >
        <option value="">— Select —</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
        <option value="__new__">+ Add new…</option>
      </select>
    </label>
  )
}
