import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { formatDate } from './format'

const CAPTURE_SCALE = 1.25
const PAGE_MARGIN_X = 8
const PAGE_MARGIN_TOP = 8
const PAGE_MARGIN_BOTTOM = 14
const BLOCK_GAP = 3

function waitForPaint(ms = 900) {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(resolve, ms)
      })
    })
  })
}

function enableCaptureMode() {
  document.documentElement.classList.add('pdf-capture-mode')
}

function disableCaptureMode() {
  document.documentElement.classList.remove('pdf-capture-mode')
}

function getCanvasOptions(element, overrides = {}) {
  return {
    scale: CAPTURE_SCALE,
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: '#f4f6fb',
    imageTimeout: 20000,
    width: element.scrollWidth,
    height: element.scrollHeight,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
    onclone: (clonedDoc) => {
      clonedDoc.documentElement.classList.add('pdf-capture-mode')
      clonedDoc.documentElement.setAttribute('data-theme', 'light')
    },
    ...overrides,
  }
}

function getGridRowTargets(grid) {
  const gridRect = grid.getBoundingClientRect()
  const rowTops = [...new Set([...grid.children].map((child) => child.offsetTop))].sort(
    (a, b) => a - b,
  )

  return rowTops.map((top) => {
    const rowItems = [...grid.children].filter((child) => child.offsetTop === top)
    if (rowItems.length === 1) {
      return { element: rowItems[0] }
    }

    const rects = rowItems.map((item) => item.getBoundingClientRect())
    const left = Math.min(...rects.map((rect) => rect.left))
    const topPx = Math.min(...rects.map((rect) => rect.top))
    const right = Math.max(...rects.map((rect) => rect.right))
    const bottom = Math.max(...rects.map((rect) => rect.bottom))

    return {
      element: grid,
      clip: {
        x: left - gridRect.left + grid.scrollLeft,
        y: topPx - gridRect.top + grid.scrollTop,
        width: right - left,
        height: bottom - topPx,
      },
    }
  })
}

function collectPdfCaptureTargets(root) {
  const targets = []

  const header = root.querySelector(':scope > .app-header')
  if (header) targets.push({ element: header })

  const main = root.querySelector('.dashboard-main')
  if (!main) return targets

  const kpi = main.querySelector(':scope > .kpi-section')
  if (kpi) targets.push({ element: kpi })

  main.querySelectorAll(':scope > .dashboard-section').forEach((section) => {
    const heading = section.querySelector(':scope > .section-heading-row')
    if (heading) targets.push({ element: heading })

    section.querySelectorAll(':scope > .bento-grid').forEach((grid) => {
      targets.push(...getGridRowTargets(grid))
    })

    section.querySelectorAll(':scope > .widget--wide').forEach((widget) => {
      targets.push({ element: widget })
    })
  })

  return targets
}

async function captureTarget(target) {
  const { element, clip } = target

  if (clip) {
    return html2canvas(
      element,
      getCanvasOptions(element, {
        x: clip.x,
        y: clip.y,
        width: clip.width,
        height: clip.height,
        windowWidth: element.scrollWidth,
        windowHeight: clip.height,
        scrollY: -clip.y,
      }),
    )
  }

  return html2canvas(element, getCanvasOptions(element))
}

function addBlockToPdf(doc, canvas, state) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - PAGE_MARGIN_X * 2
  const maxY = pageHeight - PAGE_MARGIN_BOTTOM
  const imgData = canvas.toDataURL('image/jpeg', 0.9)
  const imgHeightMm = (canvas.height * contentWidth) / canvas.width

  const fitsAt = (startY) => startY + imgHeightMm <= maxY

  if (!fitsAt(state.y) && state.started && state.y > PAGE_MARGIN_TOP) {
    doc.addPage()
    state.y = PAGE_MARGIN_TOP
  }

  if (fitsAt(PAGE_MARGIN_TOP)) {
    doc.addImage(imgData, 'JPEG', PAGE_MARGIN_X, state.y, contentWidth, imgHeightMm)
    state.y += imgHeightMm + BLOCK_GAP
    state.started = true
    return
  }

  // Rare fallback for an unusually tall block: slice across pages.
  let renderedMm = 0
  while (renderedMm < imgHeightMm) {
    if (state.started && renderedMm > 0) {
      doc.addPage()
    }
    state.y = PAGE_MARGIN_TOP
    doc.addImage(imgData, 'JPEG', PAGE_MARGIN_X, PAGE_MARGIN_TOP - renderedMm, contentWidth, imgHeightMm)
    renderedMm += maxY - PAGE_MARGIN_TOP
    state.y = maxY
    state.started = true
  }
  state.y += BLOCK_GAP
}

async function captureDashboardBlocks(root) {
  const targets = collectPdfCaptureTargets(root)
  const blocks = []

  for (const target of targets) {
    const canvas = await captureTarget(target)
    if (canvas.width > 0 && canvas.height > 0) {
      blocks.push(canvas)
    }
  }

  return blocks
}

function addFooter(doc, lastUpdated) {
  const pageCount = doc.getNumberOfPages()
  const footerY = doc.internal.pageSize.getHeight() - 8
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text(
      `Jackson Fire Uptick Report · Generated ${formatDate(lastUpdated)} · Page ${page} of ${pageCount}`,
      10,
      footerY,
    )
  }
}

export function getPdfFilename(scope) {
  const scopeLabel =
    scope === 'both' ? 'head-office-and-manchester' : scope === 'manchester' ? 'manchester' : 'head-office'
  const dateStamp = new Date().toISOString().slice(0, 10)
  return `jackson-fire-uptick-report-${scopeLabel}-${dateStamp}.pdf`
}

function downloadPdfBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function generateDashboardPdf({
  scope,
  lastUpdated,
  setActiveView,
  getActiveView,
}) {
  const element = document.getElementById('dashboard-capture')
  if (!element) {
    throw new Error('Dashboard is not ready to export. Please try again.')
  }

  const views = []
  if (scope === 'headOffice' || scope === 'both') views.push('headOffice')
  if (scope === 'manchester' || scope === 'both') views.push('manchester')

  const originalView = getActiveView?.() ?? 'headOffice'
  const originalScrollY = window.scrollY
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const state = { y: PAGE_MARGIN_TOP, started: false }

  enableCaptureMode()

  try {
    for (const viewId of views) {
      if (setActiveView) {
        setActiveView(viewId)
        window.scrollTo(0, 0)
        await waitForPaint()
      }

      const blocks = await captureDashboardBlocks(element)
      if (!blocks.length) {
        throw new Error('Could not capture the dashboard image. Please try again.')
      }

      for (const canvas of blocks) {
        addBlockToPdf(doc, canvas, state)
      }

      if (views.length > 1 && viewId !== views[views.length - 1]) {
        doc.addPage()
        state.y = PAGE_MARGIN_TOP
        state.started = true
      }
    }
  } finally {
    disableCaptureMode()
    if (setActiveView) {
      setActiveView(originalView)
    }
    window.scrollTo(0, originalScrollY)
    await waitForPaint(200)
  }

  addFooter(doc, lastUpdated)

  const filename = getPdfFilename(scope)
  const blob = doc.output('blob')
  return { blob, filename }
}

export async function saveDashboardPdf(options) {
  const { blob, filename } = await generateDashboardPdf(options)
  downloadPdfBlob(blob, filename)
}

export async function saveDashboardPdfWithHandle(fileHandle, options) {
  const { blob } = await generateDashboardPdf(options)
  const writable = await fileHandle.createWritable()
  await writable.write(blob)
  await writable.close()
}
