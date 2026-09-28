import AnalysisStatus from '../../../components/AnalysisStatus'
import type { InferenceState } from './useInferenceTabState'
import { coveragePercent } from './inferencePresentation'

export default function InferenceResultStatus({ state }: { state: InferenceState }) {
  const { appliedConfig: cfg, appliedContext: context } = state
  const hasResult = !!(state.ciResult || state.piResult || state.regionResult)
  const n = state.ciResult?.n ?? state.piResult?.n ?? context?.n
  const bootstrap = cfg ? [cfg.bootstrap_mean && 'mean CI', cfg.bootstrap_median && 'median CI', cfg.bootstrap_deviation && 'deviation CI', cfg.bootstrap_pi && 'prediction intervals'].filter(Boolean) : []
  return <AnalysisStatus isComputing={state.isComputing} error={state.error} hasResult={hasResult} isDirty={state.isDirty} onRetry={state.handleRetry} dirtyMessage="Settings changed — update results. Select Update to apply. Results below use the run settings shown here." resultNotice={state.partialResult ? 'Partial result — only successful intervals are shown.' : undefined}>
    {cfg && context && <div className="space-y-1 break-words">
      <p className="font-semibold">{cfg.column} <span className="font-normal text-[var(--color-text-muted)]">· n = {n}</span></p>
      <p>{cfg.estimationType === 'Confidence Regions' ? 'Region coverage: ' + (state.regionResult?.probs ?? cfg.probs.split(',').map(Number)).map(coveragePercent).join(', ') : coveragePercent(1 - cfg.alpha) + ' confidence · α = ' + cfg.alpha}</p>
      <details className="text-xs text-[var(--color-text-muted)]">
        <summary className="cursor-pointer">Run settings</summary>
        <p className="mt-1">{cfg.estimationType} · {cfg.sigma_estimator}</p>
        <p>{bootstrap.length ? 'Bootstrap: ' + bootstrap.join(', ') + ' · ' + cfg.bootstrap_samples + ' resamples' : 'Analytical intervals; bootstrap off'}</p>
        {cfg.estimationType === 'Confidence Regions' && <p>Marginal intervals: {coveragePercent(1 - cfg.alpha)} confidence (α = {cfg.alpha}) · {cfg.add_ci_box ? cfg.mu_ci_source + ' box shown' : 'box hidden'}</p>}
      </details>
      <p className="text-xs text-[var(--color-text-muted)]">{context.filename}{context.filterCount ? ' · ' + context.filterCount + ' active filter' + (context.filterCount === 1 ? '' : 's') : ''}</p>
    </div>}
  </AnalysisStatus>
}
