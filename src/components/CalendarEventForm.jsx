import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'

// Category -> color mapping shared with Calendar.jsx (the dot colors and
// this form's <select> options both come from here so they can never
// drift apart). Colors chosen to be distinct from the 5 existing
// calendar-dot colors (holiday/leave/birthday/anniversary/project).
export const EVENT_CATEGORIES = [
  { value: 'company_wide', label: 'Company-wide', color: '#1f7a63' },
  { value: 'meeting', label: 'Meeting', color: '#3564a8' },
  { value: 'visit', label: 'Visit', color: '#8a5a2e' },
  { value: 'gathering', label: 'Gathering', color: '#5c7c3f' },
  { value: 'other', label: 'Other', color: '#71717a' },
]

export function eventCategoryColor(category) {
  return EVENT_CATEGORIES.find((c) => c.value === category)?.color ?? '#71717a'
}

export function eventCategoryLabel(category) {
  return EVENT_CATEGORIES.find((c) => c.value === category)?.label ?? category
}

// `editing` is null for a new event, or the existing company_events row
// being edited -- the same date fields double as the "reschedule"
// capability, no separate UI needed for that.
export function CalendarEventForm({ companyId, defaultDate, editing, onDone, onCancel }) {
  const [form, setForm] = useState(() => ({
    title: editing?.title ?? '',
    description: editing?.description ?? '',
    category: editing?.category ?? 'meeting',
    event_date: editing?.event_date ?? defaultDate,
    end_date: editing?.end_date ?? '',
    start_time: editing?.start_time?.slice(0, 5) ?? '',
    end_time: editing?.end_time?.slice(0, 5) ?? '',
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!form.title.trim()) { setError('Title is required.'); return }
    if (!form.event_date) { setError('Date is required.'); return }
    if (form.end_date && form.end_date < form.event_date) { setError('End date must be on or after the start date.'); return }

    setSaving(true)
    const payload = {
      company_id: companyId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      event_date: form.event_date,
      end_date: form.end_date || null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
    }
    const { error: saveError } = editing
      ? await supabase.from('company_events').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id)
      : await supabase.from('company_events').insert(payload)
    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      toast.error(saveError.message || 'Failed to save event')
      return
    }
    toast.success(editing ? 'Event updated' : 'Event added')
    onDone()
  }

  return (
    <form className="drawer-form" onSubmit={handleSubmit}>
      <button type="button" className="link-button" style={{ alignSelf: 'flex-start', fontSize: 12.5 }} onClick={onCancel}>
        ← Back
      </button>

      <label className="field">
        <span>Title</span>
        <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. All-hands meeting" autoFocus />
      </label>

      <label className="field">
        <span>Category</span>
        <select value={form.category} onChange={(e) => set('category', e.target.value)}>
          {EVENT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </label>

      <div style={{ display: 'flex', gap: 10 }}>
        <label className="field" style={{ flex: 1 }}>
          <span>Date</span>
          <input type="date" value={form.event_date} onChange={(e) => set('event_date', e.target.value)} />
        </label>
        <label className="field" style={{ flex: 1 }}>
          <span>End date (optional)</span>
          <input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} min={form.event_date || undefined} />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <label className="field" style={{ flex: 1 }}>
          <span>Start time (optional)</span>
          <input type="time" value={form.start_time} onChange={(e) => set('start_time', e.target.value)} />
        </label>
        <label className="field" style={{ flex: 1 }}>
          <span>End time (optional)</span>
          <input type="time" value={form.end_time} onChange={(e) => set('end_time', e.target.value)} />
        </label>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>Leave times blank for an all-day event.</p>

      <label className="field">
        <span>Description (optional)</span>
        <textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Details, location, agenda…" />
      </label>

      {error && <p className="field-error">{error}</p>}

      <button type="submit" className="btn-primary" disabled={saving} style={{ alignSelf: 'flex-start' }}>
        {saving ? 'Saving…' : editing ? 'Save changes' : 'Add event'}
      </button>
    </form>
  )
}
