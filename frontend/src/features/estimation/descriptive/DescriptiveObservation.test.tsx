import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DescriptiveResult, StatRow } from '../../../api/descriptive'
import DescriptiveObservation from './DescriptiveObservation'
import type { DescriptiveConfig } from './useDescriptiveTabState'

vi.mock('react-plotly.js', () => ({ default: () => null }))
vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })

const rows: StatRow[] = [
  { category: 'Central Tendency', measure: 'Mean', value: 1, consistencyCorr: null, statId: 'mean' },
  { category: 'Dispersion', measure: 'Std (ddof=1)', value: 1, consistencyCorr: 1.03, statId: 'std_dev_1' },
  { category: 'Dispersion', measure: 'MAD', value: 1, consistencyCorr: 1.48, robust: true, statId: 'mad' },
]
const result: DescriptiveResult = {
  rows, summary: { n: 10, mean: 1, median: 1, std: 1, iqr: 1 },
  histogram: { binEdges: [0, 1], counts: [10] },
  boxData: { whiskerLo: 0, q1: 1, median: 1, q3: 2, whiskerHi: 3, outliers: [] },
}
const config = (showConsistencyCorr: boolean): DescriptiveConfig => ({
  column: 'score', weightsCol: null, quantileProbs: [], trimAlpha: null, winsorLimits: null,
  showConsistencyCorr, selectedStats: ['mean', 'std_dev_1', 'mad'],
})

let root: Root
let container: HTMLDivElement
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  container = document.createElement('div')
  root = createRoot(container)
})
afterEach(() => act(() => root.unmount()))
const render = (show: boolean) => act(() => root.render(
  <DescriptiveObservation result={result} config={config(show)} rows={rows} hasData loaded precision={2} />))
const headers = () => [...container.querySelectorAll('th')].map((th) => th.textContent)
const rowOf = (name: string) => [...container.querySelectorAll('tbody tr')].find((tr) => tr.textContent?.includes(name))!

describe('Descriptive statistics table', () => {
  it('names the columns Statistic and Normal-corrected', () => {
    render(true)
    expect(headers()).toEqual(['Category', 'Statistic', 'Value', 'Normal-corrected'])
  })

  it('tags each corrected statistic with the properties of its corrected value, in color', () => {
    render(true)
    const tags = (name: string) => [...rowOf(name).querySelectorAll('[data-tag="correction"]')]
    expect(tags('Std (ddof=1)').map((tag) => tag.textContent)).toEqual(['Unbiased', 'Consistent'])
    expect(tags('MAD').map((tag) => tag.textContent)).toEqual(['Consistent'])
    expect(tags('Mean')).toHaveLength(0)
    expect(tags('Std (ddof=1)')[0].className).not.toBe(tags('Std (ddof=1)')[1].className)
    for (const tag of tags('Std (ddof=1)')) expect(tag.className).not.toContain('color-text-muted')
  })

  it('without the normal-corrected column, keeps only the tags of the statistics as shown', () => {
    render(false)
    expect(headers()).toEqual(['Category', 'Statistic', 'Value'])
    const tags = (name: string) => [...rowOf(name).querySelectorAll('[data-tag="correction"]')].map((tag) => tag.textContent)
    expect(tags('Std (ddof=1)')).toEqual(['Consistent'])
    expect(tags('MAD')).toEqual([])
  })
})
