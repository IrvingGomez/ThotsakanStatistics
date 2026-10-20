import { useCallback, useState, useEffect, useRef } from 'react'
import { computeDistribution } from '../api/probability'
import type { DistributionResponse } from '../api/probability'
import { computeLocalDistribution } from '../math/localDistributions'
import { queryRequestFields, type DistQuery } from '../math/probabilityQuery'

// ─── Distribution catalogue ───────────────────────────────────────────────────

export type DistType = 'discrete' | 'continuous'

export interface DistDef {
  name: string
  type: DistType
  params: ParamDef[]
}

export interface ParamDef {
  key: string
  label: string
  min: number
  max: number
  step: number
  default: number
  decimals?: number
  integer?: boolean
  /** The value may not exceed another parameter minus `gap` (Hypergeometric K ≤ N, Uniform a < b). */
  maxParam?: { key: string; gap: number }
  /** The value may not fall below another parameter plus `gap` (Uniform b > a). */
  minParam?: { key: string; gap: number }
}

export const DISTRIBUTIONS: DistDef[] = [
  // ── Discrete ──────────────────────────────────────────────────────────────
  {
    name: 'Poisson',
    type: 'discrete',
    params: [
      { key: 'lambda', label: 'Lambda (λ)', min: 0.1, max: 30, step: 0.1, default: 5, decimals: 1 },
    ],
  },
  {
    name: 'Binomial',
    type: 'discrete',
    params: [
      { key: 'n', label: 'Trials (n)', min: 1, max: 100, step: 1, default: 20, decimals: 0, integer: true },
      { key: 'p', label: 'Success Prob (p)', min: 0.01, max: 0.99, step: 0.01, default: 0.5, decimals: 2 },
    ],
  },
  {
    name: 'Geometric',
    type: 'discrete',
    params: [
      { key: 'p', label: 'Success Prob (p)', min: 0.01, max: 0.99, step: 0.01, default: 0.3, decimals: 2 },
    ],
  },
  {
    name: 'Negative Binomial',
    type: 'discrete',
    params: [
      { key: 'r', label: 'Successes (r)', min: 1, max: 30, step: 1, default: 5, decimals: 0, integer: true },
      { key: 'p', label: 'Success Prob (p)', min: 0.01, max: 0.99, step: 0.01, default: 0.5, decimals: 2 },
    ],
  },
  {
    name: 'Hypergeometric',
    type: 'discrete',
    params: [
      { key: 'N', label: 'Population (N)', min: 5, max: 100, step: 1, default: 50, decimals: 0, integer: true },
      { key: 'K', label: 'Success States (K)', min: 1, max: 100, step: 1, default: 20, decimals: 0, integer: true, maxParam: { key: 'N', gap: 0 } },
      { key: 'n', label: 'Draws (n)', min: 1, max: 100, step: 1, default: 10, decimals: 0, integer: true, maxParam: { key: 'N', gap: 0 } },
    ],
  },
  // ── Continuous ────────────────────────────────────────────────────────────
  {
    name: 'Normal',
    type: 'continuous',
    params: [
      { key: 'mu', label: 'Mean (μ)', min: -10, max: 10, step: 0.1, default: 0, decimals: 2 },
      { key: 'sigma', label: 'Std Dev (σ)', min: 0.1, max: 5, step: 0.1, default: 1, decimals: 2 },
    ],
  },
  {
    name: 'Exponential',
    type: 'continuous',
    params: [
      { key: 'lambda', label: 'Rate (λ)', min: 0.1, max: 5, step: 0.1, default: 1, decimals: 2 },
    ],
  },
  {
    name: 'Uniform',
    type: 'continuous',
    params: [
      { key: 'a', label: 'Min (a)', min: -10, max: 9.5, step: 0.5, default: 0, decimals: 2, maxParam: { key: 'b', gap: 0.5 } },
      { key: 'b', label: 'Max (b)', min: -9.5, max: 10, step: 0.5, default: 1, decimals: 2, minParam: { key: 'a', gap: 0.5 } },
    ],
  },
  {
    name: 'Gamma',
    type: 'continuous',
    params: [
      { key: 'alpha', label: 'Shape (α)', min: 0.1, max: 10, step: 0.1, default: 2, decimals: 2 },
      { key: 'beta', label: 'Rate (β)', min: 0.1, max: 5, step: 0.1, default: 1, decimals: 2 },
    ],
  },
  {
    name: 'Beta',
    type: 'continuous',
    params: [
      { key: 'alpha', label: 'Shape α', min: 0.1, max: 10, step: 0.1, default: 2, decimals: 2 },
      { key: 'beta', label: 'Shape β', min: 0.1, max: 10, step: 0.1, default: 5, decimals: 2 },
    ],
  },
  {
    name: 'Chi-squared',
    type: 'continuous',
    params: [
      { key: 'k', label: 'Degrees of Freedom (k)', min: 1, max: 30, step: 1, default: 3, decimals: 0, integer: true },
    ],
  },
  {
    name: "Student's t",
    type: 'continuous',
    params: [
      { key: 'nu', label: 'Degrees of Freedom (ν)', min: 1, max: 50, step: 1, default: 5, decimals: 0, integer: true },
    ],
  },
]

/** The slider range of a parameter, given the other parameters' current values. */
export function paramBounds(param: ParamDef, values: Record<string, number>): { min: number; max: number } {
  const max = param.maxParam ? Math.min(param.max, values[param.maxParam.key] - param.maxParam.gap) : param.max
  const min = param.minParam ? Math.max(param.min, values[param.minParam.key] + param.minParam.gap) : param.min
  return { min, max }
}

/** Pulls parameters back inside their bounds, e.g. K and n down to N when N is lowered. */
export function clampParams(dist: DistDef, values: Record<string, number>): Record<string, number> {
  const next = { ...values }
  for (const param of dist.params) {
    const { min, max } = paramBounds(param, next)
    next[param.key] = Math.min(max, Math.max(min, next[param.key] ?? param.default))
  }
  return next
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DistResult extends DistributionResponse {
  provisional?: boolean
  requestFingerprint?: string
}

export interface DistParams {
  distName: string
  paramValues: Record<string, number>
  query: DistQuery
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 250

export function useDistribution({ distName, paramValues, query }: DistParams): {
  result: DistResult | null
  isLoading: boolean
  error: string | null
  appliedParams: DistParams | null
  /** Sends the current parameters again, e.g. after a failed request. */
  retry: () => void
} {
  const [result, setResult] = useState<DistResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appliedParams, setAppliedParams] = useState<DistParams | null>(null)
  const [attempt, setAttempt] = useState(0)

  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const generation = useRef(0)
  const fingerprint = JSON.stringify([distName, paramValues, query])

  useEffect(() => {
    const request = ++generation.current
    if (timerRef.current) clearTimeout(timerRef.current)
    abortRef.current?.abort()
    setIsLoading(true)
    setError(null)

    try {
      setResult({ ...computeLocalDistribution(distName, paramValues, query), provisional: true, requestFingerprint: fingerprint })
    } catch {
      setResult(null)
    }

    timerRef.current = setTimeout(() => {
      const controller = new AbortController()
      abortRef.current = controller

      computeDistribution(
        { distName, params: paramValues, ...queryRequestFields(query) },
        controller.signal,
      )
        .then((data) => {
          if (request !== generation.current || controller.signal.aborted) return
          setResult({ ...data, provisional: false, requestFingerprint: fingerprint })
          setAppliedParams({ distName, paramValues: { ...paramValues }, query })
          setIsLoading(false)
        })
        .catch((err: unknown) => {
          if (request !== generation.current || controller.signal.aborted) return
          setError(err instanceof Error ? err.message : String(err))
          setIsLoading(false)
        })
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      controllerCleanup()
    }
    function controllerCleanup() {
      if (request === generation.current) abortRef.current?.abort()
    }
  }, [fingerprint, attempt]) // eslint-disable-line react-hooks/exhaustive-deps

  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  return { result, isLoading, error, appliedParams, retry }
}
