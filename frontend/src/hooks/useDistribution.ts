import { useMemo } from 'react'

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

// ─── Math helpers ────────────────────────────────────────────────────────────

/** log(n!) via Stirling / sum */
function logFactorial(n: number): number {
  if (n <= 1) return 0
  let sum = 0
  for (let i = 2; i <= n; i++) sum += Math.log(i)
  return sum
}

function logBinomCoeff(n: number, k: number): number {
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k)
}

function logGamma(z: number): number {
  // Lanczos, g=7
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z)
  z -= 1
  let x = c[0]
  for (let i = 1; i < 9; i++) x += c[i] / (z + i)
  const t = z + 7.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
}

/** Regularized incomplete beta function (for binomial/beta CDFs) */
function regularizedBeta(x: number, a: number, b: number): number {
  if (x < 0 || x > 1) return 0
  if (x === 0) return 0
  if (x === 1) return 1
  // Continued fraction (Lentz)
  const lnBeta = logGamma(a) + logGamma(b) - logGamma(a + b)
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a
  return front * betaCF(x, a, b)
}

function betaCF(x: number, a: number, b: number): number {
  const MAXIT = 200, EPS = 3e-7, FPMIN = 1e-30
  let m, m2, aa, del, h
  const qab = a + b, qap = a + 1, qam = a - 1
  let c = 1, d = 1 - qab * x / qap
  if (Math.abs(d) < FPMIN) d = FPMIN
  d = 1 / d; h = d
  for (m = 1; m <= MAXIT; m++) {
    m2 = 2 * m
    aa = m * (b - m) * x / ((qam + m2) * (a + m2))
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d; h *= d * c
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d; del = d * c; h *= del
    if (Math.abs(del - 1) < EPS) break
  }
  return h
}

// ─── PMF / PDF ────────────────────────────────────────────────────────────────

export function pmf(name: string, k: number, p: Record<string, number>): number {
  switch (name) {
    case 'Poisson':
      return Math.exp(k * Math.log(p.lambda) - p.lambda - logFactorial(k))
    case 'Binomial':
      if (k < 0 || k > p.n) return 0
      return Math.exp(logBinomCoeff(p.n, k) + k * Math.log(p.p) + (p.n - k) * Math.log(1 - p.p))
    case 'Geometric':
      if (k < 1) return 0
      return p.p * Math.pow(1 - p.p, k - 1)
    case 'Negative Binomial':
      if (k < 0) return 0
      return Math.exp(logBinomCoeff(k + p.r - 1, k) + p.r * Math.log(p.p) + k * Math.log(1 - p.p))
    case 'Hypergeometric': {
      const N = p.N, K_raw = p.K, n_raw = p.n
      // Clamp to valid domain: K ≤ N, n ≤ N
      const K = Math.min(K_raw, N)
      const n = Math.min(n_raw, N)
      const lo = Math.max(0, n + K - N), hi = Math.min(n, K)
      if (k < lo || k > hi) return 0
      return Math.exp(
        logBinomCoeff(K, k) + logBinomCoeff(N - K, n - k) - logBinomCoeff(N, n)
      )
    }
    default:
      return 0
  }
}

export function pdfVal(name: string, x: number, p: Record<string, number>): number {
  switch (name) {
    case 'Normal': {
      const z = (x - p.mu) / p.sigma
      return Math.exp(-0.5 * z * z) / (p.sigma * Math.sqrt(2 * Math.PI))
    }
    case 'Exponential':
      return x < 0 ? 0 : p.lambda * Math.exp(-p.lambda * x)
    case 'Uniform':
      return p.b <= p.a ? 0 : x < p.a || x > p.b ? 0 : 1 / (p.b - p.a)
    case 'Gamma': {
      if (x <= 0) return 0
      return Math.exp((p.alpha - 1) * Math.log(x) - p.beta * x +
        p.alpha * Math.log(p.beta) - logGamma(p.alpha))
    }
    case 'Beta': {
      if (x <= 0 || x >= 1) return 0
      return Math.exp((p.alpha - 1) * Math.log(x) + (p.beta - 1) * Math.log(1 - x) -
        logGamma(p.alpha) - logGamma(p.beta) + logGamma(p.alpha + p.beta))
    }
    case 'Chi-squared': {
      if (x <= 0) return 0
      const k2 = p.k / 2
      return Math.exp((k2 - 1) * Math.log(x) - x / 2 - k2 * Math.log(2) - logGamma(k2))
    }
    case "Student's t": {
      const nu = p.nu
      return Math.exp(logGamma((nu + 1) / 2) - logGamma(nu / 2)) /
        (Math.sqrt(nu * Math.PI) * Math.pow(1 + x * x / nu, (nu + 1) / 2))
    }
    default:
      return 0
  }
}

// ─── Theoretical statistics ───────────────────────────────────────────────────

export function theoreticalStats(name: string, p: Record<string, number>): {
  mean: number | string; variance: number | string
} {
  switch (name) {
    case 'Poisson':       return { mean: p.lambda, variance: p.lambda }
    case 'Binomial':      return { mean: p.n * p.p, variance: p.n * p.p * (1 - p.p) }
    case 'Geometric':     return { mean: 1 / p.p, variance: (1 - p.p) / (p.p * p.p) }
    case 'Negative Binomial': return { mean: p.r * (1 - p.p) / p.p, variance: p.r * (1 - p.p) / (p.p * p.p) }
    case 'Hypergeometric': {
      const N = p.N, K = Math.min(p.K, p.N), n = Math.min(p.n, p.N)
      return { mean: n * K / N, variance: N <= 1 ? 0 : n * K / N * (1 - K / N) * (N - n) / (N - 1) }
    }
    case 'Normal':        return { mean: p.mu, variance: p.sigma * p.sigma }
    case 'Exponential':   return { mean: 1 / p.lambda, variance: 1 / (p.lambda * p.lambda) }
    case 'Uniform':       return { mean: (p.a + p.b) / 2, variance: (p.b - p.a) ** 2 / 12 }
    case 'Gamma':         return { mean: p.alpha / p.beta, variance: p.alpha / (p.beta * p.beta) }
    case 'Beta':          return {
      mean: p.alpha / (p.alpha + p.beta),
      variance: p.alpha * p.beta / ((p.alpha + p.beta) ** 2 * (p.alpha + p.beta + 1))
    }
    case 'Chi-squared':   return { mean: p.k, variance: 2 * p.k }
    case "Student's t":   return { mean: p.nu > 1 ? 0 : '∞', variance: p.nu > 2 ? p.nu / (p.nu - 2) : '∞' }
    default:              return { mean: '—', variance: '—' }
  }
}

// ─── CDF ────────────────────────────────────────────────────────────────────

export function cdfDiscrete(name: string, k: number, params: Record<string, number>): number {
  if (k < 0) return 0
  const maxK = Math.ceil(k)
  let sum = 0
  for (let i = 0; i <= maxK; i++) sum += pmf(name, i, params)
  return Math.min(sum, 1)
}

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1
  x = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * x)
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))))
  return sign * (1 - poly * Math.exp(-x * x))
}

/** Normal CDF */
function normalCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2))
}

export function cdfContinuous(name: string, x: number, p: Record<string, number>): number {
  switch (name) {
    case 'Normal':       return normalCDF((x - p.mu) / p.sigma)
    case 'Exponential':  return x < 0 ? 0 : 1 - Math.exp(-p.lambda * x)
    case 'Uniform':      return p.b <= p.a ? 0 : x <= p.a ? 0 : x >= p.b ? 1 : (x - p.a) / (p.b - p.a)
    case 'Gamma':        return p.beta * x <= 0 ? 0 : regularizedGamma(p.alpha, p.beta * x)
    case 'Beta':         return regularizedBeta(x, p.alpha, p.beta)
    case 'Chi-squared':  return x <= 0 ? 0 : regularizedGamma(p.k / 2, x / 2)
    case "Student's t": {
      // Correct two-sided Student's t CDF using regularized incomplete beta
      const nu = p.nu
      const y = nu / (nu + x * x)
      const half = 0.5 * regularizedBeta(y, nu / 2, 0.5)
      return x >= 0 ? 1 - half : half
    }
    default:             return 0
  }
}

/** Regularized lower incomplete gamma: P(a, x) */
function regularizedGamma(a: number, x: number): number {
  if (x < 0) return 0
  if (x === 0) return 0
  // Series expansion
  let sum = 1, term = 1
  for (let n = 1; n < 200; n++) {
    term *= x / (a + n)
    sum += term
    if (term < 1e-10) break
  }
  return Math.min(1, Math.exp(-x + a * Math.log(x) - logGamma(a)) * sum / a)
}

// ─── Main hook ───────────────────────────────────────────────────────────────

export type QueryOp = '<=' | '>=' | '=' | '<' | '>'

export interface DistResult {
  // for discrete
  ks?: number[]
  probs?: number[]     // P(X = k) for each bar
  cumProbs?: number[]  // P(X ≤ k) for CDF overlay
  // for continuous
  xs?: number[]
  ys?: number[]        // PDF values
  cdfYs?: number[]     // CDF values
  // query result
  queryResult: number
  theorMean: number | string
  theorVariance: number | string
}

export interface DistParams {
  distName: string
  paramValues: Record<string, number>
  queryOp: QueryOp
  queryK: number      // x or k for the query
}

const DISCRETE_MAX_K: Record<string, (p: Record<string, number>) => number> = {
  'Poisson':            (p) => Math.ceil(p.lambda + 5 * Math.sqrt(p.lambda)) + 1,
  'Binomial':           (p) => p.n,
  'Geometric':          (p) => Math.ceil(1 / p.p + 10 * Math.sqrt((1 - p.p) / (p.p * p.p))),
  'Negative Binomial':  (p) => Math.ceil(p.r * (1 - p.p) / p.p + 10 * Math.sqrt(p.r * (1 - p.p) / (p.p * p.p))),
  'Hypergeometric':     (p) => p.n,
}

const CONTINUOUS_RANGE: Record<string, (p: Record<string, number>) => [number, number]> = {
  'Normal':       (p) => [p.mu - 4 * p.sigma, p.mu + 4 * p.sigma],
  'Exponential':  (p) => [0, 5 / p.lambda],
  'Uniform':      (p) => [Math.min(p.a, p.b) - 0.5, Math.max(p.a, p.b) + 0.5],
  'Gamma':        (p) => [0, (p.alpha + 4 * Math.sqrt(p.alpha)) / p.beta],
  'Beta':         ()  => [0, 1],
  'Chi-squared':  (p) => [0, p.k + 5 * Math.sqrt(2 * p.k)],
  "Student's t":  (p) => [-Math.min(5, p.nu + 3), Math.min(5, p.nu + 3)],
}

export function useDistribution({ distName, paramValues, queryOp, queryK }: DistParams): DistResult {
  return useMemo(() => {
    const dist = DISTRIBUTIONS.find((d) => d.name === distName)
    if (!dist) return { queryResult: 0, theorMean: '—', theorVariance: '—' }

    const { mean: theorMean, variance: theorVariance } = theoreticalStats(distName, paramValues)

    // ── Query result ──────────────────────────────────────────────────────────
    let queryResult = 0
    if (dist.type === 'discrete') {
      const k = Math.round(queryK)
      switch (queryOp) {
        case '<=': queryResult = cdfDiscrete(distName, k, paramValues); break
        case '>=': queryResult = 1 - cdfDiscrete(distName, k - 1, paramValues); break
        case '=':  queryResult = pmf(distName, k, paramValues); break
        case '<':  queryResult = cdfDiscrete(distName, k - 1, paramValues); break
        case '>':  queryResult = 1 - cdfDiscrete(distName, k, paramValues); break
      }
    } else {
      switch (queryOp) {
        case '<=':
        case '<':  queryResult = cdfContinuous(distName, queryK, paramValues); break
        case '>=':
        case '>':  queryResult = 1 - cdfContinuous(distName, queryK, paramValues); break
        case '=':  queryResult = pdfVal(distName, queryK, paramValues); break
      }
    }

    queryResult = isNaN(queryResult) ? 0 : queryResult
    if (!(dist.type === 'continuous' && queryOp === '=')) {
      queryResult = Math.max(0, Math.min(1, queryResult))
    }

    // ── Build chart data ──────────────────────────────────────────────────────
    if (dist.type === 'discrete') {
      const maxK = Math.min(DISCRETE_MAX_K[distName]?.(paramValues) ?? 30, 60)
      const ks: number[] = []
      const probs: number[] = []
      const cumProbs: number[] = []
      for (let k = 0; k <= maxK; k++) {
        ks.push(k)
        probs.push(pmf(distName, k, paramValues))
        cumProbs.push(cdfDiscrete(distName, k, paramValues))
      }
      return { ks, probs, cumProbs, queryResult, theorMean, theorVariance }
    } else {
      const [lo, hi] = CONTINUOUS_RANGE[distName]?.(paramValues) ?? [-5, 5]
      const steps = 200
      const xs: number[] = []
      const ys: number[] = []
      const cdfYs: number[] = []
      for (let i = 0; i <= steps; i++) {
        const x = lo + (i / steps) * (hi - lo)
        xs.push(x)
        ys.push(pdfVal(distName, x, paramValues))
        cdfYs.push(cdfContinuous(distName, x, paramValues))
      }
      return { xs, ys, cdfYs, queryResult, theorMean, theorVariance }
    }
  }, [distName, paramValues, queryOp, queryK])
}
