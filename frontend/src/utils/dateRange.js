export function parseRecordDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function toInputDate(date) {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function fromInputDate(value) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

export function getQuoteDateBounds(records = []) {
  let min = null
  let max = null

  for (const record of records) {
    const date = parseRecordDate(record.created)
    if (!date) continue
    if (!min || date < min) min = date
    if (!max || date > max) max = date
  }

  return { min, max }
}

export function isDateInRange(date, range) {
  if (!date) return false
  if (!range?.from && !range?.to) return true

  const time = date.getTime()
  if (range.from && time < startOfDay(range.from).getTime()) return false
  if (range.to && time > endOfDay(range.to).getTime()) return false
  return true
}

export function filterQuoteRecordsByDateRange(records = [], range) {
  if (!range?.from && !range?.to) return records
  return records.filter((record) => isDateInRange(parseRecordDate(record.created), range))
}

export function filterLeadRecordsByDateRange(records = [], range) {
  if (!range?.from && !range?.to) return records
  return records.filter((record) => isDateInRange(parseRecordDate(record.date), range))
}

export function formatDateRangeLabel(range) {
  if (!range?.from && !range?.to) return 'All time'
  const fmt = (date) =>
    date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  if (range.from && range.to) return `${fmt(range.from)} – ${fmt(range.to)}`
  if (range.from) return `From ${fmt(range.from)}`
  return `Until ${fmt(range.to)}`
}

export const DATE_PRESETS = [
  { id: 'all', label: 'All time' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: '12m', label: 'Last 12 months' },
  { id: 'ytd', label: 'Year to date' },
  { id: 'custom', label: 'Custom' },
]

export function getPresetRange(presetId, bounds) {
  const today = endOfDay(new Date())
  const max = bounds?.max ? endOfDay(bounds.max) : today

  switch (presetId) {
    case 'all':
      return { preset: 'all', from: null, to: null }
    case '30d':
      return {
        preset: '30d',
        from: startOfDay(new Date(max.getTime() - 29 * 24 * 60 * 60 * 1000)),
        to: max,
      }
    case '90d':
      return {
        preset: '90d',
        from: startOfDay(new Date(max.getTime() - 89 * 24 * 60 * 60 * 1000)),
        to: max,
      }
    case '12m':
      return {
        preset: '12m',
        from: startOfDay(new Date(max.getFullYear() - 1, max.getMonth(), max.getDate())),
        to: max,
      }
    case 'ytd':
      return {
        preset: 'ytd',
        from: startOfDay(new Date(max.getFullYear(), 0, 1)),
        to: max,
      }
    default:
      return {
        preset: 'custom',
        from: bounds?.min ? startOfDay(bounds.min) : null,
        to: max,
      }
  }
}
