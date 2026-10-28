import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GraphicalResponse } from '../../../api/graphical'
import { HISTOGRAM_MARKER, PLOT_COLORS } from '../../../plot/theme'
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
  await act(async () => root.render(<GraphicalObservation result={result} column="Dice" graphType={graphType} hasData loaded isComputing={false} />))
  const element = container.querySelector<HTMLElement>('[data-plot]')!
  return {
    traces: JSON.parse(element.dataset.plot!) as Record<string, any>[],
    layout: JSON.parse(element.dataset.layout!) as Record<string, any>,
  }
}

describe('Graphical observation', () => {
  it('draws no rug, even if an old response carries one', async () => {
    const { traces } = await draw({ ...base, histogram_data: { bins: [0, 1], counts: [4], densities: [1] }, rug_data: { x: [0.5], n_shown: 1, n_total: 1 } } as GraphicalResponse, 'Histogram')
    expect(traces.some(trace => trace.name === 'Observations')).toBe(false)
  })

  it('draws the histogram with touching bars and no interval strip', async () => {
    const { traces, layout } = await draw({ ...base, histogram_data: { bins: [0, 1, 2], counts: [4, 6], densities: [0.4, 0.6] } }, 'Histogram')
    expect(traces[0]).toMatchObject({ type: 'bar', y: [0.4, 0.6] })
    expect(layout.bargap).toBe(0.02)
    expect(layout.yaxis2).toBeUndefined()
    expect(traces.some(trace => trace.yaxis === 'y2')).toBe(false)
  })

  it('offers no histogram data table, for whole-number or continuous variables alike', async () => {
    // Until variables are classified as discrete or continuous, a table that only sometimes appears would read as a bug.
    for (const unit_width of [true, false]) {
      await draw({ ...base, histogram_data: { bins: [0.5, 1.5, 2.5], counts: [4, 6], densities: [0.4, 0.6], unit_width } }, 'Histogram')
      expect(container.textContent).not.toContain('View histogram data')
      expect(container.querySelector('[role="region"]')).toBeNull()
    }
  })

  it('shows the shared empty state when there is no result yet', async () => {
    await act(async () => root.render(<GraphicalObservation result={null} column="Dice" graphType="Histogram" hasData loaded isComputing={false} />))
    expect(container.textContent).toContain('Choose the settings in the left panel to see results.')
  })

  it('draws the histogram in the soft look shared by every Statistics tab', async () => {
    const { traces } = await draw({ ...base, histogram_data: { bins: [0, 1], counts: [4], densities: [1] } }, 'Histogram')
    expect(traces[0].marker).toEqual(HISTOGRAM_MARKER)
  })

  it('draws the KDE in purple, near the data, and the normal density in orange, the model compared against', async () => {
    const { traces } = await draw({ ...base, histogram_data: { bins: [0, 1], counts: [4], densities: [1] },
      kde_curve: { x: [0, 1], y: [0.5, 0.5], bandwidth: 1, default_bandwidth: 1 }, normal_curve: { x: [0, 1], y: [0.4, 0.4], mu: 0.5, sigma: 1 } }, 'Histogram')
    expect(traces.find(trace => trace.name === 'KDE')!.line.color).toBe(PLOT_COLORS.fit)
    expect(traces.find(trace => trace.name === 'Normal density')!.line).toEqual({ color: PLOT_COLORS.normal, width: 2.5, dash: 'longdash' })
  })

  it('draws the ECDF as a step line with its band and keeps the 0–1 axis', async () => {
    const { traces, layout } = await draw({ ...base, ecdf_data: { x: [1, 2], y: [0.5, 1], epsilon: 0.2, lower: [0.3, 0.8], upper: [0.7, 1] } }, 'ECDF')
    expect(traces.at(-1)).toMatchObject({ name: 'ECDF', mode: 'lines', line: { shape: 'hv', width: 1.5 } })
    expect(traces.some(trace => trace.name === 'DKW band')).toBe(true)
    expect(layout.yaxis.range).toEqual([0, 1.05])
  })
})

describe('Graphical title', () => {
  it('titles the plot with a section heading, as the other tabs, not inside the plot', async () => {
    const { layout } = await draw({ ...base, histogram_data: { bins: [0, 1, 2], counts: [4, 6], densities: [0.4, 0.6] } }, 'Histogram')
    expect(layout.title).toBeUndefined()
    expect(container.querySelector('h3')?.textContent).toBe('Distribution of Dice')
  })
})
