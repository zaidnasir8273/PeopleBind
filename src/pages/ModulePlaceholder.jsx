export default function ModulePlaceholder({ title, description }) {
  return (
    <div className="page-inner">
      <p className="page-eyebrow">{title.toUpperCase()}</p>
      <h1 className="page-title">{title}</h1>
      <div className="empty-state" style={{ marginTop: 24 }}>
        <p>{description}</p>
        <p className="muted">This module is coming in a later build phase.</p>
      </div>
    </div>
  )
}
