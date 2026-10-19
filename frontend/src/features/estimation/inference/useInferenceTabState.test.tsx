import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { inferenceApi, type ConfidenceRegionsResponse, type IntervalsResponse } from '../../../api/inference'
import InferenceControls from './InferenceControls'
import InferenceNotebook from './InferenceNotebook'
import InferenceObservation from './InferenceObservation'
import { useInferenceTabState, type InferenceState } from './useInferenceTabState'
import { DEFAULT_SELECTED } from './inferenceOptions'

function dataFixture() {
  return {
    state: {
      status: 'ready', sessionId: 'session-a', filename: 'ApneaCMKL.csv',
      numericCols: ['Breath', 'Age'], filters: {} as Record<string, string[]>, displayPrecision: 3,
    },
    getNumericData: () => [20, 25, 30, 35, 40],
  }
}
let data = dataFixture()
vi.mock('../../../context/DataContext', () => ({ useData: () => data }))
vi.mock('react-plotly.js', () => ({
  default: ({ data: traces, layout }: { data: unknown[]; layout: unknown }) => <div data-plot={JSON.stringify(traces)} data-layout={JSON.stringify(layout)} />,
}))

function intervals(mean = 30, prediction = false): IntervalsResponse {
  return {
    n: 5, point_estimates: { mean, median: mean, deviation: 8 },
    histogram: { binEdges: [20, 30, 40], counts: [2, 3] },
    table: JSON.stringify([
      { Statistic: 'Mean', Lower: prediction ? 10 : mean - 1, Upper: prediction ? 50 : mean + 1, Method: 't (df=4)', 'Interval Type': prediction ? 'Prediction' : 'Confidence' },
      ...(!prediction ? [{ Statistic: 'Deviation', Lower: 4, Upper: 12, Method: 'Chi-square (s, ddof=1)', 'Interval Type': 'Confidence' }] : []),
    ]),
  }
}
const region: ConfidenceRegionsResponse = {
  z_matrix: [[0.2, 0.4], [0.5, 1]], mu_grid: [25, 35], sigma_grid: [4, 12],
  mu_hat: 30, sigma_hat: 8, mu_ci: [29, 31], sigma_ci: [4, 12], probs: [0.5, 0.95], levels: [0.5, 0.05],
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

let root: Root
let container: HTMLDivElement
let state: InferenceState
function Harness({ controls = true }: { controls?: boolean }) {
  state = useInferenceTabState()
  return <>
    {controls && <InferenceControls state={state} />}
    <section data-panel="observation"><InferenceObservation state={state} /></section>
    <section data-panel="notebook"><InferenceNotebook state={state} /></section>
  </>
}
async function render(controls = true) {
  await act(async () => root.render(<Harness controls={controls} />))
}
async function startRun() {
  await act(async () => { void state.handleRun() })
}
function panelText(panel: 'observation' | 'notebook') {
  return container.querySelector('[data-panel="' + panel + '"]')!.textContent
}

beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  data = dataFixture()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  vi.spyOn(inferenceApi, 'getEstimators').mockResolvedValue({ mean_estimators: ['Sample Mean'], deviation_estimators: ['Deviation (1 ddof)', 'MAD'] })
  vi.spyOn(inferenceApi, 'computeCI').mockResolvedValue(intervals())
  vi.spyOn(inferenceApi, 'computePI').mockResolvedValue(intervals(30, true))
  vi.spyOn(inferenceApi, 'computeRegions').mockResolvedValue(region)
  await render()
})
const withBootstrap = (...ids: string[]) => [...DEFAULT_SELECTED, ...ids]
async function pause(ms = 300) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms) })
}

afterEach(async () => {
  vi.useRealTimers()
  await act(async () => root.unmount())
  container.remove()
  vi.restoreAllMocks()
})

describe('Inference student workflow', () => {
  it('preserves drafts and disclosure state when controls leave and return', async () => {
    await act(async () => state.setDraft({ alphaStr: '0.', ciOpen: true, selected: withBootstrap('ci.mean.boot') }))
    await render(false)
    await render(true)
    expect(state.draft.alphaStr).toBe('0.')
    expect(state.draft.ciOpen).toBe(true)
    expect(state.draft.selected).toContain('ci.mean.boot')
    expect(inferenceApi.computeCI).toHaveBeenCalledTimes(1)
    expect(panelText('notebook')).toContain('95% confidence · α = 0.05')
    expect(panelText('notebook')).not.toContain('Update')
  })

  it('updates on its own after a short pause, and treats zoom/disclosures as display settings', async () => {
    vi.useFakeTimers()
    await act(async () => state.setDraft({ zoomCI: true, ciOpen: true }))
    await pause()
    expect(inferenceApi.computeCI).toHaveBeenCalledTimes(1)
    expect(state.isDirty).toBe(false)
    await act(async () => state.setDraft({ alphaStr: '0.1' }))
    expect(inferenceApi.computeCI).toHaveBeenCalledTimes(1)
    await pause()
    expect(inferenceApi.computeCI).toHaveBeenCalledTimes(2)
    expect(vi.mocked(inferenceApi.computeCI).mock.lastCall![0]).toMatchObject({ alpha: 0.1 })
    expect(state.isDirty).toBe(false)
    expect(state.appliedConfig?.alpha).toBe(0.1)
    expect(panelText('observation')).toContain('90% confidence · α = 0.1')
    expect(panelText('observation')).not.toContain('Settings changed')
  })

  it('updates bootstrap options on its own too, after a longer pause', async () => {
    vi.useFakeTimers()
    await act(async () => state.setDraft({ selected: withBootstrap('ci.mean.boot') }))
    await pause(300)
    expect(inferenceApi.computeCI).toHaveBeenCalledTimes(1) // still waiting: bootstrap is slower
    await pause(500)
    expect(inferenceApi.computeCI).toHaveBeenCalledTimes(2)
    expect(vi.mocked(inferenceApi.computeCI).mock.lastCall![0]).toMatchObject({ bootstrap_mean: true, ci_mean_normal: true })
    await act(async () => state.setDraft({ samplesStr: '2000' }))
    await pause(800)
    expect(vi.mocked(inferenceApi.computeCI).mock.lastCall![0]).toMatchObject({ bootstrap_samples: 2000 })
    // un-ticking the last bootstrap option returns to the short pause
    await act(async () => state.setDraft({ selected: [...DEFAULT_SELECTED] }))
    await pause(300)
    expect(vi.mocked(inferenceApi.computeCI).mock.lastCall![0]).toMatchObject({ bootstrap_mean: false })
    expect(container.textContent).not.toContain('Update')
  })

  it('collapses a burst of changes into one request', async () => {
    vi.useFakeTimers()
    for (const alphaStr of ['0.01', '0.02', '0.03', '0.04']) await act(async () => state.setDraft({ alphaStr }))
    await pause()
    expect(inferenceApi.computeCI).toHaveBeenCalledTimes(2) // the initial run + one for the whole burst
    expect(vi.mocked(inferenceApi.computeCI).mock.lastCall![0]).toMatchObject({ alpha: 0.04 })
  })

  it('rejects invalid fields with associated labels, hints and errors', async () => {
    await act(async () => state.setDraft({ alphaStr: '', selected: withBootstrap('ci.mean.boot'), samplesStr: '2.5' }))
    await startRun()
    expect(inferenceApi.computeCI).toHaveBeenCalledTimes(1)
    // α and the bootstrap count are DualInputs: a slider and a text box each, both flagged
    const invalid = [...container.querySelectorAll<HTMLInputElement>('[aria-invalid="true"]')]
    expect(invalid).toHaveLength(4)
    for (const input of invalid) {
      expect(input.labels?.length || input.getAttribute('aria-labelledby') || input.getAttribute('aria-label')).toBeTruthy()
      const describedBy = input.getAttribute('aria-describedby')!.split(' ')
      expect(describedBy.every(id => document.getElementById(id))).toBe(true)
    }
    expect(document.activeElement).toBe(invalid[0])
  })

  it('allows only the newest request to publish output and loading status', async () => {
    const older = deferred<IntervalsResponse>()
    const newer = deferred<IntervalsResponse>()
    vi.mocked(inferenceApi.computeCI).mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise)
    await act(async () => state.setDraft({ alphaStr: '0.1' }))
    await startRun()
    await act(async () => state.setDraft({ column: 'Age' }))
    await act(async () => older.reject(new Error('Older failure')))
    expect(state.isComputing).toBe(true)
    expect(state.error).toBeNull()
    await act(async () => newer.resolve(intervals(45)))
    expect(state.ciResult?.point_estimates.mean).toBe(45)
    expect(state.appliedConfig?.column).toBe('Age')
    expect(state.isComputing).toBe(false)
  })

  it('ignores older success after newer output has arrived', async () => {
    const older = deferred<IntervalsResponse>()
    const newer = deferred<IntervalsResponse>()
    vi.mocked(inferenceApi.computeCI).mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise)
    await startRun()
    await act(async () => state.setDraft({ column: 'Age' }))
    await act(async () => newer.resolve(intervals(45)))
    await act(async () => older.resolve(intervals(20)))
    expect(state.ciResult?.point_estimates.mean).toBe(45)
    expect(state.appliedConfig?.column).toBe('Age')
  })

  it('clears and invalidates an in-flight run on Reset', async () => {
    const pending = deferred<IntervalsResponse>()
    vi.mocked(inferenceApi.computeCI).mockReturnValueOnce(pending.promise)
    await startRun()
    await act(async () => state.handleReset())
    await act(async () => pending.resolve(intervals()))
    expect(state.ciResult).toBeNull()
    expect(state.piResult).toBeNull()
    expect(state.appliedConfig).toBeNull()
    expect(state.isComputing).toBe(false)
  })

  it('reruns for changed filters and ignores results from the old dataset', async () => {
    const pending = deferred<IntervalsResponse>()
    vi.mocked(inferenceApi.computeCI).mockReturnValueOnce(pending.promise)
    await startRun()
    data = { ...data, state: { ...data.state, sessionId: 'session-b', filters: { Smoke: ['1'] } } }
    vi.mocked(inferenceApi.computeCI).mockResolvedValue(intervals(36))
    await render()
    await act(async () => pending.resolve(intervals(20)))
    expect(state.ciResult?.point_estimates.mean).toBe(36)
    expect(vi.mocked(inferenceApi.computeCI).mock.lastCall![0]).toMatchObject({ session_id: 'session-b', filters: { Smoke: ['1'] } })
  })

  it.each(['CI', 'PI'] as const)('shows partial results when %s fails, then retries applied settings without losing draft edits', async failed => {
    vi.mocked(failed === 'CI' ? inferenceApi.computeCI : inferenceApi.computePI).mockRejectedValueOnce(new Error('Service unavailable'))
    await startRun()
    expect(state.partialResult).toBe(true)
    expect(failed === 'CI' ? state.ciResult : state.piResult).toBeNull()
    expect(failed === 'CI' ? state.piResult : state.ciResult).not.toBeNull()
    for (const panel of ['observation', 'notebook'] as const) {
      expect(panelText(panel)).toContain('Couldn’t update results')
      expect(panelText(panel)).toContain('Partial result — only successful intervals are shown.')
      expect(panelText(panel)).toContain(failed === 'CI' ? 'Confidence intervals failed' : 'Prediction intervals failed')
    }
    await act(async () => state.setDraft({ alphaStr: '0.1' }))
    const retry = [...container.querySelectorAll<HTMLButtonElement>('[data-panel="notebook"] button')].find(button => button.textContent === 'Retry')!
    await act(async () => retry.click())
    expect(state.error).toBeNull()
    expect(state.partialResult).toBe(false)
    expect(state.ciResult).not.toBeNull()
    expect(state.piResult).not.toBeNull()
    expect(state.appliedConfig?.alpha).toBe(0.05)
    expect(state.draft.alphaStr).toBe('0.1')
    expect(state.isDirty).toBe(true)
  })

  it('shows a shared loading/error state when all requests fail', async () => {
    const ci = deferred<IntervalsResponse>()
    const pi = deferred<IntervalsResponse>()
    vi.mocked(inferenceApi.computeCI).mockReturnValueOnce(ci.promise)
    vi.mocked(inferenceApi.computePI).mockReturnValueOnce(pi.promise)
    await startRun()
    for (const panel of ['observation', 'notebook'] as const) expect(panelText(panel)).toContain('Computing results…')
    await act(async () => { ci.reject(new Error('CI unavailable')); pi.reject(new Error('PI unavailable')) })
    expect(state.partialResult).toBe(false)
    expect(state.isComputing).toBe(false)
    for (const panel of ['observation', 'notebook'] as const) {
      expect(panelText(panel)).toContain('Couldn’t update results')
      expect(panelText(panel)).toContain('Confidence intervals failed: CI unavailable')
      expect(panelText(panel)).toContain('Prediction intervals failed: PI unavailable')
      expect(panelText(panel)).not.toContain('Choose settings, then select Update')
    }
  })

  it('keeps UI and confidence-region fields out of CI/PI payloads', () => {
    const expected = {
      session_id: 'session-a', column: 'Breath', alpha: 0.05,
      mean_estimator: 'Sample Mean', median_estimator: 'Sample Median', sigma_estimator: 'Deviation (1 ddof)',
      bootstrap_mean: false, bootstrap_median: false, bootstrap_deviation: false, bootstrap_pi: false,
      bootstrap_samples: 1000, ci_mean_normal: true, ci_median_normal: true, ci_deviation_normal: true,
      pi_mean_normal: true, pi_median_normal: true, pi_iqr_normal: true,
      trim_param: null, winsor_limits: null, weights_column: null, filters: null,
    }
    expect(vi.mocked(inferenceApi.computeCI).mock.calls[0][0]).toEqual(expected)
    expect(vi.mocked(inferenceApi.computePI).mock.calls[0][0]).toEqual(expected)
  })

  it('sends per-method flags and only requests the interval families that are ticked', async () => {
    await act(async () => state.setDraft({ selected: withBootstrap('ci.mean.boot', 'pi.boot'), samplesStr: '500' }))
    await startRun()
    const ci = vi.mocked(inferenceApi.computeCI).mock.lastCall![0]
    expect(ci).toMatchObject({ bootstrap_mean: true, bootstrap_pi: true, bootstrap_samples: 500, ci_mean_normal: true, pi_iqr_normal: true })
    // hidden under an unticked parent: ci.mean.normal stays ticked but must not be sent, and no CI request is made
    vi.mocked(inferenceApi.computeCI).mockClear()
    vi.mocked(inferenceApi.computePI).mockClear()
    await act(async () => state.setDraft({ selected: ['ci.mean', 'ci.mean.normal', 'pi', 'pi.normal', 'pi.normal.median'] }))
    await startRun()
    expect(inferenceApi.computeCI).not.toHaveBeenCalled()
    expect(vi.mocked(inferenceApi.computePI).mock.lastCall![0]).toMatchObject({
      ci_mean_normal: false, pi_mean_normal: false, pi_median_normal: true, pi_iqr_normal: false, bootstrap_pi: false,
    })
  })

  it('asks for at least one interval instead of sending an empty request', async () => {
    vi.mocked(inferenceApi.computeCI).mockClear()
    await act(async () => state.setDraft({ selected: [] }))
    await startRun()
    expect(state.fieldErrors.selected).toBe('Tick at least one interval method to calculate.')
    expect(inferenceApi.computeCI).not.toHaveBeenCalled()
  })

  it('sends the deviation estimator only while a normality-based option that uses it is ticked', async () => {
    await act(async () => state.setDraft({ sigmaEst: 'MAD (bias corrected)' }))
    await startRun()
    expect(vi.mocked(inferenceApi.computeCI).mock.lastCall![0].sigma_estimator).toBe('MAD (bias corrected)')
    expect(container.textContent).toContain('σ estimator')
    await act(async () => state.setDraft({ selected: ['ci', 'ci.deviation', 'ci.deviation.boot'] }))
    await startRun()
    expect(vi.mocked(inferenceApi.computeCI).mock.lastCall![0].sigma_estimator).toBe('Deviation (1 ddof)')
    expect(container.textContent).not.toContain('σ estimator')
  })

  it('pins confidence regions to the sample mean and std (ddof=1) whatever else is ticked', async () => {
    await act(async () => state.setDraft({ sigmaEst: 'MAD (bias corrected)', selected: withBootstrap('ci.mean.boot', 'ci.deviation.boot') }))
    await act(async () => state.setDraft({ estimationType: 'Confidence Regions' }))
    expect(vi.mocked(inferenceApi.computeRegions).mock.lastCall![0]).toMatchObject({
      mean_estimator: 'Sample Mean', sigma_estimator: 'Deviation (1 ddof)',
      bootstrap_mean: false, bootstrap_deviation: false, bootstrap_pi: false,
    })
    expect(vi.mocked(inferenceApi.computeRegions).mock.lastCall![0]).not.toHaveProperty('mu_ci_source')
    expect(container.textContent).not.toContain('Using bootstrap')
    expect(container.textContent).not.toContain('Assuming normality')
    expect(container.textContent).not.toContain('σ estimator')
  })

  it('draws a bootstrap row next to the normal row and labels them apart', async () => {
    vi.mocked(inferenceApi.computeCI).mockResolvedValue({
      ...intervals(),
      table: JSON.stringify([
        { Statistic: 'Mean', Lower: 29, Upper: 31, Method: 't (df=4)', 'Interval Type': 'Confidence' },
        { Statistic: 'Mean', Lower: 28, Upper: 32, Method: 'Bootstrap (B=500)', 'Interval Type': 'Confidence' },
      ]),
    })
    await act(async () => state.setDraft({ selected: withBootstrap('ci.mean.boot') }))
    await startRun()
    const titles = [...container.querySelectorAll('[data-panel="notebook"] article h4')].map(node => node.textContent)
    expect(titles.slice(0, 2)).toEqual(['Mean', 'Mean – bootstrap'])
    expect(panelText('observation')).toContain('Mean – bootstrap:')
  })

  it('shares the observed/CI/PI location scale until zoom is explicitly selected', async () => {
    const locationRanges = () => [...container.querySelectorAll<HTMLElement>('[data-layout]')]
      .map(element => JSON.parse(element.dataset.layout!))
      .filter(layout => layout.xaxis.title.text === 'Breath')
      .map(layout => layout.xaxis.range)
    const initial = locationRanges()
    expect(initial).toHaveLength(3)
    expect(initial[0]).toEqual(initial[1])
    expect(initial[1]).toEqual(initial[2])
    expect(initial[0][0]).toBeLessThan(10)
    expect(initial[0][1]).toBeGreaterThan(50)
    const zoom = [...container.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Zoom to intervals')!
    await act(async () => zoom.click())
    expect(locationRanges()[2]).not.toEqual(locationRanges()[0])
    expect(panelText('observation')).toContain('Zoomed to confidence intervals — different x-axis scale')
    expect(state.isDirty).toBe(false)
    const cards = container.querySelectorAll('[data-panel="notebook"] article')
    expect(cards[0].textContent).toContain('Lower bound29.000')
    expect(cards[0].textContent).toContain('Upper bound31.000')
    expect(cards[0].querySelector('details')?.open).toBe(false)
    expect(container.querySelector('[data-panel="notebook"] table')).toBeNull()
  })

  it('shows alpha in regions only with the CI box, and leaves the plot window to the backend', async () => {
    await act(async () => state.setDraft({ estimationType: 'Confidence Regions' }))
    expect(container.textContent).toContain('Significance level α')
    expect(container.textContent).not.toContain('padding')
    expect(vi.mocked(inferenceApi.computeRegions).mock.lastCall![0]).not.toHaveProperty('eps_mu')
    vi.useFakeTimers()
    await act(async () => state.setDraft({ alphaStr: '', addCiBox: false }))
    await pause()
    expect(container.textContent).not.toContain('Significance level α')
    expect(state.fieldErrors).toEqual({}) // a hidden, empty alpha does not block the regions
    expect(vi.mocked(inferenceApi.computeRegions).mock.lastCall![0]).toMatchObject({ alpha: 0.05, add_ci_box: false })
  })

  it('honors applied region-box settings and shows coverage as percentages', async () => {
    await act(async () => state.setDraft({ estimationType: 'Confidence Regions', addCiBox: false, crProbs: '0.5, 0.95' }))
    expect(vi.mocked(inferenceApi.computeRegions).mock.lastCall![0]).toMatchObject({ probs: [0.5, 0.95], add_ci_box: false })
    const traces = () => JSON.parse(container.querySelector<HTMLElement>('[data-plot]')!.dataset.plot!) as { name: string }[]
    expect(traces().some(trace => trace.name === 'Separate marginal intervals')).toBe(false)
    expect(panelText('notebook')).toContain('Coverage: 50%, 95%')
    vi.useFakeTimers()
    await act(async () => state.setDraft({ addCiBox: true }))
    expect(traces().some(trace => trace.name === 'Separate marginal intervals')).toBe(false)
    await pause()
    expect(traces().some(trace => trace.name === 'Separate marginal intervals')).toBe(true)
    expect(panelText('notebook')).toContain('The dashed box combines separate marginal intervals')
  })
})
