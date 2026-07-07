import { useEffect, useRef, useState } from 'react'
import { HeaderPopover } from './HeaderPopover'

export const QUOTE_TYPE_OPTIONS = [
  { value: 'all', label: 'All Quotes', shortLabel: 'All' },
  { value: 'service', label: 'Sales Only', shortLabel: 'Sales' },
  { value: 'defect', label: 'Defect Only', shortLabel: 'Defect' },
]

export function getQuoteTypeLabel(value) {
  const option = QUOTE_TYPE_OPTIONS.find((item) => item.value === value) ?? QUOTE_TYPE_OPTIONS[0]
  return option.label
}

function QuoteTypeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 6h16M7 12h10M10 18h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function QuoteTypeFilter({ value = 'all', onChange }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const isActive = value !== 'all'

  useEffect(() => {
    if (!open) return undefined

    function handleClick(event) {
      if (
        !rootRef.current?.contains(event.target) &&
        !event.target.closest('[data-header-popover]')
      ) {
        setOpen(false)
      }
    }

    function handleKey(event) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClick)
    window.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function handleSelect(nextValue) {
    onChange(nextValue)
    setOpen(false)
  }

  return (
    <div className="quote-type-picker" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`header-icon-btn quote-type-trigger ${isActive ? 'is-active' : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-label={`Quote type: ${getQuoteTypeLabel(value)}`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <QuoteTypeIcon />
      </button>

      <HeaderPopover
        open={open}
        anchorRef={triggerRef}
        className="quote-type-popover"
        role="dialog"
        aria-label="Select quote type"
      >
        <div className="quote-type-popover-head">
          <strong>Quote Type</strong>
          <span>{getQuoteTypeLabel(value)}</span>
        </div>
        <div className="quote-type-options">
          {QUOTE_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`quote-type-option ${value === option.value ? 'is-selected' : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </HeaderPopover>
    </div>
  )
}
