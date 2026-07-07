import { filterQuoteRecordsByType, rebuildViewFromRecords } from './rebuildView'

export function buildWidgetQuoteView(records, quoteType = 'all') {
  return rebuildViewFromRecords(filterQuoteRecordsByType(records ?? [], quoteType))
}

export function applyWidgetQuoteType(records, widgetQuoteType = 'all') {
  if (!records?.length || !widgetQuoteType || widgetQuoteType === 'all') return records ?? []
  return records.filter((record) => record.typeKey === widgetQuoteType)
}

export function adaptTableColumnsForQuoteFilter(columns, quoteType = 'all') {
  if (quoteType === 'all') return columns
  if (quoteType === 'service') {
    return columns.filter((col) => col.key !== 'defectQuotes' && col.key !== 'defectQuote')
  }
  if (quoteType === 'defect') {
    return columns.filter((col) => col.key !== 'salesQuotes' && col.key !== 'salesQuote')
  }
  return columns
}

export function adaptStatusPivotRows(rows, quoteType = 'all') {
  if (quoteType === 'all') return rows
  return rows.map((row) => {
    if (quoteType === 'service') {
      return { ...row, defectQuote: 0, total: row.salesQuote }
    }
    return { ...row, salesQuote: 0, total: row.defectQuote }
  })
}

export function filterChartSlices(data, quoteType = 'all') {
  if (quoteType === 'all') return data
  return (data ?? []).filter((item) => item.value > 0)
}
