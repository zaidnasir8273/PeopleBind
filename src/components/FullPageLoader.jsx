export function FullPageLoader() {
  return (
    <div className="centered-loading">
      <div className="branded-loading-spinner">
        <span className="branded-loading-ring" />
        <span className="branded-loading-mark" aria-hidden="true" />
      </div>
    </div>
  )
}
