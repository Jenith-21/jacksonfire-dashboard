import {
  EXPIRY_WARNING_DAYS,
  getExpiringSoonQuotes,
  getOverdueExpiryQuotes,
  isQuoteOpenForExpiry,
} from './quoteExpiry'

function formatExpiryTitle(daysUntilExpiry) {
  if (daysUntilExpiry === 0) return 'Quote Expires Today'
  if (daysUntilExpiry === 1) return 'Quote Expires Tomorrow'
  return `Quote Expires in ${daysUntilExpiry} Days`
}

export function buildDashboardAlerts(records = [], summary = {}, now = new Date()) {
  const alerts = []
  const expiringSoon = getExpiringSoonQuotes(records, now, EXPIRY_WARNING_DAYS)
  const overdueOpen = getOverdueExpiryQuotes(records, now)

  if (expiringSoon.length > 0) {
    const hasCritical = expiringSoon.some((record) => record.daysUntilExpiry <= 3)
    alerts.push({
      id: 'summary-expiring-soon',
      tone: hasCritical ? 'critical' : 'warn',
      title: `${expiringSoon.length} Quote${expiringSoon.length === 1 ? '' : 's'} Expiring Within ${EXPIRY_WARNING_DAYS} Days`,
      message: `Next up: ${expiringSoon[0].reference} · ${expiringSoon[0].client} · ${formatExpiryTitle(expiringSoon[0].daysUntilExpiry)}`,
      filter: { type: 'expiringSoon' },
      drillTitle: `Quotes expiring within ${EXPIRY_WARNING_DAYS} days`,
      drillSubtitle: `${expiringSoon.length} open quotes with upcoming expiry dates`,
    })
  }

  for (const record of expiringSoon.slice(0, 8)) {
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

  if (overdueOpen.length > 0) {
    alerts.push({
      id: 'summary-overdue-expiry',
      tone: 'critical',
      title: `${overdueOpen.length} Quote${overdueOpen.length === 1 ? '' : 's'} Past Expiry`,
      message: `${overdueOpen[0].reference} · ${overdueOpen[0].client} · still ${overdueOpen[0].status}`,
      filter: { type: 'overdueExpiry' },
      drillTitle: 'Quotes past expiry',
      drillSubtitle: `${overdueOpen.length} open quotes past their expiry date`,
    })
  }

  for (const record of overdueOpen.slice(0, 4)) {
    alerts.push({
      id: `expiry-overdue-${record.id}`,
      tone: 'critical',
      title: 'Quote Is Past Expiry',
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
      title: 'High Expiry Rate',
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
      title: 'Quotes Missing Branch',
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
      title: 'Quotes With Missing Values',
      message: `${summary.missingValueRate}% of quotes have no value recorded (${(summary.quotesMissingValue ?? 0).toLocaleString()} quotes)`,
      filter: { type: 'missingValue' },
      drillTitle: 'Quotes with missing values',
      drillSubtitle: `${summary.quotesMissingValue ?? 0} zero-value quotes`,
    })
  }

  return alerts
}

export { isQuoteOpenForExpiry, formatExpiryTitle }
