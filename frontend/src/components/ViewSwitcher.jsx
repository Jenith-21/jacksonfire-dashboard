const VIEWS = [
  {
    id: 'headOffice',
    label: 'Head Office',
    description: 'All branches',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'manchester',
    label: 'Manchester',
    description: 'Branch view',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.75" />
      </svg>
    ),
  },
]

export default function ViewSwitcher({ activeView, onChange, compact = false }) {
  const activeIndex = Math.max(0, VIEWS.findIndex((v) => v.id === activeView))

  return (
    <nav className={`view-nav ${compact ? 'view-nav--compact' : ''}`} aria-label="Dashboard view">
      <div
        className="view-nav-track"
        style={{ '--view-active-index': activeIndex }}
      >
        <span className="view-nav-indicator" aria-hidden="true" />
        {VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            role="tab"
            aria-selected={activeView === view.id}
            className={`view-nav-item ${activeView === view.id ? 'active' : ''}`}
            onClick={() => onChange(view.id)}
          >
            <span className="view-nav-icon">{view.icon}</span>
            <span className="view-nav-text">
              <span className="view-nav-label">{view.label}</span>
              {!compact && <span className="view-nav-desc">{view.description}</span>}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}
