import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DescriptiveResult, StatRow } from '../../../api/descriptive'
import DescriptiveObservation from './DescriptiveObservation'
import type { DescriptiveConfig } from './useDescriptiveTabState'

interface Shape { type: string; x0: number; x1: number; y0: number; y1: number; line: { color: string; dash?: string } }
interface Layout { annotations?: unknown[]; shapes?: Shape[] }
const plot = vi.hoisted(() => ({ layout: null as null | Layout, data: [] as { type: string }[] }))
vi.mock('react-plotly.js', () => ({ default: (props: { layout: Layout; data: { type: string }[] }) => { plot.layout = props.layout; plot.data = props.data; return null } }))
vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })

const rows: StatRow[] = [
  { category: 'Central Tendency', measure: 'Mean', value: 1, consistencyCorr: null, statId: 'mean' },
  { category: 'Dispersion', measure: 'Std (ddof=1)', value: 1, consistencyCorr: 1.03, statId: 'std_dev_1' },
  { category: 'Dispersion', measure: 'MAD', value: 1, consistencyCorr: 1.48, robust: true, statId: 'mad' },
]
const result: DescriptiveResult = {
  rows, summary: { n: 10, mean: 1, median: 1, std: 1, iqr: 1 },
  histogram: { binEdges: [0, 1], counts: [10] },
  boxData: { whiskerLo: 0, q1: 1.11111, median: 1.5, q3: 2.22222, whiskerHi: 3, outliers: [7, 8] },
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

describe('Descriptive distribution chart', () => {
  it('draws no numbers on the plot', () => {
    render(true)
    expect(plot.layout?.annotations ?? []).toHaveLength(0)
  })

  it('lists the key values beside the plot, in display precision', () => {
    render(true)
    const legend = container.querySelector('[aria-label="Plot legend"]')!
    const items = [...legend.querySelectorAll('li')].map((li) => li.textContent)
    expect(items).toEqual(['Mean 1.00', 'Median 1.50', 'Box Q1 1.11 – Q3 2.22', 'Whiskers 0.00 – 3.00', 'Outliers 2'])
  })

  it('draws the mean and median over the histogram and again across the box, with a blank gap between', () => {
    render(true)
    expect(plot.data.some((trace) => trace.type === 'box')).toBe(false)
    const shapes = plot.layout?.shapes ?? []
    const box = shapes.find((shape) => shape.type === 'rect')!
    const at = (x: number) => shapes.filter((shape) => shape.x0 === x && shape.x1 === x && shape.line.dash)
      .sort((a, b) => a.y0 - b.y0)
    for (const [x, dash] of [[1, 'dash'], [1.5, 'dot']] as const) { // mean, median
      const [histogram, inBox] = at(x)
      expect(at(x)).toHaveLength(2)
      expect([histogram.line.dash, inBox.line.dash]).toEqual([dash, dash])
      expect(histogram.y0).toBe(0)
      expect(histogram.y1).toBeLessThan(box.y0)
      expect([inBox.y0, inBox.y1]).toEqual([box.y0, box.y1])
    }
  })
})
