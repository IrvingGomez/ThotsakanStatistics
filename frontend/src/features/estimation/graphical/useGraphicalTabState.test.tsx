import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { graphicalApi, type GraphicalResponse } from '../../../api/graphical'
import { inferenceApi } from '../../../api/inference'
import { useGraphicalTabState, type GraphicalTabState } from './useGraphicalTabState'
import { ControlsSlot, NotebookSlot, ObservationSlot } from './GraphicalTab'

function dataFixture() {
  return { state: {
    status: 'ready', sessionId: 'session-a', filename: 'sample.csv',
    numericCols: ['Age', 'Weight'], filters: {} as Record<string, string[]>, displayPrecision: 3,
  } }
}
let data = dataFixture()
vi.mock('../../../context/DataContext', () => ({ useData: () => data }))
vi.mock('./GraphicalObservation', () => ({ default: () => <div>Plot</div> }))

function response(n = 10): GraphicalResponse {
  return { summary: { n, n_unique: n }, histogram_data: { bins: [0, 1, 2], counts: [4, 6], densities: [0.4, 0.6] }, warnings: [] }
}
function pending() {
  let resolve!: (result: GraphicalResponse) => void
  let reject!: (error: Error) => void
  const promise = new Promise<GraphicalResponse>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

let root: Root
let container: HTMLDivElement
let state: GraphicalTabState
function Harness({ controls = true }: { controls?: boolean }) {
  state = useGraphicalTabState()
  return <>
    {controls && <ControlsSlot state={state} />}
    <section aria-label="Observation"><ObservationSlot state={state} /></section>
    <section aria-label="Notebook"><NotebookSlot state={state} /></section>
  </>
}
async function render(controls = true) {
  await act(async () => root.render(<Harness controls={controls} />))
}
async function advance() {
  await act(async () => vi.advanceTimersByTimeAsync(250))
}
async function run() {
  await act(async () => state.run())
}
function panels() {
  return Array.from(container.querySelectorAll('section[aria-label]'))
}

beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.useFakeTimers()
  data = dataFixture()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  vi.spyOn(graphicalApi, 'computeGraph').mockResolvedValue(response())
  vi.spyOn(inferenceApi, 'getEstimators').mockResolvedValue({
    mean_estimators: ['Sample Mean', 'Trimmed Mean', 'Winsorized Mean', 'Weighted Mean'],
    deviation_estimators: ['Deviation (1 ddof)'],
  })
  await render()
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Graphical result ownership and student workflow', () => {
  it('keeps setup and incomplete winsor input across controls unmounts', async () => {
    await act(async () => {
      state.updateConfig('addNormal', true)
      state.updateConfig('meanEstimator', 'Winsorized Mean')
      state.setWinsorRaw('0.1,')
      state.setAutoBins(false)
    })
    await render(false)
    await render(true)
    expect(state.cfg.meanEstimator).toBe('Winsorized Mean')
    expect(state.winsorRaw).toBe('0.1,')
    expect(state.autoBins).toBe(false)
    expect(state.cfg.bins).toBe(20)
  })

  it('marks overlay edits pending without scheduling expensive work', async () => {
    await advance()
    await act(async () => state.updateConfig('addCi', true))
    expect(state.isDirty).toBe(true)
    for (const panel of panels()) expect(panel.textContent).toContain('Overlay settings changed — press Run.')
    await act(async () => {
      state.updateConfig('bootstrapMean', true)
      state.updateConfig('bootstrapSamples', 3000)
    })
    await advance()
    expect(graphicalApi.computeGraph).toHaveBeenCalledTimes(1)
    await run()
    expect(vi.mocked(graphicalApi.computeGraph).mock.calls[1][1]).toMatchObject({ add_ci: true, bootstrap_mean: true, bootstrap_samples: 3000 })
    expect(state.isDirty).toBe(false)
  })

  it('uses committed overlay settings on display changes and asks to rerun dropped bootstrap intervals', async () => {
    await advance()
    await act(async () => {
      state.updateConfig('addCi', true)
      state.updateConfig('bootstrapMean', true)
    })
    await run()
    await act(async () => state.updateConfig('addKde', false))
    await advance()
    expect(vi.mocked(graphicalApi.computeGraph).mock.lastCall?.[1]).toMatchObject({ add_ci: false, bootstrap_mean: false, add_kde: false })
    expect(state.staleOverlays).toEqual(['Confidence interval (bootstrap)'])
    for (const panel of panels()) expect(panel.textContent).toContain('Bootstrap overlays need updating — press Run.')
  })

  it('keeps an edit made during a request pending when that older configuration completes', async () => {
    await advance()
    const request = pending()
    vi.mocked(graphicalApi.computeGraph).mockReturnValueOnce(request.promise)
    await act(async () => state.updateConfig('addCi', true))
    await run()
    await act(async () => state.updateConfig('confLevel', 0.99))
    await act(async () => request.resolve(response(12)))
    expect(state.result?.summary.n).toBe(12)
    expect(state.cfg.confLevel).toBe(0.99)
    expect(state.isDirty).toBe(true)
  })

  it('accepts only the newest completion and ignores older failures during loading', async () => {
    const older = pending()
    const newer = pending()
    vi.mocked(graphicalApi.computeGraph).mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise)
    await advance()
    await act(async () => state.updateConfig('column', 'Weight'))
    await advance()
    await act(async () => older.reject(new Error('Old failure')))
    expect(state.error).toBeNull()
    expect(state.isComputing).toBe(true)
    await act(async () => newer.resolve(response(20)))
    expect(state.result?.summary.n).toBe(20)
    expect(state.column).toBe('Weight')
    expect(state.isComputing).toBe(false)
  })

  it('ignores an older success after a newer result is displayed', async () => {
    const older = pending()
    const newer = pending()
    vi.mocked(graphicalApi.computeGraph).mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise)
    await advance()
    await act(async () => state.updateConfig('column', 'Weight'))
    await advance()
    await act(async () => newer.resolve(response(20)))
    await act(async () => older.resolve(response(5)))
    expect(state.result?.summary.n).toBe(20)
    expect(state.column).toBe('Weight')
  })

  it('invalidates a pending response on Reset while scheduling a fresh base graph', async () => {
    const request = pending()
    vi.mocked(graphicalApi.computeGraph).mockReturnValueOnce(request.promise)
    await advance()
    await act(async () => {
      state.updateConfig('addCi', true)
      state.reset()
    })
    await act(async () => request.resolve(response(99)))
    expect(state.result).toBeNull()
    expect(state.cfg.addCi).toBe(false)
    await advance()
    expect(state.result?.summary.n).toBe(10)
  })

  it('invalidates filter requests and clears old results/drafts for a new dataset', async () => {
    const request = pending()
    vi.mocked(graphicalApi.computeGraph).mockReturnValueOnce(request.promise)
    await advance()
    data = { state: { ...data.state, filters: { Site: ['A'] } } }
    await render()
    await act(async () => request.resolve(response(99)))
    expect(state.result).toBeNull()
    await advance()
    expect(vi.mocked(graphicalApi.computeGraph).mock.lastCall?.[1].filters).toEqual({ Site: ['A'] })
    await act(async () => state.updateConfig('addCi', true))
    data = { state: { ...data.state, sessionId: 'session-b', numericCols: ['Score'] } }
    await render()
    expect(state.result).toBeNull()
    expect(state.cfg.column).toBe('Score')
    expect(state.cfg.addCi).toBe(false)
  })

  it('shows shared failure/retry status and retains previous result with its applied context', async () => {
    await advance()
    vi.mocked(graphicalApi.computeGraph).mockRejectedValueOnce(new Error('Service unavailable'))
    await act(async () => state.updateConfig('addCi', true))
    await run()
    for (const panel of panels()) {
      expect(panel.textContent).toContain('Couldn’t update results')
      expect(panel.textContent).toContain('Previous result — update failed.')
      expect(panel.textContent).toContain('Applied: sample.csv · Age')
      expect(panel.querySelector('button')?.textContent).toBe('Retry')
    }
    await act(async () => state.retry())
    expect(state.error).toBeNull()
    expect(state.isDirty).toBe(false)
    expect(vi.mocked(graphicalApi.computeGraph).mock.lastCall?.[1].add_ci).toBe(true)
  })

  it('gives an initial failure the same recovery in both panels without contradictory empty guidance', async () => {
    vi.mocked(graphicalApi.computeGraph).mockRejectedValueOnce(new Error('Unavailable'))
    await advance()
    for (const panel of panels()) {
      expect(panel.textContent).toContain('Couldn’t update results')
      expect(panel.textContent).not.toContain('No results yet')
      expect(panel.textContent).not.toContain('Pick a column')
    }
    await act(async () => state.retry())
    expect(state.result).not.toBeNull()
  })

  it('shows field-associated validation and focuses invalid winsor input', async () => {
    await advance()
    await act(async () => {
      state.updateConfig('addNormal', true)
      state.updateConfig('meanEstimator', 'Winsorized Mean')
      state.setWinsorRaw('0.1,')
    })
    await run()
    const invalid = container.querySelector<HTMLInputElement>('input[aria-invalid="true"]')!
    expect(invalid.value).toBe('0.1,')
    expect(document.activeElement).toBe(invalid)
    expect(invalid.getAttribute('aria-describedby')).toContain('-error')
    expect(graphicalApi.computeGraph).toHaveBeenCalledTimes(1)
  })
})
