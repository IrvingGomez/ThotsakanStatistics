import { useState, useCallback } from 'react'
import { useData } from '../../../context/DataContext'
import { computeDescriptiveStats, type DescriptiveResult } from '../../../api/descriptive'
import type { DescriptiveConfig } from './DescriptiveControls'

export function useDescriptiveTabState() {
  const { state: dataState, filteredRows } = useData()
  const [result, setResult] = useState<DescriptiveResult | null>(null)
  const [config, setConfig] = useState<DescriptiveConfig | null>(null)
  const [isComputing, setIsComputing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRun = useCallback((cfg: DescriptiveConfig) => {
    if (!dataState.sessionId) {
      setError('No active session. Please upload a dataset first.')
      return
    }

    setConfig(cfg)
    setError(null)
    setIsComputing(true)
    
    computeDescriptiveStats({
      sessionId: dataState.sessionId,
      column: cfg.column,
      quantileProbs: cfg.quantileProbs,
      trimAlpha: cfg.trimAlpha,
      winsorLimits: cfg.winsorLimits,
      weightsCol: cfg.weightsCol ?? null,
      filters: Object.keys(dataState.filters).length > 0 ? dataState.filters : null
    }).then(res => {
      setResult(res)
    }).catch(err => {
      setResult(null)
      setError(err instanceof Error ? err.message : 'Computation failed')
    }).finally(() => {
      setIsComputing(false)
    })
  }, [dataState.sessionId, dataState.filters])

  const handleReset = useCallback(() => {
    setResult(null)
    setConfig(null)
    setError(null)
  }, [])

  return {
    result,
    config,
    isComputing,
    error,
    handleRun,
    handleReset,
    hasData: dataState.status === 'ready' && dataState.numericCols.length > 0,
    precision: dataState.displayPrecision,
    filename: dataState.filename,
    filteredN: filteredRows.length,
    rawN: dataState.dataset?.rows.length ?? 0,
  }
}
