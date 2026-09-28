import { useCallback, useEffect, useRef, useState } from 'react'
import { useData } from '../../../context/DataContext'
import { graphicalApi, type GraphicalResponse } from '../../../api/graphical'
import { inferenceApi } from '../../../api/inference'
import {
  DEBOUNCE_MS, DEFAULT_CONFIG, configForDataset, heavyOf, isDirty as computeDirty,
  mergeForLive, overlaysNeedingRun, toParams, updateGraphicalConfig, validateGraphicalConfig,
  type GraphicalConfig, type GraphicalFieldErrors, type HeavyConfig,
} from './graphicalState'

export type { GraphicalConfig } from './graphicalState'
export { DEFAULT_CONFIG } from './graphicalState'

const MEANS = ['Sample Mean']
const DEVIATIONS = ['Deviation (1 ddof)']
interface Draft {
  sessionId: string | null
  cfg: GraphicalConfig
  winsorRaw: string
  autoBins: boolean
}
interface Request {
  sessionId: string
  filters: Record<string, string[]>
  filename: string
  cfg: GraphicalConfig
  viaRun: boolean
  owner: string
}
interface Applied extends Request { data: GraphicalResponse }

function describeApplied({ cfg, data }: Applied): string {
  const settings: string[] = []
  if (cfg.graphType === 'Histogram') settings.push(`${cfg.bins ?? 'Auto'} bins`, `KDE ${cfg.addKde ? 'on' : 'off'}`)
  if (cfg.graphType !== 'ECDF') settings.push(`Rug ${cfg.addData ? 'on' : 'off'}`)
  else settings.push(cfg.addConfBand ? `${(cfg.ecdfConfLevel * 100).toFixed(1)}% ECDF band` : 'ECDF band off')
  if (data.normal_curve) settings.push(`Normal curve: ${cfg.normalMuSource}`)
  if (data.interval_bands?.length) {
    settings.push(`${(cfg.confLevel * 100).toFixed(1)}% intervals`)
    if (cfg.addCi) settings.push(`CI: ${cfg.ciChoice}`)
    if (cfg.addPi) settings.push(`PI: ${cfg.piChoice}`)
  }
  if (data.point_estimates?.mu != null || data.point_estimates?.sigma != null) {
    settings.push(cfg.meanEstimator, cfg.sigmaEstimator)
    if (cfg.meanEstimator === 'Trimmed Mean') settings.push(`Trim: ${cfg.trimParam}`)
    if (cfg.meanEstimator === 'Winsorized Mean') settings.push(`Tail limits: ${cfg.winsorLimits}`)
    if (cfg.meanEstimator === 'Weighted Mean') settings.push(`Weights: ${cfg.weightsColumn}`)
  }
  const bootstraps = [cfg.bootstrapMean && 'mean', cfg.bootstrapMedian && 'median', cfg.bootstrapPi && 'prediction'].filter(Boolean)
  if (bootstraps.length) settings.push(`Bootstrap ${bootstraps.join(', ')}: ${cfg.bootstrapSamples} resamples`)
  return settings.join(' · ')
}

function freshDraft(sessionId: string | null, columns: string[]): Draft {
  return { sessionId, cfg: { ...DEFAULT_CONFIG, column: columns[0] ?? '' }, winsorRaw: '0.1, 0.1', autoBins: true }
}

/** Draft survives panel unmounts; only explicit Run applies expensive overlays. */
export function useGraphicalTabState() {
  const { state: dataState } = useData()
  const { sessionId, filters, filename, numericCols } = dataState
  const hasData = dataState.status === 'ready' && numericCols.length > 0
  const filtersKey = JSON.stringify(filters)
  const owner = JSON.stringify([sessionId, filtersKey])
  const ownerRef = useRef(owner)
  ownerRef.current = owner

  const [storedDraft, setDraft] = useState(() => freshDraft(sessionId, numericCols))
  const draft = storedDraft.sessionId === sessionId ? storedDraft : freshDraft(sessionId, numericCols)
  const cfg = configForDataset(draft.cfg, numericCols)
  const draftRef = useRef(draft)
  draftRef.current = { ...draft, cfg }
  const [applied, setApplied] = useState<Applied | null>(null)
  const [committedState, setCommitted] = useState<{ sessionId: string; config: HeavyConfig } | null>(null)
  const committed = committedState?.sessionId === sessionId ? committedState.config : null
  const committedRef = useRef(committed)
  committedRef.current = committed
  const [isComputing, setIsComputing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<GraphicalFieldErrors>({})
  const [resetVersion, setResetVersion] = useState(0)
  const [meanEstimators, setMeanEstimators] = useState(MEANS)
  const [deviationEstimators, setDeviationEstimators] = useState(DEVIATIONS)
  const [estimatorNotice, setEstimatorNotice] = useState<string | null>(null)
  const sequence = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastRequest = useRef<Request | null>(null)

  const cancel = useCallback(() => {
    sequence.current += 1
    abortRef.current?.abort()
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const fire = useCallback((request: Request) => {
    cancel()
    const id = sequence.current
    const controller = new AbortController()
    abortRef.current = controller
    lastRequest.current = request
    setError(null)
    setIsComputing(true)
    graphicalApi.computeGraph(request.sessionId, toParams(request.cfg, request.filters), controller.signal)
      .then((data) => {
        if (id !== sequence.current || controller.signal.aborted || request.owner !== ownerRef.current) return
        setApplied({ ...request, data })
        if (request.viaRun) setCommitted({ sessionId: request.sessionId, config: heavyOf(request.cfg) })
        setIsComputing(false)
      })
      .catch((cause: unknown) => {
        if (id !== sequence.current || controller.signal.aborted || request.owner !== ownerRef.current) return
        setError(cause instanceof Error ? cause.message : String(cause))
        setIsComputing(false)
      })
  }, [cancel])

  useEffect(() => {
    setDraft((previous) => previous.sessionId === sessionId
      ? { ...previous, cfg: configForDataset(previous.cfg, numericCols) }
      : freshDraft(sessionId, numericCols))
    setFieldErrors({})
  }, [sessionId, numericCols])

  useEffect(() => {
    if (!hasData || !sessionId || !cfg.column) return
    let active = true
    setEstimatorNotice(null)
    inferenceApi.getEstimators({ session_id: sessionId, column: cfg.column })
      .then((options) => {
        if (!active) return
        const means = options.mean_estimators.length ? options.mean_estimators : MEANS
        const deviations = options.deviation_estimators.length ? options.deviation_estimators : DEVIATIONS
        setMeanEstimators(means)
        setDeviationEstimators(deviations)
        setDraft((previous) => {
          const current = previous.sessionId === sessionId ? previous : freshDraft(sessionId, numericCols)
          return { ...current, cfg: {
            ...current.cfg,
            meanEstimator: means.includes(current.cfg.meanEstimator) ? current.cfg.meanEstimator : means[0],
            sigmaEstimator: deviations.includes(current.cfg.sigmaEstimator) ? current.cfg.sigmaEstimator : deviations[0],
          } }
        })
      })
      .catch(() => {
        if (!active) return
        setMeanEstimators(MEANS)
        setDeviationEstimators(DEVIATIONS)
        setEstimatorNotice('Estimator choices could not load. Sample mean and sample deviation remain available.')
        setDraft((previous) => ({ ...previous, cfg: { ...previous.cfg, meanEstimator: MEANS[0], sigmaEstimator: DEVIATIONS[0] } }))
      })
    return () => { active = false }
  }, [hasData, sessionId, cfg.column, numericCols])

  // Only live inputs schedule a request. Draft overlay edits update pending state.
  useEffect(() => {
    cancel()
    setError(null)
    if (!hasData || !sessionId || !cfg.column) {
      setIsComputing(false)
      return
    }
    setIsComputing(true)
    const request: Request = {
      sessionId, filters, filename, owner,
      cfg: mergeForLive(draftRef.current.cfg, committedRef.current), viaRun: false,
    }
    timerRef.current = setTimeout(() => fire(request), DEBOUNCE_MS)
    return cancel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasData, sessionId, filtersKey, cfg.column, cfg.graphType, cfg.bins, cfg.addKde,
    cfg.addData, cfg.addConfBand, cfg.ecdfConfLevel, resetVersion, cancel, fire])

  useEffect(() => cancel, [cancel])

  const updateConfig = useCallback(<K extends keyof GraphicalConfig>(key: K, value: GraphicalConfig[K]) => {
    setDraft((previous) => {
      const current = previous.sessionId === sessionId ? previous : freshDraft(sessionId, numericCols)
      return { ...current, cfg: updateGraphicalConfig(current.cfg, key, value) }
    })
    setFieldErrors({})
  }, [sessionId, numericCols])

  const setWinsorRaw = useCallback((winsorRaw: string) => {
    setDraft((previous) => ({ ...previous, winsorRaw }))
    setFieldErrors({})
  }, [])

  const setAutoBins = useCallback((autoBins: boolean) => {
    setDraft((previous) => ({ ...previous, autoBins, cfg: { ...previous.cfg, bins: autoBins ? null : 20 } }))
  }, [])

  const run = useCallback(() => {
    const current = draftRef.current
    const errors = validateGraphicalConfig(current.cfg, current.winsorRaw)
    setFieldErrors(errors)
    if (Object.keys(errors).length || !sessionId || !hasData) return
    const next = {
      ...current.cfg,
      winsorLimits: current.cfg.meanEstimator === 'Winsorized Mean' ? current.winsorRaw : null,
    }
    fire({ sessionId, filters, filename, owner, cfg: next, viaRun: true })
  }, [sessionId, hasData, filters, filename, owner, fire])

  const retry = useCallback(() => {
    const request = lastRequest.current
    if (request?.owner === owner) fire(request)
  }, [owner, fire])

  const reset = useCallback(() => {
    cancel()
    setDraft(freshDraft(sessionId, numericCols))
    setCommitted(null)
    committedRef.current = null
    setApplied(null)
    setFieldErrors({})
    setError(null)
    setIsComputing(false)
    lastRequest.current = null
    setResetVersion((value) => value + 1)
  }, [sessionId, numericCols, cancel])

  const currentApplied = hasData && applied?.sessionId === sessionId ? applied : null
  const result = currentApplied?.data ?? null
  const effectiveDraft = { ...cfg, winsorLimits: cfg.meanEstimator === 'Winsorized Mean' ? draft.winsorRaw : null }
  const isDirty = computeDirty(effectiveDraft, committed)
  const staleOverlays = result && !currentApplied?.viaRun ? overlaysNeedingRun(committed) : []
  const isPrevious = !!currentApplied && currentApplied.owner !== owner
  const appliedContext = currentApplied
    ? `${currentApplied.filename} · ${currentApplied.cfg.column} · ${currentApplied.cfg.graphType} · n = ${currentApplied.data.summary.n} · ${Object.entries(currentApplied.filters).map(([key, values]) => `${key}: ${values.join(', ')}`).join('; ') || 'All rows'}`
    : null
  const appliedSettings = currentApplied ? describeApplied(currentApplied) : null

  return {
    cfg, winsorRaw: draft.winsorRaw, autoBins: draft.autoBins, fieldErrors,
    meanEstimators, deviationEstimators, estimatorNotice, updateConfig, setWinsorRaw, setAutoBins,
    result, column: currentApplied?.cfg.column ?? cfg.column,
    graphType: currentApplied?.cfg.graphType ?? cfg.graphType,
    isComputing, error, isDirty, isPrevious, staleOverlays, appliedContext, appliedSettings,
    run, reset, retry, hasData, numericCols, precision: dataState.displayPrecision, sessionId,
  }
}

export type GraphicalTabState = ReturnType<typeof useGraphicalTabState>
