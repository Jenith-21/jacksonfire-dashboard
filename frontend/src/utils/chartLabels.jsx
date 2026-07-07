import { formatCurrency } from './format'

export function formatCountLabel(value) {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return ''
  return num.toLocaleString()
}

export function formatCompactCurrencyLabel(value) {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return ''
  return formatCurrency(num)
}

export function formatPercentLabel(value) {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return ''
  return `${num}%`
}

export function createStackSegmentLabel(minHeight = 24) {
  return function StackSegmentLabel(props) {
    const { x = 0, y = 0, width = 0, height = 0, value } = props
    const num = Number(value)
    if (!Number.isFinite(num) || num <= 0 || height < minHeight) return null

    return (
      <text
        x={x + width / 2}
        y={y + height / 2}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={height < 30 ? 9 : 10}
        fontWeight={700}
        pointerEvents="none"
      >
        {num.toLocaleString()}
      </text>
    )
  }
}

export function createBarTopLabel() {
  return function BarTopLabel(props) {
    const { x = 0, y = 0, width = 0, value } = props
    const num = Number(value)
    if (!Number.isFinite(num) || num <= 0) return null

    return (
      <text
        x={x + width / 2}
        y={y - 6}
        fill="#1f2937"
        textAnchor="middle"
        fontSize={10}
        fontWeight={700}
        pointerEvents="none"
      >
        {num.toLocaleString()}
      </text>
    )
  }
}

export function createBarEndLabel(minWidth = 28) {
  return function BarEndLabel(props) {
    const { x = 0, y = 0, width = 0, height = 0, value } = props
    const num = Number(value)
    if (!Number.isFinite(num) || num <= 0 || width < minWidth) return null

    return (
      <text
        x={x + width + 6}
        y={y + height / 2}
        fill="#1f2937"
        textAnchor="start"
        dominantBaseline="central"
        fontSize={10}
        fontWeight={700}
        pointerEvents="none"
      >
        {num.toLocaleString()}
      </text>
    )
  }
}

const SALES_DEFECT_SERIES_ORDER = ['Sales quotes', 'Defect quotes', 'Value']

export function sortSalesDefectSeries(items = []) {
  return [...items].sort((a, b) => {
    const aIndex = SALES_DEFECT_SERIES_ORDER.indexOf(a.name ?? a.value)
    const bIndex = SALES_DEFECT_SERIES_ORDER.indexOf(b.name ?? b.value)
    if (aIndex === -1 && bIndex === -1) return 0
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })
}

export function salesDefectLegendPayload(salesColor, defectColor) {
  return [
    { value: 'Sales quotes', type: 'square', color: salesColor },
    { value: 'Defect quotes', type: 'square', color: defectColor },
  ]
}

export function ChartLegendItems({ items = [] }) {
  return (
    <div className="chart-legend" role="list" aria-label="Chart legend">
      {items.map((item) => (
        <span key={item.value} className="chart-legend-item" role="listitem">
          <span className="chart-legend-swatch" style={{ backgroundColor: item.color }} aria-hidden="true" />
          <span>{item.value}</span>
        </span>
      ))}
    </div>
  )
}

export function SalesDefectLegendContent({ salesColor, defectColor }) {
  return (
    <ChartLegendItems
      items={salesDefectLegendPayload(salesColor, defectColor).map((item) => ({
        value: item.value,
        color: item.color,
      }))}
    />
  )
}
