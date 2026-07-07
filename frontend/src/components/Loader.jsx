import { useEffect, useRef, useState } from 'react'
import './Loader.css'

const MIN_DISPLAY_MS = 1400
const EXIT_MS = 500
const MAX_WAIT_MS = 12000

export default function Loader({ ready, onComplete }) {
  const [exiting, setExiting] = useState(false)
  const completedRef = useRef(false)
  const mountTimeRef = useRef(Date.now())

  const finish = () => {
    if (completedRef.current) return
    completedRef.current = true
    setExiting(true)
    setTimeout(onComplete, EXIT_MS)
  }

  useEffect(() => {
    const maxTimer = setTimeout(finish, MAX_WAIT_MS)
    return () => clearTimeout(maxTimer)
  }, [])

  useEffect(() => {
    if (!ready) return

    const elapsed = Date.now() - mountTimeRef.current
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed)
    const timer = setTimeout(finish, remaining)
    return () => clearTimeout(timer)
  }, [ready])

  return (
    <div className={`page-loader ${exiting ? 'exiting' : ''}`} aria-label="Loading dashboard">
      <div className="loader-bg">
        <span className="loader-bg-orb orb-1" />
        <span className="loader-bg-orb orb-2" />
      </div>

      <div className="loader-stage">
        <div className="loader-radar">
          <span className="radar-sweep" />
          <span className="radar-ping ping-1" />
          <span className="radar-ping ping-2" />
          <span className="radar-ping ping-3" />
        </div>

        <div className="loader-rings">
          <span className="ring ring-a" />
          <span className="ring ring-b" />
          <span className="ring ring-c" />
          <span className="loader-dot" />
        </div>
      </div>

      <div className="loader-footer">
        <div className="loader-bar">
          <span className="loader-bar-fill" />
        </div>
      </div>
    </div>
  )
}
