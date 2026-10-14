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

function response(n = 10, warnings: string[] = []): GraphicalResponse {
  return { summary: { n, n_unique: n }, histogram_data: { bins: [0, 1, 2], counts: [4, 6], densities: [0.4, 0.6] }, warnings }
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
async function advance(ms = 250) {
  await act(async () => vi.advanceTimersByTimeAsync(ms))
}
const calls = () => vi.mocked(graphicalApi.computeGraph).mock.calls
const lastParams = () => vi.mocked(graphicalApi.computeGraph).mock.lastCall![1]
function panel(name: 'Observation' | 'Notebook') {
  return container.querySelector(`section[aria-label="${name}"]`)!
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
    deviation_estimators: ['Deviation (1 ddof)', 'MAD (bias corrected)'],
  })
  await render()
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Graphical: every setting updates the plot on its own', () => {
  it('draws the base graph on load, with no Run or Update button anywhere', async () => {
    await advance()
    expect(calls()).toHaveLength(1)
    expect(state.result?.summary.n).toBe(10)
    const buttons = [...container.querySelectorAll('button')].map(button => button.textContent)
    expect(buttons.join(' ')).not.toMatch(/Run|Update/)
    expect(container.textContent).not.toContain('press Run')
  })

  it('applies a normal overlay with its estimators automatically, after one pause', async () => {
    await advance()
    await act(async () => {
      state.updateConfig('addNormal', true)
      state.updateConfig('muEstimator', 'Sample Median')
      state.updateConfig('sigmaEstimator', 'MAD (bias corrected)')
    })
    expect(calls()).toHaveLength(1) // not before the pause
    await advance()
    expect(calls()).toHaveLength(2) // one request for the whole burst
    expect(lastParams()).toMatchObject({ add_normal: true, mu_estimator: 'Sample Median', sigma_estimator: 'MAD (bias corrected)' })
  })

  it('offers the sample median beside the mean estimators for mu', async () => {
    await advance()
    expect(state.muEstimators).toEqual(['Sample Mean', 'Trimmed Mean', 'Winsorized Mean', 'Weighted Mean', 'Sample Median'])
  })

  it('asks again for the ECDF band when alpha changes', async () => {
    await advance()
    await act(async () => state.updateConfig('graphType', 'ECDF'))
    await advance()
    await act(async () => state.updateConfig('alpha', 0.1))
    await advance()
    expect(lastParams()).toMatchObject({ graph_type: 'ECDF', add_conf_band: true, alpha: 0.1 })
  })

  it('does not ask again for a change that cannot affect the plot on screen', async () => {
    await advance()
    await act(async () => state.updateConfig('graphType', 'ECDF'))
    await advance()
    const before = calls().length
    // none of these exist on the ECDF view, and the normal overlay is off
    await act(async () => {
      state.updateConfig('addKde', false)
      state.updateConfig('bins', 40)
      state.updateConfig('muEstimator', 'Sample Median')
    })
    await advance(1000)
    expect(calls()).toHaveLength(before)
  })

  it('never sends a KDE flag from the ECDF view, so no "KDE is not drawn" notice can appear', async () => {
    await advance()
    await act(async () => state.updateConfig('graphType', 'ECDF'))
    await advance()
    expect(lastParams()).toMatchObject({ graph_type: 'ECDF', add_kde: false })
  })

  it('keeps setup and incomplete winsor input across controls unmounts', async () => {
    await act(async () => {
      state.updateConfig('addNormal', true)
      state.updateConfig('muEstimator', 'Winsorized Mean')
      state.setWinsorRaw('0.1,')
      state.setAutoBins(false)
    })
    await render(false)
    await render(true)
    expect(state.cfg.muEstimator).toBe('Winsorized Mean')
    expect(state.winsorRaw).toBe('0.1,')
    expect(state.autoBins).toBe(false)
    expect(state.cfg.bins).toBe(20)
  })

  it('sends nothing for an incomplete draft, keeps the previous plot and flags the field', async () => {
    await advance()
    await act(async () => {
      state.updateConfig('addNormal', true)
      state.updateConfig('muEstimator', 'Winsorized Mean')
      state.setWinsorRaw('0.1,')
    })
    await advance(1000)
    expect(calls()).toHaveLength(1)
    expect(state.result?.summary.n).toBe(10)
    const invalid = container.querySelector<HTMLInputElement>('input[aria-invalid="true"]')!
    expect(invalid.value).toBe('0.1,')
    expect(document.activeElement).toBe(invalid)
    expect(invalid.getAttribute('aria-describedby')).toContain('-error')
    // completing the input resumes automatic updates
    await act(async () => state.setWinsorRaw('0.1, 0.2'))
    await advance()
    expect(lastParams()).toMatchObject({ add_normal: true, mu_estimator: 'Winsorized Mean', winsor_limits: '0.1, 0.2' })
  })
})

describe('Graphical: result ownership', () => {
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

  it('invalidates a pending response on Reset and draws a fresh base graph', async () => {
    const request = pending()
    vi.mocked(graphicalApi.computeGraph).mockReturnValueOnce(request.promise)
    await advance()
    await act(async () => {
      state.updateConfig('addNormal', true)
      state.reset()
    })
    await act(async () => request.resolve(response(99)))
    expect(state.result).toBeNull()
    expect(state.cfg.addNormal).toBe(false)
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
    expect(lastParams().filters).toEqual({ Site: ['A'] })
    await act(async () => state.updateConfig('addNormal', true))
    data = { state: { ...data.state, sessionId: 'session-b', numericCols: ['Score'] } }
    await render()
    expect(state.result).toBeNull()
    expect(state.cfg.column).toBe('Score')
    expect(state.cfg.addNormal).toBe(false)
  })

  it('shows shared failure/retry status and retains the previous result with its applied context', async () => {
    await advance()
    vi.mocked(graphicalApi.computeGraph).mockRejectedValueOnce(new Error('Service unavailable'))
    await act(async () => state.updateConfig('addNormal', true))
    await advance()
    for (const section of panels()) {
      expect(section.textContent).toContain('Couldn’t update results')
      expect(section.textContent).toContain('Previous result — update failed.')
      expect(section.textContent).toContain('Applied: sample.csv · Age')
      expect(section.querySelector('button')?.textContent).toBe('Retry')
    }
    await act(async () => state.retry())
    expect(state.error).toBeNull()
    expect(lastParams().add_normal).toBe(true)
  })

  it('gives an initial failure the same recovery in both panels without contradictory empty guidance', async () => {
    vi.mocked(graphicalApi.computeGraph).mockRejectedValueOnce(new Error('Unavailable'))
    await advance()
    for (const section of panels()) {
      expect(section.textContent).toContain('Couldn’t update results')
      expect(section.textContent).not.toContain('Pick a column')
    }
    await act(async () => state.retry())
    expect(state.result).not.toBeNull()
  })
})

describe('Graphical: warnings and notebook', () => {
  it('shows backend warnings with the plot, once, and never as lessons or notes in the notebook', async () => {
    vi.mocked(graphicalApi.computeGraph).mockResolvedValue(response(10, ['KDE not drawn: every observation has the same value.']))
    await advance()
    expect(panel('Observation').textContent).toContain('KDE not drawn')
    expect(panel('Notebook').textContent).not.toContain('KDE not drawn')
    expect(panel('Notebook').textContent).not.toContain('Lesson')
    expect(panel('Notebook').textContent).not.toContain('Overlay estimates')
  })

  it('shows technical details: sample numbers and the definition of what is plotted', async () => {
    await advance()
    const text = panel('Notebook').textContent!
    expect(text).toContain('Unique values')
    expect(text).toContain('density = count / (n × bin width)')
  })
})
