// features/estimation/descriptive/DescriptiveTab.tsx
// Composite that owns descriptive state and renders all three panels via slots

import { type DescriptiveResult } from '../../../api/descriptive'
import DescriptiveControls, { type DescriptiveConfig } from './DescriptiveControls'
import DescriptiveObservation from './DescriptiveObservation'
import DescriptiveNotebook from './DescriptiveNotebook'
import StatusBanner from '../../../components/StatusBanner'

// ─── Slot wrappers ────────────────────────────────────────────────────────────

interface SlotProps {
  result: DescriptiveResult | null
  config: DescriptiveConfig | null
  isComputing: boolean
  error?: string | null
  hasData: boolean
  loaded: boolean
  precision: number
  filename: string
  filteredN: number
  rawN: number
  onRun: (cfg: DescriptiveConfig) => void
  onReset: () => void
}

export function ControlsSlot({ onRun, onReset, isComputing }: Pick<SlotProps, 'onRun' | 'onReset' | 'isComputing'>) {
  return <DescriptiveControls onRun={onRun} onReset={onReset} isComputing={isComputing} />
}

export function ObservationSlot({ result, config, hasData, loaded, precision, isComputing, error = null }: Pick<SlotProps, 'result' | 'config' | 'hasData' | 'loaded' | 'precision' | 'isComputing' | 'error'>) {
  return (
    <div className="h-full">
      <StatusBanner isComputing={isComputing} error={error} hasResult={!!result} />
      <DescriptiveObservation result={result} config={config} hasData={hasData} loaded={loaded} precision={precision} isComputing={isComputing} />
    </div>
  )
}

export function NotebookSlot({ result, config, filename, filteredN, rawN, precision, hasData, loaded }:
  Pick<SlotProps, 'result' | 'config' | 'filename' | 'filteredN' | 'rawN' | 'precision' | 'hasData' | 'loaded'>) {
  return (
    <DescriptiveNotebook
      result={result}
      config={config}
      filename={filename}
      filteredN={filteredN}
      rawN={rawN}
      precision={precision}
      hasData={hasData}
      loaded={loaded}
    />
  )
}

// Removed hook to useDescriptiveTabState.ts
