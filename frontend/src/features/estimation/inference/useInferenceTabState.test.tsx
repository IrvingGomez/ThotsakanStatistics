import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { inferenceApi, type ConfidenceRegionsResponse, type IntervalsResponse } from '../../../api/inference'
import InferenceControls from './InferenceControls'
import InferenceNotebook from './InferenceNotebook'
import InferenceObservation from './InferenceObservation'
import { useInferenceTabState, type InferenceState } from './useInferenceTabState'
import { DEFAULT_SELECTED } from './inferenceOptions'
import { HISTOGRAM_MARKER, PLOT_COLORS, regionLineColor } from '../../../plot/theme'

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
    expect(panelText('notebook')).not.toContain('ApneaCMKL.csv')
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
    expect(panelText('observation')).not.toContain('ApneaCMKL.csv')
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
    expect(panelText('observation')).toContain('Couldn’t update results')
    expect(panelText('observation')).toContain('Partial result — only successful intervals are shown.')
    expect(panelText('observation')).toContain(failed === 'CI' ? 'Confidence intervals failed' : 'Prediction intervals failed')
    expect(panelText('notebook')).not.toContain('Couldn’t update results')
    // Freeze the clock so the automatic update for the edit cannot fire before the checks on a slow run.
    vi.useFakeTimers()
    await act(async () => state.setDraft({ alphaStr: '0.1' }))
    const retry = [...container.querySelectorAll<HTMLButtonElement>('[data-panel="observation"] button')].find(button => button.textContent === 'Retry')!
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
    expect(panelText('observation')).toContain('Computing results…')
    await act(async () => { ci.reject(new Error('CI unavailable')); pi.reject(new Error('PI unavailable')) })
    expect(state.partialResult).toBe(false)
    expect(state.isComputing).toBe(false)
    expect(panelText('observation')).toContain('Couldn’t update results')
    expect(panelText('observation')).toContain('Confidence intervals failed: CI unavailable')
    expect(panelText('observation')).toContain('Prediction intervals failed: PI unavailable')
    expect(panelText('observation')).not.toContain('Choose settings, then select Update')
    expect(panelText('notebook')).not.toContain('Couldn’t update results')
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
    const notebook = panelText('notebook')!
    expect(notebook.indexOf('Mean · t')).toBeGreaterThanOrEqual(0)
    expect(notebook.indexOf('Mean · bootstrap')).toBeGreaterThan(notebook.indexOf('Mean · t'))
    expect(container.querySelector('[data-panel="observation"] tbody')!.textContent).toContain('Bootstrap (B=500)')
    expect(panelText('observation')).not.toContain('Mean – bootstrap:')
  })

  it('draws the observed values in the soft histogram look shared by every Statistics tab', async () => {
    await startRun()
    const observed = container.querySelector<HTMLElement>('[data-panel="observation"] [data-plot]')!
    expect(JSON.parse(observed.dataset.plot!)[0].marker).toEqual(HISTOGRAM_MARKER)
  })

  it('shows the intervals table at the top, grouped and tinted like the plots', async () => {
    await startRun()
    const observation = container.querySelector('[data-panel="observation"]')!
    const table = observation.querySelector('table')!
    const firstPlot = observation.querySelector('[data-plot]')!
    expect(table.compareDocumentPosition(firstPlot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect([...table.querySelectorAll('th')].map(cell => cell.textContent))
      .toEqual(['Interval', 'Statistic', 'Method', 'Estimate', 'Lower', 'Upper'])
    const rows = [...table.querySelectorAll('tbody tr')] as HTMLElement[]
    const labels = [...table.querySelectorAll<HTMLTableCellElement>('tbody td[rowspan]')]
    expect(labels.map(cell => [cell.textContent, cell.rowSpan])).toEqual([['Prediction', 1], ['Confidence', 2]])
    expect(rows.map(row => row.querySelector('td:not([rowspan])')!.textContent)).toEqual(['Based on the mean', 'Mean', 'Deviation'])
    expect(rows[0].className).toContain('bg-rose-950/50')
    expect(rows[1].className).toContain('bg-blue-950/50')
    expect(rows[2].className).toContain('bg-amber-950/50')
    expect(rows[1].children[2].textContent).toBe('t (df=4)')
    expect(rows[1].textContent).toContain('29.000')
    expect(rows[1].textContent).toContain('31.000')
    expect(observation.textContent).toContain('95% coverage')
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
    expect(container.querySelector('[data-panel="notebook"] table')).toBeNull()
  })

  it('sizes the interval plots margin to their row labels so long ones are not cut', async () => {
    await startRun()
    const layouts = [...container.querySelectorAll<HTMLElement>('[data-layout]')].map(element => JSON.parse(element.dataset.layout!))
    const intervalPlots = layouts.filter(layout => layout.yaxis.ticktext)
    expect(intervalPlots.length).toBeGreaterThan(0)
    for (const layout of intervalPlots) expect(layout.yaxis.automargin).toBe(true)
  })

  it('sets the mean and median plot apart the same way only while it is zoomed', async () => {
    await startRun()
    const location = () => [...container.querySelectorAll('[data-panel="observation"] section')]
      .find(node => node.querySelector('h3')?.textContent?.startsWith('Mean and median confidence intervals'))!
    expect(location().className).not.toContain('border-t')
    expect(location().querySelector('h3')!.textContent).not.toContain('Different scale')
    const zoom = [...container.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Zoom to intervals')!
    await act(async () => zoom.click())
    expect(location().className).toContain('border-t')
    expect(location().querySelector('h3')!.textContent).toContain('Different scale')
  })

  it('sets the deviation plot apart: divider, a Different scale tag and a spread axis title', async () => {
    await startRun()
    const section = [...container.querySelectorAll('[data-panel="observation"] section')]
      .find(node => node.querySelector('h3')?.textContent?.startsWith('Deviation confidence intervals'))!
    expect(section.className).toContain('border-t')
    expect(section.querySelector('h3')!.textContent).toContain('Different scale')
    const layout = JSON.parse(section.querySelector<HTMLElement>('[data-layout]')!.dataset.layout!)
    expect(layout.xaxis.title.text).toBe('Deviation σ of Breath (spread, in data units)')
    expect(layout.xaxis.range).toBeUndefined()
  })

  it('shows in the right panel the formula of each interval shown, not its numbers', async () => {
    await startRun()
    const notebook = container.querySelector('[data-panel="notebook"]')!
    const text = notebook.textContent!
    const headings = [...notebook.querySelectorAll('h3')].map(node => node.textContent)
    expect(headings).toEqual(['Confidence intervals', 'Prediction intervals', 'Notation'])
    for (const label of ['Mean · t', 'Deviation · χ²', 'Based on the mean · t']) expect(text).toContain(label)
    expect(text).not.toContain('Lower bound')
    expect(notebook.querySelector('article')).toBeNull()
    expect(notebook.querySelectorAll('.katex').length).toBeGreaterThan(3)
    expect(notebook.querySelector('.katex-error')).toBeNull()
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
    expect(panelText('notebook')).toContain('Cut-off for 50% coverage0.500')
    expect(panelText('notebook')).toContain('Cut-off for 95% coverage0.050')
    expect(panelText('notebook')).not.toContain('Marginal box')
    vi.useFakeTimers()
    await act(async () => state.setDraft({ addCiBox: true }))
    expect(traces().some(trace => trace.name === 'Separate marginal intervals')).toBe(false)
    await pause()
    expect(traces().some(trace => trace.name === 'Separate marginal intervals')).toBe(true)
    expect(panelText('notebook')).toContain('Marginal box (dashed, not a joint region)')
    expect(panelText('notebook')).toContain('Mean interval (box)29.000 to 31.000')
  })

  it('draws the regions as white lines labeled by coverage, with no outlier red on the plot', async () => {
    await act(async () => state.setDraft({ estimationType: 'Confidence Regions', addCiBox: true, crProbs: '0.5, 0.95' }))
    await act(async () => { await vi.waitFor(() => expect(container.querySelector('[data-plot]')).not.toBeNull()) })
    const element = container.querySelector<HTMLElement>('[data-plot]')!
    const traces = JSON.parse(element.dataset.plot!) as Record<string, any>[]
    const layout = JSON.parse(element.dataset.layout!) as Record<string, any>
    const contours = traces.filter(trace => trace.type === 'contour')
    expect(contours).toHaveLength(2)
    // 'lines' would color each line from a color scale and ignore line.color.
    expect(contours.every(trace => trace.contours.coloring === 'none')).toBe(true)
    expect(contours.map(trace => trace.line.color)).toEqual([regionLineColor(0, 2), regionLineColor(1, 2)])
    expect(regionLineColor(0, 2)).not.toBe(regionLineColor(1, 2))
    expect(layout.annotations.map((note: { text: string }) => note.text)).toEqual(['50%', '95%'])
    expect(JSON.stringify(traces)).not.toContain(PLOT_COLORS.outlier)
    expect(traces.find(trace => trace.name === 'Estimated mean and deviation')!.marker.color).toBe(PLOT_COLORS.regionEstimate)
    const box = traces.find(trace => trace.name === 'Separate marginal intervals')!
    expect(box.line).toMatchObject({ color: PLOT_COLORS.regionBox, dash: 'dash' })
  })

  it('explains in the right panel how the regions are built, then gives their values', async () => {
    await act(async () => state.setDraft({ estimationType: 'Confidence Regions', addCiBox: false }))
    await act(async () => { await vi.waitFor(() => expect(state.regionResult).not.toBeNull()) })
    const notebook = container.querySelector('[data-panel="notebook"]')!
    expect([...notebook.querySelectorAll('h3')].map(node => node.textContent)).toEqual(['How the regions are built', 'Values'])
    const text = notebook.textContent!
    for (const label of ['Normal likelihood', 'Maximum-likelihood estimates (the deviation divides by n)', 'Relative likelihood', 'Region with coverage p']) {
      expect(text).toContain(label)
    }
    expect(text).not.toMatch(/[μσ]\u0302/)
    const values = [...notebook.querySelectorAll('section')].find(node => node.querySelector('h3')?.textContent === 'Values')!
    const [mu, sigma] = [...values.querySelectorAll(':scope > div')]
    expect(mu.firstElementChild!.querySelector('.katex')).not.toBeNull()
    expect(mu.textContent).toContain('30.000')
    expect(sigma.firstElementChild!.querySelector('.katex')).not.toBeNull()
    expect(sigma.textContent).toContain('8.000')
    expect(text).not.toContain('Method details')
    expect(text).not.toContain('Grid:')
    expect(text).not.toContain('Coverage:')
    expect(notebook.querySelectorAll('.katex').length).toBeGreaterThanOrEqual(4)
    expect(notebook.querySelector('.katex-error')).toBeNull()
  })
})

describe('Inference follows the interaction contract', () => {
  it('Estimate is a radio group', () => {
    const radios = [...container.querySelectorAll<HTMLInputElement>('form input[type="radio"]')]
    expect(radios.map(radio => radio.value)).toEqual(['Confidence and Prediction Intervals', 'Confidence Regions'])
  })

  it('has no explanatory prose in the panels', async () => {
    await startRun()
    expect(container.querySelector('form')!.textContent).not.toContain('A confidence interval describes')
    expect(container.querySelector('form')!.textContent).not.toContain('no correction across rows')
    expect(panelText('observation')).not.toContain('Lines show interval bounds')
    expect(panelText('notebook')).not.toContain('Uncertainty about each population quantity')
    expect(panelText('notebook')).not.toContain('Statistical inference')
  })

  it('reports status only in the center panel', async () => {
    // Every CI call fails, so an automatic update that starts before the explicit run cannot use up the failure.
    vi.mocked(inferenceApi.computeCI).mockRejectedValue(new Error('Service unavailable'))
    await act(async () => state.setDraft({ alphaStr: '0.1' }))
    await startRun()
    expect(panelText('observation')).toContain('Couldn’t update results')
    expect(panelText('notebook')).not.toContain('Couldn’t update results')
  })

  it('an estimator load failure is a warning above the results, not in the controls', async () => {
    await act(async () => root.unmount())
    root = createRoot(container)
    vi.mocked(inferenceApi.getEstimators).mockRejectedValue(new Error('offline'))
    await render()
    await startRun()
    expect(container.querySelector('[data-panel="observation"] [aria-label="Warnings"]')?.textContent).toContain('Estimator options could not be loaded')
    expect(container.querySelector('form')!.textContent).not.toContain('Estimator options could not be loaded')
  })

  it('the zoom note is a muted section note', async () => {
    await act(async () => state.setDraft({ zoomCI: true }))
    await startRun()
    const note = [...container.querySelectorAll('[data-panel="observation"] p')].find(p => p.textContent?.startsWith('Zoomed'))!
    expect(note.className).not.toContain('amber')
  })
})
