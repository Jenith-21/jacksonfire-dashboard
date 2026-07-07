import { useState, useCallback, useMemo, useEffect } from 'react'
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
  SalesDefectLegendContent,
  ChartLegendItems,
} from '../utils/chartLabels.jsx'
import { getChartClickPayload } from '../utils/chartEvents'
import { nextSortState, sortRows, sortRowsPinnedBottom } from '../utils/tableSort'
import SortableTh from './SortableTh'
import QuoteTypeSwitcher from './QuoteTypeSwitcher'
import {
  buildWidgetQuoteView,
  applyWidgetQuoteType,
  adaptTableColumnsForQuoteFilter,
  adaptStatusPivotRows,
  filterChartSlices,
} from '../utils/widgetQuoteFilter'

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

function buildQuoteStatusChartData(statusPivot = [], series) {
  const countKey = series === 'sales' ? 'salesQuote' : 'defectQuote'

  return [...statusPivot]
    .map((row) => ({
      status: row.status,
      count: row[countKey],
    }))
    .sort((a, b) => b.count - a.count)
}

function QuoteStatusBarChart({ data, color, series, onBarClick }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={data} margin={{ top: 16, right: 12, left: 4, bottom: 56 }}>
        <XAxis
          dataKey="status"
          tick={{ fill: 'var(--chart-tick)', fontSize: 10 }}
          interval={0}
          angle={-35}
          textAnchor="end"
          height={72}
        />
        <YAxis allowDecimals={false} tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} />
        <Tooltip content={<ChartTooltip />} />
        <Bar
          dataKey="count"
          name="Quotes"
          fill={color}
          radius={[6, 6, 0, 0]}
          cursor="pointer"
          onClick={(entry) => onBarClick(entry, series)}
        >
          <LabelList dataKey="count" content={BAR_TOP_LABEL} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
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

function useWidgetQuoteView(records, quoteType) {
  return useMemo(() => buildWidgetQuoteView(records, quoteType), [records, quoteType])
}

function Widget({ title, subtitle, children, className = '', span, quoteFilter, onQuoteFilterChange }) {
  const showFilter = typeof onQuoteFilterChange === 'function'

  return (
    <article className={`widget ${span ? `widget--${span}` : ''} ${className}`.trim()}>
      {(title || subtitle || showFilter) && (
        <header
          className={`widget-header ${showFilter && !title && !subtitle ? 'widget-header--filter-only' : ''}`.trim()}
        >
          {(title || subtitle) && (
            <div className="widget-header-main">
              {title && <h3 className="widget-title">{title}</h3>}
              {subtitle && <p className="widget-subtitle">{subtitle}</p>}
            </div>
          )}
          {showFilter && (
            <QuoteTypeSwitcher value={quoteFilter ?? 'all'} onChange={onQuoteFilterChange} />
          )}
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
        <summary className="metric-definitions-summary">How Metrics Are Calculated</summary>
        <div className="metric-definitions-grid">
        <div className="metric-def-item">
          <h4>Won Quotes</h4>
          <p>Counts quotes with status: APPROVED, COMPLETED, FINALISED or ACTIONED.</p>
        </div>
        <div className="metric-def-item">
          <h4>Conversion Time</h4>
          <p>
            Days from quote created to converted. Start: <code>quote_created_date</code>, then{' '}
            <code>created</code>, then <code>date</code>. End: <code>status_changed_approved</code>, then{' '}
            <code>status_changed_submitted</code>, then <code>last_actioned</code>.
          </p>
        </div>
        <div className="metric-def-item">
          <h4>Customer Touchpoints</h4>
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
      headline: `${summary.unassignedQuoteRate ?? 0}% of quotes are unassigned to any branch`,
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
    <Widget title="Data Insights" className="widget--insights">
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
  quoteFilter,
  onQuoteFilterChange,
}) {
  const [sort, setSort] = useState(defaultSort ?? null)
  const displayColumns = useMemo(
    () => adaptTableColumnsForQuoteFilter(columns, quoteFilter),
    [columns, quoteFilter],
  )

  const sortedRows = useMemo(
    () => (sort ? sortRows(rows, sort.key, sort.direction, displayColumns) : rows),
    [rows, sort, displayColumns],
  )

  const handleSort = (key) => setSort((current) => nextSortState(current, key))

  const getRowKey = (row, index) => {
    if (row.id) return row.id
    if (row.bucket) return row.bucket
    if (row.quoteType && row.status) return `${row.quoteType}-${row.status}`
    if (row.quoteType) return row.quoteType
    if (row.month && row.quoteType) return `${row.month}-${row.quoteType}`
    return `row-${index}`
  }

  return (
    <Widget
      title={title}
      subtitle={subtitle}
      className="widget--table"
      quoteFilter={quoteFilter}
      onQuoteFilterChange={onQuoteFilterChange}
    >
      <div className="table-surface">
        <table className="data-table">
          <thead>
            <tr>
              {displayColumns.map((col) => (
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
                <td colSpan={displayColumns.length} className="empty">
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
                  {displayColumns.map((col) => (
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
  quoteFilter,
  onQuoteFilterChange,
}) {
  const [sort, setSort] = useState(defaultSort ?? null)
  const rowNameKey = nameKey ?? columns[0]?.key ?? 'name'
  const pinnedNames = unrankedNames
  const displayColumns = useMemo(
    () => adaptTableColumnsForQuoteFilter(columns, quoteFilter),
    [columns, quoteFilter],
  )

  const sortedRows = useMemo(() => {
    if (pinnedNames.length > 0) {
      return sortRowsPinnedBottom(rows, sort?.key, sort?.direction, displayColumns, pinnedNames, rowNameKey)
    }
    return sort ? sortRows(rows, sort.key, sort.direction, displayColumns) : rows
  }, [rows, sort, displayColumns, pinnedNames, rowNameKey])

  const handleSort = (key) => setSort((current) => nextSortState(current, key))
  const pinnedSet = useMemo(() => new Set(pinnedNames), [pinnedNames])

  let rankCounter = 0

  return (
    <Widget
      title={title}
      subtitle={subtitle}
      className="widget--table widget--league"
      quoteFilter={quoteFilter}
      onQuoteFilterChange={onQuoteFilterChange}
    >
      <div className="table-surface league-table-surface">
        <table className="league-table data-table">
          <thead>
            <tr>
              <th className="rank-col sticky-col sticky-col--left" scope="col">
                #
              </th>
              {displayColumns.map((col) => (
                <SortableTh
                  key={col.key}
                  column={col}
                  sort={sort}
                  onSort={handleSort}
                  className={[
                    col.className || '',
                    col.key === displayColumns[0]?.key ? 'name-col sticky-col sticky-col--name' : '',
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
                <td colSpan={displayColumns.length + 1} className="empty">
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
                    {displayColumns.map((col) => (
                      <td
                        key={col.key}
                        className={[
                          col.className || '',
                          col.key === displayColumns[0]?.key ? 'name-col sticky-col sticky-col--name' : '',
                          col.key === highlightCol ? 'highlight-col sticky-col sticky-col--right' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        title={col.key === displayColumns[0]?.key ? rowLabel : undefined}
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

export function DashboardView({
  view,
  leadSummary,
  isBranch,
  alertRequest,
  alertQuoteRecords,
  onAlertRequestHandled,
}) {
  const [drillDown, setDrillDown] = useState(null)
  const [widgetFilters, setWidgetFilters] = useState({})
  const quoteRecords = view?.quoteRecords ?? []
  const leadRecords = leadSummary?.leadRecords ?? []

  const getWidgetFilter = useCallback((id) => widgetFilters[id] ?? 'all', [widgetFilters])
  const setWidgetFilter = useCallback((id, value) => {
    setWidgetFilters((current) => ({ ...current, [id]: value }))
  }, [])

  const openQuotes = useCallback(
    (filter, title, subtitle, widgetQuoteType = 'all') => {
      const filtered = applyWidgetQuoteType(filterQuotes(quoteRecords, filter), widgetQuoteType)
      setDrillDown(buildQuoteDrillDown(filtered, title, subtitle, filter))
    },
    [quoteRecords],
  )

  useEffect(() => {
    if (!alertRequest?.filter) return
    const sourceRecords = alertQuoteRecords ?? quoteRecords
    const filtered = filterQuotes(sourceRecords, alertRequest.filter)
    setDrillDown(
      buildQuoteDrillDown(filtered, alertRequest.drillTitle, alertRequest.drillSubtitle, alertRequest.filter),
    )
    onAlertRequestHandled?.()
  }, [alertRequest, alertQuoteRecords, quoteRecords, onAlertRequestHandled])

  const openLeads = useCallback(
    (filter, title, subtitle) => {
      const filtered = filterLeads(leadRecords, filter)
      setDrillDown(buildLeadDrillDown(filtered, title, subtitle, filter))
    },
    [leadRecords]
  )

  const closeDrillDown = useCallback(() => setDrillDown(null), [])

  const onPieClick = useCallback(
    (entry, titlePrefix, widgetQuoteType = 'all') => {
      const data = getChartClickPayload(entry) ?? entry
      if (!data?.name) return
      openQuotes(
        { type: 'type', value: data.name },
        `${titlePrefix}: ${data.name}`,
        `${data.value} quotes`,
        widgetQuoteType,
      )
    },
    [openQuotes],
  )

  const onBarClick = useCallback(
    (entry, filterType, titlePrefix, widgetQuoteType = 'all') => {
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
      openQuotes(
        filter,
        `${titlePrefix}: ${data.name || data.label}`,
        `${data.value} quotes`,
        widgetQuoteType,
      )
    },
    [openQuotes],
  )

  const onConversionChartClick = useCallback(
    (entry, series, widgetQuoteType = 'all') => {
      const data = getChartClickPayload(entry) ?? entry
      if (!data?.name) return
      if (series === 'sales') {
        openQuotes(
          { type: 'conversionBucketType', bucket: data.name, quoteType: 'Sales Quote' },
          `Sales conversion: ${data.name}`,
          `${data.sales ?? 0} won sales quotes`,
          widgetQuoteType,
        )
      } else if (series === 'defect') {
        openQuotes(
          { type: 'conversionBucketType', bucket: data.name, quoteType: 'Defect Quote' },
          `Defect conversion: ${data.name}`,
          `${data.defect ?? 0} won defect quotes`,
          widgetQuoteType,
        )
      } else {
        openQuotes(
          { type: 'conversionBucket', value: data.name },
          `Conversion timing: ${data.name}`,
          `${data.value ?? 0} won quotes`,
          widgetQuoteType,
        )
      }
    },
    [openQuotes],
  )

  const openConversionBreakdown = useCallback(() => {
    openQuotes(
      { type: 'conversion' },
      'Conversion time breakdown',
      'Won quotes with measurable conversion time — sales and defect split',
    )
  }, [openQuotes])

  const onMonthlyTrendClick = useCallback(
    (entry, series, widgetQuoteType = 'all') => {
      const data = getChartClickPayload(entry) ?? entry
      if (!data?.label) return
      if (series === 'value') {
        openQuotes(
          { type: 'month', value: data.month, monthLabel: data.label },
          `Monthly value: ${data.label}`,
          formatCurrency(data.value),
          widgetQuoteType,
        )
      } else if (series === 'sales') {
        openQuotes(
          { type: 'monthType', month: data.month, monthLabel: data.label, quoteType: 'Sales Quote' },
          `Sales quotes: ${data.label}`,
          `${data.salesCount} quotes`,
          widgetQuoteType,
        )
      } else {
        openQuotes(
          { type: 'monthType', month: data.month, monthLabel: data.label, quoteType: 'Defect Quote' },
          `Defect quotes: ${data.label}`,
          `${data.defectCount} quotes`,
          widgetQuoteType,
        )
      }
    },
    [openQuotes],
  )

  const summary = view?.summary ?? {}
  const quoteStatusBreakdown = view?.quoteStatusBreakdown ?? []

  const pieFilter = getWidgetFilter('quoteTypePie')
  const statusBarFilter = getWidgetFilter('quoteStatuses')
  const monthlyTrendFilter = getWidgetFilter('monthlyTrend')
  const salesStatusFilter = getWidgetFilter('salesQuoteStatus')
  const defectStatusFilter = getWidgetFilter('defectQuoteStatus')
  const statusPivotFilter = getWidgetFilter('statusPivot')
  const monthlyBreakdownFilter = getWidgetFilter('monthlyBreakdown')
  const conversionFilter = getWidgetFilter('conversionTiming')
  const salespersonFilter = getWidgetFilter('salespersonLeague')
  const branchFilter = getWidgetFilter('branchLeague')
  const topClientsFilter = getWidgetFilter('topClients')

  const pieView = useWidgetQuoteView(quoteRecords, pieFilter)
  const statusBarView = useWidgetQuoteView(quoteRecords, statusBarFilter)
  const monthlyTrendView = useWidgetQuoteView(quoteRecords, monthlyTrendFilter)
  const salesStatusView = useWidgetQuoteView(quoteRecords, salesStatusFilter)
  const defectStatusView = useWidgetQuoteView(quoteRecords, defectStatusFilter)
  const statusPivotView = useWidgetQuoteView(quoteRecords, statusPivotFilter)
  const monthlyBreakdownView = useWidgetQuoteView(quoteRecords, monthlyBreakdownFilter)
  const conversionView = useWidgetQuoteView(quoteRecords, conversionFilter)
  const salespersonView = useWidgetQuoteView(quoteRecords, salespersonFilter)
  const branchView = useWidgetQuoteView(quoteRecords, branchFilter)
  const topClientsView = useWidgetQuoteView(quoteRecords, topClientsFilter)

  const salesStatusChart = useMemo(
    () => buildQuoteStatusChartData(salesStatusView.statusPivot, 'sales'),
    [salesStatusView.statusPivot],
  )
  const defectStatusChart = useMemo(
    () => buildQuoteStatusChartData(defectStatusView.statusPivot, 'defect'),
    [defectStatusView.statusPivot],
  )

  const onStatusChartClick = useCallback(
    (entry, series, widgetQuoteType = 'all') => {
      const data = getChartClickPayload(entry) ?? entry
      if (!data?.status || !data?.count) return
      const quoteType = series === 'sales' ? 'Sales Quote' : 'Defect Quote'
      const detail = quoteStatusBreakdown.find(
        (row) => row.quoteType === quoteType && row.status === data.status,
      )
      openQuotes(
        { type: 'typeStatus', quoteType, status: data.status },
        `${quoteType}: ${data.status}`,
        `${data.count} quotes · ${formatCurrency(detail?.totalValue ?? 0)}`,
        widgetQuoteType,
      )
    },
    [openQuotes, quoteStatusBreakdown],
  )

  const quoteTypeSplit = filterChartSlices(pieView.quoteTypeSplit, pieFilter)
  const statusBreakdown = statusBarView.statusBreakdown ?? []
  const statusPivot = adaptStatusPivotRows(statusPivotView.statusPivot ?? [], statusPivotFilter)
  const monthlyQuoteDetail = monthlyBreakdownView.monthlyQuoteDetail ?? []
  const monthlyBreakdown = monthlyTrendView.monthlyBreakdown ?? []
  const conversionTiming = conversionView.conversionTiming ?? []
  const salespersonLeague = salespersonView.salespersonLeague ?? []
  const branchLeague = branchView.branchLeague ?? []
  const topClients = topClientsView.topClients ?? []

  const salesColumns = [
    { key: 'name', label: 'Salesperson', className: 'name-col' },
    { key: 'quotesCreated', label: 'Quotes', className: 'col-num' },
    { key: 'salesQuotes', label: 'Sales', className: 'col-num' },
    { key: 'defectQuotes', label: 'Defect', className: 'col-num' },
    { key: 'quotesWon', label: 'Won', className: 'col-num' },
    {
      key: 'conversionRate',
      label: 'Conv %',
      className: 'col-num',
      render: (r) => `${r.conversionRate}%`,
      sortValue: (r) => r.conversionRate,
    },
    currencyCol('totalQuotedValue', 'Total'),
    currencyCol('wonValue', 'Won Value'),
    currencyCol('avgQuoteValue', 'Avg Quote'),
  ]

  const branchColumns = [
    { key: 'branch', label: 'Branch' },
    { key: 'quotes', label: 'Quotes' },
    { key: 'salesQuotes', label: 'Sales' },
    { key: 'defectQuotes', label: 'Defect' },
    currencyCol('value', 'Quote Value'),
    {
      key: 'valueShare',
      label: '% of Total',
      render: (r) => `${r.valueShare}%`,
      sortValue: (r) => r.valueShare,
    },
    {
      key: 'expiredRate',
      label: '% Expired',
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
  ]

  const clientColumns = [
    { key: 'client', label: 'Client' },
    { key: 'quotes', label: 'Quotes' },
    { key: 'salesQuotes', label: 'Sales' },
    { key: 'defectQuotes', label: 'Defect' },
    currencyCol('value', 'Total Value'),
    currencyCol('wonValue', 'Won Value'),
  ]

  const statusPivotColumns = [
    { key: 'status', label: 'Status' },
    { key: 'salesQuote', label: 'Sales Quote', className: 'col-num' },
    { key: 'defectQuote', label: 'Defect Quote', className: 'col-num' },
    { key: 'total', label: 'Total', className: 'col-num' },
  ]

  const monthlyDetailColumns = [
    { key: 'month', label: 'Month', sortValue: (r) => r.monthKey || r.month },
    { key: 'quoteCount', label: 'Quote Count', className: 'col-num' },
    currencyCol('totalValue', 'Total Value'),
    currencyCol('averageValue', 'Average Value'),
  ]

  return (
    <div className="dashboard-main">
      <DrillDownModal data={drillDown} onClose={closeDrillDown} />

      <section className="kpi-section">
        <SectionHeading title="Overview" subtitle="Key Quote Metrics at a Glance" />
        <div className="stats-layout">
          <div className="stats-hero">
            <StatCard
              label="Total Quote Value"
              value={formatCurrency(summary.totalValue)}
              accent="primary"
              featured
              onClick={() => openQuotes({ type: 'all' }, 'All quotes by value', 'Sorted by value')}
            />
            <StatCard
              label="Total Quotes"
              value={summary.totalQuotes.toLocaleString()}
              accent="blue"
              featured
              onClick={() => openQuotes({ type: 'all' }, 'All quotes', 'Full quote list')}
            />
          </div>
          <div className="stats-grid">
            <StatCard
              label="Average Quote Value"
              value={formatCurrency(summary.avgQuoteValue ?? 0)}
              accent="slate"
              onClick={() => openQuotes({ type: 'all' }, 'All quotes', 'Average value breakdown')}
            />
            <StatCard
              label="Quotes With Missing Values"
              value={(summary.quotesMissingValue ?? 0).toLocaleString()}
              sub={`${summary.missingValueRate ?? 0}% of all quotes`}
              accent="amber"
              onClick={() =>
                openQuotes({ type: 'missingValue' }, 'Quotes with missing values', 'Zero-value quotes')
              }
            />
            <StatCard
              label="Sales vs Defect"
              value={`${summary.salesQuotes} / ${summary.defectQuotes}`}
              sub={`${formatCurrency(summary.salesValue)} sales · ${formatCurrency(summary.defectValue)} defect`}
              accent="blue"
              onClick={() => openQuotes({ type: 'all' }, 'Sales vs defect', 'All quotes by type')}
            />
            <StatCard
              label="Won Quotes"
              value={summary.wonQuotes.toLocaleString()}
              sub={`${(summary.wonSalesQuotes ?? 0).toLocaleString()} sales / ${(summary.wonDefectQuotes ?? 0).toLocaleString()} defect · ${summary.conversionRate}% conversion`}
              accent="green"
              onClick={() => openQuotes({ type: 'won' }, 'Won quotes', 'Approved, completed, finalised & actioned')}
            />
            <StatCard
              label="Won Value"
              value={formatCurrency(summary.wonValue)}
              sub={`${formatCurrency(summary.wonSalesValue ?? 0)} sales · ${formatCurrency(summary.wonDefectValue ?? 0)} defect`}
              accent="green"
              onClick={() => openQuotes({ type: 'won' }, 'Won quote value', 'Value from won quotes')}
            />
            <StatCard
              label="Avg Conversion Time"
              value={summary.avgConversionDays != null ? `${summary.avgConversionDays} days` : '—'}
              sub={
                summary.avgSalesConversionDays != null || summary.avgDefectConversionDays != null
                  ? `${summary.avgSalesConversionDays != null ? `${summary.avgSalesConversionDays}d` : '—'} sales · ${summary.avgDefectConversionDays != null ? `${summary.avgDefectConversionDays}d` : '—'} defect`
                  : undefined
              }
              accent="teal"
              onClick={openConversionBreakdown}
            />
            {!isBranch && (
              <>
                <StatCard
                  label="Expired Quotes"
                  value={`${summary.expiredQuoteRate ?? 0}%`}
                  sub={`${(summary.expiredQuotes ?? 0).toLocaleString()} of ${summary.totalQuotes.toLocaleString()} quotes`}
                  accent="amber"
                  onClick={() =>
                    openQuotes({ type: 'status', value: 'EXPIRED' }, 'Expired quotes', 'All quotes with EXPIRED status')
                  }
                />
                <StatCard
                  label="Unassigned Quotes"
                  value={`${summary.unassignedQuoteRate ?? 0}%`}
                  sub={`${(summary.unassignedQuotes ?? 0).toLocaleString()} of ${summary.totalQuotes.toLocaleString()} quotes with no branch`}
                  accent="amber"
                  onClick={() =>
                    openQuotes(
                      { type: 'branch', value: '(Unassigned)' },
                      'Unassigned branch quotes',
                      `${(summary.unassignedQuotes ?? 0).toLocaleString()} quotes with no branch`
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
        <Section title="Leads (Manchester)" subtitle="Lead Sheet Data — Not Matched to Quotes">
          <div className="bento-grid bento-grid--leads">
            <div
              className="leads-count-card clickable"
              onClick={() => openLeads({ type: 'all' }, 'All Manchester leads', `${leadSummary.total} leads`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && openLeads({ type: 'all' }, 'All Manchester leads', `${leadSummary.total} leads`)}
            >
              <span className="stat-label">Total Leads</span>
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

            <Widget title="Leads by Month" className="widget--chart">
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

      <Section title="Quote Overview" subtitle="Distribution by Type and Status">
        <div className="bento-grid bento-grid--2">
          <Widget
            title="Sales vs Defect Quotes"
            className="widget--chart"
            quoteFilter={pieFilter}
            onQuoteFilterChange={(value) => setWidgetFilter('quoteTypePie', value)}
          >
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
                  onClick={(entry) => onPieClick(entry, 'Quote type', pieFilter)}
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
          <Widget
            title="Quote Statuses"
            className="widget--chart"
            quoteFilter={statusBarFilter}
            onQuoteFilterChange={(value) => setWidgetFilter('quoteStatuses', value)}
          >
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
                  onClick={(entry) => onBarClick(entry, 'status', 'Status', statusBarFilter)}
                >
                  <LabelList dataKey="value" content={BAR_END_LABEL} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Widget>
        </div>
      </Section>

      <Section
        title="Monthly Quote Trend"
        subtitle={
          isBranch
            ? 'Manchester — Sales and Defect Quote Counts With Total Value Over Time'
            : 'Sales and Defect Quote Counts With Total Value Over Time'
        }
      >
        <Widget
          className="widget--wide widget--chart"
          quoteFilter={monthlyTrendFilter}
          onQuoteFilterChange={(value) => setWidgetFilter('monthlyTrend', value)}
        >
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={monthlyBreakdown} margin={{ top: 24, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'var(--chart-tick)', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis yAxisId="left" allowDecimals={false} tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              {(monthlyTrendFilter === 'all' || monthlyTrendFilter === 'service') && (
                <Bar
                  yAxisId="left"
                  dataKey="salesCount"
                  stackId="a"
                  fill={CHART.primary}
                  name="Sales Quotes"
                  radius={monthlyTrendFilter === 'service' ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                  cursor="pointer"
                  onClick={(entry) => onMonthlyTrendClick(entry, 'sales', monthlyTrendFilter)}
                >
                  <LabelList dataKey="salesCount" content={STACK_SEGMENT_LABEL} />
                </Bar>
              )}
              {(monthlyTrendFilter === 'all' || monthlyTrendFilter === 'defect') && (
                <Bar
                  yAxisId="left"
                  dataKey="defectCount"
                  stackId="a"
                  fill={CHART.secondary}
                  name="Defect Quotes"
                  radius={[6, 6, 0, 0]}
                  cursor="pointer"
                  onClick={(entry) => onMonthlyTrendClick(entry, 'defect', monthlyTrendFilter)}
                >
                  <LabelList dataKey="defectCount" content={STACK_SEGMENT_LABEL} />
                </Bar>
              )}
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
                  onClick: (_, payload) => onMonthlyTrendClick(payload.payload, 'value', monthlyTrendFilter),
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
              <Legend
                content={
                  <ChartLegendItems
                    items={[
                      ...(monthlyTrendFilter === 'all' || monthlyTrendFilter === 'service'
                        ? [{ value: 'Sales Quotes', color: CHART.primary }]
                        : []),
                      ...(monthlyTrendFilter === 'all' || monthlyTrendFilter === 'defect'
                        ? [{ value: 'Defect Quotes', color: CHART.secondary }]
                        : []),
                      { value: 'Value', color: CHART.line },
                    ]}
                  />
                }
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Widget>
      </Section>

      <Section title="Quote Analysis" subtitle="Detailed Breakdowns by Type, Status and Month">
        <div className="bento-grid bento-grid--analysis">
          <Widget
            title="Sales Quote Status"
            subtitle="Sorted by Quote Count — Tap a Bar for Details"
            className="widget--chart"
            quoteFilter={salesStatusFilter}
            onQuoteFilterChange={(value) => setWidgetFilter('salesQuoteStatus', value)}
          >
            <QuoteStatusBarChart
              data={salesStatusChart}
              color={CHART.primary}
              series="sales"
              onBarClick={(entry, series) => onStatusChartClick(entry, series, salesStatusFilter)}
            />
          </Widget>
          <Widget
            title="Defect Quote Status"
            subtitle="Sorted by Quote Count — Tap a Bar for Details"
            className="widget--chart"
            quoteFilter={defectStatusFilter}
            onQuoteFilterChange={(value) => setWidgetFilter('defectQuoteStatus', value)}
          >
            <QuoteStatusBarChart
              data={defectStatusChart}
              color={CHART.secondary}
              series="defect"
              onBarClick={(entry, series) => onStatusChartClick(entry, series, defectStatusFilter)}
            />
          </Widget>
          <AnalysisTable
            title="Status Pivot"
            subtitle="Counts by Status Across Sales and Defect"
            columns={statusPivotColumns}
            rows={statusPivot}
            quoteFilter={statusPivotFilter}
            onQuoteFilterChange={(value) => setWidgetFilter('statusPivot', value)}
            defaultSort={{ key: 'total', direction: 'desc' }}
            onRowClick={(row) =>
              openQuotes(
                { type: 'statusPivot', status: row.status },
                `Status: ${row.status}`,
                `${row.total} quotes (${row.salesQuote} sales · ${row.defectQuote} defect)`,
                statusPivotFilter,
              )
            }
          />
          <AnalysisTable
            title="Monthly Quote Breakdown"
            subtitle="Month, Count, Total Value and Average"
            columns={monthlyDetailColumns}
            rows={monthlyQuoteDetail}
            quoteFilter={monthlyBreakdownFilter}
            onQuoteFilterChange={(value) => setWidgetFilter('monthlyBreakdown', value)}
            defaultSort={{ key: 'month', direction: 'desc' }}
            onRowClick={(row) =>
              openQuotes(
                { type: 'month', value: row.monthKey, monthLabel: row.month },
                `Quotes: ${row.month}`,
                `${row.quoteCount} quotes · ${formatCurrency(row.totalValue)}`,
                monthlyBreakdownFilter,
              )
            }
          />
        </div>
      </Section>

      <Section title="Conversion &amp; Engagement" subtitle="Time to Convert Won Quotes">
        <Widget
          title="Average Conversion Timing"
          className="widget--chart"
          quoteFilter={conversionFilter}
          onQuoteFilterChange={(value) => setWidgetFilter('conversionTiming', value)}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={conversionTiming} margin={{ top: 20, right: 8, left: 4, bottom: 4 }}>
              <XAxis dataKey="name" tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              {(conversionFilter === 'all' || conversionFilter === 'service') && (
                <Bar
                  dataKey="sales"
                  name="Sales Quotes"
                  fill={CHART.primary}
                  radius={[6, 6, 0, 0]}
                  cursor="pointer"
                  onClick={(entry) => onConversionChartClick(entry, 'sales', conversionFilter)}
                >
                  <LabelList dataKey="sales" content={BAR_TOP_LABEL} />
                </Bar>
              )}
              {(conversionFilter === 'all' || conversionFilter === 'defect') && (
                <Bar
                  dataKey="defect"
                  name="Defect Quotes"
                  fill={CHART.tertiary}
                  radius={[6, 6, 0, 0]}
                  cursor="pointer"
                  onClick={(entry) => onConversionChartClick(entry, 'defect', conversionFilter)}
                >
                  <LabelList dataKey="defect" content={BAR_TOP_LABEL} />
                </Bar>
              )}
              {conversionFilter === 'all' ? (
                <Legend
                  verticalAlign="bottom"
                  content={
                    <SalesDefectLegendContent salesColor={CHART.primary} defectColor={CHART.tertiary} />
                  }
                />
              ) : null}
            </BarChart>
          </ResponsiveContainer>
        </Widget>
      </Section>

      <Section title="Performance Rankings" subtitle="Salespeople, Branches and Top Clients">
        <div className="bento-grid bento-grid--stack">
          <LeagueTable
            title="Salesperson League Table"
            subtitle="Ranked by Won Value — Tap a Row for Quote Breakdown"
            columns={salesColumns}
            rows={salespersonLeague}
            highlightCol="wonValue"
            defaultSort={{ key: 'wonValue', direction: 'desc' }}
            unrankedNames={['(Unassigned)']}
            nameKey="name"
            quoteFilter={salespersonFilter}
            onQuoteFilterChange={(value) => setWidgetFilter('salespersonLeague', value)}
            onRowClick={(row) =>
              openQuotes(
                { type: 'salesperson', value: row.name },
                `Salesperson: ${row.name}`,
                `${row.quotesCreated} quotes · ${formatCurrency(row.wonValue)} won`,
                salespersonFilter,
              )
            }
          />
          {!isBranch && (
            <LeagueTable
              title="Branch League Table"
              subtitle="Nearly Half of Sales Quote Value Has No Branch Assigned — Tap a Row"
              columns={branchColumns}
              rows={branchLeague}
              highlightCol="valueShare"
              defaultSort={{ key: 'value', direction: 'desc' }}
              quoteFilter={branchFilter}
              onQuoteFilterChange={(value) => setWidgetFilter('branchLeague', value)}
              onRowClick={(row) =>
                openQuotes(
                  { type: 'branch', value: row.branch },
                  `Branch: ${row.branch}`,
                  `${row.quotes} quotes · ${row.expiredRate}% expired`,
                  branchFilter,
                )
              }
            />
          )}
          <LeagueTable
            title="Top Clients by Quote Value"
            subtitle="Tap a Row for Client Quote Breakdown"
            columns={clientColumns}
            rows={topClients}
            defaultSort={{ key: 'value', direction: 'desc' }}
            quoteFilter={topClientsFilter}
            onQuoteFilterChange={(value) => setWidgetFilter('topClients', value)}
            onRowClick={(row) =>
              openQuotes(
                { type: 'client', value: row.client },
                `Client: ${row.client}`,
                `${row.quotes} quotes · ${formatCurrency(row.value)}`,
                topClientsFilter,
              )
            }
          />
        </div>
      </Section>

      {!isBranch && (
        <Section title="Data Insights">
          <DataInsightsPanel summary={summary} />
        </Section>
      )}
    </div>
  )
}
