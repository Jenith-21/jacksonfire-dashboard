import { formatCurrency } from '../utils/format'
import { sortSalesDefectSeries } from '../utils/chartLabels.jsx'

export default function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  const formatValue = (entry) => {
    if (entry.name === 'Value') return formatCurrency(entry.value)
    return entry.value?.toLocaleString?.() ?? entry.value
  }

  const items = sortSalesDefectSeries(payload)

  return (
    <div className="chart-tooltip">
      {label && <p className="chart-tooltip-label">{label}</p>}
      <ul className="chart-tooltip-list">
        {items.map((entry) => (
          <li key={entry.name} style={{ '--tip-color': entry.color || entry.fill }}>
            <span className="chart-tooltip-dot" />
            <span className="chart-tooltip-name">{entry.name === 'value' ? 'Quotes' : entry.name}</span>
            <span className="chart-tooltip-value">{formatValue(entry)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
