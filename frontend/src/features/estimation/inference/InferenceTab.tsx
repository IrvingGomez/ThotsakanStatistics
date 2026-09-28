import InferenceControls from './InferenceControls'
import InferenceObservation from './InferenceObservation'
import InferenceNotebook from './InferenceNotebook'
import type { InferenceState } from './useInferenceTabState'

export function ControlsSlot({ state }: { state: InferenceState }) {
  return <InferenceControls state={state} />
}
export function ObservationSlot({ state }: { state: InferenceState }) {
  return <InferenceObservation state={state} />
}
export function NotebookSlot({ state }: { state: InferenceState }) {
  return <InferenceNotebook state={state} />
}
