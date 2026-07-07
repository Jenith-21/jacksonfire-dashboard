import { useState, useCallback, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Line,
  CartesianGrid,
  LabelList,
} from 'recharts'
import ChartTooltip from './ChartTooltip'
import DrillDownModal from './DrillDownModal'
import {
  buildQuoteDrillDown,
  buildLeadDrillDown,
  filterQuotes,
  filterLeads,
} from '../utils/drillDown'
import { formatCurrency, formatDate } from '../utils/format'
import {
  formatCompactCurrencyLabel,
  createStackSegmentLabel,
  createBarTopLabel,
  createBarEndLabel,
} from '../utils/chartLabels.jsx'
import { getChartClickPayload } from '../utils/chartEvents'
import { nextSortState, sortRows, sortRowsPinnedBottom } from '../utils/tableSort'
import SortableTh from './SortableTh'

export { formatCurrency, formatDate }

const LINE_LABEL_STYLE = { fill: '#1f2937', fontSize: 10, fontWeight: 700 }
const STACK_SEGMENT_LABEL = createStackSegmentLabel(26)
const BAR_TOP_LABEL = createBarTopLabel()
const BAR_END_LABEL = createBarEndLabel(36)

const CHART = {
  primary: '#C8102E',
  secondary: '#373737',
  tertiary: '#4A6FA5',
  accent: '#2D9D78',
  line: '#373737',
}

/** Brand anchors first (red + grey), then complementary series colours */
const CHART_PALETTE = [
  '#C8102E',
  '#373737',
  '#4A6FA5',
  '#2D9D78',
  '#D97706',
  '#8B9DC3',
  '#E85D6F',
  '#0D9488',
  '#B45309',
  '#64748B',
  '#7C3AED',
  '#F4B4BC',
]

function buildQuoteStatusStackData(breakdown) {
  if (!breakdown?.length) return { data: [], statuses: [] }

  const statusTotals = {}
  for (const row of breakdown) {
    statusTotals[row.status] = (statusTotals[row.status] || 0) + row.quoteCount
  }
  const statuses = Object.entries(statusTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([status]) => status)

  const data = ['Sales Quote', 'Defect Quote'].map((quoteType) => {
    const entry = { quoteType }
    for (const status of statuses) {
      const match = breakdown.find((r) => r.quoteType === quoteType && r.status === status)
      entry[status] = match?.quoteCount ?? 0
    }
    return entry
  })

  return { data, statuses }
}

function lookupStatusRow(breakdown, quoteType, status) {
  return breakdown.find((r) => r.quoteType === quoteType && r.status === status)
}

const STAT_ICONS = {
  primary: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  blue: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" stroke="currentColor" strokeWidth="1.75" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),
  green: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="m22 4-10 10.01-3-3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  teal: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),
  amber: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),
  slate: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 3v18h18M7 16l4-4 4 4 5-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

export function StatCard({ label, value, sub, accent = 'slate', featured, onClick }) {
  return (
    <div
      className={`stat-card stat-tint-${accent} ${featured ? 'stat-card--featured' : ''} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="stat-card-accent" aria-hidden="true" />
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
        <span className="stat-icon">{STAT_ICONS[accent] ?? STAT_ICONS.slate}</span>
      </div>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  )
}

function SectionHeading({ title, subtitle }) {
  return (
    <div className="section-heading-row">
      <div>
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className="section-subtitle">{subtitle}</p>}
      </div>
    </div>
  )
}

function Widget({ title, subtitle, children, className = '', span }) {
  return (
    <article className={`widget ${span ? `widget--${span}` : ''} ${className}`.trim()}>
      {(title || subtitle) && (
        <header className="widget-header">
          {title && <h3 className="widget-title">{title}</h3>}
          {subtitle && <p className="widget-subtitle">{subtitle}</p>}
        </header>
      )}
      <div className="widget-body">{children}</div>
    </article>
  )
}

function Section({ title, subtitle, children, className = '' }) {
  return (
    <section className={`dashboard-section ${className}`}>
      <SectionHeading title={title} subtitle={subtitle} />
      {children}
    </section>
  )
}

export function MetricDefinitionsPanel() {
  return (
    <div className="metric-definitions-wrap">
      <details className="metric-definitions">
        <summary className="metric-definitions-summary">How metrics are calculated</summary>
        <div className="metric-definitions-grid">
        <div className="metric-def-item">
          <h4>Won quotes</h4>
          <p>Counts quotes with status: APPROVED, COMPLETED, FINALISED or ACTIONED.</p>
        </div>
        <div className="metric-def-item">
          <h4>Conversion time</h4>
          <p>
            Days from quote created to converted. Start: <code>quote_created_date</code>, then{' '}
            <code>created</code>, then <code>date</code>. End: <code>status_changed_approved</code>, then{' '}
            <code>status_changed_submitted</code>, then <code>last_actioned</code>.
          </p>
        </div>
        <div className="metric-def-item">
          <h4>Efficiency</h4>
          <p>Won value ÷ quotes created (salesperson league table).</p>
        </div>
        <div className="metric-def-item">
          <h4>Customer touchpoints</h4>
          <p>
            <code>viewed_via_email_at</code> — email view · <code>viewed_via_link_at</code> — link view ·{' '}
            <code>viewed_via_customer_portal_at</code> — portal view
          </p>
        </div>
        </div>
      </details>
    </div>
  )
}

export function DataInsightsPanel({ summary }) {
  const insights = [
    {
      title: 'Branch Assignment Gap',
      headline: `${summary.unassignedValueRate ?? 0}% of quote value is unassigned to any branch`,
      impact:
        'Impact: Prevents proper lead ownership, follow-up accountability, and branch-level performance tracking',
      recommendation:
        'Recommendation: Make branch assignment mandatory at quote creation stage',
      tone: 'warn',
    },
    {
      title: 'High Expiry Rate',
      headline: `${summary.expiredQuoteRate ?? 0}% of quotes are expiring before conversion`,
      impact: 'Root cause: Lack of timely follow-up/reminders',
      recommendation:
        'Recommendation: Implement automated alerts before expiry (e.g., at 7 and 3 days prior) to prompt sales action',
      tone: 'warn',
    },
    {
      title: 'Conversion Timeline',
      headline:
        summary.avgConversionDays != null
          ? `Average conversion time is ${summary.avgConversionDays} days`
          : 'Average conversion time is not available',
      impact: null,
      recommendation:
        'Recommendation: Trigger follow-up alerts every 7 days to keep leads active and reduce drop-off/expiry risk',
      tone: 'info',
    },
  ]

  return (
    <Widget title="Data insights" className="widget--insights">
      <div className="gaps-grid">
        {insights.map((insight) => (
          <div key={insight.title} className={`gap-card gap-${insight.tone}`}>
            <h3>{insight.title}</h3>
            <p className="insight-headline">{insight.headline}</p>
            {insight.impact && <p className="insight-impact">{insight.impact}</p>}
            <p className="insight-recommendation">{insight.recommendation}</p>
          </div>
        ))}
      </div>
    </Widget>
  )
}

export function AnalysisTable({
  title,
  subtitle,
  columns,
  rows,
  onRowClick,
  defaultSort,
}) {
  const [sort, setSort] = useState(defaultSort ?? null)

  const sortedRows = useMemo(
    () => (sort ? sortRows(rows, sort.key, sort.direction, columns) : rows),
    [rows, sort, columns],
  )

  const handleSort = (key) => setSort((current) => nextSortState(current, key))

  const getRowKey = (row, index) => {
    if (row.id) return row.id
    if (row.quoteType && row.status) return `${row.quoteType}-${row.status}`
    if (row.month && row.quoteType) return `${row.month}-${row.quoteType}`
    return `row-${index}`
  }

  return (
    <Widget title={title} subtitle={subtitle} className="widget--table">
      <div className="table-surface">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <SortableTh
                  key={col.key}
                  column={col}
                  sort={sort}
                  onSort={handleSort}
                  className={col.className || ''}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="empty">
                  No data
                </td>
              </tr>
            ) : (
              sortedRows.map((row, i) => (
                <tr
                  key={getRowKey(row, i)}
                  className={onRowClick ? 'clickable-row' : ''}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={col.className || ''}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Widget>
  )
}

export function LeagueTable({
  title,
  subtitle,
  columns,
  rows,
  highlightCol,
  onRowClick,
  defaultSort,
  unrankedNames = [],
  nameKey,
}) {
  const [sort, setSort] = useState(defaultSort ?? null)
  const rowNameKey = nameKey ?? columns[0]?.key ?? 'name'
  const pinnedNames = unrankedNames

  const sortedRows = useMemo(() => {
    if (pinnedNames.length > 0) {
      return sortRowsPinnedBottom(rows, sort?.key, sort?.direction, columns, pinnedNames, rowNameKey)
    }
    return sort ? sortRows(rows, sort.key, sort.direction, columns) : rows
  }, [rows, sort, columns, pinnedNames, rowNameKey])

  const handleSort = (key) => setSort((current) => nextSortState(current, key))
  const pinnedSet = useMemo(() => new Set(pinnedNames), [pinnedNames])

  let rankCounter = 0

  return (
    <Widget title={title} subtitle={subtitle} className="widget--table widget--league">
      <div className="table-surface league-table-surface">
        <table className="league-table data-table">
          <thead>
            <tr>
              <th className="rank-col sticky-col sticky-col--left" scope="col">
                #
              </th>
              {columns.map((col) => (
                <SortableTh
                  key={col.key}
                  column={col}
                  sort={sort}
                  onSort={handleSort}
                  className={[
                    col.className || '',
                    col.key === columns[0]?.key ? 'name-col sticky-col sticky-col--name' : '',
                    col.key === highlightCol ? 'highlight-col sticky-col sticky-col--right' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="empty">
                  No data
                </td>
              </tr>
            ) : (
              sortedRows.map((row, i) => {
                const rowLabel = row[rowNameKey]
                const isUnranked = pinnedSet.has(rowLabel)
                if (!isUnranked) rankCounter += 1
                const rank = isUnranked ? null : rankCounter

                return (
                  <tr
                    key={row.name || row.branch || row.client || i}
                    className={[
                      !isUnranked && rank <= 3 ? `rank-${rank}` : '',
                      isUnranked ? 'rank-unranked' : '',
                      onRowClick ? 'clickable-row' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    <td className="rank-col sticky-col sticky-col--left">{isUnranked ? '—' : rank}</td>
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={[
                          col.className || '',
                          col.key === columns[0]?.key ? 'name-col sticky-col sticky-col--name' : '',
                          col.key === highlightCol ? 'highlight-col sticky-col sticky-col--right' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        title={col.key === columns[0]?.key ? rowLabel : undefined}
                      >
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </Widget>
  )
}

function SourcesTable({ rows, onRowClick }) {
  const columns = useMemo(
    () => [
      { key: 'name', label: 'Source' },
      { key: 'value', label: 'Count', className: 'col-num' },
      { key: 'percent', label: '%', className: 'col-num' },
    ],
    [],
  )
  const [sort, setSort] = useState({ key: 'value', direction: 'desc' })
  const sortedRows = useMemo(
    () => sortRows(rows, sort.key, sort.direction, columns),
    [rows, sort, columns],
  )

  return (
    <div className="table-surface">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <SortableTh
                key={col.key}
                column={col}
                sort={sort}
                onSort={(key) => setSort((current) => nextSortState(current, key))}
                className={col.className || ''}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr
              key={row.name}
              className="clickable-row"
              onClick={() => onRowClick(row)}
            >
              <td>{row.name}</td>
              <td className="col-num">{row.value}</td>
              <td className="col-num">{row.percent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const currencyCol = (key, label) => ({
  key,
  label,
  className: 'col-num',
  render: (r) => formatCurrency(r[key]),
})

export function DashboardView({ view, leadSummary, isBranch }) {
  const [drillDown, setDrillDown] = useState(null)
  const quoteRecords = view?.quoteRecords ?? []
  const leadRecords = leadSummary?.leadRecords ?? []

  const openQuotes = useCallback(
    (filter, title, subtitle) => {
      const filtered = filterQuotes(quoteRecords, filter)
      setDrillDown(buildQuoteDrillDown(filtered, title, subtitle, filter))
    },
    [quoteRecords]
  )

  const openLeads = useCallback(
    (filter, title, subtitle) => {
      const filtered = filterLeads(leadRecords, filter)
      setDrillDown(buildLeadDrillDown(filtered, title, subtitle, filter))
    },
    [leadRecords]
  )

  const closeDrillDown = useCallback(() => setDrillDown(null), [])

  const onPieClick = useCallback(
    (entry, titlePrefix) => {
      const data = getChartClickPayload(entry) ?? entry
      if (!data?.name) return
      openQuotes(
        { type: 'type', value: data.name },
        `${titlePrefix}: ${data.name}`,
        `${data.value} quotes`
      )
    },
    [openQuotes]
  )

  const onBarClick = useCallback(
    (entry, filterType, titlePrefix) => {
      const data = getChartClickPayload(entry) ?? entry
      if (!data?.name) return
      const filter =
        filterType === 'status'
          ? { type: 'status', value: data.name }
          : filterType === 'conversion'
            ? { type: 'conversionBucket', value: data.name }
            : filterType === 'month'
              ? { type: 'month', value: data.label || data.name }
              : { type: 'status', value: data.name }
      openQuotes(filter, `${titlePrefix}: ${data.name || data.label}`, `${data.value} quotes`)
    },
    [openQuotes]
  )

  const onTouchpointClick = useCallback(
    (entry) => {
      const data = getChartClickPayload(entry) ?? entry
      if (!data?.name) return
      openQuotes(
        { type: 'touchpoint', value: data.name },
        `Touchpoint: ${data.name}`,
        `${data.value} quotes`
      )
    },
    [openQuotes]
  )

  const onMonthlyTrendClick = useCallback(
    (entry, series) => {
      const data = getChartClickPayload(entry) ?? entry
      if (!data?.label) return
      if (series === 'value') {
        openQuotes(
          { type: 'month', value: data.month, monthLabel: data.label },
          `Monthly value: ${data.label}`,
          formatCurrency(data.value)
        )
      } else if (series === 'sales') {
        openQuotes(
          { type: 'monthType', month: data.month, monthLabel: data.label, quoteType: 'Sales Quote' },
          `Sales quotes: ${data.label}`,
          `${data.salesCount} quotes`
        )
      } else {
        openQuotes(
          { type: 'monthType', month: data.month, monthLabel: data.label, quoteType: 'Defect Quote' },
          `Defect quotes: ${data.label}`,
          `${data.defectCount} quotes`
        )
      }
    },
    [openQuotes]
  )

  const summary = view?.summary ?? {}
  const quoteStatusBreakdown = view?.quoteStatusBreakdown ?? []
  const quoteStatusStack = useMemo(
    () => buildQuoteStatusStackData(quoteStatusBreakdown),
    [quoteStatusBreakdown]
  )
  const statusPivot = view?.statusPivot ?? []
  const monthlyQuoteDetail = view?.monthlyQuoteDetail ?? []
  const monthlyBreakdown = view?.monthlyBreakdown ?? []
  const quoteTypeSplit = view?.quoteTypeSplit ?? []
  const statusBreakdown = view?.statusBreakdown ?? []
  const conversionTiming = (view?.conversionTiming ?? []).filter((row) => row.name !== 'Unknown')
  const touchpoints = view?.touchpoints ?? []
  const salespersonLeague = view?.salespersonLeague ?? []
  const branchLeague = view?.branchLeague ?? []
  const topClients = view?.topClients ?? []

  const salesColumns = [
    { key: 'name', label: 'Salesperson', className: 'name-col' },
    { key: 'quotesCreated', label: 'Quotes', className: 'col-num' },
    { key: 'quotesWon', label: 'Won', className: 'col-num' },
    {
      key: 'conversionRate',
      label: 'Conv %',
      className: 'col-num',
      render: (r) => `${r.conversionRate}%`,
      sortValue: (r) => r.conversionRate,
    },
    currencyCol('totalQuotedValue', 'Total'),
    currencyCol('wonValue', 'Won value'),
    currencyCol('avgQuoteValue', 'Avg quote'),
    {
      key: 'avgConversionDays',
      label: 'Days',
      className: 'col-num',
      render: (r) => (r.avgConversionDays != null ? `${r.avgConversionDays}d` : '—'),
      sortValue: (r) => r.avgConversionDays ?? -1,
    },
    currencyCol('efficiencyScore', 'Efficiency'),
  ]

  const branchColumns = [
    { key: 'branch', label: 'Branch' },
    { key: 'quotes', label: 'Quotes' },
    currencyCol('value', 'Quote value'),
    {
      key: 'valueShare',
      label: '% of total',
      render: (r) => `${r.valueShare}%`,
      sortValue: (r) => r.valueShare,
    },
    {
      key: 'expiredRate',
      label: '% expired',
      render: (r) => `${r.expiredRate}%`,
      sortValue: (r) => r.expiredRate,
    },
    { key: 'won', label: 'Won' },
    {
      key: 'conversionRate',
      label: 'Conversion %',
      render: (r) => `${r.conversionRate}%`,
      sortValue: (r) => r.conversionRate,
    },
    { key: 'salesQuotes', label: 'Sales' },
    { key: 'defectQuotes', label: 'Defect' },
  ]

  const clientColumns = [
    { key: 'client', label: 'Client' },
    { key: 'quotes', label: 'Quotes' },
    currencyCol('value', 'Total value'),
    currencyCol('wonValue', 'Won value'),
  ]

  const statusPivotColumns = [
    { key: 'status', label: 'Status' },
    { key: 'salesQuote', label: 'Sales quote', className: 'col-num' },
    { key: 'defectQuote', label: 'Defect quote', className: 'col-num' },
    { key: 'total', label: 'Total', className: 'col-num' },
  ]

  const monthlyDetailColumns = [
    { key: 'month', label: 'Month', sortValue: (r) => r.monthKey || r.month },
    { key: 'quoteCount', label: 'Quote count', className: 'col-num' },
    currencyCol('totalValue', 'Total value'),
    currencyCol('averageValue', 'Average value'),
  ]

  return (
    <div className="dashboard-main">
      <DrillDownModal data={drillDown} onClose={closeDrillDown} />

      <section className="kpi-section">
        <SectionHeading title="Overview" subtitle="Key quote metrics at a glance" />
        <div className="stats-layout">
          <div className="stats-hero">
            <StatCard
              label="Total quote value"
              value={formatCurrency(summary.totalValue)}
              accent="primary"
              featured
              onClick={() => openQuotes({ type: 'all' }, 'All quotes by value', 'Sorted by value')}
            />
            <StatCard
              label="Total quotes"
              value={summary.totalQuotes.toLocaleString()}
              accent="blue"
              featured
              onClick={() => openQuotes({ type: 'all' }, 'All quotes', 'Full quote list')}
            />
          </div>
          <div className="stats-grid">
            <StatCard
              label="Average quote value"
              value={formatCurrency(summary.avgQuoteValue ?? 0)}
              accent="slate"
              onClick={() => openQuotes({ type: 'all' }, 'All quotes', 'Average value breakdown')}
            />
            <StatCard
              label="Quotes with missing values"
              value={(summary.quotesMissingValue ?? 0).toLocaleString()}
              sub={`${summary.missingValueRate ?? 0}% of all quotes`}
              accent="amber"
              onClick={() =>
                openQuotes({ type: 'missingValue' }, 'Quotes with missing values', 'Zero-value quotes')
              }
            />
            <StatCard
              label="Sales vs defect"
              value={`${summary.salesQuotes} / ${summary.defectQuotes}`}
              sub={`${formatCurrency(summary.salesValue)} sales · ${formatCurrency(summary.defectValue)} defect`}
              accent="blue"
              onClick={() => openQuotes({ type: 'all' }, 'Sales vs defect', 'All quotes by type')}
            />
            <StatCard
              label="Won quotes"
              value={summary.wonQuotes.toLocaleString()}
              sub={`${summary.conversionRate}% conversion`}
              accent="green"
              onClick={() => openQuotes({ type: 'won' }, 'Won quotes', 'Approved, completed, finalised & actioned')}
            />
            <StatCard
              label="Won value"
              value={formatCurrency(summary.wonValue)}
              accent="green"
              onClick={() => openQuotes({ type: 'won' }, 'Won quote value', 'Value from won quotes')}
            />
            <StatCard
              label="Avg conversion time"
              value={summary.avgConversionDays != null ? `${summary.avgConversionDays} days` : '—'}
              accent="teal"
              onClick={() => openQuotes({ type: 'won' }, 'Won quotes — conversion timing', 'Days from created to converted')}
            />
            {!isBranch && (
              <>
                <StatCard
                  label="Expired quotes"
                  value={`${summary.expiredQuoteRate ?? 0}%`}
                  sub={`${(summary.expiredQuotes ?? 0).toLocaleString()} of ${summary.totalQuotes.toLocaleString()} quotes`}
                  accent="amber"
                  onClick={() =>
                    openQuotes({ type: 'status', value: 'EXPIRED' }, 'Expired quotes', 'All quotes with EXPIRED status')
                  }
                />
                <StatCard
                  label="Unassigned quote value"
                  value={`${summary.unassignedValueRate ?? 0}%`}
                  sub={`${formatCurrency(summary.unassignedValue ?? 0)} with no branch`}
                  accent="amber"
                  onClick={() =>
                    openQuotes(
                      { type: 'branch', value: '(Unassigned)' },
                      'Unassigned branch quotes',
                      `${formatCurrency(summary.unassignedValue ?? 0)} total value`
                    )
                  }
                />
              </>
            )}
          </div>
        </div>
        <MetricDefinitionsPanel />
      </section>

      {isBranch && (
        <Section title="Leads (Manchester)" subtitle="Lead sheet data — not matched to quotes">
          <div className="bento-grid bento-grid--leads">
            <div
              className="leads-count-card clickable"
              onClick={() => openLeads({ type: 'all' }, 'All Manchester leads', `${leadSummary.total} leads`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && openLeads({ type: 'all' }, 'All Manchester leads', `${leadSummary.total} leads`)}
            >
              <span className="stat-label">Total leads</span>
              <span className="stat-value">{leadSummary.total.toLocaleString()}</span>
            </div>

            <Widget title="Sources" className="widget--compact">
              <SourcesTable
                rows={leadSummary.bySource || []}
                onRowClick={(row) =>
                  openLeads(
                    { type: 'source', value: row.name },
                    `Leads: ${row.name}`,
                    `${row.value} leads (${row.percent}%)`,
                  )
                }
              />
            </Widget>

            <Widget title="Leads by month" className="widget--chart">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={leadSummary.monthlyLeads || []}>
                  <XAxis dataKey="label" tick={{ fill: 'var(--chart-tick)', fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="count"
                    fill={CHART.primary}
                    radius={[6, 6, 0, 0]}
                    name="Leads"
                    cursor="pointer"
                    onClick={(entry) => {
                      const data = getChartClickPayload(entry)
                      if (!data?.label) return
                      openLeads(
                        { type: 'month', value: data.month, monthLabel: data.label },
                        `Leads: ${data.label}`,
                        `${data.count} leads`
                      )
                    }}
                  >
                    <LabelList dataKey="count" content={BAR_TOP_LABEL} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Widget>
          </div>
        </Section>
      )}

      <Section title="Quote overview" subtitle="Distribution by type and status">
        <div className="bento-grid bento-grid--2">
          <Widget title="Sales vs defect quotes" className="widget--chart">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={quoteTypeSplit}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={88}
                  paddingAngle={2}
                  label={({ name, value }) => `${name}: ${value}`}
                  cursor="pointer"
                  onClick={(entry) => onPieClick(entry, 'Quote type')}
                >
                  {quoteTypeSplit.map((_, i) => (
                    <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Widget>
          <Widget title="Quote statuses" className="widget--chart">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={statusBreakdown.slice(0, 10)} layout="vertical" margin={{ left: 12, right: 42, top: 8, bottom: 4 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={96} tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="value"
                  name="Quotes"
                  fill={CHART.primary}
                  radius={[0, 6, 6, 0]}
                  background={{ fill: 'var(--chart-track)' }}
                  cursor="pointer"
                  onClick={(entry) => onBarClick(entry, 'status', 'Status')}
                >
                  <LabelList dataKey="value" content={BAR_END_LABEL} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Widget>
        </div>
      </Section>

      <Section
        title="Monthly quote trend"
        subtitle={
          isBranch
            ? 'Manchester — sales and defect quote counts with total value over time'
            : 'Sales and defect quote counts with total value over time'
        }
      >
        <Widget className="widget--wide widget--chart">
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={monthlyBreakdown} margin={{ top: 24, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'var(--chart-tick)', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis yAxisId="left" allowDecimals={false} tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="salesCount"
                stackId="a"
                fill={CHART.primary}
                name="Sales quotes"
                radius={[0, 0, 0, 0]}
                cursor="pointer"
                onClick={(entry) => onMonthlyTrendClick(entry, 'sales')}
              >
                <LabelList dataKey="salesCount" content={STACK_SEGMENT_LABEL} />
              </Bar>
              <Bar
                yAxisId="left"
                dataKey="defectCount"
                stackId="a"
                fill={CHART.secondary}
                name="Defect quotes"
                radius={[6, 6, 0, 0]}
                cursor="pointer"
                onClick={(entry) => onMonthlyTrendClick(entry, 'defect')}
              >
                <LabelList dataKey="defectCount" content={STACK_SEGMENT_LABEL} />
              </Bar>
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="value"
                stroke={CHART.line}
                strokeWidth={2.5}
                name="Value"
                dot={{ cursor: 'pointer', r: 3, fill: CHART.line }}
                activeDot={{
                  r: 6,
                  cursor: 'pointer',
                  onClick: (_, payload) => onMonthlyTrendClick(payload.payload, 'value'),
                }}
              >
                <LabelList
                  dataKey="value"
                  position="top"
                  offset={10}
                  formatter={formatCompactCurrencyLabel}
                  style={LINE_LABEL_STYLE}
                />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        </Widget>
      </Section>

      <Section title="Quote analysis" subtitle="Detailed breakdowns by type, status and month">
        <div className="bento-grid bento-grid--analysis">
          <Widget
            title="Quote status breakdown"
            subtitle="Tap a segment for details"
            className="widget--chart widget--span-2"
          >
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={quoteStatusStack.data} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                <XAxis dataKey="quoteType" tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                {quoteStatusStack.statuses.map((status, i) => (
                  <Bar
                    key={status}
                    dataKey={status}
                    name={status}
                    stackId="status"
                    fill={CHART_PALETTE[i % CHART_PALETTE.length]}
                    cursor="pointer"
                    onClick={(entry) => {
                      const row = getChartClickPayload(entry)
                      if (!row) return
                      const count = row[status]
                      if (!count) return
                      const detail = lookupStatusRow(
                        quoteStatusBreakdown,
                        row.quoteType,
                        status
                      )
                      openQuotes(
                        { type: 'typeStatus', quoteType: row.quoteType, status },
                        `${row.quoteType}: ${status}`,
                        `${count} quotes · ${formatCurrency(detail?.totalValue ?? 0)}`
                      )
                    }}
                  >
                    <LabelList dataKey={status} content={STACK_SEGMENT_LABEL} />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Widget>
          <AnalysisTable
            title="Status pivot"
            subtitle="Counts by status across sales and defect"
            columns={statusPivotColumns}
            rows={statusPivot}
            defaultSort={{ key: 'total', direction: 'desc' }}
            onRowClick={(row) =>
              openQuotes(
                { type: 'statusPivot', status: row.status },
                `Status: ${row.status}`,
                `${row.total} quotes (${row.salesQuote} sales · ${row.defectQuote} defect)`
              )
            }
          />
          <AnalysisTable
            title="Monthly quote breakdown"
            subtitle="Month, count, total value and average"
            columns={monthlyDetailColumns}
            rows={monthlyQuoteDetail}
            defaultSort={{ key: 'month', direction: 'desc' }}
            onRowClick={(row) =>
              openQuotes(
                { type: 'month', value: row.monthKey, monthLabel: row.month },
                `Quotes: ${row.month}`,
                `${row.quoteCount} quotes · ${formatCurrency(row.totalValue)}`
              )
            }
          />
        </div>
      </Section>

      <Section title="Conversion &amp; engagement" subtitle="Time to convert and customer touchpoints">
        <div className="bento-grid bento-grid--2">
          <Widget title="Conversion timing (won quotes)" className="widget--chart">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={conversionTiming} margin={{ top: 20, right: 8, left: 4, bottom: 4 }}>
                <XAxis dataKey="name" tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="value"
                  name="Quotes"
                  fill={CHART.tertiary}
                  radius={[6, 6, 0, 0]}
                  cursor="pointer"
                  onClick={(entry) => onBarClick(entry, 'conversion', 'Conversion timing')}
                >
                  <LabelList dataKey="value" content={BAR_TOP_LABEL} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Widget>
          <Widget title="Customer touchpoints" className="widget--chart">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={touchpoints}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={82}
                  paddingAngle={2}
                  label={({ name, value }) => `${name}: ${value}`}
                  cursor="pointer"
                  onClick={(entry) => onTouchpointClick(entry)}
                >
                  {touchpoints.map((_, i) => (
                    <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </Widget>
        </div>
      </Section>

      <Section title="Performance rankings" subtitle="Salespeople, branches and top clients">
        <div className="bento-grid bento-grid--stack">
          <LeagueTable
            title="Salesperson league table"
            subtitle="Ranked by efficiency — tap a row for quote breakdown"
            columns={salesColumns}
            rows={salespersonLeague}
            highlightCol="efficiencyScore"
            defaultSort={{ key: 'efficiencyScore', direction: 'desc' }}
            unrankedNames={['(Unassigned)']}
            nameKey="name"
            onRowClick={(row) =>
              openQuotes(
                { type: 'salesperson', value: row.name },
                `Salesperson: ${row.name}`,
                `${row.quotesCreated} quotes · ${formatCurrency(row.wonValue)} won`
              )
            }
          />
          {!isBranch && (
            <LeagueTable
              title="Branch league table"
              subtitle="Nearly half of sales quote value has no branch assigned — tap a row"
              columns={branchColumns}
              rows={branchLeague}
              highlightCol="valueShare"
              defaultSort={{ key: 'value', direction: 'desc' }}
              onRowClick={(row) =>
                openQuotes(
                  { type: 'branch', value: row.branch },
                  `Branch: ${row.branch}`,
                  `${row.quotes} quotes · ${row.expiredRate}% expired`
                )
              }
            />
          )}
          <LeagueTable
            title="Top clients by quote value"
            subtitle="Tap a row for client quote breakdown"
            columns={clientColumns}
            rows={topClients}
            defaultSort={{ key: 'value', direction: 'desc' }}
            onRowClick={(row) =>
              openQuotes(
                { type: 'client', value: row.client },
                `Client: ${row.client}`,
                `${row.quotes} quotes · ${formatCurrency(row.value)}`
              )
            }
          />
        </div>
      </Section>

      {!isBranch && (
        <Section title="Data insights">
          <DataInsightsPanel summary={summary} />
        </Section>
      )}
    </div>
  )
}
