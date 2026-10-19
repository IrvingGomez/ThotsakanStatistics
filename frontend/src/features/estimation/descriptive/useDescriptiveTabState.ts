import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useData } from '../../../context/DataContext'
import { computeDescriptiveStats, type DescriptiveResult } from '../../../api/descriptive'
import { summaryLine } from '../../../components/StatusBanner'
import { DEFAULT_SELECTED, isRowVisible, parseQuantiles, visibleStatIds } from './descriptiveOptions'

const DEBOUNCE_MS = 250
const DEFAULT_QUANTILES = '0.25, 0.5, 0.75'

export interface DescriptiveConfig {
  // Request fields: changing one asks the backend again.
  column: string
  weightsCol: string | null
  quantileProbs: number[]
  trimAlpha: number | null
  winsorLimits: [number, number] | null
  // Display fields: changing one only re-filters the result already on screen.
  showConsistencyCorr: boolean
  /** Ids of the statistics that are ticked and visible (see descriptiveOptions.ts). */
  selectedStats: string[]
}

/** The left panel as typed. Text fields stay text until they are valid. */
export interface DescriptiveDraft {
  column: string
  weightsCol: string
  quantilesRaw: string
  trimRaw: string
  winsorRaw: string
  showConsistencyCorr: boolean
  /** Checkbox ids, including group ids (see descriptiveOptions.ts). */
  selected: string[]
  basicOpen: boolean
  advancedOpen: boolean
}

export type DescriptiveFieldErrors = Partial<Record<'column' | 'quantilesRaw' | 'trimRaw' | 'winsorRaw', string>>

export function initialDescriptiveDraft(column = ''): DescriptiveDraft {
  return {
    column, weightsCol: '', quantilesRaw: DEFAULT_QUANTILES, trimRaw: '', winsorRaw: '',
    showConsistencyCorr: true, selected: [...DEFAULT_SELECTED], basicOpen: false, advancedOpen: false,
  }
}

function parsePair(raw: string): [number, number] | null {
  const tokens = raw.split(',').map((s) => s.trim())
  if (tokens.some((token) => token === '')) return null
  const parts = tokens.map(Number)
  return parts.length === 2 && parts.every(Number.isFinite) ? [parts[0], parts[1]] : null
}
const isFraction = (value: number) => Number.isFinite(value) && value >= 0 && value < 0.5

export function validateDescriptiveDraft(draft: DescriptiveDraft): DescriptiveFieldErrors {
  const errors: DescriptiveFieldErrors = {}
  const shown = visibleStatIds(draft.selected)
  if (!draft.column) errors.column = 'Choose a numeric variable.'
  if (shown.includes('quantiles') && parseQuantiles(draft.quantilesRaw) === null) {
    errors.quantilesRaw = 'Enter comma-separated probabilities from 0 to 1, or leave it empty.'
  }
  if (shown.includes('trimmed_mean') && draft.trimRaw.trim() !== '' && !isFraction(Number(draft.trimRaw))) {
    errors.trimRaw = 'Use a value from 0 up to, but not including, 0.5.'
  }
  const pair = parsePair(draft.winsorRaw)
  if (shown.includes('winsorized_mean') && draft.winsorRaw.trim() !== '' && !(pair && pair.every(isFraction))) {
    errors.winsorRaw = 'Enter two fractions from 0 up to, but not including, 0.5, e.g. 0.1, 0.1.'
  }
  return errors
}

/** The config for a valid draft. A hidden option is never sent. */
export function configFromDraft(draft: DescriptiveDraft): DescriptiveConfig {
  const shown = visibleStatIds(draft.selected)
  return {
    column: draft.column,
    weightsCol: shown.includes('weighted_mean') && draft.weightsCol ? draft.weightsCol : null,
    quantileProbs: shown.includes('quantiles') ? parseQuantiles(draft.quantilesRaw) ?? [] : [],
    trimAlpha: shown.includes('trimmed_mean') && draft.trimRaw.trim() !== '' ? Number(draft.trimRaw) : null,
    winsorLimits: shown.includes('winsorized_mean') && draft.winsorRaw.trim() !== '' ? parsePair(draft.winsorRaw) : null,
    showConsistencyCorr: draft.showConsistencyCorr,
    selectedStats: shown,
  }
}

/** Ticking a statistic that needs a parameter fills a sensible default; unticking clears it. */
function withSelection(draft: DescriptiveDraft, next: string[]): DescriptiveDraft {
  const was = (id: string) => draft.selected.includes(id)
  const now = (id: string) => next.includes(id)
  const updated = { ...draft, selected: next }
  if (now('trimmed_mean') && !was('trimmed_mean') && !draft.trimRaw.trim()) updated.trimRaw = '0.10'
  if (!now('trimmed_mean') && was('trimmed_mean')) updated.trimRaw = ''
  if (now('winsorized_mean') && !was('winsorized_mean') && !draft.winsorRaw.trim()) updated.winsorRaw = '0.10, 0.10'
  if (!now('winsorized_mean') && was('winsorized_mean')) updated.winsorRaw = ''
  if (!now('weighted_mean') && was('weighted_mean')) updated.weightsCol = ''
  return updated
}

interface AppliedDescriptive {
  result: DescriptiveResult
  config: DescriptiveConfig
  filename: string
  filteredN: number
  rawN: number
  filterCount: number
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
  const [draft, updateDraft] = useState(() => initialDescriptiveDraft(dataState.numericCols[0]))
  const [applied, setApplied] = useState<AppliedDescriptive | null>(null)
  const [isComputing, setIsComputing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const generation = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  /** Key of the request that produced `applied`, or is in flight. */
  const currentKey = useRef<string | null>(null)
  /** Newest config, so a result that arrives later is shown with the latest display settings. */
  const latestConfig = useRef<DescriptiveConfig | null>(null)

  const hasData = dataState.status === 'ready' && dataState.numericCols.length > 0
  const fieldErrors = useMemo(() => validateDescriptiveDraft(draft), [draft])

  const cancel = useCallback(() => {
    generation.current += 1
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  useEffect(() => cancel, [cancel])

  const submit = useCallback((cfg: DescriptiveConfig) => {
    if (!dataState.sessionId) {
      cancel()
      currentKey.current = null
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
      filterCount: Object.keys(filters).length,
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

  // The panel is usable before any data arrives; pick the first variable once there is one.
  useEffect(() => {
    if (!dataState.numericCols.includes(draft.column)) updateDraft(previous => ({ ...previous, column: dataState.numericCols[0] ?? '' }))
  }, [dataState.numericCols, draft.column])

  // Results update automatically; submit decides whether the backend is needed.
  useEffect(() => {
    if (!hasData || Object.keys(fieldErrors).length > 0) return
    submit(configFromDraft(draft))
  }, [draft, fieldErrors, hasData, submit, attempt])

  const setDraft = useCallback((patch: Partial<DescriptiveDraft>) => {
    updateDraft(previous => {
      const base = patch.selected ? withSelection(previous, patch.selected) : previous
      const { selected: _selected, ...rest } = patch
      return { ...base, ...rest }
    })
  }, [])

  const handleRetry = useCallback(() => {
    currentKey.current = null
    setAttempt(value => value + 1)
  }, [])

  const handleReset = useCallback(() => {
    cancel()
    currentKey.current = null
    setError(null)
    setIsComputing(false)
    // The restored defaults are submitted by the effect above; the applied result stays visible until
    // that authoritative replacement arrives.
    updateDraft(initialDescriptiveDraft(dataState.numericCols[0]))
  }, [cancel, dataState.numericCols])

  const visibleRows = useMemo(() => !applied ? []
    : applied.result.rows.filter((row) => isRowVisible(row, applied.config.selectedStats)), [applied])
  const warnings = useMemo(() => visibleRows.flatMap((row) => row.warning ? [`${row.measure}: ${row.warning}`] : []), [visibleRows])
  const summary = applied && summaryLine([
    applied.filename, applied.config.column, 'n = ' + applied.result.summary.n,
    applied.config.weightsCol && 'weights: ' + applied.config.weightsCol,
    applied.filterCount > 0 && applied.filterCount + ' filter' + (applied.filterCount === 1 ? '' : 's'),
  ])

  return {
    draft,
    setDraft,
    fieldErrors,
    result: applied?.result ?? null,
    config: applied?.config ?? null,
    visibleRows,
    isComputing,
    error,
    handleRetry,
    handleReset,
    hasData,
    loaded: !!dataState.sessionId,
    numericCols: dataState.numericCols,
    precision: dataState.displayPrecision,
    summary,
    warnings,
    filename: applied?.filename ?? dataState.filename,
    filteredN: applied?.filteredN ?? filteredRows.length,
    rawN: applied?.rawN ?? dataState.dataset?.rows.length ?? 0,
  }
}

export type DescriptiveState = ReturnType<typeof useDescriptiveTabState>
