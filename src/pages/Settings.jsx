import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'

const DAYS = [
  { code: 'MO', label: 'Mon' },
  { code: 'TU', label: 'Tue' },
  { code: 'WE', label: 'Wed' },
  { code: 'TH', label: 'Thu' },
  { code: 'FR', label: 'Fri' },
  { code: 'SA', label: 'Sat' },
  { code: 'SU', label: 'Sun' },
]

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Settings() {
  const [tab, setTab] = useState('company')

  return (
    <div className="page-inner" style={{ maxWidth: 1000 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">SETTINGS</p>
          <h1 className="page-title">Settings</h1>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-button${tab === 'company' ? ' active' : ''}`} onClick={() => setTab('company')}>Company</button>
        <button className={`tab-button${tab === 'structure' ? ' active' : ''}`} onClick={() => setTab('structure')}>Org structure</button>
        <button className={`tab-button${tab === 'shifts' ? ' active' : ''}`} onClick={() => setTab('shifts')}>Shifts & holidays</button>
        <button className={`tab-button${tab === 'payroll' ? ' active' : ''}`} onClick={() => setTab('payroll')}>Payroll components</button>
        <button className={`tab-button${tab === 'roles' ? ' active' : ''}`} onClick={() => setTab('roles')}>Roles & users</button>
      </div>

      {tab === 'company' && <CompanyTab />}
      {tab === 'structure' && <StructureTab />}
      {tab === 'shifts' && <ShiftsTab />}
      {tab === 'payroll' && <PayrollComponentsTab />}
      {tab === 'roles' && <RolesTab />}
    </div>
  )
}

/* =========================== COMPANY =========================== */

function CompanyTab() {
  const { company, refreshProfile } = useAuth()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name || '',
        timezone: company.timezone || 'Asia/Karachi',
        fiscal_year_start: company.fiscal_year_start || '',
        standard_monthly_hours: company.standard_monthly_hours ?? 208,
        standard_monthly_days: company.standard_monthly_days ?? 26,
        eobi_minimum_wage_base: company.eobi_minimum_wage_base ?? 37000,
      })
    }
  }, [company])

  if (!form) return <p className="muted" style={{ marginTop: 20 }}>Loading…</p>

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const { error: saveError } = await supabase
      .from('companies')
      .update({
        name: form.name,
        timezone: form.timezone,
        fiscal_year_start: form.fiscal_year_start || null,
        standard_monthly_hours: Number(form.standard_monthly_hours),
        standard_monthly_days: Number(form.standard_monthly_days),
        eobi_minimum_wage_base: Number(form.eobi_minimum_wage_base),
      })
      .eq('id', company.id)

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    toast.success('Company settings saved')
    if (refreshProfile) refreshProfile()
  }

  return (
    <form onSubmit={handleSubmit} className="drawer-form" style={{ maxWidth: 460 }}>
      <label className="field">
        <span>Company name</span>
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </label>

      <div className="field-row">
        <label className="field">
          <span>Timezone</span>
          <input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
        </label>
        <label className="field">
          <span>Fiscal year start</span>
          <input type="date" value={form.fiscal_year_start} onChange={(e) => setForm({ ...form, fiscal_year_start: e.target.value })} />
        </label>
      </div>

      <p className="section-heading" style={{ marginTop: 10, marginBottom: 4, fontSize: 14 }}>Payroll basis</p>
      <p className="muted" style={{ marginTop: 0 }}>Used to prorate salaries for unpaid leave and calculate overtime rates.</p>

      <div className="field-row">
        <label className="field">
          <span>Standard monthly hours</span>
          <input type="number" min="1" value={form.standard_monthly_hours} onChange={(e) => setForm({ ...form, standard_monthly_hours: e.target.value })} />
        </label>
        <label className="field">
          <span>Standard monthly days</span>
          <input type="number" min="1" value={form.standard_monthly_days} onChange={(e) => setForm({ ...form, standard_monthly_days: e.target.value })} />
        </label>
      </div>

      <label className="field">
        <span>EOBI minimum wage base (Rs.)</span>
        <input type="number" min="0" value={form.eobi_minimum_wage_base} onChange={(e) => setForm({ ...form, eobi_minimum_wage_base: e.target.value })} />
      </label>

      {error && <p className="field-error">{error}</p>}

      <button type="submit" className="btn-primary" disabled={saving} style={{ alignSelf: 'flex-start' }}>
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}

/* =========================== ORG STRUCTURE =========================== */

function StructureTab() {
  const { company } = useAuth()
  const [departments, setDepartments] = useState([])
  const [designations, setDesignations] = useState([])
  const [employmentTypes, setEmploymentTypes] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: d }, { data: des }, { data: et }, { data: b }] = await Promise.all([
      supabase.from('departments').select('id, name, status').order('name'),
      supabase.from('designations').select('id, name, status').order('name'),
      supabase.from('employment_types').select('id, name').order('name'),
      supabase.from('branches').select('id, name, city, is_head_office').order('name'),
    ])
    setDepartments(d ?? [])
    setDesignations(des ?? [])
    setEmploymentTypes(et ?? [])
    setBranches(b ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <p className="muted" style={{ marginTop: 20 }}>Loading…</p>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <SimpleLookupCard
        title="Departments"
        rows={departments}
        renderRow={(r) => r.name}
        table="departments"
        company={company}
        onChanged={load}
      />
      <SimpleLookupCard
        title="Designations"
        rows={designations}
        renderRow={(r) => r.name}
        table="designations"
        company={company}
        onChanged={load}
      />
      <SimpleLookupCard
        title="Employment types"
        rows={employmentTypes}
        renderRow={(r) => r.name}
        table="employment_types"
        company={company}
        onChanged={load}
      />
      <BranchesCard rows={branches} company={company} onChanged={load} />
    </div>
  )
}

function SimpleLookupCard({ title, rows, renderRow, table, company, onChanged }) {
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  async function add() {
    if (!newName.trim()) return
    setSaving(true)
    await supabase.from(table).insert({ company_id: company.id, name: newName.trim() })
    setSaving(false)
    setNewName('')
    onChanged()
  }

  return (
    <div className="report-section" style={{ marginBottom: 0 }}>
      <p className="section-heading">{title}</p>
      {rows.length === 0 ? (
        <p className="muted">None yet.</p>
      ) : (
        rows.map((r) => (
          <div key={r.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--line)', fontSize: 14 }}>
            {renderRow(r)}
          </div>
        ))
      )}
      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        <input
          placeholder={`New ${title.toLowerCase().replace(/s$/, '')}`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button type="button" className="btn-primary" style={{ padding: '8px 12px' }} disabled={saving} onClick={add}>
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}

function BranchesCard({ rows, company, onChanged }) {
  const [form, setForm] = useState({ name: '', city: '', is_head_office: false })
  const [saving, setSaving] = useState(false)

  async function add() {
    if (!form.name.trim()) return
    setSaving(true)
    await supabase.from('branches').insert({ company_id: company.id, name: form.name.trim(), city: form.city || null, is_head_office: form.is_head_office })
    setSaving(false)
    setForm({ name: '', city: '', is_head_office: false })
    onChanged()
  }

  return (
    <div className="report-section" style={{ marginBottom: 0 }}>
      <p className="section-heading">Branches</p>
      {rows.length === 0 ? (
        <p className="muted">None yet.</p>
      ) : (
        rows.map((r) => (
          <div key={r.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--line)', fontSize: 14 }}>
            {r.name}{r.city ? ` · ${r.city}` : ''}{r.is_head_office ? ' · HQ' : ''}
          </div>
        ))
      )}
      <div className="field-row" style={{ marginTop: 12 }}>
        <input placeholder="Branch name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginTop: 8 }}>
        <input type="checkbox" checked={form.is_head_office} onChange={(e) => setForm({ ...form, is_head_office: e.target.checked })} />
        Head office
      </label>
      <button type="button" className="btn-primary" style={{ marginTop: 8, alignSelf: 'flex-start' }} disabled={saving} onClick={add}>
        {saving ? 'Adding…' : 'Add branch'}
      </button>
    </div>
  )
}

/* =========================== SHIFTS & HOLIDAYS =========================== */

function ShiftsTab() {
  const { company } = useAuth()
  const [shifts, setShifts] = useState([])
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(true)

  const [shiftDrawerOpen, setShiftDrawerOpen] = useState(false)
  const [shiftForm, setShiftForm] = useState({ name: '', start_time: '09:00', end_time: '18:00', break_minutes: 60, grace_period_minutes: 10, overtime_eligible: true, working_days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA'] })
  const [shiftSaving, setShiftSaving] = useState(false)
  const [shiftError, setShiftError] = useState(null)

  const [holidayDrawerOpen, setHolidayDrawerOpen] = useState(false)
  const [holidayForm, setHolidayForm] = useState({ name: '', holiday_date: '' })
  const [holidaySaving, setHolidaySaving] = useState(false)
  const [holidayError, setHolidayError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: s }, { data: h }] = await Promise.all([
      supabase.from('shifts').select('id, name, start_time, end_time, break_minutes, grace_period_minutes, overtime_eligible, working_days, status').order('name'),
      supabase.from('holidays').select('id, name, holiday_date').order('holiday_date'),
    ])
    setShifts(s ?? [])
    setHolidays(h ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function toggleDay(code) {
    setShiftForm((f) => ({
      ...f,
      working_days: f.working_days.includes(code) ? f.working_days.filter((d) => d !== code) : [...f.working_days, code],
    }))
  }

  async function handleShiftSubmit(e) {
    e.preventDefault()
    setShiftError(null)
    setShiftSaving(true)
    const { error: saveError } = await supabase.from('shifts').insert({
      company_id: company.id,
      name: shiftForm.name,
      start_time: shiftForm.start_time,
      end_time: shiftForm.end_time,
      break_minutes: Number(shiftForm.break_minutes),
      grace_period_minutes: Number(shiftForm.grace_period_minutes),
      overtime_eligible: shiftForm.overtime_eligible,
      working_days: shiftForm.working_days,
    })
    setShiftSaving(false)
    if (saveError) {
      setShiftError(saveError.message)
      return
    }
    setShiftDrawerOpen(false)
    setShiftForm({ name: '', start_time: '09:00', end_time: '18:00', break_minutes: 60, grace_period_minutes: 10, overtime_eligible: true, working_days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA'] })
    load()
  }

  async function handleHolidaySubmit(e) {
    e.preventDefault()
    setHolidayError(null)
    setHolidaySaving(true)
    const { error: saveError } = await supabase.from('holidays').insert({
      company_id: company.id,
      name: holidayForm.name,
      holiday_date: holidayForm.holiday_date,
    })
    setHolidaySaving(false)
    if (saveError) {
      setHolidayError(saveError.message)
      return
    }
    setHolidayDrawerOpen(false)
    setHolidayForm({ name: '', holiday_date: '' })
    load()
  }

  if (loading) return <p className="muted" style={{ marginTop: 20 }}>Loading…</p>

  return (
    <>
      <div className="page-header-row" style={{ marginTop: 0 }}>
        <p className="section-heading" style={{ margin: 0 }}>Shifts</p>
        <button className="btn-primary btn-icon" onClick={() => setShiftDrawerOpen(true)}>
          <Plus size={16} /> New shift
        </button>
      </div>

      {shifts.length === 0 ? (
        <div className="empty-state"><p>No shifts yet.</p></div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Hours</th>
              <th>Break</th>
              <th>Grace</th>
              <th>Working days</th>
              <th>OT eligible</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => (
              <tr key={s.id} style={{ cursor: 'default' }}>
                <td>{s.name}</td>
                <td className="mono">{s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}</td>
                <td className="mono">{s.break_minutes}m</td>
                <td className="mono">{s.grace_period_minutes}m</td>
                <td>{s.working_days.join(', ')}</td>
                <td>{s.overtime_eligible ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="page-header-row" style={{ marginTop: 28 }}>
        <p className="section-heading" style={{ margin: 0 }}>Holidays</p>
        <button className="btn-primary btn-icon" onClick={() => setHolidayDrawerOpen(true)}>
          <Plus size={16} /> New holiday
        </button>
      </div>

      {holidays.length === 0 ? (
        <div className="empty-state"><p>No holidays added yet.</p></div>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Date</th></tr>
          </thead>
          <tbody>
            {holidays.map((h) => (
              <tr key={h.id} style={{ cursor: 'default' }}>
                <td>{h.name}</td>
                <td className="mono">{formatDate(h.holiday_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Drawer open={shiftDrawerOpen} onClose={() => setShiftDrawerOpen(false)} title="New shift">
        <form onSubmit={handleShiftSubmit} className="drawer-form">
          <label className="field">
            <span>Name</span>
            <input required placeholder="e.g. General Shift" value={shiftForm.name} onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })} />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Start time</span>
              <input type="time" required value={shiftForm.start_time} onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })} />
            </label>
            <label className="field">
              <span>End time</span>
              <input type="time" required value={shiftForm.end_time} onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })} />
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Break (minutes)</span>
              <input type="number" min="0" value={shiftForm.break_minutes} onChange={(e) => setShiftForm({ ...shiftForm, break_minutes: e.target.value })} />
            </label>
            <label className="field">
              <span>Grace period (minutes)</span>
              <input type="number" min="0" value={shiftForm.grace_period_minutes} onChange={(e) => setShiftForm({ ...shiftForm, grace_period_minutes: e.target.value })} />
            </label>
          </div>
          <div className="field">
            <span>Working days</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              {DAYS.map((d) => (
                <label key={d.code} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                  <input type="checkbox" checked={shiftForm.working_days.includes(d.code)} onChange={() => toggleDay(d.code)} />
                  {d.label}
                </label>
              ))}
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={shiftForm.overtime_eligible} onChange={(e) => setShiftForm({ ...shiftForm, overtime_eligible: e.target.checked })} />
            Overtime eligible
          </label>
          {shiftError && <p className="field-error">{shiftError}</p>}
          <button type="submit" className="btn-primary" disabled={shiftSaving}>{shiftSaving ? 'Creating…' : 'Create shift'}</button>
        </form>
      </Drawer>

      <Drawer open={holidayDrawerOpen} onClose={() => setHolidayDrawerOpen(false)} title="New holiday">
        <form onSubmit={handleHolidaySubmit} className="drawer-form">
          <label className="field">
            <span>Name</span>
            <input required placeholder="e.g. Independence Day" value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} />
          </label>
          <label className="field">
            <span>Date</span>
            <input type="date" required value={holidayForm.holiday_date} onChange={(e) => setHolidayForm({ ...holidayForm, holiday_date: e.target.value })} />
          </label>
          {holidayError && <p className="field-error">{holidayError}</p>}
          <button type="submit" className="btn-primary" disabled={holidaySaving}>{holidaySaving ? 'Adding…' : 'Add holiday'}</button>
        </form>
      </Drawer>
    </>
  )
}

/* =========================== PAYROLL COMPONENTS =========================== */

function PayrollComponentsTab() {
  const { company } = useAuth()
  const [components, setComponents] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState({ name: '', component_type: 'earning', calculation_method: 'fixed', percentage: '', taxable: true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('payroll_components')
      .select('id, name, component_type, calculation_method, percentage, taxable, is_basic, is_statutory, status')
      .order('component_type')
      .order('name')
    setComponents(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const { error: saveError } = await supabase.from('payroll_components').insert({
      company_id: company.id,
      name: form.name,
      component_type: form.component_type,
      calculation_method: form.calculation_method,
      percentage: form.calculation_method === 'percentage' ? Number(form.percentage) : null,
      taxable: form.taxable,
    })
    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setDrawerOpen(false)
    setForm({ name: '', component_type: 'earning', calculation_method: 'fixed', percentage: '', taxable: true })
    load()
  }

  if (loading) return <p className="muted" style={{ marginTop: 20 }}>Loading…</p>

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
        <button className="btn-primary btn-icon" onClick={() => setDrawerOpen(true)}>
          <Plus size={16} /> New component
        </button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Method</th>
            <th>Taxable</th>
            <th>Flags</th>
          </tr>
        </thead>
        <tbody>
          {components.map((c) => (
            <tr key={c.id} style={{ cursor: 'default' }}>
              <td>{c.name}</td>
              <td style={{ textTransform: 'capitalize' }}>{c.component_type}</td>
              <td>{c.calculation_method === 'percentage' ? `${c.percentage}%` : 'Fixed'}</td>
              <td>{c.taxable ? 'Yes' : 'No'}</td>
              <td className="muted" style={{ fontSize: 12 }}>
                {c.is_basic ? 'Basic · ' : ''}{c.is_statutory ? 'Statutory' : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="New payroll component">
        <form onSubmit={handleSubmit} className="drawer-form">
          <label className="field">
            <span>Name</span>
            <input required placeholder="e.g. Fuel Allowance" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Type</span>
              <select value={form.component_type} onChange={(e) => setForm({ ...form, component_type: e.target.value })}>
                <option value="earning">Earning</option>
                <option value="deduction">Deduction</option>
              </select>
            </label>
            <label className="field">
              <span>Method</span>
              <select value={form.calculation_method} onChange={(e) => setForm({ ...form, calculation_method: e.target.value })}>
                <option value="fixed">Fixed amount</option>
                <option value="percentage">% of basic</option>
              </select>
            </label>
          </div>
          {form.calculation_method === 'percentage' && (
            <label className="field">
              <span>Percentage</span>
              <input type="number" min="0" max="100" step="0.1" value={form.percentage} onChange={(e) => setForm({ ...form, percentage: e.target.value })} />
            </label>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={form.taxable} onChange={(e) => setForm({ ...form, taxable: e.target.checked })} />
            Taxable
          </label>
          {error && <p className="field-error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create component'}</button>
        </form>
      </Drawer>
    </>
  )
}

/* =========================== ROLES & USERS =========================== */

function RolesTab() {
  const { company, profile } = useAuth()
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [rolePermissions, setRolePermissions] = useState([])
  const [users, setUsers] = useState([])
  const [userRoles, setUserRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRoleId, setSelectedRoleId] = useState(null)

  const [newRoleName, setNewRoleName] = useState('')
  const [creatingRole, setCreatingRole] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: r }, { data: p }, { data: rp }, { data: u }, { data: ur }] = await Promise.all([
      supabase.from('roles').select('id, name, is_system_role, company_id').order('is_system_role', { ascending: false }).order('name'),
      supabase.from('permissions').select('id, resource, action, description').order('resource').order('action'),
      supabase.from('role_permissions').select('role_id, permission_id'),
      supabase.from('profiles').select('id, full_name, email, status').eq('company_id', company.id).order('full_name'),
      supabase.from('user_roles').select('id, user_id, role_id'),
    ])
    setRoles(r ?? [])
    setPermissions(p ?? [])
    setRolePermissions(rp ?? [])
    setUsers(u ?? [])
    setUserRoles(ur ?? [])
    setLoading(false)
  }, [company.id])

  useEffect(() => {
    load()
  }, [load])

  async function createRole() {
    if (!newRoleName.trim()) return
    setCreatingRole(true)
    const { data, error } = await supabase.from('roles').insert({ company_id: company.id, name: newRoleName.trim() }).select().single()
    setCreatingRole(false)
    if (!error && data) {
      setNewRoleName('')
      await load()
      setSelectedRoleId(data.id)
    }
  }

  async function togglePermission(roleId, permissionId, enabled) {
    if (enabled) {
      await supabase.from('role_permissions').insert({ role_id: roleId, permission_id: permissionId })
    } else {
      await supabase.from('role_permissions').delete().eq('role_id', roleId).eq('permission_id', permissionId)
    }
    load()
  }

  async function assignRole(userId, roleId) {
    const existing = userRoles.find((ur) => ur.user_id === userId)
    if (existing) {
      await supabase.from('user_roles').update({ role_id: roleId }).eq('id', existing.id)
    } else {
      await supabase.from('user_roles').insert({ company_id: company.id, user_id: userId, role_id: roleId })
    }
    load()
  }

  if (loading) return <p className="muted" style={{ marginTop: 20 }}>Loading…</p>

  const selectedRole = roles.find((r) => r.id === selectedRoleId)
  const enabledPermissionIds = new Set(rolePermissions.filter((rp) => rp.role_id === selectedRoleId).map((rp) => rp.permission_id))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
      <div>
        <p className="section-heading">Roles</p>
        {roles.map((r) => (
          <button
            key={r.id}
            className={`tab-button${selectedRoleId === r.id ? ' active' : ''}`}
            style={{ display: 'block', width: '100%', textAlign: 'left', marginRight: 0, borderBottom: 'none', padding: '8px 6px' }}
            onClick={() => setSelectedRoleId(r.id)}
          >
            {r.name}{r.is_system_role ? <span className="muted" style={{ fontSize: 11 }}> · system</span> : ''}
          </button>
        ))}
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          <input placeholder="New role" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createRole()} />
          <button type="button" className="btn-primary" style={{ padding: '8px 12px' }} disabled={creatingRole} onClick={createRole}>
            <Plus size={14} />
          </button>
        </div>

        <p className="section-heading" style={{ marginTop: 28 }}>Users</p>
        {users.map((u) => {
          const current = userRoles.find((ur) => ur.user_id === u.id)?.role_id || ''
          return (
            <div key={u.id} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{u.full_name || u.email}</div>
              <select value={current} onChange={(e) => assignRole(u.id, e.target.value)} style={{ fontSize: 12, marginTop: 2 }}>
                <option value="">— No role —</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          )
        })}
        <p className="muted" style={{ fontSize: 12 }}>
          Adding brand-new users isn't wired up yet — that needs an invite flow we haven't built.
        </p>
      </div>

      <div>
        {!selectedRole ? (
          <p className="muted">Select a role to view or edit its permissions.</p>
        ) : (
          <>
            <p className="section-heading">{selectedRole.name} permissions</p>
            {selectedRole.is_system_role ? (
              <p className="muted">System roles can't be edited.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Resource</th><th>Action</th><th>Description</th><th></th></tr>
                </thead>
                <tbody>
                  {permissions.map((p) => (
                    <tr key={p.id} style={{ cursor: 'default' }}>
                      <td style={{ textTransform: 'capitalize' }}>{p.resource}</td>
                      <td style={{ textTransform: 'capitalize' }}>{p.action}</td>
                      <td className="muted" style={{ fontSize: 12 }}>{p.description}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={enabledPermissionIds.has(p.id)}
                          onChange={(e) => togglePermission(selectedRoleId, p.id, e.target.checked)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  )
}
