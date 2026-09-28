import type { ReactNode } from 'react'

interface AnalysisStatusProps {
  isComputing: boolean
  error: string | null
  hasResult: boolean
  isDirty?: boolean
  onRetry?: () => void
  dirtyMessage?: string
  resultNotice?: string
  children?: ReactNode
}

export default function AnalysisStatus({
  isComputing, error, hasResult, isDirty = false, onRetry,
  dirtyMessage = 'Settings changed — update results', resultNotice, children,
}: AnalysisStatusProps) {
  return (
    <div className="analysis-status">
      {children && <div className="analysis-context">{children}</div>}
      <div role="status" aria-live="polite" aria-atomic="true">
        {isComputing ? (
          <p className="text-[var(--color-text-muted)]">{hasResult ? 'Updating… Previous result shown below.' : 'Computing results…'}</p>
        ) : error ? (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
            <p className="font-semibold">Couldn’t update results</p>
            {hasResult && <p>{resultNotice ?? 'Previous result — update failed.'}</p>}
            <p className="mt-1 break-words">{error}</p>
            {onRetry && <button type="button" onClick={onRetry} className="mt-2 rounded-md border border-[var(--color-border-md)] px-3 py-1.5 font-semibold hover:bg-white/10">Retry</button>}
          </div>
        ) : isDirty ? (
          <p className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-amber-200">{dirtyMessage}</p>
        ) : null}
      </div>
    </div>
  )
}
