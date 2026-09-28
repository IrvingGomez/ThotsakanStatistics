import { useEffect, useId, useRef, useState } from 'react'

export type ExportFormat = 'png' | 'csv' | 'pdf'
export type ExportHandlers = Record<ExportFormat, () => void | Promise<void>>

interface ExportMenuProps {
  handlers?: ExportHandlers
  ready?: boolean
  disabledReason?: string
}

const ITEMS: { key: ExportFormat; label: string; description: string }[] = [
  { key: 'png', label: 'PNG — chart image', description: 'High-resolution visualization' },
  { key: 'csv', label: 'CSV — result data', description: 'UTF-8 spreadsheet data' },
  { key: 'pdf', label: 'PDF — full report', description: 'Charts, settings, and results' },
]

export default function ExportMenu({ handlers, ready = true, disabledReason }: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const busyRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const firstItemRef = useRef<HTMLButtonElement>(null)
  const disclosureId = useId()
  const enabled = ready && !!handlers && !busy

  useEffect(() => {
    if (!open) return
    firstItemRef.current?.focus()
    const closeOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', closeOutside)
    return () => document.removeEventListener('mousedown', closeOutside)
  }, [open])

  async function run(format: ExportFormat) {
    if (!enabled || !handlers || busyRef.current) return
    busyRef.current = true
    setOpen(false)
    setBusy(format)
    setError(null)
    try {
      await handlers[format]()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Export failed. Please try again.')
    } finally {
      busyRef.current = false
      setBusy(null)
      triggerRef.current?.focus()
    }
  }

  return (
    <div ref={rootRef} className="relative" onKeyDown={(event) => {
      if (event.key === 'Escape' && open) {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }}>
      <button ref={triggerRef} type="button" aria-expanded={open} aria-controls={disclosureId}
        title={!enabled ? disabledReason : undefined} disabled={!enabled}
        onClick={() => { setError(null); setOpen((value) => !value) }}
        className={`flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-medium transition-colors
          ${open ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/50 hover:text-[var(--color-text)]'}
          disabled:cursor-not-allowed disabled:opacity-40`}>
        <span aria-hidden="true">↓</span>
        <span>{busy ? `Exporting ${busy.toUpperCase()}…` : 'Export'}</span>
        <span aria-hidden="true" className="text-[10px] opacity-70">{open ? '▲' : '▼'}</span>
      </button>

      {open && <div id={disclosureId} aria-label="Export formats"
        className="absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-panel)] py-1 shadow-xl shadow-black/40">
        {ITEMS.map((item, index) => <button key={item.key} ref={index === 0 ? firstItemRef : undefined}
          type="button" onClick={() => void run(item.key)}
          className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--color-accent)]">
          <span className="text-xs text-[var(--color-text)]">{item.label}</span>
          <span className="text-[10px] text-[var(--color-text-muted)]">{item.description}</span>
        </button>)}
      </div>}
      {error && <p role="alert" className="absolute right-0 top-full z-40 mt-2 w-64 rounded border border-red-500/40 bg-red-950 px-3 py-2 text-xs text-red-200">{error}</p>}
    </div>
  )
}
