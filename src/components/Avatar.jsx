const PALETTE = ['#123f33', '#0f4c5c', '#3d348b', '#7c2d12', '#1e3a5f', '#4a4a68']

function initialsFrom(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

function colorFrom(name) {
  if (!name) return PALETTE[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

export function Avatar({ name, photoUrl, size = 32 }) {
  if (photoUrl) {
    return <img src={photoUrl} alt={name || ''} className="avatar" style={{ width: size, height: size }} />
  }
  return (
    <span
      className="avatar avatar-initials"
      style={{ width: size, height: size, background: colorFrom(name), fontSize: Math.max(11, Math.round(size * 0.4)) }}
      aria-hidden="true"
    >
      {initialsFrom(name)}
    </span>
  )
}
