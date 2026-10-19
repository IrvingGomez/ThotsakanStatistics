import StatusBanner, { NoDataState } from '../../../components/StatusBanner'
import GraphicalControls from './GraphicalControls'
import GraphicalObservation from './GraphicalObservation'
import GraphicalNotebook from './GraphicalNotebook'
import type { GraphicalTabState } from './useGraphicalTabState'

interface SlotProps { state: GraphicalTabState }

export function ControlsSlot({ state }: SlotProps) {
  return <GraphicalControls state={state} />
}

/** Warnings describe the plot on screen, so they appear with the plot only. */
function Status({ state, warnings = false }: SlotProps & { warnings?: boolean }) {
  return (
    <StatusBanner isComputing={state.isComputing} error={state.error} hasResult={!!state.result} onRetry={state.retry}
      warnings={warnings ? state.warnings : undefined}>
      {state.appliedContext && <p>Applied: {state.appliedContext}</p>}
      {state.appliedSettings && <details className="mt-1"><summary className="cursor-pointer">Applied graph settings</summary><p className="mt-1">{state.appliedSettings}</p></details>}
    </StatusBanner>
  )
}

export function ObservationSlot({ state }: SlotProps) {
  return (
    <div className="analysis-panel flex flex-col min-h-0">
      <Status state={state} warnings />
      {(!state.error || state.result) && <GraphicalObservation result={state.result} column={state.column} graphType={state.graphType}
        hasData={state.hasData} loaded={!!state.sessionId} isComputing={state.isComputing} />}
    </div>
  )
}

export function NotebookSlot({ state }: SlotProps) {
  if (!state.hasData) return <NoDataState loaded={!!state.sessionId} topic="see the interpretation and notes" compact />
  return (
    <div className="analysis-panel">
      <Status state={state} />
      {(state.result || (!state.error && !state.isComputing)) && <GraphicalNotebook result={state.result} column={state.column} graphType={state.graphType}
        precision={state.precision} />}
    </div>
  )
}
