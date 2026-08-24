import { XCircle } from 'lucide-react'
import { ArrowRightIcon } from './ui/arrow-right'
import { CircleCheckIcon } from './ui/circle-check'

export function ImportMapStep({
  headers,
  mapping,
  setMapping,
  targetFields,
  mappedRows,
  validRows,
  invalidRows,
  importing,
  progress,
  onImport,
  noun,
  nounPlural,
  previewHead,
  renderPreviewRow,
}) {
  return (
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
                  {targetFields.map((f) => (
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
            <thead><tr>{previewHead}<th>Status</th></tr></thead>
            <tbody>
              {mappedRows.slice(0, 50).map((r) => (
                <tr key={r.rowNumber} style={{ cursor: 'default' }}>
                  {renderPreviewRow(r)}
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
        onClick={onImport}
        style={{ alignSelf: 'flex-start' }}
      >
        {importing
          ? `Importing ${progress.done} of ${progress.total}…`
          : `Import ${validRows.length} ${validRows.length === 1 ? noun : (nounPlural || `${noun}s`)}`}
      </button>
    </div>
  )
}
