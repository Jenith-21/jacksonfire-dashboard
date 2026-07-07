const QUOTE_TYPE_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'service', label: 'Sales' },
  { id: 'defect', label: 'Defect' },
]

export default function QuoteTypeSwitcher({ value = 'all', onChange, compact = true, className = '' }) {
  const activeIndex = Math.max(0, QUOTE_TYPE_OPTIONS.findIndex((option) => option.id === value))

  return (
    <nav
      className={`view-nav view-nav--triple ${compact ? 'view-nav--widget' : ''} ${className}`.trim()}
      aria-label="Quote type filter"
    >
      <div className="view-nav-track" style={{ '--view-active-index': activeIndex }}>
        <span className="view-nav-indicator" aria-hidden="true" />
        {QUOTE_TYPE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={value === option.id}
            className={`view-nav-item ${value === option.id ? 'active' : ''}`}
            onClick={() => onChange(option.id)}
          >
            <span className="view-nav-label">{option.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
