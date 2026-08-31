import { useEffect, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, ComposedChart, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  DASHBOARD_METRICS, DASHBOARD_LEADERBOARDS, DASHBOARD_STACKED, DASHBOARD_CROSSTABS, DASHBOARD_FUNNELS,
  evaluateCalculatedMetric, resolveEffectiveRange, resolveComparisonRange, resolveEffectiveFilterValues,
} from '../lib/dashboardMetrics'
import { supabase } from '../lib/supabase'
import { SkeletonBlock } from './Skeleton'

const TEAL = '#1f7a63'
const TEAL_DEEP = '#123f33'
const GOLD = '#c98a2e'
const LINE = '#e2ddd0'
const PIE_COLORS = ['#123f33', '#1f7a63', '#c98a2e', '#7fa88f', '#4c7c5e', '#5c6b3f', '#b0473f', '#1c3a2e']

export const BREAKDOWN_CHART_TYPES = ['pie', 'donut', 'leaderboard']
export const DRILLABLE_CHART_TYPES = ['pie', 'donut', 'leaderboard']
const NUMBER_LIKE_TYPES = ['number', 'progress', 'gauge']
const SERIES_LIKE_TYPES = ['line', 'bar', 'area', 'table']

const FUNNEL_STAGE_LABELS = { applied: 'Applied', screening: 'Screening', interview: 'Interview', offer: 'Offer', hired: 'Hired' }

function fmtValue(value, unit) {
  const n = Number(value ?? 0)
  const rounded = Math.abs(n) >= 1000 ? Math.round(n).toLocaleString('en-PK') : (Math.round(n * 10) / 10).toLocaleString('en-PK')
  return unit === 'Rs' ? `Rs. ${rounded}` : unit ? `${rounded} ${unit}` : rounded
}

// Resolves this widget's own metric/chart-type registry entry -- handles
// the four different "kinds" of metric_key a widget can point at: a
// built-in DASHBOARD_METRICS number/series metric, a DASHBOARD_LEADERBOARDS
// breakdown, a calculated metric (`calc:<id>`), or one of the three new
// 2D/ordered registries (stacked/crosstab/funnel).
function lookupMetricDef(widget, calculatedMetrics) {
  if (widget.metric_key?.startsWith('calc:')) {
    const cm = calculatedMetrics.find((c) => `calc:${c.id}` === widget.metric_key)
    return cm ? { label: cm.name, unit: '', trend: true } : null
  }
  if (widget.chart_type === 'stacked') return DASHBOARD_STACKED[widget.metric_key]
  if (widget.chart_type === 'heatmap' || widget.chart_type === 'pivot') return DASHBOARD_CROSSTABS[widget.metric_key]
  if (widget.chart_type === 'funnel') return DASHBOARD_FUNNELS[widget.metric_key]
  if (BREAKDOWN_CHART_TYPES.includes(widget.chart_type)) return DASHBOARD_LEADERBOARDS[widget.metric_key]
  return DASHBOARD_METRICS[widget.metric_key]
}

// A widget with no filter override reuses the dashboard's own already-
// resolved employeeIds (passed in as dashboardFilters._resolved) rather
// than re-querying; one WITH an override resolves its own effective
// dimension values independently. Shared by the chart itself and the
// drill-down drawer, which needs the exact same effective filters.
export async function resolveWidgetFilters(widget, dashboardFilters, company) {
  const hasOverride = Object.keys(widget.filters || {}).length > 0
  if (!hasOverride) return dashboardFilters._resolved
  const { departmentId, teamId, branchId, employeeId } = resolveEffectiveFilterValues(widget, dashboardFilters)
  if (!departmentId && !teamId && !branchId && !employeeId) {
    return { departmentId: null, teamId: null, branchId: null, employeeId: null, employeeIds: null }
  }
  let query = supabase.from('employees').select('id').eq('company_id', company.id)
  if (departmentId) query = query.eq('department_id', departmentId)
  if (teamId) query = query.eq('team_id', teamId)
  if (branchId) query = query.eq('branch_id', branchId)
  if (employeeId) query = query.eq('id', employeeId)
  const { data } = await query
  return {
    departmentId: departmentId || null, teamId: teamId || null, branchId: branchId || null, employeeId: employeeId || null,
    employeeIds: (data ?? []).map((r) => r.id),
  }
}

async function fetchMetricValue(key, from, to, company, filters, calculatedMetrics) {
  if (key?.startsWith('calc:')) {
    const cm = calculatedMetrics.find((c) => `calc:${c.id}` === key)
    if (!cm) throw new Error('Calculated metric not found')
    return evaluateCalculatedMetric(cm.formula, from, to, company, filters)
  }
  const def = DASHBOARD_METRICS[key]
  if (!def) throw new Error('Unknown metric')
  return def.fetch(from, to, company, filters)
}

export function DashboardWidgetChart({ widget, company, dashboardFilters, dashboardRange, calculatedMetrics, onDrill }) {
  const [state, setState] = useState({ loading: true, data: null })

  const effectiveRange = resolveEffectiveRange(widget, dashboardRange)

  useEffect(() => {
    let active = true
    setState({ loading: true, data: null })

    async function load() {
      const filters = await resolveWidgetFilters(widget, dashboardFilters, company)
      const { from, to } = effectiveRange

      if (BREAKDOWN_CHART_TYPES.includes(widget.chart_type)) {
        const def = DASHBOARD_LEADERBOARDS[widget.metric_key]
        if (!def) return
        const rows = await def.fetch(from, to, company, filters)
        if (active) setState({ loading: false, data: { rows } })
        return
      }
      if (widget.chart_type === 'stacked') {
        const def = DASHBOARD_STACKED[widget.metric_key]
        if (!def) return
        const series = await def.fetch(from, to, company, filters)
        if (active) setState({ loading: false, data: { stackedSeries: series, stackedKeys: def.seriesKeys } })
        return
      }
      if (widget.chart_type === 'heatmap' || widget.chart_type === 'pivot') {
        const def = DASHBOARD_CROSSTABS[widget.metric_key]
        if (!def) return
        const crosstab = await def.fetch(from, to, company, filters)
        if (active) setState({ loading: false, data: { crosstab } })
        return
      }
      if (widget.chart_type === 'funnel') {
        const def = DASHBOARD_FUNNELS[widget.metric_key]
        if (!def) return
        const stages = await def.fetch(from, to, company, filters)
        if (active) setState({ loading: false, data: { funnelStages: stages } })
        return
      }

      const current = await fetchMetricValue(widget.metric_key, from, to, company, filters, calculatedMetrics)
      let priorValue = null
      if (NUMBER_LIKE_TYPES.includes(widget.chart_type)) {
        const comparisonRange = resolveComparisonRange(widget, effectiveRange)
        if (comparisonRange) {
          const prior = await fetchMetricValue(widget.metric_key, comparisonRange.from, comparisonRange.to, company, filters, calculatedMetrics)
          priorValue = prior.value
        }
      }
      let comboSeries = null
      if (widget.chart_type === 'combo' && widget.combo_metric_key) {
        const combo = await fetchMetricValue(widget.combo_metric_key, from, to, company, filters, calculatedMetrics)
        comboSeries = combo.series
      }
      if (active) setState({ loading: false, data: { value: current.value, series: current.series, priorValue, comboSeries } })
    }
    load()
    return () => { active = false }
  }, [widget.metric_key, widget.chart_type, widget.combo_metric_key, widget.date_mode, widget.date_preset, widget.date_from, widget.date_to, widget.comparison_mode, widget.comparison_from, widget.comparison_to, JSON.stringify(widget.filters), effectiveRange.from, effectiveRange.to, company.id, dashboardFilters._resolved])

  const metricDef = lookupMetricDef(widget, calculatedMetrics)
  if (!metricDef) return <p className="muted">Unknown metric.</p>
  if (state.loading) return <SkeletonBlock rows={3} />
  const { data } = state

  if (widget.chart_type === 'number') {
    const hasPrior = data.priorValue !== null && data.priorValue !== 0
    const delta = hasPrior ? ((data.value - data.priorValue) / Math.abs(data.priorValue)) * 100 : null
    const higherIsBetter = metricDef.higherIsBetter !== false
    const isGood = delta === null || delta === 0 ? null : (higherIsBetter ? delta > 0 : delta < 0)
    return (
      <div className="dashboard-widget-number-row">
        <div className="dashboard-widget-number">{fmtValue(data.value, metricDef.unit)}</div>
        {delta !== null && (
          <span className={`dashboard-widget-delta${isGood === null ? '' : isGood ? ' is-good' : ' is-bad'}`}>
            {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'} {Math.abs(Math.round(delta))}%
          </span>
        )}
      </div>
    )
  }

  if (widget.chart_type === 'progress' || widget.chart_type === 'gauge') {
    const target = Number(widget.target_value ?? 0)
    const pct = target > 0 ? Math.min(100, Math.max(0, (data.value / target) * 100)) : 0
    if (widget.chart_type === 'gauge') {
      return (
        <div className="dashboard-gauge">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart innerRadius="65%" outerRadius="100%" data={[{ value: pct }]} startAngle={180} endAngle={0}>
              <RadialBar dataKey="value" fill={TEAL} background={{ fill: LINE }} cornerRadius={8} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="dashboard-gauge-label">
            <div className="dashboard-widget-number" style={{ fontSize: 22, padding: 0 }}>{fmtValue(data.value, metricDef.unit)}</div>
            {target > 0 && <span className="muted" style={{ fontSize: 11.5 }}>of {fmtValue(target, metricDef.unit)} target</span>}
          </div>
        </div>
      )
    }
    return (
      <div className="dashboard-progress">
        <div className="dashboard-progress-track">
          <div className="dashboard-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="dashboard-progress-label">
          {fmtValue(data.value, metricDef.unit)}{target > 0 && <> / {fmtValue(target, metricDef.unit)} <span className="muted">({Math.round(pct)}%)</span></>}
        </div>
      </div>
    )
  }

  if (widget.chart_type === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.series} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke={LINE} vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={{ stroke: LINE }} tickLine={false} />
          <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} height={20} />
          <Line type="monotone" dataKey="value" name={metricDef.label} stroke={TEAL_DEEP} strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (widget.chart_type === 'area') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.series} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke={LINE} vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={{ stroke: LINE }} tickLine={false} />
          <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} height={20} />
          <Area type="monotone" dataKey="value" name={metricDef.label} stroke={TEAL_DEEP} fill={TEAL} fillOpacity={0.25} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  if (widget.chart_type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.series} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke={LINE} vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={{ stroke: LINE }} tickLine={false} />
          <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} height={20} />
          <Bar dataKey="value" name={metricDef.label} fill={TEAL} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (widget.chart_type === 'combo') {
    const byDate = new Map()
    for (const r of data.series) byDate.set(r.date, { date: r.date, value: r.value })
    for (const r of data.comboSeries ?? []) byDate.set(r.date, { ...(byDate.get(r.date) ?? { date: r.date }), comboValue: r.value })
    const merged = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
    const comboLabel = DASHBOARD_METRICS[widget.combo_metric_key]?.label ?? widget.combo_metric_key
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={merged} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke={LINE} vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={{ stroke: LINE }} tickLine={false} />
          <YAxis yAxisId="left" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} height={20} />
          <Bar yAxisId="left" dataKey="value" name={metricDef.label} fill={TEAL} radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" dataKey="comboValue" name={comboLabel} stroke={GOLD} strokeWidth={2} dot={{ r: 2 }} />
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  if (widget.chart_type === 'table') {
    if (data.series.length === 0) return <p className="muted">No data.</p>
    return (
      <div style={{ overflowY: 'auto', height: '100%' }}>
        <table className="data-table">
          <thead><tr><th>Date</th><th>Value</th></tr></thead>
          <tbody>{data.series.map((r) => <tr key={r.date}><td className="mono">{r.date}</td><td>{fmtValue(r.value, metricDef.unit)}</td></tr>)}</tbody>
        </table>
      </div>
    )
  }

  if (widget.chart_type === 'stacked') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.stackedSeries} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke={LINE} vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={{ stroke: LINE }} tickLine={false} />
          <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {data.stackedKeys.map((k, i) => <Bar key={k} dataKey={k} stackId="a" fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (widget.chart_type === 'heatmap' || widget.chart_type === 'pivot') {
    const { rows, columns, cells } = data.crosstab
    if (rows.length === 0) return <p className="muted">No data.</p>
    const max = Math.max(...cells.map((c) => c.value), 1)
    const cellValue = (row, col) => cells.find((c) => c.row === row && c.col === col)?.value ?? 0
    return (
      <div style={{ overflow: 'auto', height: '100%' }}>
        <table className="dashboard-crosstab">
          <thead><tr><th></th>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row}>
                <th>{row}</th>
                {columns.map((col) => {
                  const value = cellValue(row, col)
                  const intensity = widget.chart_type === 'heatmap' && value > 0 ? Math.min(1, value / max) : 0
                  return (
                    <td key={col} style={widget.chart_type === 'heatmap' ? { background: `rgba(31, 122, 99, ${intensity})` } : undefined}>
                      {value || ''}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (widget.chart_type === 'funnel') {
    const stages = data.funnelStages
    if (stages.length === 0 || stages[0].value === 0) return <p className="muted">No data.</p>
    const max = stages[0].value || 1
    return (
      <div className="dashboard-funnel">
        {stages.map((s, i) => {
          const pct = (s.value / max) * 100
          const conv = i > 0 && stages[i - 1].value > 0 ? Math.round((s.value / stages[i - 1].value) * 100) : null
          return (
            <div key={s.stage} className="dashboard-funnel-row">
              <span className="dashboard-funnel-label">{FUNNEL_STAGE_LABELS[s.stage] ?? s.stage}</span>
              <span className="dashboard-funnel-track"><span className="dashboard-funnel-fill" style={{ width: `${pct}%` }} /></span>
              <span className="dashboard-funnel-value">{s.value}{conv !== null && <span className="muted"> ({conv}%)</span>}</span>
            </div>
          )
        })}
      </div>
    )
  }

  if (widget.chart_type === 'pie' || widget.chart_type === 'donut') {
    if (data.rows.length === 0) return <p className="muted">No data.</p>
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data.rows} dataKey="value" nameKey="label" innerRadius={widget.chart_type === 'donut' ? 40 : 0} outerRadius={60}>
            {data.rows.map((r, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} cursor={onDrill ? 'pointer' : undefined} onClick={onDrill ? () => onDrill(r.label) : undefined} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} verticalAlign="bottom" height={28} />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  if (widget.chart_type === 'leaderboard') {
    if (data.rows.length === 0) return <p className="muted">No data.</p>
    const max = Math.max(...data.rows.map((r) => r.value), 1)
    return (
      <div className="dashboard-leaderboard">
        {data.rows.slice(0, 8).map((r, i) => (
          <button type="button" key={i} className="attendance-bar-row dashboard-leaderboard-row" onClick={onDrill ? () => onDrill(r.label) : undefined}>
            <span className="attendance-bar-label" style={{ width: 110 }}>{r.label}</span>
            <span className="attendance-bar-track">
              <span className="attendance-bar-fill" style={{ width: `${(r.value / max) * 100}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
            </span>
            <span className="attendance-bar-value">{Math.round(r.value * 10) / 10}</span>
          </button>
        ))}
      </div>
    )
  }

  return null
}
