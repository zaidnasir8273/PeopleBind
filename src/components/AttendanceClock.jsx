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

function formatDuration(mins) {
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return `${h}h ${m}m`
}

function minutesBetween(a, b) {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000))
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
  // Multiple clock-in/out cycles a day (e.g. a lunch break) are real now --
  // this widget tracks today's individual sessions, not just a single
  // check_in/check_out pair, so it knows whether "Clock in" should be
  // offered again after a clock-out.
  const [sessions, setSessions] = useState([])
  const [status, setStatus] = useState(null)
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
    const [{ data: summary }, { data: sessionRows }] = await Promise.all([
      supabase.from('attendance').select('status').eq('employee_id', employeeRecord.id).eq('attendance_date', today).maybeSingle(),
      supabase.from('attendance_sessions').select('id, check_in, check_out').eq('employee_id', employeeRecord.id).eq('attendance_date', today).order('check_in'),
    ])
    setStatus(summary?.status ?? null)
    setSessions(sessionRows ?? [])
    setLoading(false)
  }, [employeeRecord, company])

  useEffect(() => {
    load()
  }, [load])

  const openSession = sessions.find((s) => !s.check_out)

  useEffect(() => {
    if (!openSession) return
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [openSession])

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

  const closedSessions = sessions.filter((s) => s.check_out)
  const closedMinutesToday = closedSessions.reduce((sum, s) => sum + minutesBetween(s.check_in, s.check_out), 0)
  const liveMinutesThisSession = openSession ? minutesBetween(openSession.check_in, now) : 0
  const isFirstSessionOfDay = closedSessions.length === 0

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
          <span className={`attendance-clock-icon${openSession ? ' live' : ''}`}>
            <ClockIcon size={16} spinning={!!openSession} />
          </span>
          <div>
            {!openSession && sessions.length === 0 ? (
              <>
                <p className="attendance-clock-label">Not clocked in yet</p>
                <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>Your shift for today hasn't started.</p>
              </>
            ) : !openSession ? (
              <>
                <p className="attendance-clock-label">On a break</p>
                <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
                  Clocked out at {formatTime(closedSessions[closedSessions.length - 1]?.check_out)} · {formatDuration(closedMinutesToday)} worked today
                  {status && <span className={`status-badge status-${status}`} style={{ marginLeft: 8 }}>{status.replace('_', ' ')}</span>}
                </p>
              </>
            ) : (
              <>
                <p className="attendance-clock-label">Clocked in at {formatTime(openSession.check_in)}</p>
                <p className="muted mono" style={{ margin: 0, fontSize: 12.5 }}>
                  {formatDuration(liveMinutesThisSession)} {isFirstSessionOfDay ? 'so far' : 'this session'}
                  {!isFirstSessionOfDay && ` · ${formatDuration(closedMinutesToday + liveMinutesThisSession)} today`}
                </p>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          className={openSession ? 'btn-secondary btn-icon' : 'btn-primary btn-icon'}
          disabled={working}
          onClick={openSession ? clockOut : clockIn}
        >
          {openSession ? (
            <>
              <LogoutIcon size={15} /> Clock out
            </>
          ) : (
            <>
              <LogInIcon size={15} /> Clock in
            </>
          )}
        </button>
      </div>
    </div>
  )
}
