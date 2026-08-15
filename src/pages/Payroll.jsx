import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { Plus, ChevronLeft, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'

function fmt(n) {
  return 'Rs. ' + Number(n ?? 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function addDays(dateStr, delta) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

const EMPTY_RUN_FORM = {
  label: '',
  period_start: '',
  period_end: '',
}

const EMPTY_COMPONENT_FORM = {
  payroll_component_id: '',
  amount: '',
  effective_from: new Date().toISOString().slice(0, 10),
}

export default function Payroll() {
  const { profile, company } = useAuth()
  const [tab, setTab] = useState('runs')

  return (
    <div className="page-inner" style={{ maxWidth: 1020 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">PAYROLL</p>
          <h1 className="page-title">Payroll</h1>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-button${tab === 'runs' ? ' active' : ''}`} onClick={() => setTab('runs')}>
          Runs
        </button>
        <button className={`tab-button${tab === 'structures' ? ' active' : ''}`} onClick={() => setTab('structures')}>
          Salary structures
        </button>
      </div>

      {tab === 'runs' && <RunsTab profile={profile} company={company} />}
      {tab === 'structures' && <StructuresTab profile={profile} company={company} />}
    </div>
  )
}

/* =========================== RUNS =========================== */

function RunsTab({ profile, company }) {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeRunId, setActiveRunId] = useState(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_RUN_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const loadRuns = useCallback(async () => {
    setLoading(true)
    const [{ data: runRows }, { data: summaryRows }] = await Promise.all([
      supabase
        .from('payroll_runs')
        .select('id, status, created_at, payroll_periods(label, period_start, period_end)')
        .order('created_at', { ascending: false }),
      supabase.from('v_payroll_run_summary').select('payroll_run_id, employee_count, total_earnings, total_deductions, total_net'),
    ])
    const summaryByRun = {}
    for (const s of summaryRows ?? []) summaryByRun[s.payroll_run_id] = s
    setRuns((runRows ?? []).map((r) => ({ ...r, summary: summaryByRun[r.id] })))
    setLoading(false)
  }, [])

  useEffect(() => {
    loadRuns()
  }, [loadRuns])

  function openNew() {
    setForm(EMPTY_RUN_FORM)
    setError(null)
    setDrawerOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const { data: period, error: periodError } = await supabase
      .from('payroll_periods')
      .insert({ company_id: company.id, label: form.label, period_start: form.period_start, period_end: form.period_end })
      .select()
      .single()

    if (periodError) {
      setSaving(false)
      setError(periodError.message)
      return
    }

    const { error: runError } = await supabase
      .from('payroll_runs')
      .insert({ company_id: company.id, payroll_period_id: period.id, created_by: profile.id })

    setSaving(false)

    if (runError) {
      setError(runError.message)
      return
    }

    setDrawerOpen(false)
    loadRuns()
  }

  if (activeRunId) {
    return (
      <RunDetail
        runId={activeRunId}
        profile={profile}
        onBack={() => {
          setActiveRunId(null)
          loadRuns()
        }}
      />
    )
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
        <button className="btn-primary btn-icon" onClick={openNew}>
          <Plus size={16} /> New period
        </button>
      </div>

      {loading ? (
        <p className="muted" style={{ marginTop: 20 }}>Loading…</p>
      ) : runs.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>No payroll periods yet.</p>
          <p className="muted">Create a period (e.g. "August 2026") to start a payroll run.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Status</th>
              <th>Employees</th>
              <th>Earnings</th>
              <th>Deductions</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} onClick={() => setActiveRunId(r.id)}>
                <td>
                  {r.payroll_periods?.label}
                  <span className="mono" style={{ display: 'block', color: 'var(--ink-soft)', fontSize: 12 }}>
                    {formatDate(r.payroll_periods?.period_start)} – {formatDate(r.payroll_periods?.period_end)}
                  </span>
                </td>
                <td><span className={`status-badge status-${r.status === 'finalized' ? 'approved' : r.status}`}>{r.status}</span></td>
                <td className="mono">{r.summary?.employee_count ?? '—'}</td>
                <td className="mono">{r.summary ? fmt(r.summary.total_earnings) : '—'}</td>
                <td className="mono">{r.summary ? fmt(r.summary.total_deductions) : '—'}</td>
                <td className="mono">{r.summary ? fmt(r.summary.total_net) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="New payroll period">
        <form onSubmit={handleSubmit} className="drawer-form">
          <label className="field">
            <span>Label</span>
            <input
              required
              placeholder="e.g. August 2026"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Period start</span>
              <input type="date" required value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
            </label>
            <label className="field">
              <span>Period end</span>
              <input
                type="date"
                required
                min={form.period_start}
                value={form.period_end}
                onChange={(e) => setForm({ ...form, period_end: e.target.value })}
              />
            </label>
          </div>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Creating…' : 'Create period & run'}
          </button>
        </form>
      </Drawer>
    </>
  )
}

function RunDetail({ runId, profile, onBack }) {
  const [run, setRun] = useState(null)
  const [items, setItems] = useState([])
  const [exceptions, setExceptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

  const [payslipEmployee, setPayslipEmployee] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: runRow }, { data: itemRows }, { data: exceptionRows }] = await Promise.all([
      supabase
        .from('payroll_runs')
        .select('id, status, finalized_at, payroll_periods(label, period_start, period_end)')
        .eq('id', runId)
        .single(),
      supabase
        .from('payroll_items')
        .select('id, employee_id, component_name, component_type, amount, notes, employees(full_name, employee_code)')
        .eq('payroll_run_id', runId),
      supabase.rpc('get_payroll_exceptions', { p_payroll_run_id: runId }),
    ])
    setRun(runRow ?? null)
    setItems(itemRows ?? [])
    setExceptions(exceptionRows ?? [])
    setLoading(false)
  }, [runId])

  useEffect(() => {
    load()
  }, [load])

  const byEmployee = useMemo(() => {
    const map = {}
    for (const item of items) {
      if (!map[item.employee_id]) {
        map[item.employee_id] = {
          employee: item.employees,
          earnings: 0,
          deductions: 0,
          items: [],
        }
      }
      map[item.employee_id].items.push(item)
      if (item.component_type === 'earning') map[item.employee_id].earnings += Number(item.amount)
      else map[item.employee_id].deductions += Number(item.amount)
    }
    return Object.entries(map).map(([employeeId, v]) => ({ employeeId, ...v }))
  }, [items])

  async function runCalculation() {
    setActionError(null)
    setBusy(true)
    const { error } = await supabase.rpc('run_payroll_calculation', { p_payroll_run_id: runId })
    setBusy(false)
    if (error) {
      setActionError(error.message)
      return
    }
    toast.success('Payroll calculated')
    load()
  }

  async function approve() {
    setActionError(null)
    setBusy(true)
    const { error } = await supabase.from('payroll_runs').update({ status: 'approved' }).eq('id', runId)
    setBusy(false)
    if (error) {
      setActionError(error.message)
      return
    }
    toast.success('Run approved')
    load()
  }

  async function finalize() {
    setActionError(null)
    setBusy(true)
    const { error } = await supabase.rpc('finalize_payroll_run', { p_payroll_run_id: runId })
    setBusy(false)
    if (error) {
      setActionError(error.message)
      return
    }
    toast.success('Payroll finalized', { description: 'This run is now locked.' })
    load()
  }

  if (loading) return <p className="muted" style={{ marginTop: 20 }}>Loading…</p>
  if (!run) return null

  const isDraft = run.status === 'draft'
  const isApproved = run.status === 'approved'
  const isFinalized = run.status === 'finalized'

  return (
    <div>
      <button className="link-button" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
        <ChevronLeft size={14} /> Back to runs
      </button>

      <div className="page-header-row">
        <div>
          <h2 style={{ margin: '0 0 4px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20 }}>
            {run.payroll_periods?.label}
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            {formatDate(run.payroll_periods?.period_start)} – {formatDate(run.payroll_periods?.period_end)} ·{' '}
            <span className={`status-badge status-${isFinalized ? 'approved' : run.status}`}>{run.status}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isFinalized && (
            <button className="btn-primary" onClick={runCalculation} disabled={busy}>
              {busy ? 'Working…' : items.length === 0 ? 'Calculate payroll' : 'Recalculate'}
            </button>
          )}
          {isDraft && items.length > 0 && (
            <button className="btn-primary" onClick={approve} disabled={busy}>Approve</button>
          )}
          {isApproved && (
            <button className="btn-primary" onClick={finalize} disabled={busy}>Finalize</button>
          )}
        </div>
      </div>

      {actionError && <p className="field-error" style={{ marginBottom: 16 }}>{actionError}</p>}

      {exceptions.length > 0 && (
        <div className="exception-box">
          <p className="exception-heading"><AlertTriangle size={14} /> {exceptions.length} item{exceptions.length > 1 ? 's' : ''} need attention</p>
          <ul>
            {exceptions.map((e, i) => (
              <li key={i}>
                <strong>{e.employee_name}</strong> — {e.issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>Not calculated yet.</p>
          <p className="muted">Run the calculation to pull in salary structures, overtime, leave, loans, and tax for this period.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Earnings</th>
              <th>Deductions</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            {byEmployee.map((row) => (
              <tr key={row.employeeId} onClick={() => setPayslipEmployee(row)}>
                <td>
                  {row.employee?.full_name}
                  <span className="mono" style={{ display: 'block', color: 'var(--ink-soft)', fontSize: 12 }}>
                    {row.employee?.employee_code}
                  </span>
                </td>
                <td className="mono">{fmt(row.earnings)}</td>
                <td className="mono">{fmt(row.deductions)}</td>
                <td className="mono">{fmt(row.earnings - row.deductions)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Drawer
        open={!!payslipEmployee}
        onClose={() => setPayslipEmployee(null)}
        title={payslipEmployee ? `${payslipEmployee.employee?.full_name} · ${run.payroll_periods?.label}` : ''}
      >
        {payslipEmployee && (
          <div className="payslip-drawer">
            {payslipEmployee.items.map((item) => (
              <div key={item.id} className={`payslip-row${item.component_type === 'deduction' ? ' deduction' : ''}`}>
                <div>
                  <span className="label">{item.component_name}</span>
                  {item.notes && <span className="payslip-note">{item.notes}</span>}
                </div>
                <span className="amount">
                  {item.component_type === 'deduction' ? '– ' : ''}{fmt(item.amount)}
                </span>
              </div>
            ))}
            <div className="payslip-row total">
              <span className="label">Net salary</span>
              <span className="amount">{fmt(payslipEmployee.earnings - payslipEmployee.deductions)}</span>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}

/* ======================= SALARY STRUCTURES ======================= */

function StructuresTab({ profile, company }) {
  const [employees, setEmployees] = useState([])
  const [components, setComponents] = useState([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_COMPONENT_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const loadLookups = useCallback(async () => {
    const [{ data: emps }, { data: comps }] = await Promise.all([
      supabase.from('employees').select('id, employee_code, full_name').eq('employment_status', 'active').order('full_name'),
      supabase.from('payroll_components').select('id, name, component_type').eq('status', 'active').order('component_type').order('name'),
    ])
    setEmployees(emps ?? [])
    setComponents(comps ?? [])
  }, [])

  const loadRows = useCallback(async () => {
    if (!selectedEmployeeId) {
      setRows([])
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('employee_salary_components')
      .select('id, amount, effective_from, effective_to, payroll_components(name, component_type)')
      .eq('employee_id', selectedEmployeeId)
      .order('effective_from', { ascending: false })
    setRows(data ?? [])
    setLoading(false)
  }, [selectedEmployeeId])

  useEffect(() => {
    loadLookups()
  }, [loadLookups])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  function openAdd() {
    setForm({ ...EMPTY_COMPONENT_FORM })
    setError(null)
    setDrawerOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const { data: overlapping } = await supabase
      .from('employee_salary_components')
      .select('id, effective_from')
      .eq('employee_id', selectedEmployeeId)
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
      employee_id: selectedEmployeeId,
      payroll_component_id: form.payroll_component_id,
      amount: Number(form.amount),
      effective_from: form.effective_from,
      created_by: profile.id,
    })

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    setDrawerOpen(false)
    loadRows()
  }

  return (
    <>
      <div className="field-row" style={{ maxWidth: 320, marginBottom: 4, alignItems: 'flex-end', gap: 12 }}>
        <label className="field" style={{ flex: 1 }}>
          <span>Employee</span>
          <select value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)}>
            <option value="">— Select employee —</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.full_name}</option>
            ))}
          </select>
        </label>
        {selectedEmployeeId && (
          <button className="btn-primary btn-icon" onClick={openAdd} style={{ marginBottom: 2 }}>
            <Plus size={16} /> Add component
          </button>
        )}
      </div>

      {!selectedEmployeeId ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>Select an employee to view or edit their salary structure.</p>
        </div>
      ) : loading ? (
        <p className="muted" style={{ marginTop: 20 }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>No salary components yet.</p>
          <p className="muted">Add Basic Salary and any allowances to build this employee's structure.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Effective from</th>
              <th>Effective to</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} style={{ cursor: 'default' }}>
                <td>{row.payroll_components?.name}</td>
                <td style={{ textTransform: 'capitalize' }}>{row.payroll_components?.component_type}</td>
                <td className="mono">{fmt(row.amount)}</td>
                <td className="mono">{formatDate(row.effective_from)}</td>
                <td className="mono">{row.effective_to ? formatDate(row.effective_to) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Add salary component">
        <form onSubmit={handleSubmit} className="drawer-form">
          <label className="field">
            <span>Component</span>
            <select
              required
              value={form.payroll_component_id}
              onChange={(e) => setForm({ ...form, payroll_component_id: e.target.value })}
            >
              <option value="">— Select —</option>
              {components.map((c) => (
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
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </label>

          <label className="field">
            <span>Effective from</span>
            <input
              type="date"
              required
              value={form.effective_from}
              onChange={(e) => setForm({ ...form, effective_from: e.target.value })}
            />
          </label>

          <p className="muted" style={{ margin: 0 }}>
            If this component is already active, its previous amount will be closed out the day before this one starts.
          </p>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save component'}
          </button>
        </form>
      </Drawer>
    </>
  )
}
