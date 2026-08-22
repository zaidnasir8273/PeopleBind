import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { PlusIcon } from '../components/ui/plus'
import { CheckIcon } from '../components/ui/check'
import { XIcon } from '../components/ui/x'
import { MailCheckIcon } from '../components/ui/mail-check'
import { BatteryMediumIcon } from '../components/ui/battery-medium'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'
import { SkeletonTable } from '../components/Skeleton'

const EMPTY_REQUEST = {
  employee_id: '',
  leave_type_id: '',
  start_date: new Date().toISOString().slice(0, 10),
  end_date: new Date().toISOString().slice(0, 10),
  reason: '',
}

const EMPTY_BALANCE = {
  employee_id: '',
  leave_type_id: '',
  entitled_days: '',
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_FILTERS = ['all', 'pending', 'approved', 'rejected', 'cancelled']

export default function Leave() {
  const { profile, company } = useAuth()
  const [tab, setTab] = useState('requests')

  const [employees, setEmployees] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])

  const [requests, setRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  const [requestDrawerOpen, setRequestDrawerOpen] = useState(false)
  const [requestForm, setRequestForm] = useState(EMPTY_REQUEST)
  const [requestSaving, setRequestSaving] = useState(false)
  const [requestError, setRequestError] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

  const [balances, setBalances] = useState([])
  const [balancesLoading, setBalancesLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())

  const [balanceDrawerOpen, setBalanceDrawerOpen] = useState(false)
  const [balanceForm, setBalanceForm] = useState(EMPTY_BALANCE)
  const [balanceSaving, setBalanceSaving] = useState(false)
  const [balanceError, setBalanceError] = useState(null)

  const loadLookups = useCallback(async () => {
    const [{ data: emps }, { data: types }] = await Promise.all([
      supabase.from('employees').select('id, employee_code, full_name, gender').in('employment_status', ['training', 'probation', 'confirmed']).order('full_name'),
      supabase.from('leave_types').select('id, name, is_paid, applicable_gender').order('name'),
    ])
    setEmployees(emps ?? [])
    setLeaveTypes(types ?? [])
  }, [])

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true)
    let query = supabase
      .from('leave_requests')
      .select('id, start_date, end_date, days_requested, reason, status, created_at, employees(full_name, employee_code), leave_types(name)')
      .order('created_at', { ascending: false })
    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    const { data } = await query.limit(200)
    setRequests(data ?? [])
    setRequestsLoading(false)
  }, [statusFilter])

  const loadBalances = useCallback(async () => {
    setBalancesLoading(true)
    const { data } = await supabase
      .from('v_leave_usage')
      .select('employee_id, leave_type, year, entitled_days, used_days, remaining_days')
      .eq('year', year)
    setBalances(data ?? [])
    setBalancesLoading(false)
  }, [year])

  useEffect(() => {
    loadLookups()
  }, [loadLookups])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  useEffect(() => {
    loadBalances()
  }, [loadBalances])

  const employeeById = useMemo(() => {
    const map = {}
    for (const e of employees) map[e.id] = e
    return map
  }, [employees])

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === 'pending').length,
    [requests]
  )

  function openNewRequest() {
    setRequestForm(EMPTY_REQUEST)
    setRequestError(null)
    setRequestDrawerOpen(true)
  }

  async function handleRequestSubmit(e) {
    e.preventDefault()
    setRequestError(null)
    setRequestSaving(true)

    const { error: saveError } = await supabase.from('leave_requests').insert({
      company_id: company.id,
      employee_id: requestForm.employee_id,
      leave_type_id: requestForm.leave_type_id,
      start_date: requestForm.start_date,
      end_date: requestForm.end_date,
      reason: requestForm.reason || null,
      requested_by: profile.id,
    })

    setRequestSaving(false)

    if (saveError) {
      setRequestError(saveError.message)
      toast.error(saveError.message || 'Something went wrong')
      return
    }

    toast.success('Leave request submitted')
    setRequestDrawerOpen(false)
    loadRequests()
  }

  async function reviewRequest(id, status) {
    const { error: reviewError } = await supabase
      .from('leave_requests')
      .update({ status, reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
      .eq('id', id)

    if (!reviewError) {
      toast.success(status === 'approved' ? 'Leave approved' : 'Leave rejected')
      loadRequests()
      loadBalances()
    }
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAllPending() {
    const pendingIds = requests.filter((r) => r.status === 'pending').map((r) => r.id)
    setSelectedIds((prev) => (prev.size === pendingIds.length ? new Set() : new Set(pendingIds)))
  }

  async function bulkReview(status) {
    setBulkBusy(true)
    const ids = [...selectedIds]
    const { error: bulkError } = await supabase
      .from('leave_requests')
      .update({ status, reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
      .in('id', ids)
    setBulkBusy(false)
    if (!bulkError) {
      toast.success(`${ids.length} request${ids.length > 1 ? 's' : ''} ${status}`)
      setSelectedIds(new Set())
      loadRequests()
      loadBalances()
    }
  }

  function openSetBalance() {
    setBalanceForm({ ...EMPTY_BALANCE })
    setBalanceError(null)
    setBalanceDrawerOpen(true)
  }

  async function handleBalanceSubmit(e) {
    e.preventDefault()
    setBalanceError(null)
    setBalanceSaving(true)

    const { error: saveError } = await supabase
      .from('leave_balances')
      .upsert(
        {
          company_id: company.id,
          employee_id: balanceForm.employee_id,
          leave_type_id: balanceForm.leave_type_id,
          year,
          entitled_days: Number(balanceForm.entitled_days),
        },
        { onConflict: 'employee_id,leave_type_id,year' }
      )

    setBalanceSaving(false)

    if (saveError) {
      setBalanceError(saveError.message)
      toast.error(saveError.message || 'Something went wrong')
      return
    }

    toast.success('Leave balance saved')
    setBalanceDrawerOpen(false)
    loadBalances()
  }

  return (
    <div className="page-inner" style={{ maxWidth: 980 }}>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Leave</h1>
        </div>
        {tab === 'requests' ? (
          <button className="btn-primary btn-icon" onClick={openNewRequest}>
            <PlusIcon size={16} /> New request
          </button>
        ) : (
          <button className="btn-primary btn-icon" onClick={openSetBalance}>
            <PlusIcon size={16} /> Set balance
          </button>
        )}
      </div>

      <div className="tabs">
        <button className={`tab-button${tab === 'requests' ? ' active' : ''}`} onClick={() => setTab('requests')}>
          <MailCheckIcon size={15} /> Requests
          {pendingCount > 0 && <span className="tab-count">{pendingCount}</span>}
        </button>
        <button className={`tab-button${tab === 'balances' ? ' active' : ''}`} onClick={() => setTab('balances')}>
          <BatteryMediumIcon size={15} /> Balances
        </button>
      </div>

      {tab === 'requests' && (
        <>
          <div className="field-row" style={{ maxWidth: 220, marginBottom: 4 }}>
            <label className="field">
              <span>Status</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                {STATUS_FILTERS.map((s) => (
                  <option key={s} value={s}>{s === 'all' ? 'All' : s[0].toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </label>
          </div>

          {selectedIds.size > 0 && (
            <div className="bulk-action-bar">
              <span>{selectedIds.size} selected</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-secondary" disabled={bulkBusy} onClick={() => bulkReview('approved')}>Approve selected</button>
                <button className="btn-secondary" disabled={bulkBusy} onClick={() => bulkReview('rejected')}>Reject selected</button>
                <button className="link-button" onClick={() => setSelectedIds(new Set())}>Clear</button>
              </div>
            </div>
          )}

          {requestsLoading ? (
            <SkeletonTable rows={6} columns={8} />
          ) : requests.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 20 }}>
              <p>No leave requests.</p>
              <p className="muted">New requests will show up here for review.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size > 0 && selectedIds.size === requests.filter((r) => r.status === 'pending').length}
                      onChange={toggleSelectAllPending}
                    />
                  </th>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td onClick={(e) => e.stopPropagation()}>
                      {r.status === 'pending' && (
                        <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelect(r.id)} />
                      )}
                    </td>
                    <td>
                      {r.employees?.full_name}
                      <span className="mono" style={{ display: 'block', color: 'var(--ink-soft)', fontSize: 12 }}>
                        {r.employees?.employee_code}
                      </span>
                    </td>
                    <td>{r.leave_types?.name}</td>
                    <td className="mono">
                      {formatDate(r.start_date)}
                      {r.end_date !== r.start_date ? ` – ${formatDate(r.end_date)}` : ''}
                    </td>
                    <td className="mono">{r.days_requested ?? '—'}</td>
                    <td>{r.reason || '—'}</td>
                    <td>
                      <span className={`status-badge status-${r.status}`}>{r.status}</span>
                    </td>
                    <td>
                      {r.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn-icon-round approve" onClick={() => reviewRequest(r.id, 'approved')} aria-label="Approve">
                            <CheckIcon size={14} />
                          </button>
                          <button className="btn-icon-round reject" onClick={() => reviewRequest(r.id, 'rejected')} aria-label="Reject">
                            <XIcon size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {tab === 'balances' && (
        <>
          <div className="field-row" style={{ maxWidth: 160, marginBottom: 4 }}>
            <label className="field">
              <span>Year</span>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {[year - 1, year, year + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
          </div>

          {balancesLoading ? (
            <SkeletonTable rows={5} columns={5} />
          ) : balances.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 20 }}>
              <p>No balances set for {year}.</p>
              <p className="muted">Set an entitlement per employee and leave type to start tracking usage.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Entitled</th>
                  <th>Used</th>
                  <th>Remaining</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((b, i) => (
                  <tr key={`${b.employee_id}-${b.leave_type}-${i}`}>
                    <td>
                      {employeeById[b.employee_id]?.full_name ?? '—'}
                      <span className="mono" style={{ display: 'block', color: 'var(--ink-soft)', fontSize: 12 }}>
                        {employeeById[b.employee_id]?.employee_code}
                      </span>
                    </td>
                    <td>{b.leave_type}</td>
                    <td className="mono">{b.entitled_days}</td>
                    <td className="mono">{b.used_days}</td>
                    <td className="mono">{b.remaining_days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      <Drawer open={requestDrawerOpen} onClose={() => setRequestDrawerOpen(false)} title="New leave request">
        <form onSubmit={handleRequestSubmit} className="drawer-form">
          <label className="field">
            <span>Employee</span>
            <select
              required
              value={requestForm.employee_id}
              onChange={(e) => setRequestForm({ ...requestForm, employee_id: e.target.value })}
            >
              <option value="">— Select —</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Leave type</span>
            <select
              required
              value={requestForm.leave_type_id}
              onChange={(e) => setRequestForm({ ...requestForm, leave_type_id: e.target.value })}
            >
              <option value="">— Select —</option>
              {leaveTypes
                .filter((t) => !t.applicable_gender || t.applicable_gender === employeeById[requestForm.employee_id]?.gender)
                .map((t) => (
                  <option key={t.id} value={t.id}>{t.name}{!t.is_paid ? ' (unpaid)' : ''}</option>
                ))}
            </select>
          </label>

          <div className="field-row">
            <label className="field">
              <span>Start date</span>
              <input
                type="date"
                required
                value={requestForm.start_date}
                onChange={(e) => setRequestForm({ ...requestForm, start_date: e.target.value })}
              />
            </label>
            <label className="field">
              <span>End date</span>
              <input
                type="date"
                required
                min={requestForm.start_date}
                value={requestForm.end_date}
                onChange={(e) => setRequestForm({ ...requestForm, end_date: e.target.value })}
              />
            </label>
          </div>

          <label className="field">
            <span>Reason</span>
            <input
              value={requestForm.reason}
              onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
              placeholder="Optional"
            />
          </label>

          <p className="muted" style={{ margin: 0 }}>
            Days are counted automatically from the employee's working days and company holidays.
          </p>

          {requestError && <p className="field-error">{requestError}</p>}

          <button type="submit" className="btn-primary" disabled={requestSaving}>
            {requestSaving ? 'Saving…' : 'Submit request'}
          </button>
        </form>
      </Drawer>

      <Drawer open={balanceDrawerOpen} onClose={() => setBalanceDrawerOpen(false)} title={`Set balance · ${year}`}>
        <form onSubmit={handleBalanceSubmit} className="drawer-form">
          <label className="field">
            <span>Employee</span>
            <select
              required
              value={balanceForm.employee_id}
              onChange={(e) => setBalanceForm({ ...balanceForm, employee_id: e.target.value })}
            >
              <option value="">— Select —</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Leave type</span>
            <select
              required
              value={balanceForm.leave_type_id}
              onChange={(e) => setBalanceForm({ ...balanceForm, leave_type_id: e.target.value })}
            >
              <option value="">— Select —</option>
              {leaveTypes
                .filter((t) => !t.applicable_gender || t.applicable_gender === employeeById[balanceForm.employee_id]?.gender)
                .map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
            </select>
          </label>

          <label className="field">
            <span>Entitled days for {year}</span>
            <input
              type="number"
              min="0"
              step="0.5"
              required
              value={balanceForm.entitled_days}
              onChange={(e) => setBalanceForm({ ...balanceForm, entitled_days: e.target.value })}
            />
          </label>

          <p className="muted" style={{ margin: 0 }}>
            This sets the entitlement only — days used are tracked automatically as requests get approved.
          </p>

          {balanceError && <p className="field-error">{balanceError}</p>}

          <button type="submit" className="btn-primary" disabled={balanceSaving}>
            {balanceSaving ? 'Saving…' : 'Save entitlement'}
          </button>
        </form>
      </Drawer>
    </div>
  )
}
