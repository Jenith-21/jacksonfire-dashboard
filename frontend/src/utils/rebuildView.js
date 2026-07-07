import {
  filterLeadRecordsByDateRange,
  filterQuoteRecordsByDateRange,
} from './dateRange'

function round2(value) {
  return Math.round(value * 100) / 100
}

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

function buildSummary(records) {
  const service = records.filter((r) => r.typeKey === 'service')
  const defect = records.filter((r) => r.typeKey === 'defect')
  const serviceValue = service.reduce((sum, r) => sum + (r.value || 0), 0)
  const defectValue = defect.reduce((sum, r) => sum + (r.value || 0), 0)
  const won = records.filter((r) => r.isWon)
  const wonValue = won.reduce((sum, r) => sum + (r.value || 0), 0)
  const conversionDays = won.map((r) => r.conversionDays).filter((d) => d != null)
  const avgConversionDays =
    conversionDays.length > 0
      ? Math.round(conversionDays.reduce((a, b) => a + b, 0) / conversionDays.length)
      : null
  const withTouchpoints = records.filter((r) => r.hasTouchpoint).length
  const missingValue = records.filter((r) => r.hasMissingValue).length
  const expiredQuotes = records.filter((r) => r.status === 'EXPIRED')
  const unassignedBranchQuotes = records.filter((r) => r.branch === '(Unassigned)')
  const unassignedValue = unassignedBranchQuotes.reduce((sum, r) => sum + (r.value || 0), 0)
  const totalVal = serviceValue + defectValue

  return {
    totalQuotes: records.length,
    totalValue: round2(totalVal),
    salesQuotes: service.length,
    defectQuotes: defect.length,
    salesValue: round2(serviceValue),
    defectValue: round2(defectValue),
    avgQuoteValue: records.length > 0 ? round2(totalVal / records.length) : 0,
    quotesMissingValue: missingValue,
    missingValueRate: records.length > 0 ? round2((missingValue / records.length) * 100) : 0,
    expiredQuotes: expiredQuotes.length,
    expiredQuoteRate:
      records.length > 0 ? round2((expiredQuotes.length / records.length) * 100) : 0,
    unassignedValue: round2(unassignedValue),
    unassignedValueRate: totalVal > 0 ? round2((unassignedValue / totalVal) * 100) : 0,
    wonQuotes: won.length,
    wonValue: round2(wonValue),
    conversionRate:
      records.length > 0 ? Math.round((won.length / records.length) * 1000) / 10 : 0,
    avgConversionDays,
    touchpointQuotes: withTouchpoints,
    touchpointRate:
      records.length > 0 ? Math.round((withTouchpoints / records.length) * 1000) / 10 : 0,
  }
}

function buildQuoteStatusBreakdown(records) {
  const map = {}
  for (const record of records) {
    const key = `${record.type}|${record.status}`
    if (!map[key]) {
      map[key] = {
        quoteType: record.type,
        status: record.status,
        quoteCount: 0,
        totalValue: 0,
      }
    }
    map[key].quoteCount++
    map[key].totalValue += record.value || 0
  }

  return Object.values(map)
    .map((row) => ({
      id: `${row.quoteType}-${row.status}`,
      quoteType: row.quoteType,
      status: row.status,
      quoteCount: row.quoteCount,
      totalValue: round2(row.totalValue),
      averageValue: row.quoteCount > 0 ? round2(row.totalValue / row.quoteCount) : 0,
    }))
    .sort(
      (a, b) => a.quoteType.localeCompare(b.quoteType) || b.quoteCount - a.quoteCount,
    )
}

function buildStatusPivot(records) {
  const map = {}
  for (const record of records) {
    if (!map[record.status]) {
      map[record.status] = { status: record.status, salesQuote: 0, defectQuote: 0 }
    }
    if (record.typeKey === 'service') map[record.status].salesQuote++
    else map[record.status].defectQuote++
  }

  return Object.values(map)
    .map((row) => ({
      id: `pivot-${row.status}`,
      status: row.status,
      salesQuote: row.salesQuote,
      defectQuote: row.defectQuote,
      total: row.salesQuote + row.defectQuote,
    }))
    .sort((a, b) => b.total - a.total)
}

function buildMonthlyQuoteDetail(records) {
  const map = {}
  for (const record of records) {
    if (!record.month) continue
    if (!map[record.month]) {
      map[record.month] = {
        month: record.month,
        monthLabel: record.monthLabel,
        quoteCount: 0,
        totalValue: 0,
      }
    }
    map[record.month].quoteCount++
    map[record.month].totalValue += record.value || 0
  }

  return Object.values(map)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((row) => ({
      id: row.month,
      month: row.monthLabel,
      monthKey: row.month,
      quoteCount: row.quoteCount,
      totalValue: round2(row.totalValue),
      averageValue: row.quoteCount > 0 ? round2(row.totalValue / row.quoteCount) : 0,
    }))
}

function buildMonthlyBreakdown(records) {
  const map = {}
  for (const record of records) {
    if (!record.month) continue
    if (!map[record.month]) {
      map[record.month] = {
        month: record.month,
        label: record.monthLabel,
        count: 0,
        salesCount: 0,
        defectCount: 0,
        value: 0,
        won: 0,
      }
    }
    map[record.month].count++
    if (record.typeKey === 'service') map[record.month].salesCount++
    else map[record.month].defectCount++
    map[record.month].value += record.value || 0
    if (record.isWon) map[record.month].won++
  }

  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month))
}

function buildTopClients(records, limit = 10) {
  const map = {}
  for (const record of records) {
    const client = record.client || '(Unknown client)'
    if (!map[client]) map[client] = { client, quotes: 0, value: 0, won: 0, wonValue: 0 }
    map[client].quotes++
    map[client].value += record.value || 0
    if (record.isWon) {
      map[client].won++
      map[client].wonValue += record.value || 0
    }
  }

  return Object.values(map)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

function buildSalespersonLeague(records) {
  const map = {}
  for (const record of records) {
    const person = record.salesperson
    if (!map[person]) {
      map[person] = {
        name: person,
        quotesCreated: 0,
        quotesWon: 0,
        totalQuotedValue: 0,
        wonValue: 0,
        conversionDays: [],
      }
    }
    const row = map[person]
    row.quotesCreated++
    row.totalQuotedValue += record.value || 0
    if (record.isWon) {
      row.quotesWon++
      row.wonValue += record.value || 0
      if (record.conversionDays != null) row.conversionDays.push(record.conversionDays)
    }
  }

  return Object.values(map)
    .map((row) => ({
      name: row.name,
      quotesCreated: row.quotesCreated,
      quotesWon: row.quotesWon,
      conversionRate:
        row.quotesCreated > 0
          ? Math.round((row.quotesWon / row.quotesCreated) * 1000) / 10
          : 0,
      totalQuotedValue: round2(row.totalQuotedValue),
      wonValue: round2(row.wonValue),
      avgQuoteValue:
        row.quotesCreated > 0 ? round2(row.totalQuotedValue / row.quotesCreated) : 0,
      avgConversionDays:
        row.conversionDays.length > 0
          ? Math.round(row.conversionDays.reduce((a, b) => a + b, 0) / row.conversionDays.length)
          : null,
      efficiencyScore:
        row.quotesCreated > 0 ? round2(row.wonValue / row.quotesCreated) : 0,
    }))
    .sort((a, b) => {
      if (a.name === '(Unassigned)') return 1
      if (b.name === '(Unassigned)') return -1
      return b.efficiencyScore - a.efficiencyScore
    })
}

function buildBranchLeague(records) {
  const map = {}
  for (const record of records) {
    const branch = record.branch
    if (!map[branch]) {
      map[branch] = {
        branch,
        quotes: 0,
        value: 0,
        won: 0,
        wonValue: 0,
        expired: 0,
        salesQuotes: 0,
        defectQuotes: 0,
      }
    }
    const row = map[branch]
    row.quotes++
    row.value += record.value || 0
    if (record.typeKey === 'service') row.salesQuotes++
    else row.defectQuotes++
    if (record.status === 'EXPIRED') row.expired++
    if (record.isWon) {
      row.won++
      row.wonValue += record.value || 0
    }
  }

  const totalValue = records.reduce((sum, r) => sum + (r.value || 0), 0)

  return Object.values(map)
    .map((row) => ({
      ...row,
      value: round2(row.value),
      wonValue: round2(row.wonValue),
      conversionRate: row.quotes > 0 ? Math.round((row.won / row.quotes) * 1000) / 10 : 0,
      expiredRate: row.quotes > 0 ? Math.round((row.expired / row.quotes) * 1000) / 10 : 0,
      valueShare: totalValue > 0 ? Math.round((row.value / totalValue) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.value - a.value)
}

function buildTouchpoints(records) {
  let email = 0
  let link = 0
  let portal = 0
  let none = 0

  for (const record of records) {
    if (record.touchpoints?.includes('Email')) email++
    if (record.touchpoints?.includes('Link')) link++
    if (record.touchpoints?.includes('Portal')) portal++
    if (!record.hasTouchpoint) none++
  }

  return [
    { name: 'Email view', value: email },
    { name: 'Link view', value: link },
    { name: 'Customer portal', value: portal },
    { name: 'No touchpoint recorded', value: none },
  ]
}

function buildConversionTiming(records) {
  const buckets = {
    '0–7 days': 0,
    '8–14 days': 0,
    '15–30 days': 0,
    '31–60 days': 0,
    '60+ days': 0,
  }

  for (const record of records.filter((r) => r.isWon)) {
    const days = record.conversionDays
    if (days == null) continue
    if (days <= 7) buckets['0–7 days']++
    else if (days <= 14) buckets['8–14 days']++
    else if (days <= 30) buckets['15–30 days']++
    else if (days <= 60) buckets['31–60 days']++
    else buckets['60+ days']++
  }

  return Object.entries(buckets).map(([name, value]) => ({ name, value }))
}

export function rebuildViewFromRecords(records) {
  return {
    summary: buildSummary(records),
    quoteTypeSplit: [
      { name: 'Sales quotes', value: records.filter((r) => r.typeKey === 'service').length },
      { name: 'Defect quotes', value: records.filter((r) => r.typeKey === 'defect').length },
    ],
    statusBreakdown: countBy(records, (r) => r.status),
    quoteStatusBreakdown: buildQuoteStatusBreakdown(records),
    statusPivot: buildStatusPivot(records),
    monthlyQuoteDetail: buildMonthlyQuoteDetail(records),
    monthlyBreakdown: buildMonthlyBreakdown(records),
    topClients: buildTopClients(records),
    salespersonLeague: buildSalespersonLeague(records),
    branchLeague: buildBranchLeague(records),
    touchpoints: buildTouchpoints(records),
    conversionTiming: buildConversionTiming(records),
    quoteRecords: records,
  }
}

export function rebuildLeadSummary(leadRecords, baseSummary = {}) {
  const total = leadRecords.length
  const bySourceRaw = countBy(leadRecords, (lead) => lead.source || 'Unknown')

  const monthlyMap = {}
  for (const lead of leadRecords) {
    if (!lead.month) continue
    if (!monthlyMap[lead.month]) {
      monthlyMap[lead.month] = { month: lead.month, label: lead.monthLabel, count: 0 }
    }
    monthlyMap[lead.month].count++
  }

  return {
    ...baseSummary,
    total,
    bySource: bySourceRaw.map((row) => ({
      ...row,
      percent: total > 0 ? round2((row.value / total) * 100) : 0,
    })),
    monthlyLeads: Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)),
    leadRecords,
  }
}


export function applyDateRangeToDashboard(data, dateRange) {
  if (!data) return null
  if (!dateRange?.from && !dateRange?.to) return data

  const filteredHeadOffice = filterQuoteRecordsByDateRange(
    data.headOffice?.quoteRecords ?? [],
    dateRange,
  )
  const filteredManchester = filterQuoteRecordsByDateRange(
    data.manchester?.quoteRecords ?? [],
    dateRange,
  )
  const filteredLeads = filterLeadRecordsByDateRange(
    data.leadSummary?.leadRecords ?? [],
    dateRange,
  )

  return {
    ...data,
    headOffice: rebuildViewFromRecords(filteredHeadOffice),
    manchester: rebuildViewFromRecords(filteredManchester),
    leadSummary: rebuildLeadSummary(filteredLeads, data.leadSummary),
    dateRangeApplied: true,
  }
}
