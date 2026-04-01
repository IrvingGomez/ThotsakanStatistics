import type { IntervalsResponse, ConfidenceRegionsResponse } from '../../../api/inference'
import InferenceControls from './InferenceControls'
import InferenceObservation from './InferenceObservation'
import InferenceNotebook from './InferenceNotebook'
import type { InferenceConfig } from './useInferenceTabState'

interface SlotProps {
  ciResult: IntervalsResponse | null
  piResult: IntervalsResponse | null
  regionResult: ConfidenceRegionsResponse | null
  hasData: boolean
  isComputing: boolean
  precision: number
  onRun: (cfg: InferenceConfig) => void
  onReset: () => void
}

export function ControlsSlot({ onRun, onReset, isComputing }: Pick<SlotProps, 'onRun' | 'onReset' | 'isComputing'>) {
  return <InferenceControls onRun={onRun} onReset={onReset} isComputing={isComputing} />
}

export function ObservationSlot({ ciResult, piResult, regionResult, hasData, precision, isComputing }: Pick<SlotProps, 'ciResult' | 'piResult' | 'regionResult' | 'hasData' | 'precision' | 'isComputing'>) {
  return (
    <div className="h-full relative">
      <InferenceObservation ciRow={ciResult} piRow={piResult} regionData={regionResult} hasData={hasData} precision={precision} isComputing={isComputing} />
      {isComputing && (
        <div className="absolute inset-0 bg-[var(--color-bg-base)]/50 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
          <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-4 py-2 rounded-lg shadow-lg text-sm font-semibold flex items-center gap-2">
            <span className="animate-spin text-lg">⚙️</span> Computing Inference...
          </div>
        </div>
      )}
    </div>
  )
}

export function NotebookSlot({ ciResult, piResult, regionResult, precision }: Pick<SlotProps, 'ciResult' | 'piResult' | 'regionResult' | 'precision'>) {
  return <InferenceNotebook ciResult={ciResult} piResult={piResult} regionResult={regionResult} precision={precision} />
}
