/**
 * The one place a tab reports its result state (doc/interaction_contract.md, rules 7 and 16): a one-line
 * summary of what the result was computed from, computing, error with Retry, and warnings that apply to
 * the result on screen. Results update automatically, so there is no "settings changed" state.
 * Warnings must only be passed for the plot or result currently shown (contract rule 10).
 */
export default function StatusBanner({ isComputing, error, hasResult, onRetry, resultNotice, summary, warnings = [] }: {
  isComputing: boolean
  error: string | null
  hasResult: boolean
  onRetry?: () => void
  /** Replaces "Previous result — update failed." when an error leaves an older result on screen. */
  resultNotice?: string
  /** One line, built with summaryLine(): file · variable · n · key settings. */
  summary?: string | null
  warnings?: readonly string[]
}) {
  return (
    <div className="analysis-status">
      {hasResult && summary && <p className="analysis-context text-[var(--color-text-muted)]">{summary}</p>}
      <div role="status" aria-live="polite" aria-atomic="true">
        {isComputing ? (
          <p className="text-[var(--color-text-muted)]">{hasResult ? 'Updating… Previous result shown below.' : 'Computing results…'}</p>
        ) : error ? (
          <div className="status-error">
            <p className="font-semibold">Couldn’t update results</p>
            {hasResult && <p>{resultNotice ?? 'Previous result — update failed.'}</p>}
            <p className="mt-1 break-words">{error}</p>
            {onRetry && <button type="button" onClick={onRetry} className="mt-2 rounded-md border border-[var(--color-border-md)] px-3 py-1.5 font-semibold hover:bg-white/10">Retry</button>}
          </div>
        ) : null}
      </div>
      {warnings.length > 0 && (
        <ul aria-label="Warnings" className="status-warning mt-2 list-none">
          {warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      )}
    </div>
  )
}

/** Joins the parts that are set with " · ", e.g. ['data.csv', 'height', 'n = 30']. */
export function summaryLine(parts: readonly (string | number | null | undefined | false)[]): string {
  return parts.filter((part) => part !== null && part !== undefined && part !== false && part !== '').join(' · ')
}

/**
 * Shown in the center and right panels while there is no result: no dataset yet, a dataset without
 * numeric variables, or a dataset whose settings do not yet make a complete request.
 */
export function EmptyState({ loaded, hasData, compact = false }: { loaded: boolean; hasData: boolean; compact?: boolean }) {
  const message = !loaded
    ? 'Load a dataset in the Data tab to see results.'
    : !hasData
      ? 'This dataset has no numeric variables. Check the column types in the Data tab.'
      : 'Choose the settings in the left panel to see results.'
  return (
    <p role="status" className={`flex items-center justify-center rounded-xl border border-dashed border-[var(--color-border-md)] p-6 text-center text-sm text-[var(--color-text-muted)] ${compact ? 'min-h-24' : 'min-h-48'}`}>
      {message}
    </p>
  )
}
