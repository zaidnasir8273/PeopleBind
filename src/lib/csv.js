export function csvEscape(value) {
  const s = String(value ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function exportCsv(label, columns, rows) {
  const header = columns.map((c) => csvEscape(c.label)).join(',')
  const body = rows.map((r) => columns.map((c) => csvEscape(r[c.key])).join(',')).join('\n')
  const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
