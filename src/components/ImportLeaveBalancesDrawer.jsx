import { useState, useMemo } from 'react'
import Papa from 'papaparse'
import { UploadIcon } from './ui/upload'
import { DownloadIcon } from './ui/download'
import { supabase } from '../lib/supabase'
import { Drawer } from './Drawer'
import { ImportMapStep } from './ImportMapStep'
import { ImportSummaryStep } from './ImportSummaryStep'
import { exportCsv } from '../lib/csv'
import { normalize, autoMap, isValidNumber } from '../lib/importHelpers'

const TARGET_FIELDS = [
  { key: '', label: "Don't import" },
  { key: 'employee_code', label: 'Employee code', required: true },
  { key: 'leave_type', label: 'Leave type', required: true },
  { key: 'year', label: 'Year (YYYY)', required: true },
  { key: 'entitled_days', label: 'Entitled days', required: true },
  { key: 'used_days', label: 'Used days' },
  { key: 'carried_forward_days', label: 'Carried forward days' },
]

const SYNONYMS = {
  employee_code: ['employeecode', 'employee code', 'empcode', 'emp code', 'employeeid', 'employee id', 'empid', 'emp id', 'code'],
  leave_type: ['leavetype', 'leave type', 'type'],
  year: ['year', 'fiscalyear', 'fiscal year'],
  entitled_days: ['entitleddays', 'entitled days', 'entitlement', 'days entitled'],
  used_days: ['useddays', 'used days', 'days used'],
  carried_forward_days: ['carriedforward', 'carried forward', 'carried forward days', 'carryforward'],
}

export function ImportLeaveBalancesDrawer({ open, onClose, company, employees, leaveTypes, onImported }) {
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
        setMapping(autoMap(result.meta.fields ?? [], SYNONYMS))
        setStep('map')
      },
      error: (err) => setParseError(err.message),
    })
  }

  const mappedRows = useMemo(() => {
    const seen = new Set()
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
      if (!record.leave_type) errors.push('Missing leave type')
      if (!record.year) errors.push('Missing year')
      else if (!/^\d{4}$/.test(record.year)) errors.push('Year must be YYYY')
      if (!record.entitled_days) errors.push('Missing entitled days')
      else if (!isValidNumber(record.entitled_days)) errors.push('Entitled days must be a number')
      if (record.used_days && !isValidNumber(record.used_days)) errors.push('Used days must be a number')
      if (record.carried_forward_days && !isValidNumber(record.carried_forward_days)) errors.push('Carried forward days must be a number')

      if (record.employee_code && record.leave_type && record.year) {
        const dupeKey = `${normalize(record.employee_code)}::${normalize(record.leave_type)}::${record.year}`
        if (seen.has(dupeKey)) errors.push('Duplicate employee + leave type + year in this file')
        else seen.add(dupeKey)
      }

      return { rowNumber: i + 2, record, employee, errors }
    })
  }, [rawRows, mapping, employeeByCode])

  const validRows = mappedRows.filter((r) => r.errors.length === 0)
  const invalidRows = mappedRows.filter((r) => r.errors.length > 0)

  async function resolveLeaveTypeIds(rows) {
    const nameMap = new Map(leaveTypes.map((t) => [normalize(t.name), t.id]))
    const needed = [...new Set(rows.map((r) => r.record.leave_type).filter(Boolean))]
    const missing = needed.filter((n) => !nameMap.has(normalize(n)))

    if (missing.length > 0) {
      const { data: created } = await supabase
        .from('leave_types')
        .insert(missing.map((name) => ({ company_id: company.id, name })))
        .select()
      for (const row of created ?? []) nameMap.set(normalize(row.name), row.id)
    }

    return nameMap
  }

  async function handleImport() {
    setImporting(true)
    setProgress({ done: 0, total: validRows.length })

    const leaveTypeIds = await resolveLeaveTypeIds(validRows)

    const succeeded = []
    const failed = []

    for (const row of validRows) {
      const payload = {
        company_id: company.id,
        employee_id: row.employee.id,
        leave_type_id: leaveTypeIds.get(normalize(row.record.leave_type)),
        year: Number(row.record.year),
        entitled_days: Number(row.record.entitled_days),
        used_days: Number(row.record.used_days || 0),
        carried_forward_days: Number(row.record.carried_forward_days || 0),
      }

      const { error } = await supabase.from('leave_balances').upsert(payload, { onConflict: 'employee_id,leave_type_id,year' })
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
    <Drawer open={open} onClose={handleClose} title="Import leave balances" wide>
      {step === 'upload' && (
        <div className="drawer-form">
          <p className="muted" style={{ margin: 0 }}>
            Upload a CSV with each employee's leave entitlement. You'll map columns and preview everything before
            anything gets saved. Existing balances for the same employee, leave type, and year are overwritten.
          </p>
          <button
            type="button"
            className="link-button"
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, alignSelf: 'flex-start' }}
            onClick={() => exportCsv('leave-balances-template', TARGET_FIELDS.filter((f) => f.key), [])}
          >
            <DownloadIcon size={13} /> Download CSV template
          </button>
          <label className="import-dropzone">
            <UploadIcon size={20} />
            <span>Choose a CSV file</span>
            <input type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: 'none' }} />
          </label>
          {parseError && <p className="field-error">{parseError}</p>}
        </div>
      )}

      {step === 'map' && (
        <ImportMapStep
          headers={headers}
          mapping={mapping}
          setMapping={setMapping}
          targetFields={TARGET_FIELDS}
          mappedRows={mappedRows}
          validRows={validRows}
          invalidRows={invalidRows}
          importing={importing}
          progress={progress}
          onImport={handleImport}
          noun="balance"
          previewHead={<><th>Row</th><th>Employee</th><th>Leave type</th><th>Year</th></>}
          renderPreviewRow={(r) => (
            <>
              <td className="mono">{r.rowNumber}</td>
              <td>{r.employee?.full_name || r.record.employee_code || '—'}</td>
              <td>{r.record.leave_type || '—'}</td>
              <td className="mono">{r.record.year || '—'}</td>
            </>
          )}
        />
      )}

      {step === 'summary' && results && (
        <ImportSummaryStep
          succeeded={results.succeeded}
          failed={results.failed}
          renderFailedRow={(r) => `Row ${r.rowNumber} — ${r.employee?.full_name || r.record.employee_code}`}
          onDone={handleClose}
        />
      )}
    </Drawer>
  )
}
