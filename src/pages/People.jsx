import { useEffect, useState, useCallback } from 'react'
import { Plus, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'

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

  const loadEmployees = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('employees')
      .select(
        'id, employee_code, full_name, employment_status, joining_date, phone, personal_email, cnic, bank_account_number, department_id, designation_id, employment_type_id, branch_id, departments(name), designations(name)'
      )
      .order('created_at', { ascending: false })
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
      return null
    }
    await loadLookups()
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
      return
    }

    setDrawerOpen(false)
    loadEmployees()
  }

  const filtered = employees.filter((e) =>
    e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_code?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page-inner" style={{ maxWidth: 920 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">PEOPLE</p>
          <h1 className="page-title">Employees</h1>
        </div>
        <button className="btn-primary btn-icon" onClick={openAdd}>
          <Plus size={16} /> Add employee
        </button>
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
        <p className="muted" style={{ marginTop: 20 }}>Loading…</p>
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
              <th>Code</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Joined</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp) => (
              <tr key={emp.id} onClick={() => openEdit(emp)}>
                <td>{emp.full_name}</td>
                <td className="mono">{emp.employee_code}</td>
                <td>{emp.departments?.name ?? '—'}</td>
                <td>{emp.designations?.name ?? '—'}</td>
                <td>{formatDate(emp.joining_date)}</td>
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
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add employee'}
          </button>
        </form>
      </Drawer>
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
