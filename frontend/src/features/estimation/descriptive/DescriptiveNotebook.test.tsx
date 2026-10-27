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
  showConsistencyCorr: true, selectedStats: ['central', 'mean', 'dispersion', 'std_dev_1', 'mad'],
}
const renderWith = (over: Partial<DescriptiveConfig>) =>
  act(() => root.render(<DescriptiveNotebook result={result} config={{ ...config, ...over }} precision={2} hasData loaded />))
const section = (title: string) => [...container.querySelectorAll('section')].find((s) => s.querySelector('h3')?.textContent === title)
const labelsIn = (title: string) => [...section(title)!.querySelectorAll('div > p:first-child')]
const formulaLabels = () => labelsIn('Formulas').map((p) => p.textContent)

let root: Root
let container: HTMLDivElement
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  container = document.createElement('div')
  root = createRoot(container)
  act(() => root.render(<DescriptiveNotebook result={result} config={config} precision={2} hasData loaded />))
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
    expect(section('Bias correction')!.textContent).not.toContain('MAD')
    expect(section('Bias correction')!.textContent).not.toContain('c₄(n =')
    expect(section('Values')!.textContent).toContain('c₄(n =')
  })

  it('puts formulas first and the values last', () => {
    const titles = [...container.querySelectorAll('h3')].map((h) => h.textContent)
    expect(titles).toEqual(['Formulas', 'Bias correction', 'Consistency correction', 'Values'])
  })

  it('shows the formula of each chosen statistic only', () => {
    expect(formulaLabels()).toEqual(['Mean', 'Std dev (ddof=1)', 'MAD (median abs. deviation)'])
    renderWith({ selectedStats: ['central', 'median', 'aad', 'quantiles'] })
    expect(formulaLabels()).toEqual(['Quantiles', 'Median', 'AAD (mean abs. deviation)'])
    expect(container.textContent).not.toMatch(/MAD|Variance|Kurtosis/)
  })

  it('shows only the corrections of the chosen statistics, and no empty section', () => {
    renderWith({ selectedStats: ['central', 'mean', 'iqr'] })
    expect(section('Bias correction')).toBeUndefined()
    expect(section('Consistency correction')!.textContent).toContain('IQR')
    expect(section('Consistency correction')!.textContent).not.toMatch(/MAD|AAD/)
    renderWith({ selectedStats: ['central', 'mean'] })
    expect([...container.querySelectorAll('h3')].map((h) => h.textContent)).toEqual(['Formulas'])
  })

  it('shows the trimmed and winsorized means only when they are chosen', () => {
    renderWith({ selectedStats: ['central', 'mean'], trimAlpha: 0.1, winsorLimits: [0.1, 0.1] })
    expect(container.textContent).not.toMatch(/Trimmed|Winsorized/)
    renderWith({ selectedStats: ['trimmed_mean', 'winsorized_mean'], trimAlpha: 0.1, winsorLimits: [0.1, 0.1] })
    expect(formulaLabels()).toEqual(['Trimmed mean (α = 0.1)', 'Winsorized mean'])
  })

  it('writes skewness and kurtosis over several lines', () => {
    renderWith({ selectedStats: ['skewness', 'kurtosis'] })
    const rows = (label: string) => {
      const formula = labelsIn('Formulas').find((p) => p.textContent === label)!.parentElement!
      return formula.querySelectorAll('math mtr').length
    }
    expect(rows('Skewness')).toBeGreaterThanOrEqual(2)
    expect(rows('Kurtosis')).toBeGreaterThanOrEqual(3)
  })

  it('typesets the formulas of every statistic without errors', () => {
    renderWith({ selectedStats: ['minimum', 'maximum', 'quantiles', 'mean', 'median', 'std_dev_1', 'variance_1', 'iqm', 'trimmed_mean',
      'winsorized_mean', 'geometric_mean', 'harmonic_mean', 'weighted_mean', 'std_dev_0', 'variance_0', 'range', 'iqr', 'mad', 'aad',
      'skewness', 'kurtosis', 'extremes', 'central', 'dispersion'], trimAlpha: 0.1, winsorLimits: [0.1, 0.1], weightsCol: 'w' })
    expect(formulaLabels()).toHaveLength(21)
    expect(container.querySelector('.katex-error')).toBeNull()
  })

  it('typesets the formulas', () => {
    expect(container.querySelectorAll('.katex').length).toBeGreaterThan(0)
    expect(container.querySelector('.katex-error')).toBeNull()
  })
})
