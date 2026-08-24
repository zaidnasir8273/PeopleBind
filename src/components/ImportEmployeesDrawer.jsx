import { useState, useMemo } from 'react'
import Papa from 'papaparse'
import { XCircle } from 'lucide-react'
import { UploadIcon } from './ui/upload'
import { DownloadIcon } from './ui/download'
import { ArrowRightIcon } from './ui/arrow-right'
import { CircleCheckIcon } from './ui/circle-check'
import { supabase } from '../lib/supabase'
import { Drawer } from './Drawer'
import { exportCsv } from '../lib/csv'

const TARGET_FIELDS = [
  { key: '', label: "Don't import" },
  { key: 'full_name', label: 'Full name', required: true },
  { key: 'joining_date', label: 'Joining date (YYYY-MM-DD)', required: true },
  { key: 'personal_email', label: 'Personal email' },
  { key: 'phone', label: 'Phone' },
  { key: 'cnic', label: 'CNIC' },
  { key: 'department', label: 'Department' },
  { key: 'designation', label: 'Designation' },
  { key: 'employment_type', label: 'Employment type' },
  { key: 'branch', label: 'Branch' },
  { key: 'bank_account_number', label: 'Bank account number' },
]

const SYNONYMS = {
  full_name: ['name', 'fullname', 'full name', 'employee name', 'employee'],
  joining_date: ['joiningdate', 'joining date', 'dateofjoining', 'date of joining', 'startdate', 'start date', 'joined'],
  personal_email: ['email', 'personalemail', 'personal email', 'e-mail'],
  phone: ['phone', 'mobile', 'contact', 'phonenumber', 'phone number', 'cell'],
  cnic: ['cnic', 'nationalid', 'national id', 'idcard', 'id card'],
  department: ['department', 'dept'],
  designation: ['designation', 'title', 'jobtitle', 'job title', 'position', 'role'],
  employment_type: ['employmenttype', 'employment type', 'type'],
  branch: ['branch', 'location', 'office'],
  bank_account_number: ['bankaccount', 'bank account', 'accountnumber', 'account number', 'bank account number'],
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

export function ImportEmployeesDrawer({ open, onClose, company, lookups, onImported }) {
  const [step, setStep] = useState('upload')
  const [rawRows, setRawRows] = useState([])
  const [headers, setHeaders] = useState([])
  const [mapping, setMapping] = useState({})
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [results, setResults] = useState(null)
  const [parseError, setParseError] = useState(null)

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
    const usedFields = new Set(Object.values(mapping).filter(Boolean))
    return rawRows.map((row, i) => {
      const record = {}
      for (const [header, field] of Object.entries(mapping)) {
        if (field) record[field] = (row[header] ?? '').trim()
      }
      const errors = []
      if (!record.full_name) errors.push('Missing full name')
      if (!record.joining_date) errors.push('Missing joining date')
      else if (!isValidDate(record.joining_date)) errors.push('Joining date must be YYYY-MM-DD')
      return { rowNumber: i + 2, record, errors, usedFullNameField: usedFields.has('full_name') }
    })
  }, [rawRows, mapping])

  const validRows = mappedRows.filter((r) => r.errors.length === 0)
  const invalidRows = mappedRows.filter((r) => r.errors.length > 0)

  async function resolveLookupIds(rows) {
    const lookupTables = {
      department: { table: 'departments', existing: lookups.departments, key: 'department_id' },
      designation: { table: 'designations', existing: lookups.designations, key: 'designation_id' },
      employment_type: { table: 'employment_types', existing: lookups.employmentTypes, key: 'employment_type_id' },
      branch: { table: 'branches', existing: lookups.branches, key: 'branch_id' },
    }

    const idMaps = {}

    for (const [field, cfg] of Object.entries(lookupTables)) {
      const nameMap = new Map(cfg.existing.map((o) => [normalize(o.name), o.id]))
      const neededNames = [...new Set(rows.map((r) => r.record[field]).filter(Boolean))]
      const missing = neededNames.filter((n) => !nameMap.has(normalize(n)))

      if (missing.length > 0) {
        const { data: created } = await supabase
          .from(cfg.table)
          .insert(missing.map((name) => ({ company_id: company.id, name })))
          .select()
        for (const row of created ?? []) nameMap.set(normalize(row.name), row.id)
      }

      idMaps[field] = { nameMap, idKey: cfg.key }
    }

    return idMaps
  }

  async function handleImport() {
    setImporting(true)
    setProgress({ done: 0, total: validRows.length })

    const idMaps = await resolveLookupIds(validRows)

    const succeeded = []
    const failed = []

    for (const row of validRows) {
      const payload = {
        company_id: company.id,
        full_name: row.record.full_name,
        joining_date: row.record.joining_date,
        personal_email: row.record.personal_email || null,
        phone: row.record.phone || null,
        cnic: row.record.cnic || null,
        bank_account_number: row.record.bank_account_number || null,
      }
      for (const field of ['department', 'designation', 'employment_type', 'branch']) {
        const value = row.record[field]
        if (value) payload[idMaps[field].idKey] = idMaps[field].nameMap.get(normalize(value)) ?? null
      }

      const { error } = await supabase.from('employees').insert(payload)
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
    <Drawer open={open} onClose={handleClose} title="Import employees" wide>
      {step === 'upload' && (
        <div className="drawer-form">
          <p className="muted" style={{ margin: 0 }}>
            Upload a CSV with your employee list. You'll map columns and preview everything before anything gets created.
          </p>
          <button
            type="button"
            className="link-button"
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, alignSelf: 'flex-start' }}
            onClick={() => exportCsv('employees-template', TARGET_FIELDS.filter((f) => f.key), [])}
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
                <thead><tr><th>Row</th><th>Name</th><th>Joining date</th><th>Status</th></tr></thead>
                <tbody>
                  {mappedRows.slice(0, 50).map((r) => (
                    <tr key={r.rowNumber} style={{ cursor: 'default' }}>
                      <td className="mono">{r.rowNumber}</td>
                      <td>{r.record.full_name || '—'}</td>
                      <td className="mono">{r.record.joining_date || '—'}</td>
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
            {importing ? `Importing ${progress.done} of ${progress.total}…` : `Import ${validRows.length} employee${validRows.length === 1 ? '' : 's'}`}
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
                    <span>Row {r.rowNumber} — {r.record.full_name}</span>
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
