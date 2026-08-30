import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2, Camera, Mail, BadgeCheck, Building2, UserCog, Landmark, Hash } from 'lucide-react'
import { DeleteIcon } from '../components/ui/delete'
import { ChevronLeftIcon } from '../components/ui/chevron-left'
import { PlusIcon } from '../components/ui/plus'
import { PhoneIcon } from '../components/ui/phone'
import { CalendarDaysIcon } from '../components/ui/calendar-days'
import { UsersIcon } from '../components/ui/users'
import { UserIcon } from '../components/ui/user'
import { HeartIcon } from '../components/ui/heart'
import { PhoneCallIcon } from '../components/ui/phone-call'
import { CreditCardIcon } from '../components/ui/credit-card'
import { MapPinIcon } from '../components/ui/map-pin'
import { FileTextIcon } from '../components/ui/file-text'
import { CircleCheckIcon } from '../components/ui/circle-check'
import { ClockIcon } from '../components/ui/clock'
import { CalendarCheckIcon } from '../components/ui/calendar-check'
import { LogoutIcon } from '../components/ui/logout'
import { WalletIcon } from '../components/ui/wallet'
import { LayersIcon } from '../components/ui/layers'
import { ScanFaceIcon } from '../components/ui/scan-face'
import { FolderCogIcon } from '../components/ui/folder-cog'
import { CircleDollarSignIcon } from '../components/ui/circle-dollar-sign'
import { LeafIcon } from '../components/ui/leaf'
import { MonitorCheckIcon } from '../components/ui/monitor-check'
import { HandHeartIcon } from '../components/ui/hand-heart'
import { FileCheckIcon } from '../components/ui/file-check'
import { TrendingUpIcon } from '../components/ui/trending-up'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'
import { Avatar } from '../components/Avatar'
import { EmployeeFormDrawer } from '../components/EmployeeFormDrawer'
import { FileDropzone } from '../components/FileDropzone'
import { SkeletonBlock, SkeletonTable } from '../components/Skeleton'
import { STANDARD_KPI_METRICS } from '../lib/kpiMetrics'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmt(n) {
  return 'Rs. ' + Number(n ?? 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

function capitalize(str) {
  return str ? str[0].toUpperCase() + str.slice(1) : str
}

const TABS = [
  { key: 'personal', label: 'Personal Info', icon: ScanFaceIcon },
  { key: 'employment', label: 'Employment Info', icon: FolderCogIcon },
  { key: 'salary', label: 'Salary Info', icon: CircleDollarSignIcon },
  { key: 'leaves', label: 'Leaves', icon: LeafIcon },
  { key: 'performance', label: 'Performance', icon: TrendingUpIcon },
  { key: 'assets', label: 'Assets', icon: MonitorCheckIcon },
  { key: 'benefits', label: 'Benefits', icon: HandHeartIcon },
  { key: 'documents', label: 'Onboarding Docs', icon: FileCheckIcon },
]

export default function EmployeeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { company } = useAuth()
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('personal')
  const [editOpen, setEditOpen] = useState(false)
  const [managerName, setManagerName] = useState(null)
  const [lookups, setLookups] = useState({ departments: [], designations: [], teams: [], employmentTypes: [], branches: [], shifts: [] })
  const [employees, setEmployees] = useState([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoInputRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('employees')
      .select(
        'id, employee_code, full_name, photo_url, phone, personal_email, date_of_birth, gender, father_name, marital_status, emergency_contact_name, emergency_contact_phone, cnic, address, designation_id, team_id, department_id, employment_type_id, branch_id, employment_status, manager_id, hire_date, joining_date, probation_period_months, confirmation_date, exit_date, bank_name, bank_account_number, bank_iban, basic_salary, salary_level, designations(name), teams(name), departments!employees_department_id_fkey(name), employment_types(name), branches(name, city)'
      )
      .eq('id', id)
      .eq('company_id', company.id)
      .maybeSingle()
    if (error) toast.error(error.message || 'Failed to load employee')
    setEmployee(data ?? null)
    setLoading(false)

    if (data?.manager_id) {
      const { data: manager } = await supabase.from('employees').select('full_name, designations(name)').eq('id', data.manager_id).eq('company_id', company.id).maybeSingle()
      setManagerName(manager ? `${manager.full_name}${manager.designations?.name ? ` · ${manager.designations.name}` : ''}` : null)
    } else {
      setManagerName(null)
    }
  }, [id, company.id])

  const loadLookups = useCallback(async () => {
    const [{ data: departments }, { data: designations }, { data: teams }, { data: employmentTypes }, { data: branches }, { data: allEmployees }, { data: shifts }] = await Promise.all([
      supabase.from('departments').select('id,name').eq('company_id', company.id).eq('status', 'active').order('name'),
      supabase.from('designations').select('id,name').eq('company_id', company.id).eq('status', 'active').order('name'),
      supabase.from('teams').select('id,name').eq('company_id', company.id).eq('status', 'active').order('name'),
      supabase.from('employment_types').select('id,name').eq('company_id', company.id).order('name'),
      supabase.from('branches').select('id,name').eq('company_id', company.id).order('name'),
      supabase.from('employees').select('id, full_name').eq('company_id', company.id).in('employment_status', ['training', 'probation', 'confirmed']).order('full_name'),
      supabase.from('shifts').select('id,name').eq('company_id', company.id).eq('status', 'active').order('name'),
    ])
    setLookups({
      departments: departments ?? [],
      designations: designations ?? [],
      teams: teams ?? [],
      employmentTypes: employmentTypes ?? [],
      branches: branches ?? [],
      shifts: shifts ?? [],
    })
    setEmployees(allEmployees ?? [])
  }, [company.id])

  useEffect(() => {
    load()
    loadLookups()
  }, [load, loadLookups])

  async function createLookup(table, name) {
    if (!name.trim()) return null
    const { data, error } = await supabase.from(table).insert({ company_id: company.id, name: name.trim() }).select().single()
    if (error) {
      toast.error(error.message || 'Something went wrong')
      return null
    }
    await loadLookups()
    return data.id
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setUploadingPhoto(true)
    const ext = file.name.split('.').pop()
    const path = `${company.id}/${employee.id}-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file)
    if (uploadError) {
      setUploadingPhoto(false)
      toast.error(uploadError.message || 'Failed to upload photo')
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const { error: updateError } = await supabase.from('employees').update({ photo_url: publicUrl }).eq('id', employee.id)
    setUploadingPhoto(false)
    if (updateError) {
      toast.error(updateError.message)
      return
    }
    toast.success('Photo updated')
    load()
  }

  if (loading) {
    return (
      <div className="page-inner" style={{ maxWidth: 920 }}>
        <SkeletonBlock rows={6} />
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="page-inner" style={{ maxWidth: 920 }}>
        <button className="link-button" onClick={() => navigate('/app/people')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          <ChevronLeftIcon size={14} /> Back to employees
        </button>
        <div className="empty-state"><p>Employee not found.</p></div>
      </div>
    )
  }

  return (
    <div className="page-inner" style={{ maxWidth: 920 }}>
      <button className="link-button" onClick={() => navigate('/app/people')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
        <ChevronLeftIcon size={14} /> Back to employees
      </button>

      <div className="page-header-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ position: 'relative' }}>
            <Avatar name={employee.full_name} photoUrl={employee.photo_url} size={48} />
            <button
              type="button"
              className="avatar-upload-button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              aria-label="Change photo"
            >
              {uploadingPhoto ? <Loader2 size={12} className="btn-spinner" /> : <Camera size={12} />}
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoChange}
            />
          </div>
          <div>
            <p className="page-eyebrow" style={{ marginBottom: 4 }}>PEOPLE</p>
            <h1 className="page-title" style={{ marginBottom: 4, fontSize: 24 }}>{employee.full_name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="muted">{employee.designations?.name ?? 'No designation'}</span>
              <span className={`status-badge status-${employee.employment_status}`}>{employee.employment_status}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="employee-detail-shell">
        <div className="employee-detail-tabs">
          {TABS.map((t) => (
            <button key={t.key} className={`tab-button${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>

        <div className="employee-detail-content">
          {tab === 'personal' && <PersonalTab employee={employee} onEdit={() => setEditOpen(true)} />}
          {tab === 'employment' && (
            <EmploymentTab
              employee={employee}
              managerName={managerName}
              onEdit={() => setEditOpen(true)}
              onDeleted={() => navigate('/app/people')}
              onOffboarded={load}
            />
          )}
          {tab === 'salary' && <SalaryTab employee={employee} onEdit={() => setEditOpen(true)} />}
          {tab === 'leaves' && <LeavesTab employeeId={employee.id} company={company} />}
          {tab === 'performance' && <PerformanceTab employeeId={employee.id} company={company} />}
          {tab === 'assets' && <AssetsTab employeeId={employee.id} company={company} />}
          {tab === 'benefits' && <BenefitsTab employeeId={employee.id} company={company} />}
          {tab === 'documents' && <DocumentsTab employeeId={employee.id} company={company} />}
        </div>
      </div>

      <EmployeeFormDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initialData={employee}
        company={company}
        lookups={lookups}
        managerOptions={employees}
        createLookup={createLookup}
        onSaved={load}
      />
    </div>
  )
}

function InfoField({ icon: Icon, label, value }) {
  return (
    <div className="info-field">
      <span className="info-field-icon"><Icon size={15} /></span>
      <span className="info-field-body">
        <span className="info-field-label">{label}</span>
        <span className="info-field-value">{value ?? '—'}</span>
      </span>
    </div>
  )
}

function TabSection({ title, onEdit, children }) {
  return (
    <div className="report-section">
      <div className="report-section-head">
        <p className="section-heading">{title}</p>
        {onEdit && <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={onEdit}>Edit</button>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
        {children}
      </div>
    </div>
  )
}

function PersonalTab({ employee: e, onEdit }) {
  return (
    <TabSection title="Personal Info" onEdit={onEdit}>
      <InfoField icon={PhoneIcon} label="Contact #" value={e.phone} />
      <InfoField icon={Mail} label="Personal email" value={e.personal_email} />
      <InfoField icon={CalendarDaysIcon} label="Date of birth" value={e.date_of_birth ? formatDate(e.date_of_birth) : null} />
      <InfoField icon={UserIcon} label="Gender" value={capitalize(e.gender)} />
      <InfoField icon={UserIcon} label="Father name" value={e.father_name} />
      <InfoField icon={HeartIcon} label="Marital status" value={capitalize(e.marital_status)} />
      <InfoField icon={PhoneCallIcon} label="Emergency contact" value={e.emergency_contact_name ? `${e.emergency_contact_name}${e.emergency_contact_phone ? ` · ${e.emergency_contact_phone}` : ''}` : null} />
      <InfoField icon={CreditCardIcon} label="CNIC #" value={e.cnic} />
      <InfoField icon={MapPinIcon} label="Address" value={e.address} />
    </TabSection>
  )
}

function EmploymentTab({ employee: e, managerName, onEdit, onDeleted, onOffboarded }) {
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function loadHistory() {
      setHistoryLoading(true)
      const { data } = await supabase
        .from('employment_history')
        .select('id, effective_from, effective_to, reason, departments(name), designations(name), employment_types(name), branches(name)')
        .eq('employee_id', e.id)
        .order('effective_from', { ascending: false })
      if (active) {
        setHistory(data ?? [])
        setHistoryLoading(false)
      }
    }
    loadHistory()
    return () => { active = false }
  }, [e.id])

  return (
    <>
      <TabSection title="Employment Info" onEdit={onEdit}>
        <InfoField icon={CreditCardIcon} label="Employee ID" value={e.employee_code} />
        <InfoField icon={BadgeCheck} label="Designation" value={e.designations?.name} />
        <InfoField icon={UsersIcon} label="Team" value={e.teams?.name} />
        <InfoField icon={Building2} label="Department" value={e.departments?.name} />
        <InfoField icon={FileTextIcon} label="Employment type" value={e.employment_types?.name} />
        <InfoField icon={CircleCheckIcon} label="Employment status" value={capitalize(e.employment_status?.replace('_', ' '))} />
        <InfoField icon={CalendarDaysIcon} label="Hire date" value={e.hire_date ? formatDate(e.hire_date) : null} />
        <InfoField icon={CalendarDaysIcon} label="Joining date" value={formatDate(e.joining_date)} />
        <InfoField icon={ClockIcon} label="Probation time" value={e.probation_period_months ? `${e.probation_period_months} month${e.probation_period_months > 1 ? 's' : ''}` : null} />
        <InfoField icon={CalendarCheckIcon} label="Probation end date" value={e.confirmation_date ? formatDate(e.confirmation_date) : null} />
        <InfoField icon={LogoutIcon} label="Company exit date" value={e.exit_date ? formatDate(e.exit_date) : null} />
        <InfoField icon={UserCog} label="Reporting manager" value={managerName} />
        <InfoField icon={MapPinIcon} label="Location" value={e.branches?.name} />
      </TabSection>

      {!historyLoading && history.length > 0 && (
        <div className="report-section">
          <p className="section-heading">History</p>
          <div className="history-timeline">
            {history.map((h) => (
              <div key={h.id} className="history-item">
                <div className="history-item-date">
                  {formatDate(h.effective_from)}{h.effective_to ? ` – ${formatDate(h.effective_to)}` : ''}
                </div>
                <div className="history-item-summary">
                  {[h.designations?.name, h.departments?.name].filter(Boolean).join(' · ') || 'Employment details updated'}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {[h.employment_types?.name, h.branches?.name].filter(Boolean).join(' · ')}
                </div>
                {h.reason && <div className="muted" style={{ fontSize: 12, fontStyle: 'italic' }}>{h.reason}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      <OffboardCard employee={e} onOffboarded={onOffboarded} />
      <DangerZoneCard employee={e} onDeleted={onDeleted} />
    </>
  )
}

function OffboardCard({ employee, onOffboarded }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [statementOpen, setStatementOpen] = useState(false)
  const [form, setForm] = useState({ exit_date: new Date().toISOString().slice(0, 10), last_working_day: '', notice_pay_adjustment: '0', notes: '' })
  const [settlement, setSettlement] = useState(null)
  const [calculating, setCalculating] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [latest, setLatest] = useState(null)
  const [loadingLatest, setLoadingLatest] = useState(true)

  const loadLatest = useCallback(async () => {
    setLoadingLatest(true)
    const { data } = await supabase
      .from('employee_settlements')
      .select('id, exit_date, last_working_day, gratuity_amount, leave_encashment_amount, notice_pay_adjustment, loan_recovery_amount, net_settlement_amount, status, notes, finalized_at')
      .eq('employee_id', employee.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setLatest(data ?? null)
    setLoadingLatest(false)
  }, [employee.id])

  useEffect(() => {
    loadLatest()
  }, [loadLatest])

  function openDrawer() {
    setForm({
      exit_date: new Date().toISOString().slice(0, 10),
      last_working_day: '',
      notice_pay_adjustment: '0',
      notes: '',
    })
    setSettlement(null)
    setDrawerOpen(true)
  }

  async function preview() {
    setCalculating(true)
    const { data, error } = await supabase.rpc('calculate_employee_settlement', {
      p_employee_id: employee.id,
      p_exit_date: form.exit_date,
      p_last_working_day: form.last_working_day || null,
      p_notice_pay_adjustment: Number(form.notice_pay_adjustment || 0),
      p_notes: form.notes || null,
    })
    setCalculating(false)
    if (error) {
      toast.error(error.message || 'Failed to calculate settlement')
      return
    }
    setSettlement(data)
  }

  async function finalize() {
    if (!settlement) return
    setFinalizing(true)
    const { error } = await supabase.rpc('finalize_employee_settlement', { p_settlement_id: settlement.id })
    setFinalizing(false)
    if (error) {
      toast.error(error.message || 'Failed to finalize settlement')
      return
    }
    toast.success(`${employee.full_name} has been offboarded`)
    setDrawerOpen(false)
    loadLatest()
    onOffboarded?.()
  }

  if (loadingLatest) return null

  const alreadyOffboarded = employee.employment_status === 'terminated' || employee.employment_status === 'resigned'

  return (
    <div className="report-section">
      <p className="section-heading">Offboarding</p>

      {latest?.status === 'finalized' ? (
        <>
          <p className="muted" style={{ marginTop: 0 }}>
            {employee.full_name} was offboarded on {formatDate(latest.exit_date)}. Net settlement: Rs. {Number(latest.net_settlement_amount).toLocaleString('en-PK')}.
          </p>
          <button type="button" className="btn-secondary" onClick={() => setStatementOpen(true)}>View settlement statement</button>
        </>
      ) : alreadyOffboarded ? (
        <p className="muted" style={{ marginTop: 0 }}>
          {employee.full_name} is marked {employee.employment_status}. Run a Full &amp; Final Settlement to record their gratuity, leave encashment, and loan recovery.
        </p>
      ) : (
        <p className="muted" style={{ marginTop: 0 }}>
          When {employee.full_name} leaves the company, run their Full &amp; Final Settlement here — it computes gratuity,
          unused encashable leave, and any outstanding loan recovery, then marks them Terminated.
        </p>
      )}

      {!(latest?.status === 'finalized') && (
        <button type="button" className="btn-primary" onClick={openDrawer}>Offboard employee</button>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={`Offboard ${employee.full_name}`}>
        <div className="drawer-form">
          <div className="field-row">
            <label className="field">
              <span>Exit date</span>
              <input type="date" required value={form.exit_date} onChange={(e) => { setForm({ ...form, exit_date: e.target.value }); setSettlement(null) }} />
            </label>
            <label className="field">
              <span>Last working day</span>
              <input type="date" value={form.last_working_day} onChange={(e) => { setForm({ ...form, last_working_day: e.target.value }); setSettlement(null) }} />
            </label>
          </div>

          <label className="field">
            <span>Notice pay adjustment (Rs., +/-)</span>
            <input type="number" value={form.notice_pay_adjustment} onChange={(e) => { setForm({ ...form, notice_pay_adjustment: e.target.value }); setSettlement(null) }} />
          </label>

          <label className="field">
            <span>Notes</span>
            <textarea rows={2} value={form.notes} onChange={(e) => { setForm({ ...form, notes: e.target.value }); setSettlement(null) }} />
          </label>

          {!settlement ? (
            <button type="button" className="btn-secondary" disabled={calculating} onClick={preview}>
              {calculating && <Loader2 size={14} className="btn-spinner" />}
              {calculating ? 'Calculating…' : 'Preview settlement'}
            </button>
          ) : (
            <>
              <div className="payslip-row"><div><span className="label">Gratuity</span></div><span className="amount">{Number(settlement.gratuity_amount).toLocaleString('en-PK')}</span></div>
              <div className="payslip-row"><div><span className="label">Leave encashment</span></div><span className="amount">{Number(settlement.leave_encashment_amount).toLocaleString('en-PK')}</span></div>
              <div className="payslip-row"><div><span className="label">Notice pay adjustment</span></div><span className="amount">{Number(settlement.notice_pay_adjustment).toLocaleString('en-PK')}</span></div>
              <div className="payslip-row deduction"><div><span className="label">Loan recovery</span></div><span className="amount">– {Number(settlement.loan_recovery_amount).toLocaleString('en-PK')}</span></div>
              <div className="payslip-row total"><span className="label">Net settlement</span><span className="amount">{Number(settlement.net_settlement_amount).toLocaleString('en-PK')}</span></div>

              <button type="button" className="btn-secondary" disabled={calculating} onClick={preview}>Recalculate</button>
              <button type="button" className="btn-primary" disabled={finalizing} onClick={finalize}>
                {finalizing && <Loader2 size={14} className="btn-spinner" />}
                {finalizing ? 'Finalizing…' : 'Finalize & mark Terminated'}
              </button>
            </>
          )}
        </div>
      </Drawer>

      <Drawer open={statementOpen} onClose={() => setStatementOpen(false)} title="Settlement statement">
        {latest && (
          <div className="drawer-form">
            <p className="muted" style={{ marginTop: 0 }}>Exit date: {formatDate(latest.exit_date)}</p>
            <div className="payslip-row"><div><span className="label">Gratuity</span></div><span className="amount">{Number(latest.gratuity_amount).toLocaleString('en-PK')}</span></div>
            <div className="payslip-row"><div><span className="label">Leave encashment</span></div><span className="amount">{Number(latest.leave_encashment_amount).toLocaleString('en-PK')}</span></div>
            <div className="payslip-row"><div><span className="label">Notice pay adjustment</span></div><span className="amount">{Number(latest.notice_pay_adjustment).toLocaleString('en-PK')}</span></div>
            <div className="payslip-row deduction"><div><span className="label">Loan recovery</span></div><span className="amount">– {Number(latest.loan_recovery_amount).toLocaleString('en-PK')}</span></div>
            <div className="payslip-row total"><span className="label">Net settlement</span><span className="amount">{Number(latest.net_settlement_amount).toLocaleString('en-PK')}</span></div>
            {latest.notes && <p className="muted">{latest.notes}</p>}
          </div>
        )}
      </Drawer>
    </div>
  )
}

function DangerZoneCard({ employee, onDeleted }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [deleting, setDeleting] = useState(false)

  const matches = confirmName.trim() === employee.full_name

  async function handleDelete() {
    setDeleting(true)
    const { error } = await supabase.from('employees').delete().eq('id', employee.id)
    setDeleting(false)

    if (error) {
      if (error.code === '23503') {
        toast.error("Can't delete — this employee has payroll history. Mark them as Terminated instead.")
      } else {
        toast.error(error.message || 'Failed to delete employee')
      }
      return
    }

    toast.success('Employee deleted')
    onDeleted?.()
  }

  return (
    <div className="report-section" style={{ borderColor: 'var(--danger-soft)' }}>
      <p className="section-heading">Danger zone</p>
      <p className="muted" style={{ marginTop: 0 }}>
        Deleting permanently removes {employee.full_name}'s attendance, leave, benefits, documents, performance
        reviews, and timesheet history. This can't be undone. Employees with actual payroll history can't be
        deleted this way — use Offboarding above instead.
      </p>
      <button type="button" className="btn-danger" onClick={() => setDrawerOpen(true)}>Delete employee</button>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Delete employee">
        <div className="drawer-form">
          <p style={{ margin: 0 }}>
            This will permanently delete <strong>{employee.full_name}</strong> and every record tied to them —
            attendance, leave requests and balances, benefits, documents, performance reviews, goals, and timesheet
            entries. There is no undo.
          </p>
          <label className="field">
            <span>Type "{employee.full_name}" to confirm</span>
            <input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} autoComplete="off" />
          </label>
          <button type="button" className="btn-danger" disabled={!matches || deleting} onClick={handleDelete}>
            {deleting ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </Drawer>
    </div>
  )
}

function addDays(dateStr, delta) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const EMPTY_SALARY_CHANGE_FORM = {
  payroll_component_id: '',
  amount: '',
  effective_from: new Date().toISOString().slice(0, 10),
}

function SalaryTab({ employee: e, onEdit }) {
  const { profile, company } = useAuth()
  const [components, setComponents] = useState([])
  const [payrollComponents, setPayrollComponents] = useState([])
  const [lockedRuns, setLockedRuns] = useState([])
  const [loading, setLoading] = useState(true)

  const [changeOpen, setChangeOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_SALARY_CHANGE_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const loadComponents = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('employee_salary_components')
      .select('id, amount, effective_from, effective_to, payroll_components(name, component_type)')
      .eq('employee_id', e.id)
      .is('effective_to', null)
      .order('effective_from', { ascending: false })
    setComponents(data ?? [])
    setLoading(false)
  }, [e.id])

  useEffect(() => {
    loadComponents()
  }, [loadComponents])

  useEffect(() => {
    let active = true
    async function loadLookups() {
      const [{ data: comps }, { data: runs }] = await Promise.all([
        supabase.from('payroll_components').select('id, name, component_type').eq('company_id', company.id).eq('status', 'active').order('component_type').order('name'),
        supabase.from('payroll_runs').select('id, status, payroll_periods(period_start, period_end, label)').eq('company_id', company.id).neq('status', 'draft'),
      ])
      if (active) {
        setPayrollComponents(comps ?? [])
        setLockedRuns(runs ?? [])
      }
    }
    loadLookups()
    return () => { active = false }
  }, [company.id])

  const overlappingLockedRun = form.effective_from
    ? lockedRuns.find((r) => r.payroll_periods && r.payroll_periods.period_end >= form.effective_from)
    : null

  function openChange() {
    setForm({ ...EMPTY_SALARY_CHANGE_FORM })
    setError(null)
    setChangeOpen(true)
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    setError(null)
    setSaving(true)

    const { data: overlapping } = await supabase
      .from('employee_salary_components')
      .select('id, effective_from')
      .eq('employee_id', e.id)
      .eq('payroll_component_id', form.payroll_component_id)
      .is('effective_to', null)

    for (const row of overlapping ?? []) {
      if (row.effective_from < form.effective_from) {
        await supabase
          .from('employee_salary_components')
          .update({ effective_to: addDays(form.effective_from, -1) })
          .eq('id', row.id)
      }
    }

    const { error: saveError } = await supabase.from('employee_salary_components').insert({
      company_id: company.id,
      employee_id: e.id,
      payroll_component_id: form.payroll_component_id,
      amount: Number(form.amount),
      effective_from: form.effective_from,
      created_by: profile.id,
    })

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      toast.error(saveError.message)
      return
    }

    toast.success('Salary change saved')
    setChangeOpen(false)
    loadComponents()
  }

  return (
    <>
      <TabSection title="Salary Info" onEdit={onEdit}>
        <InfoField icon={WalletIcon} label="Basic salary" value={e.basic_salary != null ? fmt(e.basic_salary) : null} />
        <InfoField icon={LayersIcon} label="Salary level" value={e.salary_level} />
        <InfoField icon={Landmark} label="Bank name" value={e.bank_name} />
        <InfoField icon={CreditCardIcon} label="Account number" value={e.bank_account_number} />
        <InfoField icon={Hash} label="IBAN" value={e.bank_iban} />
      </TabSection>

      <div className="report-section">
        <div className="report-section-head">
          <p className="section-heading">Active salary components</p>
          <button className="btn-primary btn-icon" onClick={openChange} style={{ padding: '6px 12px', fontSize: 13 }}>
            <PlusIcon size={14} /> Add salary change
          </button>
        </div>
        {loading ? (
          <SkeletonBlock rows={2} />
        ) : components.length === 0 ? (
          <p className="muted">No salary components configured yet.</p>
        ) : (
          <table className="data-table">
            <thead><tr><th>Component</th><th>Type</th><th>Amount</th><th>Effective from</th></tr></thead>
            <tbody>
              {components.map((c) => (
                <tr key={c.id} style={{ cursor: 'default' }}>
                  <td>{c.payroll_components?.name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{c.payroll_components?.component_type}</td>
                  <td className="mono">{fmt(c.amount)}</td>
                  <td className="mono">{formatDate(c.effective_from)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Drawer open={changeOpen} onClose={() => setChangeOpen(false)} title="Add salary change">
        <form onSubmit={handleSubmit} className="drawer-form">
          <label className="field">
            <span>Component</span>
            <select
              required
              value={form.payroll_component_id}
              onChange={(ev) => setForm({ ...form, payroll_component_id: ev.target.value })}
            >
              <option value="">— Select —</option>
              {payrollComponents.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.component_type})</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Amount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={form.amount}
              onChange={(ev) => setForm({ ...form, amount: ev.target.value })}
            />
          </label>

          <label className="field">
            <span>Effective from</span>
            <input
              type="date"
              required
              value={form.effective_from}
              onChange={(ev) => setForm({ ...form, effective_from: ev.target.value })}
            />
          </label>

          <p className="muted" style={{ margin: 0 }}>
            If this component is already active, its previous amount will be closed out the day before this one starts.
          </p>

          {overlappingLockedRun && (
            <p className="field-error" style={{ margin: 0 }}>
              {overlappingLockedRun.payroll_periods?.label || 'A payroll run'} covering this date is already {overlappingLockedRun.status} — this change will apply from the next run onward, not retroactively.
            </p>
          )}

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={14} className="btn-spinner" />}
            {saving ? 'Saving…' : 'Save change'}
          </button>
        </form>
      </Drawer>
    </>
  )
}

function LeavesTab({ employeeId, company }) {
  const [balances, setBalances] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const year = new Date().getFullYear()
      const [{ data: b }, { data: r }] = await Promise.all([
        supabase.from('v_leave_usage').select('leave_type, entitled_days, used_days, remaining_days').eq('employee_id', employeeId).eq('year', year),
        supabase.from('leave_requests').select('id, start_date, end_date, days_requested, status, leave_types(name)').eq('employee_id', employeeId).eq('company_id', company.id).order('created_at', { ascending: false }),
      ])
      if (active) {
        setBalances(b ?? [])
        setRequests(r ?? [])
        setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [employeeId, company.id])

  if (loading) return <SkeletonBlock rows={4} />

  return (
    <>
      <div className="report-section">
        <p className="section-heading">Balance this year</p>
        {balances.length === 0 ? (
          <p className="muted">No balance set yet.</p>
        ) : (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {balances.map((b) => (
              <div key={b.leave_type} className="mini-card" style={{ minWidth: 140 }}>
                <div className="muted" style={{ fontSize: 12 }}>{b.leave_type}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>{b.remaining_days}</div>
                <div className="muted" style={{ fontSize: 11 }}>of {b.entitled_days} days</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="report-section">
        <p className="section-heading">Requests</p>
        {requests.length === 0 ? (
          <p className="muted">No leave requests yet.</p>
        ) : (
          <table className="data-table">
            <thead><tr><th>Type</th><th>Dates</th><th>Days</th><th>Status</th></tr></thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} style={{ cursor: 'default' }}>
                  <td>{r.leave_types?.name}</td>
                  <td className="mono">{formatDate(r.start_date)}{r.end_date !== r.start_date ? ` – ${formatDate(r.end_date)}` : ''}</td>
                  <td className="mono">{r.days_requested ?? '—'}</td>
                  <td><span className={`status-badge status-${r.status}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

function PerformanceTab({ employeeId, company }) {
  const [kpiCatalog, setKpiCatalog] = useState([])
  const [kpiValues, setKpiValues] = useState({})
  const [kpiLoading, setKpiLoading] = useState(true)
  const [reviews, setReviews] = useState([])
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const [{ data: r }, { data: g }] = await Promise.all([
        supabase.from('performance_reviews').select('id, overall_rating, status, submitted_at, review_cycles(name), profiles(full_name)').eq('employee_id', employeeId).eq('company_id', company.id).order('created_at', { ascending: false }),
        supabase.from('goals').select('id, title, status, target_date').eq('employee_id', employeeId).eq('company_id', company.id).order('target_date', { ascending: false, nullsFirst: false }),
      ])
      if (active) {
        setReviews(r ?? [])
        setGoals(g ?? [])
        setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [employeeId, company.id])

  useEffect(() => {
    let active = true
    async function loadKpiSnapshot() {
      setKpiLoading(true)
      const { data: catalog } = await supabase.from('kpi_definitions').select('id, name, metric_key').eq('company_id', company.id).eq('kpi_type', 'standard').eq('status', 'active').order('name')
      if (!active) return
      setKpiCatalog(catalog ?? [])

      const to = new Date()
      const from = new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000)
      const toStr = to.toISOString().slice(0, 10)
      const fromStr = from.toISOString().slice(0, 10)

      const values = {}
      for (const kpi of catalog ?? []) {
        const metric = STANDARD_KPI_METRICS[kpi.metric_key]
        values[kpi.id] = metric ? await metric.fetch(employeeId, fromStr, toStr) : null
      }
      if (active) {
        setKpiValues(values)
        setKpiLoading(false)
      }
    }
    if (company?.id) loadKpiSnapshot()
    return () => { active = false }
  }, [employeeId, company?.id])

  if (loading) return <SkeletonBlock rows={4} />

  return (
    <>
      <div className="report-section">
        <p className="section-heading">Standard KPI snapshot</p>
        <p className="muted" style={{ marginTop: 0, fontSize: 12 }}>Computed live from the last 90 days — independent of any review.</p>
        {kpiLoading ? (
          <SkeletonBlock rows={2} />
        ) : kpiCatalog.length === 0 ? (
          <p className="muted">No standard KPIs configured.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            {kpiCatalog.map((kpi) => {
              const value = kpiValues[kpi.id]
              return (
                <div key={kpi.id} className="mini-card">
                  {/* fixed to a 2-line height so a long label (e.g. "Onboarding
                      completion rate") doesn't make its whole grid row taller
                      than the rows around it -- every card ends up the same size */}
                  <div className="muted" style={{ fontSize: 12, minHeight: 32, lineHeight: '16px' }}>{kpi.name}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>
                    {value == null ? '—' : `${Math.round(value * 100)}%`}
                  </div>
                  <div className="muted" style={{ fontSize: 11 }}>{value == null ? 'Not enough data' : 'last 90 days'}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="report-section">
        <p className="section-heading">Review history</p>
        {reviews.length === 0 ? (
          <p className="muted">No reviews yet.</p>
        ) : (
          <table className="data-table">
            <thead><tr><th>Cycle</th><th>Reviewer</th><th>Rating</th><th>Status</th></tr></thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id} style={{ cursor: 'default' }}>
                  <td>{r.review_cycles?.name ?? '—'}</td>
                  <td>{r.profiles?.full_name ?? '—'}</td>
                  <td className="mono">{r.overall_rating ? `${r.overall_rating}/5` : '—'}</td>
                  <td><span className={`status-badge status-${r.status === 'acknowledged' ? 'approved' : r.status === 'submitted' ? 'pending' : ''}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="report-section">
        <p className="section-heading">Goals</p>
        {goals.length === 0 ? (
          <p className="muted">No goals yet.</p>
        ) : (
          <table className="data-table">
            <thead><tr><th>Goal</th><th>Target date</th><th>Status</th></tr></thead>
            <tbody>
              {goals.map((g) => (
                <tr key={g.id} style={{ cursor: 'default' }}>
                  <td>{g.title}</td>
                  <td className="mono">{formatDate(g.target_date)}</td>
                  <td><span className={`status-badge status-${g.status === 'completed' ? 'approved' : g.status === 'cancelled' ? 'rejected' : 'pending'}`}>{g.status.replace('_', ' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

const ASSET_TYPES = ['Laptop', 'Monitor', 'Phone', 'ID card', 'Vehicle', 'SIM card']
const ASSET_EMPTY_FORM = { asset_type: '', description: '', assigned_date: new Date().toISOString().slice(0, 10) }

function AssetsTab({ employeeId, company }) {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState(ASSET_EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('assets')
      .select('id, asset_type, description, assigned_date, returned_date, status')
      .eq('employee_id', employeeId)
      .order('assigned_date', { ascending: false })
    setAssets(data ?? [])
    setLoading(false)
  }, [employeeId])

  useEffect(() => { load() }, [load])

  async function handleSubmit(ev) {
    ev.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('assets').insert({
      company_id: company.id,
      employee_id: employeeId,
      asset_type: form.asset_type,
      description: form.description || null,
      assigned_date: form.assigned_date,
      status: 'assigned',
    })
    setSaving(false)
    if (error) {
      toast.error(error.message || 'Failed to assign asset')
      return
    }
    toast.success('Asset assigned')
    setDrawerOpen(false)
    setForm(ASSET_EMPTY_FORM)
    load()
  }

  async function markReturned(asset) {
    const { error } = await supabase.from('assets').update({ status: 'returned', returned_date: new Date().toISOString().slice(0, 10) }).eq('id', asset.id)
    if (!error) {
      toast.success('Marked as returned')
      load()
    } else {
      toast.error(error.message)
    }
  }

  return (
    <div className="report-section">
      <div className="report-section-head">
        <p className="section-heading">Assets</p>
        <button className="btn-primary btn-icon" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => setDrawerOpen(true)}>
          <PlusIcon size={14} /> Assign asset
        </button>
      </div>
      {loading ? (
        <SkeletonTable rows={3} columns={4} />
      ) : assets.length === 0 ? (
        <p className="muted">No assets assigned yet.</p>
      ) : (
        <table className="data-table">
          <thead><tr><th>Type</th><th>Description</th><th>Assigned</th><th>Status</th></tr></thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id} style={{ cursor: 'default' }}>
                <td>{a.asset_type}</td>
                <td>{a.description || '—'}</td>
                <td className="mono">{formatDate(a.assigned_date)}</td>
                <td>
                  <span className={`status-badge status-${a.status}`}>{a.status}</span>
                  {a.status === 'assigned' && (
                    <button className="link-button" style={{ marginLeft: 8, fontSize: 12 }} onClick={() => markReturned(a)}>Mark returned</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Assign asset">
        <form onSubmit={handleSubmit} className="drawer-form">
          <label className="field">
            <span>Asset type</span>
            <input required list="asset-types" value={form.asset_type} onChange={(e) => setForm({ ...form, asset_type: e.target.value })} />
            <datalist id="asset-types">
              {ASSET_TYPES.map((t) => <option key={t} value={t} />)}
            </datalist>
          </label>
          <label className="field">
            <span>Description</span>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
          </label>
          <label className="field">
            <span>Assigned date</span>
            <input type="date" required value={form.assigned_date} onChange={(e) => setForm({ ...form, assigned_date: e.target.value })} />
          </label>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={14} className="btn-spinner" />}
            {saving ? 'Assigning…' : 'Assign asset'}
          </button>
        </form>
      </Drawer>
    </div>
  )
}

const BENEFIT_EMPTY_FORM = { benefit_type_id: '', start_date: new Date().toISOString().slice(0, 10), end_date: '', notes: '' }

function BenefitsTab({ employeeId, company }) {
  const [benefits, setBenefits] = useState([])
  const [benefitTypes, setBenefitTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState(BENEFIT_EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: b }, { data: bt }] = await Promise.all([
      supabase
        .from('employee_benefits')
        .select('id, start_date, end_date, notes, benefit_types(name)')
        .eq('employee_id', employeeId)
        .order('start_date', { ascending: false }),
      supabase.from('benefit_types').select('id, name').eq('status', 'active').order('name'),
    ])
    setBenefits(b ?? [])
    setBenefitTypes(bt ?? [])
    setLoading(false)
  }, [employeeId])

  useEffect(() => { load() }, [load])

  async function createBenefitType(name) {
    if (!name.trim()) return null
    const { data, error } = await supabase.from('benefit_types').insert({ company_id: company.id, name: name.trim() }).select().single()
    if (error) {
      toast.error(error.message || 'Failed to add benefit type')
      return null
    }
    await load()
    return data.id
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    if (!form.benefit_type_id) return
    setSaving(true)
    const { error } = await supabase.from('employee_benefits').insert({
      company_id: company.id,
      employee_id: employeeId,
      benefit_type_id: form.benefit_type_id,
      start_date: form.start_date,
      end_date: form.end_date || null,
      notes: form.notes || null,
    })
    setSaving(false)
    if (error) {
      toast.error(error.message || 'Failed to add benefit')
      return
    }
    toast.success('Benefit added')
    setDrawerOpen(false)
    setForm(BENEFIT_EMPTY_FORM)
    load()
  }

  async function remove(id) {
    const { error } = await supabase.from('employee_benefits').delete().eq('id', id)
    if (!error) {
      toast.success('Benefit removed')
      load()
    } else {
      toast.error(error.message)
    }
  }

  return (
    <div className="report-section">
      <div className="report-section-head">
        <p className="section-heading">Benefits</p>
        <button className="btn-primary btn-icon" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => setDrawerOpen(true)}>
          <PlusIcon size={14} /> Add benefit
        </button>
      </div>
      {loading ? (
        <SkeletonTable rows={3} columns={4} />
      ) : benefits.length === 0 ? (
        <p className="muted">No benefits recorded yet.</p>
      ) : (
        <table className="data-table">
          <thead><tr><th>Benefit</th><th>Start</th><th>End</th><th>Notes</th><th></th></tr></thead>
          <tbody>
            {benefits.map((b) => (
              <tr key={b.id} style={{ cursor: 'default' }}>
                <td>{b.benefit_types?.name}</td>
                <td className="mono">{formatDate(b.start_date)}</td>
                <td className="mono">{b.end_date ? formatDate(b.end_date) : '—'}</td>
                <td className="muted">{b.notes || '—'}</td>
                <td>
                  <button className="link-button" style={{ color: 'var(--danger)', display: 'flex' }} onClick={() => remove(b.id)} aria-label="Remove">
                    <DeleteIcon size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Add benefit">
        <form onSubmit={handleSubmit} className="drawer-form">
          <BenefitTypeSelect value={form.benefit_type_id} options={benefitTypes} onChange={(id) => setForm({ ...form, benefit_type_id: id })} onCreate={(name) => createBenefitType(name).then((id) => id && setForm((f) => ({ ...f, benefit_type_id: id })))} />
          <div className="field-row">
            <label className="field">
              <span>Start date</span>
              <input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </label>
            <label className="field">
              <span>End date</span>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} placeholder="Ongoing" />
            </label>
          </div>
          <label className="field">
            <span>Notes</span>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
          </label>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={14} className="btn-spinner" />}
            {saving ? 'Adding…' : 'Add benefit'}
          </button>
        </form>
      </Drawer>
    </div>
  )
}

function BenefitTypeSelect({ value, options, onChange, onCreate }) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  if (adding) {
    return (
      <div className="field">
        <span>Benefit type</span>
        <div className="lookup-add" style={{ marginTop: 0 }}>
          <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New benefit type" />
          <button type="button" className="lookup-add-btn" onClick={() => { onCreate(newName); setNewName(''); setAdding(false) }} aria-label="Add benefit type">
            <PlusIcon size={15} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <label className="field">
      <span>Benefit type</span>
      <select value={value} onChange={(e) => (e.target.value === '__new__' ? setAdding(true) : onChange(e.target.value))}>
        <option value="">—</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        <option value="__new__">+ Add new…</option>
      </select>
    </label>
  )
}

const DOC_TYPES = ['Offer letter', 'Employment contract', 'Handbook', 'CNIC', 'Degree / certificate', 'Experience letter']

function DocumentsTab({ employeeId, company }) {
  const { profile } = useAuth()
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [docType, setDocType] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('documents')
      .select('id, doc_type, file_path, expiry_date, uploaded_at')
      .eq('employee_id', employeeId)
      .order('uploaded_at', { ascending: false })
    setDocs(data ?? [])
    setLoading(false)
  }, [employeeId])

  useEffect(() => { load() }, [load])

  function openUpload() {
    setDocType('')
    setExpiryDate('')
    setFile(null)
    setDrawerOpen(true)
  }

  async function handleUpload(ev) {
    ev.preventDefault()
    if (!file) {
      toast.error('Choose a file first.')
      return
    }
    setUploading(true)
    const path = `${company.id}/${employeeId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)
    if (uploadError) {
      setUploading(false)
      toast.error(uploadError.message || 'Upload failed')
      return
    }
    const { error: insertError } = await supabase.from('documents').insert({
      company_id: company.id,
      employee_id: employeeId,
      doc_type: docType,
      file_path: path,
      expiry_date: expiryDate || null,
      uploaded_by: profile.id,
    })
    setUploading(false)
    if (insertError) {
      toast.error(insertError.message || 'Something went wrong')
      return
    }
    toast.success('Document uploaded')
    setDrawerOpen(false)
    load()
  }

  async function handleView(doc) {
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 60)
    if (error) {
      toast.error("Couldn't open that file")
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  async function handleDelete(doc) {
    await supabase.storage.from('documents').remove([doc.file_path])
    const { error } = await supabase.from('documents').delete().eq('id', doc.id)
    if (!error) {
      toast.success('Document removed')
      load()
    }
  }

  return (
    <div className="report-section">
      <div className="report-section-head">
        <p className="section-heading">Onboarding Docs</p>
        <button className="btn-primary btn-icon" style={{ padding: '6px 12px', fontSize: 13 }} onClick={openUpload}>
          <PlusIcon size={14} /> Upload
        </button>
      </div>
      {loading ? (
        <SkeletonTable rows={3} columns={3} />
      ) : docs.length === 0 ? (
        <p className="muted">No documents uploaded yet.</p>
      ) : (
        <table className="data-table">
          <thead><tr><th>Type</th><th>Uploaded</th><th>Expiry</th><th></th></tr></thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} style={{ cursor: 'default' }}>
                <td><button className="link-button" onClick={() => handleView(d)}>{d.doc_type}</button></td>
                <td className="mono">{formatDate(d.uploaded_at?.slice(0, 10))}</td>
                <td className="mono">{d.expiry_date ? formatDate(d.expiry_date) : '—'}</td>
                <td>
                  <button className="link-button" style={{ color: 'var(--danger)', display: 'flex' }} onClick={() => handleDelete(d)} aria-label="Remove">
                    <DeleteIcon size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Upload document">
        <form onSubmit={handleUpload} className="drawer-form">
          <label className="field">
            <span>Document type</span>
            <input required list="doc-types" value={docType} onChange={(e) => setDocType(e.target.value)} />
            <datalist id="doc-types">
              {DOC_TYPES.map((t) => <option key={t} value={t} />)}
            </datalist>
          </label>
          <div className="field">
            <span>File</span>
            <FileDropzone value={file} onChange={setFile} label="Drop a file here, or click to browse" />
          </div>
          <label className="field">
            <span>Expiry date</span>
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} placeholder="Optional" />
          </label>
          <button type="submit" className="btn-primary" disabled={uploading}>
            {uploading && <Loader2 size={14} className="btn-spinner" />}
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </form>
      </Drawer>
    </div>
  )
}
