import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown, Loader2, Copy } from 'lucide-react'
import { DeleteIcon } from '../components/ui/delete'
import { SquarePenIcon } from '../components/ui/square-pen'
import { PlusIcon } from '../components/ui/plus'
import { SendIcon } from '../components/ui/send'
import { ClockIcon } from '../components/ui/clock'
import { UserIcon } from '../components/ui/user'
import { UsersIcon } from '../components/ui/users'
import { LayersIcon } from '../components/ui/layers'
import { WalletIcon } from '../components/ui/wallet'
import { ClipboardCheckIcon } from '../components/ui/clipboard-check'
import { ShieldCheckIcon } from '../components/ui/shield-check'
import { TrendingUpIcon } from '../components/ui/trending-up'
import { BookTextIcon } from '../components/ui/book-text'
import { WaypointsIcon } from '../components/ui/waypoints'
import { MapPinIcon } from '../components/ui/map-pin'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'
import { SkeletonBlock, SkeletonTable } from '../components/Skeleton'
import { STANDARD_KPI_METRICS } from '../lib/kpiMetrics'
import { HelpEditor } from '../components/HelpEditor'
import { ClickUpIntegrationTab } from '../components/ClickUpIntegrationTab'

// Modules group the existing tabs into a real hierarchy instead of one long
// row that wraps -- the tab keys below are exactly the ones the render
// switch at the bottom of <Settings> already checks, untouched.
const SETTINGS_MODULES = [
  {
    key: 'org',
    label: 'Organization',
    icon: LayersIcon,
    color: 'forest',
    submodules: [
      { key: 'company', label: 'Company' },
      { key: 'structure', label: 'Org structure' },
      { key: 'roles', label: 'Roles & users' },
    ],
  },
  {
    key: 'time',
    label: 'Time & Attendance',
    icon: ClockIcon,
    color: 'moss',
    submodules: [
      { key: 'shifts', label: 'Shifts & holidays' },
      { key: 'leave', label: 'Leave' },
      { key: 'timesheets', label: 'Timesheets' },
    ],
  },
  {
    key: 'pay',
    label: 'Payroll',
    icon: WalletIcon,
    color: 'bottle',
    submodules: [
      { key: 'payroll', label: 'Payroll components' },
      { key: 'tax', label: 'Tax slabs' },
      { key: 'statutory', label: 'Statutory rates' },
      { key: 'proftax', label: 'Professional tax' },
      { key: 'salary_bands', label: 'Salary bands' },
    ],
  },
  {
    key: 'onboard',
    label: 'Onboarding',
    icon: ClipboardCheckIcon,
    color: 'olive',
    submodules: [
      { key: 'onboarding', label: 'Onboarding templates' },
    ],
  },
  {
    key: 'system',
    label: 'System',
    icon: ShieldCheckIcon,
    color: 'sage',
    submodules: [
      { key: 'audit', label: 'Audit log' },
      { key: 'support', label: 'Support' },
    ],
  },
  {
    key: 'performance',
    label: 'Performance',
    icon: TrendingUpIcon,
    color: 'gold',
    submodules: [
      { key: 'kpi_catalog', label: 'KPI catalog' },
    ],
  },
  {
    key: 'docs',
    label: 'Documentation',
    icon: BookTextIcon,
    color: 'teal',
    submodules: [
      { key: 'company_docs', label: 'Company documentation' },
    ],
  },
  {
    key: 'integrations',
    label: 'Integrations',
    icon: WaypointsIcon,
    color: 'teal-deep',
    submodules: [
      { key: 'clickup', label: 'ClickUp' },
    ],
  },
]

function SettingsNav({ tab, setTab }) {
  const [expanded, setExpanded] = useState(() => new Set())

  function toggleModule(key) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function selectSubmodule(moduleKey, submoduleKey) {
    setTab(submoduleKey)
    setExpanded((prev) => new Set(prev).add(moduleKey))
  }

  return (
    <nav className="settings-nav">
      {SETTINGS_MODULES.map((mod) => {
        const Icon = mod.icon
        const single = mod.submodules.length === 1
        const isExpanded = expanded.has(mod.key)
        const isActiveModule = mod.submodules.some((s) => s.key === tab)

        return (
          <div key={mod.key} className="settings-module">
            <button
              type="button"
              className={`settings-module-header${isActiveModule && single ? ' active' : ''}`}
              onClick={() => (single ? selectSubmodule(mod.key, mod.submodules[0].key) : toggleModule(mod.key))}
              aria-expanded={single ? undefined : isExpanded}
            >
              <span className={`settings-module-icon settings-module-icon-${mod.color}`}>
                <Icon size={17} />
              </span>
              <span className="settings-module-label">{mod.label}</span>
              {!single && (
                <ChevronDown size={14} className={`settings-module-chevron${isExpanded ? ' expanded' : ''}`} />
              )}
            </button>

            {!single && (
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    className="settings-submodule-list"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {mod.submodules.map((sub) => (
                      <button
                        key={sub.key}
                        type="button"
                        className={`settings-submodule-item${tab === sub.key ? ' active' : ''}`}
                        onClick={() => selectSubmodule(mod.key, sub.key)}
                      >
                        {tab === sub.key && (
                          <motion.span
                            layoutId="settings-active-pill"
                            className="settings-submodule-pill"
                            transition={{ duration: 0.2 }}
                          />
                        )}
                        {sub.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        )
      })}
    </nav>
  )
}

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
    <div className="page-inner" style={{ maxWidth: 1180 }}>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Settings</h1>
        </div>
      </div>

      <div className="settings-shell">
        <SettingsNav tab={tab} setTab={setTab} />

        <div className="settings-content">
          {tab === 'company' && <CompanyTab />}
          {tab === 'structure' && <StructureTab />}
          {tab === 'shifts' && <ShiftsTab />}
          {tab === 'leave' && <LeaveTab />}
          {tab === 'payroll' && <PayrollComponentsTab />}
          {tab === 'tax' && <TaxSlabsTab />}
          {tab === 'statutory' && <StatutoryRatesTab />}
          {tab === 'salary_bands' && <SalaryBandsTab />}
          {tab === 'proftax' && <ProfessionalTaxTab />}
          {tab === 'roles' && <RolesTab />}
          {tab === 'audit' && <AuditLogTab />}
          {tab === 'onboarding' && <OnboardingTemplatesTab />}
          {tab === 'timesheets' && <TimesheetsSetupTab />}
          {tab === 'support' && <SupportTab />}
          {tab === 'kpi_catalog' && <KpiCatalogTab />}
          {tab === 'company_docs' && <CompanyDocsTab />}
          {tab === 'clickup' && <ClickUpIntegrationTab />}
        </div>
      </div>
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
        gratuity_days_per_year: company.gratuity_days_per_year ?? 30,
        gratuity_min_years: company.gratuity_min_years ?? 0,
        payroll_run_day_of_month: company.payroll_run_day_of_month ?? '',
        require_clockin_photo: company.require_clockin_photo ?? false,
        geofence_enforcement: company.geofence_enforcement ?? 'off',
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
        gratuity_days_per_year: Number(form.gratuity_days_per_year),
        gratuity_min_years: Number(form.gratuity_min_years),
        payroll_run_day_of_month: form.payroll_run_day_of_month === '' ? null : Number(form.payroll_run_day_of_month),
        require_clockin_photo: form.require_clockin_photo,
        geofence_enforcement: form.geofence_enforcement,
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

      <label className="field">
        <span>Payroll runs on day of month</span>
        <input
          type="number"
          min="1"
          max="31"
          placeholder="Not set — no reminder posted"
          value={form.payroll_run_day_of_month}
          onChange={(e) => setForm({ ...form, payroll_run_day_of_month: e.target.value })}
        />
      </label>
      <p className="muted" style={{ marginTop: -4 }}>A company-wide announcement is posted a week before, so people review timesheets and attendance in time.</p>

      <p className="section-heading" style={{ marginTop: 10, marginBottom: 4, fontSize: 14 }}>Attendance</p>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <input type="checkbox" checked={form.require_clockin_photo} onChange={(e) => setForm({ ...form, require_clockin_photo: e.target.checked })} />
        Require a photo on web/mobile clock-in and clock-out
      </label>
      <p className="muted" style={{ marginTop: -4 }}>
        Off by default. Location is always captured silently in the background when available (never blocks
        clocking in). Turn this on for field, retail, or factory staff where photo verification matters — desk-based
        teams can leave it off.
      </p>

      <label className="field" style={{ marginTop: 6 }}>
        <span>Geofence enforcement</span>
        <select value={form.geofence_enforcement} onChange={(e) => setForm({ ...form, geofence_enforcement: e.target.value })}>
          <option value="off">Off — don't check distance</option>
          <option value="flag">Flag only — clock-in/out still succeeds, marked for review</option>
          <option value="block">Block — reject a clock-in/out too far from the branch</option>
        </select>
      </label>
      <p className="muted" style={{ marginTop: -4 }}>
        Only applies to employees whose branch has a location and radius set under Organization → Branches.
        An employee with no location captured (desktop, permission denied) is never blocked — there's nothing to check.
      </p>

      <p className="section-heading" style={{ marginTop: 10, marginBottom: 4, fontSize: 14 }}>Gratuity</p>
      <p className="muted" style={{ marginTop: 0 }}>Used when offboarding an employee to compute their Full &amp; Final Settlement.</p>

      <div className="field-row">
        <label className="field">
          <span>Days of basic salary per year of service</span>
          <input type="number" min="0" value={form.gratuity_days_per_year} onChange={(e) => setForm({ ...form, gratuity_days_per_year: e.target.value })} />
        </label>
        <label className="field">
          <span>Minimum years of service to qualify</span>
          <input type="number" min="0" step="0.5" value={form.gratuity_min_years} onChange={(e) => setForm({ ...form, gratuity_min_years: e.target.value })} />
        </label>
      </div>

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
      supabase.from('departments').select('id, name, status').eq('company_id', company.id).order('name'),
      supabase.from('designations').select('id, name, status').eq('company_id', company.id).order('name'),
      supabase.from('teams').select('id, name, status').eq('company_id', company.id).order('name'),
      supabase.from('employment_types').select('id, name').eq('company_id', company.id).order('name'),
      supabase.from('branches').select('id, name, city, is_head_office, office_lat, office_lng, geofence_radius_m').eq('company_id', company.id).order('name'),
    ])
    setDepartments(d ?? [])
    setDesignations(des ?? [])
    setTeams(tm ?? [])
    setEmploymentTypes(et ?? [])
    setBranches(b ?? [])
    setLoading(false)
  }, [company.id])

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
                <DeleteIcon size={14} />
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
          <PlusIcon size={15} />
        </button>
      </div>
    </div>
  )
}

function BranchesCard({ rows, company, onChanged }) {
  const [form, setForm] = useState({ name: '', city: '', is_head_office: false })
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState(null)

  const [locationBranch, setLocationBranch] = useState(null)
  const [locationForm, setLocationForm] = useState({ office_lat: '', office_lng: '', geofence_radius_m: '' })
  const [locating, setLocating] = useState(false)
  const [savingLocation, setSavingLocation] = useState(false)

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

  function openLocation(branch) {
    setLocationBranch(branch)
    setLocationForm({
      office_lat: branch.office_lat ?? '',
      office_lng: branch.office_lng ?? '',
      geofence_radius_m: branch.geofence_radius_m ?? '',
    })
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error('Location is not available in this browser')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        setLocationForm((f) => ({ ...f, office_lat: pos.coords.latitude.toFixed(6), office_lng: pos.coords.longitude.toFixed(6) }))
      },
      () => {
        setLocating(false)
        toast.error("Couldn't get your current location — check location permissions")
      },
      { timeout: 8000 }
    )
  }

  async function saveLocation() {
    const hasLat = locationForm.office_lat !== ''
    const hasLng = locationForm.office_lng !== ''
    const hasRadius = locationForm.geofence_radius_m !== ''
    if ((hasLat || hasLng || hasRadius) && !(hasLat && hasLng && hasRadius)) {
      toast.error('Set latitude, longitude, and radius together — or clear all three to turn geofencing off')
      return
    }
    setSavingLocation(true)
    const { error } = await supabase
      .from('branches')
      .update({
        office_lat: hasLat ? Number(locationForm.office_lat) : null,
        office_lng: hasLng ? Number(locationForm.office_lng) : null,
        geofence_radius_m: hasRadius ? Number(locationForm.geofence_radius_m) : null,
      })
      .eq('id', locationBranch.id)
    setSavingLocation(false)
    if (error) {
      toast.error(error.message || 'Failed to save location')
      return
    }
    toast.success(hasRadius ? 'Geofence saved' : 'Geofence cleared')
    setLocationBranch(null)
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
              <span>
                {r.name}{r.city ? ` · ${r.city}` : ''}{r.is_head_office ? ' · HQ' : ''}
                {r.geofence_radius_m && <span className="muted"> · geofenced ({r.geofence_radius_m}m)</span>}
              </span>
              <div style={{ display: 'flex', gap: 2 }}>
                <button type="button" className="btn-icon-round lookup-row-remove" onClick={() => openLocation(r)} aria-label="Set location">
                  <MapPinIcon size={14} />
                </button>
                <button
                  type="button"
                  className="btn-icon-round reject lookup-row-remove"
                  onClick={() => remove(r.id)}
                  disabled={removingId === r.id}
                  aria-label="Remove"
                >
                  <DeleteIcon size={14} />
                </button>
              </div>
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

      <Drawer open={!!locationBranch} onClose={() => setLocationBranch(null)} title={locationBranch ? `${locationBranch.name} · location` : ''}>
        <div className="drawer-form">
          <p className="muted" style={{ margin: 0 }}>
            Sets the office location used for geofence checks on this branch's clock-ins. Leave all three blank to
            turn geofencing off for this branch.
          </p>
          <button type="button" className="btn-secondary btn-icon" style={{ alignSelf: 'flex-start' }} disabled={locating} onClick={useCurrentLocation}>
            <MapPinIcon size={14} /> {locating ? 'Locating…' : 'Use my current location'}
          </button>
          <div className="field-row">
            <label className="field">
              <span>Latitude</span>
              <input type="number" step="any" value={locationForm.office_lat} onChange={(e) => setLocationForm({ ...locationForm, office_lat: e.target.value })} placeholder="e.g. 24.8607" />
            </label>
            <label className="field">
              <span>Longitude</span>
              <input type="number" step="any" value={locationForm.office_lng} onChange={(e) => setLocationForm({ ...locationForm, office_lng: e.target.value })} placeholder="e.g. 67.0011" />
            </label>
          </div>
          <label className="field">
            <span>Geofence radius (meters)</span>
            <input type="number" min="1" value={locationForm.geofence_radius_m} onChange={(e) => setLocationForm({ ...locationForm, geofence_radius_m: e.target.value })} placeholder="e.g. 150" />
          </label>
          <p className="muted" style={{ margin: 0 }}>Typical office radius: 100–300m.</p>
          <button type="button" className="btn-primary" disabled={savingLocation} onClick={saveLocation}>
            {savingLocation ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Drawer>
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
      supabase.from('shifts').select('id, name, start_time, end_time, break_minutes, grace_period_minutes, overtime_eligible, working_days, status').eq('company_id', company.id).order('name'),
      supabase.from('holidays').select('id, name, holiday_date').eq('company_id', company.id).order('holiday_date'),
    ])
    setShifts(s ?? [])
    setHolidays(h ?? [])
    setLoading(false)
  }, [company.id])

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
          <PlusIcon size={16} /> New shift
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
          <PlusIcon size={16} /> New holiday
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
    min_notice_days: '0',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: lt }, { data: p }, { data: et }] = await Promise.all([
      supabase.from('leave_types').select('id, name, is_paid, is_encashable, applicable_gender').eq('company_id', company.id).order('name'),
      supabase
        .from('leave_policies')
        .select('id, name, annual_entitlement_days, carry_forward_enabled, carry_forward_max_days, requires_approval, min_notice_days, leave_types(name), employment_types(name)')
        .eq('company_id', company.id)
        .order('name'),
      supabase.from('employment_types').select('id, name').eq('company_id', company.id).order('name'),
    ])
    setLeaveTypes(lt ?? [])
    setPolicies(p ?? [])
    setEmploymentTypes(et ?? [])
    setLoading(false)
  }, [company.id])

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
      min_notice_days: '0',
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
      min_notice_days: Number(form.min_notice_days || 0),
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
          <PlusIcon size={16} /> New policy
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
              <th>Min. notice</th>
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
                <td className="mono">{Number(p.min_notice_days) > 0 ? `${p.min_notice_days}d` : '—'}</td>
                <td>
                  <button
                    type="button"
                    className="btn-icon-round reject"
                    onClick={() => removePolicy(p.id)}
                    aria-label="Remove policy"
                  >
                    <DeleteIcon size={14} />
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

          <label className="field">
            <span>Minimum notice (days, optional)</span>
            <input type="number" min="0" step="1" value={form.min_notice_days} onChange={(e) => setForm({ ...form, min_notice_days: e.target.value })} />
          </label>
          <p className="muted" style={{ margin: 0, marginTop: -10, fontSize: 12 }}>
            0 = no requirement. PeopleBind AI flags pending requests that fall short of this when a manager asks about them.
          </p>

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
  const [form, setForm] = useState({ name: '', is_paid: true, is_encashable: false, applicable_gender: '' })
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState(null)

  async function add() {
    if (!form.name.trim()) return
    setSaving(true)
    const { error } = await supabase.from('leave_types').insert({
      company_id: company.id,
      name: form.name.trim(),
      is_paid: form.is_paid,
      is_encashable: form.is_encashable,
      applicable_gender: form.applicable_gender || null,
    })
    setSaving(false)
    if (error) {
      toast.error(error.message || 'Failed to add leave type')
      return
    }
    setForm({ name: '', is_paid: true, is_encashable: false, applicable_gender: '' })
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
              <span>
                {r.name}
                {!r.is_paid && <span className="muted" style={{ marginLeft: 6 }}>· unpaid</span>}
                {r.is_encashable && <span className="muted" style={{ marginLeft: 6 }}>· encashable</span>}
                {r.applicable_gender && <span className="muted" style={{ marginLeft: 6 }}>· {r.applicable_gender} only</span>}
              </span>
              <button
                type="button"
                className="btn-icon-round reject lookup-row-remove"
                onClick={() => remove(r.id)}
                disabled={removingId === r.id}
                aria-label="Remove"
              >
                <DeleteIcon size={14} />
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
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={form.is_encashable} onChange={(e) => setForm({ ...form, is_encashable: e.target.checked })} />
          Encashable at exit
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          Applies to
          <select value={form.applicable_gender} onChange={(e) => setForm({ ...form, applicable_gender: e.target.value })}>
            <option value="">All</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
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
      .eq('company_id', company.id)
      .order('component_type')
      .order('name')
    setComponents(data ?? [])
    setLoading(false)
  }, [company.id])

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
      percentage: form.calculation_method === 'percentage_of_basic' ? Number(form.percentage) : null,
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
          <PlusIcon size={16} /> New component
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
              <td>{c.calculation_method === 'percentage_of_basic' ? `${c.percentage}%` : 'Fixed'}</td>
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
                <option value="percentage_of_basic">% of basic</option>
              </select>
            </label>
          </div>
          {form.calculation_method === 'percentage_of_basic' && (
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

/* =========================== KPI CATALOG =========================== */

const EMPTY_CUSTOM_KPI = { name: '', description: '', weight: '1', status: 'active' }

function KpiCatalogTab() {
  const { profile, company } = useAuth()
  const [hasAccess, setHasAccess] = useState(null)
  const [kpis, setKpis] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingType, setEditingType] = useState('custom')
  const [form, setForm] = useState(EMPTY_CUSTOM_KPI)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (profile?.is_platform_admin) {
      setHasAccess(true)
      return
    }
    let cancelled = false
    supabase.rpc('auth_has_permission', { p_resource: 'performance', p_action: 'manage' }).then(({ data }) => {
      if (!cancelled) setHasAccess(!!data)
    })
    return () => {
      cancelled = true
    }
  }, [profile?.is_platform_admin])

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('kpi_definitions')
      .select('id, name, description, kpi_type, metric_key, weight, status')
      .eq('company_id', company.id)
      .order('kpi_type')
      .order('name')
    setKpis(data ?? [])
    setLoading(false)
  }, [company.id])

  useEffect(() => {
    if (hasAccess) load()
  }, [load, hasAccess])

  function openNew() {
    setEditingId(null)
    setEditingType('custom')
    setForm(EMPTY_CUSTOM_KPI)
    setError(null)
    setDrawerOpen(true)
  }

  function openEdit(kpi) {
    setEditingId(kpi.id)
    setEditingType(kpi.kpi_type)
    setForm({
      name: kpi.name,
      description: kpi.description || '',
      weight: String(kpi.weight),
      status: kpi.status,
    })
    setError(null)
    setDrawerOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const payload = {
      description: form.description || null,
      weight: Number(form.weight),
      status: form.status,
    }
    if (editingType === 'custom') payload.name = form.name

    const { error: saveError } = editingId
      ? await supabase.from('kpi_definitions').update(payload).eq('id', editingId)
      : await supabase.from('kpi_definitions').insert({
          ...payload,
          company_id: company.id,
          kpi_type: 'custom',
          scoring_type: 'manual',
          created_by: profile.id,
        })

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      toast.error(saveError.message || 'Something went wrong')
      return
    }

    toast.success(editingId ? 'KPI updated' : 'Custom KPI created')
    setDrawerOpen(false)
    load()
  }

  async function remove(id) {
    const { error: removeError } = await supabase.from('kpi_definitions').delete().eq('id', id)
    if (removeError) {
      if (removeError.code === '23503') {
        toast.error("Can't remove — this KPI is attached to a review cycle. Archive it instead.")
      } else {
        toast.error(removeError.message || 'Failed to remove')
      }
      return
    }
    toast.success('KPI removed')
    load()
  }

  if (hasAccess === null) return <SkeletonBlock rows={6} />

  if (!hasAccess) {
    return (
      <div className="empty-state" style={{ marginTop: 20 }}>
        <p>You don't have access to manage the KPI catalog.</p>
        <p className="muted">Ask a company admin to grant you the "Manage goals, review cycles, and performance reviews" permission.</p>
      </div>
    )
  }

  if (loading) return <SkeletonTable rows={8} columns={5} />

  return (
    <>
      <p className="muted" style={{ marginTop: 0 }}>
        Standard KPIs are computed automatically from attendance, leave, timesheet, expense, onboarding, and goal
        data already in PeopleBind. Custom KPIs are scored manually by a reviewer during a review cycle. Pick which
        of these apply to a given cycle from the Reviews tab.
      </p>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
        <button className="btn-primary btn-icon" onClick={openNew}>
          <PlusIcon size={16} /> New custom KPI
        </button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Metric</th>
            <th>Weight</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {kpis.map((k) => (
            <tr key={k.id} onClick={() => openEdit(k)}>
              <td>
                {k.name}
                {k.description && <span className="muted" style={{ display: 'block', fontSize: 12 }}>{k.description}</span>}
              </td>
              <td>
                <span className={`status-badge status-${k.kpi_type === 'standard' ? 'approved' : 'pending'}`}>{k.kpi_type}</span>
              </td>
              <td>{k.kpi_type === 'standard' ? STANDARD_KPI_METRICS[k.metric_key]?.label ?? k.metric_key : '— manual —'}</td>
              <td className="mono">{k.weight}</td>
              <td><span className={`status-badge status-${k.status === 'active' ? 'approved' : 'rejected'}`}>{k.status}</span></td>
              <td onClick={(e) => e.stopPropagation()}>
                {k.kpi_type === 'custom' && (
                  <button className="btn-icon-round reject" onClick={() => remove(k.id)} aria-label="Remove">
                    <DeleteIcon size={14} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editingId ? 'Edit KPI' : 'New custom KPI'}>
        <form onSubmit={handleSubmit} className="drawer-form">
          <label className="field">
            <span>Name</span>
            <input required disabled={editingType === 'standard'} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>

          <label className="field">
            <span>Description</span>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Weight</span>
              <input type="number" min="0.01" step="0.01" required value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
            </label>
            <label className="field">
              <span>Status</span>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>

          {editingType === 'standard' && (
            <p className="muted" style={{ margin: 0 }}>
              Standard KPIs are computed automatically — the name and formula can't be changed, but you can adjust
              its weight or archive it.
            </p>
          )}

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={14} className="btn-spinner" />}
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create custom KPI'}
          </button>
        </form>
      </Drawer>
    </>
  )
}

/* =========================== COMPANY DOCUMENTATION =========================== */

function CompanyDocsTab() {
  const { profile, company } = useAuth()
  const [hasAccess, setHasAccess] = useState(null)

  useEffect(() => {
    if (profile?.is_platform_admin) {
      setHasAccess(true)
      return
    }
    let cancelled = false
    supabase.rpc('auth_has_permission', { p_resource: 'settings', p_action: 'manage' }).then(({ data }) => {
      if (!cancelled) setHasAccess(!!data)
    })
    return () => {
      cancelled = true
    }
  }, [profile?.is_platform_admin])

  if (hasAccess === null) return <SkeletonBlock rows={6} />

  if (!hasAccess) {
    return (
      <div className="empty-state" style={{ marginTop: 20 }}>
        <p>You don't have access to manage company documentation.</p>
        <p className="muted">Ask a company admin to grant you the "Manage company settings" permission.</p>
      </div>
    )
  }

  return (
    <>
      <p className="muted" style={{ marginTop: 0 }}>
        This is your company's own documentation — visible only to your own users, alongside PeopleBind's official
        documentation on the Help page. Use it for your internal HR policies, forms, and onboarding checklists. Only
        published articles are shown to your users.
      </p>
      <HelpEditor companyId={company.id} />
      <PolicySearchMisses companyId={company.id} />
    </>
  )
}

// Queries the AI assistant genuinely couldn't answer from any published
// article (neither semantic nor keyword search found a match) -- a direct
// content-gap signal: what employees are actually asking that has nothing
// written for it yet. Logged by searchPolicies in the ai-assistant edge
// function; read-only here, same settings:manage gate as the rest of this
// tab (CompanyDocsTab already checked hasAccess before rendering this).
function PolicySearchMisses({ companyId }) {
  const [misses, setMisses] = useState(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('policy_search_misses')
      .select('id, query, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!cancelled) setMisses(data ?? [])
      })
    return () => {
      cancelled = true
    }
  }, [companyId])

  if (misses === null) return <SkeletonBlock rows={3} />
  if (misses.length === 0) return null

  return (
    <div className="report-section" style={{ marginTop: 24 }}>
      <p className="section-heading" style={{ marginTop: 0 }}>Recent unanswered questions</p>
      <p className="muted" style={{ fontSize: 13, marginTop: -6, marginBottom: 12 }}>
        Questions PeopleBind AI couldn't find a documented answer for — worth turning into an article above if they
        keep coming up.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {misses.map((m) => (
          <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13.5, padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
            <span>"{m.query}"</span>
            <span className="muted" style={{ whiteSpace: 'nowrap' }}>
              {new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        ))}
      </div>
    </div>
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
      .eq('company_id', company.id)
      .order('effective_from', { ascending: false })
      .order('min_annual_income', { ascending: true })
    setSlabs(data ?? [])
    setLoading(false)
  }, [company.id])

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
          <PlusIcon size={16} /> Add bracket
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

/* =========================== SALARY BANDS =========================== */

// The compa-ratio denominator: a min/mid/max compensation range per
// designation. RLS gates on the real 'salary' permission resource, not
// settings:manage -- same as employee_salary_components -- so this tab
// follows the shifts/tax-slabs convention (shown to everyone, enforced by
// RLS, errors surfaced via toast) rather than a client-side hasAccess
// gate: a viewer without salary:view simply sees an empty list, and a
// write without salary:edit fails with a toast, same as every other
// ordinary settings tab in this app.
const EMPTY_BAND_FORM = { id: null, designation_id: '', min_salary: '', mid_salary: '', max_salary: '' }

function SalaryBandsTab() {
  const { company } = useAuth()
  const [designations, setDesignations] = useState([])
  const [bands, setBands] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_BAND_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: des }, { data: b }] = await Promise.all([
      supabase.from('designations').select('id, name').eq('company_id', company.id).eq('status', 'active').order('name'),
      supabase.from('salary_bands').select('id, designation_id, min_salary, mid_salary, max_salary').eq('company_id', company.id),
    ])
    setDesignations(des ?? [])
    setBands(b ?? [])
    setLoading(false)
  }, [company.id])

  useEffect(() => {
    load()
  }, [load])

  const designationById = new Map(designations.map((d) => [d.id, d.name]))
  const bandedIds = new Set(bands.map((b) => b.designation_id))
  const unbandedDesignations = designations.filter((d) => !bandedIds.has(d.id))
  const rows = bands
    .map((b) => ({ ...b, designation_name: designationById.get(b.designation_id) ?? 'Unknown designation' }))
    .sort((a, b) => a.designation_name.localeCompare(b.designation_name))

  function openAdd() {
    setForm({ ...EMPTY_BAND_FORM, designation_id: unbandedDesignations[0]?.id ?? '' })
    setError(null)
    setDrawerOpen(true)
  }

  function openEdit(band) {
    setForm({ id: band.id, designation_id: band.designation_id, min_salary: String(band.min_salary), mid_salary: String(band.mid_salary), max_salary: String(band.max_salary) })
    setError(null)
    setDrawerOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    const min = Number(form.min_salary), mid = Number(form.mid_salary), max = Number(form.max_salary)
    if (!(min <= mid && mid <= max)) {
      setError('Min must be ≤ mid, and mid must be ≤ max.')
      return
    }
    setSaving(true)
    const payload = { company_id: company.id, designation_id: form.designation_id, min_salary: min, mid_salary: mid, max_salary: max }
    const { error: saveError } = form.id
      ? await supabase.from('salary_bands').update(payload).eq('id', form.id)
      : await supabase.from('salary_bands').insert(payload)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      toast.error(saveError.message)
      return
    }

    toast.success(form.id ? 'Band updated' : 'Band added')
    setDrawerOpen(false)
    load()
  }

  async function handleDelete(id) {
    const { error: deleteError } = await supabase.from('salary_bands').delete().eq('id', id)
    setConfirmDeleteId(null)
    if (deleteError) {
      toast.error(deleteError.message || 'Failed to remove')
      return
    }
    toast.success('Band removed')
    load()
  }

  if (loading) return <SkeletonTable rows={4} columns={4} />

  return (
    <>
      <p className="muted" style={{ marginTop: 0 }}>
        Defines the expected compensation range per designation, used to compute the compa-ratio dashboard metric
        (an employee's basic salary as a % of their designation's midpoint). Only designations with a band defined
        are included in that metric.
      </p>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
        <button className="btn-primary btn-icon" onClick={openAdd} disabled={unbandedDesignations.length === 0}>
          <PlusIcon size={16} /> Add band
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>No salary bands configured yet.</p>
          <p className="muted">Add one per designation to start seeing the compa-ratio metric on dashboards.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Designation</th><th>Min</th><th>Mid</th><th>Max</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} style={{ cursor: 'default' }}>
                <td>{b.designation_name}</td>
                <td className="mono">{fmtMoney(b.min_salary)}</td>
                <td className="mono">{fmtMoney(b.mid_salary)}</td>
                <td className="mono">{fmtMoney(b.max_salary)}</td>
                <td>
                  {confirmDeleteId === b.id ? (
                    <span style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', fontSize: 12.5 }}>
                      <button type="button" className="link-button" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(b.id)}>Yes</button>
                      <button type="button" className="link-button" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                    </span>
                  ) : (
                    <span style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                      <button type="button" className="link-button" onClick={() => openEdit(b)}><SquarePenIcon size={15} /></button>
                      <button type="button" className="link-button" onClick={() => setConfirmDeleteId(b.id)}><DeleteIcon size={15} /></button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={form.id ? 'Edit salary band' : 'Add salary band'}>
        <form onSubmit={handleSubmit} className="drawer-form">
          <label className="field">
            <span>Designation</span>
            {form.id ? (
              <input value={designationById.get(form.designation_id) ?? ''} disabled />
            ) : (
              <select required value={form.designation_id} onChange={(e) => setForm({ ...form, designation_id: e.target.value })}>
                {unbandedDesignations.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
          </label>

          <div className="field-row">
            <label className="field">
              <span>Min (Rs.)</span>
              <input type="number" min="0" required value={form.min_salary} onChange={(e) => setForm({ ...form, min_salary: e.target.value })} />
            </label>
            <label className="field">
              <span>Mid (Rs.)</span>
              <input type="number" min="0" required value={form.mid_salary} onChange={(e) => setForm({ ...form, mid_salary: e.target.value })} />
            </label>
            <label className="field">
              <span>Max (Rs.)</span>
              <input type="number" min="0" required value={form.max_salary} onChange={(e) => setForm({ ...form, max_salary: e.target.value })} />
            </label>
          </div>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={14} className="btn-spinner" />}
            {saving ? 'Saving…' : form.id ? 'Save changes' : 'Add band'}
          </button>
        </form>
      </Drawer>
    </>
  )
}

/* =========================== STATUTORY RATES =========================== */

// Company-configured, same as EOBI already was -- PeopleBind doesn't hardcode
// current legal rates (they vary by province and change over time), the
// company enters what applies to them and dates it via effective_from/to,
// exactly like tax_slabs above.
const STATUTORY_RATE_TYPES = [
  { value: 'eobi_employee', label: 'EOBI — Employee' },
  { value: 'eobi_employer', label: 'EOBI — Employer' },
  { value: 'sessi_employee', label: 'SESSI (Sindh) — Employee' },
  { value: 'sessi_employer', label: 'SESSI (Sindh) — Employer' },
  { value: 'pessi_employee', label: 'PESSI (Punjab) — Employee' },
  { value: 'pessi_employer', label: 'PESSI (Punjab) — Employer' },
  { value: 'kpessi_employee', label: 'KPESSI (KP) — Employee' },
  { value: 'kpessi_employer', label: 'KPESSI (KP) — Employer' },
  { value: 'bessi_employee', label: 'BESSI (Balochistan) — Employee' },
  { value: 'bessi_employer', label: 'BESSI (Balochistan) — Employer' },
  { value: 'pf_employee', label: 'Provident Fund — Employee' },
  { value: 'pf_employer', label: 'Provident Fund — Employer' },
]

function statutoryRateLabel(value) {
  return STATUTORY_RATE_TYPES.find((t) => t.value === value)?.label ?? value
}

function StatutoryRatesTab() {
  const { company } = useAuth()
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState({ rate_type: 'eobi_employee', effective_from: '', effective_to: '', rate_percent: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('statutory_rates')
      .select('id, rate_type, effective_from, effective_to, rate_percent')
      .eq('company_id', company.id)
      .order('rate_type')
      .order('effective_from', { ascending: false })
    setRates(data ?? [])
    setLoading(false)
  }, [company.id])

  useEffect(() => {
    load()
  }, [load])

  function openAdd() {
    setForm({ rate_type: 'eobi_employee', effective_from: new Date().toISOString().slice(0, 10), effective_to: '', rate_percent: '' })
    setError(null)
    setDrawerOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const { error: saveError } = await supabase.from('statutory_rates').insert({
      company_id: company.id,
      rate_type: form.rate_type,
      effective_from: form.effective_from,
      effective_to: form.effective_to || null,
      rate_percent: Number(form.rate_percent),
    })

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      toast.error(saveError.message)
      return
    }

    toast.success('Statutory rate added')
    setDrawerOpen(false)
    load()
  }

  if (loading) return <SkeletonTable rows={3} columns={4} />

  return (
    <>
      <p className="muted" style={{ marginTop: 0 }}>
        These feed payroll's EOBI, provincial social security (SESSI/PESSI/KPESSI/BESSI), and Provident Fund
        lines directly — a scheme with no active rate here is simply skipped for every employee. EOBI and
        social-security rates apply to the company's minimum-wage base (set on the Company tab); Provident
        Fund rates apply to each employee's basic salary.
      </p>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
        <button className="btn-primary btn-icon" onClick={openAdd}>
          <PlusIcon size={16} /> Add rate
        </button>
      </div>

      {rates.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>No statutory rates configured.</p>
          <p className="muted">EOBI, social security, and Provident Fund will all be skipped in payroll until at least one rate is added.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Scheme</th><th>Rate</th><th>Effective from</th><th>Effective to</th></tr>
          </thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r.id} style={{ cursor: 'default' }}>
                <td>{statutoryRateLabel(r.rate_type)}</td>
                <td className="mono">{r.rate_percent}%</td>
                <td className="mono">{formatDate(r.effective_from)}</td>
                <td className="mono">{r.effective_to ? formatDate(r.effective_to) : 'Current'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Add statutory rate">
        <form onSubmit={handleSubmit} className="drawer-form">
          <label className="field">
            <span>Scheme</span>
            <select value={form.rate_type} onChange={(e) => setForm({ ...form, rate_type: e.target.value })}>
              {STATUTORY_RATE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>

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

          <label className="field">
            <span>Rate (%)</span>
            <input type="number" min="0" max="100" step="0.01" required value={form.rate_percent} onChange={(e) => setForm({ ...form, rate_percent: e.target.value })} />
          </label>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={14} className="btn-spinner" />}
            {saving ? 'Adding…' : 'Add rate'}
          </button>
        </form>
      </Drawer>
    </>
  )
}

/* =========================== PROFESSIONAL TAX =========================== */

function ProfessionalTaxTab() {
  const { company } = useAuth()
  const [slabs, setSlabs] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState({ effective_from: '', effective_to: '', min_annual_income: '', max_annual_income: '', rate_percent: '0', fixed_amount: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('professional_tax_slabs')
      .select('id, effective_from, effective_to, min_annual_income, max_annual_income, rate_percent, fixed_amount')
      .eq('company_id', company.id)
      .order('effective_from', { ascending: false })
      .order('min_annual_income', { ascending: true })
    setSlabs(data ?? [])
    setLoading(false)
  }, [company.id])

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
      rate_percent: '0',
      fixed_amount: '',
    })
    setError(null)
    setDrawerOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const { error: saveError } = await supabase.from('professional_tax_slabs').insert({
      company_id: company.id,
      effective_from: form.effective_from,
      effective_to: form.effective_to || null,
      min_annual_income: Number(form.min_annual_income),
      max_annual_income: form.max_annual_income ? Number(form.max_annual_income) : null,
      rate_percent: Number(form.rate_percent || 0),
      fixed_amount: Number(form.fixed_amount || 0),
    })

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      toast.error(saveError.message)
      return
    }

    toast.success('Professional tax bracket added')
    setDrawerOpen(false)
    load()
  }

  if (loading) return <SkeletonTable rows={4} columns={4} />

  return (
    <>
      <p className="muted" style={{ marginTop: 0 }}>
        Provincial professional tax is usually a flat annual amount per income band rather than a percentage —
        most provinces just need a "fixed amount" row (leave rate at 0%) covering everyone, e.g. Rs. 0 to no
        cap. Add a rate% only if your province's schedule is genuinely percentage-based.
      </p>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
        <button className="btn-primary btn-icon" onClick={openAdd}>
          <PlusIcon size={16} /> Add bracket
        </button>
      </div>

      {periodList.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>No professional tax brackets configured.</p>
          <p className="muted">Professional tax will be skipped in payroll until at least one bracket exists.</p>
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

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Add professional tax bracket">
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
              <input type="number" min="0" max="100" step="0.1" value={form.rate_percent} onChange={(e) => setForm({ ...form, rate_percent: e.target.value })} />
            </label>
            <label className="field">
              <span>Fixed amount (Rs./year)</span>
              <input type="number" min="0" value={form.fixed_amount} onChange={(e) => setForm({ ...form, fixed_amount: e.target.value })} />
            </label>
          </div>

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
  const [hasAccess, setHasAccess] = useState(null)

  const [newRoleName, setNewRoleName] = useState('')
  const [creatingRole, setCreatingRole] = useState(false)

  const [invites, setInvites] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRoleId, setInviteRoleId] = useState('')
  const [sendingInvite, setSendingInvite] = useState(false)
  const [revokingInviteId, setRevokingInviteId] = useState(null)

  useEffect(() => {
    if (profile?.is_platform_admin) {
      setHasAccess(true)
      return
    }
    let cancelled = false
    supabase.rpc('auth_has_permission', { p_resource: 'settings', p_action: 'manage' }).then(({ data }) => {
      if (!cancelled) setHasAccess(!!data)
    })
    return () => {
      cancelled = true
    }
  }, [profile?.is_platform_admin])

  const load = useCallback(async () => {
    setLoading(true)
    // roles.company_id is nullable -- null means a global/system role shared
    // across every company (Admin, HR Admin, etc.), so this needs an OR, not
    // a plain eq, or system roles would disappear for every normal company.
    const [{ data: r }, { data: p }, { data: u }, { data: ur }, { data: inv }] = await Promise.all([
      supabase.from('roles').select('id, name, is_system_role, company_id').or(`company_id.eq.${company.id},company_id.is.null`).order('is_system_role', { ascending: false }).order('name'),
      supabase.from('permissions').select('id, resource, action, description').order('resource').order('action'),
      supabase.from('profiles').select('id, full_name, email, status').eq('company_id', company.id).order('full_name'),
      supabase.from('user_roles').select('id, user_id, role_id').eq('company_id', company.id),
      supabase.from('invites').select('id, email, role_id, token, created_at').eq('company_id', company.id).eq('status', 'pending').order('created_at', { ascending: false }),
    ])
    // role_permissions has no company_id at all -- scope it to the roles
    // that are actually visible to this company (fetched just above).
    const roleIds = (r ?? []).map((role) => role.id)
    const { data: rp } = roleIds.length
      ? await supabase.from('role_permissions').select('role_id, permission_id').in('role_id', roleIds)
      : { data: [] }
    setRoles(r ?? [])
    setPermissions(p ?? [])
    setRolePermissions(rp ?? [])
    setUsers(u ?? [])
    setUserRoles(ur ?? [])
    setInvites(inv ?? [])
    setLoading(false)
  }, [company.id])

  useEffect(() => {
    if (hasAccess) load()
  }, [load, hasAccess])

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

  async function sendInvite() {
    const email = inviteEmail.trim()
    if (!email || !inviteRoleId) return
    setSendingInvite(true)

    const { data: invite, error } = await supabase
      .from('invites')
      .insert({ company_id: company.id, email, role_id: inviteRoleId, invited_by: profile.id })
      .select()
      .single()

    if (error) {
      setSendingInvite(false)
      toast.error(error.message)
      return
    }

    const roleName = roles.find((r) => r.id === inviteRoleId)?.name
    const link = `${window.location.origin}/invite/${invite.token}`
    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: email,
        subject: `You've been invited to join ${company.name} on PeopleBind`,
        html: `<p>You've been invited to join <strong>${company.name}</strong> on PeopleBind as <strong>${roleName}</strong>.</p><p><a href="${link}">Accept your invite</a></p><p>This link expires in 7 days.</p>`,
      },
    })
    setSendingInvite(false)

    if (emailError) {
      let message = emailError.message
      try {
        const body = await emailError.context.json()
        if (body?.error) message = body.error
      } catch {
        // context wasn't JSON -- keep the generic message
      }
      toast.error(message || 'Invite created, but the email failed to send')
      await load()
      return
    }

    toast.success(`Invite sent to ${email}`)
    setInviteEmail('')
    setInviteRoleId('')
    await load()
  }

  async function copyInviteLink(token) {
    const link = `${window.location.origin}/invite/${token}`
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Invite link copied')
    } catch {
      toast.error('Could not copy link')
    }
  }

  async function revokeInvite(id) {
    setRevokingInviteId(id)
    const { error } = await supabase.from('invites').update({ status: 'revoked' }).eq('id', id)
    setRevokingInviteId(null)
    if (error) {
      toast.error(error.message)
      return
    }
    await load()
  }

  if (hasAccess === null) return <SkeletonBlock rows={8} />

  if (!hasAccess) {
    return (
      <div className="empty-state" style={{ marginTop: 20 }}>
        <p>You don't have access to manage roles and users.</p>
        <p className="muted">Ask a company admin to grant you the "Manage company settings" permission.</p>
      </div>
    )
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
            <PlusIcon size={15} />
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
        <p className="section-heading" style={{ marginTop: 28 }}>Invite someone new</p>
        <div className="lookup-add-group">
          <input
            className="input-ghost"
            type="email"
            placeholder="email@company.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendInvite()}
          />
          <select className="input-ghost" value={inviteRoleId} onChange={(e) => setInviteRoleId(e.target.value)}>
            <option value="">Role…</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn-primary"
            style={{ alignSelf: 'flex-start' }}
            disabled={sendingInvite || !inviteEmail.trim() || !inviteRoleId}
            onClick={sendInvite}
          >
            {sendingInvite && <Loader2 size={14} className="btn-spinner" />}
            {sendingInvite ? 'Sending…' : <><SendIcon size={14} /> Send invite</>}
          </button>
        </div>

        {invites.length > 0 && (
          <div className="lookup-list" style={{ marginTop: 8 }}>
            {invites.map((inv) => (
              <div key={inv.id} className="lookup-row">
                <span>
                  {inv.email}
                  <span className="muted" style={{ display: 'block', fontSize: 11 }}>
                    {roles.find((r) => r.id === inv.role_id)?.name} · sent {new Date(inv.created_at).toLocaleDateString()}
                  </span>
                </span>
                <span style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="btn-icon-round"
                    onClick={() => copyInviteLink(inv.token)}
                    aria-label="Copy invite link"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn-icon-round reject lookup-row-remove"
                    onClick={() => revokeInvite(inv.id)}
                    disabled={revokingInviteId === inv.id}
                    aria-label="Revoke invite"
                  >
                    <DeleteIcon size={14} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
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
  'goals', 'review_cycles', 'performance_reviews', 'feedback_notes',
  'kpi_definitions', 'review_cycle_kpis', 'performance_review_kpi_scores',
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
  const { company } = useAuth()
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
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(150)
    if (tableFilter !== 'all') query = query.eq('table_name', tableFilter)
    const [{ data: logRows }, { data: profileRows }] = await Promise.all([
      query,
      supabase.from('profiles').select('id, full_name, email').eq('company_id', company.id),
    ])
    setEntries(logRows ?? [])
    setProfiles(profileRows ?? [])
    setLoading(false)
  }, [tableFilter, company.id])

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
                <span className="info-field-icon"><ClockIcon size={15} /></span>
                <span className="info-field-body">
                  <span className="info-field-label">When</span>
                  <span className="info-field-value">{formatDateTime(activeEntry.created_at)}</span>
                </span>
              </div>
              <div className="info-field">
                <span className="info-field-icon"><UserIcon size={15} /></span>
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
    const { data } = await supabase.from('onboarding_templates').select('id, name').eq('company_id', company.id).order('name')
    setTemplates(data ?? [])
    setLoading(false)
  }, [company.id])

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
            <PlusIcon size={15} />
          </button>
        </div>
      </div>

      <div>
        {!selectedId ? (
          <p className="muted">Select or create a template to add tasks.</p>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
              <button className="btn-secondary btn-icon" onClick={openAddTask}><PlusIcon size={16} /> Add task</button>
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
      supabase.from('clients').select('id, name, status').eq('company_id', company.id).order('name'),
      supabase.from('projects').select('id, name, client_id, status, expected_completion_date, clients(name)').eq('company_id', company.id).order('name'),
      supabase.from('timesheet_tasks').select('id, name, status').eq('company_id', company.id).order('name'),
      supabase.from('employees').select('id, full_name').eq('company_id', company.id).in('employment_status', ['training', 'probation', 'confirmed']).order('full_name'),
    ])
    setClients(c ?? [])
    setProjects(p ?? [])
    setTasks(t ?? [])
    setEmployees(e ?? [])
    setLoading(false)
  }, [company.id])

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
  const [form, setForm] = useState({ name: '', client_id: '', expected_completion_date: '' })
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState(null)
  const [addingClient, setAddingClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [membersProject, setMembersProject] = useState(null)

  async function add() {
    if (!form.name.trim()) return
    setSaving(true)
    const { error } = await supabase.from('projects').insert({
      company_id: company.id,
      name: form.name.trim(),
      client_id: form.client_id || null,
      expected_completion_date: form.expected_completion_date || null,
    })
    setSaving(false)
    if (error) {
      toast.error(error.message || 'Failed to add project')
      return
    }
    setForm({ name: '', client_id: '', expected_completion_date: '' })
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
              <span>
                {r.name}{r.clients?.name ? ` · ${r.clients.name}` : ''}
                {r.expected_completion_date && (
                  <span className="muted" style={{ display: 'block', fontSize: 11 }}>
                    Due {new Date(r.expected_completion_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </span>
              <div style={{ display: 'flex', gap: 2 }}>
                <button
                  type="button"
                  className="link-button"
                  style={{ display: 'flex', padding: 6 }}
                  onClick={() => setMembersProject(r)}
                  aria-label="Manage access"
                  data-tooltip="Who can log time here"
                >
                  <UsersIcon size={14} />
                </button>
                <button
                  type="button"
                  className="btn-icon-round reject lookup-row-remove"
                  onClick={() => remove(r.id)}
                  disabled={removingId === r.id}
                  aria-label="Remove"
                >
                  <DeleteIcon size={14} />
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
                <PlusIcon size={15} />
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
        <label className="field" style={{ maxWidth: 200 }}>
          <span>Expected completion (optional)</span>
          <input
            type="date"
            value={form.expected_completion_date}
            onChange={(e) => setForm({ ...form, expected_completion_date: e.target.value })}
          />
        </label>
        <button type="button" className="btn-primary" style={{ alignSelf: 'flex-start' }} disabled={saving} onClick={add}>
          {saving ? 'Adding…' : 'Add project'}
        </button>
      </div>

      <Drawer open={!!membersProject} onClose={() => setMembersProject(null)} title={membersProject ? `Project · ${membersProject.name}` : ''}>
        {membersProject && (
          <>
            <ProjectDueDateForm project={membersProject} onChanged={onChanged} />
            <ProjectMembersEditor project={membersProject} employees={employees} company={company} />
          </>
        )}
      </Drawer>
    </div>
  )
}

function ProjectDueDateForm({ project, onChanged }) {
  const [date, setDate] = useState(project.expected_completion_date ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('projects').update({ expected_completion_date: date || null }).eq('id', project.id)
    setSaving(false)
    if (error) {
      toast.error(error.message || 'Failed to save')
      return
    }
    toast.success('Saved')
    onChanged()
  }

  return (
    <div style={{ padding: '0 24px 20px', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
      <label className="field" style={{ flex: 1, margin: 0 }}>
        <span>Expected completion</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <button type="button" className="btn-secondary" disabled={saving} onClick={save}>
        {saving ? 'Saving…' : 'Save'}
      </button>
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
      .select('id, subject, message, status, created_at, closed_at, resolution')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
    setTickets(data ?? [])
    setLoading(false)
  }, [company.id])

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
              {t.resolution && (
                <div style={{ background: 'var(--surface-alt, #f7f7f8)', borderRadius: 6, padding: 8, marginTop: 4 }}>
                  <p className="muted" style={{ fontSize: 11, margin: '0 0 3px' }}>Response from PeopleBind support</p>
                  <p style={{ fontSize: 12, margin: 0 }}>{t.resolution}</p>
                </div>
              )}
              <span className="muted mono" style={{ fontSize: 11 }}>{formatDate(t.created_at?.slice(0, 10))}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
