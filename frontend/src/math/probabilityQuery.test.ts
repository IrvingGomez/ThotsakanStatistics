import { describe, expect, it } from 'vitest'
import { computeLocalDistribution, queryDomain } from './localDistributions'
import { clampQuery, defaultQuery, supportError } from './queryDomain'
import { DISTRIBUTIONS, clampParams } from '../hooks/useDistribution'
import { queryIncludes, queryLabel, queryRequestFields, type DistQuery } from './probabilityQuery'

const choose = (n: number, k: number): number => k === 0 ? 1 : (n * choose(n - 1, k - 1)) / k
/** Binomial(20, 0.5): P(X = k) = C(20, k) / 2^20. */
const pmf = (k: number) => choose(20, k) / 2 ** 20
const sum = (ks: number[]) => ks.reduce((total, k) => total + pmf(k), 0)
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)

const binomial = (query: DistQuery) => computeLocalDistribution('Binomial', { n: 20, p: 0.5 }, query).queryResult
const oneSided = (op: '<=' | '<' | '>=' | '>' | '=', k: number): DistQuery => ({ kind: 'one-sided', op, k })
const interval = (lower: number, lowerOp: '<' | '<=', upper: number, upperOp: '<' | '<='): DistQuery =>
  ({ kind: 'interval', lower, lowerOp, upper, upperOp })

describe('probability queries', () => {
  it('P(X = x) is zero for a continuous distribution', () => {
    expect(computeLocalDistribution('Normal', { mu: 0, sigma: 1 }, oneSided('=', 0)).queryResult).toBe(0)
  })

  it('discrete queries are exact for non-integer values, without rounding', () => {
    expect(binomial(oneSided('<=', 2.5))).toBeCloseTo(sum(range(0, 2)), 12)
    expect(binomial(oneSided('<', 2.5))).toBeCloseTo(sum(range(0, 2)), 12)
    expect(binomial(oneSided('>', 2.5))).toBeCloseTo(1 - sum(range(0, 2)), 12)
    expect(binomial(oneSided('=', 2.5))).toBe(0)
    expect(binomial(oneSided('=', 3))).toBeCloseTo(pmf(3), 12)
    expect(binomial(oneSided('<', 3))).toBeCloseTo(sum(range(0, 2)), 12)
    expect(binomial(oneSided('>=', 3))).toBeCloseTo(1 - sum(range(0, 2)), 12)
  })

  it('a discrete interval includes or excludes each end as chosen', () => {
    expect(binomial(interval(2, '<', 5, '<'))).toBeCloseTo(sum([3, 4]), 12)
    expect(binomial(interval(2, '<=', 5, '<'))).toBeCloseTo(sum([2, 3, 4]), 12)
    expect(binomial(interval(2, '<', 5, '<='))).toBeCloseTo(sum([3, 4, 5]), 12)
    expect(binomial(interval(2, '<=', 5, '<='))).toBeCloseTo(sum([2, 3, 4, 5]), 12)
    expect(binomial(interval(3, '<=', 3, '<='))).toBeCloseTo(pmf(3), 12)
    expect(binomial(interval(3, '<', 3, '<='))).toBe(0)
  })

  it('a continuous interval is the difference of the CDF at its ends', () => {
    const result = computeLocalDistribution('Uniform', { a: 0, b: 10 }, interval(2, '<', 5, '<=')).queryResult
    expect(result).toBeCloseTo(0.3, 12)
  })

  it('labels, membership and request fields', () => {
    const query = interval(2, '<', 5, '<=')
    expect(queryLabel(query)).toBe('P(2 < X ≤ 5)')
    expect(queryLabel(oneSided('>=', 1))).toBe('P(X ≥ 1)')
    expect([2, 3, 5, 6].map((x) => queryIncludes(query, x))).toEqual([false, true, true, false])
    expect(queryRequestFields(query)).toEqual({ queryOp: 'between', queryK: 2, queryUpper: 5, lowerOp: '<', upperOp: '<=' })
    expect(queryRequestFields(oneSided('<', 4))).toEqual({ queryOp: '<', queryK: 4 })
  })
})

describe('query domain', () => {
  it('keeps queries inside the support, with a slider over the plotted part', () => {
    expect(queryDomain('Beta', { alpha: 2, beta: 5 })).toMatchObject({ support: [0, 1], min: 0, max: 1 })
    expect(queryDomain('Exponential', { lambda: 1 })).toMatchObject({ support: [0, Infinity], min: 0 })
    expect(queryDomain('Binomial', { n: 20, p: 0.5 })).toMatchObject({ discrete: true, support: [0, 20], min: 0, max: 20, step: 1 })
    expect(supportError(1.5, queryDomain('Beta', { alpha: 2, beta: 5 }))).toBe('Enter a value between 0 and 1.')
    expect(supportError(-1, queryDomain('Exponential', { lambda: 1 }))).toBe('Enter a value of at least 0.')
    expect(supportError(-100, queryDomain('Normal', { mu: 0, sigma: 1 }))).toBeUndefined()
  })

  it('a new distribution starts at its mean, keeping the kind and the signs', () => {
    expect(defaultQuery('Beta', { alpha: 2, beta: 5 })).toEqual({ kind: 'one-sided', op: '<=', k: 0.29 })
    const previous: DistQuery = { kind: 'interval', lower: 0, lowerOp: '<', upper: 0, upperOp: '<' }
    expect(defaultQuery('Normal', { mu: 0, sigma: 1 }, previous)).toEqual({ ...previous, lower: -1, upper: 1 })
  })

  it('a parameter change pulls the query back into the support', () => {
    const domain = queryDomain('Binomial', { n: 10, p: 0.5 })
    expect(clampQuery({ kind: 'one-sided', op: '<=', k: 15 }, domain)).toEqual({ kind: 'one-sided', op: '<=', k: 10 })
    const inside: DistQuery = { kind: 'one-sided', op: '<=', k: 3 }
    expect(clampQuery(inside, domain)).toBe(inside)
  })

  it('Hypergeometric K and n never exceed N; Uniform keeps a below b', () => {
    const hyper = DISTRIBUTIONS.find((dist) => dist.name === 'Hypergeometric')!
    expect(clampParams(hyper, { N: 15, K: 20, n: 18 })).toEqual({ N: 15, K: 15, n: 15 })
    const uniform = DISTRIBUTIONS.find((dist) => dist.name === 'Uniform')!
    expect(clampParams(uniform, { a: 3, b: 1 })).toEqual({ a: 0.5, b: 1 })
  })
})
