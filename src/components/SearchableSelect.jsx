import { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown, Check } from 'lucide-react'

// A lightweight, keyboard-friendly combobox: click to open, type to filter,
// arrow keys + Enter to pick, click-outside or Escape to close.
// options: [{ value, label, sublabel?, group? }]
export function SearchableSelect({ options, value, onChange, placeholder = '— Select —', disabled, emptyLabel = 'No matches.' }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open])

  const filtered = options.filter((o) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q) || o.group?.toLowerCase().includes(q)
  })

  const selected = options.find((o) => o.value === value)

  function pick(opt) {
    onChange(opt.value)
    setOpen(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[activeIndex]) pick(filtered[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  let lastGroup = null

  return (
    <div className="searchable-select" ref={wrapRef}>
      <button
        type="button"
        className="searchable-select-trigger"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={selected ? '' : 'muted'}>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="searchable-select-panel">
          <div className="searchable-select-input-row">
            <Search size={14} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIndex(0) }}
              onKeyDown={handleKeyDown}
              placeholder="Search…"
            />
          </div>
          <div className="searchable-select-results">
            {filtered.length === 0 ? (
              <p className="muted" style={{ padding: '14px 12px', fontSize: 13, margin: 0 }}>{emptyLabel}</p>
            ) : (
              filtered.map((opt, i) => {
                const showGroup = opt.group && opt.group !== lastGroup
                lastGroup = opt.group
                return (
                  <div key={opt.value}>
                    {showGroup && <div className="searchable-select-group-label">{opt.group}</div>}
                    <button
                      type="button"
                      className={`searchable-select-item${i === activeIndex ? ' active' : ''}`}
                      onClick={() => pick(opt)}
                      onMouseEnter={() => setActiveIndex(i)}
                    >
                      <span style={{ flex: 1 }}>
                        {opt.label}
                        {opt.sublabel && <span className="muted" style={{ display: 'block', fontSize: 12 }}>{opt.sublabel}</span>}
                      </span>
                      {opt.value === value && <Check size={14} />}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
