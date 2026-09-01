import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { SkeletonBlock } from './Skeleton'
import { SearchableSelect } from './SearchableSelect'
import { DeleteIcon } from './ui/delete'
import { RotateCCWIcon } from './ui/rotate-ccw'

// supabase-js functions.invoke() puts a non-2xx response's body on
// error.context (a Response) rather than in a plain message string --
// same helper useAiChat.ts uses to surface the edge function's actual
// error text instead of a generic "non-2xx status" string.
async function extractErrorMessage(error) {
  if (error?.context) {
    try {
      const body = await error.context.clone().json()
      if (body?.error) return body.error
    } catch {
      // fall through to the generic message below
    }
  }
  return error?.message || 'Something went wrong. Please try again.'
}

export function ClickUpIntegrationTab() {
  const { profile, company } = useAuth()
  const [hasAccess, setHasAccess] = useState(null)

  useEffect(() => {
    if (profile?.is_platform_admin) {
      setHasAccess(true)
      return
    }
    let cancelled = false
    supabase.rpc('auth_has_permission', { p_resource: 'settings', p_action: 'manage' }).then(({ data }) => {
      if (!cancelled) setHasAccess(!!data)
    })
    return () => {
      cancelled = true
    }
  }, [profile?.is_platform_admin])

  if (hasAccess === null) return <SkeletonBlock rows={6} />

  if (!hasAccess) {
    return (
      <div className="empty-state" style={{ marginTop: 20 }}>
        <p>You don't have access to manage integrations.</p>
        <p className="muted">Ask a company admin to grant you the "Manage company settings" permission.</p>
      </div>
    )
  }

  return <ClickUpConnectedArea company={company} />
}

function ClickUpConnectedArea({ company }) {
  // undefined = still loading, null = no connection row yet
  const [connection, setConnection] = useState(undefined)

  const loadConnection = useCallback(async () => {
    const { data } = await supabase.from('clickup_connections').select('*').eq('company_id', company.id).maybeSingle()
    setConnection(data ?? null)
  }, [company.id])

  useEffect(() => {
    loadConnection()
  }, [loadConnection])

  if (connection === undefined) return <SkeletonBlock rows={6} />

  return (
    <div style={{ display: 'grid', gap: 20, maxWidth: 760 }}>
      <div className="report-section" style={{ marginBottom: 0 }}>
        <p className="section-heading">ClickUp</p>
        {connection ? (
          <ConnectedCard connection={connection} company={company} onChanged={loadConnection} />
        ) : (
          <ConnectForm company={company} onConnected={loadConnection} />
        )}
      </div>

      {connection && (
        <>
          <ProjectMappingCard company={company} />
          <UserMappingCard company={company} />
        </>
      )}
    </div>
  )
}

function ConnectForm({ company, onConnected }) {
  const [token, setToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [teams, setTeams] = useState(null)
  const [pickedTeamId, setPickedTeamId] = useState('')
  const [error, setError] = useState(null)

  async function submit(teamId) {
    setSaving(true)
    setError(null)
    const { data, error: invokeError } = await supabase.functions.invoke('clickup-sync', {
      body: { action: 'save_token', company_id: company.id, clickup_token: token, ...(teamId ? { clickup_team_id: teamId } : {}) },
    })
    setSaving(false)
    if (invokeError) {
      setError(await extractErrorMessage(invokeError))
      return
    }
    if (data?.needs_team_selection) {
      setTeams(data.teams)
      return
    }
    toast.success(`Connected to ${data.team_name}`)
    onConnected()
  }

  if (teams) {
    return (
      <div style={{ display: 'grid', gap: 10 }}>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          This token has access to multiple ClickUp workspaces — pick one:
        </p>
        <div className="field-row" style={{ marginBottom: 0 }}>
          <select className="input-ghost" value={pickedTeamId} onChange={(e) => setPickedTeamId(e.target.value)}>
            <option value="">— Workspace —</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button type="button" className="btn-primary" disabled={!pickedTeamId || saving} onClick={() => submit(pickedTeamId)}>
            {saving ? 'Connecting…' : 'Connect'}
          </button>
        </div>
        {error && <p className="field-error">{error}</p>}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        Paste a personal API token from your ClickUp account (ClickUp → avatar → Settings → Apps) to sync time
        entries into PeopleBind's timesheets. No ClickUp app to register — this works immediately.
      </p>
      <div className="field-row" style={{ marginBottom: 0 }}>
        <input
          type="password"
          className="input-ghost"
          placeholder="ClickUp personal API token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="button" className="btn-primary" disabled={!token.trim() || saving} onClick={() => submit()}>
          {saving ? 'Connecting…' : 'Connect'}
        </button>
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}

function ConnectedCard({ connection, company, onChanged }) {
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  async function syncNow() {
    setSyncing(true)
    const { data, error } = await supabase.functions.invoke('clickup-sync', {
      body: { action: 'sync', company_id: company.id, trigger: 'manual' },
    })
    setSyncing(false)
    if (error) {
      toast.error(await extractErrorMessage(error))
      onChanged()
      return
    }
    if (data?.ok === false) {
      toast.error(data.error || 'Sync failed')
    } else if (data?.summary?.note) {
      toast(data.summary.note)
    } else {
      const s = data.summary
      toast.success(`Synced — ${s.inserted} new, ${s.updated} updated, ${s.preserved_reviewed} already reviewed`)
    }
    onChanged()
  }

  async function disconnect() {
    if (!window.confirm('Disconnect ClickUp? Time entries already synced into PeopleBind will be kept, but syncing will stop.')) return
    setDisconnecting(true)
    const { error } = await supabase.functions.invoke('clickup-sync', { body: { action: 'disconnect', company_id: company.id } })
    setDisconnecting(false)
    if (error) {
      toast.error(await extractErrorMessage(error))
      return
    }
    toast.success('Disconnected')
    onChanged()
  }

  const summary = connection.last_sync_summary
  const isError = connection.status === 'error'

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className={`status-badge status-${isError ? 'rejected' : 'active'}`}>{isError ? 'error' : 'connected'}</span>
        <strong>{connection.clickup_team_name ?? connection.clickup_team_id}</strong>
      </div>
      {connection.last_error && <p className="field-error">{connection.last_error}</p>}
      <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
        Last synced: {connection.last_synced_at ? new Date(connection.last_synced_at).toLocaleString() : 'never'}
        {summary && !summary.note && (
          <> — {summary.inserted} new, {summary.updated} updated, {summary.preserved_reviewed} already reviewed
            {(summary.skipped_unmapped_user || summary.skipped_unmapped_project) ? `, ${summary.skipped_unmapped_user + summary.skipped_unmapped_project} skipped (unmapped)` : ''}
          </>
        )}
      </p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button type="button" className="btn-secondary" disabled={syncing} onClick={syncNow} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RotateCCWIcon size={14} /> {syncing ? 'Syncing…' : 'Sync now'}
        </button>
        <button type="button" className="link-button" style={{ color: 'var(--danger)' }} disabled={disconnecting} onClick={disconnect}>
          {disconnecting ? 'Disconnecting…' : 'Disconnect'}
        </button>
      </div>
    </div>
  )
}

function ProjectMappingCard({ company }) {
  const [links, setLinks] = useState([])
  const [projects, setProjects] = useState([])
  const [clickupLists, setClickupLists] = useState(null) // null = not loaded from ClickUp yet this session
  const [loadingLists, setLoadingLists] = useState(false)
  const [selectedListId, setSelectedListId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [saving, setSaving] = useState(false)

  const loadLinks = useCallback(async () => {
    const [{ data: l }, { data: p }] = await Promise.all([
      supabase.from('clickup_project_links')
        .select('id, clickup_list_id, clickup_list_name, clickup_space_name, clickup_folder_name, project_id, projects(name)')
        .eq('company_id', company.id).order('created_at'),
      supabase.from('projects').select('id, name').eq('company_id', company.id).eq('status', 'active').order('name'),
    ])
    setLinks(l ?? [])
    setProjects(p ?? [])
  }, [company.id])

  useEffect(() => {
    loadLinks()
  }, [loadLinks])

  async function loadClickupLists() {
    setLoadingLists(true)
    const { data, error } = await supabase.functions.invoke('clickup-sync', {
      body: { action: 'list_clickup_resources', company_id: company.id },
    })
    setLoadingLists(false)
    if (error) {
      toast.error(await extractErrorMessage(error))
      return
    }
    setClickupLists(data.lists ?? [])
  }

  async function addMapping() {
    if (!selectedListId || !selectedProjectId) return
    const list = clickupLists.find((l) => l.list_id === selectedListId)
    setSaving(true)
    const { error } = await supabase.from('clickup_project_links').insert({
      company_id: company.id,
      clickup_list_id: selectedListId,
      clickup_list_name: list?.list_name ?? null,
      clickup_space_name: list?.space_name ?? null,
      clickup_folder_name: list?.folder_name ?? null,
      project_id: selectedProjectId,
    })
    setSaving(false)
    if (error) {
      toast.error(error.message || 'Failed to add mapping')
      return
    }
    setSelectedListId('')
    setSelectedProjectId('')
    loadLinks()
  }

  async function removeMapping(id) {
    const { error } = await supabase.from('clickup_project_links').delete().eq('id', id)
    if (error) {
      toast.error(error.message || 'Failed to remove')
      return
    }
    loadLinks()
  }

  const listOptions = (clickupLists ?? []).map((l) => ({
    value: l.list_id, label: l.list_name, group: l.space_name,
    sublabel: [l.space_name, l.folder_name].filter(Boolean).join(' / '),
  }))
  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }))

  return (
    <div className="report-section" style={{ marginBottom: 0 }}>
      <p className="section-heading">Project mapping</p>
      <p className="muted" style={{ marginTop: -6, fontSize: 12.5 }}>Which ClickUp List feeds which PeopleBind project's timesheet.</p>
      {links.length === 0 ? (
        <p className="muted">No mappings yet.</p>
      ) : (
        <div className="lookup-list">
          {links.map((r) => (
            <div key={r.id} className="lookup-row">
              <span>
                {r.clickup_list_name ?? r.clickup_list_id}
                <span className="muted" style={{ display: 'block', fontSize: 11 }}>
                  {[r.clickup_space_name, r.clickup_folder_name].filter(Boolean).join(' / ')} → {r.projects?.name ?? '—'}
                </span>
              </span>
              <button type="button" className="btn-icon-round reject lookup-row-remove" onClick={() => removeMapping(r.id)} aria-label="Remove">
                <DeleteIcon size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {clickupLists === null ? (
        <button type="button" className="link-button" disabled={loadingLists} onClick={loadClickupLists} style={{ marginTop: 8 }}>
          {loadingLists ? 'Loading ClickUp lists…' : 'Load ClickUp lists'}
        </button>
      ) : (
        <div className="lookup-add-group">
          <div className="field-row" style={{ marginBottom: 0 }}>
            <SearchableSelect options={listOptions} value={selectedListId} onChange={setSelectedListId} placeholder="— ClickUp list —" />
            <SearchableSelect options={projectOptions} value={selectedProjectId} onChange={setSelectedProjectId} placeholder="— PeopleBind project —" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn-primary" disabled={saving || !selectedListId || !selectedProjectId} onClick={addMapping}>
              Add mapping
            </button>
            <button type="button" className="link-button" onClick={loadClickupLists} disabled={loadingLists}>
              {loadingLists ? 'Refreshing…' : 'Refresh from ClickUp'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function UserMappingCard({ company }) {
  const [links, setLinks] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(false)

  const loadLinks = useCallback(async () => {
    const [{ data: l }, { data: e }] = await Promise.all([
      supabase.from('clickup_user_links')
        .select('id, clickup_user_id, clickup_username, clickup_email, employee_id, matched_by, employees(full_name)')
        .eq('company_id', company.id).order('clickup_username'),
      supabase.from('employees')
        .select('id, full_name, personal_email, profiles!employees_user_id_fkey(email)')
        .eq('company_id', company.id).in('employment_status', ['training', 'probation', 'confirmed']).order('full_name'),
    ])
    setLinks(l ?? [])
    setEmployees(e ?? [])
  }, [company.id])

  useEffect(() => {
    loadLinks()
  }, [loadLinks])

  async function refreshFromClickup() {
    setLoading(true)
    const { data, error } = await supabase.functions.invoke('clickup-sync', {
      body: { action: 'list_clickup_resources', company_id: company.id },
    })
    if (error) {
      setLoading(false)
      toast.error(await extractErrorMessage(error))
      return
    }
    const members = data.members ?? []
    const existingByClickupId = new Map(links.map((l) => [l.clickup_user_id, l]))

    for (const m of members) {
      const existing = existingByClickupId.get(m.clickup_user_id)
      // Never touch a row an admin already resolved by hand -- a refresh
      // should only fill in NEW members, not undo a manual correction.
      if (existing && existing.matched_by === 'manual') continue

      let employeeId = existing?.employee_id ?? null
      let matchedBy = existing?.matched_by ?? 'unmatched'
      if (!employeeId && m.email) {
        const match = employees.find((e) =>
          e.personal_email?.toLowerCase() === m.email.toLowerCase() ||
          e.profiles?.email?.toLowerCase() === m.email.toLowerCase()
        )
        if (match) {
          employeeId = match.id
          matchedBy = 'auto'
        }
      }

      await supabase.from('clickup_user_links').upsert({
        company_id: company.id,
        clickup_user_id: m.clickup_user_id,
        clickup_username: m.username,
        clickup_email: m.email,
        employee_id: employeeId,
        matched_by: employeeId ? matchedBy : 'unmatched',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id,clickup_user_id' })
    }
    setLoading(false)
    loadLinks()
  }

  async function resolveManually(linkId, employeeId) {
    const { error } = await supabase.from('clickup_user_links')
      .update({ employee_id: employeeId || null, matched_by: employeeId ? 'manual' : 'unmatched', updated_at: new Date().toISOString() })
      .eq('id', linkId)
    if (error) {
      toast.error(error.message || 'Failed to update')
      return
    }
    loadLinks()
  }

  const employeeOptions = employees.map((e) => ({ value: e.id, label: e.full_name }))

  return (
    <div className="report-section" style={{ marginBottom: 0 }}>
      <p className="section-heading">User mapping</p>
      <p className="muted" style={{ marginTop: -6, fontSize: 12.5 }}>
        Which ClickUp workspace member is which employee. Only mapped users' time entries are synced.
      </p>
      {links.length === 0 ? (
        <p className="muted">No ClickUp members loaded yet.</p>
      ) : (
        <div className="lookup-list">
          {links.map((r) => (
            <div key={r.id} className="lookup-row">
              <span>
                {r.clickup_username ?? r.clickup_email ?? r.clickup_user_id}
                {r.clickup_email && <span className="muted" style={{ display: 'block', fontSize: 11 }}>{r.clickup_email}</span>}
              </span>
              {r.employee_id ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`status-badge status-${r.matched_by === 'manual' ? 'approved' : 'active'}`}>{r.employees?.full_name}</span>
                  <button type="button" className="link-button" style={{ fontSize: 12 }} onClick={() => resolveManually(r.id, '')}>Unlink</button>
                </span>
              ) : (
                <div style={{ width: 220 }}>
                  <SearchableSelect options={employeeOptions} value="" onChange={(v) => resolveManually(r.id, v)} placeholder="— Assign employee —" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <button type="button" className="link-button" disabled={loading} onClick={refreshFromClickup} style={{ marginTop: 8 }}>
        {loading ? 'Refreshing…' : 'Refresh from ClickUp'}
      </button>
    </div>
  )
}
