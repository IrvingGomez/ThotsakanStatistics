import type { ConfidenceRegionsResponse, IntervalsResponse } from '../../../api/inference'
import type { InferenceState } from './useInferenceTabState'
import InferenceResultStatus from './InferenceResultStatus'
import { coveragePercent, formatInferenceNumber, parseIntervalRows, pointEstimate, quantityLabel } from './inferencePresentation'

function IntervalCards({ title, result, precision }: { title: string; result: IntervalsResponse; precision: number }) {
  const rows = parseIntervalRows(result)
  return <section className="mb-6">
    <h3 className="text-base font-semibold mb-2">{title}</h3>
    <p className="text-sm text-[var(--color-text-muted)] mb-3">{title === 'Confidence intervals' ? 'Uncertainty about each population quantity.' : 'Ranges for one future observation, using the listed methods.'}</p>
    {!rows.length && <p role="status" className="text-sm">No interval rows were returned for this result.</p>}
    <div className="grid gap-3">
      {rows.map((row, index) => {
        const estimate = pointEstimate(row.Statistic, result.point_estimates)
        return <article key={row.Statistic + '-' + index} className="rounded-lg border border-[var(--color-border-md)] bg-[var(--color-bg-input)] p-3 min-w-0">
          <h4 className="font-semibold text-sm">{quantityLabel(row.Statistic)}{title === 'Prediction intervals' ? ' method' : ''}</h4>
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
        </article>
      })}
    </div>
  </section>
}
function RegionSummary({ result, precision, showCiBox }: { result: ConfidenceRegionsResponse; precision: number; showCiBox: boolean }) {
  return <section className="space-y-3 text-sm">
    <h3 className="font-semibold text-base">Mean and spread together</h3>
    <p className="text-[var(--color-text-muted)]">Contours show joint confidence regions for the population mean (μ) and deviation (σ). Larger coverage levels include a wider set of parameter pairs.</p>
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
  </section>
}
export default function InferenceNotebook({ state }: { state: InferenceState }) {
  const hasResult = !!(state.ciResult || state.piResult || state.regionResult)
  return <div className="analysis-panel p-4">
    <h2 className="text-lg font-bold mb-3">Statistical inference</h2>
    <InferenceResultStatus state={state} />
    {!hasResult && !state.isComputing && !state.error && <p className="text-sm text-[var(--color-text-muted)] py-6">{state.hasData ? 'Choose settings, then select Update to calculate intervals.' : 'Upload a CSV in Data to begin.'}</p>}
    {state.ciResult && <IntervalCards title="Confidence intervals" result={state.ciResult} precision={state.precision} />}
    {state.piResult && <IntervalCards title="Prediction intervals" result={state.piResult} precision={state.precision} />}
    {state.regionResult && <RegionSummary result={state.regionResult} precision={state.precision} showCiBox={state.appliedConfig?.add_ci_box ?? true} />}
  </div>
}
