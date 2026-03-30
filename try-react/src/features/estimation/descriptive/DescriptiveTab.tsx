// features/estimation/descriptive/DescriptiveTab.tsx
// Composite that owns descriptive state and renders all three panels via slots

import { useState, useCallback } from 'react'
import { useData } from '../../../context/DataContext'
import type { DescriptiveResult } from '../../../hooks/useDescriptiveStats'
import type { DescriptiveStatsWorker } from '../../../workers/descriptiveStats.worker'
import * as Comlink from 'comlink'
import DescriptiveControls, { type DescriptiveConfig } from './DescriptiveControls'
import DescriptiveObservation from './DescriptiveObservation'
import DescriptiveNotebook from './DescriptiveNotebook'

const worker = new Worker(new URL('../../../workers/descriptiveStats.worker.ts', import.meta.url), { type: 'module' })
const descriptiveWorker = Comlink.wrap<DescriptiveStatsWorker>(worker)

// ─── Slot wrappers ────────────────────────────────────────────────────────────

interface SlotProps {
  result: DescriptiveResult | null
  config: DescriptiveConfig | null
  isComputing: boolean
  hasData: boolean
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

export function ObservationSlot({ result, config, hasData, precision, isComputing }: Pick<SlotProps, 'result' | 'config' | 'hasData' | 'precision' | 'isComputing'>) {
  return (
    <div className="h-full relative">
      <DescriptiveObservation result={result} config={config} hasData={hasData} precision={precision} />
      {isComputing && (
        <div className="absolute inset-0 bg-[var(--color-bg-base)]/50 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
          <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-4 py-2 rounded-lg shadow-lg text-sm font-semibold flex items-center gap-2">
            <span className="animate-spin text-lg">⚙️</span> Computing Statistics...
          </div>
        </div>
      )}
    </div>
  )
}

export function NotebookSlot({ result, config, filename, filteredN, rawN, precision }:
  Pick<SlotProps, 'result' | 'config' | 'filename' | 'filteredN' | 'rawN' | 'precision'>) {
  return (
    <DescriptiveNotebook
      result={result}
      config={config}
      filename={filename}
      filteredN={filteredN}
      rawN={rawN}
      precision={precision}
    />
  )
}

export function useDescriptiveTabState() {
  const { state: dataState, getNumericData, filteredRows } = useData()
  const [result, setResult] = useState<DescriptiveResult | null>(null)
  const [config, setConfig] = useState<DescriptiveConfig | null>(null)
  const [isComputing, setIsComputing] = useState(false)

  const handleRun = useCallback((cfg: DescriptiveConfig) => {
    const data = getNumericData(cfg.column)
    const weights = cfg.weightsCol ? getNumericData(cfg.weightsCol) : null

    setConfig(cfg)
    setIsComputing(true)
    
    descriptiveWorker.computeDescriptiveStats({
      data,
      quantileProbs: cfg.quantileProbs,
      trimAlpha: cfg.trimAlpha,
      winsorLimits: cfg.winsorLimits,
      weights,
    }).then(res => {
      setResult(res)
    }).catch(err => {
      console.error(err)
    }).finally(() => {
      setIsComputing(false)
    })
  }, [getNumericData])

  const handleReset = useCallback(() => {
    setResult(null)
    setConfig(null)
  }, [])

  return {
    result,
    config,
    isComputing,
    handleRun,
    handleReset,
    hasData: dataState.status === 'ready' && dataState.numericCols.length > 0,
    precision: dataState.displayPrecision,
    filename: dataState.filename,
    filteredN: filteredRows.length,
    rawN: dataState.dataset?.rows.length ?? 0,
  }
}
