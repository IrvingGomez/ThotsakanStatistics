import type { ConfidenceRegionsResponse, IntervalsResponse } from '../../../api/inference'
import type { InferenceState } from './useInferenceTabState'
import { coveragePercent, formatInferenceNumber, parseIntervalRows } from './inferencePresentation'
import { intervalFormula, NOTATION, REGION_BOX, REGION_FORMULAS } from './inferenceFormulas'
import { Formula, Row, Section } from '../../../components/notebook/NotebookParts'
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
/** How the regions are built, then the values they were built from. The cut-offs come from the backend. */
function RegionSummary({ result, precision, showCiBox }: { result: ConfidenceRegionsResponse; precision: number; showCiBox: boolean }) {
  const fmt = (value: number) => formatInferenceNumber(value, precision)
  const cutoffs = result.probs.map((p, index) => ({ p, level: result.levels[index] })).sort((a, b) => a.p - b.p)
  const box = showCiBox && result.mu_ci && result.sigma_ci
  return <>
    <Section title="How the regions are built">
      {REGION_FORMULAS.map((item) => <Formula key={item.label} label={item.label}><MathFormula tex={item.tex} /></Formula>)}
      {box && <Formula label={REGION_BOX.label}><MathFormula tex={REGION_BOX.tex} /></Formula>}
    </Section>
    <Section title="Values">
      <Row label={<MathFormula inline tex={String.raw`\hat{\mu}`} />} value={fmt(result.mu_hat)} />
      <Row label={<MathFormula inline tex={String.raw`\hat{\sigma}`} />} value={fmt(result.sigma_hat)} />
      {cutoffs.map(({ p, level }) => <Row key={p} label={`Cut-off for ${coveragePercent(p)} coverage`} value={fmt(level)} />)}
      {box && <>
        <Row label="Mean interval (box)" value={result.mu_ci!.map(fmt).join(' to ')} />
        <Row label="Deviation interval (box)" value={result.sigma_ci!.map(fmt).join(' to ')} />
      </>}
    </Section>
  </>
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
