function unwrapChartPayload(entry) {
  if (!entry || typeof entry !== 'object') return null

  let current = entry
  for (let depth = 0; depth < 4; depth += 1) {
    if (current.quoteType || current.label || current.name || current.month) {
      return current
    }
    const next = current.payload
    if (!next || typeof next !== 'object' || next === current) break
    current = next
  }

  return current.quoteType || current.label || current.name || current.month ? current : null
}

export function getChartClickPayload(entry) {
  return unwrapChartPayload(entry)
}

export function getChartClickValue(entry, key) {
  const payload = getChartClickPayload(entry)
  if (!payload || key == null) return undefined
  return payload[key]
}
