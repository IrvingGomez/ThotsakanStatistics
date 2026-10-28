import { useCallback, useEffect, useRef, useState } from 'react'
import { useData } from '../../../context/DataContext'
import { inferenceApi, type InferenceParams, type IntervalsResponse, type ConfidenceRegionsResponse } from '../../../api/inference'
import { DEFAULT_SELECTED, DEFAULT_SIGMA_ESTIMATOR, REGION_FLAGS, methodFlags, selectionInfo } from './inferenceOptions'

const AUTO_RUN_DELAY_MS = 250
/** Bootstrap resamples thousands of times, so wait a little longer for the user to stop adjusting. */
const BOOTSTRAP_RUN_DELAY_MS = 700

export type InferenceConfig = {
  column: string
  estimationType: 'Confidence and Prediction Intervals' | 'Confidence Regions'
  alpha: number
  mean_estimator: string
  median_estimator: string
  sigma_estimator: string
  bootstrap_mean: boolean
  bootstrap_median: boolean
  bootstrap_deviation: boolean
  bootstrap_pi: boolean
  bootstrap_samples: number
  ci_mean_normal: boolean
  ci_median_normal: boolean
  ci_deviation_normal: boolean
  pi_mean_normal: boolean
  pi_median_normal: boolean
  pi_iqr_normal: boolean
  wantsCI: boolean
  wantsPI: boolean
  probs: string
  add_ci_box: boolean
}
export type InferenceDraft = {
  column: string
  estimationType: InferenceConfig['estimationType']
  alphaStr: string
  sigmaEst: string
  /** Ticked ids of INTERVAL_TREE; only the visible ones count (see inferenceOptions.ts). */
  selected: string[]
  samplesStr: string
  crProbs: string
  addCiBox: boolean
  ciOpen: boolean
  piOpen: boolean
  zoomCI: boolean
}
export const initialInferenceDraft = (column = ''): InferenceDraft => ({
  column, estimationType: 'Confidence and Prediction Intervals', alphaStr: '0.05',
  sigmaEst: DEFAULT_SIGMA_ESTIMATOR, selected: [...DEFAULT_SELECTED], samplesStr: '1000',
  crProbs: '0.1, 0.5, 0.75, 0.89, 0.95',
  addCiBox: true, ciOpen: false, piOpen: false, zoomCI: false,
})
const usesBootstrap = (draft: InferenceDraft) =>
  draft.estimationType !== 'Confidence Regions' && selectionInfo(draft.selected).anyBootstrap
/** In Confidence Regions α only sets the marginal CI box, so it is hidden (and not checked) while the box is off. */
export const alphaShown = (draft: InferenceDraft) => draft.estimationType !== 'Confidence Regions' || draft.addCiBox
export function validateInferenceDraft(draft: InferenceDraft): Partial<Record<keyof InferenceDraft, string>> {
  const errors: Partial<Record<keyof InferenceDraft, string>> = {}
  if (!draft.column) errors.column = 'Choose a numeric variable.'
  const alpha = Number(draft.alphaStr)
  if (alphaShown(draft) && (!draft.alphaStr.trim() || !Number.isFinite(alpha) || alpha <= 0 || alpha >= 1)) errors.alphaStr = 'Enter a number greater than 0 and less than 1.'
  if (draft.estimationType !== 'Confidence Regions') {
    const info = selectionInfo(draft.selected)
    if (!info.wantsCI && !info.wantsPI) errors.selected = 'Tick at least one interval method to calculate.'
    if (info.anyBootstrap && (!draft.samplesStr.trim() || !Number.isInteger(Number(draft.samplesStr)) || Number(draft.samplesStr) <= 0)) errors.samplesStr = 'Enter a positive whole number of resamples.'
  }
  if (draft.estimationType === 'Confidence Regions') {
    const parts = (value: string) => value.split(',').map(part => part.trim() ? Number(part) : NaN)
    if (parts(draft.crProbs).some(value => !Number.isFinite(value) || value <= 0 || value >= 1)) errors.crProbs = 'Use comma-separated values between 0 and 1, such as 0.5, 0.95.'
  }
  return errors
}
function configFromDraft(draft: InferenceDraft): InferenceConfig {
  const regions = draft.estimationType === 'Confidence Regions'
  const info = selectionInfo(draft.selected)
  // A hidden option is never sent: the deviation estimator only counts while a normality-based
  // option that uses it is ticked, and regions always use the fixed defaults.
  const flags = regions ? REGION_FLAGS : methodFlags(draft.selected)
  return {
    column: draft.column, estimationType: draft.estimationType, alpha: alphaShown(draft) ? Number(draft.alphaStr) : 0.05,
    mean_estimator: 'Sample Mean', median_estimator: 'Sample Median',
    sigma_estimator: !regions && info.needsDeviationEstimator ? draft.sigmaEst : DEFAULT_SIGMA_ESTIMATOR,
    ...flags,
    bootstrap_samples: !regions && info.anyBootstrap ? Number(draft.samplesStr) || 1000 : 1000,
    wantsCI: regions ? false : info.wantsCI, wantsPI: regions ? false : info.wantsPI,
    probs: draft.crProbs,
    add_ci_box: draft.addCiBox,
  }
}
/** The settings that change a result. Display-only settings (zoom, panel state) never re-run anything. */
function computationDraft(draft: InferenceDraft) {
  const { ciOpen: _ci, piOpen: _pi, zoomCI: _zoom, ...settings } = draft
  return settings
}
export function useInferenceTabState() {
  const { state: dataState, getNumericData } = useData()
  const [draft, updateDraft] = useState(() => initialInferenceDraft(dataState.numericCols[0]))
  const draftRef = useRef(draft)
  const [ciResult, setCiResult] = useState<IntervalsResponse | null>(null)
  const [piResult, setPiResult] = useState<IntervalsResponse | null>(null)
  const [regionResult, setRegionResult] = useState<ConfidenceRegionsResponse | null>(null)
  const [appliedDraft, setAppliedDraft] = useState<InferenceDraft | null>(null)
  const [appliedConfig, setAppliedConfig] = useState<InferenceConfig | null>(null)
  const [isComputing, setIsComputing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof InferenceDraft, string>>>({})
  const [partialResult, setPartialResult] = useState(false)
  const [activated, setActivated] = useState(false)
  const [resetGeneration, setResetGeneration] = useState(0)
  const [deviationEstimators, setDeviationEstimators] = useState(['Deviation (1 ddof)'])
  const [estimatorError, setEstimatorError] = useState<string | null>(null)
  const generation = useRef(0)
  const autoRun = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelAutoRun = useCallback(() => {
    if (autoRun.current) clearTimeout(autoRun.current)
    autoRun.current = null
  }, [])
  const lastSubmitted = useRef<InferenceDraft | null>(null)
  const hasData = dataState.status === 'ready' && dataState.numericCols.length > 0
  const dataKey = JSON.stringify([dataState.sessionId, dataState.status, dataState.filters, dataState.numericCols])
  const currentDataKey = useRef(dataKey)
  currentDataKey.current = dataKey
  const clearResult = useCallback(() => {
    generation.current += 1
    cancelAutoRun()
    setCiResult(null); setPiResult(null); setRegionResult(null)
    setAppliedDraft(null); setAppliedConfig(null)
    setIsComputing(false); setError(null); setPartialResult(false)
    lastSubmitted.current = null
  }, [cancelAutoRun])
  const run = useCallback(async (submitted: InferenceDraft) => {
    const errors = validateInferenceDraft(submitted)
    if (!dataState.numericCols.includes(submitted.column)) errors.column = 'Choose an available numeric variable.'
    setFieldErrors(errors)
    if (Object.keys(errors).length || !dataState.sessionId || !hasData) return
    const request = ++generation.current
    const environment = dataKey
    const ownsRequest = () => request === generation.current && currentDataKey.current === environment
    const cfg = configFromDraft(submitted)
    lastSubmitted.current = { ...submitted }
    setAppliedDraft({ ...submitted }); setAppliedConfig(cfg)
    setError(null); setPartialResult(false); setIsComputing(true)
    setCiResult(null); setPiResult(null); setRegionResult(null)
    const params: InferenceParams = {
      session_id: dataState.sessionId, column: cfg.column, alpha: cfg.alpha,
      mean_estimator: cfg.mean_estimator, median_estimator: cfg.median_estimator, sigma_estimator: cfg.sigma_estimator,
      bootstrap_mean: cfg.bootstrap_mean, bootstrap_median: cfg.bootstrap_median,
      bootstrap_deviation: cfg.bootstrap_deviation, bootstrap_pi: cfg.bootstrap_pi, bootstrap_samples: cfg.bootstrap_samples,
      ci_mean_normal: cfg.ci_mean_normal, ci_median_normal: cfg.ci_median_normal, ci_deviation_normal: cfg.ci_deviation_normal,
      pi_mean_normal: cfg.pi_mean_normal, pi_median_normal: cfg.pi_median_normal, pi_iqr_normal: cfg.pi_iqr_normal,
      trim_param: null, winsor_limits: null, weights_column: null,
      filters: Object.keys(dataState.filters).length ? dataState.filters : null,
    }
    try {
      if (cfg.estimationType === 'Confidence Regions') {
        const result = await inferenceApi.computeRegions({
          ...params, probs: cfg.probs.split(',').map(Number),
          add_ci_box: cfg.add_ci_box,
        })
        if (ownsRequest()) setRegionResult(result)
      } else {
        const requests: { label: string; promise: Promise<IntervalsResponse>; apply: (result: IntervalsResponse) => void }[] = []
        if (cfg.wantsCI) requests.push({ label: 'Confidence intervals', promise: inferenceApi.computeCI(params), apply: setCiResult })
        if (cfg.wantsPI) requests.push({ label: 'Prediction intervals', promise: inferenceApi.computePI(params), apply: setPiResult })
        const outcomes = await Promise.allSettled(requests.map(item => item.promise))
        if (!ownsRequest()) return
        const failures: string[] = []
        let successes = 0
        outcomes.forEach((outcome, index) => {
          if (outcome.status === 'fulfilled') { requests[index].apply(outcome.value); successes += 1 }
          else failures.push(requests[index].label + ' failed: ' + (outcome.reason instanceof Error ? outcome.reason.message : 'Please retry.'))
        })
        if (failures.length) {
          setPartialResult(successes > 0)
          setError((successes ? 'Partial results. ' : '') + failures.join(' ') + ' Retry uses the settings from this run.')
        }
      }
    } catch (failure) {
      if (ownsRequest()) setError((failure instanceof Error ? failure.message : 'Computation failed.') + ' Retry uses the settings from this run.')
    } finally {
      if (ownsRequest()) setIsComputing(false)
    }
  }, [dataKey, dataState, getNumericData, hasData])
  const runRef = useRef(run)
  runRef.current = run
  const hasDataRef = useRef(hasData)
  hasDataRef.current = hasData
  useEffect(() => {
    clearResult()
    setFieldErrors({})
    const next = { ...draftRef.current, column: dataState.numericCols.includes(draftRef.current.column) ? draftRef.current.column : dataState.numericCols[0] ?? '' }
    draftRef.current = next; updateDraft(next)
    if (activated && hasData) void runRef.current(next)
  }, [dataKey, activated, clearResult, hasData])
  useEffect(() => () => { generation.current += 1; cancelAutoRun() }, [cancelAutoRun])
  useEffect(() => {
    if (!activated || !hasData || !dataState.sessionId || !draft.column) return
    let cancelled = false
    setEstimatorError(null)
    inferenceApi.getEstimators({ session_id: dataState.sessionId, column: draft.column }).then(options => {
      if (!cancelled) setDeviationEstimators(options.deviation_estimators)
    }).catch(() => {
      if (!cancelled) setEstimatorError('Estimator options could not be loaded. The current estimator remains available; select the variable again to retry.')
    })
    return () => { cancelled = true }
  }, [activated, hasData, dataState.sessionId, draft.column])
  const setDraft = useCallback((patch: Partial<InferenceDraft>) => {
    const previous = draftRef.current
    const next = { ...previous, ...patch }
    draftRef.current = next; updateDraft(next)
    setFieldErrors(current => Object.fromEntries(Object.entries(current).filter(([key]) => !(key in patch))))
    if (!hasDataRef.current) return
    if (next.column !== previous.column || next.estimationType !== previous.estimationType) {
      cancelAutoRun()
      void runRef.current(next)
      return
    }
    // Any other change that affects the result updates on its own after a short pause.
    if (JSON.stringify(computationDraft(next)) === JSON.stringify(computationDraft(previous))) return
    cancelAutoRun()
    autoRun.current = setTimeout(() => { autoRun.current = null; void runRef.current(draftRef.current) },
      usesBootstrap(next) ? BOOTSTRAP_RUN_DELAY_MS : AUTO_RUN_DELAY_MS)
  }, [cancelAutoRun])
  const handleRun = useCallback(() => runRef.current(draftRef.current), [])
  const handleRetry = useCallback(() => { if (lastSubmitted.current) void runRef.current(lastSubmitted.current) }, [])
  const handleReset = useCallback(() => {
    clearResult()
    const next = initialInferenceDraft(dataState.numericCols[0])
    draftRef.current = next; updateDraft(next); setFieldErrors({})
    setResetGeneration(value => value + 1)
    // Like every other tab, Reset shows the result for the defaults straight away.
    if (hasDataRef.current) void runRef.current(next)
  }, [clearResult, dataState.numericCols])
  const activate = useCallback(() => setActivated(true), [])
  const isDirty = !!appliedDraft && JSON.stringify(computationDraft(draft)) !== JSON.stringify(computationDraft(appliedDraft))
  return {
    draft, setDraft, appliedConfig, ciResult, piResult, regionResult,
    isComputing, error, isDirty, partialResult, fieldErrors, deviationEstimators, estimatorError,
    handleRun, handleRetry, handleReset, activate, hasData, resetGeneration,
    numericCols: dataState.numericCols, precision: dataState.displayPrecision,
    sessionId: dataState.sessionId, filename: dataState.filename,
  }
}
export type InferenceState = ReturnType<typeof useInferenceTabState>
