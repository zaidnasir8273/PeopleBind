import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Loader2, Clock, User, Trash2, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'
import { SkeletonBlock, SkeletonTable } from '../components/Skeleton'

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
          <h1 className="page-title">Settings</h1>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-button${tab === 'company' ? ' active' : ''}`} onClick={() => setTab('company')}>Company</button>
        <button className={`tab-button${tab === 'structure' ? ' active' : ''}`} onClick={() => setTab('structure')}>Org structure</button>
        <button className={`tab-button${tab === 'shifts' ? ' active' : ''}`} onClick={() => setTab('shifts')}>Shifts & holidays</button>
        <button className={`tab-button${tab === 'leave' ? ' active' : ''}`} onClick={() => setTab('leave')}>Leave</button>
        <button className={`tab-button${tab === 'payroll' ? ' active' : ''}`} onClick={() => setTab('payroll')}>Payroll components</button>
        <button className={`tab-button${tab === 'tax' ? ' active' : ''}`} onClick={() => setTab('tax')}>Tax slabs</button>
        <button className={`tab-button${tab === 'roles' ? ' active' : ''}`} onClick={() => setTab('roles')}>Roles & users</button>
        <button className={`tab-button${tab === 'audit' ? ' active' : ''}`} onClick={() => setTab('audit')}>Audit log</button>
        <button className={`tab-button${tab === 'onboarding' ? ' active' : ''}`} onClick={() => setTab('onboarding')}>Onboarding templates</button>
        <button className={`tab-button${tab === 'timesheets' ? ' active' : ''}`} onClick={() => setTab('timesheets')}>Timesheets</button>
        <button className={`tab-button${tab === 'support' ? ' active' : ''}`} onClick={() => setTab('support')}>Support</button>
      </div>

      {tab === 'company' && <CompanyTab />}
      {tab === 'structure' && <StructureTab />}
      {tab === 'shifts' && <ShiftsTab />}
      {tab === 'leave' && <LeaveTab />}
      {tab === 'payroll' && <PayrollComponentsTab />}
      {tab === 'tax' && <TaxSlabsTab />}
      {tab === 'roles' && <RolesTab />}
      {tab === 'audit' && <AuditLogTab />}
      {tab === 'onboarding' && <OnboardingTemplatesTab />}
      {tab === 'timesheets' && <TimesheetsSetupTab />}
      {tab === 'support' && <SupportTab />}
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

  if (!form) return <SkeletonBlock rows={6} />

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
      toast.error(saveError.message)
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
        {saving && <Loader2 size={14} className="btn-spinner" />}
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
  const [teams, setTeams] = useState([])
  const [employmentTypes, setEmploymentTypes] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: d }, { data: des }, { data: tm }, { data: et }, { data: b }] = await Promise.all([
      supabase.from('departments').select('id, name, status').order('name'),
      supabase.from('designations').select('id, name, status').order('name'),
      supabase.from('teams').select('id, name, status').order('name'),
      supabase.from('employment_types').select('id, name').order('name'),
      supabase.from('branches').select('id, name, city, is_head_office').order('name'),
    ])
    setDepartments(d ?? [])
    setDesignations(des ?? [])
    setTeams(tm ?? [])
    setEmploymentTypes(et ?? [])
    setBranches(b ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <SkeletonBlock rows={6} />

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
        title="Teams"
        rows={teams}
        renderRow={(r) => r.name}
        table="teams"
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
  const [removingId, setRemovingId] = useState(null)

  async function add() {
    if (!newName.trim()) return
    setSaving(true)
    await supabase.from(table).insert({ company_id: company.id, name: newName.trim() })
    setSaving(false)
    setNewName('')
    onChanged()
  }

  async function remove(id) {
    setRemovingId(id)
    const { error } = await supabase.from(table).delete().eq('id', id)
    setRemovingId(null)
    if (error) {
      if (error.code === '23503') {
        toast.error("Can't remove — still assigned to one or more employees.")
      } else {
        toast.error(error.message || 'Failed to remove')
      }
      return
    }
    toast.success('Removed')
    onChanged()
  }

  return (
    <div className="report-section" style={{ marginBottom: 0 }}>
      <p className="section-heading">{title}</p>
      {rows.length === 0 ? (
        <p className="muted">None yet.</p>
      ) : (
        <div className="lookup-list">
          {rows.map((r) => (
            <div key={r.id} className="lookup-row">
              <span>{renderRow(r)}</span>
              <button
                type="button"
                className="btn-icon-round reject lookup-row-remove"
                onClick={() => remove(r.id)}
                disabled={removingId === r.id}
                aria-label="Remove"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="lookup-add">
        <input
          placeholder={`New ${title.toLowerCase().replace(/s$/, '')}`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button type="button" className="lookup-add-btn" disabled={saving} onClick={add} aria-label={`Add ${title.toLowerCase().replace(/s$/, '')}`}>
          <Plus size={15} />
        </button>
      </div>
    </div>
  )
}

function BranchesCard({ rows, company, onChanged }) {
  const [form, setForm] = useState({ name: '', city: '', is_head_office: false })
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState(null)

  async function add() {
    if (!form.name.trim()) return
    setSaving(true)
    await supabase.from('branches').insert({ company_id: company.id, name: form.name.trim(), city: form.city || null, is_head_office: form.is_head_office })
    setSaving(false)
    setForm({ name: '', city: '', is_head_office: false })
    onChanged()
  }

  async function remove(id) {
    setRemovingId(id)
    const { error } = await supabase.from('branches').delete().eq('id', id)
    setRemovingId(null)
    if (error) {
      if (error.code === '23503') {
        toast.error("Can't remove — still assigned to one or more employees.")
      } else {
        toast.error(error.message || 'Failed to remove')
      }
      return
    }
    toast.success('Removed')
    onChanged()
  }

  return (
    <div className="report-section" style={{ marginBottom: 0 }}>
      <p className="section-heading">Branches</p>
      {rows.length === 0 ? (
        <p className="muted">None yet.</p>
      ) : (
        <div className="lookup-list">
          {rows.map((r) => (
            <div key={r.id} className="lookup-row">
              <span>{r.name}{r.city ? ` · ${r.city}` : ''}{r.is_head_office ? ' · HQ' : ''}</span>
              <button
                type="button"
                className="btn-icon-round reject lookup-row-remove"
                onClick={() => remove(r.id)}
                disabled={removingId === r.id}
                aria-label="Remove"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="lookup-add-group">
        <div className="field-row" style={{ marginBottom: 0 }}>
          <input className="input-ghost" placeholder="Branch name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input-ghost" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={form.is_head_office} onChange={(e) => setForm({ ...form, is_head_office: e.target.checked })} />
          Head office
        </label>
        <button type="button" className="btn-primary" style={{ alignSelf: 'flex-start' }} disabled={saving} onClick={add}>
          {saving ? 'Adding…' : 'Add branch'}
        </button>
      </div>
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
      toast.error(saveError.message)
      return
    }
    toast.success('Shift created')
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
      toast.error(saveError.message)
      return
    }
    toast.success('Holiday added')
    setHolidayDrawerOpen(false)
    setHolidayForm({ name: '', holiday_date: '' })
    load()
  }

  if (loading) return <SkeletonTable rows={4} columns={6} />

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
          <button type="submit" className="btn-primary" disabled={shiftSaving}>
            {shiftSaving && <Loader2 size={14} className="btn-spinner" />}
            {shiftSaving ? 'Creating…' : 'Create shift'}
          </button>
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
          <button type="submit" className="btn-primary" disabled={holidaySaving}>
            {holidaySaving && <Loader2 size={14} className="btn-spinner" />}
            {holidaySaving ? 'Adding…' : 'Add holiday'}
          </button>
        </form>
      </Drawer>
    </>
  )
}

/* =========================== LEAVE =========================== */

function LeaveTab() {
  const { company } = useAuth()
  const [leaveTypes, setLeaveTypes] = useState([])
  const [policies, setPolicies] = useState([])
  const [employmentTypes, setEmploymentTypes] = useState([])
  const [loading, setLoading] = useState(true)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState({
    leave_type_id: '',
    employment_type_id: '',
    name: '',
    annual_entitlement_days: '',
    carry_forward_enabled: false,
    carry_forward_max_days: '0',
    requires_approval: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: lt }, { data: p }, { data: et }] = await Promise.all([
      supabase.from('leave_types').select('id, name, is_paid').order('name'),
      supabase
        .from('leave_policies')
        .select('id, name, annual_entitlement_days, carry_forward_enabled, carry_forward_max_days, requires_approval, leave_types(name), employment_types(name)')
        .order('name'),
      supabase.from('employment_types').select('id, name').order('name'),
    ])
    setLeaveTypes(lt ?? [])
    setPolicies(p ?? [])
    setEmploymentTypes(et ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openAdd() {
    setForm({
      leave_type_id: leaveTypes[0]?.id ?? '',
      employment_type_id: '',
      name: '',
      annual_entitlement_days: '',
      carry_forward_enabled: false,
      carry_forward_max_days: '0',
      requires_approval: true,
    })
    setError(null)
    setDrawerOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.leave_type_id) {
      setError('Pick a leave type first')
      return
    }
    setError(null)
    setSaving(true)

    const { error: saveError } = await supabase.from('leave_policies').insert({
      company_id: company.id,
      leave_type_id: form.leave_type_id,
      employment_type_id: form.employment_type_id || null,
      name: form.name.trim(),
      annual_entitlement_days: Number(form.annual_entitlement_days || 0),
      carry_forward_enabled: form.carry_forward_enabled,
      carry_forward_max_days: form.carry_forward_enabled ? Number(form.carry_forward_max_days || 0) : 0,
      requires_approval: form.requires_approval,
    })

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      toast.error(saveError.message)
      return
    }

    toast.success('Leave policy added')
    setDrawerOpen(false)
    load()
  }

  async function removePolicy(id) {
    const { error: removeError } = await supabase.from('leave_policies').delete().eq('id', id)
    if (removeError) {
      toast.error(removeError.message || 'Failed to remove')
      return
    }
    toast.success('Policy removed')
    load()
  }

  if (loading) return <SkeletonBlock rows={6} />

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <LeaveTypesCard rows={leaveTypes} company={company} onChanged={load} />
        <div className="report-section" style={{ marginBottom: 0 }}>
          <p className="section-heading">How this fits together</p>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            <strong>Leave types</strong> are the categories employees request against (Casual, Sick, Annual…).
            <strong style={{ display: 'block', marginTop: 8 }}>Leave policies</strong> say how many days of a
            given type an employment type gets each year, whether unused days carry forward, and whether a
            request needs approval. A policy with no employment type set applies to everyone. Balances for each
            employee are generated from whichever policy matches their leave type and employment type.
          </p>
        </div>
      </div>

      <div className="page-header-row" style={{ marginTop: 0 }}>
        <p className="section-heading" style={{ margin: 0 }}>Leave policies</p>
        <button className="btn-primary btn-icon" onClick={openAdd} disabled={leaveTypes.length === 0}>
          <Plus size={16} /> New policy
        </button>
      </div>

      {leaveTypes.length === 0 ? (
        <div className="empty-state">
          <p>Add a leave type first.</p>
          <p className="muted">Policies are always attached to a leave type — create Casual, Sick, Annual, etc. on the left before setting entitlements.</p>
        </div>
      ) : policies.length === 0 ? (
        <div className="empty-state">
          <p>No leave policies yet.</p>
          <p className="muted">Without a policy, employees have no entitlement to accrue and leave requests will draw down a zero balance.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Policy</th>
              <th>Leave type</th>
              <th>Employment type</th>
              <th>Days/year</th>
              <th>Carry forward</th>
              <th>Approval</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p) => (
              <tr key={p.id} style={{ cursor: 'default' }}>
                <td>{p.name}</td>
                <td>{p.leave_types?.name ?? '—'}</td>
                <td>{p.employment_types?.name ?? 'All'}</td>
                <td className="mono">{p.annual_entitlement_days}</td>
                <td>{p.carry_forward_enabled ? `Up to ${p.carry_forward_max_days}` : 'No'}</td>
                <td>{p.requires_approval ? 'Required' : 'Auto'}</td>
                <td>
                  <button
                    type="button"
                    className="btn-icon-round reject"
                    onClick={() => removePolicy(p.id)}
                    aria-label="Remove policy"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="New leave policy">
        <form onSubmit={handleSubmit} className="drawer-form">
          <label className="field">
            <span>Policy name</span>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Casual — Full-Time" />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Leave type</span>
              <select required value={form.leave_type_id} onChange={(e) => setForm({ ...form, leave_type_id: e.target.value })}>
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>{lt.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Employment type</span>
              <select value={form.employment_type_id} onChange={(e) => setForm({ ...form, employment_type_id: e.target.value })}>
                <option value="">All employment types</option>
                {employmentTypes.map((et) => (
                  <option key={et.id} value={et.id}>{et.name}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span>Annual entitlement (days)</span>
            <input type="number" min="0" step="0.5" required value={form.annual_entitlement_days} onChange={(e) => setForm({ ...form, annual_entitlement_days: e.target.value })} />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={form.requires_approval} onChange={(e) => setForm({ ...form, requires_approval: e.target.checked })} />
            Requires manager/admin approval
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={form.carry_forward_enabled} onChange={(e) => setForm({ ...form, carry_forward_enabled: e.target.checked })} />
            Unused days carry forward to next year
          </label>

          {form.carry_forward_enabled && (
            <label className="field">
              <span>Max carry-forward days</span>
              <input type="number" min="0" step="0.5" value={form.carry_forward_max_days} onChange={(e) => setForm({ ...form, carry_forward_max_days: e.target.value })} />
            </label>
          )}

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={14} className="btn-spinner" />}
            {saving ? 'Adding…' : 'Add policy'}
          </button>
        </form>
      </Drawer>
    </>
  )
}

function LeaveTypesCard({ rows, company, onChanged }) {
  const [form, setForm] = useState({ name: '', is_paid: true })
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState(null)

  async function add() {
    if (!form.name.trim()) return
    setSaving(true)
    const { error } = await supabase.from('leave_types').insert({ company_id: company.id, name: form.name.trim(), is_paid: form.is_paid })
    setSaving(false)
    if (error) {
      toast.error(error.message || 'Failed to add leave type')
      return
    }
    setForm({ name: '', is_paid: true })
    onChanged()
  }

  async function remove(id) {
    setRemovingId(id)
    const { error } = await supabase.from('leave_types').delete().eq('id', id)
    setRemovingId(null)
    if (error) {
      if (error.code === '23503') {
        toast.error("Can't remove — still used by a policy, balance, or leave request.")
      } else {
        toast.error(error.message || 'Failed to remove')
      }
      return
    }
    toast.success('Removed')
    onChanged()
  }

  return (
    <div className="report-section" style={{ marginBottom: 0 }}>
      <p className="section-heading">Leave types</p>
      {rows.length === 0 ? (
        <p className="muted">None yet.</p>
      ) : (
        <div className="lookup-list">
          {rows.map((r) => (
            <div key={r.id} className="lookup-row">
              <span>{r.name}{!r.is_paid && <span className="muted" style={{ marginLeft: 6 }}>· unpaid</span>}</span>
              <button
                type="button"
                className="btn-icon-round reject lookup-row-remove"
                onClick={() => remove(r.id)}
                disabled={removingId === r.id}
                aria-label="Remove"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="lookup-add-group">
        <input
          className="input-ghost"
          placeholder="New leave type (e.g. Casual)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={form.is_paid} onChange={(e) => setForm({ ...form, is_paid: e.target.checked })} />
          Paid leave
        </label>
        <button type="button" className="btn-primary" style={{ alignSelf: 'flex-start' }} disabled={saving} onClick={add}>
          {saving ? 'Adding…' : 'Add leave type'}
        </button>
      </div>
    </div>
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
      toast.error(saveError.message)
      return
    }
    toast.success('Payroll component created')
    setDrawerOpen(false)
    setForm({ name: '', component_type: 'earning', calculation_method: 'fixed', percentage: '', taxable: true })
    load()
  }

  if (loading) return <SkeletonTable rows={5} columns={5} />

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
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={14} className="btn-spinner" />}
            {saving ? 'Creating…' : 'Create component'}
          </button>
        </form>
      </Drawer>
    </>
  )
}

/* =========================== TAX SLABS =========================== */

function fmtMoney(n) {
  if (n === null || n === undefined) return 'No cap'
  return 'Rs. ' + Number(n).toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

function TaxSlabsTab() {
  const { company } = useAuth()
  const [slabs, setSlabs] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState({ effective_from: '', effective_to: '', min_annual_income: '', max_annual_income: '', rate_percent: '', fixed_amount: '0' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('tax_slabs')
      .select('id, effective_from, effective_to, min_annual_income, max_annual_income, rate_percent, fixed_amount')
      .order('effective_from', { ascending: false })
      .order('min_annual_income', { ascending: true })
    setSlabs(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const periods = {}
  for (const s of slabs) {
    const key = `${s.effective_from}_${s.effective_to ?? 'open'}`
    if (!periods[key]) periods[key] = { effective_from: s.effective_from, effective_to: s.effective_to, rows: [] }
    periods[key].rows.push(s)
  }
  const periodList = Object.values(periods)

  function openAdd() {
    setForm({
      effective_from: periodList[0]?.effective_from || new Date().toISOString().slice(0, 10),
      effective_to: '',
      min_annual_income: '',
      max_annual_income: '',
      rate_percent: '',
      fixed_amount: '0',
    })
    setError(null)
    setDrawerOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const { error: saveError } = await supabase.from('tax_slabs').insert({
      company_id: company.id,
      effective_from: form.effective_from,
      effective_to: form.effective_to || null,
      min_annual_income: Number(form.min_annual_income),
      max_annual_income: form.max_annual_income ? Number(form.max_annual_income) : null,
      rate_percent: Number(form.rate_percent),
      fixed_amount: Number(form.fixed_amount || 0),
    })

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      toast.error(saveError.message)
      return
    }

    toast.success('Tax bracket added')
    setDrawerOpen(false)
    load()
  }

  if (loading) return <SkeletonTable rows={4} columns={4} />

  return (
    <>
      <p className="muted" style={{ marginTop: 0 }}>
        These brackets are what every payroll run's income tax deduction is calculated from — if a period has no brackets covering an employee's income, their tax silently comes out as zero. Update this whenever FBR publishes new slabs.
      </p>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
        <button className="btn-primary btn-icon" onClick={openAdd}>
          <Plus size={16} /> Add bracket
        </button>
      </div>

      {periodList.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>No tax brackets configured.</p>
          <p className="muted">Payroll can't calculate income tax until at least one bracket set exists.</p>
        </div>
      ) : (
        periodList.map((period) => (
          <div key={`${period.effective_from}_${period.effective_to}`} style={{ marginBottom: 24 }}>
            <p className="section-heading" style={{ marginBottom: 8 }}>
              {formatDate(period.effective_from)} {period.effective_to ? `– ${formatDate(period.effective_to)}` : '(current)'}
            </p>
            <table className="data-table">
              <thead>
                <tr><th>Annual income from</th><th>Annual income to</th><th>Rate</th><th>Fixed amount</th></tr>
              </thead>
              <tbody>
                {period.rows.map((s) => (
                  <tr key={s.id} style={{ cursor: 'default' }}>
                    <td className="mono">{fmtMoney(s.min_annual_income)}</td>
                    <td className="mono">{fmtMoney(s.max_annual_income)}</td>
                    <td className="mono">{s.rate_percent}%</td>
                    <td className="mono">{fmtMoney(s.fixed_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Add tax bracket">
        <form onSubmit={handleSubmit} className="drawer-form">
          <div className="field-row">
            <label className="field">
              <span>Effective from</span>
              <input type="date" required value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} />
            </label>
            <label className="field">
              <span>Effective to</span>
              <input type="date" value={form.effective_to} onChange={(e) => setForm({ ...form, effective_to: e.target.value })} placeholder="Open-ended" />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Annual income from (Rs.)</span>
              <input type="number" min="0" required value={form.min_annual_income} onChange={(e) => setForm({ ...form, min_annual_income: e.target.value })} />
            </label>
            <label className="field">
              <span>Annual income to (Rs.)</span>
              <input type="number" min="0" value={form.max_annual_income} onChange={(e) => setForm({ ...form, max_annual_income: e.target.value })} placeholder="No cap" />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Rate (%)</span>
              <input type="number" min="0" max="100" step="0.1" required value={form.rate_percent} onChange={(e) => setForm({ ...form, rate_percent: e.target.value })} />
            </label>
            <label className="field">
              <span>Fixed amount (Rs.)</span>
              <input type="number" min="0" value={form.fixed_amount} onChange={(e) => setForm({ ...form, fixed_amount: e.target.value })} />
            </label>
          </div>

          <p className="muted" style={{ margin: 0 }}>
            Tax for this bracket = fixed amount + rate% × (annual income − "from"). Matches FBR's own slab format.
          </p>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={14} className="btn-spinner" />}
            {saving ? 'Adding…' : 'Add bracket'}
          </button>
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
      toast.success('Role created')
      setNewRoleName('')
      await load()
      setSelectedRoleId(data.id)
    } else if (error) {
      toast.error(error.message)
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

  if (loading) return <SkeletonBlock rows={8} />

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
            style={{ display: 'block', width: '100%', textAlign: 'left', marginRight: 0, borderBottom: 'none', padding: '8px 6px', borderRadius: 'var(--radius)' }}
            onClick={() => setSelectedRoleId(r.id)}
          >
            {r.name}{r.is_system_role ? <span className="muted" style={{ fontSize: 11 }}> · system</span> : ''}
          </button>
        ))}
        <div className="lookup-add">
          <input placeholder="New role" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createRole()} />
          <button type="button" className="lookup-add-btn" disabled={creatingRole} onClick={createRole} aria-label="Add role">
            <Plus size={15} />
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

/* =========================== AUDIT LOG =========================== */

const AUDIT_TABLES = [
  'employees', 'departments', 'designations', 'shifts', 'holidays', 'attendance', 'attendance_corrections',
  'overtime_records', 'leave_types', 'leave_policies', 'leave_balances', 'leave_requests', 'payroll_components',
  'employee_salary_components', 'tax_slabs', 'statutory_rates', 'loans', 'loan_installments', 'documents', 'assets',
]

function formatDateTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function diffFields(oldData, newData) {
  const keys = new Set([...Object.keys(oldData ?? {}), ...Object.keys(newData ?? {})])
  const changes = []
  for (const key of keys) {
    if (['created_at', 'updated_at'].includes(key)) continue
    const before = oldData?.[key]
    const after = newData?.[key]
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changes.push({ key, before, after })
    }
  }
  return changes
}

function AuditLogTab() {
  const [entries, setEntries] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableFilter, setTableFilter] = useState('all')
  const [activeEntry, setActiveEntry] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('audit_log')
      .select('id, table_name, record_id, action, old_data, new_data, user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(150)
    if (tableFilter !== 'all') query = query.eq('table_name', tableFilter)
    const [{ data: logRows }, { data: profileRows }] = await Promise.all([
      query,
      supabase.from('profiles').select('id, full_name, email'),
    ])
    setEntries(logRows ?? [])
    setProfiles(profileRows ?? [])
    setLoading(false)
  }, [tableFilter])

  useEffect(() => {
    load()
  }, [load])

  const changes = activeEntry ? diffFields(activeEntry.old_data, activeEntry.new_data) : []

  return (
    <>
      <p className="muted" style={{ marginTop: 0 }}>
        A record of who changed what, across the tables that matter most — salary, tax, attendance corrections, leave balances, and more.
      </p>

      <div className="field-row" style={{ maxWidth: 240, marginBottom: 4 }}>
        <label className="field">
          <span>Table</span>
          <select value={tableFilter} onChange={(e) => setTableFilter(e.target.value)}>
            <option value="all">All tables</option>
            {AUDIT_TABLES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </label>
      </div>

      {loading ? (
        <SkeletonTable rows={6} columns={4} />
      ) : entries.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>No activity recorded yet.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>When</th><th>Table</th><th>Action</th><th>By</th></tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} onClick={() => setActiveEntry(e)}>
                <td className="mono">{formatDateTime(e.created_at)}</td>
                <td>{e.table_name.replace(/_/g, ' ')}</td>
                <td><span className={`status-badge status-${e.action === 'insert' ? 'approved' : e.action === 'delete' ? 'rejected' : 'pending'}`}>{e.action}</span></td>
                <td>{profiles.find((p) => p.id === e.user_id)?.full_name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Drawer
        open={!!activeEntry}
        onClose={() => setActiveEntry(null)}
        title={activeEntry ? `${activeEntry.table_name.replace(/_/g, ' ')} · ${activeEntry.action}` : ''}
      >
        {activeEntry && (
          <div className="drawer-form">
            <div className="field-row">
              <div className="info-field">
                <span className="info-field-icon"><Clock size={15} /></span>
                <span className="info-field-body">
                  <span className="info-field-label">When</span>
                  <span className="info-field-value">{formatDateTime(activeEntry.created_at)}</span>
                </span>
              </div>
              <div className="info-field">
                <span className="info-field-icon"><User size={15} /></span>
                <span className="info-field-body">
                  <span className="info-field-label">By</span>
                  <span className="info-field-value">{profiles.find((p) => p.id === activeEntry.user_id)?.full_name ?? 'System'}</span>
                </span>
              </div>
            </div>

            {activeEntry.action === 'update' ? (
              changes.length === 0 ? (
                <p className="muted">No field-level changes recorded.</p>
              ) : (
                <div className="history-timeline" style={{ borderLeft: 'none', paddingLeft: 0 }}>
                  {changes.map((c) => (
                    <div key={c.key} className="mini-card">
                      <strong style={{ fontSize: 13 }}>{c.key.replace(/_/g, ' ')}</strong>
                      <div style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span className="muted" style={{ textDecoration: 'line-through' }}>{String(c.before ?? '—')}</span>
                        <span>→</span>
                        <span>{String(c.after ?? '—')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <>
                <p className="section-heading" style={{ marginTop: 4 }}>{activeEntry.action === 'insert' ? 'Created with' : 'Deleted record'}</p>
                <div className="mini-card">
                  {Object.entries((activeEntry.action === 'insert' ? activeEntry.new_data : activeEntry.old_data) ?? {})
                    .filter(([k]) => !['created_at', 'updated_at'].includes(k))
                    .map(([k, v]) => (
                      <div key={k} style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <span className="muted">{k.replace(/_/g, ' ')}</span>
                        <span className="mono">{String(v ?? '—')}</span>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        )}
      </Drawer>
    </>
  )
}

/* =========================== ONBOARDING TEMPLATES =========================== */

const TASK_CATEGORY_LABELS = { paperwork: 'Paperwork', it_setup: 'IT setup', training: 'Training', culture: 'Culture', general: 'General' }
const EMPTY_TEMPLATE_TASK = { title: '', description: '', category: 'general', days_from_joining: '0' }

function OnboardingTemplatesTab() {
  const { profile, company } = useAuth()
  const [templates, setTemplates] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const [newTemplateName, setNewTemplateName] = useState('')
  const [creating, setCreating] = useState(false)

  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false)
  const [taskForm, setTaskForm] = useState(EMPTY_TEMPLATE_TASK)
  const [savingTask, setSavingTask] = useState(false)

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('onboarding_templates').select('id, name').order('name')
    setTemplates(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const loadTasks = useCallback(async (templateId) => {
    const { data } = await supabase
      .from('onboarding_template_tasks')
      .select('id, title, description, category, days_from_joining, sort_order')
      .eq('template_id', templateId)
      .order('sort_order')
    setTasks(data ?? [])
  }, [])

  function selectTemplate(t) {
    setSelectedId(t.id)
    loadTasks(t.id)
  }

  async function createTemplate() {
    if (!newTemplateName.trim()) return
    setCreating(true)
    const { data, error } = await supabase
      .from('onboarding_templates')
      .insert({ company_id: company.id, name: newTemplateName.trim(), created_by: profile.id })
      .select()
      .single()
    setCreating(false)
    if (!error && data) {
      toast.success('Template created')
      setNewTemplateName('')
      await loadTemplates()
      selectTemplate(data)
    } else if (error) {
      toast.error(error.message)
    }
  }

  function openAddTask() {
    setTaskForm({ ...EMPTY_TEMPLATE_TASK })
    setTaskDrawerOpen(true)
  }

  async function handleAddTask(e) {
    e.preventDefault()
    setSavingTask(true)
    const { error } = await supabase.from('onboarding_template_tasks').insert({
      template_id: selectedId,
      title: taskForm.title,
      description: taskForm.description || null,
      category: taskForm.category,
      days_from_joining: Number(taskForm.days_from_joining || 0),
      sort_order: tasks.length,
    })
    setSavingTask(false)
    if (!error) {
      toast.success('Task added to template')
      setTaskDrawerOpen(false)
      loadTasks(selectedId)
    } else {
      toast.error(error.message)
    }
  }

  async function removeTask(taskId) {
    const { error } = await supabase.from('onboarding_template_tasks').delete().eq('id', taskId)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Task removed')
    loadTasks(selectedId)
  }

  if (loading) return <SkeletonBlock rows={8} />

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
      <div>
        <p className="section-heading">Templates</p>
        {templates.map((t) => (
          <button
            key={t.id}
            className={`tab-button${selectedId === t.id ? ' active' : ''}`}
            style={{ display: 'block', width: '100%', textAlign: 'left', marginRight: 0, borderBottom: 'none', padding: '8px 6px', borderRadius: 'var(--radius)' }}
            onClick={() => selectTemplate(t)}
          >
            {t.name}
          </button>
        ))}
        <div className="lookup-add">
          <input placeholder="New template" value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createTemplate()} />
          <button type="button" className="lookup-add-btn" disabled={creating} onClick={createTemplate} aria-label="Add template">
            <Plus size={15} />
          </button>
        </div>
      </div>

      <div>
        {!selectedId ? (
          <p className="muted">Select or create a template to add tasks.</p>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
              <button className="btn-secondary btn-icon" onClick={openAddTask}><Plus size={16} /> Add task</button>
            </div>
            {tasks.length === 0 ? (
              <p className="muted" style={{ marginTop: 16 }}>No tasks in this template yet.</p>
            ) : (
              <table className="data-table">
                <thead><tr><th>Task</th><th>Category</th><th>Due</th><th></th></tr></thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.id} style={{ cursor: 'default' }}>
                      <td>{t.title}</td>
                      <td>{TASK_CATEGORY_LABELS[t.category]}</td>
                      <td className="mono">Day {t.days_from_joining}</td>
                      <td><button className="link-button" onClick={() => removeTask(t.id)}>Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      <Drawer open={taskDrawerOpen} onClose={() => setTaskDrawerOpen(false)} title="Add template task">
        <form onSubmit={handleAddTask} className="drawer-form">
          <label className="field">
            <span>Title</span>
            <input required value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="e.g. Sign employment contract" />
          </label>
          <label className="field">
            <span>Description</span>
            <input value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="Optional" />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Category</span>
              <select value={taskForm.category} onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}>
                {Object.entries(TASK_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Days from joining date</span>
              <input type="number" value={taskForm.days_from_joining} onChange={(e) => setTaskForm({ ...taskForm, days_from_joining: e.target.value })} />
            </label>
          </div>
          <p className="muted" style={{ margin: 0 }}>0 = due on their first day. Negative numbers work for pre-joining tasks (e.g. -3 for "prepare laptop").</p>
          <button type="submit" className="btn-primary" disabled={savingTask}>
            {savingTask && <Loader2 size={14} className="btn-spinner" />}
            {savingTask ? 'Adding…' : 'Add task'}
          </button>
        </form>
      </Drawer>
    </div>
  )
}

/* =========================== TIMESHEETS SETUP =========================== */

function TimesheetsSetupTab() {
  const { company } = useAuth()
  const [clients, setClients] = useState([])
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: c }, { data: p }, { data: t }, { data: e }] = await Promise.all([
      supabase.from('clients').select('id, name, status').order('name'),
      supabase.from('projects').select('id, name, client_id, status, clients(name)').order('name'),
      supabase.from('timesheet_tasks').select('id, name, status').order('name'),
      supabase.from('employees').select('id, full_name').in('employment_status', ['training', 'probation', 'confirmed']).order('full_name'),
    ])
    setClients(c ?? [])
    setProjects(p ?? [])
    setTasks(t ?? [])
    setEmployees(e ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <SkeletonBlock rows={4} />

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <SimpleLookupCard
        title="Clients"
        rows={clients}
        renderRow={(r) => r.name}
        table="clients"
        company={company}
        onChanged={load}
      />
      <ProjectsCard rows={projects} clients={clients} employees={employees} company={company} onChanged={load} />
      <SimpleLookupCard
        title="Tasks"
        rows={tasks}
        renderRow={(r) => r.name}
        table="timesheet_tasks"
        company={company}
        onChanged={load}
      />
    </div>
  )
}

function ProjectsCard({ rows, clients, employees, company, onChanged }) {
  const [form, setForm] = useState({ name: '', client_id: '' })
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState(null)
  const [addingClient, setAddingClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [membersProject, setMembersProject] = useState(null)

  async function add() {
    if (!form.name.trim()) return
    setSaving(true)
    const { error } = await supabase.from('projects').insert({ company_id: company.id, name: form.name.trim(), client_id: form.client_id || null })
    setSaving(false)
    if (error) {
      toast.error(error.message || 'Failed to add project')
      return
    }
    setForm({ name: '', client_id: '' })
    onChanged()
  }

  async function addClient() {
    if (!newClientName.trim()) return
    const { data, error } = await supabase.from('clients').insert({ company_id: company.id, name: newClientName.trim() }).select().single()
    if (error) {
      toast.error(error.message || 'Failed to add client')
      return
    }
    setNewClientName('')
    setAddingClient(false)
    setForm((f) => ({ ...f, client_id: data.id }))
    onChanged()
  }

  async function remove(id) {
    setRemovingId(id)
    const { error } = await supabase.from('projects').delete().eq('id', id)
    setRemovingId(null)
    if (error) {
      if (error.code === '23503') {
        toast.error("Can't remove — this project has time entries logged against it.")
      } else {
        toast.error(error.message || 'Failed to remove')
      }
      return
    }
    toast.success('Removed')
    onChanged()
  }

  return (
    <div className="report-section" style={{ marginBottom: 0 }}>
      <p className="section-heading">Projects</p>
      {rows.length === 0 ? (
        <p className="muted">None yet.</p>
      ) : (
        <div className="lookup-list">
          {rows.map((r) => (
            <div key={r.id} className="lookup-row">
              <span>{r.name}{r.clients?.name ? ` · ${r.clients.name}` : ''}</span>
              <div style={{ display: 'flex', gap: 2 }}>
                <button
                  type="button"
                  className="link-button"
                  style={{ display: 'flex', padding: 6 }}
                  onClick={() => setMembersProject(r)}
                  aria-label="Manage access"
                  data-tooltip="Who can log time here"
                >
                  <Users size={14} />
                </button>
                <button
                  type="button"
                  className="btn-icon-round reject lookup-row-remove"
                  onClick={() => remove(r.id)}
                  disabled={removingId === r.id}
                  aria-label="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="lookup-add-group">
        <div className="field-row" style={{ marginBottom: 0 }}>
          <input className="input-ghost" placeholder="Project name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          {addingClient ? (
            <div className="lookup-add" style={{ marginTop: 0, flex: 1 }}>
              <input autoFocus placeholder="New client" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} />
              <button type="button" className="lookup-add-btn" onClick={addClient} aria-label="Add client">
                <Plus size={15} />
              </button>
            </div>
          ) : (
            <select
              className="input-ghost"
              value={form.client_id}
              onChange={(e) => (e.target.value === '__new__' ? setAddingClient(true) : setForm({ ...form, client_id: e.target.value }))}
            >
              <option value="">— Client (optional) —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="__new__">+ Add new client…</option>
            </select>
          )}
        </div>
        <button type="button" className="btn-primary" style={{ alignSelf: 'flex-start' }} disabled={saving} onClick={add}>
          {saving ? 'Adding…' : 'Add project'}
        </button>
      </div>

      <Drawer open={!!membersProject} onClose={() => setMembersProject(null)} title={membersProject ? `Access · ${membersProject.name}` : ''}>
        {membersProject && <ProjectMembersEditor project={membersProject} employees={employees} company={company} />}
      </Drawer>
    </div>
  )
}

function ProjectMembersEditor({ project, employees, company }) {
  const [memberIds, setMemberIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const { data } = await supabase.from('project_members').select('employee_id').eq('project_id', project.id)
      if (active) {
        setMemberIds(new Set((data ?? []).map((m) => m.employee_id)))
        setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [project.id])

  async function toggle(employeeId) {
    setBusyId(employeeId)
    if (memberIds.has(employeeId)) {
      const { error } = await supabase.from('project_members').delete().eq('project_id', project.id).eq('employee_id', employeeId)
      setBusyId(null)
      if (error) { toast.error(error.message); return }
      setMemberIds((prev) => { const next = new Set(prev); next.delete(employeeId); return next })
    } else {
      const { error } = await supabase.from('project_members').insert({ company_id: company.id, project_id: project.id, employee_id: employeeId })
      setBusyId(null)
      if (error) { toast.error(error.message); return }
      setMemberIds((prev) => new Set(prev).add(employeeId))
    }
  }

  if (loading) return <div style={{ padding: '0 24px 24px' }}><SkeletonBlock rows={3} /></div>

  return (
    <div style={{ padding: '0 24px 24px' }}>
      <p className="muted" style={{ margin: '0 0 12px' }}>
        {memberIds.size === 0
          ? 'No one is explicitly assigned — every employee can currently log time against this project.'
          : 'Only the people checked below can log time against this project.'}
      </p>
      <div className="lookup-list">
        {employees.map((emp) => (
          <label key={emp.id} className="lookup-row" style={{ cursor: 'pointer' }}>
            <span>{emp.full_name}</span>
            <input
              type="checkbox"
              checked={memberIds.has(emp.id)}
              disabled={busyId === emp.id}
              onChange={() => toggle(emp.id)}
            />
          </label>
        ))}
      </div>
    </div>
  )
}

/* =========================== SUPPORT =========================== */

function SupportTab() {
  const { company, profile } = useAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('support_tickets')
      .select('id, subject, message, status, created_at, closed_at')
      .order('created_at', { ascending: false })
    setTickets(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function submit(e) {
    e.preventDefault()
    if (!subject.trim()) return
    setSaving(true)
    const { error } = await supabase.from('support_tickets').insert({
      company_id: company.id,
      created_by: profile.id,
      subject: subject.trim(),
      message: message.trim() || null,
    })
    setSaving(false)
    if (error) {
      toast.error(error.message || 'Failed to submit ticket')
      return
    }
    toast.success('Ticket submitted — the PeopleBind team will follow up')
    setSubject('')
    setMessage('')
    load()
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div className="report-section" style={{ marginBottom: 0 }}>
        <p className="section-heading">Contact support</p>
        <form onSubmit={submit} className="drawer-form">
          <label className="field">
            <span>Subject</span>
            <input required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Payroll calculation looks off" />
          </label>
          <label className="field">
            <span>Message</span>
            <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Optional — add any detail that would help" />
          </label>
          <button type="submit" className="btn-primary" disabled={saving} style={{ alignSelf: 'flex-start' }}>
            {saving && <Loader2 size={14} className="btn-spinner" />}
            {saving ? 'Submitting…' : 'Submit ticket'}
          </button>
        </form>
      </div>

      <div className="report-section" style={{ marginBottom: 0 }}>
        <p className="section-heading">Your tickets</p>
        {loading ? (
          <SkeletonBlock rows={3} />
        ) : tickets.length === 0 ? (
          <p className="muted">No tickets submitted yet.</p>
        ) : (
          tickets.map((t) => (
            <div key={t.id} className="mini-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <strong style={{ fontSize: 13 }}>{t.subject}</strong>
                <span className={`status-badge status-${t.status === 'open' ? 'pending' : 'approved'}`}>{t.status}</span>
              </div>
              {t.message && <p className="muted" style={{ fontSize: 12, margin: 0 }}>{t.message}</p>}
              <span className="muted mono" style={{ fontSize: 11 }}>{formatDate(t.created_at?.slice(0, 10))}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
