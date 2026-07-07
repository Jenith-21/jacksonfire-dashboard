import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import Loader from './components/Loader'
import ViewSwitcher from './components/ViewSwitcher'
import ThemeToggle from './components/ThemeToggle'
import PdfExportModal from './components/PdfExportModal'
import DateRangeFilter, { getDashboardDateBounds, getInitialDateRange } from './components/DateRangeFilter'
import { DashboardView, formatDate } from './components/DashboardView'
import { applyDateRangeToDashboard } from './utils/rebuildView'
import './App.css'

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v10m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [showLoader, setShowLoader] = useState(true)
  const [activeView, setActiveView] = useState('headOffice')
  const [pdfModalOpen, setPdfModalOpen] = useState(false)
  const [dateRange, setDateRange] = useState(() => getInitialDateRange())
  const [headerCompact, setHeaderCompact] = useState(false)
  const headerRef = useRef(null)
  const headerCompactRef = useRef(false)
  const headerHeightRef = useRef(0)
  const transitionLockRef = useRef(false)
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('theme') === 'dark'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  const loadData = useCallback(async () => {
    setError(null)
    const maxAttempts = 4

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const res = await fetch('/api/dashboard')
        if (res.status === 502 || res.status === 503) {
          if (attempt < maxAttempts - 1) {
            await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)))
            continue
          }
          throw new Error(
            'The API server is not running. Stop any old terminals, then from the project root run: npm run dev'
          )
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.message || `Request failed (${res.status})`)
        }
        const json = await res.json()
        if (!json.headOffice || !json.manchester || !json.dataGaps) {
          throw new Error(
            'API returned an outdated response. Restart with: npm run dev'
          )
        }
        if (!json.headOffice.quoteStatusBreakdown || json.headOffice.summary?.avgQuoteValue === undefined) {
          throw new Error(
            'API is missing latest analytics. Restart with: npm run dev'
          )
        }
        if (!json.headOffice.quoteRecords) {
          console.warn('API missing quoteRecords — drill-down will be limited until backend restarts')
        }
        setData(json)
        setDateRange(getInitialDateRange())
        return
      } catch (err) {
        if (attempt === maxAttempts - 1) {
          setError(err.message)
        }
      }
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    headerCompactRef.current = headerCompact
  }, [headerCompact])

  useEffect(() => {
    let ticking = false
    const COMPACT_ON = 84
    const COMPACT_OFF = 36
    const FADE_START = 18
    const FADE_END = 84
    const LOCK_MS = 360

    function setCompactProgress(scrollY) {
      const fadeSpan = Math.max(FADE_END - FADE_START, 1)
      const progress = Math.min(1, Math.max(0, (scrollY - FADE_START) / fadeSpan))
      document.documentElement.style.setProperty('--header-compact-p', progress.toFixed(3))
      return progress
    }

    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const scrollY = window.scrollY
        setCompactProgress(scrollY)

        if (!transitionLockRef.current) {
          const isCompact = headerCompactRef.current
          const shouldCompact = isCompact ? scrollY > COMPACT_OFF : scrollY >= COMPACT_ON

          if (shouldCompact !== isCompact) {
            transitionLockRef.current = true
            headerCompactRef.current = shouldCompact
            setHeaderCompact(shouldCompact)
            window.setTimeout(() => {
              transitionLockRef.current = false
            }, LOCK_MS)
          }
        }

        ticking = false
      })
    }

    setCompactProgress(window.scrollY)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const dateBounds = useMemo(() => getDashboardDateBounds(data), [data])
  const filteredData = useMemo(
    () => applyDateRangeToDashboard(data, dateRange),
    [data, dateRange],
  )

  useLayoutEffect(() => {
    if (headerRef.current) {
      headerHeightRef.current = headerRef.current.getBoundingClientRect().height
    }
  }, [filteredData])

  useLayoutEffect(() => {
    const header = headerRef.current
    if (!header) return

    const newHeight = header.getBoundingClientRect().height
    const previousHeight = headerHeightRef.current

    if (previousHeight > 0 && Math.abs(newHeight - previousHeight) > 0.5) {
      window.scrollTo(0, window.scrollY + (newHeight - previousHeight))
    }

    headerHeightRef.current = newHeight
  }, [headerCompact])

  const setActiveViewForPdf = useCallback((viewId) => {
    flushSync(() => setActiveView(viewId))
  }, [])

  if (!showLoader && error) {
    return (
      <div className="app-shell">
        <div className="error-screen">
          <img src="/jackson-logo.jpg" alt="Jackson Fire & Security" className="error-logo" />
          <h1>Unable to load dashboard</h1>
          <p>{error}</p>
          <p className="hint">Run both servers from the project root: <code>npm run dev</code></p>
          <button type="button" onClick={() => { setShowLoader(true); loadData() }}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const viewData =
    activeView === 'headOffice' ? filteredData?.headOffice : filteredData?.manchester
  const isBranch = activeView === 'manchester'

  return (
    <div className="app-shell">
      {filteredData && (
        <div className="dashboard" id="dashboard-capture">
          <header
            ref={headerRef}
            className={`app-header ${headerCompact ? 'is-compact' : ''}`}
          >
            <div className="header-accent" aria-hidden="true" />
            <div className="header-shell">
              <div className="header-logo-wrap">
                <img src="/jackson-logo.jpg" alt="Jackson Fire & Security" className="header-logo" />
              </div>

              <div className="header-titles">
                <p className="header-eyebrow">Jackson Fire &amp; Security</p>
                <h1 className="header-title">Uptick Quote Reporting</h1>
                <p className="header-tagline">Sales &amp; defect quote analytics from Uptick</p>
              </div>

              <nav className="header-nav">
                <ViewSwitcher
                  activeView={activeView}
                  onChange={setActiveView}
                  compact={headerCompact}
                />
              </nav>

              <div className="header-actions">
                <DateRangeFilter value={dateRange} bounds={dateBounds} onChange={setDateRange} />
                <button
                  type="button"
                  className="header-icon-btn header-pdf-btn"
                  onClick={() => setPdfModalOpen(true)}
                  aria-label="Download PDF"
                >
                  <DownloadIcon />
                  <span className="header-btn-text">Download PDF</span>
                </button>
                <div className="header-actions-extra">
                  <ThemeToggle dark={darkMode} onToggle={() => setDarkMode((d) => !d)} />
                  <span className="sync-badge">
                    <span className="sync-dot" aria-hidden="true" />
                    Updated {formatDate(filteredData.lastUpdated)}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {viewData && (
            <DashboardView
              view={viewData}
              leadSummary={filteredData.leadSummary}
              isBranch={isBranch}
            />
          )}
        </div>
      )}

      {showLoader && (
        <Loader ready={!!data || !!error} onComplete={() => setShowLoader(false)} />
      )}

      <PdfExportModal
        open={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        lastUpdated={filteredData?.lastUpdated}
        setActiveView={setActiveViewForPdf}
        getActiveView={() => activeView}
      />
    </div>
  )
}

export default App
