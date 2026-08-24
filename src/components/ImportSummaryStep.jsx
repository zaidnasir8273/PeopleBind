export function ImportSummaryStep({ succeeded, failed, renderFailedRow, onDone }) {
  return (
    <div className="drawer-form">
      <p className="section-heading" style={{ margin: 0 }}>Import complete</p>
      <div className="stat-row" style={{ marginBottom: 8 }}>
        <div className="stat-card">
          <span className="stat-label">Imported</span>
          <span className="stat-value" style={{ color: 'var(--teal-deep)' }}>{succeeded.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Failed</span>
          <span className="stat-value" style={{ color: failed.length > 0 ? '#b0473f' : 'inherit' }}>{failed.length}</span>
        </div>
      </div>

      {failed.length > 0 && (
        <>
          <p className="section-heading">What went wrong</p>
          <div className="report-section" style={{ marginBottom: 0 }}>
            {failed.map((r) => (
              <div key={r.rowNumber} className="upcoming-row">
                <span>{renderFailedRow(r)}</span>
                <span className="muted" style={{ fontSize: 12 }}>{r.reason}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <button type="button" className="btn-primary" onClick={onDone} style={{ alignSelf: 'flex-start' }}>Done</button>
    </div>
  )
}
