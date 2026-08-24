import { useState, useMemo } from 'react'
import Papa from 'papaparse'
import { UploadIcon } from './ui/upload'
import { DownloadIcon } from './ui/download'
import { supabase } from '../lib/supabase'
import { Drawer } from './Drawer'
import { ImportMapStep } from './ImportMapStep'
import { ImportSummaryStep } from './ImportSummaryStep'
import { exportCsv } from '../lib/csv'
import { normalize, autoMap, isValidDateStr, isValidNumber } from '../lib/importHelpers'

const TARGET_FIELDS = [
  { key: '', label: "Don't import" },
  { key: 'employee_code', label: 'Employee code', required: true },
  { key: 'component', label: 'Component name', required: true },
  { key: 'amount', label: 'Amount', required: true },
  { key: 'effective_from', label: 'Effective from (YYYY-MM-DD)', required: true },
]

const SYNONYMS = {
  employee_code: ['employeecode', 'employee code', 'empcode', 'emp code', 'employeeid', 'employee id', 'empid', 'emp id', 'code'],
  component: ['component', 'componentname', 'component name', 'salarycomponent', 'salary component'],
  amount: ['amount', 'value'],
  effective_from: ['effectivefrom', 'effective from', 'startdate', 'start date', 'from'],
}

// Mirrors the addDays already duplicated locally in Payroll.jsx / EmployeeDetail.jsx.
function addDays(dateStr, delta) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function ImportSalaryComponentsDrawer({ open, onClose, company, profile, employees, payrollComponents, onImported }) {
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

  const componentByName = useMemo(() => {
    const map = new Map()
    for (const c of payrollComponents) map.set(normalize(c.name), c)
    return map
  }, [payrollComponents])

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
      let component = null
      if (!record.employee_code) errors.push('Missing employee code')
      else {
        employee = employeeByCode.get(normalize(record.employee_code))
        if (!employee) errors.push('Unknown employee code')
      }
      if (!record.component) errors.push('Missing component')
      else {
        component = componentByName.get(normalize(record.component))
        if (!component) errors.push('Unknown payroll component — create it in Payroll → Structures first')
      }
      if (!record.amount) errors.push('Missing amount')
      else if (!isValidNumber(record.amount)) errors.push('Amount must be a number')
      if (!record.effective_from) errors.push('Missing effective from date')
      else if (!isValidDateStr(record.effective_from)) errors.push('Effective from must be YYYY-MM-DD')

      if (record.employee_code && record.component && record.effective_from) {
        const dupeKey = `${normalize(record.employee_code)}::${normalize(record.component)}::${record.effective_from}`
        if (seen.has(dupeKey)) errors.push('Duplicate employee + component + effective date in this file')
        else seen.add(dupeKey)
      }

      return { rowNumber: i + 2, record, employee, component, errors }
    })
  }, [rawRows, mapping, employeeByCode, componentByName])

  const validRows = mappedRows.filter((r) => r.errors.length === 0)
  const invalidRows = mappedRows.filter((r) => r.errors.length > 0)

  async function handleImport() {
    setImporting(true)
    setProgress({ done: 0, total: validRows.length })

    const groups = new Map()
    for (const row of validRows) {
      const key = `${row.employee.id}::${row.component.id}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(row)
    }
    for (const rows of groups.values()) {
      rows.sort((a, b) => (a.record.effective_from < b.record.effective_from ? -1 : 1))
    }

    const succeeded = []
    const failed = []

    for (const [key, rows] of groups) {
      const [employeeId, componentId] = key.split('::')
      const { data: existingOpen } = await supabase
        .from('employee_salary_components')
        .select('id, effective_from')
        .eq('employee_id', employeeId)
        .eq('payroll_component_id', componentId)
        .is('effective_to', null)

      let openRows = existingOpen ?? []

      for (const row of rows) {
        const toClose = openRows.filter((r) => r.effective_from < row.record.effective_from)
        for (const r of toClose) {
          await supabase
            .from('employee_salary_components')
            .update({ effective_to: addDays(row.record.effective_from, -1) })
            .eq('id', r.id)
        }
        openRows = openRows.filter((r) => !toClose.includes(r))

        const { data: inserted, error } = await supabase
          .from('employee_salary_components')
          .insert({
            company_id: company.id,
            employee_id: employeeId,
            payroll_component_id: componentId,
            amount: Number(row.record.amount),
            effective_from: row.record.effective_from,
            created_by: profile.id,
          })
          .select('id, effective_from')
          .single()

        if (error) {
          failed.push({ ...row, reason: error.message })
        } else {
          succeeded.push(row)
          openRows.push(inserted)
        }

        setProgress((p) => ({ ...p, done: p.done + 1 }))
      }
    }

    setImporting(false)
    setResults({ succeeded, failed })
    setStep('summary')
    onImported()
  }

  return (
    <Drawer open={open} onClose={handleClose} title="Import salary components" wide>
      {step === 'upload' && (
        <div className="drawer-form">
          <p className="muted" style={{ margin: 0 }}>
            Upload a CSV to set up employees' pay structure. If a component is already active for an employee, its
            previous amount is closed out the day before the imported one starts — the same rule as adding one
            manually. Payroll components must already exist in Payroll → Structures; this won't create new ones.
          </p>
          <button
            type="button"
            className="link-button"
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, alignSelf: 'flex-start' }}
            onClick={() => exportCsv('salary-components-template', TARGET_FIELDS.filter((f) => f.key), [])}
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
          noun="component"
          previewHead={<><th>Row</th><th>Employee</th><th>Component</th><th>Amount</th><th>Effective from</th></>}
          renderPreviewRow={(r) => (
            <>
              <td className="mono">{r.rowNumber}</td>
              <td>{r.employee?.full_name || r.record.employee_code || '—'}</td>
              <td>{r.record.component || '—'}</td>
              <td className="mono">{r.record.amount || '—'}</td>
              <td className="mono">{r.record.effective_from || '—'}</td>
            </>
          )}
        />
      )}

      {step === 'summary' && results && (
        <ImportSummaryStep
          succeeded={results.succeeded}
          failed={results.failed}
          renderFailedRow={(r) => `Row ${r.rowNumber} — ${r.employee?.full_name || r.record.employee_code} (${r.record.component})`}
          onDone={handleClose}
        />
      )}
    </Drawer>
  )
}
