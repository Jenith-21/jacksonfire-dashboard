export function formatCurrency(value) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
