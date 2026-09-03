import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { LogInIcon } from './ui/login'
import { LogoutIcon } from './ui/logout'
import { ClockIcon } from './ui/clock'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function todayInTimezone(timezone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'Asia/Karachi' }).format(new Date())
}

function formatTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function elapsed(fromTs) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(fromTs).getTime()) / 60000))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}

// Best-effort, silent, never blocks clock-in/out -- denied permission, no
// GPS (desktop), or a slow fix all just resolve to null and the action
// proceeds without coordinates, same as it always has.
function getLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 60000 }
    )
  })
}

export function AttendanceClock() {
  const { employeeRecord, company } = useAuth()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [now, setNow] = useState(Date.now())

  // Only used when company.require_clockin_photo is on -- clockIn/clockOut
  // open the (hidden) file input instead of calling the RPC directly, and
  // this remembers which action to resume once a photo comes back.
  const fileInputRef = useRef(null)
  const pendingActionRef = useRef(null)

  const load = useCallback(async () => {
    if (!employeeRecord) return
    const today = todayInTimezone(company?.timezone)
    const { data } = await supabase
      .from('attendance')
      .select('id, check_in, check_out, status')
      .eq('employee_id', employeeRecord.id)
      .eq('attendance_date', today)
      .maybeSingle()
    setRecord(data ?? null)
    setLoading(false)
  }, [employeeRecord, company])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!record?.check_in || record?.check_out) return
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [record])

  async function uploadPhoto(file, action) {
    const today = todayInTimezone(company?.timezone)
    const path = `${company.id}/${employeeRecord.id}/${today}-${action}-${Date.now()}.jpg`
    const { error } = await supabase.storage.from('attendance-photos').upload(path, file)
    if (error) {
      toast.error(`Photo upload failed, clocking in without it: ${error.message}`)
      return null
    }
    return path
  }

  async function doClockIn(photoFile) {
    setWorking(true)
    const [loc, photoPath] = await Promise.all([
      getLocation(),
      photoFile ? uploadPhoto(photoFile, 'checkin') : Promise.resolve(null),
    ])
    const { error } = await supabase.rpc('employee_clock_in', {
      p_lat: loc?.lat ?? null, p_lng: loc?.lng ?? null, p_accuracy_m: loc?.accuracy ?? null, p_photo_path: photoPath,
    })
    setWorking(false)
    if (error) {
      toast.error(error.message || 'Failed to clock in')
      return
    }
    toast.success("Clocked in — have a good one")
    load()
  }

  async function doClockOut(photoFile) {
    setWorking(true)
    const [loc, photoPath] = await Promise.all([
      getLocation(),
      photoFile ? uploadPhoto(photoFile, 'checkout') : Promise.resolve(null),
    ])
    const { error } = await supabase.rpc('employee_clock_out', {
      p_lat: loc?.lat ?? null, p_lng: loc?.lng ?? null, p_accuracy_m: loc?.accuracy ?? null, p_photo_path: photoPath,
    })
    setWorking(false)
    if (error) {
      toast.error(error.message || 'Failed to clock out')
      return
    }
    toast.success('Clocked out')
    load()
  }

  function clockIn() {
    if (company?.require_clockin_photo) {
      pendingActionRef.current = 'in'
      fileInputRef.current?.click()
    } else {
      doClockIn(null)
    }
  }

  function clockOut() {
    if (company?.require_clockin_photo) {
      pendingActionRef.current = 'out'
      fileInputRef.current?.click()
    } else {
      doClockOut(null)
    }
  }

  function handlePhotoSelected(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // reset so picking the same file again still fires onChange next time
    const action = pendingActionRef.current
    pendingActionRef.current = null
    if (!file || !action) return // cancelled the picker -- no photo, no action taken
    if (action === 'in') doClockIn(file)
    else doClockOut(file)
  }

  if (loading) return null

  const hasCheckedIn = !!record?.check_in
  const hasCheckedOut = !!record?.check_out

  return (
    <div className="report-section attendance-clock" style={{ marginBottom: 0 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        style={{ display: 'none' }}
        onChange={handlePhotoSelected}
      />
      <div className="attendance-clock-row">
        <div className="attendance-clock-status">
          <span className={`attendance-clock-icon${hasCheckedIn && !hasCheckedOut ? ' live' : ''}`}>
            <ClockIcon size={16} spinning={hasCheckedIn && !hasCheckedOut} />
          </span>
          <div>
            {!hasCheckedIn ? (
              <>
                <p className="attendance-clock-label">Not clocked in yet</p>
                <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>Your shift for today hasn't started.</p>
              </>
            ) : hasCheckedOut ? (
              <>
                <p className="attendance-clock-label">Clocked out</p>
                <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
                  {formatTime(record.check_in)} – {formatTime(record.check_out)}
                  {record.status && <span className={`status-badge status-${record.status}`} style={{ marginLeft: 8 }}>{record.status.replace('_', ' ')}</span>}
                </p>
              </>
            ) : (
              <>
                <p className="attendance-clock-label">Clocked in at {formatTime(record.check_in)}</p>
                <p className="muted mono" style={{ margin: 0, fontSize: 12.5 }}>{elapsed(record.check_in)} so far</p>
              </>
            )}
          </div>
        </div>

        {!hasCheckedIn ? (
          <button type="button" className="btn-primary btn-icon" disabled={working} onClick={clockIn}>
            <LogInIcon size={15} /> Clock in
          </button>
        ) : !hasCheckedOut ? (
          <button type="button" className="btn-secondary btn-icon" disabled={working} onClick={clockOut}>
            <LogoutIcon size={15} /> Clock out
          </button>
        ) : null}
      </div>
    </div>
  )
}
