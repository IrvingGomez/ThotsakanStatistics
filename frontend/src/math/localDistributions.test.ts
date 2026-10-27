import { describe, it, expect } from 'vitest'
import { computeLocalDistribution } from './localDistributions'

describe('computeLocalDistribution', () => {
  it('Normal cdf at x=mu is 0.5', () => {
    const r = computeLocalDistribution('Normal', { mu: 0, sigma: 1 }, { kind: 'one-sided', op: '<=', k: 0 })
    expect(r.queryResult).toBeCloseTo(0.5, 6)
  })

  it('Binomial(20,0.5) pmf sums to 1 and P(X<=10) matches closed form', () => {
    const r = computeLocalDistribution('Binomial', { n: 20, p: 0.5 }, { kind: 'one-sided', op: '<=', k: 10 })
    const sum = (r.probs ?? []).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 3)
    expect(r.queryResult).toBeCloseTo(0.5881, 3)
  })

  it('Poisson mean/variance equal lambda, cdf(2) matches closed form', () => {
    const r = computeLocalDistribution('Poisson', { lambda: 4 }, { kind: 'one-sided', op: '<=', k: 2 })
    expect(r.theorMean).toBe(4)
    expect(r.theorVariance).toBe(4)
    expect(r.queryResult).toBeCloseTo(0.238103, 5)
  })

  it('Gamma(2,1) cdf(2) matches closed-form Erlang CDF', () => {
    const r = computeLocalDistribution('Gamma', { alpha: 2, beta: 1 }, { kind: 'one-sided', op: '<=', k: 2 })
    expect(r.queryResult).toBeCloseTo(0.593994, 5)
  })

  it('Beta(2,2) cdf(0.5) is 0.5 by symmetry', () => {
    const r = computeLocalDistribution('Beta', { alpha: 2, beta: 2 }, { kind: 'one-sided', op: '<=', k: 0.5 })
    expect(r.queryResult).toBeCloseTo(0.5, 6)
  })

  it("Student's t cdf(0) is 0.5 and matches df=10 critical value table", () => {
    const r0 = computeLocalDistribution("Student's t", { nu: 10 }, { kind: 'one-sided', op: '<=', k: 0 })
    expect(r0.queryResult).toBeCloseTo(0.5, 6)
    const r1 = computeLocalDistribution("Student's t", { nu: 10 }, { kind: 'one-sided', op: '<=', k: 1.812 })
    expect(r1.queryResult).toBeCloseTo(0.95, 2)
  })

  it('Hypergeometric mean/variance match combinatorial formula', () => {
    const r = computeLocalDistribution('Hypergeometric', { N: 50, K: 20, n: 10 }, { kind: 'one-sided', op: '<=', k: 4 })
    expect(r.theorMean).toBeCloseTo(4, 6)
    expect(r.theorVariance).toBeCloseTo(1.959184, 5)
    const sum = (r.probs ?? []).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 3)
  })

  // Same values as the backend (scipy): a finite density at a support edge is drawn, a pole is drawn as 0.
  it.each([
    ['Beta', { alpha: 1, beta: 1 }, 1, 1],
    ['Beta', { alpha: 1, beta: 5 }, 5, 0],
    ['Beta', { alpha: 2, beta: 1 }, 0, 2],
    ['Beta', { alpha: 0.5, beta: 0.5 }, 0, 0],
    ['Gamma', { alpha: 1, beta: 5 }, 5, null],
    ['Gamma', { alpha: 0.5, beta: 1 }, 0, null],
    ['Chi-squared', { k: 2 }, 0.5, null],
    ['Chi-squared', { k: 1 }, 0, null],
  ] as const)('%s %o density at the support edges', (dist, params, first, last) => {
    const ys = computeLocalDistribution(dist, params, { kind: 'one-sided', op: '<=', k: 0.5 }).ys ?? []
    expect(ys[0]).toBeCloseTo(first, 9)
    if (last !== null) expect(ys[ys.length - 1]).toBeCloseTo(last, 9)
  })
})
