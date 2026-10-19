import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DistParams, DistResult } from '../../../hooks/useDistribution'

vi.mock('react-plotly.js/factory', () => ({ default: () => () => null }))
vi.mock('plotly.js-basic-dist-min', () => ({ default: {} }))
import CommonDistObservation from './CommonDistObservation'
import CommonDistControls from './CommonDistControls'
import CommonDistNotebook from './CommonDistNotebook'
import katex from 'katex'
import { DIST_FORMULAS } from './distributionFormulas'
import { DISTRIBUTIONS } from '../../../hooks/useDistribution'

const params: DistParams = { distName: 'Poisson', paramValues: { lambda: 5 }, queryOp: '<=', queryK: 5 }
const result: DistResult = {
  ks: [0, 1], probs: [0.5, 0.5], cumProbs: [0.5, 1], queryResult: 0.61596, theorMean: 1.23456, theorVariance: 5,
  provisional: false, requestFingerprint: '',
}

let root: Root
let container: HTMLDivElement
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => { act(() => root.unmount()); container.remove() })

describe('Probability panels', () => {
  it('shows the shared error box with Retry when the request fails', () => {
    const onRetry = vi.fn()
    act(() => root.render(<CommonDistObservation distParams={params} appliedParams={null} result={result} isLoading={false}
      error="boom" onRetry={onRetry} precision={3} />))
    expect(container.textContent).toContain('Couldn’t update results')
    expect(container.textContent).toContain('boom')
    act(() => [...container.querySelectorAll('button')].find((button) => button.textContent === 'Retry')!.click())
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('numbers follow display precision', () => {
    act(() => root.render(<CommonDistObservation distParams={params} appliedParams={params} result={result} isLoading={false}
      error={null} onRetry={() => {}} precision={2} />))
    expect(container.textContent).toContain('1.23')
    expect(container.textContent).not.toContain('1.235')
    expect(container.textContent).toContain('0.62')
  })

  it('left panel holds no result', () => {
    act(() => root.render(<CommonDistControls modelType="discrete" distName="Poisson" paramValues={{ lambda: 5 }} queryOp="<=" queryK={5}
      onModelTypeChange={() => {}} onDistChange={() => {}} onParamChange={() => {}} onQueryOpChange={() => {}} onQueryKChange={() => {}} onReset={() => {}} />))
    expect(container.textContent).not.toContain('P(X')
    expect(container.querySelectorAll('input[type="radio"]')).toHaveLength(2)
  })

  it('notebook has parameters and formula but no Key Properties and no repeated result', () => {
    act(() => root.render(<CommonDistNotebook distParams={params} />))
    expect(container.textContent).not.toContain('Key Properties')
    expect(container.textContent).toContain('Support')
    expect(container.textContent).not.toContain('P(X ≤')
    expect(container.textContent).not.toContain('Theoretical')
  })

  it('every distribution has formulas that KaTeX can typeset', () => {
    for (const dist of DISTRIBUTIONS) {
      const formulas = DIST_FORMULAS[dist.name]
      expect(formulas, dist.name).toBeDefined()
      for (const tex of [formulas.density, formulas.support, formulas.parameters, formulas.mean, formulas.variance]) {
        expect(() => katex.renderToString(tex, { throwOnError: true }), `${dist.name}: ${tex}`).not.toThrow()
      }
    }
  })

  it('notebook shows density, mean and variance as typeset math', () => {
    act(() => root.render(<CommonDistNotebook distParams={params} />))
    expect(container.querySelectorAll('.katex').length).toBeGreaterThanOrEqual(5)
    expect(container.textContent).toContain('Mean')
    expect(container.textContent).toContain('Variance')
  })
})
