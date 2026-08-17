import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { Plus, Search, Upload, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'
import { ImportEmployeesDrawer } from '../components/ImportEmployeesDrawer'
import { SkeletonTable } from '../components/Skeleton'
import { Avatar } from '../components/Avatar'

const EMPTY_FORM = {
  full_name: '',
  personal_email: '',
  phone: '',
  cnic: '',
  department_id: '',
  designation_id: '',
  employment_type_id: '',
  branch_id: '',
  joining_date: new Date().toISOString().slice(0, 10),
  bank_account_number: '',
}

export default function People() {
  const { company } = useAuth()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [lookups, setLookups] = useState({ departments: [], designations: [], employmentTypes: [], branches: [] })

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])
  const [importOpen, setImportOpen] = useState(false)

  const loadEmployees = useCallback(async () => {
    setLoading(true)
    const { data, error: loadError } = await supabase
      .from('employees')
      .select(
        'id, employee_code, full_name, photo_url, employment_status, joining_date, phone, personal_email, cnic, bank_account_number, department_id, designation_id, employment_type_id, branch_id, manager_id, departments!employees_department_id_fkey(name), designations(name), branches(name, city)'
      )
      .order('created_at', { ascending: false })
    if (loadError) toast.error(loadError.message || 'Failed to load employees')
    setEmployees(data ?? [])
    setLoading(false)
  }, [])

  const loadLookups = useCallback(async () => {
    const [{ data: departments }, { data: designations }, { data: employmentTypes }, { data: branches }] = await Promise.all([
      supabase.from('departments').select('id,name').eq('status', 'active').order('name'),
      supabase.from('designations').select('id,name').eq('status', 'active').order('name'),
      supabase.from('employment_types').select('id,name').order('name'),
      supabase.from('branches').select('id,name').order('name'),
    ])
    setLookups({
      departments: departments ?? [],
      designations: designations ?? [],
      employmentTypes: employmentTypes ?? [],
      branches: branches ?? [],
    })
  }, [])

  useEffect(() => {
    loadEmployees()
    loadLookups()
  }, [loadEmployees, loadLookups])

  function openAdd() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError(null)
    setDrawerOpen(true)
  }

  function openEdit(emp) {
    setEditingId(emp.id)
    setForm({
      full_name: emp.full_name ?? '',
      personal_email: emp.personal_email ?? '',
      phone: emp.phone ?? '',
      cnic: emp.cnic ?? '',
      department_id: emp.department_id ?? '',
      designation_id: emp.designation_id ?? '',
      employment_type_id: emp.employment_type_id ?? '',
      branch_id: emp.branch_id ?? '',
      joining_date: emp.joining_date ?? new Date().toISOString().slice(0, 10),
      bank_account_number: emp.bank_account_number ?? '',
    })
    setError(null)
    setDrawerOpen(true)
    loadHistory(emp.id)
  }

  async function loadHistory(employeeId) {
    setHistory([])
    const [{ data: empHistory }, { data: shiftHistory }] = await Promise.all([
      supabase
        .from('employment_history')
        .select('id, effective_from, effective_to, reason, manager_id, departments(name), designations(name), employment_types(name), branches(name)')
        .eq('employee_id', employeeId)
        .order('effective_from', { ascending: false }),
      supabase
        .from('shift_assignment_history')
        .select('id, effective_from, effective_to, reason, shifts(name)')
        .eq('employee_id', employeeId)
        .order('effective_from', { ascending: false }),
    ])

    const merged = [
      ...(empHistory ?? []).map((h) => ({
        id: `emp-${h.id}`,
        effective_from: h.effective_from,
        effective_to: h.effective_to,
        summary: [h.designations?.name, h.departments?.name].filter(Boolean).join(' · ') || 'Employment details updated',
        detail: [h.employment_types?.name, h.branches?.name, h.manager_id ? `Reports to ${employees.find((e) => e.id === h.manager_id)?.full_name ?? 'manager'}` : null].filter(Boolean).join(' · '),
        reason: h.reason,
      })),
      ...(shiftHistory ?? []).map((h) => ({
        id: `shift-${h.id}`,
        effective_from: h.effective_from,
        effective_to: h.effective_to,
        summary: h.shifts?.name ? `Shift: ${h.shifts.name}` : 'Shift changed',
        detail: null,
        reason: h.reason,
      })),
    ].sort((a, b) => (b.effective_from ?? '').localeCompare(a.effective_from ?? ''))

    setHistory(merged)
  }

  async function createLookup(table, name) {
    if (!name.trim()) return null
    const { data, error: insertError } = await supabase
      .from(table)
      .insert({ company_id: company.id, name: name.trim() })
      .select()
      .single()
    if (insertError) {
      setError(insertError.message)
      toast.error(insertError.message || 'Something went wrong')
      return null
    }
    await loadLookups()
    const label = table.slice(0, -1)
    toast.success(`${label.charAt(0).toUpperCase()}${label.slice(1)} added`)
    return data.id
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const payload = {
      company_id: company.id,
      full_name: form.full_name,
      personal_email: form.personal_email || null,
      phone: form.phone || null,
      cnic: form.cnic || null,
      department_id: form.department_id || null,
      designation_id: form.designation_id || null,
      employment_type_id: form.employment_type_id || null,
      branch_id: form.branch_id || null,
      joining_date: form.joining_date,
      bank_account_number: form.bank_account_number || null,
    }

    const { error: saveError } = editingId
      ? await supabase.from('employees').update(payload).eq('id', editingId)
      : await supabase.from('employees').insert(payload)

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      toast.error(saveError.message || 'Something went wrong')
      return
    }

    toast.success(editingId ? 'Employee updated' : 'Employee added')
    setDrawerOpen(false)
    loadEmployees()
  }

  const filtered = employees.filter((e) =>
    e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_code?.toLowerCase().includes(search.toLowerCase())
  )

  // Resolved client-side rather than via a manager:employees(...) embed --
  // PostgREST can't reliably self-join employees to itself on this project.
  const managerNameById = useMemo(() => {
    const map = new Map()
    for (const e of employees) map.set(e.id, e.full_name)
    return map
  }, [employees])

  return (
    <div className="page-inner" style={{ maxWidth: 920 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">PEOPLE</p>
          <h1 className="page-title">Employees</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary btn-icon" onClick={() => setImportOpen(true)}>
            <Upload size={16} /> Import
          </button>
          <button className="btn-primary btn-icon" onClick={openAdd}>
            <Plus size={16} /> Add employee
          </button>
        </div>
      </div>

      <div className="search-bar">
        <Search size={15} />
        <input
          type="text"
          placeholder="Search by name or employee code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : filtered.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>{employees.length === 0 ? 'No employees yet.' : 'No matches.'}</p>
          <p className="muted">
            {employees.length === 0
              ? 'Add your first employee to start managing attendance, leave, and payroll.'
              : 'Try a different search.'}
          </p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Designation</th>
              <th>Department</th>
              <th>Location</th>
              <th>Manager</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp) => (
              <tr key={emp.id} onClick={() => openEdit(emp)}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={emp.full_name} photoUrl={emp.photo_url} size={32} />
                    <div>
                      <div>{emp.full_name}</div>
                      <span className="mono" style={{ display: 'block', color: 'var(--ink-soft)', fontSize: 12 }}>
                        {[emp.employee_code, emp.personal_email].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                  </div>
                </td>
                <td>{emp.designations?.name ?? '—'}</td>
                <td>{emp.departments?.name ?? '—'}</td>
                <td>{emp.branches?.name ?? '—'}</td>
                <td>{(emp.manager_id && managerNameById.get(emp.manager_id)) ?? '—'}</td>
                <td>
                  <span className={`status-badge status-${emp.employment_status}`}>{emp.employment_status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editingId ? 'Edit employee' : 'Add employee'}>
        <form onSubmit={handleSubmit} className="drawer-form">
          <label className="field">
            <span>Full name</span>
            <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Email</span>
              <input type="email" value={form.personal_email} onChange={(e) => setForm({ ...form, personal_email: e.target.value })} />
            </label>
            <label className="field">
              <span>Phone</span>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
          </div>

          <div className="field-row">
            <LookupSelect
              label="Department"
              value={form.department_id}
              options={lookups.departments}
              onChange={(id) => setForm({ ...form, department_id: id })}
              onCreate={(name) => createLookup('departments', name).then((id) => id && setForm((f) => ({ ...f, department_id: id })))}
            />
            <LookupSelect
              label="Designation"
              value={form.designation_id}
              options={lookups.designations}
              onChange={(id) => setForm({ ...form, designation_id: id })}
              onCreate={(name) => createLookup('designations', name).then((id) => id && setForm((f) => ({ ...f, designation_id: id })))}
            />
          </div>

          <div className="field-row">
            <label className="field">
              <span>Employment type</span>
              <select value={form.employment_type_id} onChange={(e) => setForm({ ...form, employment_type_id: e.target.value })}>
                <option value="">—</option>
                {lookups.employmentTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Branch</span>
              <select value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
                <option value="">—</option>
                {lookups.branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span>Joining date</span>
            <input type="date" required value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} />
          </label>

          <div className="field-row">
            <label className="field">
              <span>CNIC</span>
              <input value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} />
            </label>
            <label className="field">
              <span>Bank account number</span>
              <input value={form.bank_account_number} onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })} />
            </label>
          </div>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={14} className="btn-spinner" />}
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add employee'}
          </button>
        </form>

        {editingId && history.length > 0 && (
          <div style={{ padding: '0 24px 24px' }}>
            <p className="section-heading" style={{ marginTop: 8 }}>History</p>
            <div className="history-timeline">
              {history.map((h) => (
                <div key={h.id} className="history-item">
                  <div className="history-item-date">
                    {formatDate(h.effective_from)}{h.effective_to ? ` – ${formatDate(h.effective_to)}` : ''}
                  </div>
                  <div className="history-item-summary">{h.summary}</div>
                  {h.detail && <div className="muted" style={{ fontSize: 12 }}>{h.detail}</div>}
                  {h.reason && <div className="muted" style={{ fontSize: 12, fontStyle: 'italic' }}>{h.reason}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </Drawer>

      <ImportEmployeesDrawer
        open={importOpen}
        onClose={() => setImportOpen(false)}
        company={company}
        lookups={lookups}
        onImported={loadEmployees}
      />
    </div>
  )
}

function LookupSelect({ label, value, options, onChange, onCreate }) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  if (adding) {
    return (
      <div className="field">
        <span>{label}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={`New ${label.toLowerCase()}`} />
          <button
            type="button"
            className="btn-primary"
            style={{ padding: '8px 12px' }}
            onClick={() => {
              onCreate(newName)
              setNewName('')
              setAdding(false)
            }}
          >
            Add
          </button>
        </div>
      </div>
    )
  }

  return (
    <label className="field">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => {
          if (e.target.value === '__new__') {
            setAdding(true)
          } else {
            onChange(e.target.value)
          }
        }}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
        <option value="__new__">+ Add new…</option>
      </select>
    </label>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
