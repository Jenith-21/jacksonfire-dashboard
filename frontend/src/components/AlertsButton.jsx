import { useEffect, useRef, useState } from 'react'
import { HeaderPopover } from './HeaderPopover'

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.3 21a1.94 1.94 0 0 0 3.4 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function AlertsButton({ alerts = [], onSelectAlert }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const count = alerts.length
  const hasCritical = alerts.some((alert) => alert.tone === 'critical')

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

  function handleSelect(alert) {
    onSelectAlert?.(alert)
    setOpen(false)
  }

  return (
    <div className="alerts-picker" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`header-icon-btn alerts-trigger ${count > 0 ? 'is-active' : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-label={`Alerts${count > 0 ? `: ${count} active` : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <BellIcon />
        {count > 0 && (
          <span className={`alerts-badge ${hasCritical ? 'is-critical' : ''}`}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      <HeaderPopover
        open={open}
        anchorRef={triggerRef}
        className="alerts-popover"
        role="dialog"
        aria-label="Dashboard alerts"
      >
        <div className="alerts-popover-head">
          <strong>Alerts</strong>
          <span>{count > 0 ? `${count} active` : 'All clear'}</span>
        </div>

        {count === 0 ? (
          <p className="alerts-empty">No active alerts for the current view.</p>
        ) : (
          <ul className="alerts-list">
            {alerts.map((alert) => (
              <li key={alert.id}>
                <button
                  type="button"
                  className={`alerts-item alerts-item--${alert.tone}`}
                  onClick={() => handleSelect(alert)}
                >
                  <span className="alerts-item-title">{alert.title}</span>
                  <span className="alerts-item-message">{alert.message}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </HeaderPopover>
    </div>
  )
}
