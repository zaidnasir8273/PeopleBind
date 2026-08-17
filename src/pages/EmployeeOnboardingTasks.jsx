import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Check, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'
import { SkeletonBlock } from '../components/Skeleton'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const CATEGORY_LABELS = { paperwork: 'Paperwork', it_setup: 'IT setup', training: 'Training', culture: 'Culture', general: 'General' }
const EMPTY_TASK = { title: '', description: '', category: 'general', due_date: '' }
const LOADING_DELAY = 150

export default function EmployeeOnboardingTasks() {
  const { profile, company } = useAuth()
  const [employees, setEmployees] = useState([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [tasks, setTasks] = useState([])
  const [templates, setTemplates] = useState([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_TASK)
  const [saving, setSaving] = useState(false)

  const loadEmployees = useCallback(async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, employee_code, full_name, joining_date')
      .eq('employment_status', 'active')
      .order('joining_date', { ascending: false })
    setEmployees(data ?? [])
  }, [])

  const loadTemplates = useCallback(async () => {
    const { data } = await supabase.from('onboarding_templates').select('id, name').order('name')
    setTemplates(data ?? [])
  }, [])

  const loadTasks = useCallback(async () => {
    if (!selectedEmployeeId) {
      setTasks([])
      return
    }
    const loadingTimer = setTimeout(() => setLoading(true), LOADING_DELAY)
    const { data } = await supabase
      .from('onboarding_tasks')
      .select('id, title, description, category, due_date, status, completed_at')
      .eq('employee_id', selectedEmployeeId)
      .order('due_date', { ascending: true, nullsFirst: false })
    clearTimeout(loadingTimer)
    setTasks(data ?? [])
    setLoading(false)
  }, [selectedEmployeeId])

  useEffect(() => {
    loadEmployees()
    loadTemplates()
  }, [loadEmployees, loadTemplates])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId)
  const doneCount = tasks.filter((t) => t.status === 'completed').length

  async function toggleTask(task) {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    const { error } = await supabase
      .from('onboarding_tasks')
      .update({ status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null })
      .eq('id', task.id)
    if (!error) {
      loadTasks()
    } else {
      toast.error(error.message || 'Failed to update task')
    }
  }

  function openAddTask() {
    setForm({ ...EMPTY_TASK, due_date: selectedEmployee?.joining_date ?? '' })
    setDrawerOpen(true)
  }

  async function handleAddTask(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('onboarding_tasks').insert({
      company_id: company.id,
      employee_id: selectedEmployeeId,
      title: form.title,
      description: form.description || null,
      category: form.category,
      due_date: form.due_date || null,
      created_by: profile.id,
    })
    setSaving(false)
    if (!error) {
      toast.success('Task added')
      setDrawerOpen(false)
      loadTasks()
    } else {
      toast.error(error.message || 'Failed to add task')
    }
  }

  async function applyTemplate() {
    if (!selectedTemplateId || !selectedEmployee) return
    setApplying(true)
    const { data: templateTasks } = await supabase
      .from('onboarding_template_tasks')
      .select('title, description, category, days_from_joining')
      .eq('template_id', selectedTemplateId)
      .order('sort_order')

    const rows = (templateTasks ?? []).map((t) => ({
      company_id: company.id,
      employee_id: selectedEmployeeId,
      title: t.title,
      description: t.description,
      category: t.category,
      due_date: selectedEmployee.joining_date ? addDays(selectedEmployee.joining_date, t.days_from_joining) : null,
      created_by: profile.id,
    }))

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from('onboarding_tasks').insert(rows)
      if (insertError) {
        toast.error(insertError.message || 'Failed to apply template')
      } else {
        toast.success(`${rows.length} tasks added from template`)
        loadTasks()
      }
    }
    setApplying(false)
  }

  return (
    <div className="page-inner" style={{ maxWidth: 900 }}>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Onboarding</h1>
        </div>
      </div>

      <div className="field-row" style={{ maxWidth: 320, marginBottom: 4, alignItems: 'flex-end', gap: 12 }}>
        <label className="field" style={{ flex: 1 }}>
          <span>Employee</span>
          <select value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)}>
            <option value="">— Select employee —</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.full_name} · joined {formatDate(emp.joining_date)}</option>
            ))}
          </select>
        </label>
        {selectedEmployeeId && (
          <button className="btn-secondary btn-icon" onClick={openAddTask} style={{ marginBottom: 2 }}>
            <Plus size={16} /> Add task
          </button>
        )}
      </div>

      {!selectedEmployeeId ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>Select an employee to view or set up their onboarding checklist.</p>
        </div>
      ) : (
        <>
          {templates.length > 0 && (
            <div className="field-row" style={{ maxWidth: 420, alignItems: 'flex-end', gap: 12, marginBottom: 20 }}>
              <label className="field" style={{ flex: 1 }}>
                <span>Apply a template</span>
                <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}>
                  <option value="">— Select template —</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              <button className="btn-primary" disabled={!selectedTemplateId || applying} onClick={applyTemplate}>
                {applying ? 'Adding…' : 'Apply'}
              </button>
            </div>
          )}

          {loading ? (
            <SkeletonBlock rows={4} />
          ) : tasks.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 20 }}>
              <p>No onboarding tasks yet.</p>
              <p className="muted">Apply a template or add tasks one at a time.</p>
            </div>
          ) : (
            <>
              <p className="muted" style={{ marginBottom: 12 }}>{doneCount} of {tasks.length} complete</p>
              {tasks.map((t) => (
                <div key={t.id} className={`onboarding-task${t.status === 'completed' ? ' done' : ''}`}>
                  <button className="onboarding-check" onClick={() => toggleTask(t)} aria-label="Toggle complete">
                    {t.status === 'completed' && <Check size={13} />}
                  </button>
                  <div style={{ flex: 1 }}>
                    <div className="onboarding-task-title">{t.title}</div>
                    {t.description && <div className="muted" style={{ fontSize: 12 }}>{t.description}</div>}
                  </div>
                  <span className="muted mono" style={{ fontSize: 12 }}>{CATEGORY_LABELS[t.category]}</span>
                  <span className="muted mono" style={{ fontSize: 12, minWidth: 70, textAlign: 'right' }}>{formatDate(t.due_date)}</span>
                </div>
              ))}
            </>
          )}
        </>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Add onboarding task">
        <form onSubmit={handleAddTask} className="drawer-form">
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
              <span>Category</span>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Due date</span>
              <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </label>
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={14} className="btn-spinner" />}
            {saving ? 'Adding…' : 'Add task'}
          </button>
        </form>
      </Drawer>
    </div>
  )
}
