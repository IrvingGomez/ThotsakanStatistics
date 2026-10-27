// Probability queries for Common Distributions: P(X op x) or P(x₁ op X op x₂).
// Mirrors _query_result in backend/core/probability/common_distributions/distributions.py.

import type { DistributionRequest } from '../api/probability'

export type QueryOp = '<=' | '>=' | '=' | '<' | '>'
/** The inequality at one end of an interval. */
export type BoundOp = '<' | '<='

export type DistQuery =
  | { kind: 'one-sided'; op: QueryOp; k: number }
  | { kind: 'interval'; lower: number; lowerOp: BoundOp; upper: number; upperOp: BoundOp }

const SYMBOL: Record<QueryOp, string> = { '<=': '≤', '>=': '≥', '=': '=', '<': '<', '>': '>' }
export const opSymbol = (op: QueryOp) => SYMBOL[op]

/** "P(X ≤ 5)" or "P(2 < X ≤ 5)". */
export function queryLabel(query: DistQuery): string {
  return query.kind === 'one-sided'
    ? `P(X ${opSymbol(query.op)} ${query.k})`
    : `P(${query.lower} ${opSymbol(query.lowerOp)} X ${opSymbol(query.upperOp)} ${query.upper})`
}

/** Whether the value x satisfies the query (used to highlight bars and shade the density). */
export function queryIncludes(query: DistQuery, x: number): boolean {
  if (query.kind === 'interval') {
    const aboveLower = query.lowerOp === '<' ? x > query.lower : x >= query.lower
    const belowUpper = query.upperOp === '<' ? x < query.upper : x <= query.upper
    return aboveLower && belowUpper
  }
  switch (query.op) {
    case '<=': return x <= query.k
    case '<': return x < query.k
    case '>=': return x >= query.k
    case '>': return x > query.k
    case '=': return x === query.k
  }
}

interface QueryRV { isDiscrete: boolean; cdf: (x: number) => number; pmf?: (k: number) => number }

/**
 * Exact for any real query value: a discrete X only takes whole numbers, so P(X ≤ 2.5) = P(X ≤ 2),
 * and P(X = x) is 0 for a continuous X or a non-integer x.
 */
export function queryProbability(rv: QueryRV, query: DistQuery): number {
  const atMost = (x: number) => rv.cdf(rv.isDiscrete ? Math.floor(x) : x) // P(X ≤ x)
  const below = (x: number) => rv.cdf(rv.isDiscrete ? Math.ceil(x) - 1 : x) // P(X < x)
  if (query.kind === 'interval') {
    const upper = query.upperOp === '<=' ? atMost(query.upper) : below(query.upper)
    const lower = query.lowerOp === '<' ? atMost(query.lower) : below(query.lower)
    return upper - lower
  }
  switch (query.op) {
    case '<=': return atMost(query.k)
    case '<': return below(query.k)
    case '>=': return 1 - below(query.k)
    case '>': return 1 - atMost(query.k)
    case '=': return rv.isDiscrete && Number.isInteger(query.k) && rv.pmf ? rv.pmf(query.k) : 0
  }
}

/** The query part of the /api/probability/compute request. */
export function queryRequestFields(query: DistQuery): Omit<DistributionRequest, 'distName' | 'params'> {
  return query.kind === 'one-sided'
    ? { queryOp: query.op, queryK: query.k }
    : { queryOp: 'between', queryK: query.lower, queryUpper: query.upper, lowerOp: query.lowerOp, upperOp: query.upperOp }
}
