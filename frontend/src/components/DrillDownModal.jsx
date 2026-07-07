import { useEffect, useMemo, useState } from 'react'
import { formatDate } from '../utils/format'
import { formatCurrency } from '../utils/format'
import { nextSortState, sortRows } from '../utils/tableSort'
import SortableTh from './SortableTh'

const PAGE_SIZE = 25

function SummaryStat({ label, value }) {
  return (
    <div className="drill-stat">
      <span className="drill-stat-label">{label}</span>
      <span className="drill-stat-value">{value}</span>
    </div>
  )
}

function BreakdownTable({ title, rows, isLead }) {
  const columns = useMemo(
    () => [
      { key: 'name', label: 'Name' },
      {
        key: 'count',
        label: isLead ? 'Leads' : 'Quotes',
        className: 'col-num',
        sortValue: (row) => row.count ?? row.value,
      },
      ...(isLead
        ? []
        : [{ key: 'value', label: 'Value', className: 'col-num' }]),
    ],
    [isLead],
  )
  const [sort, setSort] = useState(
    isLead ? { key: 'count', direction: 'desc' } : { key: 'value', direction: 'desc' },
  )
  const sortedRows = useMemo(
    () => sortRows(rows ?? [], sort.key, sort.direction, columns),
    [rows, sort, columns],
  )

  if (!rows?.length) return null

  return (
    <div className="drill-breakdown-card">
      <h4>{title}</h4>
      <div className="table-wrap">
        <table className="data-table drill-table">
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
              <tr key={row.name}>
                <td title={row.name}>{row.name}</td>
                <td className="col-num">{row.count ?? row.value}</td>
                {!isLead && <td className="col-num">{formatCurrency(row.value)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const BREAKDOWN_LABELS = {
  byStatus: 'By status',
  byType: 'By type',
  bySalesperson: 'By salesperson',
  byBranch: 'By branch',
  byClient: 'By client',
  byMonth: 'By month',
  bySource: 'By source',
}

const SUMMARY_LABELS = {
  count: 'Total quotes',
  totalValue: 'Total value',
  avgValue: 'Average value',
  won: 'Won',
  wonValue: 'Won value',
  conversionRate: 'Conversion rate',
  avgConversion: 'Avg conversion',
  missingValue: 'Missing values',
}

const LEAD_COLUMNS = [
  { key: 'date', label: 'Date', sortValue: (row) => new Date(row.date).getTime() || 0 },
  { key: 'source', label: 'Source' },
  { key: 'company', label: 'Company' },
  { key: 'name', label: 'Contact' },
  { key: 'phone', label: 'Phone' },
  { key: 'enquiry', label: 'Enquiry' },
]

const QUOTE_COLUMNS = [
  { key: 'reference', label: 'Reference' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'client', label: 'Client' },
  { key: 'salesperson', label: 'Salesperson' },
  { key: 'value', label: 'Value', className: 'col-num', format: formatCurrency },
  { key: 'created', label: 'Created', format: formatDate },
]

export default function DrillDownModal({ data, onClose }) {
  const [page, setPage] = useState(0)
  const [recordSort, setRecordSort] = useState(null)

  const isLead = data?.kind === 'leads'
  const {
    summary,
    breakdowns = {},
    breakdownKeys,
    summaryKeys,
    hiddenColumns,
    records = [],
    title,
    subtitle,
  } = data ?? {}
  const hidden = new Set(hiddenColumns ?? [])
  const quoteColumns = QUOTE_COLUMNS.filter((col) => !hidden.has(col.key))
  const recordColumns = isLead ? LEAD_COLUMNS : quoteColumns
  const sortedRecords = useMemo(
    () =>
      recordSort
        ? sortRows(records, recordSort.key, recordSort.direction, recordColumns)
        : records,
    [records, recordSort, recordColumns],
  )

  useEffect(() => {
    setPage(0)
    if (!data) return
    setRecordSort(
      data.kind === 'leads'
        ? { key: 'date', direction: 'desc' }
        : { key: 'value', direction: 'desc' },
    )
  }, [data])

  useEffect(() => {
    if (!data) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [data, onClose])

  if (!data) return null

  const totalPages = Math.ceil(sortedRecords.length / PAGE_SIZE)
  const pageRecords = sortedRecords.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const summaryItems = isLead
    ? [{ key: 'count', label: 'Total leads', value: summary.count.toLocaleString() }]
    : (summaryKeys ?? ['count']).map((key) => {
        if (key === 'won') {
          return {
            key,
            label: SUMMARY_LABELS.won,
            value: `${summary.wonCount} (${summary.conversionRate}%)`,
          }
        }
        if (key === 'missingValue' && summary.missingValueCount === 0) return null
        if (key === 'avgConversion' && summary.avgConversionDays == null) return null

        const value =
          key === 'count'
            ? summary.count.toLocaleString()
            : key === 'totalValue' || key === 'avgValue' || key === 'wonValue'
              ? formatCurrency(summary[key])
              : key === 'conversionRate'
                ? `${summary.conversionRate}%`
                : key === 'avgConversion'
                  ? `${summary.avgConversionDays} days`
                  : key === 'missingValue'
                    ? summary.missingValueCount.toLocaleString()
                    : summary[key]

        return { key, label: SUMMARY_LABELS[key] ?? key, value }
      }).filter(Boolean)

  return (
    <div className="drill-overlay" onClick={onClose} role="presentation">
      <div
        className="drill-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drill-title"
      >
        <header className="drill-header">
          <div>
            <h2 id="drill-title">{title}</h2>
            {subtitle && <p className="drill-subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="drill-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="drill-summary-grid">
          {summaryItems.map((item) => (
            <SummaryStat key={item.key} label={item.label} value={item.value} />
          ))}
        </div>

        <div className="drill-breakdowns">
          {(breakdownKeys ?? Object.keys(breakdowns)).map((key) => (
            <BreakdownTable
              key={key}
              title={BREAKDOWN_LABELS[key] ?? key}
              rows={breakdowns[key]}
              isLead={isLead}
            />
          ))}
        </div>

        <div className="drill-records">
          <h3>
            {isLead ? 'Lead details' : 'Quote details'}
            <span className="drill-records-count">({sortedRecords.length})</span>
          </h3>
          <div className="table-wrap drill-records-table">
            <table className="data-table">
              <thead>
                <tr>
                  {recordColumns.map((col) => (
                    <SortableTh
                      key={col.key}
                      column={col}
                      sort={recordSort}
                      onSort={(key) => {
                        setRecordSort((current) => nextSortState(current, key))
                        setPage(0)
                      }}
                      className={col.className || ''}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRecords.length === 0 ? (
                  <tr>
                    <td colSpan={recordColumns.length} className="empty">
                      No records match this selection
                    </td>
                  </tr>
                ) : (
                  pageRecords.map((row) =>
                    isLead ? (
                      <tr key={row.id}>
                        <td>{formatDate(row.date)}</td>
                        <td>{row.source}</td>
                        <td>{row.company}</td>
                        <td>{row.name}</td>
                        <td>{row.phone}</td>
                        <td>
                          <span className="truncate" title={row.enquiry}>
                            {row.enquiry || '—'}
                          </span>
                        </td>
                      </tr>
                    ) : (
                      <tr key={row.id}>
                        {quoteColumns.map((col) => {
                          if (col.key === 'status') {
                            return (
                              <td key={col.key}>
                                <span
                                  className={`status-pill status-${(row.status || 'unknown').toLowerCase()}`}
                                >
                                  {row.status || '—'}
                                </span>
                              </td>
                            )
                          }
                          const raw = row[col.key]
                          const display = col.format ? col.format(raw) : raw
                          return (
                            <td key={col.key} className={col.className}>
                              {display}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="drill-pagination">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span>
                Page {page + 1} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
