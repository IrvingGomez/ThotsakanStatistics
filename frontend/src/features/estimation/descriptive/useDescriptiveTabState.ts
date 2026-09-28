import { useCallback, useEffect, useRef, useState } from 'react'
import { useData } from '../../../context/DataContext'
import { computeDescriptiveStats, type DescriptiveResult } from '../../../api/descriptive'
import type { DescriptiveConfig } from './DescriptiveControls'

const DEBOUNCE_MS = 250

interface AppliedDescriptive {
  result: DescriptiveResult
  config: DescriptiveConfig
  filename: string
  filteredN: number
  rawN: number
}

export function useDescriptiveTabState() {
  const { state: dataState, filteredRows } = useData()
  const [applied, setApplied] = useState<AppliedDescriptive | null>(null)
  const [isComputing, setIsComputing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const generation = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const cancel = useCallback(() => {
    generation.current += 1
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  useEffect(() => cancel, [cancel])

  const handleRun = useCallback((cfg: DescriptiveConfig) => {
    cancel()
    if (!dataState.sessionId) {
      setError('No active session. Please upload a dataset first.')
      setIsComputing(false)
      return
    }
    const request = generation.current
    const sessionId = dataState.sessionId
    const filters = dataState.filters
    const context = {
      filename: dataState.filename,
      filteredN: filteredRows.length,
      rawN: dataState.dataset?.rows.length ?? 0,
    }
    setError(null)
    setIsComputing(true)
    timerRef.current = setTimeout(() => {
      const controller = new AbortController()
      abortRef.current = controller
      computeDescriptiveStats({
        sessionId,
        column: cfg.column,
        quantileProbs: cfg.quantileProbs,
        trimAlpha: cfg.trimAlpha,
        winsorLimits: cfg.winsorLimits,
        weightsCol: cfg.weightsCol ?? null,
        filters: Object.keys(filters).length > 0 ? filters : null,
      }, controller.signal).then((result) => {
        if (request !== generation.current || controller.signal.aborted) return
        setApplied({ result, config: cfg, ...context })
      }).catch((cause: unknown) => {
        if (request !== generation.current || controller.signal.aborted) return
        setError(cause instanceof Error ? cause.message : 'Computation failed')
      }).finally(() => {
        if (request === generation.current && !controller.signal.aborted) setIsComputing(false)
      })
    }, DEBOUNCE_MS)
  }, [cancel, dataState.sessionId, dataState.filters, dataState.filename, dataState.dataset, filteredRows.length])

  const handleReset = useCallback(() => {
    cancel()
    setError(null)
    setIsComputing(false)
    // DescriptiveControls immediately submits its restored defaults. Keep the
    // applied result visible until that authoritative replacement arrives.
  }, [cancel])

  return {
    result: applied?.result ?? null,
    config: applied?.config ?? null,
    isComputing,
    error,
    handleRun,
    handleReset,
    hasData: dataState.status === 'ready' && dataState.numericCols.length > 0,
    precision: dataState.displayPrecision,
    filename: applied?.filename ?? dataState.filename,
    filteredN: applied?.filteredN ?? filteredRows.length,
    rawN: applied?.rawN ?? dataState.dataset?.rows.length ?? 0,
  }
}
