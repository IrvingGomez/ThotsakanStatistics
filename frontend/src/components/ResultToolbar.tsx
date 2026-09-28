import ExportMenu, { type ExportHandlers } from './ExportMenu'

export default function ResultToolbar({ title = 'Results', exports, ready, disabledReason }: {
  title?: string; exports?: ExportHandlers; ready: boolean; disabledReason?: string
}) {
  return (
    <div className="mb-3 flex min-h-9 items-center justify-between gap-3 border-b border-[var(--color-border)] pb-2">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{title}</h2>
      <ExportMenu handlers={exports} ready={ready} disabledReason={disabledReason} />
    </div>
  )
}
