import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ChevronDown } from 'lucide-react'
import { DeleteIcon } from '../components/ui/delete'
import { PlusIcon } from '../components/ui/plus'
import { SquarePenIcon } from '../components/ui/square-pen'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Drawer } from '../components/Drawer'
import { SkeletonBlock } from '../components/Skeleton'
import { DASHBOARD_METRICS, DASHBOARD_METRIC_KEYS, DASHBOARD_LEADERBOARDS, DASHBOARD_LEADERBOARD_KEYS } from '../lib/dashboardMetrics'

const TEAL = '#1f7a63'
const TEAL_DEEP = '#123f33'
const GOLD = '#c98a2e'
const LINE = '#e2ddd0'
const PIE_COLORS = ['#123f33', '#1f7a63', '#c98a2e', '#7fa88f', '#4c7c5e', '#5c6b3f', '#b0473f', '#1c3a2e']

const BREAKDOWN_CHART_TYPES = ['pie', 'donut', 'leaderboard']

function defaultRange() {
  const to = new Date().toISOString().slice(0, 10)
  const from = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)
  return { from, to }
}

function fmtValue(value, unit) {
  const n = Number(value ?? 0)
  const rounded = Math.abs(n) >= 1000 ? Math.round(n).toLocaleString('en-PK') : (Math.round(n * 10) / 10).toLocaleString('en-PK')
  return unit === 'Rs' ? `Rs. ${rounded}` : unit ? `${rounded} ${unit}` : rounded
}

function WidgetChart({ widget }) {
  const [state, setState] = useState({ loading: true, value: null, series: [], rows: [] })
  const isBreakdown = BREAKDOWN_CHART_TYPES.includes(widget.chart_type)

  useEffect(() => {
    let active = true
    setState({ loading: true, value: null, series: [], rows: [] })
    async function load() {
      if (isBreakdown) {
        const def = DASHBOARD_LEADERBOARDS[widget.metric_key]
        if (!def) return
        const rows = await def.fetch(widget._from, widget._to)
        if (active) setState({ loading: false, value: null, series: [], rows })
      } else {
        const def = DASHBOARD_METRICS[widget.metric_key]
        if (!def) return
        const { value, series } = await def.fetch(widget._from, widget._to)
        if (active) setState({ loading: false, value, series, rows: [] })
      }
    }
    load()
    return () => { active = false }
  }, [widget.metric_key, widget.chart_type, widget._from, widget._to, isBreakdown])

  const metricDef = isBreakdown ? DASHBOARD_LEADERBOARDS[widget.metric_key] : DASHBOARD_METRICS[widget.metric_key]
  if (!metricDef) return <p className="muted">Unknown metric.</p>
  if (state.loading) return <SkeletonBlock rows={3} />

  if (widget.chart_type === 'number') {
    return <div className="dashboard-widget-number">{fmtValue(state.value, metricDef.unit)}</div>
  }

  if (widget.chart_type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={state.series} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke={LINE} vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={{ stroke: LINE }} tickLine={false} />
          <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="value" stroke={TEAL_DEEP} strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (widget.chart_type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={state.series} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke={LINE} vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={{ stroke: LINE }} tickLine={false} />
          <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="value" fill={TEAL} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (widget.chart_type === 'pie' || widget.chart_type === 'donut') {
    if (state.rows.length === 0) return <p className="muted">No data.</p>
    return (
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={state.rows} dataKey="value" nameKey="label" innerRadius={widget.chart_type === 'donut' ? 40 : 0} outerRadius={70}>
            {state.rows.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  if (widget.chart_type === 'leaderboard') {
    if (state.rows.length === 0) return <p className="muted">No data.</p>
    const max = Math.max(...state.rows.map((r) => r.value), 1)
    return (
      <div className="dashboard-leaderboard">
        {state.rows.slice(0, 8).map((r, i) => (
          <div key={i} className="attendance-bar-row">
            <span className="attendance-bar-label" style={{ width: 110 }}>{r.label}</span>
            <span className="attendance-bar-track">
              <span className="attendance-bar-fill" style={{ width: `${(r.value / max) * 100}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
            </span>
            <span className="attendance-bar-value">{Math.round(r.value * 10) / 10}</span>
          </div>
        ))}
      </div>
    )
  }

  return null
}

function WidgetCard({ widget, onEdit, onRemove, dragHandlers }) {
  return (
    <div className={`dashboard-widget dashboard-widget-${widget.size}`} draggable onDragStart={() => dragHandlers.onDragStart(widget)} onDragOver={(e) => dragHandlers.onDragOver(e, widget)} onDrop={dragHandlers.onDrop}>
      <div className="dashboard-widget-head">
        <span className="dashboard-widget-title">{widget.title || DASHBOARD_METRICS[widget.metric_key]?.label || DASHBOARD_LEADERBOARDS[widget.metric_key]?.label || widget.metric_key}</span>
        <div className="icon-actions" style={{ display: 'flex', gap: 2 }}>
          <button type="button" className="link-button" onClick={() => onEdit(widget)} aria-label="Edit widget" data-tooltip="Edit">
            <SquarePenIcon size={13} />
          </button>
          <button type="button" className="link-button" onClick={() => onRemove(widget.id)} aria-label="Remove widget" data-tooltip="Remove">
            <DeleteIcon size={13} />
          </button>
        </div>
      </div>
      <WidgetChart widget={widget} />
    </div>
  )
}

const CHART_TYPE_OPTIONS = [
  { value: 'number', label: 'Number (KPI card)' },
  { value: 'line', label: 'Line chart' },
  { value: 'bar', label: 'Bar chart' },
  { value: 'pie', label: 'Pie chart' },
  { value: 'donut', label: 'Donut chart' },
  { value: 'leaderboard', label: 'Leaderboard' },
]

function WidgetForm({ dashboardId, companyId, editing, onDone }) {
  const isBreakdown = editing ? BREAKDOWN_CHART_TYPES.includes(editing.chart_type) : false
  const [chartType, setChartType] = useState(editing?.chart_type ?? 'number')
  const [metricKey, setMetricKey] = useState(editing?.metric_key ?? (BREAKDOWN_CHART_TYPES.includes(chartType) ? DASHBOARD_LEADERBOARD_KEYS[0] : DASHBOARD_METRIC_KEYS[0]))
  const [title, setTitle] = useState(editing?.title ?? '')
  const [size, setSize] = useState(editing?.size ?? 'medium')
  const [saving, setSaving] = useState(false)

  function handleChartTypeChange(v) {
    const wasBreakdown = BREAKDOWN_CHART_TYPES.includes(chartType)
    const nowBreakdown = BREAKDOWN_CHART_TYPES.includes(v)
    setChartType(v)
    if (wasBreakdown !== nowBreakdown) setMetricKey(nowBreakdown ? DASHBOARD_LEADERBOARD_KEYS[0] : DASHBOARD_METRIC_KEYS[0])
  }

  async function save() {
    setSaving(true)
    const patch = { metric_key: metricKey, chart_type: chartType, title: title.trim() || null, size }
    let error
    if (editing) {
      ({ error } = await supabase.from('custom_dashboard_widgets').update(patch).eq('id', editing.id))
    } else {
      ({ error } = await supabase.from('custom_dashboard_widgets').insert({ dashboard_id: dashboardId, company_id: companyId, ...patch }))
    }
    setSaving(false)
    if (error) {
      toast.error(error.message || 'Failed to save widget')
      return
    }
    toast.success(editing ? 'Widget updated' : 'Widget added')
    onDone()
  }

  const nowBreakdown = BREAKDOWN_CHART_TYPES.includes(chartType)
  const registry = nowBreakdown ? DASHBOARD_LEADERBOARDS : DASHBOARD_METRICS
  const keys = nowBreakdown ? DASHBOARD_LEADERBOARD_KEYS : DASHBOARD_METRIC_KEYS

  return (
    <div className="drawer-form">
      <label className="field">
        <span>Chart type</span>
        <select value={chartType} onChange={(e) => handleChartTypeChange(e.target.value)}>
          {CHART_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <label className="field">
        <span>{nowBreakdown ? 'Breakdown' : 'Metric'}</span>
        <select value={metricKey} onChange={(e) => setMetricKey(e.target.value)}>
          {keys.map((k) => <option key={k} value={k}>{registry[k].label}</option>)}
        </select>
      </label>
      <label className="field">
        <span>Title (optional)</span>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={registry[metricKey]?.label} />
      </label>
      <label className="field">
        <span>Size</span>
        <select value={size} onChange={(e) => setSize(e.target.value)}>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </label>
      <button type="button" className="btn-primary" disabled={saving} onClick={save} style={{ alignSelf: 'flex-start' }}>
        {saving ? 'Saving…' : editing ? 'Save changes' : 'Add widget'}
      </button>
    </div>
  )
}

export default function Dashboards() {
  const { company } = useAuth()
  const [dashboards, setDashboards] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [widgets, setWidgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState(defaultRange())
  const [picker, setPicker] = useState(false)
  const [widgetDrawer, setWidgetDrawer] = useState(null) // null | 'new' | widget object
  const [nameDrawer, setNameDrawer] = useState(null) // null | 'create' | 'rename'
  const [nameInput, setNameInput] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const dragRef = useRef(null)

  const loadDashboards = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('custom_dashboards').select('*').eq('company_id', company.id).order('sort_order')
    setDashboards(data ?? [])
    if (data && data.length && !data.find((d) => d.id === activeId)) {
      const def = data.find((d) => d.is_default) ?? data[0]
      setActiveId(def.id)
      setRange({ from: def.date_from ?? defaultRange().from, to: def.date_to ?? defaultRange().to })
    }
    setLoading(false)
  }, [activeId, company.id])

  useEffect(() => {
    loadDashboards()
  }, [loadDashboards])

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

  async function saveRange() {
    if (!activeId) return
    await supabase.from('custom_dashboards').update({ date_from: range.from, date_to: range.to }).eq('id', activeId)
    loadWidgets()
  }

  async function removeWidget(id) {
    const { error } = await supabase.from('custom_dashboard_widgets').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    setWidgets((prev) => prev.filter((w) => w.id !== id))
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

  const activeDashboard = dashboards.find((d) => d.id === activeId)
  const widgetsWithRange = widgets.map((w) => ({ ...w, _from: range.from, _to: range.to }))

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
            <div className="dashboard-tabs-wrap">
              <button type="button" className="cmdk-trigger" onClick={() => setPicker((v) => !v)} style={{ width: 'auto' }}>
                {activeDashboard?.is_default ? '★ ' : ''}{activeDashboard?.name ?? 'Select dashboard'}
                <ChevronDown size={14} />
              </button>
              {picker && (
                <div className="dashboard-picker-panel">
                  {dashboards.map((d) => (
                    <button key={d.id} type="button" className="account-menu-item" onClick={() => { setActiveId(d.id); setRange({ from: d.date_from ?? defaultRange().from, to: d.date_to ?? defaultRange().to }); setPicker(false) }}>
                      {d.is_default ? '★ ' : ''}{d.name}
                    </button>
                  ))}
                  <button type="button" className="account-menu-item" onClick={() => { setPicker(false); setNameInput(''); setNameDrawer('create') }}>
                    <PlusIcon size={14} /> New dashboard
                  </button>
                </div>
              )}
            </div>
            <button type="button" className="link-button" style={{ fontSize: 12 }} onClick={() => { setNameInput(activeDashboard?.name ?? ''); setNameDrawer('rename') }}>Rename</button>
            <button type="button" className="link-button" style={{ fontSize: 12 }} onClick={setDefault}>Set default</button>
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
            <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} onBlur={saveRange} style={{ fontSize: 12 }} />
            <span className="muted" style={{ fontSize: 12 }}>to</span>
            <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} onBlur={saveRange} style={{ fontSize: 12 }} />
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
            <div className="dashboard-grid">
              {widgetsWithRange.map((w) => (
                <WidgetCard
                  key={w.id}
                  widget={w}
                  onEdit={setWidgetDrawer}
                  onRemove={removeWidget}
                  dragHandlers={{ onDragStart: handleDragStart, onDragOver: handleDragOver, onDrop: handleDrop }}
                />
              ))}
            </div>
          )}
        </>
      )}

      <Drawer open={!!widgetDrawer} onClose={() => setWidgetDrawer(null)} title={widgetDrawer === 'new' ? 'Add widget' : 'Edit widget'}>
        {widgetDrawer && (
          <WidgetForm
            dashboardId={activeId}
            companyId={company?.id}
            editing={widgetDrawer === 'new' ? null : widgetDrawer}
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
    </div>
  )
}
