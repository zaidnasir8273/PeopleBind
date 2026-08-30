import { useRef, useState } from 'react'
import { UploadIcon } from './ui/upload'
import { FileCheckIcon } from './ui/file-check'
import { XIcon } from './ui/x'

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// `accept` is a native <input accept> string (comma-separated extensions
// and/or MIME types/patterns). The browse dialog already filters by this,
// but a drag-and-drop drop bypasses that entirely -- this re-checks each
// dropped file the same way so the two entry points behave consistently.
function matchesAccept(file, accept) {
  if (!accept) return true
  const rules = accept.split(',').map((r) => r.trim().toLowerCase()).filter(Boolean)
  if (rules.length === 0) return true
  const name = file.name.toLowerCase()
  const type = (file.type || '').toLowerCase()
  return rules.some((rule) => {
    if (rule.startsWith('.')) return name.endsWith(rule)
    if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1))
    return type === rule
  })
}

/**
 * Themed drop-in replacement for a bare `<input type="file">`. Renders its
 * own <label>/hidden-input pair, so wrap it in a <div className="field">
 * (not a <label>) -- nesting two <label>s is invalid and double-triggers
 * the file dialog.
 *
 * Single-file mode: pass `value` (File|null) + `onChange` (file|null).
 * Multiple mode: pass `multiple` + `onFilesSelected` (FileList => void);
 * `value`/`onChange` are ignored and the dropzone always shows its empty
 * prompt (the caller owns the selected-files list, e.g. Announcements.jsx).
 */
export function FileDropzone({
  value = null,
  onChange = undefined,
  multiple = false,
  onFilesSelected = undefined,
  accept = undefined,
  label = 'Drop a file here, or click to browse',
  hint = undefined,
  disabled = false,
}) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  function acceptFiles(fileList) {
    const files = Array.from(fileList)
    if (files.length === 0) return
    if (multiple) {
      const matched = files.filter((f) => matchesAccept(f, accept))
      if (matched.length > 0) onFilesSelected?.(matched)
      return
    }
    const [first] = files
    if (matchesAccept(first, accept)) onChange?.(first)
  }

  function handleInputChange(e) {
    acceptFiles(e.target.files)
    e.target.value = ''
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    acceptFiles(e.dataTransfer.files)
  }

  function handleRemove(e) {
    e.preventDefault()
    e.stopPropagation()
    onChange?.(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const hasFile = !multiple && value

  return (
    <label
      className={`file-dropzone${dragging ? ' dragging' : ''}${hasFile ? ' has-file' : ''}${disabled ? ' disabled' : ''}`}
      onDragEnter={(e) => { e.preventDefault(); if (!disabled) setDragging(true) }}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true) }}
      onDragLeave={(e) => { e.preventDefault(); setDragging(false) }}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />
      {hasFile ? (
        <>
          <FileCheckIcon size={18} />
          <span className="file-dropzone-name">
            {value.name}
            {value.size ? <span className="muted"> ({formatBytes(value.size)})</span> : null}
          </span>
          <button type="button" className="file-dropzone-remove" aria-label="Remove file" onClick={handleRemove}>
            <XIcon size={14} />
          </button>
        </>
      ) : (
        <>
          <UploadIcon size={18} />
          <span className="file-dropzone-label">{label}</span>
          {hint && <span className="muted file-dropzone-hint">{hint}</span>}
        </>
      )}
    </label>
  )
}
