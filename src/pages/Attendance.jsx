import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { Loader2, Camera, MapPin, AlertTriangle } from 'lucide-react'
import { ChevronLeftIcon } from '../components/ui/chevron-left'
import { ChevronRightIcon } from '../components/ui/chevron-right'
import { CheckIcon } from '../components/ui/check'
import { XIcon } from '../components/ui/x'
import { UploadIcon } from '../components/ui/upload'
import { HistoryIcon } from '../components/ui/history'
import { FilePenLineIcon } from '../components/ui/file-pen-line'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'
import { SkeletonTable } from '../components/Skeleton'
import { ImportAttendanceDrawer } from '../components/ImportAttendanceDrawer'

const EMPTY_FORM = {
  status: '',
  shift_id: '',
  check_in: '',
  check_out: '',
  notes: '',
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function timeFromTimestamp(ts) {
  if (!ts) return ''
  return new Date(ts).toTimeString().slice(0, 5)
}

function timestampFromTime(dateStr, timeStr) {
  if (!timeStr) return null
  return new Date(`${dateStr}T${timeStr}:00`).toISOString()
}

function sessionDuration(checkIn, checkOut) {
  const mins = Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000))
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function formatDateLong(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function shiftDate(dateStr, delta) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const LOADING_DELAY = 150

export default function Attendance() {
  const { profile, company } = useAuth()
  const [tab, setTab] = useState('roster')

  const [date, setDate] = useState(todayStr())
  const [employees, setEmployees] = useState([])
  const [shifts, setShifts] = useState([])
  const [attendanceByEmployee, setAttendanceByEmployee] = useState({})
  const [loading, setLoading] = useState(true)

  const [corrections, setCorrections] = useState([])
  const [correctionsLoading, setCorrectionsLoading] = useState(true)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeEmployee, setActiveEmployee] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)

  const loadRoster = useCallback(async () => {
    const loadingTimer = setTimeout(() => setLoading(true), LOADING_DELAY)
    const [{ data: emps }, { data: shiftRows }, { data: attendanceRows }] = await Promise.all([
      supabase
        .from('employees')
        .select('id, employee_code, full_name, shift_id, shifts(name)')
        .eq('company_id', company.id)
        .in('employment_status', ['training', 'probation', 'confirmed'])
        .order('full_name'),
      supabase.from('shifts').select('id, name').eq('company_id', company.id).eq('status', 'active').order('name'),
      supabase
        .from('attendance')
        .select('id, employee_id, status, shift_id, check_in, check_out, worked_minutes, late_minutes, overtime_minutes, notes, source, check_in_lat, check_in_lng, check_in_accuracy_m, check_in_photo_path, check_in_outside_geofence, check_out_lat, check_out_lng, check_out_accuracy_m, check_out_photo_path, check_out_outside_geofence')
        .eq('company_id', company.id)
        .eq('attendance_date', date),
    ])
    clearTimeout(loadingTimer)

    setEmployees(emps ?? [])
    setShifts(shiftRows ?? [])
    const map = {}
    for (const row of attendanceRows ?? []) map[row.employee_id] = row
    setAttendanceByEmployee(map)
    setLoading(false)
  }, [date, company.id])

  const loadCorrections = useCallback(async () => {
    const loadingTimer = setTimeout(() => setCorrectionsLoading(true), LOADING_DELAY)
    const { data } = await supabase
      .from('attendance_corrections')
      .select('id, attendance_date, requested_check_in, requested_check_out, reason, status, created_at, employees(full_name, employee_code)')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(100)
    clearTimeout(loadingTimer)
    setCorrections(data ?? [])
    setCorrectionsLoading(false)
  }, [company.id])

  useEffect(() => {
    loadRoster()
  }, [loadRoster])

  useEffect(() => {
    loadCorrections()
  }, [loadCorrections])

  const pendingCount = useMemo(
    () => corrections.filter((c) => c.status === 'pending').length,
    [corrections]
  )

  function openEdit(emp) {
    const existing = attendanceByEmployee[emp.id]
    setActiveEmployee(emp)
    setSessions([])
    setForm({
      status: existing?.status ?? '',
      shift_id: existing?.shift_id ?? emp.shift_id ?? '',
      check_in: timeFromTimestamp(existing?.check_in),
      check_out: timeFromTimestamp(existing?.check_out),
      notes: existing?.notes ?? '',
    })
    setError(null)
    setDrawerOpen(true)
    loadSessions(emp.id)
  }

  const loadSessions = useCallback(async (employeeId) => {
    setSessionsLoading(true)
    const { data } = await supabase
      .from('attendance_sessions')
      .select('id, check_in, check_out')
      .eq('employee_id', employeeId)
      .eq('attendance_date', date)
      .order('check_in')
    setSessions(data ?? [])
    setSessionsLoading(false)
  }, [date])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const payload = {
      company_id: company.id,
      employee_id: activeEmployee.id,
      attendance_date: date,
      shift_id: form.shift_id || null,
      check_in: timestampFromTime(date, form.check_in),
      check_out: timestampFromTime(date, form.check_out),
      status: form.status || null,
      notes: form.notes || null,
      source: 'manual',
      created_by: profile.id,
    }

    const { error: saveError } = await supabase
      .from('attendance')
      .upsert(payload, { onConflict: 'employee_id,attendance_date' })

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      toast.error(saveError.message || 'Something went wrong')
      return
    }

    toast.success('Attendance saved')
    setDrawerOpen(false)
    loadRoster()
  }

  async function viewPhoto(path) {
    const { data, error } = await supabase.storage.from('attendance-photos').createSignedUrl(path, 60)
    if (error || !data) {
      toast.error("Couldn't open that photo")
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  async function reviewCorrection(id, status) {
    const { error: reviewError } = await supabase
      .from('attendance_corrections')
      .update({ status, reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
      .eq('id', id)

    if (!reviewError) {
      toast.success(status === 'approved' ? 'Correction approved' : 'Correction rejected')
      loadCorrections()
      loadRoster()
    }
  }

  return (
    <div className="page-inner" style={{ maxWidth: 980 }}>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Attendance</h1>
        </div>
        <button className="btn-secondary btn-icon" onClick={() => setImportOpen(true)}>
          <UploadIcon size={16} /> Import
        </button>
      </div>

      <div className="tabs">
        <button className={`tab-button${tab === 'roster' ? ' active' : ''}`} onClick={() => setTab('roster')}>
          <HistoryIcon size={15} /> Daily roster
        </button>
        <button className={`tab-button${tab === 'corrections' ? ' active' : ''}`} onClick={() => setTab('corrections')}>
          <FilePenLineIcon size={15} /> Correction requests
          {pendingCount > 0 && <span className="tab-count">{pendingCount}</span>}
        </button>
      </div>

      {tab === 'roster' && (
        <>
          <div className="date-nav">
            <button className="date-nav-btn" onClick={() => setDate((d) => shiftDate(d, -1))} aria-label="Previous day">
              <ChevronLeftIcon size={16} />
            </button>
            <div className="date-nav-label">
              <span>{formatDateLong(date)}</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <button className="date-nav-btn" onClick={() => setDate((d) => shiftDate(d, 1))} aria-label="Next day">
              <ChevronRightIcon size={16} />
            </button>
            {date !== todayStr() && (
              <button className="link-button" onClick={() => setDate(todayStr())}>
                Jump to today
              </button>
            )}
          </div>

          {loading ? (
            <SkeletonTable rows={6} columns={6} />
          ) : employees.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 20 }}>
              <p>No active employees.</p>
              <p className="muted">Add employees under People to start tracking attendance.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Shift</th>
                  <th>Status</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Worked</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const rec = attendanceByEmployee[emp.id]
                  return (
                    <tr key={emp.id} onClick={() => openEdit(emp)}>
                      <td>
                        {emp.full_name}
                        <span className="mono" style={{ display: 'block', color: 'var(--ink-soft)', fontSize: 12 }}>
                          {emp.employee_code}
                        </span>
                      </td>
                      <td>{emp.shifts?.name ?? '—'}</td>
                      <td>
                        {rec?.status ? (
                          <span className={`status-badge status-${rec.status}`}>{rec.status.replace('_', ' ')}</span>
                        ) : (
                          <span className="status-badge">not marked</span>
                        )}
                        {rec?.source === 'auto' && (
                          <span className="muted mono" style={{ marginLeft: 6, fontSize: 11 }} data-tooltip="Marked automatically at end of day">auto</span>
                        )}
                      </td>
                      <td className="mono">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {rec?.check_in ? timeFromTimestamp(rec.check_in) : '—'}
                          {rec?.check_in_outside_geofence && <AlertTriangle size={11} style={{ color: 'var(--danger)', flexShrink: 0 }} data-tooltip="Outside geofence" />}
                          {rec?.check_in_lat != null && !rec?.check_in_outside_geofence && <MapPin size={11} className="muted" style={{ flexShrink: 0 }} data-tooltip="Location captured" />}
                          {rec?.check_in_photo_path && <Camera size={11} className="muted" style={{ flexShrink: 0 }} data-tooltip="Photo captured" />}
                        </span>
                      </td>
                      <td className="mono">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {rec?.check_out ? timeFromTimestamp(rec.check_out) : '—'}
                          {rec?.check_out_outside_geofence && <AlertTriangle size={11} style={{ color: 'var(--danger)', flexShrink: 0 }} data-tooltip="Outside geofence" />}
                          {rec?.check_out_lat != null && !rec?.check_out_outside_geofence && <MapPin size={11} className="muted" style={{ flexShrink: 0 }} data-tooltip="Location captured" />}
                          {rec?.check_out_photo_path && <Camera size={11} className="muted" style={{ flexShrink: 0 }} data-tooltip="Photo captured" />}
                        </span>
                      </td>
                      <td className="mono">
                        {rec?.worked_minutes ? `${(rec.worked_minutes / 60).toFixed(1)}h` : '—'}
                        {rec?.late_minutes > 0 && <span style={{ color: '#b0473f' }}> · {rec.late_minutes}m late</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </>
      )}

      {tab === 'corrections' && (
        <>
          {correctionsLoading ? (
            <SkeletonTable rows={5} columns={7} />
          ) : corrections.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 20 }}>
              <p>No correction requests.</p>
              <p className="muted">Requests raised by employees for a missed or wrong check-in/out will show up here.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Requested check-in</th>
                  <th>Requested check-out</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {corrections.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {c.employees?.full_name}
                      <span className="mono" style={{ display: 'block', color: 'var(--ink-soft)', fontSize: 12 }}>
                        {c.employees?.employee_code}
                      </span>
                    </td>
                    <td className="mono">{formatDateLong(c.attendance_date)}</td>
                    <td className="mono">{c.requested_check_in ? timeFromTimestamp(c.requested_check_in) : '—'}</td>
                    <td className="mono">{c.requested_check_out ? timeFromTimestamp(c.requested_check_out) : '—'}</td>
                    <td>{c.reason}</td>
                    <td>
                      <span className={`status-badge status-${c.status}`}>{c.status}</span>
                    </td>
                    <td>
                      {c.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn-icon-round approve" onClick={() => reviewCorrection(c.id, 'approved')} aria-label="Approve">
                            <CheckIcon size={14} />
                          </button>
                          <button className="btn-icon-round reject" onClick={() => reviewCorrection(c.id, 'rejected')} aria-label="Reject">
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

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={activeEmployee ? `${activeEmployee.full_name} · ${formatDateLong(date)}` : ''}
      >
        <form onSubmit={handleSubmit} className="drawer-form">
          <div className="field-row">
            <label className="field">
              <span>Check-in</span>
              <input type="time" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} />
            </label>
            <label className="field">
              <span>Check-out</span>
              <input type="time" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Shift</span>
              <select value={form.shift_id} onChange={(e) => setForm({ ...form, shift_id: e.target.value })}>
                <option value="">— No shift —</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Status</span>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="">Auto (from check-in/out)</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="half_day">Half day</option>
                <option value="on_leave">On leave</option>
                <option value="holiday">Holiday</option>
                <option value="weekend">Weekend</option>
              </select>
            </label>
          </div>

          <label className="field">
            <span>Notes</span>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
          </label>

          <p className="muted" style={{ margin: 0 }}>
            Leaving status on "Auto" lets worked hours, lateness, and overtime calculate from the shift automatically.
          </p>

          {sessions.length > 1 && (
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p className="section-heading" style={{ margin: 0 }}>
                Sessions ({sessions.length}) — {sessionsLoading ? '…' : `multiple clock-ins/outs this day`}
              </p>
              {sessions.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span className="muted">Session {i + 1}</span>
                  <span className="mono">
                    {timeFromTimestamp(s.check_in)} – {s.check_out ? timeFromTimestamp(s.check_out) : 'in progress'}
                    {s.check_out && <span className="muted"> ({sessionDuration(s.check_in, s.check_out)})</span>}
                  </span>
                </div>
              ))}
            </div>
          )}

          {(() => {
            const existing = activeEmployee ? attendanceByEmployee[activeEmployee.id] : null
            const hasCheckIn = existing && (existing.check_in_lat != null || existing.check_in_photo_path)
            const hasCheckOut = existing && (existing.check_out_lat != null || existing.check_out_photo_path)
            if (!hasCheckIn && !hasCheckOut) return null
            return (
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p className="section-heading" style={{ margin: 0 }}>Verification</p>
                {hasCheckIn && (
                  <VerificationRow
                    label="Check-in"
                    lat={existing.check_in_lat}
                    lng={existing.check_in_lng}
                    accuracyM={existing.check_in_accuracy_m}
                    photoPath={existing.check_in_photo_path}
                    outside={existing.check_in_outside_geofence}
                    onViewPhoto={() => viewPhoto(existing.check_in_photo_path)}
                  />
                )}
                {hasCheckOut && (
                  <VerificationRow
                    label="Check-out"
                    lat={existing.check_out_lat}
                    lng={existing.check_out_lng}
                    accuracyM={existing.check_out_accuracy_m}
                    photoPath={existing.check_out_photo_path}
                    outside={existing.check_out_outside_geofence}
                    onViewPhoto={() => viewPhoto(existing.check_out_photo_path)}
                  />
                )}
              </div>
            )
          })()}

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={14} className="btn-spinner" />}
            {saving ? 'Saving…' : 'Save attendance'}
          </button>
        </form>
      </Drawer>

      <ImportAttendanceDrawer
        open={importOpen}
        onClose={() => setImportOpen(false)}
        company={company}
        employees={employees}
        onImported={loadRoster}
      />
    </div>
  )
}

function VerificationRow({ label, lat, lng, accuracyM, photoPath, outside, onViewPhoto }) {
  const hasLocation = lat != null && lng != null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, flexWrap: 'wrap' }}>
      <span className="muted" style={{ minWidth: 62, flexShrink: 0 }}>{label}</span>
      {hasLocation ? (
        <a
          href={`https://www.google.com/maps?q=${lat},${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="link-button"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          <MapPin size={12} /> View location{accuracyM != null ? ` (±${Math.round(accuracyM)}m)` : ''}
        </a>
      ) : (
        <span className="muted">No location</span>
      )}
      {photoPath && (
        <button type="button" className="link-button" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={onViewPhoto}>
          <Camera size={12} /> View photo
        </button>
      )}
      {outside && (
        <span className="status-badge status-rejected" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <AlertTriangle size={11} /> Outside geofence
        </span>
      )}
    </div>
  )
}
