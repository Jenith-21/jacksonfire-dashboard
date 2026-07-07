function getSortValue(row, column) {
  if (column.sortValue) return column.sortValue(row)
  const raw = row[column.key]
  if (raw == null || raw === '') return null
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string') {
    const numeric = Number(String(raw).replace(/[^0-9.-]/g, ''))
    if (Number.isFinite(numeric) && /[%£$€]|value|rate|days/i.test(column.key + column.label)) {
      return numeric
    }
    return raw.toLowerCase()
  }
  return raw
}

function compareValues(a, b) {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

export function sortRows(rows, sortKey, direction, columns = []) {
  if (!sortKey || !rows?.length) return rows ?? []

  const column = columns.find((col) => col.key === sortKey)
  const factor = direction === 'desc' ? -1 : 1

  return [...rows].sort((left, right) => {
    const result = compareValues(
      getSortValue(left, column ?? { key: sortKey }),
      getSortValue(right, column ?? { key: sortKey }),
    )
    return result * factor
  })
}

export function sortRowsPinnedBottom(rows, sortKey, direction, columns = [], pinnedNames = [], nameKey = 'name') {
  if (!rows?.length) return rows ?? []

  const pinned = new Set(pinnedNames)
  const ranked = rows.filter((row) => !pinned.has(row[nameKey]))
  const unranked = rows.filter((row) => pinned.has(row[nameKey]))

  if (!sortKey) return [...ranked, ...unranked]

  return [...sortRows(ranked, sortKey, direction, columns), ...unranked]
}

export function nextSortState(current, key) {
  if (current?.key !== key) return { key, direction: 'asc' }
  return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
}
