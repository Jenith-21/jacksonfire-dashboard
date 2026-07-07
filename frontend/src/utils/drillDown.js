import { formatCurrency } from './format'

export { formatCurrency }

function countBy(items, keyFn) {
  const map = {}
  for (const item of items) {
    const key = keyFn(item)
    map[key] = (map[key] || 0) + 1
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

function sumByValue(items, keyFn) {
  const map = {}
  for (const item of items) {
    const key = keyFn(item)
    if (!map[key]) map[key] = { name: key, count: 0, value: 0 }
    map[key].count++
    map[key].value += item.value || 0
  }
  return Object.values(map).sort((a, b) => b.value - a.value)
}

export function getQuoteBreakdownKeys(filter) {
  const all = ['byStatus', 'byType', 'bySalesperson', 'byBranch', 'byClient', 'byMonth']
  if (!filter?.type) return all

  const exclude = new Set()
  switch (filter.type) {
    case 'conversion':
    case 'conversionType':
    case 'conversionBucketType':
      return ['byConversionBucket', 'byType', 'bySalesperson', 'byBranch']
    case 'status':
    case 'statusPivot':
      exclude.add('byStatus')
      break
    case 'type':
    case 'typeKey':
      exclude.add('byType')
      break
    case 'typeStatus':
      exclude.add('byStatus')
      exclude.add('byType')
      break
    case 'month':
      exclude.add('byMonth')
      break
    case 'monthType':
      exclude.add('byMonth')
      exclude.add('byType')
      break
    case 'salesperson':
      exclude.add('bySalesperson')
      break
    case 'branch':
      exclude.add('byBranch')
      break
    case 'client':
      exclude.add('byClient')
      break
    default:
      break
  }

  return all.filter((key) => !exclude.has(key))
}

export function getQuoteSummaryKeys(filter) {
  const valueStats = ['count', 'totalValue', 'avgValue']
  const wonStats = ['won', 'wonValue', 'conversionRate']
  const full = [...valueStats, ...wonStats, 'avgConversion', 'missingValue']

  if (!filter?.type) return full

  switch (filter.type) {
    case 'won':
      return ['count', 'totalValue', 'avgValue', 'wonValue', 'avgConversion']
    case 'conversion':
    case 'conversionType':
    case 'conversionBucketType':
      return ['count', 'avgConversion', 'avgSalesConversion', 'avgDefectConversion']
    case 'conversionBucket':
      return ['count', 'totalValue', 'avgValue', 'wonValue', 'avgConversion']
    case 'missingValue':
      return ['count', 'missingValue']
    case 'status':
      if (filter.value === 'EXPIRED' || filter.value === 'VOIDED') {
        return valueStats
      }
      return [...valueStats, ...wonStats]
    case 'type':
    case 'typeKey':
    case 'typeStatus':
    case 'month':
    case 'monthType':
    case 'branch':
    case 'salesperson':
    case 'client':
    case 'statusPivot':
    case 'touchpoint':
      return [...valueStats, ...wonStats]
    case 'all':
    default:
      return full
  }
}

export function getQuoteHiddenColumns(filter) {
  if (!filter?.type) return []

  const hidden = {
    status: ['status'],
    statusPivot: ['status'],
    typeStatus: ['status', 'type'],
    type: ['type'],
    typeKey: ['type'],
    monthType: ['type'],
    salesperson: ['salesperson'],
    branch: ['branch'],
    client: ['client'],
  }

  return hidden[filter.type] ?? []
}

export function getLeadBreakdownKeys(filter) {
  const all = ['bySource', 'byMonth']
  if (!filter?.type) return all

  const exclude = new Set()
  if (filter.type === 'source') exclude.add('bySource')
  if (filter.type === 'month') exclude.add('byMonth')

  return all.filter((key) => !exclude.has(key))
}

function buildQuoteBreakdowns(records, keys) {
  const won = records.filter((r) => r.isWon)
  const builders = {
    byStatus: () => sumByValue(records, (r) => r.status),
    byType: () => sumByValue(records, (r) => r.type),
    bySalesperson: () => sumByValue(records, (r) => r.salesperson).slice(0, 15),
    byBranch: () => sumByValue(records, (r) => r.branch).slice(0, 15),
    byClient: () => sumByValue(records, (r) => r.client).slice(0, 15),
    byMonth: () => sumByValue(records, (r) => r.monthLabel || '—'),
    byConversionBucket: () =>
      sumByValue(
        won.filter((r) => r.conversionBucket),
        (r) => r.conversionBucket,
      ),
  }

  const breakdowns = {}
  for (const key of keys) {
    if (builders[key]) breakdowns[key] = builders[key]()
  }
  return breakdowns
}

function buildLeadBreakdowns(records, keys) {
  const bySource = countBy(records, (r) => r.source)
  const byMonth = countBy(records, (r) => r.monthLabel || '—')
  const builders = {
    bySource: () => bySource.map((r) => ({ name: r.name, count: r.value, value: r.value })),
    byMonth: () => byMonth.map((r) => ({ name: r.name, count: r.value, value: r.value })),
  }

  const breakdowns = {}
  for (const key of keys) {
    if (builders[key]) breakdowns[key] = builders[key]()
  }
  return breakdowns
}

export function buildQuoteDrillDown(records, title, subtitle, filter) {
  const won = records.filter((r) => r.isWon)
  const totalValue = records.reduce((s, r) => s + (r.value || 0), 0)
  const wonValue = won.reduce((s, r) => s + (r.value || 0), 0)
  const conversionDays = won
    .map((r) => r.conversionDays)
    .filter((d) => d !== null && d !== undefined)
  const avgConversion =
    conversionDays.length > 0
      ? Math.round(conversionDays.reduce((a, b) => a + b, 0) / conversionDays.length)
      : null
  const salesWon = won.filter((r) => r.typeKey === 'service')
  const defectWon = won.filter((r) => r.typeKey === 'defect')
  const salesConversionDays = salesWon
    .map((r) => r.conversionDays)
    .filter((d) => d !== null && d !== undefined)
  const defectConversionDays = defectWon
    .map((r) => r.conversionDays)
    .filter((d) => d !== null && d !== undefined)
  const avgSalesConversion =
    salesConversionDays.length > 0
      ? Math.round(salesConversionDays.reduce((a, b) => a + b, 0) / salesConversionDays.length)
      : null
  const avgDefectConversion =
    defectConversionDays.length > 0
      ? Math.round(defectConversionDays.reduce((a, b) => a + b, 0) / defectConversionDays.length)
      : null

  const breakdownKeys = getQuoteBreakdownKeys(filter)
  const summaryKeys = getQuoteSummaryKeys(filter)
  const hiddenColumns = getQuoteHiddenColumns(filter)

  return {
    kind: 'quotes',
    title,
    subtitle,
    filter,
    breakdownKeys,
    summaryKeys,
    hiddenColumns,
    summary: {
      count: records.length,
      totalValue,
      avgValue: records.length > 0 ? Math.round((totalValue / records.length) * 100) / 100 : 0,
      wonCount: won.length,
      wonValue,
      conversionRate:
        records.length > 0 ? Math.round((won.length / records.length) * 1000) / 10 : 0,
      avgConversionDays: avgConversion,
      avgSalesConversionDays: avgSalesConversion,
      avgDefectConversionDays: avgDefectConversion,
      missingValueCount: records.filter((r) => r.hasMissingValue).length,
    },
    breakdowns: buildQuoteBreakdowns(records, breakdownKeys),
    records: [...records].sort((a, b) => {
      if (filter?.type?.startsWith('conversion')) {
        return (b.conversionDays ?? -1) - (a.conversionDays ?? -1)
      }
      return (b.value || 0) - (a.value || 0)
    }),
  }
}

export function buildLeadDrillDown(records, title, subtitle, filter) {
  const breakdownKeys = getLeadBreakdownKeys(filter)

  return {
    kind: 'leads',
    title,
    subtitle,
    breakdownKeys,
    summary: {
      count: records.length,
    },
    breakdowns: buildLeadBreakdowns(records, breakdownKeys),
    records: [...records].sort((a, b) => {
      const da = new Date(a.date) || 0
      const db = new Date(b.date) || 0
      return db - da
    }),
  }
}

export function filterQuotes(records, filter) {
  if (!filter || !records?.length) return []
  switch (filter.type) {
    case 'all':
      return records
    case 'won':
      return records.filter((r) => r.isWon)
    case 'conversion':
      return records.filter((r) => r.isWon && r.conversionDays != null)
    case 'conversionType':
      if (filter.typeKey === 'all') {
        return records.filter((r) => r.isWon && r.conversionDays != null)
      }
      return records.filter(
        (r) => r.isWon && r.conversionDays != null && r.typeKey === filter.typeKey,
      )
    case 'conversionBucketType':
      return records.filter(
        (r) =>
          r.isWon &&
          r.conversionBucket === filter.bucket &&
          r.type === filter.quoteType,
      )
    case 'missingValue':
      return records.filter((r) => r.hasMissingValue)
    case 'type':
      return records.filter((r) =>
        filter.value === 'Sales quotes' ? r.typeKey === 'service' : r.typeKey === 'defect'
      )
    case 'typeKey':
      return records.filter((r) => r.typeKey === filter.value)
    case 'status':
      return records.filter((r) => r.status === filter.value)
    case 'typeStatus':
      return records.filter((r) => r.type === filter.quoteType && r.status === filter.status)
    case 'month':
      return records.filter(
        (r) =>
          r.month === filter.value ||
          r.monthLabel === filter.value ||
          (filter.monthLabel && r.monthLabel === filter.monthLabel)
      )
    case 'monthType':
      return records.filter(
        (r) =>
          (filter.month ? r.month === filter.month : r.monthLabel === filter.monthLabel) &&
          r.type === filter.quoteType
      )
    case 'salesperson':
      return records.filter((r) => r.salesperson === filter.value)
    case 'branch':
      return records.filter((r) => r.branch === filter.value)
    case 'client':
      return records.filter((r) => r.client === filter.value)
    case 'reference':
      return records.filter((r) => r.reference === filter.value)
    case 'expiringSoon':
      return records.filter(
        (r) =>
          (r.status === 'DRAFT' || r.status === 'SUBMITTED') &&
          r.daysUntilExpiry != null &&
          r.daysUntilExpiry >= 0 &&
          r.daysUntilExpiry <= 7,
      )
    case 'overdueExpiry':
      return records.filter(
        (r) =>
          (r.status === 'DRAFT' || r.status === 'SUBMITTED') &&
          r.daysUntilExpiry != null &&
          r.daysUntilExpiry < 0,
      )
    case 'conversionBucket':
      return records.filter((r) => r.isWon && r.conversionBucket === filter.value)
    case 'touchpoint':
      if (filter.value === 'No touchpoint recorded') {
        return records.filter((r) => !r.hasTouchpoint)
      }
      if (filter.value === 'Email view') {
        return records.filter((r) => r.touchpoints.includes('Email'))
      }
      if (filter.value === 'Link view') {
        return records.filter((r) => r.touchpoints.includes('Link'))
      }
      if (filter.value === 'Customer portal') {
        return records.filter((r) => r.touchpoints.includes('Portal'))
      }
      return records
    case 'statusPivot':
      return records.filter((r) => r.status === filter.status)
    default:
      return records
  }
}

export function filterLeads(records, filter) {
  if (!filter || !records?.length) return []
  switch (filter.type) {
    case 'all':
      return records
    case 'source':
      return records.filter((r) => r.source === filter.value)
    case 'month':
      return records.filter(
        (r) =>
          r.month === filter.value ||
          r.monthLabel === filter.value ||
          r.monthLabel === filter.monthLabel
      )
    default:
      return records
  }
}
