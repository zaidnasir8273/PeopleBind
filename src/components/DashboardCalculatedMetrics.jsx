import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from './Drawer'
import { DeleteIcon } from './ui/delete'
import { DASHBOARD_METRIC_KEYS, DASHBOARD_METRICS, evaluateCalculatedMetric } from '../lib/dashboardMetrics'

const OPERATORS = ['+', '-', '*', '/', '(', ')']

function last30Days() {
  const to = new Date().toISOString().slice(0, 10)
  const from = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)
  return { from, to }
}

export function DashboardCalculatedMetrics({ open, onClose, metrics, onChanged }) {
  const { company } = useAuth()
  const [name, setName] = useState('')
  const [formula, setFormula] = useState('')
  const [preview, setPreview] = useState(null) // null | { ok: true, value } | { ok: false, error }
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (!formula.trim()) { setPreview(null); return }
    let active = true
    const { from, to } = last30Days()
    async function run() {
      try {
        const { value } = await evaluateCalculatedMetric(formula, from, to, company, {})
        if (active) setPreview({ ok: true, value })
      } catch (err) {
        if (active) setPreview({ ok: false, error: err.message })
      }
    }
    const t = setTimeout(run, 250) // debounce -- an evaluation is a real Supabase fetch, not free
    return () => { active = false; clearTimeout(t) }
  }, [formula, company])

  function insertToken(token) {
    const el = textareaRef.current
    if (!el) { setFormula((f) => f + token); return }
    // Only trust the textarea's own cursor position while it's actually
    // focused -- clicking an insert button (outside the textarea) blurs
    // it first, at which point selectionStart is unreliable/stale in
    // some browsers. With no live cursor to insert at, append to the end
    // instead of silently inserting at a stale/wrong position.
    const hasLiveCursor = document.activeElement === el
    const start = hasLiveCursor ? (el.selectionStart ?? formula.length) : formula.length
    const end = hasLiveCursor ? (el.selectionEnd ?? formula.length) : formula.length
    const next = formula.slice(0, start) + token + formula.slice(end)
    setFormula(next)
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = start + token.length })
  }

  async function save() {
    if (!name.trim() || !formula.trim() || !preview?.ok) return
    setSaving(true)
    const { error } = await supabase.from('custom_metrics').insert({ company_id: company.id, name: name.trim(), formula: formula.trim() })
    setSaving(false)
    if (error) { toast.error(error.message || 'Failed to save metric'); return }
    toast.success('Calculated metric created')
    setName('')
    setFormula('')
    onChanged()
  }

  async function remove(id) {
    const { error } = await supabase.from('custom_metrics').delete().eq('id', id)
    if (error) { toast.error(error.message || 'Failed to delete metric'); return }
    toast.success('Calculated metric deleted')
    onChanged()
  }

  return (
    <Drawer open={open} onClose={onClose} title="Calculated metrics">
      <div className="drawer-form">
        {metrics.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 4 }}>
            {metrics.map((m) => (
              <div key={m.id} className="dashboard-calc-metric-row">
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>∑ {m.name}</div>
                  <div className="muted mono" style={{ fontSize: 11.5 }}>{m.formula}</div>
                </div>
                <button type="button" className="link-button" style={{ color: 'var(--danger)' }} onClick={() => remove(m.id)} aria-label="Delete">
                  <DeleteIcon size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="section-heading" style={{ margin: 0 }}>New calculated metric</p>
        <label className="field">
          <span>Name</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Expense ratio" />
        </label>
        <label className="field">
          <span>Formula</span>
          <textarea
            ref={textareaRef}
            rows={2}
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            placeholder="e.g. expense_total / payroll_gross * 100"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}
          />
        </label>

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {OPERATORS.map((op) => (
            <button key={op} type="button" className="btn-secondary" style={{ padding: '3px 10px', fontSize: 13 }} onClick={() => insertToken(op)}>{op}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {DASHBOARD_METRIC_KEYS.map((k) => (
            <button key={k} type="button" className="btn-secondary" style={{ padding: '3px 10px', fontSize: 11.5 }} onClick={() => insertToken(k)}>{DASHBOARD_METRICS[k].label}</button>
          ))}
        </div>

        {preview && (
          preview.ok ? (
            <p style={{ color: 'var(--teal-deep)', fontSize: 12.5, margin: 0 }}>✓ Valid. Last 30 days: {Math.round(preview.value * 100) / 100}</p>
          ) : (
            <p className="field-error">{preview.error}</p>
          )
        )}

        <button type="button" className="btn-primary" disabled={saving || !name.trim() || !preview?.ok} onClick={save} style={{ alignSelf: 'flex-start' }}>
          {saving ? 'Saving…' : 'Save calculated metric'}
        </button>
      </div>
    </Drawer>
  )
}
