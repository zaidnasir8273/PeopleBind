export function normalize(s) {
  return s.toLowerCase().trim()
}

export function autoMap(headers, synonyms) {
  const mapping = {}
  for (const header of headers) {
    const norm = normalize(header)
    let matched = ''
    for (const [field, syns] of Object.entries(synonyms)) {
      if (syns.includes(norm)) {
        matched = field
        break
      }
    }
    mapping[header] = matched
  }
  return mapping
}

export function isValidDateStr(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(new Date(str).getTime())
}

export function isValidNumber(str) {
  return str !== '' && !isNaN(Number(str)) && Number(str) >= 0
}

export function parseBoolish(str, fallback) {
  const norm = normalize(str || '')
  if (['yes', 'true', '1', 'y'].includes(norm)) return true
  if (['no', 'false', '0', 'n'].includes(norm)) return false
  return fallback
}
