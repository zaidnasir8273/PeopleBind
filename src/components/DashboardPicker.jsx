import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { PlusIcon } from './ui/plus'
import { SquarePenIcon } from './ui/square-pen'

// Groups: favorites first, then by folder (alphabetical), then
// unfoldered last -- matching PetroBind's own Custom Dashboards panel
// grouping (favorites, then folder, unfoldered last).
function groupDashboards(dashboards, query) {
  const q = query.trim().toLowerCase()
  const filtered = q ? dashboards.filter((d) => d.name.toLowerCase().includes(q)) : dashboards
  const favorites = filtered.filter((d) => d.is_favorite)
  const rest = filtered.filter((d) => !d.is_favorite)
  const byFolder = new Map()
  const unfoldered = []
  for (const d of rest) {
    if (d.folder) {
      if (!byFolder.has(d.folder)) byFolder.set(d.folder, [])
      byFolder.get(d.folder).push(d)
    } else {
      unfoldered.push(d)
    }
  }
  const folders = [...byFolder.entries()].sort(([a], [b]) => a.localeCompare(b))
  return { favorites, folders, unfoldered }
}

export function DashboardPicker({ dashboards, activeId, onSelect, onCreate, onToggleFavorite, onSetFolder, onDuplicate }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [editingFolderId, setEditingFolderId] = useState(null)
  const [folderInput, setFolderInput] = useState('')

  const active = dashboards.find((d) => d.id === activeId)
  const { favorites, folders, unfoldered } = useMemo(() => groupDashboards(dashboards, query), [dashboards, query])

  function startFolderEdit(d) {
    setEditingFolderId(d.id)
    setFolderInput(d.folder ?? '')
  }

  function commitFolder(d) {
    onSetFolder(d, folderInput.trim() || null)
    setEditingFolderId(null)
  }

  function renderRow(d) {
    return (
      <div key={d.id} className={`dashboard-picker-row${d.id === activeId ? ' active' : ''}`}>
        {editingFolderId === d.id ? (
          <input
            autoFocus
            className="dashboard-picker-folder-input"
            value={folderInput}
            onChange={(e) => setFolderInput(e.target.value)}
            onBlur={() => commitFolder(d)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitFolder(d); if (e.key === 'Escape') setEditingFolderId(null) }}
            placeholder="Folder name"
          />
        ) : (
          <>
            <button type="button" className="dashboard-picker-row-select" onClick={() => { onSelect(d); setOpen(false) }}>
              {d.is_default ? '★ ' : ''}{d.name}
            </button>
            <span className="dashboard-picker-row-actions">
              <button type="button" className="link-button" aria-label={d.is_favorite ? 'Unfavorite' : 'Favorite'} onClick={() => onToggleFavorite(d)}>
                {d.is_favorite ? '★' : '☆'}
              </button>
              <button type="button" className="link-button" aria-label="Move to folder" onClick={() => startFolderEdit(d)}>🗂</button>
              <button type="button" className="link-button" aria-label="Duplicate dashboard" onClick={() => onDuplicate(d)}>
                <PlusIcon size={12} />
              </button>
            </span>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="dashboard-tabs-wrap">
      <button type="button" className="cmdk-trigger" onClick={() => setOpen((v) => !v)} style={{ width: 'auto' }}>
        {active?.is_default ? '★ ' : ''}{active?.name ?? 'Select dashboard'}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="dashboard-picker-panel dashboard-picker-panel-rich">
          <input
            className="dashboard-picker-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dashboards…"
            autoFocus
          />
          <div className="dashboard-picker-list">
            {favorites.length > 0 && (
              <>
                <div className="dashboard-picker-group-label">Favorites</div>
                {favorites.map(renderRow)}
              </>
            )}
            {folders.map(([folder, items]) => (
              <div key={folder}>
                <div className="dashboard-picker-group-label">{folder}</div>
                {items.map(renderRow)}
              </div>
            ))}
            {unfoldered.length > 0 && (
              <>
                {(favorites.length > 0 || folders.length > 0) && <div className="dashboard-picker-group-label">Other</div>}
                {unfoldered.map(renderRow)}
              </>
            )}
            {favorites.length === 0 && folders.length === 0 && unfoldered.length === 0 && (
              <p className="muted" style={{ padding: '10px 12px', fontSize: 12.5 }}>No dashboards match.</p>
            )}
          </div>
          <button type="button" className="account-menu-item" onClick={() => { setOpen(false); onCreate() }}>
            <PlusIcon size={14} /> New dashboard
          </button>
        </div>
      )}
    </div>
  )
}
