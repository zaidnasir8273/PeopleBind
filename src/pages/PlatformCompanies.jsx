import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { LogInIcon } from '../components/ui/login'
import { PlusIcon } from '../components/ui/plus'
import { SquarePenIcon } from '../components/ui/square-pen'
import { Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'
import { SkeletonTable } from '../components/Skeleton'

function formatDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function PlatformCompanies() {
  const navigate = useNavigate()
  const { company, isImpersonating, enterCompany, refreshProfile } = useAuth()
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCompany, setActiveCompany] = useState(null)
  const [form, setForm] = useState({ name: '', status: '', plan: '' })
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', slug: '', plan: 'starter', status: 'trial', timezone: 'Asia/Karachi' })
  const [slugTouched, setSlugTouched] = useState(false)
  const [savingCreate, setSavingCreate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('companies')
      .select('id, name, slug, plan, status, timezone, fiscal_year_start, created_at, is_demo, employees(count)')
      .order('created_at', { ascending: false })
    setCompanies(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openCompany(c) {
    setActiveCompany(c)
    setForm({ name: c.name, status: c.status, plan: c.plan })
    setConfirmingDelete(false)
    setDeleteInput('')
  }

  function closeDrawer() {
    setActiveCompany(null)
    setConfirmingDelete(false)
    setDeleteInput('')
  }

  function openCreate() {
    setCreateForm({ name: '', slug: '', plan: 'starter', status: 'trial', timezone: 'Asia/Karachi' })
    setSlugTouched(false)
    setCreating(true)
  }

  function closeCreate() {
    setCreating(false)
  }

  function onCreateNameChange(name) {
    setCreateForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }))
  }

  async function createCompany() {
    if (!createForm.name.trim() || !createForm.slug.trim()) return
    setSavingCreate(true)
    const { error } = await supabase.from('companies').insert({
      name: createForm.name.trim(),
      slug: createForm.slug.trim(),
      plan: createForm.plan,
      status: createForm.status,
      timezone: createForm.timezone,
    })
    setSavingCreate(false)
    if (error) {
      toast.error(error.message || 'Failed to create company')
      return
    }
    toast.success(`${createForm.name} created`)
    closeCreate()
    load()
  }

  async function deleteCompany() {
    if (!activeCompany || deleteInput !== activeCompany.name) return
    setDeleting(true)
    const { error } = await supabase.rpc('platform_delete_company', { p_company_id: activeCompany.id })
    setDeleting(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(`${activeCompany.name} deleted`)
    closeDrawer()
    load()
  }

  function viewAs(c, e) {
    e.stopPropagation()
    enterCompany(c)
    navigate('/app')
  }

  async function saveChanges() {
    if (!activeCompany || !form.name.trim()) return
    setSaving(true)
    const { error } = await supabase
      .from('companies')
      .update({ name: form.name.trim(), status: form.status, plan: form.plan })
      .eq('id', activeCompany.id)
    setSaving(false)
    if (error) {
      toast.error(error.message || 'Failed to update company')
      return
    }
    // The company someone is currently viewing (impersonated, or the
    // platform admin's own) is held as a separate snapshot in AuthContext/
    // sessionStorage -- it won't pick up this edit on its own, so refresh
    // it explicitly when it's the one that just changed.
    if (company?.id === activeCompany.id) {
      if (isImpersonating) {
        enterCompany({ ...activeCompany, name: form.name.trim(), status: form.status, plan: form.plan })
      } else {
        refreshProfile()
      }
    }
    toast.success('Company updated')
    setActiveCompany(null)
    load()
  }

  const realCompanies = companies.filter((c) => !c.is_demo)
  const totalEmployees = realCompanies.reduce((sum, c) => sum + (c.employees?.[0]?.count ?? 0), 0)

  return (
    <div className="page-inner" style={{ maxWidth: 1000 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">PLATFORM ADMIN</p>
          <h1 className="page-title">Companies</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="report-stat">{realCompanies.length} companies · {totalEmployees} employees</span>
          <button type="button" className="btn-primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <PlusIcon size={15} />
            Add company
          </button>
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={5} columns={5} />
      ) : companies.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p>No companies yet.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Employees</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} onClick={() => openCompany(c)}>
                <td>
                  {c.name}
                  {c.is_demo && <span className="tab-count" style={{ marginLeft: 8, background: 'var(--ink-soft)' }}>demo</span>}
                  <span className="mono" style={{ display: 'block', color: 'var(--ink-soft)', fontSize: 12 }}>{c.slug}</span>
                </td>
                <td style={{ textTransform: 'capitalize' }}>{c.plan}</td>
                <td>
                  <span className={`status-badge status-${c.status === 'active' ? 'active' : c.status === 'suspended' || c.status === 'cancelled' ? 'terminated' : 'pending'}`}>
                    {c.status}
                  </span>
                </td>
                <td className="mono">{c.employees?.[0]?.count ?? 0}</td>
                <td className="mono">{formatDate(c.created_at)}</td>
                <td>
                  <div className="icon-actions" style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn-icon-round"
                      onClick={(e) => { e.stopPropagation(); openCompany(c) }}
                      aria-label={`Edit ${c.name}`}
                      data-tooltip={`Edit ${c.name}`}
                    >
                      <SquarePenIcon size={13} />
                    </button>
                    <button className="btn-icon-round" onClick={(e) => viewAs(c, e)} aria-label={`View as ${c.name}`} data-tooltip={`View as ${c.name}`}>
                      <LogInIcon size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Drawer open={!!activeCompany} onClose={closeDrawer} title={activeCompany?.name}>
        {activeCompany && (
          <div className="drawer-form">
            <label className="field">
              <span>Name</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>

            <div className="field-row">
              <div className="field">
                <span>Timezone</span>
                <p style={{ margin: 0 }}>{activeCompany.timezone}</p>
              </div>
              <div className="field">
                <span>Fiscal year start</span>
                <p style={{ margin: 0 }}>{formatDate(activeCompany.fiscal_year_start)}</p>
              </div>
            </div>

            <label className="field">
              <span>Plan</span>
              <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>

            <label className="field">
              <span>Status</span>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>

            {form.status === 'suspended' && (
              <p className="muted" style={{ margin: 0 }}>
                Suspending doesn't delete anything — it's meant to block access while a billing or compliance issue is resolved.
              </p>
            )}

            <button type="button" className="btn-primary" disabled={saving || !form.name.trim()} onClick={saveChanges} style={{ alignSelf: 'flex-start' }}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>

            <div style={{ marginTop: 8, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600 }}>Danger zone</p>
              {!confirmingDelete ? (
                <button type="button" className="btn-danger" onClick={() => setConfirmingDelete(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Trash2 size={14} />
                  Delete company
                </button>
              ) : (
                <div className="drawer-form" style={{ gap: 10 }}>
                  <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                    This permanently deletes <strong>{activeCompany.name}</strong> and everything tied to
                    it — employees, payroll, attendance, leave, documents, all of it. This cannot be undone.
                    Type the company name to confirm.
                  </p>
                  <input
                    type="text"
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder={activeCompany.name}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn-danger"
                      disabled={deleting || deleteInput !== activeCompany.name}
                      onClick={deleteCompany}
                    >
                      {deleting ? 'Deleting…' : 'Permanently delete'}
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => { setConfirmingDelete(false); setDeleteInput('') }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      <Drawer open={creating} onClose={closeCreate} title="Add company">
        <div className="drawer-form">
          <label className="field">
            <span>Name</span>
            <input type="text" value={createForm.name} onChange={(e) => onCreateNameChange(e.target.value)} autoFocus />
          </label>

          <label className="field">
            <span>Slug</span>
            <input
              type="text"
              className="mono"
              value={createForm.slug}
              onChange={(e) => { setSlugTouched(true); setCreateForm({ ...createForm, slug: slugify(e.target.value) }) }}
            />
          </label>

          <label className="field">
            <span>Plan</span>
            <select value={createForm.plan} onChange={(e) => setCreateForm({ ...createForm, plan: e.target.value })}>
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </label>

          <label className="field">
            <span>Status</span>
            <select value={createForm.status} onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}>
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <label className="field">
            <span>Timezone</span>
            <input type="text" value={createForm.timezone} onChange={(e) => setCreateForm({ ...createForm, timezone: e.target.value })} />
          </label>

          <button
            type="button"
            className="btn-primary"
            disabled={savingCreate || !createForm.name.trim() || !createForm.slug.trim()}
            onClick={createCompany}
            style={{ alignSelf: 'flex-start' }}
          >
            {savingCreate ? 'Creating…' : 'Create company'}
          </button>
        </div>
      </Drawer>
    </div>
  )
}
