// Keeps a probability query inside the distribution's support, and picks a sensible starting query.

import { distributionMoments, queryDomain, type QueryDomain } from './localDistributions'
import type { DistQuery } from './probabilityQuery'

const decimals = (step: number) => Math.max(0, -Math.floor(Math.log10(step)))

/** Rounds to the slider step, inside the slider range; drops floating-point noise such as 0.30000000000000004. */
export function snapToStep(value: number, domain: QueryDomain): number {
  const snapped = Math.round(value / domain.step) * domain.step
  return Number(Math.min(domain.max, Math.max(domain.min, snapped)).toFixed(decimals(domain.step)))
}

/** Error for a typed value outside the support, e.g. "Enter a value between 0 and 1." */
export function supportError(value: number, domain: QueryDomain): string | undefined {
  const [lo, hi] = domain.support
  if (value >= lo && value <= hi) return undefined
  return Number.isFinite(hi) ? `Enter a value between ${lo} and ${hi}.` : `Enter a value of at least ${lo}.`
}

/**
 * The query a distribution starts with: P(X ≤ mean), or an interval of one standard deviation around
 * the mean. Keeps the kind and the inequality signs of `previous`.
 */
export function defaultQuery(distName: string, params: Record<string, number>, previous?: DistQuery): DistQuery {
  const domain = queryDomain(distName, params)
  const { mean, sd } = distributionMoments(distName, params)
  const center = Number.isFinite(mean) ? mean : (domain.min + domain.max) / 2
  const spread = Number.isFinite(sd) && sd > 0 ? sd : (domain.max - domain.min) / 6
  if (previous?.kind === 'interval') {
    return { ...previous, lower: snapToStep(center - spread, domain), upper: snapToStep(center + spread, domain) }
  }
  return { kind: 'one-sided', op: previous?.op ?? '<=', k: snapToStep(center, domain) }
}

/** Moves query values that left the support (after a parameter change) back to its nearest end. */
export function clampQuery(query: DistQuery, domain: QueryDomain): DistQuery {
  const [lo, hi] = domain.support
  const clamp = (value: number) => Math.min(hi, Math.max(lo, value))
  if (query.kind === 'one-sided') return clamp(query.k) === query.k ? query : { ...query, k: clamp(query.k) }
  const lower = clamp(query.lower)
  const upper = clamp(query.upper)
  return lower === query.lower && upper === query.upper ? query : { ...query, lower, upper }
}
