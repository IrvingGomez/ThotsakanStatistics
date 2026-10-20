// features/estimation/descriptive/DescriptiveTab.tsx
// Slots for the three panels; the state lives in useDescriptiveTabState (owned by App).

import DescriptiveControls from './DescriptiveControls'
import DescriptiveObservation from './DescriptiveObservation'
import DescriptiveNotebook from './DescriptiveNotebook'
import StatusBanner from '../../../components/StatusBanner'
import type { DescriptiveState } from './useDescriptiveTabState'

export function DescriptiveStatus({ state }: { state: DescriptiveState }) {
  return <StatusBanner isComputing={state.isComputing} error={state.error} hasResult={!!state.result}
    onRetry={state.handleRetry} warnings={state.warnings} />
}

export function ControlsSlot({ state }: { state: DescriptiveState }) {
  return <DescriptiveControls state={state} />
}

export function ObservationSlot({ state }: { state: DescriptiveState }) {
  return (
    <div className="h-full">
      <DescriptiveStatus state={state} />
      <DescriptiveObservation result={state.result} config={state.config} rows={state.visibleRows} hasData={state.hasData}
        loaded={state.loaded} precision={state.precision} isComputing={state.isComputing} />
    </div>
  )
}

export function NotebookSlot({ state }: { state: DescriptiveState }) {
  return (
    <DescriptiveNotebook result={state.result} config={state.config} precision={state.precision}
      hasData={state.hasData} loaded={state.loaded} />
  )
}
