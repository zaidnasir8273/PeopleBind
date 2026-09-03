// A small, safe subset-of-markdown renderer for Help Center articles.
// Parses directly into React elements -- never through an HTML string --
// so there is no dangerouslySetInnerHTML and nothing to sanitize. Covers
// exactly what HR how-to content needs: headings, bold, inline code, fenced
// code blocks, bullet/numbered lists, links, paragraphs. Deliberately does
// not support tables/images/blockquotes -- not needed for this content.

// React doesn't validate an <a href> the way it validates
// dangerouslySetInnerHTML -- a `javascript:`/`data:` URL renders as a
// live, clickable link same as http(s). Source text here isn't always
// admin-authored (AI chat replies, the AI candidate-ranking assessment
// both render through this), so a scheme allowlist is load-bearing, not
// defense-in-depth: reject anything but http(s)/mailto and fall back to
// plain text rather than a dead/unsafe link.
function isSafeUrl(url) {
  try {
    // Relative URLs have no scheme and are always safe; give them a
    // dummy base purely so the URL constructor can parse them.
    const parsed = new URL(url, 'https://safe-base.invalid')
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

function renderInline(text, keyPrefix) {
  // Tokenize **bold**, `code`, and [text](url) without a real HTML pass --
  // split on the three patterns in order of appearance.
  const parts = []
  let remaining = text
  let i = 0
  const pattern = /(\*\*(.+?)\*\*)|(`(.+?)`)|(\[(.+?)\]\((.+?)\))/
  while (remaining.length > 0) {
    const match = remaining.match(pattern)
    if (!match) {
      parts.push(remaining)
      break
    }
    if (match.index > 0) parts.push(remaining.slice(0, match.index))
    if (match[1]) {
      parts.push(<strong key={`${keyPrefix}-${i++}`}>{match[2]}</strong>)
    } else if (match[3]) {
      parts.push(<code key={`${keyPrefix}-${i++}`} className="mono" style={{ background: 'var(--bg-subtle)', padding: '1px 5px', borderRadius: 4, fontSize: '0.9em' }}>{match[4]}</code>)
    } else if (match[5]) {
      if (isSafeUrl(match[7])) {
        parts.push(<a key={`${keyPrefix}-${i++}`} href={match[7]} target="_blank" rel="noopener noreferrer">{match[6]}</a>)
      } else {
        parts.push(match[6])
      }
    }
    remaining = remaining.slice(match.index + match[0].length)
  }
  return parts
}

export function renderMarkdown(source) {
  const lines = (source ?? '').split('\n')
  const blocks = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') {
      i++
      continue
    }

    // fenced code block
    if (line.trim().startsWith('```')) {
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing fence
      blocks.push(
        <pre key={key++} style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius)', overflowX: 'auto', fontSize: 13 }}>
          <code className="mono">{codeLines.join('\n')}</code>
        </pre>
      )
      continue
    }

    // headings
    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const Tag = level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4'
      blocks.push(<Tag key={key++}>{renderInline(headingMatch[2], `h${key}`)}</Tag>)
      i++
      continue
    }

    // bullet list
    if (/^[-*]\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''))
        i++
      }
      blocks.push(
        <ul key={key++} style={{ margin: '0 0 12px', paddingLeft: 22 }}>
          {items.map((item, idx) => <li key={idx} style={{ marginBottom: 4 }}>{renderInline(item, `ul${key}-${idx}`)}</li>)}
        </ul>
      )
      continue
    }

    // numbered list
    if (/^\d+\.\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''))
        i++
      }
      blocks.push(
        <ol key={key++} style={{ margin: '0 0 12px', paddingLeft: 22 }}>
          {items.map((item, idx) => <li key={idx} style={{ marginBottom: 4 }}>{renderInline(item, `ol${key}-${idx}`)}</li>)}
        </ol>
      )
      continue
    }

    // paragraph -- collect consecutive non-blank, non-block lines
    const paraLines = []
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,3})\s+/.test(lines[i]) && !/^[-*]\s+/.test(lines[i]) && !/^\d+\.\s+/.test(lines[i]) && !lines[i].trim().startsWith('```')) {
      paraLines.push(lines[i])
      i++
    }
    blocks.push(<p key={key++} style={{ margin: '0 0 12px', lineHeight: 1.6 }}>{renderInline(paraLines.join(' '), `p${key}`)}</p>)
  }

  return blocks
}
