const WON_STATUSES = new Set(['APPROVED', 'COMPLETED', 'FINALISED', 'ACTIONED'])
const TERMINAL_STATUSES = new Set(['EXPIRED', 'VOIDED', 'CANCELLED', 'REJECTED'])

export const EXPIRY_WARNING_DAYS = 7

export function parseQuoteExpiryDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function getDaysUntilExpiry(expiryValue, from = new Date()) {
  const expiryDate = parseQuoteExpiryDate(expiryValue)
  if (!expiryDate) return null

  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const end = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate())
  return Math.round((end - start) / (1000 * 60 * 60 * 24))
}

export function isQuoteOpenForExpiry(record) {
  if (!record?.expiryDate) return false
  if (record.isWon || WON_STATUSES.has(record.status)) return false
  if (TERMINAL_STATUSES.has(record.status)) return false
  return true
}

export function withLiveExpiryFields(record, from = new Date()) {
  return {
    ...record,
    daysUntilExpiry: getDaysUntilExpiry(record.expiryDate, from),
  }
}

export function withLiveExpiryRecords(records, from = new Date()) {
  return (records ?? []).map((record) => withLiveExpiryFields(record, from))
}

export function getExpiringSoonQuotes(records, from = new Date(), withinDays = EXPIRY_WARNING_DAYS) {
  return withLiveExpiryRecords(records, from)
    .filter(
      (record) =>
        isQuoteOpenForExpiry(record) &&
        record.daysUntilExpiry != null &&
        record.daysUntilExpiry >= 0 &&
        record.daysUntilExpiry <= withinDays,
    )
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
}

export function getOverdueExpiryQuotes(records, from = new Date()) {
  return withLiveExpiryRecords(records, from)
    .filter(
      (record) =>
        isQuoteOpenForExpiry(record) &&
        record.daysUntilExpiry != null &&
        record.daysUntilExpiry < 0,
    )
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
}
