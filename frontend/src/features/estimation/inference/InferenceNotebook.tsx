import type { ConfidenceRegionsResponse, IntervalsResponse } from '../../../api/inference'
import type { InferenceState } from './useInferenceTabState'
import { coveragePercent, formatInferenceNumber, parseIntervalRows } from './inferencePresentation'
import { intervalFormula, NOTATION } from './inferenceFormulas'
import { Formula, Section } from '../../../components/notebook/NotebookParts'
import MathFormula from '../../../components/MathFormula'
import { estimatorLabel } from '../../../labels'
import { EmptyState } from '../../../components/StatusBanner'

/** The formula of each interval the table shows, in the order of the table. */
function IntervalFormulas({ title, kind, result, sigmaEstimator }: {
  title: string; kind: 'confidence' | 'prediction'; result: IntervalsResponse; sigmaEstimator: string
}) {
  const rows = parseIntervalRows(result)
  if (!rows.length) return null
  return <Section title={title}>
    {rows.map((row, index) => {
      const formula = intervalFormula(kind, row, sigmaEstimator)
      return <Formula key={formula.label + index} label={formula.label}><MathFormula tex={formula.tex} /></Formula>
    })}
  </Section>
}
function Notation({ sigmaEstimator }: { sigmaEstimator: string }) {
  return <Section title="Notation">
    {NOTATION.map((item) => <Formula key={item.tex} label={item.namesEstimator ? `${item.text} (${estimatorLabel(sigmaEstimator)})` : item.text}>
      <MathFormula tex={item.tex} />
    </Formula>)}
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
  const sigmaEstimator = state.appliedConfig?.sigma_estimator ?? 'Deviation (1 ddof)'
  return <div className="analysis-panel p-4">
    {!hasResult && !state.isComputing && !state.error && <EmptyState loaded={!!state.sessionId} hasData={state.hasData} compact />}
    {state.ciResult && <IntervalFormulas title="Confidence intervals" kind="confidence" result={state.ciResult} sigmaEstimator={sigmaEstimator} />}
    {state.piResult && <IntervalFormulas title="Prediction intervals" kind="prediction" result={state.piResult} sigmaEstimator={sigmaEstimator} />}
    {(state.ciResult || state.piResult) && <Notation sigmaEstimator={sigmaEstimator} />}
    {state.regionResult && <RegionSummary result={state.regionResult} precision={state.precision} showCiBox={state.appliedConfig?.add_ci_box ?? true} />}
  </div>
}
