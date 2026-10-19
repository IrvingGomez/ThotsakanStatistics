import StatusBanner, { summaryLine } from '../../../components/StatusBanner'
import type { InferenceState } from './useInferenceTabState'
import { coveragePercent } from './inferencePresentation'

export default function InferenceResultStatus({ state }: { state: InferenceState }) {
  const { appliedConfig: cfg, appliedContext: context } = state
  const hasResult = !!(state.ciResult || state.piResult || state.regionResult)
  const n = state.ciResult?.n ?? state.piResult?.n ?? context?.n
  const coverage = cfg && (cfg.estimationType === 'Confidence Regions'
    ? 'regions ' + (state.regionResult?.probs ?? cfg.probs.split(',').map(Number)).map(coveragePercent).join(', ')
    : coveragePercent(1 - cfg.alpha) + ' confidence')
  const alpha = cfg && (cfg.estimationType !== 'Confidence Regions' || cfg.add_ci_box) ? 'α = ' + cfg.alpha : null
  const filters = context?.filterCount ? context.filterCount + ' filter' + (context.filterCount === 1 ? '' : 's') : null
  return <StatusBanner isComputing={state.isComputing} error={state.error} hasResult={hasResult} onRetry={state.handleRetry}
    resultNotice={state.partialResult ? 'Partial result — only successful intervals are shown.' : undefined}
    summary={cfg && context ? summaryLine([context.filename, cfg.column, 'n = ' + n, coverage, alpha, filters]) : null} />
}
