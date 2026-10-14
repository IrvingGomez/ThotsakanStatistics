import type { ComponentProps } from 'react'
import AnalysisStatus from './AnalysisStatus'

type StatusProps = ComponentProps<typeof AnalysisStatus>

/**
 * The one place a tab reports computing / error / stale state, plus warnings that apply to the
 * result on screen. Wraps AnalysisStatus so existing tabs keep their wording.
 * Warnings must only be passed for the plot or result currently shown (contract rule 10).
 */
export default function StatusBanner({ warnings = [], ...status }: StatusProps & { warnings?: readonly string[] }) {
  return (
    <>
      <AnalysisStatus {...status} />
      {warnings.length > 0 && (
        <ul aria-label="Warnings" className="mb-3 list-none rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
          {warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      )}
    </>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <p role="status" className="rounded-xl border border-dashed border-[var(--color-border-md)] p-6 text-center text-sm text-[var(--color-text-muted)]">
      {message}
    </p>
  )
}
