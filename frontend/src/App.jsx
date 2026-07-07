import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Loader from './components/Loader'
import ViewSwitcher from './components/ViewSwitcher'
import ThemeToggle from './components/ThemeToggle'
import DateRangeFilter, { getDashboardDateBounds, getInitialDateRange } from './components/DateRangeFilter'
import QuoteTypeFilter from './components/QuoteTypeFilter'
import AlertsButton from './components/AlertsButton'
import { DashboardView } from './components/DashboardView'
import { applyDashboardFilters } from './utils/rebuildView'
import { buildDashboardAlerts } from './utils/buildDashboardAlerts'
import { withLiveExpiryRecords } from './utils/quoteExpiry'
import './App.css'

function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [showLoader, setShowLoader] = useState(true)
  const [activeView, setActiveView] = useState('headOffice')
  const [dateRange, setDateRange] = useState(() => getInitialDateRange())
  const [quoteTypeFilter, setQuoteTypeFilter] = useState('all')
  const [alertRequest, setAlertRequest] = useState(null)
  const [headerCompact, setHeaderCompact] = useState(false)
  const headerRef = useRef(null)
  const headerCompactRef = useRef(false)
  const headerHeightRef = useRef(0)
  const transitionLockRef = useRef(false)
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('theme') === 'dark'
  )
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  const loadData = useCallback(async ({ silent = false, forceRefresh = false } = {}) => {
    if (!silent) setError(null)
    const maxAttempts = 4

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const res = await fetch(forceRefresh ? '/api/dashboard?refresh=1' : '/api/dashboard')
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
        if (!silent) setDateRange(getInitialDateRange())
        return
      } catch (err) {
        if (!silent && attempt === maxAttempts - 1) {
          setError(err.message)
        }
      }
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!data) return undefined

    const timer = window.setInterval(() => {
      loadData({ silent: true, forceRefresh: true })
    }, 5 * 60_000)

    return () => window.clearInterval(timer)
  }, [data, loadData])

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
    () => applyDashboardFilters(data, { dateRange, quoteType: quoteTypeFilter }),
    [data, dateRange, quoteTypeFilter],
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

  if (!showLoader && error) {
    return (
      <div className="app-shell">
        <div className="error-screen">
          <img src="/jackson-logo.jpg" alt="Jackson Fire & Security" className="error-logo" />
          <h1>Unable to load dashboard</h1>
          <p>{error}</p>
          <p className="hint">
            {error.includes('Vercel') || error.includes('GOOGLE_SERVICE_ACCOUNT')
              ? 'Check Vercel → Settings → Environment Variables, then redeploy.'
              : error.includes('not shared') || error.includes('Spreadsheet ID')
                ? 'Open Google Sheets → Share → add the service account email as Viewer.'
                : 'Run both servers from the project root: '}
            {!error.includes('Vercel') &&
              !error.includes('GOOGLE_SERVICE_ACCOUNT') &&
              !error.includes('not shared') &&
              !error.includes('Spreadsheet ID') && <code>npm run dev</code>}
          </p>
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
  const alertSourceRecords = useMemo(() => {
    const raw =
      activeView === 'headOffice'
        ? data?.headOffice?.quoteRecords
        : data?.manchester?.quoteRecords
    return withLiveExpiryRecords(raw ?? [], now)
  }, [data, activeView, now])
  const alertSummarySource =
    activeView === 'headOffice' ? data?.headOffice?.summary : data?.manchester?.summary
  const dashboardAlerts = useMemo(
    () => buildDashboardAlerts(alertSourceRecords, alertSummarySource ?? {}, now),
    [alertSourceRecords, alertSummarySource, now],
  )

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

              <nav className="header-nav">
                <ViewSwitcher
                  activeView={activeView}
                  onChange={setActiveView}
                  compact={headerCompact}
                />
              </nav>

              <div className="header-actions">
                <QuoteTypeFilter value={quoteTypeFilter} onChange={setQuoteTypeFilter} />
                <DateRangeFilter value={dateRange} bounds={dateBounds} onChange={setDateRange} />
                <AlertsButton alerts={dashboardAlerts} onSelectAlert={setAlertRequest} />
                <ThemeToggle dark={darkMode} onToggle={() => setDarkMode((d) => !d)} />
              </div>
            </div>
          </header>

          {viewData && (
            <DashboardView
              view={viewData}
              leadSummary={filteredData.leadSummary}
              isBranch={isBranch}
              alertRequest={alertRequest}
              alertQuoteRecords={alertSourceRecords}
              onAlertRequestHandled={() => setAlertRequest(null)}
            />
          )}
        </div>
      )}

      {showLoader && (
        <Loader ready={!!data || !!error} onComplete={() => setShowLoader(false)} />
      )}
    </div>
  )
}

export default App
