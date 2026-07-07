import { useState } from 'react'
import { getPdfFilename, saveDashboardPdf, saveDashboardPdfWithHandle } from '../utils/generateDashboardPdf'

const OPTIONS = [
  { id: 'headOffice', label: 'Head Office', description: 'All branches combined' },
  { id: 'manchester', label: 'Manchester', description: 'Branch view only' },
  { id: 'both', label: 'Both', description: 'Head Office and Manchester in one PDF' },
]

export default function PdfExportModal({
  open,
  onClose,
  lastUpdated,
  setActiveView,
  getActiveView,
}) {
  const [selected, setSelected] = useState('headOffice')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)

  if (!open) return null

  async function handleDownload() {
    setIsGenerating(true)
    setError(null)

    let fileHandle = null
    if (window.showSaveFilePicker) {
      try {
        fileHandle = await window.showSaveFilePicker({
          suggestedName: getPdfFilename(selected),
          types: [{ description: 'PDF document', accept: { 'application/pdf': ['.pdf'] } }],
        })
      } catch (err) {
        if (err?.name === 'AbortError') {
          setIsGenerating(false)
          return
        }
      }
    }

    try {
      if (fileHandle) {
        await saveDashboardPdfWithHandle(fileHandle, {
          scope: selected,
          lastUpdated,
          setActiveView,
          getActiveView,
        })
      } else {
        await saveDashboardPdf({
          scope: selected,
          lastUpdated,
          setActiveView,
          getActiveView,
        })
      }
      onClose()
    } catch (err) {
      console.error('PDF export failed:', err)
      setError(err?.message || 'PDF export failed. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="pdf-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="pdf-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-modal-title"
      >
        <header className="pdf-modal-header">
          <div>
            <h2 id="pdf-modal-title">Download report as PDF</h2>
            <p>Choose which view to export. The PDF matches what you see on screen.</p>
          </div>
          <button type="button" className="pdf-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="pdf-modal-options">
          {OPTIONS.map((option) => (
            <label
              key={option.id}
              className={`pdf-option ${selected === option.id ? 'is-selected' : ''}`}
            >
              <input
                type="radio"
                name="pdf-scope"
                value={option.id}
                checked={selected === option.id}
                onChange={() => setSelected(option.id)}
              />
              <span className="pdf-option-text">
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </span>
            </label>
          ))}
        </div>

        {error && <p className="pdf-modal-error">{error}</p>}

        <footer className="pdf-modal-footer">
          <button type="button" className="pdf-btn pdf-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="pdf-btn pdf-btn--primary"
            onClick={handleDownload}
            disabled={isGenerating}
          >
            {isGenerating ? 'Capturing dashboard…' : 'Download PDF'}
          </button>
        </footer>
      </div>
    </div>
  )
}
