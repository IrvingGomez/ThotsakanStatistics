import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GraphicalResponse } from '../../../api/graphical'
import { PLOT_COLORS } from '../../../plot/theme'
import GraphicalObservation from './GraphicalObservation'

vi.mock('plotly.js-basic-dist-min', () => ({ default: {} }))
vi.mock('react-plotly.js/factory', () => ({
  default: () => ({ data, layout }: { data: unknown[]; layout: unknown }) =>
    <div data-plot={JSON.stringify(data)} data-layout={JSON.stringify(layout)} />,
}))

let root: Root
let container: HTMLDivElement
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

const base = { summary: { n: 20, n_unique: 4 }, warnings: [] as string[] }
async function draw(result: GraphicalResponse, graphType: string) {
  await act(async () => root.render(<GraphicalObservation result={result} column="Dice" graphType={graphType} hasData isComputing={false} />))
  const element = container.querySelector<HTMLElement>('[data-plot]')!
  return {
    traces: JSON.parse(element.dataset.plot!) as Record<string, any>[],
    layout: JSON.parse(element.dataset.layout!) as Record<string, any>,
  }
}

describe('Graphical observation', () => {
  it('draws the empirical PMF as bars, like the Common Distributions tab, not lollipops', async () => {
    const { traces, layout } = await draw({ ...base, pmf_data: { values: [1, 2, 3, 4], probs: [0.1, 0.2, 0.3, 0.4] } }, 'PMF')
    expect(traces).toHaveLength(1)
    expect(traces[0]).toMatchObject({ type: 'bar', x: [1, 2, 3, 4], y: [0.1, 0.2, 0.3, 0.4], name: 'Probability' })
    expect(traces[0].width).toBeCloseTo(0.8)
    expect(layout.bargap).toBe(0.15)
    expect(traces.some(trace => trace.type === 'scatter' && trace.mode === 'markers' && trace.name === 'Probability')).toBe(false)
  })

  it('sizes PMF bars from the gaps between uneven values, and copes with a single value', async () => {
    const uneven = await draw({ ...base, pmf_data: { values: [0, 0.5, 2], probs: [0.2, 0.3, 0.5] } }, 'PMF')
    expect(uneven.traces[0].width).toBeCloseTo(0.4)
    const single = await draw({ ...base, pmf_data: { values: [7], probs: [1] } }, 'PMF')
    expect(single.traces[0].width).toBeUndefined()
  })

  it('draws the histogram with touching bars and no interval strip', async () => {
    const { traces, layout } = await draw({ ...base, histogram_data: { bins: [0, 1, 2], counts: [4, 6], densities: [0.4, 0.6] } }, 'Histogram')
    expect(traces[0]).toMatchObject({ type: 'bar', y: [0.4, 0.6] })
    expect(layout.bargap).toBe(0.02)
    expect(layout.yaxis2).toBeUndefined()
    expect(traces.some(trace => trace.yaxis === 'y2')).toBe(false)
  })

  it('draws data in the shared theme color', async () => {
    const { traces } = await draw({ ...base, histogram_data: { bins: [0, 1], counts: [4], densities: [1] } }, 'Histogram')
    expect(traces[0].marker.color).toBe(PLOT_COLORS.data)
  })

  it('draws the ECDF as a step line with its band and keeps the 0–1 axis', async () => {
    const { traces, layout } = await draw({ ...base, ecdf_data: { x: [1, 2], y: [0.5, 1], epsilon: 0.2, lower: [0.3, 0.8], upper: [0.7, 1] } }, 'ECDF')
    expect(traces.at(-1)).toMatchObject({ name: 'ECDF', line: { shape: 'hv' } })
    expect(traces.some(trace => trace.name === 'DKW band')).toBe(true)
    expect(layout.yaxis.range).toEqual([0, 1.05])
  })
})
