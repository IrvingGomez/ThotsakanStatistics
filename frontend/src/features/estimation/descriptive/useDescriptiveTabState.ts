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

/**
 * What the backend needs. Everything else in DescriptiveConfig (which statistics are shown, the
 * consistency column) is display-only: changing it re-filters the result already on screen and
 * never triggers a request or a loading state.
 */
function requestKey(cfg: DescriptiveConfig, sessionId: string, filters: unknown) {
  return JSON.stringify([sessionId, filters, cfg.column, cfg.weightsCol, cfg.quantileProbs, cfg.trimAlpha, cfg.winsorLimits])
}

export function useDescriptiveTabState() {
  const { state: dataState, filteredRows } = useData()
  const [applied, setApplied] = useState<AppliedDescriptive | null>(null)
  const [isComputing, setIsComputing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const generation = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  /** Key of the request that produced `applied`, or is in flight. */
  const currentKey = useRef<string | null>(null)
  /** Newest config, so a result that arrives later is shown with the latest display settings. */
  const latestConfig = useRef<DescriptiveConfig | null>(null)

  const cancel = useCallback(() => {
    generation.current += 1
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  useEffect(() => cancel, [cancel])

  const handleRun = useCallback((cfg: DescriptiveConfig) => {
    if (!dataState.sessionId) {
      cancel()
      currentKey.current = null
      setError('No active session. Please upload a dataset first.')
      setIsComputing(false)
      return
    }
    const sessionId = dataState.sessionId
    const filters = dataState.filters
    latestConfig.current = cfg
    const key = requestKey(cfg, sessionId, filters)
    if (key === currentKey.current) {
      // Display-only change: keep the request (finished or in flight) and just re-filter.
      setApplied(previous => previous && { ...previous, config: cfg })
      return
    }
    cancel()
    currentKey.current = key
    const request = generation.current
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
        setApplied({ result, config: latestConfig.current ?? cfg, ...context })
      }).catch((cause: unknown) => {
        if (request !== generation.current || controller.signal.aborted) return
        currentKey.current = null // a failed request must be retried when the same settings come back
        setError(cause instanceof Error ? cause.message : 'Computation failed')
      }).finally(() => {
        if (request === generation.current && !controller.signal.aborted) setIsComputing(false)
      })
    }, DEBOUNCE_MS)
  }, [cancel, dataState.sessionId, dataState.filters, dataState.filename, dataState.dataset, filteredRows.length])

  const handleReset = useCallback(() => {
    cancel()
    currentKey.current = null
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
