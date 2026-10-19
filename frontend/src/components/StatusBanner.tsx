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

/**
 * Shown in the main and notebook panels while there is nothing to analyse: no dataset yet, or a
 * dataset without numeric variables. `topic` completes "Load a dataset from the Data tab to …".
 */
export function NoDataState({ loaded, topic, compact = false }: { loaded: boolean; topic: string; compact?: boolean }) {
  return (
    <div role="status" className={`flex flex-col items-center justify-center gap-4 opacity-50 ${compact ? 'h-32' : 'h-64'}`}>
      <span aria-hidden="true" className={compact ? 'text-3xl' : 'text-5xl'}>📂</span>
      <p className="text-sm text-[var(--color-text-muted)] text-center max-w-xs">
        {loaded
          ? 'This dataset has no numeric variables. Check the column types in the Data tab.'
          : `Load a dataset from the Data tab to ${topic}.`}
      </p>
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <p role="status" className="rounded-xl border border-dashed border-[var(--color-border-md)] p-6 text-center text-sm text-[var(--color-text-muted)]">
      {message}
    </p>
  )
}
