import { useState, useMemo } from 'react'
import Papa from 'papaparse'
import { XCircle } from 'lucide-react'
import { UploadIcon } from './ui/upload'
import { ArrowRightIcon } from './ui/arrow-right'
import { CircleCheckIcon } from './ui/circle-check'
import { supabase } from '../lib/supabase'
import { Drawer } from './Drawer'

const TARGET_FIELDS = [
  { key: '', label: "Don't import" },
  { key: 'employee_code', label: 'Employee code', required: true },
  { key: 'attendance_date', label: 'Date (YYYY-MM-DD)', required: true },
  { key: 'check_in', label: 'Check-in time' },
  { key: 'check_out', label: 'Check-out time' },
]

const SYNONYMS = {
  employee_code: [
    'employeecode', 'employee code', 'empcode', 'emp code', 'employeeid', 'employee id',
    'empid', 'emp id', 'code', 'id no', 'idno', 'badge', 'badgeno', 'badge no', 'device id', 'deviceid',
  ],
  attendance_date: ['date', 'attendancedate', 'attendance date', 'day'],
  check_in: ['checkin', 'check in', 'check-in', 'timein', 'time in', 'in', 'clockin', 'clock in', 'punchin', 'punch in'],
  check_out: ['checkout', 'check out', 'check-out', 'timeout', 'time out', 'out', 'clockout', 'clock out', 'punchout', 'punch out'],
}

function normalize(s) {
  return s.toLowerCase().trim()
}

function autoMap(headers) {
  const mapping = {}
  for (const header of headers) {
    const norm = normalize(header)
    let matched = ''
    for (const [field, synonyms] of Object.entries(SYNONYMS)) {
      if (synonyms.includes(norm)) {
        matched = field
        break
      }
    }
    mapping[header] = matched
  }
  return mapping
}

function isValidDate(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(new Date(str).getTime())
}

function isValidTime(str) {
  return /^\d{1,2}:\d{2}(:\d{2})?$/.test(str)
}

function timestampFromTime(dateStr, timeStr) {
  if (!timeStr) return null
  return new Date(`${dateStr}T${timeStr}`).toISOString()
}

export function ImportAttendanceDrawer({ open, onClose, company, employees, onImported }) {
  const [step, setStep] = useState('upload')
  const [rawRows, setRawRows] = useState([])
  const [headers, setHeaders] = useState([])
  const [mapping, setMapping] = useState({})
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [results, setResults] = useState(null)
  const [parseError, setParseError] = useState(null)

  const employeeByCode = useMemo(() => {
    const map = new Map()
    for (const e of employees) if (e.employee_code) map.set(normalize(e.employee_code), e)
    return map
  }, [employees])

  function reset() {
    setStep('upload')
    setRawRows([])
    setHeaders([])
    setMapping({})
    setResults(null)
    setParseError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setParseError(null)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (!result.data.length) {
          setParseError('That file has no rows we could read.')
          return
        }
        setHeaders(result.meta.fields ?? [])
        setRawRows(result.data)
        setMapping(autoMap(result.meta.fields ?? []))
        setStep('map')
      },
      error: (err) => setParseError(err.message),
    })
  }

  const mappedRows = useMemo(() => {
    return rawRows.map((row, i) => {
      const record = {}
      for (const [header, field] of Object.entries(mapping)) {
        if (field) record[field] = (row[header] ?? '').trim()
      }
      const errors = []
      let employee = null
      if (!record.employee_code) errors.push('Missing employee code')
      else {
        employee = employeeByCode.get(normalize(record.employee_code))
        if (!employee) errors.push('Unknown employee code')
      }
      if (!record.attendance_date) errors.push('Missing date')
      else if (!isValidDate(record.attendance_date)) errors.push('Date must be YYYY-MM-DD')
      if (record.check_in && !isValidTime(record.check_in)) errors.push('Check-in must be HH:MM')
      if (record.check_out && !isValidTime(record.check_out)) errors.push('Check-out must be HH:MM')
      if (!record.check_in && !record.check_out) errors.push('No check-in or check-out time')
      return { rowNumber: i + 2, record, employee, errors }
    })
  }, [rawRows, mapping, employeeByCode])

  const validRows = mappedRows.filter((r) => r.errors.length === 0)
  const invalidRows = mappedRows.filter((r) => r.errors.length > 0)

  async function handleImport() {
    setImporting(true)
    setProgress({ done: 0, total: validRows.length })

    const succeeded = []
    const failed = []

    for (const row of validRows) {
      const payload = {
        company_id: company.id,
        employee_id: row.employee.id,
        attendance_date: row.record.attendance_date,
        shift_id: row.employee.shift_id || null,
        check_in: timestampFromTime(row.record.attendance_date, row.record.check_in),
        check_out: timestampFromTime(row.record.attendance_date, row.record.check_out),
        status: null,
        source: 'import',
      }

      const { error } = await supabase.from('attendance').upsert(payload, { onConflict: 'employee_id,attendance_date' })
      if (error) failed.push({ ...row, reason: error.message })
      else succeeded.push(row)

      setProgress((p) => ({ ...p, done: p.done + 1 }))
    }

    setImporting(false)
    setResults({ succeeded, failed })
    setStep('summary')
    onImported()
  }

  return (
    <Drawer open={open} onClose={handleClose} title="Import attendance" wide>
      {step === 'upload' && (
        <div className="drawer-form">
          <p className="muted" style={{ margin: 0 }}>
            Upload a daily attendance export from your biometric device (one row per employee per day, with
            check-in/check-out columns). You'll map columns and preview everything before anything gets saved.
            Existing attendance for the same employee and date is overwritten.
          </p>
          <label className="import-dropzone">
            <UploadIcon size={20} />
            <span>Choose a CSV file</span>
            <input type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: 'none' }} />
          </label>
          {parseError && <p className="field-error">{parseError}</p>}
        </div>
      )}

      {step === 'map' && (
        <div className="drawer-form">
          <p className="section-heading" style={{ margin: 0 }}>Map your columns</p>
          <p className="muted" style={{ marginTop: 0 }}>We matched what we could automatically — check the rest.</p>

          <table className="data-table">
            <thead><tr><th>Your column</th><th></th><th>Maps to</th></tr></thead>
            <tbody>
              {headers.map((h) => (
                <tr key={h} style={{ cursor: 'default' }}>
                  <td>{h}</td>
                  <td><ArrowRightIcon size={14} className="muted" /></td>
                  <td>
                    <select value={mapping[h] || ''} onChange={(e) => setMapping({ ...mapping, [h]: e.target.value })}>
                      {TARGET_FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>{f.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="report-section" style={{ marginBottom: 0 }}>
            <p className="section-heading">Preview</p>
            <p style={{ margin: '0 0 12px' }}>
              <span style={{ color: 'var(--teal-deep)' }}>{validRows.length} ready to import</span>
              {invalidRows.length > 0 && <span style={{ color: '#b0473f' }}> · {invalidRows.length} need fixing</span>}
            </p>
            <div style={{ maxHeight: 240, overflowY: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>Row</th><th>Employee</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                  {mappedRows.slice(0, 50).map((r) => (
                    <tr key={r.rowNumber} style={{ cursor: 'default' }}>
                      <td className="mono">{r.rowNumber}</td>
                      <td>{r.employee?.full_name || r.record.employee_code || '—'}</td>
                      <td className="mono">{r.record.attendance_date || '—'}</td>
                      <td>
                        {r.errors.length === 0 ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--teal-deep)', fontSize: 12 }}>
                            <CircleCheckIcon size={13} /> OK
                          </span>
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#b0473f', fontSize: 12 }}>
                            <XCircle size={13} /> {r.errors.join(', ')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {mappedRows.length > 50 && <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Showing first 50 of {mappedRows.length} rows.</p>}
            </div>
          </div>

          <button
            type="button"
            className="btn-primary"
            disabled={validRows.length === 0 || importing}
            onClick={handleImport}
            style={{ alignSelf: 'flex-start' }}
          >
            {importing ? `Importing ${progress.done} of ${progress.total}…` : `Import ${validRows.length} record${validRows.length === 1 ? '' : 's'}`}
          </button>
        </div>
      )}

      {step === 'summary' && results && (
        <div className="drawer-form">
          <p className="section-heading" style={{ margin: 0 }}>Import complete</p>
          <div className="stat-row" style={{ marginBottom: 8 }}>
            <div className="stat-card">
              <span className="stat-label">Imported</span>
              <span className="stat-value" style={{ color: 'var(--teal-deep)' }}>{results.succeeded.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Failed</span>
              <span className="stat-value" style={{ color: results.failed.length > 0 ? '#b0473f' : 'inherit' }}>{results.failed.length}</span>
            </div>
          </div>

          {results.failed.length > 0 && (
            <>
              <p className="section-heading">What went wrong</p>
              <div className="report-section" style={{ marginBottom: 0 }}>
                {results.failed.map((r) => (
                  <div key={r.rowNumber} className="upcoming-row">
                    <span>Row {r.rowNumber} — {r.employee?.full_name || r.record.employee_code}</span>
                    <span className="muted" style={{ fontSize: 12 }}>{r.reason}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <button type="button" className="btn-primary" onClick={handleClose} style={{ alignSelf: 'flex-start' }}>Done</button>
        </div>
      )}
    </Drawer>
  )
}
