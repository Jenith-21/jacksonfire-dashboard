export default function SortableTh({ column, sort, onSort, className = '' }) {
  if (column.sortable === false) {
    return (
      <th className={className} scope="col">
        {column.label}
      </th>
    )
  }

  const active = sort?.key === column.key
  const direction = active ? sort.direction : undefined

  return (
    <th className={`sortable-th ${className}`.trim()} scope="col">
      <button
        type="button"
        className={`sortable-th-btn ${active ? 'is-active' : ''}`}
        onClick={() => onSort(column.key)}
        aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <span>{column.label}</span>
        <span className="sort-indicator" aria-hidden="true">
          {active ? (direction === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </button>
    </th>
  )
}
