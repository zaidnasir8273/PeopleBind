import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { PlusIcon } from '../components/ui/plus'
import { DeleteIcon } from '../components/ui/delete'
import { CalendarDaysIcon } from '../components/ui/calendar-days'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'
import { SkeletonBlock } from '../components/Skeleton'
import { DashboardPicker } from '../components/DashboardPicker'
import { DashboardWidgetForm } from '../components/DashboardWidgetForm'
import { DashboardCalculatedMetrics } from '../components/DashboardCalculatedMetrics'
import { DashboardWidgetChart, DRILLABLE_CHART_TYPES, resolveWidgetFilters } from '../components/DashboardWidgetChart'
import {
  DASHBOARD_METRICS, DASHBOARD_LEADERBOARDS, DASHBOARD_STACKED, DASHBOARD_CROSSTABS, DASHBOARD_FUNNELS,
  resolveEffectiveRange,
} from '../lib/dashboardMetrics'

const DEFAULT_WIDTH_PCT = 50
const DEFAULT_HEIGHT_PX = 220
const MIN_WIDTH_PCT = 15
const MAX_WIDTH_PCT = 100
const MIN_HEIGHT_PX = 120
const MAX_HEIGHT_PX = 600

function defaultRange() {
  const to = new Date().toISOString().slice(0, 10)
  const from = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)
  return { from, to }
}

function widgetLabel(widget, calculatedMetrics) {
  if (widget.title) return widget.title
  if (widget.metric_key?.startsWith('calc:')) return calculatedMetrics.find((c) => `calc:${c.id}` === widget.metric_key)?.name ?? widget.metric_key
  return DASHBOARD_METRICS[widget.metric_key]?.label
    ?? DASHBOARD_LEADERBOARDS[widget.metric_key]?.label
    ?? DASHBOARD_STACKED[widget.metric_key]?.label
    ?? DASHBOARD_CROSSTABS[widget.metric_key]?.label
    ?? DASHBOARD_FUNNELS[widget.metric_key]?.label
    ?? widget.metric_key
}

function WidgetCard({ widget, company, dashboardFilters, dashboardRange, calculatedMetrics, onEdit, onRemove, onDuplicate, onDrill, dragHandlers, onResizeStart }) {
  const isDrillable = DRILLABLE_CHART_TYPES.includes(widget.chart_type)
  const isOverridden = widget.date_mode !== 'inherit'
  const overrideRange = isOverridden ? resolveEffectiveRange(widget, dashboardRange) : null
  return (
    <div
      className="dashboard-widget"
      style={{ flexBasis: `calc(${widget.width_pct ?? DEFAULT_WIDTH_PCT}% - 12px)`, height: `${widget.height_px ?? DEFAULT_HEIGHT_PX}px` }}
      draggable
      onDragStart={() => dragHandlers.onDragStart(widget)}
      onDragOver={(e) => dragHandlers.onDragOver(e, widget)}
      onDrop={dragHandlers.onDrop}
    >
      <div className="dashboard-widget-head">
        <span className="dashboard-widget-title">
          {widgetLabel(widget, calculatedMetrics)}
          {isOverridden && overrideRange && <span className="dashboard-widget-range-tag" data-tooltip="This widget uses its own date range">📅 {overrideRange.from} → {overrideRange.to}</span>}
        </span>
        <div className="icon-actions" style={{ display: 'flex', gap: 2 }}>
          <button type="button" className="link-button" onClick={() => onDuplicate(widget)} aria-label="Duplicate widget" data-tooltip="Duplicate">
            <PlusIcon size={13} />
          </button>
          <button type="button" className="link-button" onClick={() => onEdit(widget)} aria-label="Edit widget" data-tooltip="Edit">✎</button>
          <button type="button" className="link-button" onClick={() => onRemove(widget.id)} aria-label="Remove widget" data-tooltip="Remove">
            <DeleteIcon size={13} />
          </button>
        </div>
      </div>
      <div className="dashboard-widget-body">
        <DashboardWidgetChart
          widget={widget}
          company={company}
          dashboardFilters={dashboardFilters}
          dashboardRange={dashboardRange}
          calculatedMetrics={calculatedMetrics}
          onDrill={isDrillable ? (label) => onDrill(widget, label) : null}
        />
      </div>
      <span
        className="dashboard-widget-resize-handle"
        draggable={false}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onResizeStart(e, widget) }}
        aria-label="Resize widget"
      />
    </div>
  )
}

function WidgetDrillDrawer({ widget, label, company, dashboardFilters, dashboardRange, onClose }) {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    let active = true
    setRows(null)
    async function load() {
      const def = DASHBOARD_LEADERBOARDS[widget.metric_key]
      if (!def?.drillFetch) { if (active) setRows([]); return }
      const { from, to } = resolveEffectiveRange(widget, dashboardRange)
      const filters = await resolveWidgetFilters(widget, dashboardFilters, company)
      const data = await def.drillFetch(label, from, to, company, filters)
      if (active) setRows(data)
    }
    load()
    return () => { active = false }
  }, [widget, label, company, dashboardFilters, dashboardRange])

  const metricDef = DASHBOARD_LEADERBOARDS[widget.metric_key]

  return (
    <Drawer open onClose={onClose} title={label}>
      <div className="drawer-form">
        <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>{metricDef?.label} — {label}</p>
        {rows === null ? (
          <SkeletonBlock rows={4} />
        ) : rows.length === 0 ? (
          <p className="muted">No records for this range.</p>
        ) : (
          <table className="data-table">
            <thead><tr>{rows[0].date && <th>Date</th>}<th>Value</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {r.date && <td className="mono">{r.date}</td>}
                  <td>{typeof r.value === 'number' ? Math.round(r.value * 100) / 100 : r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Drawer>
  )
}

export default function Dashboards() {
  const { company } = useAuth()
  const [dashboards, setDashboards] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [widgets, setWidgets] = useState([])
  const [calculatedMetrics, setCalculatedMetrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState(defaultRange())
  const [filters, setFilters] = useState({ departmentId: '', teamId: '', branchId: '', employeeId: '' })
  const [filterOptions, setFilterOptions] = useState({ departments: [], teams: [], branches: [], employees: [] })
  const [resolvedEmployeeIds, setResolvedEmployeeIds] = useState(null)
  const [widgetDrawer, setWidgetDrawer] = useState(null) // null | 'new' | widget object
  const [nameDrawer, setNameDrawer] = useState(null) // null | 'create' | 'rename'
  const [nameInput, setNameInput] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [drilling, setDrilling] = useState(null) // null | { widget, label }
  const [calcMetricsOpen, setCalcMetricsOpen] = useState(false)
  const dragRef = useRef(null)
  const gridRef = useRef(null)

  const loadDashboards = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('custom_dashboards').select('*').eq('company_id', company.id).order('sort_order')
    setDashboards(data ?? [])
    if (data && data.length && !data.find((d) => d.id === activeId)) {
      const def = data.find((d) => d.is_default) ?? data[0]
      setActiveId(def.id)
      setRange({ from: def.date_from ?? defaultRange().from, to: def.date_to ?? defaultRange().to })
      setFilters({
        departmentId: def.filter_department_id ?? '',
        teamId: def.filter_team_id ?? '',
        branchId: def.filter_branch_id ?? '',
        employeeId: def.filter_employee_id ?? '',
      })
    }
    setLoading(false)
  }, [activeId, company.id])

  useEffect(() => {
    loadDashboards()
  }, [loadDashboards])

  const loadCalculatedMetrics = useCallback(async () => {
    const { data } = await supabase.from('custom_metrics').select('*').eq('company_id', company.id).order('name')
    setCalculatedMetrics(data ?? [])
  }, [company.id])

  useEffect(() => {
    loadCalculatedMetrics()
  }, [loadCalculatedMetrics])

  // Filter picker options -- company-scoped, loaded once per company rather
  // than once per widget (every widget shares the same dashboard-wide
  // filters, so there's no reason to re-fetch these per widget).
  useEffect(() => {
    let active = true
    async function loadFilterOptions() {
      const [{ data: departments }, { data: teams }, { data: branches }, { data: employeesList }] = await Promise.all([
        supabase.from('departments').select('id, name').eq('company_id', company.id).order('name'),
        supabase.from('teams').select('id, name').eq('company_id', company.id).order('name'),
        supabase.from('branches').select('id, name').eq('company_id', company.id).order('name'),
        supabase.from('employees').select('id, full_name').eq('company_id', company.id).in('employment_status', ['training', 'probation', 'confirmed']).order('full_name'),
      ])
      if (active) setFilterOptions({ departments: departments ?? [], teams: teams ?? [], branches: branches ?? [], employees: employeesList ?? [] })
    }
    loadFilterOptions()
    return () => { active = false }
  }, [company.id])

  // Most metrics only have an employee_id column, not department/team/
  // branch directly -- resolve the picked filters into a concrete list of
  // matching employee ids once here, so every widget doesn't repeat the
  // same lookup.
  useEffect(() => {
    const { departmentId, teamId, branchId, employeeId } = filters
    if (!departmentId && !teamId && !branchId && !employeeId) {
      setResolvedEmployeeIds(null)
      return
    }
    let active = true
    async function resolve() {
      let query = supabase.from('employees').select('id').eq('company_id', company.id)
      if (departmentId) query = query.eq('department_id', departmentId)
      if (teamId) query = query.eq('team_id', teamId)
      if (branchId) query = query.eq('branch_id', branchId)
      if (employeeId) query = query.eq('id', employeeId)
      const { data } = await query
      if (active) setResolvedEmployeeIds((data ?? []).map((r) => r.id))
    }
    resolve()
    return () => { active = false }
  }, [filters.departmentId, filters.teamId, filters.branchId, filters.employeeId, company.id])

  const activeFilters = useMemo(() => ({
    departmentId: filters.departmentId || null,
    teamId: filters.teamId || null,
    branchId: filters.branchId || null,
    employeeId: filters.employeeId || null,
    employeeIds: resolvedEmployeeIds,
  }), [filters.departmentId, filters.teamId, filters.branchId, filters.employeeId, resolvedEmployeeIds])

  // Widgets resolve their own effective filters against this shape:
  // the dashboard's own raw picks (for a per-widget override to fall
  // back to a *different single dimension* than the dashboard) plus the
  // dashboard's already-resolved employeeIds (for the common no-override
  // case, so most widgets skip a redundant lookup).
  const dashboardFiltersForWidgets = useMemo(() => ({ ...filters, _resolved: activeFilters }), [filters, activeFilters])

  const loadWidgets = useCallback(async () => {
    if (!activeId) { setWidgets([]); return }
    const { data } = await supabase.from('custom_dashboard_widgets').select('*').eq('dashboard_id', activeId).eq('company_id', company.id).order('sort_order')
    setWidgets(data ?? [])
  }, [activeId, company.id])

  useEffect(() => {
    loadWidgets()
  }, [loadWidgets])

  useEffect(() => {
    setConfirmingDelete(false)
  }, [activeId])

  async function createDashboard(name) {
    if (!company || !name.trim()) return
    const def = defaultRange()
    const { data, error } = await supabase.from('custom_dashboards').insert({
      company_id: company.id, name: name.trim(), sort_order: dashboards.length, date_from: def.from, date_to: def.to,
    }).select().single()
    if (error) { toast.error(error.message || 'Failed to create dashboard'); return }
    toast.success('Dashboard created')
    setActiveId(data.id)
    setRange(def)
    setFilters({ departmentId: '', teamId: '', branchId: '', employeeId: '' })
    setNameDrawer(null)
    loadDashboards()
  }

  async function renameDashboard(name) {
    const cur = dashboards.find((d) => d.id === activeId)
    if (!cur || !name.trim()) return
    const { error } = await supabase.from('custom_dashboards').update({ name: name.trim() }).eq('id', cur.id)
    if (error) { toast.error(error.message); return }
    setNameDrawer(null)
    loadDashboards()
  }

  async function deleteDashboard() {
    const cur = dashboards.find((d) => d.id === activeId)
    if (!cur) return
    const { error } = await supabase.from('custom_dashboards').delete().eq('id', cur.id)
    if (error) { toast.error(error.message); return }
    toast.success('Dashboard deleted')
    setConfirmingDelete(false)
    setActiveId(null)
    loadDashboards()
  }

  async function setDefault() {
    const cur = dashboards.find((d) => d.id === activeId)
    if (!cur || !company) return
    await supabase.from('custom_dashboards').update({ is_default: false }).eq('company_id', company.id)
    await supabase.from('custom_dashboards').update({ is_default: true }).eq('id', cur.id)
    toast.success('Set as default dashboard')
    loadDashboards()
  }

  async function toggleFavorite(dashboard) {
    await supabase.from('custom_dashboards').update({ is_favorite: !dashboard.is_favorite }).eq('id', dashboard.id)
    loadDashboards()
  }

  async function setFolder(dashboard, folder) {
    await supabase.from('custom_dashboards').update({ folder }).eq('id', dashboard.id)
    loadDashboards()
  }

  async function duplicateDashboard(dashboard) {
    const { data: newDash, error } = await supabase.from('custom_dashboards').insert({
      company_id: company.id, name: `${dashboard.name} (copy)`, sort_order: dashboards.length,
      date_from: dashboard.date_from, date_to: dashboard.date_to,
      filter_department_id: dashboard.filter_department_id, filter_team_id: dashboard.filter_team_id,
      filter_branch_id: dashboard.filter_branch_id, filter_employee_id: dashboard.filter_employee_id,
    }).select().single()
    if (error) { toast.error(error.message || 'Failed to duplicate dashboard'); return }

    const { data: sourceWidgets } = await supabase.from('custom_dashboard_widgets').select('*').eq('dashboard_id', dashboard.id)
    if (sourceWidgets && sourceWidgets.length > 0) {
      const copies = sourceWidgets.map(({ id, dashboard_id, created_at, ...rest }) => ({ ...rest, dashboard_id: newDash.id }))
      await supabase.from('custom_dashboard_widgets').insert(copies)
    }
    toast.success('Dashboard duplicated')
    setActiveId(newDash.id)
    loadDashboards()
  }

  function selectDashboard(d) {
    setActiveId(d.id)
    setRange({ from: d.date_from ?? defaultRange().from, to: d.date_to ?? defaultRange().to })
    setFilters({
      departmentId: d.filter_department_id ?? '',
      teamId: d.filter_team_id ?? '',
      branchId: d.filter_branch_id ?? '',
      employeeId: d.filter_employee_id ?? '',
    })
  }

  async function saveRange() {
    if (!activeId) return
    await supabase.from('custom_dashboards').update({ date_from: range.from, date_to: range.to }).eq('id', activeId)
    loadWidgets()
  }

  function updateFilter(key, value) {
    const next = { ...filters, [key]: value }
    setFilters(next)
    saveFilters(next)
  }

  function clearFilters() {
    const next = { departmentId: '', teamId: '', branchId: '', employeeId: '' }
    setFilters(next)
    saveFilters(next)
  }

  async function saveFilters(next) {
    if (!activeId) return
    await supabase.from('custom_dashboards').update({
      filter_department_id: next.departmentId || null,
      filter_team_id: next.teamId || null,
      filter_branch_id: next.branchId || null,
      filter_employee_id: next.employeeId || null,
    }).eq('id', activeId)
  }

  async function removeWidget(id) {
    const { error } = await supabase.from('custom_dashboard_widgets').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    setWidgets((prev) => prev.filter((w) => w.id !== id))
  }

  async function duplicateWidget(widget) {
    const { id, dashboard_id, company_id, created_at, ...rest } = widget
    const { error } = await supabase.from('custom_dashboard_widgets').insert({
      dashboard_id, company_id,
      ...rest,
      title: widgetLabel(widget, calculatedMetrics) + ' (copy)',
      sort_order: widgets.length,
    })
    if (error) { toast.error(error.message || 'Failed to duplicate widget'); return }
    toast.success('Widget duplicated')
    loadWidgets()
  }

  function handleDragStart(widget) {
    dragRef.current = widget.id
  }

  function handleDragOver(e, target) {
    e.preventDefault()
    if (dragRef.current === target.id) return
    setWidgets((prev) => {
      const from = prev.findIndex((w) => w.id === dragRef.current)
      const to = prev.findIndex((w) => w.id === target.id)
      if (from === -1 || to === -1) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  async function handleDrop() {
    dragRef.current = null
    await Promise.all(widgets.map((w, i) => supabase.from('custom_dashboard_widgets').update({ sort_order: i }).eq('id', w.id)))
  }

  // Continuous corner-drag resize, ported from PetroBind's custom-dashboard
  // widgets: live local-state updates during the drag for immediate visual
  // feedback (no network round trip per frame), one Supabase write on
  // release.
  function handleResizeStart(e, widget) {
    const container = gridRef.current
    if (!container) return
    const containerWidth = container.getBoundingClientRect().width
    const startX = e.clientX
    const startY = e.clientY
    const startWidthPct = widget.width_pct ?? DEFAULT_WIDTH_PCT
    const startHeightPx = widget.height_px ?? DEFAULT_HEIGHT_PX
    let finalWidthPct = startWidthPct
    let finalHeightPx = startHeightPx

    function onMove(ev) {
      const deltaPct = ((ev.clientX - startX) / containerWidth) * 100
      finalWidthPct = Math.min(MAX_WIDTH_PCT, Math.max(MIN_WIDTH_PCT, Math.round(startWidthPct + deltaPct)))
      finalHeightPx = Math.min(MAX_HEIGHT_PX, Math.max(MIN_HEIGHT_PX, Math.round(startHeightPx + (ev.clientY - startY))))
      setWidgets((prev) => prev.map((w) => (w.id === widget.id ? { ...w, width_pct: finalWidthPct, height_px: finalHeightPx } : w)))
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      supabase.from('custom_dashboard_widgets').update({ width_pct: finalWidthPct, height_px: finalHeightPx }).eq('id', widget.id).then(({ error }) => {
        if (error) toast.error(error.message || 'Failed to save widget size')
      })
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const activeDashboard = dashboards.find((d) => d.id === activeId)
  const hasActiveFilters = !!(filters.departmentId || filters.teamId || filters.branchId || filters.employeeId)

  return (
    <div className="page-inner" style={{ maxWidth: 1180 }}>
      <div className="page-header-row">
        <div>
          <p className="page-eyebrow">COMPANY</p>
          <h1 className="page-title">Dashboards</h1>
        </div>
      </div>

      {loading ? (
        <SkeletonBlock rows={6} />
      ) : dashboards.length === 0 ? (
        <div className="empty-state">
          <p>No dashboards yet.</p>
          <button type="button" className="btn-primary" onClick={() => { setNameInput(''); setNameDrawer('create') }} style={{ marginTop: 12 }}>Create your first dashboard</button>
        </div>
      ) : (
        <>
          <div className="dashboard-toolbar">
            <DashboardPicker
              dashboards={dashboards}
              activeId={activeId}
              onSelect={selectDashboard}
              onCreate={() => { setNameInput(''); setNameDrawer('create') }}
              onToggleFavorite={toggleFavorite}
              onSetFolder={setFolder}
              onDuplicate={duplicateDashboard}
            />
            <button type="button" className="link-button" style={{ fontSize: 12 }} onClick={() => { setNameInput(activeDashboard?.name ?? ''); setNameDrawer('rename') }}>Rename</button>
            <button type="button" className="link-button" style={{ fontSize: 12 }} onClick={setDefault}>Set default</button>
            <button type="button" className="link-button" style={{ fontSize: 12 }} onClick={() => setCalcMetricsOpen(true)}>∑ Calculated metrics</button>
            {confirmingDelete ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span className="muted">Delete this dashboard?</span>
                <button type="button" className="link-button" style={{ fontSize: 12, color: 'var(--danger)' }} onClick={deleteDashboard}>Yes, delete</button>
                <button type="button" className="link-button" style={{ fontSize: 12 }} onClick={() => setConfirmingDelete(false)}>Cancel</button>
              </span>
            ) : (
              <button type="button" className="link-button" style={{ fontSize: 12, color: 'var(--danger)' }} onClick={() => setConfirmingDelete(true)}>Delete</button>
            )}
            <span style={{ flex: 1 }} />
            <select value={filters.departmentId} onChange={(e) => updateFilter('departmentId', e.target.value)} style={{ fontSize: 12 }}>
              <option value="">All departments</option>
              {filterOptions.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={filters.teamId} onChange={(e) => updateFilter('teamId', e.target.value)} style={{ fontSize: 12 }}>
              <option value="">All teams</option>
              {filterOptions.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select value={filters.branchId} onChange={(e) => updateFilter('branchId', e.target.value)} style={{ fontSize: 12 }}>
              <option value="">All branches</option>
              {filterOptions.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={filters.employeeId} onChange={(e) => updateFilter('employeeId', e.target.value)} style={{ fontSize: 12 }}>
              <option value="">All employees</option>
              {filterOptions.employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
            </select>
            {hasActiveFilters && <button type="button" className="link-button" style={{ fontSize: 12 }} onClick={clearFilters}>Clear filters</button>}
            <div className="date-range-field" style={{ fontSize: 12 }}>
              <CalendarDaysIcon size={13} />
              <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} onBlur={saveRange} />
              <span className="muted">to</span>
              <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} onBlur={saveRange} />
            </div>
            <button type="button" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setWidgetDrawer('new')}>
              <PlusIcon size={15} />
              Add widget
            </button>
          </div>

          {widgets.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 20 }}>
              <p>No widgets on this dashboard yet.</p>
              <p className="muted">Add one to see a real number, chart, or leaderboard here.</p>
            </div>
          ) : (
            <div className="dashboard-grid" ref={gridRef}>
              {widgets.map((w) => (
                <WidgetCard
                  key={w.id}
                  widget={w}
                  company={company}
                  dashboardFilters={dashboardFiltersForWidgets}
                  dashboardRange={range}
                  calculatedMetrics={calculatedMetrics}
                  onEdit={setWidgetDrawer}
                  onRemove={removeWidget}
                  onDuplicate={duplicateWidget}
                  onDrill={(widget, label) => setDrilling({ widget, label })}
                  dragHandlers={{ onDragStart: handleDragStart, onDragOver: handleDragOver, onDrop: handleDrop }}
                  onResizeStart={handleResizeStart}
                />
              ))}
            </div>
          )}
        </>
      )}

      <Drawer open={!!widgetDrawer} onClose={() => setWidgetDrawer(null)} title={widgetDrawer === 'new' ? 'Add widget' : 'Edit widget'}>
        {widgetDrawer && (
          <DashboardWidgetForm
            dashboardId={activeId}
            companyId={company?.id}
            editing={widgetDrawer === 'new' ? null : widgetDrawer}
            calculatedMetrics={calculatedMetrics}
            onDone={() => { setWidgetDrawer(null); loadWidgets() }}
          />
        )}
      </Drawer>

      <Drawer open={!!nameDrawer} onClose={() => setNameDrawer(null)} title={nameDrawer === 'create' ? 'New dashboard' : 'Rename dashboard'}>
        <div className="drawer-form">
          <label className="field">
            <span>Name</span>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && nameInput.trim()) (nameDrawer === 'create' ? createDashboard : renameDashboard)(nameInput) }}
              autoFocus
            />
          </label>
          <button
            type="button"
            className="btn-primary"
            disabled={!nameInput.trim()}
            onClick={() => (nameDrawer === 'create' ? createDashboard : renameDashboard)(nameInput)}
            style={{ alignSelf: 'flex-start' }}
          >
            {nameDrawer === 'create' ? 'Create dashboard' : 'Save name'}
          </button>
        </div>
      </Drawer>

      <DashboardCalculatedMetrics
        open={calcMetricsOpen}
        onClose={() => setCalcMetricsOpen(false)}
        metrics={calculatedMetrics}
        onChanged={loadCalculatedMetrics}
      />

      {drilling && (
        <WidgetDrillDrawer
          widget={drilling.widget}
          label={drilling.label}
          company={company}
          dashboardFilters={dashboardFiltersForWidgets}
          dashboardRange={range}
          onClose={() => setDrilling(null)}
        />
      )}
    </div>
  )
}
