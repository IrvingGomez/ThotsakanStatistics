import { useState, useEffect, useRef } from 'react'
import { computeDistribution } from '../api/probability'
import type { DistributionResponse } from '../api/probability'
import { computeLocalDistribution } from '../math/localDistributions'

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
      { key: 'K', label: 'Success States (K)', min: 1, max: 50, step: 1, default: 20, decimals: 0, integer: true },
      { key: 'n', label: 'Draws (n)', min: 1, max: 50, step: 1, default: 10, decimals: 0, integer: true },
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
      { key: 'a', label: 'Min (a)', min: -10, max: 9.5, step: 0.5, default: 0, decimals: 2 },
      { key: 'b', label: 'Max (b)', min: -9.5, max: 10, step: 0.5, default: 1, decimals: 2 },
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

// ─── Types ────────────────────────────────────────────────────────────────────

export type QueryOp = '<=' | '>=' | '=' | '<' | '>'

export interface DistResult extends DistributionResponse {
  provisional?: boolean
  requestFingerprint?: string
}

export interface DistParams {
  distName: string
  paramValues: Record<string, number>
  queryOp: QueryOp
  queryK: number
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 250

export function useDistribution({ distName, paramValues, queryOp, queryK }: DistParams): {
  result: DistResult | null
  isLoading: boolean
  error: string | null
  appliedParams: DistParams | null
} {
  const [result, setResult] = useState<DistResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appliedParams, setAppliedParams] = useState<DistParams | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const generation = useRef(0)
  const fingerprint = JSON.stringify([distName, paramValues, queryOp, queryK])

  useEffect(() => {
    const request = ++generation.current
    if (timerRef.current) clearTimeout(timerRef.current)
    abortRef.current?.abort()
    setIsLoading(true)
    setError(null)

    try {
      setResult({ ...computeLocalDistribution(distName, paramValues, queryOp, queryK), provisional: true, requestFingerprint: fingerprint })
    } catch {
      setResult(null)
    }

    timerRef.current = setTimeout(() => {
      const controller = new AbortController()
      abortRef.current = controller

      computeDistribution(
        { distName, params: paramValues, queryOp, queryK },
        controller.signal,
      )
        .then((data) => {
          if (request !== generation.current || controller.signal.aborted) return
          setResult({ ...data, provisional: false, requestFingerprint: fingerprint })
          setAppliedParams({ distName, paramValues: { ...paramValues }, queryOp, queryK })
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
  }, [fingerprint]) // eslint-disable-line react-hooks/exhaustive-deps

  return { result, isLoading, error, appliedParams }
}
