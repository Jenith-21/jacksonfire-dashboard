import { useEffect, useRef, useState } from 'react'
import {
  formatDateRangeLabel,
  fromInputDate,
  getQuoteDateBounds,
  toInputDate,
} from '../utils/dateRange'
import { HeaderPopover } from './HeaderPopover'

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 2v3M16 2v3M4 9h16M5 5h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function DateRangeFilter({ value, bounds, onChange }) {
  const [open, setOpen] = useState(false)
  const [draftFrom, setDraftFrom] = useState('')
  const [draftTo, setDraftTo] = useState('')
  const rootRef = useRef(null)
  const triggerRef = useRef(null)

  const hasFilter = Boolean(value?.from || value?.to)

  useEffect(() => {
    if (!open) return undefined
    setDraftFrom(toInputDate(value?.from))
    setDraftTo(toInputDate(value?.to))

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
  }, [open, value])

  function handleApply() {
    const from = fromInputDate(draftFrom)
    const to = fromInputDate(draftTo)
    onChange({ from, to })
    setOpen(false)
  }

  function handleClear() {
    onChange({ from: null, to: null })
    setDraftFrom('')
    setDraftTo('')
    setOpen(false)
  }

  return (
    <div className="date-range-picker" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`header-icon-btn date-range-trigger ${hasFilter ? 'is-active' : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-label={`Date range: ${formatDateRangeLabel(value)}`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <CalendarIcon />
        <span className="header-btn-text date-range-trigger-label">
          {formatDateRangeLabel(value)}
        </span>
      </button>

      <HeaderPopover
        open={open}
        anchorRef={triggerRef}
        className="date-range-popover"
        role="dialog"
        aria-label="Select date range"
      >
        <div className="date-range-popover-head">
          <strong>Select Date Range</strong>
          {hasFilter && (
            <button type="button" className="date-range-clear" onClick={handleClear}>
              Clear
            </button>
          )}
        </div>

        <div className="date-range-fields">
          <label className="date-range-field">
            <span>Start</span>
            <input
              type="date"
              value={draftFrom}
              min={toInputDate(bounds?.min)}
              max={draftTo || toInputDate(bounds?.max)}
              onChange={(e) => setDraftFrom(e.target.value)}
            />
          </label>
          <label className="date-range-field">
            <span>End</span>
            <input
              type="date"
              value={draftTo}
              min={draftFrom || toInputDate(bounds?.min)}
              max={toInputDate(bounds?.max)}
              onChange={(e) => setDraftTo(e.target.value)}
            />
          </label>
        </div>

        <button type="button" className="date-range-apply" onClick={handleApply}>
          Apply
        </button>
      </HeaderPopover>
    </div>
  )
}

export function getInitialDateRange() {
  return { from: null, to: null }
}

export function getDashboardDateBounds(data) {
  return getQuoteDateBounds([
    ...(data?.headOffice?.quoteRecords ?? []),
    ...(data?.manchester?.quoteRecords ?? []),
  ])
}
