export function SkeletonLine({ width = '100%', height = 14 }) {
  return <span className="skeleton skeleton-line" style={{ width, height }} />
}

export function SkeletonStatRow({ count = 3 }) {
  return (
    <div className="stat-row">
      {Array.from({ length: count }).map((_, i) => (
        <div className="stat-card" key={i}>
          <span className="skeleton skeleton-line" style={{ width: '60%', height: 11, marginBottom: 10 }} />
          <span className="skeleton skeleton-line" style={{ width: '45%', height: 22 }} />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5, columns = 4 }) {
  return (
    <table className="data-table skeleton-table">
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r}>
            {Array.from({ length: columns }).map((_, c) => (
              <td key={c}>
                <span
                  className="skeleton skeleton-line"
                  style={{ width: c === 0 ? '80%' : `${50 + ((r + c) % 3) * 10}%`, height: 13 }}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function SkeletonBlock({ rows = 4 }) {
  return (
    <div className="skeleton-block">
      {Array.from({ length: rows }).map((_, i) => (
        <span
          key={i}
          className="skeleton skeleton-line"
          style={{ width: i === rows - 1 ? '40%' : `${85 - i * 6}%`, height: 13 }}
        />
      ))}
    </div>
  )
}
