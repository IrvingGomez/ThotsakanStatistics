import { useState, useEffect, useRef } from 'react'

interface ExportMenuProps {
  onExportPNG: () => void | Promise<void>
  onExportCSV: () => void | Promise<void>
  onExportPDF: () => void | Promise<void>
  /** Controls whether PDF/CSV are available (chart may not be ready yet) */
  ready?: boolean
}

const ITEMS = [
  { key: 'png', label: '🖼️  PNG — Chart image',    desc: 'High-res 1200×600 px' },
  { key: 'csv', label: '📋  CSV — Data table',      desc: 'Probabilities / densities' },
  { key: 'pdf', label: '📄  PDF — Full report',     desc: 'Chart + stats + formula' },
] as const

export default function ExportMenu({ onExportPNG, onExportCSV, onExportPDF, ready = true }: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleItem(key: typeof ITEMS[number]['key']) {
    setOpen(false)
    if (!ready) return
    if (key === 'png') onExportPNG()
    if (key === 'csv') onExportCSV()
    if (key === 'pdf') onExportPDF()
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={!ready}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium
          border transition-colors cursor-pointer
          ${open
            ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
            : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-accent)]/50'
          }
          disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <span>📥</span>
        <span>Export</span>
        <span className="text-[10px] opacity-70">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-50 w-56
            rounded-lg border border-[var(--color-border)]
            bg-[var(--color-bg-panel)] shadow-xl shadow-black/40
            py-1 overflow-hidden"
        >
          {ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => handleItem(item.key)}
              className="w-full flex flex-col gap-0.5 px-4 py-2.5 text-left
                hover:bg-white/5 transition-colors cursor-pointer"
            >
              <span className="text-xs text-[var(--color-text)]">{item.label}</span>
              <span className="text-[10px] text-[var(--color-text-muted)]">{item.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
