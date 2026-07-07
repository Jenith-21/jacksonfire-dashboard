import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export function useHeaderPopoverPosition(open, anchorRef) {
  const [style, setStyle] = useState(null)

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setStyle(null)
      return undefined
    }

    function update() {
      const rect = anchorRef.current.getBoundingClientRect()
      setStyle({
        position: 'fixed',
        top: rect.bottom + 6,
        right: Math.max(16, window.innerWidth - rect.right),
        zIndex: 300,
      })
    }

    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, anchorRef])

  return style
}

export function HeaderPopover({ open, anchorRef, className, children, ...props }) {
  const style = useHeaderPopoverPosition(open, anchorRef)
  if (!open || !style) return null

  return createPortal(
    <div className={className} style={style} data-header-popover {...props}>
      {children}
    </div>,
    document.body,
  )
}
