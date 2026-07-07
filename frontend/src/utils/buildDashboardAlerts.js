const OPEN_STATUSES = new Set(['DRAFT', 'SUBMITTED'])

function formatExpiryTitle(daysUntilExpiry) {
  if (daysUntilExpiry === 0) return 'Quote expires today'
  if (daysUntilExpiry === 1) return 'Quote expires tomorrow'
  return `Quote expires in ${daysUntilExpiry} days`
}

export function buildDashboardAlerts(records = [], summary = {}) {
  const alerts = []
  const openRecords = records.filter((record) => OPEN_STATUSES.has(record.status))

  const expiringSoon = openRecords
    .filter(
      (record) =>
        record.daysUntilExpiry != null &&
        record.daysUntilExpiry >= 0 &&
        record.daysUntilExpiry <= 7,
    )
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)

  for (const record of expiringSoon.slice(0, 6)) {
    alerts.push({
      id: `expiry-soon-${record.id}`,
      tone: record.daysUntilExpiry <= 3 ? 'critical' : 'warn',
      title: formatExpiryTitle(record.daysUntilExpiry),
      message: `${record.reference} · ${record.client} · ${record.salesperson}`,
      filter: { type: 'reference', value: record.reference },
      drillTitle: `Expiring soon: ${record.reference}`,
      drillSubtitle: `${record.client} · expires ${record.expiryDate || 'soon'}`,
    })
  }

  const overdueOpen = openRecords
    .filter((record) => record.daysUntilExpiry != null && record.daysUntilExpiry < 0)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)

  for (const record of overdueOpen.slice(0, 4)) {
    alerts.push({
      id: `expiry-overdue-${record.id}`,
      tone: 'critical',
      title: 'Quote is past expiry',
      message: `${record.reference} · ${record.client} · still ${record.status}`,
      filter: { type: 'reference', value: record.reference },
      drillTitle: `Past expiry: ${record.reference}`,
      drillSubtitle: `${record.client} · ${record.status}`,
    })
  }

  if ((summary.expiredQuoteRate ?? 0) >= 20) {
    alerts.push({
      id: 'summary-expired-rate',
      tone: 'warn',
      title: 'High expiry rate',
      message: `${summary.expiredQuoteRate}% of quotes have already expired (${(summary.expiredQuotes ?? 0).toLocaleString()} quotes)`,
      filter: { type: 'status', value: 'EXPIRED' },
      drillTitle: 'Expired quotes',
      drillSubtitle: `${summary.expiredQuotes ?? 0} quotes with EXPIRED status`,
    })
  }

  if ((summary.unassignedQuoteRate ?? 0) >= 10) {
    alerts.push({
      id: 'summary-unassigned-branch',
      tone: 'warn',
      title: 'Quotes missing branch',
      message: `${summary.unassignedQuoteRate}% of quotes have no branch assigned (${(summary.unassignedQuotes ?? 0).toLocaleString()} quotes)`,
      filter: { type: 'branch', value: '(Unassigned)' },
      drillTitle: 'Unassigned branch quotes',
      drillSubtitle: `${summary.unassignedQuotes ?? 0} quotes with no branch`,
    })
  }

  if ((summary.missingValueRate ?? 0) >= 5) {
    alerts.push({
      id: 'summary-missing-value',
      tone: 'info',
      title: 'Quotes with missing values',
      message: `${summary.missingValueRate}% of quotes have no value recorded (${(summary.quotesMissingValue ?? 0).toLocaleString()} quotes)`,
      filter: { type: 'missingValue' },
      drillTitle: 'Quotes with missing values',
      drillSubtitle: `${summary.quotesMissingValue ?? 0} zero-value quotes`,
    })
  }

  return alerts
}
