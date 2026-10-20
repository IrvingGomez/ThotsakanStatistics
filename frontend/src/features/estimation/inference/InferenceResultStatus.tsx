import StatusBanner from '../../../components/StatusBanner'
import type { InferenceState } from './useInferenceTabState'

export default function InferenceResultStatus({ state }: { state: InferenceState }) {
  const hasResult = !!(state.ciResult || state.piResult || state.regionResult)
  return <StatusBanner isComputing={state.isComputing} error={state.error} hasResult={hasResult} onRetry={state.handleRetry}
    resultNotice={state.partialResult ? 'Partial result — only successful intervals are shown.' : undefined} />
}
