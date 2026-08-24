import { useState, useMemo } from 'react'
import Papa from 'papaparse'
import { UploadIcon } from './ui/upload'
import { DownloadIcon } from './ui/download'
import { supabase } from '../lib/supabase'
import { Drawer } from './Drawer'
import { ImportMapStep } from './ImportMapStep'
import { ImportSummaryStep } from './ImportSummaryStep'
import { exportCsv } from '../lib/csv'
import { normalize, autoMap, isValidDateStr, parseBoolish } from '../lib/importHelpers'

const TARGET_FIELDS = [
  { key: '', label: "Don't import" },
  { key: 'employee_code', label: 'Employee code', required: true },
  { key: 'entry_date', label: 'Date (YYYY-MM-DD)', required: true },
  { key: 'project', label: 'Project', required: true },
  { key: 'task', label: 'Task' },
  { key: 'hours', label: 'Hours', required: true },
  { key: 'billable', label: 'Billable (yes/no)' },
  { key: 'notes', label: 'Notes' },
]

const SYNONYMS = {
  employee_code: ['employeecode', 'employee code', 'empcode', 'emp code', 'employeeid', 'employee id', 'empid', 'emp id', 'code'],
  entry_date: ['date', 'entrydate', 'entry date', 'day'],
  project: ['project', 'projectname', 'project name'],
  task: ['task', 'taskname', 'task name'],
  hours: ['hours', 'hrs', 'duration', 'time'],
  billable: ['billable', 'isbillable', 'is billable'],
  notes: ['notes', 'note', 'description', 'comment', 'comments'],
}

function isValidHours(str) {
  return str !== '' && !isNaN(Number(str)) && Number(str) > 0
}

export function ImportTimeEntriesDrawer({ open, onClose, company, profile, employees, projects, tasks, onImported }) {
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
      if (!record.entry_date) errors.push('Missing date')
      else if (!isValidDateStr(record.entry_date)) errors.push('Date must be YYYY-MM-DD')
      if (!record.project) errors.push('Missing project')
      if (!record.hours) errors.push('Missing hours')
      else if (!isValidHours(record.hours)) errors.push('Hours must be a positive number')

      return { rowNumber: i + 2, record, employee, errors }
    })
  }, [rawRows, mapping, employeeByCode])

  const validRows = mappedRows.filter((r) => r.errors.length === 0)
  const invalidRows = mappedRows.filter((r) => r.errors.length > 0)

  async function resolveNameIds(rows, field, table, existing) {
    const nameMap = new Map(existing.map((o) => [normalize(o.name), o.id]))
    const needed = [...new Set(rows.map((r) => r.record[field]).filter(Boolean))]
    const missing = needed.filter((n) => !nameMap.has(normalize(n)))

    if (missing.length > 0) {
      const { data: created } = await supabase
        .from(table)
        .insert(missing.map((name) => ({ company_id: company.id, name })))
        .select()
      for (const row of created ?? []) nameMap.set(normalize(row.name), row.id)
    }

    return nameMap
  }

  async function handleImport() {
    setImporting(true)
    setProgress({ done: 0, total: validRows.length })

    const [projectIds, taskIds] = await Promise.all([
      resolveNameIds(validRows, 'project', 'projects', projects),
      resolveNameIds(validRows, 'task', 'timesheet_tasks', tasks),
    ])

    const succeeded = []
    const failed = []
    const now = new Date().toISOString()

    for (const row of validRows) {
      const payload = {
        company_id: company.id,
        employee_id: row.employee.id,
        project_id: projectIds.get(normalize(row.record.project)) ?? null,
        task_id: row.record.task ? (taskIds.get(normalize(row.record.task)) ?? null) : null,
        timesheet_id: null,
        entry_date: row.record.entry_date,
        duration_minutes: Math.round(Number(row.record.hours) * 60),
        billable: parseBoolish(row.record.billable, true),
        notes: row.record.notes || null,
        status: 'approved',
        submitted_by: profile.id,
        reviewed_by: profile.id,
        reviewed_at: now,
      }

      const { error } = await supabase.from('time_entries').insert(payload)
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
    <Drawer open={open} onClose={handleClose} title="Import time entries" wide>
      {step === 'upload' && (
        <div className="drawer-form">
          <p className="muted" style={{ margin: 0 }}>
            Upload a CSV with past time entries. Imported rows are marked as already approved and show up in the
            Entries tab and reports — they aren't grouped into a weekly timesheet. Each row creates a new entry, so
            re-uploading the same file will create duplicates.
          </p>
          <button
            type="button"
            className="link-button"
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, alignSelf: 'flex-start' }}
            onClick={() => exportCsv('time-entries-template', TARGET_FIELDS.filter((f) => f.key), [])}
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
          noun="entry"
          nounPlural="entries"
          previewHead={<><th>Row</th><th>Employee</th><th>Project</th><th>Date</th><th>Hours</th></>}
          renderPreviewRow={(r) => (
            <>
              <td className="mono">{r.rowNumber}</td>
              <td>{r.employee?.full_name || r.record.employee_code || '—'}</td>
              <td>{r.record.project || '—'}</td>
              <td className="mono">{r.record.entry_date || '—'}</td>
              <td className="mono">{r.record.hours || '—'}</td>
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
