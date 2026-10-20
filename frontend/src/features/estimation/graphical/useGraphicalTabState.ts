import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useData } from '../../../context/DataContext'
import { graphicalApi, type GraphicalResponse } from '../../../api/graphical'
import { inferenceApi } from '../../../api/inference'
import { estimatorLabel } from '../../../labels'
import {
  DEBOUNCE_MS, DEFAULT_CONFIG, DEFAULT_MU_ESTIMATOR, DEFAULT_SIGMA_ESTIMATOR, SAMPLE_MEDIAN,
  configForDataset, normalApplies, supportedOverlays, toParams, updateGraphicalConfig, validateGraphicalConfig,
  type GraphicalConfig, type GraphicalFieldErrors,
} from './graphicalState'

export type { GraphicalConfig } from './graphicalState'
export { DEFAULT_CONFIG } from './graphicalState'

const MEANS = [DEFAULT_MU_ESTIMATOR]
const DEVIATIONS = [DEFAULT_SIGMA_ESTIMATOR]
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
  owner: string
}
interface Applied extends Request { data: GraphicalResponse }

function describeApplied({ cfg, data }: Applied): string {
  const shows = supportedOverlays(cfg.graphType)
  const settings: string[] = []
  if (shows.bins) settings.push(`${cfg.bins ?? 'Auto'} bins`)
  if (shows.kde) settings.push(`KDE ${cfg.addKde ? 'on' : 'off'}`)
  if (shows.rug) settings.push(`Rug ${cfg.addData ? 'on' : 'off'}`)
  if (shows.confBand) settings.push(cfg.addConfBand ? `α = ${cfg.alpha} ECDF band` : 'ECDF band off')
  if (data.normal_curve) {
    settings.push(`μ: ${estimatorLabel(cfg.muEstimator)}`, `σ: ${estimatorLabel(cfg.sigmaEstimator)}`)
    if (cfg.muEstimator === 'Trimmed Mean') settings.push(`Trim: ${cfg.trimParam}`)
    if (cfg.muEstimator === 'Winsorized Mean') settings.push(`Tail limits: ${cfg.winsorLimits}`)
    if (cfg.muEstimator === 'Weighted Mean') settings.push(`Weights: ${cfg.weightsColumn}`)
  }
  return settings.join(' · ')
}

function freshDraft(sessionId: string | null, columns: string[]): Draft {
  return { sessionId, cfg: { ...DEFAULT_CONFIG, column: columns[0] ?? '' }, winsorRaw: '0.1, 0.1', autoBins: true }
}

/** The draft survives panel unmounts; every setting updates the plot after a short pause. */
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
  const [applied, setApplied] = useState<Applied | null>(null)
  const [isComputing, setIsComputing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetVersion, setResetVersion] = useState(0)
  const [meanEstimators, setMeanEstimators] = useState(MEANS)
  const [deviationEstimators, setDeviationEstimators] = useState(DEVIATIONS)
  const [estimatorNotice, setEstimatorNotice] = useState<string | null>(null)
  const sequence = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastRequest = useRef<Request | null>(null)

  // What the request is built from, and whether the draft is complete enough to send.
  const effective = useMemo<GraphicalConfig>(
    () => ({ ...cfg, winsorLimits: cfg.muEstimator === 'Winsorized Mean' ? draft.winsorRaw : null }),
    [cfg, draft.winsorRaw],
  )
  const fieldErrors: GraphicalFieldErrors = useMemo(
    () => validateGraphicalConfig(effective, draft.winsorRaw), [effective, draft.winsorRaw])
  const valid = Object.keys(fieldErrors).length === 0
  const requestKey = hasData && sessionId && valid ? JSON.stringify(toParams(effective, filters)) : null
  const effectiveRef = useRef(effective)
  effectiveRef.current = effective

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
  }, [sessionId, numericCols])

  // Estimator choices depend on the column (e.g. no geometric mean for negative data).
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
          const muChoices = [...means, SAMPLE_MEDIAN]
          return { ...current, cfg: {
            ...current.cfg,
            muEstimator: muChoices.includes(current.cfg.muEstimator) ? current.cfg.muEstimator : muChoices[0],
            sigmaEstimator: deviations.includes(current.cfg.sigmaEstimator) ? current.cfg.sigmaEstimator : deviations[0],
          } }
        })
      })
      .catch(() => {
        if (!active) return
        setMeanEstimators(MEANS)
        setDeviationEstimators(DEVIATIONS)
        setEstimatorNotice('Estimator choices could not load. Sample mean and sample deviation remain available.')
        setDraft((previous) => ({ ...previous, cfg: { ...previous.cfg, muEstimator: MEANS[0], sigmaEstimator: DEVIATIONS[0] } }))
      })
    return () => { active = false }
  }, [hasData, sessionId, cfg.column, numericCols])

  // One effect: whenever the request would change, ask again after a short pause. An incomplete draft
  // (e.g. half-typed winsor limits) sends nothing and keeps the previous result on screen.
  useEffect(() => {
    cancel()
    setError(null)
    if (requestKey === null || !sessionId) {
      setIsComputing(false)
      return
    }
    setIsComputing(true)
    const request: Request = { sessionId, filters, filename, owner, cfg: effectiveRef.current }
    timerRef.current = setTimeout(() => fire(request), DEBOUNCE_MS)
    return cancel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, sessionId, owner, resetVersion, cancel, fire])

  useEffect(() => cancel, [cancel])

  const updateConfig = useCallback(<K extends keyof GraphicalConfig>(key: K, value: GraphicalConfig[K]) => {
    setDraft((previous) => {
      const current = previous.sessionId === sessionId ? previous : freshDraft(sessionId, numericCols)
      return { ...current, cfg: updateGraphicalConfig(current.cfg, key, value) }
    })
  }, [sessionId, numericCols])

  const setWinsorRaw = useCallback((winsorRaw: string) => {
    setDraft((previous) => ({ ...previous, winsorRaw }))
  }, [])

  const setAutoBins = useCallback((autoBins: boolean) => {
    setDraft((previous) => ({ ...previous, autoBins, cfg: { ...previous.cfg, bins: autoBins ? null : 20 } }))
  }, [])

  const retry = useCallback(() => {
    const request = lastRequest.current
    if (request?.owner === owner) fire(request)
  }, [owner, fire])

  const reset = useCallback(() => {
    cancel()
    setDraft(freshDraft(sessionId, numericCols))
    setApplied(null)
    setError(null)
    setIsComputing(false)
    lastRequest.current = null
    setResetVersion((value) => value + 1)
  }, [sessionId, numericCols, cancel])

  const currentApplied = hasData && applied?.sessionId === sessionId ? applied : null
  const result = currentApplied?.data ?? null
  const appliedSettings = currentApplied ? describeApplied(currentApplied) : null

  return {
    cfg, winsorRaw: draft.winsorRaw, autoBins: draft.autoBins, fieldErrors,
    // Median second: after the mean it is the most common choice.
    muEstimators: [...meanEstimators.slice(0, 1), SAMPLE_MEDIAN, ...meanEstimators.slice(1)], deviationEstimators, estimatorNotice,
    updateConfig, setWinsorRaw, setAutoBins, normalOn: normalApplies(cfg),
    result, warnings: result?.warnings ?? [], column: currentApplied?.cfg.column ?? cfg.column,
    graphType: currentApplied?.cfg.graphType ?? cfg.graphType,
    isComputing, error, appliedSettings, resetVersion,
    reset, retry, hasData, numericCols, precision: dataState.displayPrecision, sessionId,
  }
}

export type GraphicalTabState = ReturnType<typeof useGraphicalTabState>
