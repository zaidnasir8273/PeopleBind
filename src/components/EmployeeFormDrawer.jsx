import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { PlusIcon } from './ui/plus'
import { ScanFaceIcon } from './ui/scan-face'
import { FolderCogIcon } from './ui/folder-cog'
import { CircleDollarSignIcon } from './ui/circle-dollar-sign'
import { supabase } from '../lib/supabase'
import { Drawer } from './Drawer'

const EMPTY_FORM = {
  employee_code: '',
  full_name: '',
  personal_email: '',
  phone: '',
  date_of_birth: '',
  gender: '',
  father_name: '',
  marital_status: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  cnic: '',
  address: '',

  designation_id: '',
  team_id: '',
  department_id: '',
  employment_type_id: '',
  branch_id: '',
  employment_status: 'probation',
  manager_id: '',
  hire_date: '',
  joining_date: new Date().toISOString().slice(0, 10),
  probation_period_months: '',
  confirmation_date: '',
  exit_date: '',

  bank_name: '',
  bank_account_number: '',
  bank_iban: '',
  basic_salary: '',
  salary_level: '',
}

const TABS = [
  { key: 'personal', label: 'Personal Info', icon: ScanFaceIcon },
  { key: 'employment', label: 'Employment Info', icon: FolderCogIcon },
  { key: 'salary', label: 'Salary Info', icon: CircleDollarSignIcon },
]

function formFromEmployee(emp) {
  if (!emp) return EMPTY_FORM
  const form = { ...EMPTY_FORM }
  for (const key of Object.keys(EMPTY_FORM)) {
    if (emp[key] !== undefined && emp[key] !== null) form[key] = emp[key]
  }
  return form
}

export function EmployeeFormDrawer({ open, onClose, initialData, company, lookups, managerOptions, createLookup, onSaved }) {
  const [tab, setTab] = useState('personal')
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const editingId = initialData?.id ?? null

  useEffect(() => {
    if (open) {
      setForm(formFromEmployee(initialData))
      setTab('personal')
      setError(null)
    }
  }, [open, initialData])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (editingId && !form.employee_code.trim()) {
      setError('Employee ID is required')
      setTab('employment')
      return
    }

    setSaving(true)

    const payload = {
      company_id: company.id,
      employee_code: form.employee_code.trim() || null,
      full_name: form.full_name,
      personal_email: form.personal_email || null,
      phone: form.phone || null,
      date_of_birth: form.date_of_birth || null,
      gender: form.gender || null,
      father_name: form.father_name || null,
      marital_status: form.marital_status || null,
      emergency_contact_name: form.emergency_contact_name || null,
      emergency_contact_phone: form.emergency_contact_phone || null,
      cnic: form.cnic || null,
      address: form.address || null,

      designation_id: form.designation_id || null,
      team_id: form.team_id || null,
      department_id: form.department_id || null,
      employment_type_id: form.employment_type_id || null,
      branch_id: form.branch_id || null,
      employment_status: form.employment_status || 'probation',
      manager_id: form.manager_id || null,
      hire_date: form.hire_date || null,
      joining_date: form.joining_date,
      probation_period_months: form.probation_period_months ? Number(form.probation_period_months) : null,
      confirmation_date: form.confirmation_date || null,
      exit_date: form.exit_date || null,

      bank_name: form.bank_name || null,
      bank_account_number: form.bank_account_number || null,
      bank_iban: form.bank_iban || null,
      basic_salary: form.basic_salary ? Number(form.basic_salary) : null,
      salary_level: form.salary_level || null,
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
    onClose()
    onSaved?.()
  }

  function set(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  return (
    <Drawer open={open} onClose={onClose} title={editingId ? 'Edit employee' : 'Add employee'} wide>
      <div className="tabs" style={{ margin: '0 24px 20px' }}>
        {TABS.map((t) => (
          <button key={t.key} type="button" className={`tab-button${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="drawer-form" style={{ padding: '0 24px 24px' }}>
        {tab === 'personal' && (
          <>
            <label className="field">
              <span>Full name</span>
              <input required value={form.full_name} onChange={set('full_name')} />
            </label>
            <div className="field-row">
              <label className="field">
                <span>Contact #</span>
                <input value={form.phone} onChange={set('phone')} />
              </label>
              <label className="field">
                <span>Personal email</span>
                <input type="email" value={form.personal_email} onChange={set('personal_email')} />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>Date of birth</span>
                <input type="date" value={form.date_of_birth} onChange={set('date_of_birth')} />
              </label>
              <label className="field">
                <span>Gender</span>
                <select value={form.gender} onChange={set('gender')}>
                  <option value="">—</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>Father name</span>
                <input value={form.father_name} onChange={set('father_name')} />
              </label>
              <label className="field">
                <span>Marital status</span>
                <select value={form.marital_status} onChange={set('marital_status')}>
                  <option value="">—</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>Emergency contact name</span>
                <input value={form.emergency_contact_name} onChange={set('emergency_contact_name')} />
              </label>
              <label className="field">
                <span>Emergency contact #</span>
                <input value={form.emergency_contact_phone} onChange={set('emergency_contact_phone')} />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>CNIC #</span>
                <input value={form.cnic} onChange={set('cnic')} />
              </label>
              <label className="field">
                <span>Address</span>
                <input value={form.address} onChange={set('address')} />
              </label>
            </div>
          </>
        )}

        {tab === 'employment' && (
          <>
            <label className="field">
              <span>Employee ID</span>
              <input
                value={form.employee_code}
                onChange={set('employee_code')}
                placeholder={editingId ? '' : 'Leave blank to auto-generate'}
              />
            </label>
            <div className="field-row">
              <LookupSelect
                label="Designation"
                value={form.designation_id}
                options={lookups.designations}
                onChange={(id) => setForm((f) => ({ ...f, designation_id: id }))}
                onCreate={(name) => createLookup('designations', name).then((id) => id && setForm((f) => ({ ...f, designation_id: id })))}
              />
              <LookupSelect
                label="Team"
                value={form.team_id}
                options={lookups.teams}
                onChange={(id) => setForm((f) => ({ ...f, team_id: id }))}
                onCreate={(name) => createLookup('teams', name).then((id) => id && setForm((f) => ({ ...f, team_id: id })))}
              />
            </div>
            <div className="field-row">
              <LookupSelect
                label="Department"
                value={form.department_id}
                options={lookups.departments}
                onChange={(id) => setForm((f) => ({ ...f, department_id: id }))}
                onCreate={(name) => createLookup('departments', name).then((id) => id && setForm((f) => ({ ...f, department_id: id })))}
              />
              <label className="field">
                <span>Employment type</span>
                <select value={form.employment_type_id} onChange={set('employment_type_id')}>
                  <option value="">—</option>
                  {lookups.employmentTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>Employment status</span>
                <select value={form.employment_status} onChange={set('employment_status')}>
                  <option value="training">Training</option>
                  <option value="probation">Probation</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="resigned">Resigned</option>
                  <option value="terminated">Terminated</option>
                </select>
              </label>
              <label className="field">
                <span>Location</span>
                <select value={form.branch_id} onChange={set('branch_id')}>
                  <option value="">—</option>
                  {lookups.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
            </div>
            <label className="field">
              <span>Reporting manager</span>
              <select value={form.manager_id} onChange={set('manager_id')}>
                <option value="">—</option>
                {managerOptions.filter((m) => m.id !== editingId).map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            </label>
            <div className="field-row">
              <label className="field">
                <span>Hire date</span>
                <input type="date" value={form.hire_date} onChange={set('hire_date')} />
              </label>
              <label className="field">
                <span>Joining date</span>
                <input type="date" required value={form.joining_date} onChange={set('joining_date')} />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>Probation time (months)</span>
                <input type="number" min="0" value={form.probation_period_months} onChange={set('probation_period_months')} />
              </label>
              <label className="field">
                <span>Probation end date</span>
                <input type="date" value={form.confirmation_date} onChange={set('confirmation_date')} />
              </label>
            </div>
            <label className="field">
              <span>Company exit date</span>
              <input type="date" value={form.exit_date} onChange={set('exit_date')} placeholder="If they've left the company" />
            </label>
          </>
        )}

        {tab === 'salary' && (
          <>
            <div className="field-row">
              <label className="field">
                <span>Basic salary</span>
                <input type="number" min="0" step="0.01" value={form.basic_salary} onChange={set('basic_salary')} placeholder="e.g. 150000" />
              </label>
              <label className="field">
                <span>Salary level</span>
                <input value={form.salary_level} onChange={set('salary_level')} placeholder="e.g. L4, Senior" />
              </label>
            </div>
            <p className="muted" style={{ margin: 0 }}>Account & transactional details. Full salary structure and components are managed from Payroll.</p>
            <label className="field">
              <span>Bank name</span>
              <input value={form.bank_name} onChange={set('bank_name')} />
            </label>
            <div className="field-row">
              <label className="field">
                <span>Bank account number</span>
                <input value={form.bank_account_number} onChange={set('bank_account_number')} />
              </label>
              <label className="field">
                <span>IBAN</span>
                <input value={form.bank_iban} onChange={set('bank_iban')} />
              </label>
            </div>
          </>
        )}

        {error && <p className="field-error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving && <Loader2 size={14} className="btn-spinner" />}
          {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add employee'}
        </button>
      </form>
    </Drawer>
  )
}

function LookupSelect({ label, value, options, onChange, onCreate }) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  if (adding) {
    return (
      <div className="field">
        <span>{label}</span>
        <div className="lookup-add" style={{ marginTop: 0 }}>
          <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={`New ${label.toLowerCase()}`} />
          <button
            type="button"
            className="lookup-add-btn"
            aria-label={`Add ${label.toLowerCase()}`}
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
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => (e.target.value === '__new__' ? setAdding(true) : onChange(e.target.value))}
      >
        <option value="">—</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        <option value="__new__">+ Add new…</option>
      </select>
    </label>
  )
}
