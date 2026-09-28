import { useCallback, useEffect, useRef, useState } from 'react'
import { useData } from '../../../context/DataContext'
import { inferenceApi, type InferenceParams, type IntervalsResponse, type ConfidenceRegionsResponse } from '../../../api/inference'

export type InferenceConfig = {
  column: string
  estimationType: 'Confidence Intervals' | 'Prediction Intervals' | 'Confidence and Prediction Intervals' | 'Confidence Regions'
  alpha: number
  mean_estimator: string
  median_estimator: string
  sigma_estimator: string
  bootstrap_mean: boolean
  bootstrap_median: boolean
  bootstrap_deviation: boolean
  bootstrap_pi: boolean
  bootstrap_samples: number
  probs: string
  eps_mu: string
  eps_sigma: string
  add_ci_box: boolean
  mu_ci_source: string
}
export type InferenceDraft = {
  column: string
  estimationType: InferenceConfig['estimationType']
  alphaStr: string
  sigmaEst: string
  bootstrapMean: boolean
  bootstrapMedian: boolean
  bootstrapDeviation: boolean
  bootstrapPi: boolean
  samplesStr: string
  crProbs: string
  crEpsMu: string
  crEpsSigma: string
  addCiBox: boolean
  muCiSource: string
  advancedOpen: boolean
  bootstrapOpen: boolean
  estimatorsOpen: boolean
  zoomCI: boolean
}
export const initialInferenceDraft = (column = ''): InferenceDraft => ({
  column, estimationType: 'Confidence and Prediction Intervals', alphaStr: '0.05',
  sigmaEst: 'Deviation (1 ddof)', bootstrapMean: false, bootstrapMedian: false,
  bootstrapDeviation: false, bootstrapPi: false, samplesStr: '1000',
  crProbs: '0.1, 0.5, 0.75, 0.89, 0.95', crEpsMu: '0.1, 0.1', crEpsSigma: '0.05, 0.05',
  addCiBox: true, muCiSource: 'Mean-based CI', advancedOpen: false,
  bootstrapOpen: false, estimatorsOpen: false, zoomCI: false,
})
export function validateInferenceDraft(draft: InferenceDraft): Partial<Record<keyof InferenceDraft, string>> {
  const errors: Partial<Record<keyof InferenceDraft, string>> = {}
  if (!draft.column) errors.column = 'Choose a numeric variable.'
  const alpha = Number(draft.alphaStr)
  if (!draft.alphaStr.trim() || !Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) errors.alphaStr = 'Enter a number greater than 0 and less than 1.'
  const bootstrap = draft.bootstrapMean || draft.bootstrapMedian || draft.bootstrapDeviation || draft.bootstrapPi
  if (draft.estimationType !== 'Confidence Regions' && bootstrap && (!draft.samplesStr.trim() || !Number.isInteger(Number(draft.samplesStr)) || Number(draft.samplesStr) <= 0)) errors.samplesStr = 'Enter a positive whole number of resamples.'
  if (draft.estimationType === 'Confidence Regions') {
    const parts = (value: string) => value.split(',').map(part => part.trim() ? Number(part) : NaN)
    if (parts(draft.crProbs).some(value => !Number.isFinite(value) || value <= 0 || value >= 1)) errors.crProbs = 'Use comma-separated values between 0 and 1, such as 0.5, 0.95.'
    for (const key of ['crEpsMu', 'crEpsSigma'] as const) {
      const padding = parts(draft[key])
      if (padding.length !== 2 || padding.some(value => !Number.isFinite(value) || value < 0)) errors[key] = 'Enter two non-negative values: left, right.'
    }
  }
  return errors
}
function configFromDraft(draft: InferenceDraft): InferenceConfig {
  return {
    column: draft.column, estimationType: draft.estimationType, alpha: Number(draft.alphaStr),
    mean_estimator: 'Sample Mean', median_estimator: 'Sample Median', sigma_estimator: draft.sigmaEst,
    bootstrap_mean: draft.bootstrapMean, bootstrap_median: draft.bootstrapMedian,
    bootstrap_deviation: draft.bootstrapDeviation, bootstrap_pi: draft.bootstrapPi,
    bootstrap_samples: Number(draft.samplesStr) || 1000,
    probs: draft.crProbs, eps_mu: draft.crEpsMu, eps_sigma: draft.crEpsSigma,
    add_ci_box: draft.addCiBox, mu_ci_source: draft.muCiSource,
  }
}
function computationDraft(draft: InferenceDraft) {
  const { advancedOpen: _advanced, bootstrapOpen: _bootstrap, estimatorsOpen: _estimators, zoomCI: _zoom, ...settings } = draft
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
  const [appliedContext, setAppliedContext] = useState<{ filename: string; n: number; filterCount: number } | null>(null)
  const [isComputing, setIsComputing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof InferenceDraft, string>>>({})
  const [partialResult, setPartialResult] = useState(false)
  const [activated, setActivated] = useState(false)
  const [deviationEstimators, setDeviationEstimators] = useState(['Deviation (1 ddof)'])
  const [estimatorError, setEstimatorError] = useState<string | null>(null)
  const generation = useRef(0)
  const lastSubmitted = useRef<InferenceDraft | null>(null)
  const hasData = dataState.status === 'ready' && dataState.numericCols.length > 0
  const dataKey = JSON.stringify([dataState.sessionId, dataState.status, dataState.filters, dataState.numericCols])
  const currentDataKey = useRef(dataKey)
  currentDataKey.current = dataKey
  const clearResult = useCallback(() => {
    generation.current += 1
    setCiResult(null); setPiResult(null); setRegionResult(null)
    setAppliedDraft(null); setAppliedConfig(null); setAppliedContext(null)
    setIsComputing(false); setError(null); setPartialResult(false)
    lastSubmitted.current = null
  }, [])
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
    setAppliedContext({ filename: dataState.filename, n: getNumericData(cfg.column).length, filterCount: Object.keys(dataState.filters).length })
    setError(null); setPartialResult(false); setIsComputing(true)
    setCiResult(null); setPiResult(null); setRegionResult(null)
    const params: InferenceParams = {
      session_id: dataState.sessionId, column: cfg.column, alpha: cfg.alpha,
      mean_estimator: cfg.mean_estimator, median_estimator: cfg.median_estimator, sigma_estimator: cfg.sigma_estimator,
      bootstrap_mean: cfg.bootstrap_mean, bootstrap_median: cfg.bootstrap_median,
      bootstrap_deviation: cfg.bootstrap_deviation, bootstrap_pi: cfg.bootstrap_pi, bootstrap_samples: cfg.bootstrap_samples,
      trim_param: null, winsor_limits: null, weights_column: null,
      filters: Object.keys(dataState.filters).length ? dataState.filters : null,
    }
    try {
      if (cfg.estimationType === 'Confidence Regions') {
        const result = await inferenceApi.computeRegions({
          ...params, probs: cfg.probs.split(',').map(Number), eps_mu: cfg.eps_mu.split(',').map(Number), eps_sigma: cfg.eps_sigma.split(',').map(Number),
          add_ci_box: cfg.add_ci_box, mu_ci_source: cfg.mu_ci_source,
        })
        if (ownsRequest()) setRegionResult(result)
      } else {
        const requests: { label: string; promise: Promise<IntervalsResponse>; apply: (result: IntervalsResponse) => void }[] = []
        if (cfg.estimationType.includes('Confidence')) requests.push({ label: 'Confidence intervals', promise: inferenceApi.computeCI(params), apply: setCiResult })
        if (cfg.estimationType.includes('Prediction')) requests.push({ label: 'Prediction intervals', promise: inferenceApi.computePI(params), apply: setPiResult })
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
  useEffect(() => {
    clearResult()
    setFieldErrors({})
    const next = { ...draftRef.current, column: dataState.numericCols.includes(draftRef.current.column) ? draftRef.current.column : dataState.numericCols[0] ?? '' }
    draftRef.current = next; updateDraft(next)
    if (activated && hasData) void runRef.current(next)
  }, [dataKey, activated, clearResult, hasData])
  useEffect(() => () => { generation.current += 1 }, [])
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
    if (next.column !== previous.column || next.estimationType !== previous.estimationType) void runRef.current(next)
  }, [])
  const handleRun = useCallback(() => runRef.current(draftRef.current), [])
  const handleRetry = useCallback(() => { if (lastSubmitted.current) void runRef.current(lastSubmitted.current) }, [])
  const handleReset = useCallback(() => {
    clearResult()
    const next = initialInferenceDraft(dataState.numericCols[0])
    draftRef.current = next; updateDraft(next); setFieldErrors({})
  }, [clearResult, dataState.numericCols])
  const activate = useCallback(() => setActivated(true), [])
  const isDirty = !!appliedDraft && JSON.stringify(computationDraft(draft)) !== JSON.stringify(computationDraft(appliedDraft))
  return {
    draft, setDraft, appliedConfig, appliedContext, ciResult, piResult, regionResult,
    isComputing, error, isDirty, partialResult, fieldErrors, deviationEstimators, estimatorError,
    handleRun, handleRetry, handleReset, activate, hasData,
    numericCols: dataState.numericCols, precision: dataState.displayPrecision,
    sessionId: dataState.sessionId, filename: dataState.filename,
  }
}
export type InferenceState = ReturnType<typeof useInferenceTabState>
