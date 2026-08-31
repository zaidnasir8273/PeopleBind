import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import {
  DASHBOARD_METRICS, DASHBOARD_METRIC_KEYS, DASHBOARD_LEADERBOARDS, DASHBOARD_LEADERBOARD_KEYS,
  DASHBOARD_STACKED, DASHBOARD_STACKED_KEYS, DASHBOARD_CROSSTABS, DASHBOARD_CROSSTAB_KEYS,
  DASHBOARD_FUNNELS, DASHBOARD_FUNNEL_KEYS, DATE_PRESET_OPTIONS,
} from '../lib/dashboardMetrics'
import { BREAKDOWN_CHART_TYPES } from './DashboardWidgetChart'

const DEFAULT_WIDTH_PCT = 50
const DEFAULT_HEIGHT_PX = 220

export const CHART_TYPE_OPTIONS = [
  { value: 'number', label: 'Number (KPI card)' },
  { value: 'progress', label: 'Progress bar' },
  { value: 'gauge', label: 'Gauge' },
  { value: 'line', label: 'Line chart' },
  { value: 'area', label: 'Area chart' },
  { value: 'bar', label: 'Bar chart' },
  { value: 'combo', label: 'Combo (bar + line)' },
  { value: 'table', label: 'Table' },
  { value: 'pie', label: 'Pie chart' },
  { value: 'donut', label: 'Donut chart' },
  { value: 'leaderboard', label: 'Leaderboard' },
  { value: 'stacked', label: 'Stacked bar' },
  { value: 'heatmap', label: 'Heatmap' },
  { value: 'pivot', label: 'Pivot table' },
  { value: 'funnel', label: 'Funnel' },
]

const NUMBER_LIKE_TYPES = ['number', 'progress', 'gauge']
const TARGET_TYPES = ['progress', 'gauge']
const CALC_ELIGIBLE_TYPES = ['number', 'line', 'bar', 'area', 'combo', 'progress', 'gauge', 'table']

function metricOptionsForChartType(chartType) {
  if (chartType === 'stacked') return { keys: DASHBOARD_STACKED_KEYS, registry: DASHBOARD_STACKED, allowCalc: false }
  if (chartType === 'heatmap' || chartType === 'pivot') return { keys: DASHBOARD_CROSSTAB_KEYS, registry: DASHBOARD_CROSSTABS, allowCalc: false }
  if (chartType === 'funnel') return { keys: DASHBOARD_FUNNEL_KEYS, registry: DASHBOARD_FUNNELS, allowCalc: false }
  if (BREAKDOWN_CHART_TYPES.includes(chartType)) return { keys: DASHBOARD_LEADERBOARD_KEYS, registry: DASHBOARD_LEADERBOARDS, allowCalc: false }
  return { keys: DASHBOARD_METRIC_KEYS, registry: DASHBOARD_METRICS, allowCalc: CALC_ELIGIBLE_TYPES.includes(chartType) }
}

export function DashboardWidgetForm({ dashboardId, companyId, editing, calculatedMetrics, onDone }) {
  const [chartType, setChartType] = useState(editing?.chart_type ?? 'number')
  const initialOpts = metricOptionsForChartType(chartType)
  const [metricKey, setMetricKey] = useState(editing?.metric_key ?? initialOpts.keys[0])
  const [comboMetricKey, setComboMetricKey] = useState(editing?.combo_metric_key ?? DASHBOARD_METRIC_KEYS[0])
  const [targetValue, setTargetValue] = useState(editing?.target_value ?? '')
  const [title, setTitle] = useState(editing?.title ?? '')
  const [dateMode, setDateMode] = useState(editing?.date_mode ?? 'inherit')
  const [datePreset, setDatePreset] = useState(editing?.date_preset ?? DATE_PRESET_OPTIONS[0].value)
  const [dateFrom, setDateFrom] = useState(editing?.date_from ?? '')
  const [dateTo, setDateTo] = useState(editing?.date_to ?? '')
  const [comparisonMode, setComparisonMode] = useState(editing?.comparison_mode ?? 'inherit')
  const [comparisonFrom, setComparisonFrom] = useState(editing?.comparison_from ?? '')
  const [comparisonTo, setComparisonTo] = useState(editing?.comparison_to ?? '')
  const [filterOverrides, setFilterOverrides] = useState(editing?.filters ?? {})
  const [filterOptions, setFilterOptions] = useState({ departments: [], teams: [], branches: [], employees: [] })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      const [{ data: departments }, { data: teams }, { data: branches }, { data: employeesList }] = await Promise.all([
        supabase.from('departments').select('id, name').eq('company_id', companyId).order('name'),
        supabase.from('teams').select('id, name').eq('company_id', companyId).order('name'),
        supabase.from('branches').select('id, name').eq('company_id', companyId).order('name'),
        supabase.from('employees').select('id, full_name').eq('company_id', companyId).order('full_name'),
      ])
      if (active) setFilterOptions({ departments: departments ?? [], teams: teams ?? [], branches: branches ?? [], employees: employeesList ?? [] })
    }
    load()
    return () => { active = false }
  }, [companyId])

  function handleChartTypeChange(v) {
    const nextOpts = metricOptionsForChartType(v)
    setChartType(v)
    if (!nextOpts.keys.includes(metricKey) && !(nextOpts.allowCalc && metricKey?.startsWith('calc:'))) {
      setMetricKey(nextOpts.keys[0])
    }
  }

  function setFilterOverride(dim, value) {
    setFilterOverrides((prev) => {
      const next = { ...prev }
      if (value === '') delete next[dim]
      else next[dim] = value
      return next
    })
  }

  async function save() {
    setSaving(true)
    const patch = {
      metric_key: metricKey,
      chart_type: chartType,
      title: title.trim() || null,
      combo_metric_key: chartType === 'combo' ? comboMetricKey : null,
      target_value: TARGET_TYPES.includes(chartType) && targetValue !== '' ? Number(targetValue) : null,
      date_mode: dateMode,
      date_preset: dateMode === 'preset' ? datePreset : null,
      date_from: dateMode === 'custom' ? dateFrom || null : null,
      date_to: dateMode === 'custom' ? dateTo || null : null,
      comparison_mode: NUMBER_LIKE_TYPES.includes(chartType) ? comparisonMode : 'inherit',
      comparison_from: comparisonMode === 'custom' ? comparisonFrom || null : null,
      comparison_to: comparisonMode === 'custom' ? comparisonTo || null : null,
      filters: filterOverrides,
    }
    let error
    if (editing) {
      ({ error } = await supabase.from('custom_dashboard_widgets').update(patch).eq('id', editing.id))
    } else {
      ({ error } = await supabase.from('custom_dashboard_widgets').insert({
        dashboard_id: dashboardId, company_id: companyId, ...patch,
        width_pct: DEFAULT_WIDTH_PCT, height_px: DEFAULT_HEIGHT_PX,
      }))
    }
    setSaving(false)
    if (error) {
      toast.error(error.message || 'Failed to save widget')
      return
    }
    toast.success(editing ? 'Widget updated' : 'Widget added — drag its bottom-right corner to resize.')
    onDone()
  }

  const opts = metricOptionsForChartType(chartType)
  const metricLabel = BREAKDOWN_CHART_TYPES.includes(chartType) ? 'Breakdown'
    : ['stacked', 'heatmap', 'pivot', 'funnel'].includes(chartType) ? 'Data source' : 'Metric'
  const isCalcSelected = metricKey?.startsWith('calc:')

  return (
    <div className="drawer-form">
      <label className="field">
        <span>Chart type</span>
        <select value={chartType} onChange={(e) => handleChartTypeChange(e.target.value)}>
          {CHART_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>

      <label className="field">
        <span>{metricLabel}</span>
        <select value={metricKey} onChange={(e) => setMetricKey(e.target.value)}>
          {opts.keys.map((k) => <option key={k} value={k}>{opts.registry[k].label}</option>)}
          {opts.allowCalc && calculatedMetrics.length > 0 && (
            <optgroup label="Calculated metrics">
              {calculatedMetrics.map((cm) => <option key={cm.id} value={`calc:${cm.id}`}>∑ {cm.name}</option>)}
            </optgroup>
          )}
        </select>
      </label>

      {chartType === 'combo' && (
        <label className="field">
          <span>Second metric (line)</span>
          <select value={comboMetricKey} onChange={(e) => setComboMetricKey(e.target.value)}>
            {DASHBOARD_METRIC_KEYS.map((k) => <option key={k} value={k}>{DASHBOARD_METRICS[k].label}</option>)}
          </select>
        </label>
      )}

      {TARGET_TYPES.includes(chartType) && (
        <label className="field">
          <span>Target value</span>
          <input type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="e.g. 100" />
        </label>
      )}

      <label className="field">
        <span>Title (optional)</span>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isCalcSelected ? calculatedMetrics.find((c) => `calc:${c.id}` === metricKey)?.name : opts.registry[metricKey]?.label} />
      </label>

      <div className="field">
        <span>Date range</span>
        <select value={dateMode} onChange={(e) => setDateMode(e.target.value)}>
          <option value="inherit">Inherit dashboard's range</option>
          <option value="preset">Rolling preset</option>
          <option value="custom">Custom range</option>
        </select>
      </div>
      {dateMode === 'preset' && (
        <select value={datePreset} onChange={(e) => setDatePreset(e.target.value)}>
          {DATE_PRESET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
      {dateMode === 'custom' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      )}

      {NUMBER_LIKE_TYPES.includes(chartType) && (
        <>
          <div className="field">
            <span>Compare to</span>
            <select value={comparisonMode} onChange={(e) => setComparisonMode(e.target.value)}>
              <option value="inherit">Previous period (default)</option>
              <option value="none">No comparison</option>
              <option value="previous_period">Previous period</option>
              <option value="yoy">Same period last year</option>
              <option value="custom">Custom range</option>
            </select>
          </div>
          {comparisonMode === 'custom' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="date" value={comparisonFrom} onChange={(e) => setComparisonFrom(e.target.value)} />
              <input type="date" value={comparisonTo} onChange={(e) => setComparisonTo(e.target.value)} />
            </div>
          )}
        </>
      )}

      <p className="muted" style={{ fontSize: 12, margin: '4px 0 0' }}>Filters — override the dashboard's</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select value={filterOverrides.departmentId ?? ''} onChange={(e) => setFilterOverride('departmentId', e.target.value)} style={{ fontSize: 12 }}>
          <option value="">Inherit department filter</option>
          {filterOptions.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={filterOverrides.teamId ?? ''} onChange={(e) => setFilterOverride('teamId', e.target.value)} style={{ fontSize: 12 }}>
          <option value="">Inherit team filter</option>
          {filterOptions.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={filterOverrides.branchId ?? ''} onChange={(e) => setFilterOverride('branchId', e.target.value)} style={{ fontSize: 12 }}>
          <option value="">Inherit branch filter</option>
          {filterOptions.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={filterOverrides.employeeId ?? ''} onChange={(e) => setFilterOverride('employeeId', e.target.value)} style={{ fontSize: 12 }}>
          <option value="">Inherit employee filter</option>
          {filterOptions.employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
        </select>
      </div>

      <button type="button" className="btn-primary" disabled={saving} onClick={save} style={{ alignSelf: 'flex-start' }}>
        {saving ? 'Saving…' : editing ? 'Save changes' : 'Add widget'}
      </button>
    </div>
  )
}
