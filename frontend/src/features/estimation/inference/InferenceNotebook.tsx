import type { ConfidenceRegionsResponse, IntervalsResponse } from '../../../api/inference'
import type { InferenceState } from './useInferenceTabState'
import { coveragePercent, formatInferenceNumber, parseIntervalRows, pointEstimate, quantityLabel, rowLabel } from './inferencePresentation'
import { ResultCard, Section } from '../../../components/notebook/NotebookParts'
import { EmptyState } from '../../../components/StatusBanner'

function IntervalCards({ title, result, precision }: { title: string; result: IntervalsResponse; precision: number }) {
  const rows = parseIntervalRows(result)
  return <Section title={title}>
    {!rows.length && <p role="status" className="text-sm">No interval rows were returned for this result.</p>}
    <div className="grid gap-3">
      {rows.map((row, index) => {
        const estimate = pointEstimate(row.Statistic, result.point_estimates)
        return <ResultCard key={row.Statistic + '-' + row.Method + '-' + index} title={rowLabel(row) + (title === 'Prediction intervals' ? ' method' : '')}>
          <dl className="grid grid-cols-2 gap-3 mt-3 text-sm">
            <div className="min-w-0"><dt className="text-xs text-[var(--color-text-muted)]">Lower bound</dt><dd className="font-mono break-all mt-1">{formatInferenceNumber(row.Lower, precision)}</dd></div>
            <div className="min-w-0"><dt className="text-xs text-[var(--color-text-muted)]">Upper bound</dt><dd className="font-mono break-all mt-1">{formatInferenceNumber(row.Upper, precision)}</dd></div>
          </dl>
          <p className="text-xs text-[var(--color-text-muted)] break-words mt-3">Method: {row.Method}</p>
          <details className="text-xs text-[var(--color-text-muted)] mt-3">
            <summary className="cursor-pointer">Interval details</summary>
            <p className="mt-2 break-words">{row.Statistic} · {row['Interval Type'] ?? title}</p>
            {estimate !== null && <p className="mt-1">Sample {quantityLabel(row.Statistic).toLowerCase()}: <span className="font-mono break-all">{formatInferenceNumber(estimate, precision)}</span></p>}
          </details>
        </ResultCard>
      })}
    </div>
  </Section>
}
function RegionSummary({ result, precision, showCiBox }: { result: ConfidenceRegionsResponse; precision: number; showCiBox: boolean }) {
  return <Section title="Joint confidence regions"><div className="space-y-3 text-sm">
    <p>Coverage: {[...result.probs].sort((a, b) => a - b).map(coveragePercent).join(', ')}</p>
    <dl className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--color-border-md)] p-3">
      <div><dt className="text-xs text-[var(--color-text-muted)]">Estimated mean (μ)</dt><dd className="font-mono break-all mt-1">{formatInferenceNumber(result.mu_hat, precision)}</dd></div>
      <div><dt className="text-xs text-[var(--color-text-muted)]">Estimated deviation (σ)</dt><dd className="font-mono break-all mt-1">{formatInferenceNumber(result.sigma_hat, precision)}</dd></div>
    </dl>
    {showCiBox && result.mu_ci && result.sigma_ci && <div className="rounded-lg border border-[var(--color-border-md)] p-3 space-y-2">
      <p>The dashed box combines separate marginal intervals; it is not the joint region.</p>
      <p className="break-words">Location interval: <span className="font-mono break-all">{result.mu_ci.map(value => formatInferenceNumber(value, precision)).join(' to ')}</span></p>
      <p className="break-words">Deviation interval: <span className="font-mono break-all">{result.sigma_ci.map(value => formatInferenceNumber(value, precision)).join(' to ')}</span></p>
    </div>}
    <details className="rounded-lg border border-[var(--color-border-md)] p-3">
      <summary className="cursor-pointer font-semibold">Method details</summary>
      <p className="mt-2 text-[var(--color-text-muted)]">Joint relative likelihood, χ² calibrated with 2 degrees of freedom. The cross marks maximum likelihood estimates. Grid: {result.z_matrix.length} × {result.z_matrix[0]?.length ?? 0} points.</p>
    </details>
  </div></Section>
}
export default function InferenceNotebook({ state }: { state: InferenceState }) {
  const hasResult = !!(state.ciResult || state.piResult || state.regionResult)
  return <div className="analysis-panel p-4">
    {!hasResult && !state.isComputing && !state.error && <EmptyState loaded={!!state.sessionId} hasData={state.hasData} compact />}
    {state.ciResult && <IntervalCards title="Confidence intervals" result={state.ciResult} precision={state.precision} />}
    {state.piResult && <IntervalCards title="Prediction intervals" result={state.piResult} precision={state.precision} />}
    {state.regionResult && <RegionSummary result={state.regionResult} precision={state.precision} showCiBox={state.appliedConfig?.add_ci_box ?? true} />}
  </div>
}
