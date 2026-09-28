import AnalysisStatus from '../../../components/AnalysisStatus'
import GraphicalControls from './GraphicalControls'
import GraphicalObservation from './GraphicalObservation'
import GraphicalNotebook from './GraphicalNotebook'
import type { GraphicalTabState } from './useGraphicalTabState'

interface SlotProps { state: GraphicalTabState }

export function ControlsSlot({ state }: SlotProps) {
  return <GraphicalControls state={state} />
}

function Status({ state }: SlotProps) {
  return (
    <AnalysisStatus isComputing={state.isComputing} error={state.error} hasResult={!!state.result}
      isDirty={state.isDirty || state.isPrevious || state.staleOverlays.length > 0} onRetry={state.retry}
      dirtyMessage={state.isDirty ? 'Overlay settings changed — press Run.' : state.staleOverlays.length ? 'Bootstrap overlays need updating — press Run.' : 'Settings changed — update results'}>
      {state.appliedContext && <p>Applied: {state.appliedContext}</p>}
      {state.appliedSettings && <details className="mt-1"><summary className="cursor-pointer">Applied graph settings</summary><p className="mt-1">{state.appliedSettings}</p></details>}
    </AnalysisStatus>
  )
}

export function ObservationSlot({ state }: SlotProps) {
  return (
    <div className="analysis-panel flex flex-col min-h-0">
      <Status state={state} />
      {(!state.error || state.result) && <GraphicalObservation result={state.result} column={state.column} graphType={state.graphType}
        hasData={state.hasData} isComputing={state.isComputing} staleOverlays={state.staleOverlays} />}
    </div>
  )
}

export function NotebookSlot({ state }: SlotProps) {
  return (
    <div className="analysis-panel">
      <Status state={state} />
      {(state.result || (!state.error && !state.isComputing)) && <GraphicalNotebook result={state.result} column={state.column} graphType={state.graphType}
        precision={state.precision} staleOverlays={state.staleOverlays} />}
    </div>
  )
}
