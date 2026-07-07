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
