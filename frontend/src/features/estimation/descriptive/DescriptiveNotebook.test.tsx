import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DescriptiveResult } from '../../../api/descriptive'
import DescriptiveNotebook from './DescriptiveNotebook'
import type { DescriptiveConfig } from './useDescriptiveTabState'

const result: DescriptiveResult = {
  rows: [
    { category: 'Central Tendency', measure: 'Mean', value: 1.23456, consistencyCorr: null, statId: 'mean' },
    { category: 'Dispersion', measure: 'Std (ddof=1)', value: 1.23456, consistencyCorr: 1.3, statId: 'std_dev_1' },
  ],
  summary: { n: 10, mean: 1.23456, median: 1.23456, std: 1.23456, iqr: 1.23456 },
  histogram: { binEdges: [0, 1], counts: [10] },
  boxData: { whiskerLo: 0, q1: 1, median: 1.23456, q3: 2, whiskerHi: 3, outliers: [] },
}
const config: DescriptiveConfig = {
  column: 'score', weightsCol: null, quantileProbs: [0.25, 0.5, 0.75], trimAlpha: null, winsorLimits: null,
  showConsistencyCorr: true, selectedStats: ['mean', 'std_dev_1'],
}

let root: Root
let container: HTMLDivElement
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  container = document.createElement('div')
  root = createRoot(container)
  act(() => root.render(<DescriptiveNotebook result={result} config={config} filteredN={10} rawN={12} precision={2} hasData loaded />))
})
afterEach(() => act(() => root.unmount()))

describe('Descriptive notebook', () => {
  it('has no data story', () => {
    expect(container.textContent).not.toContain('So what?')
    expect(container.textContent).not.toContain('Technical Details')
    expect(container.textContent).not.toContain('What\'s typical?')
  })

  it('uses display precision', () => {
    expect(container.textContent).toContain('1.23')
    expect(container.textContent).not.toContain('1.235')
    expect(container.textContent).toContain((1.23456 / 1.3).toFixed(6)) // c₄ keeps 6 decimals
  })

  it('separates bias corrections from consistency corrections', () => {
    const titles = [...container.querySelectorAll('h3')].map((h) => h.textContent)
    expect(titles).toContain('Bias correction')
    expect(titles).toContain('Consistency correction')
    const bias = [...container.querySelectorAll('section')].find((s) => s.querySelector('h3')?.textContent === 'Bias correction')!
    expect(bias.textContent).toContain('c₄')
    expect(bias.textContent).not.toContain('MAD')
  })

  it('puts the corrections after the general formulas', () => {
    const titles = [...container.querySelectorAll('h3')].map((h) => h.textContent)
    expect(titles).toEqual(['Sample', 'Formulas', 'Bias correction', 'Consistency correction'])
  })

  it('typesets the formulas', () => {
    expect(container.querySelectorAll('.katex').length).toBeGreaterThan(0)
    expect(container.querySelector('.katex-error')).toBeNull()
  })
})
