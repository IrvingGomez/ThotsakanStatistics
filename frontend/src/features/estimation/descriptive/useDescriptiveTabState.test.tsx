import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computeDescriptiveStats, type DescriptiveResult, type StatRow } from '../../../api/descriptive'
import { useDescriptiveTabState } from './useDescriptiveTabState'
import { DescriptiveStatus } from './DescriptiveTab'

const data = {
  state: {
    status: 'ready' as const, sessionId: 'session-a', filename: 'sample.csv',
    dataset: { headers: ['a', 'b'], rows: [{ a: '1', b: '2' }], numericCols: ['a', 'b'], categoricalCols: [] },
    numericCols: ['a', 'b'], categoricalCols: [] as string[], filters: {}, displayPrecision: 3,
  },
  filteredRows: [{ a: '1', b: '2' }],
}
vi.mock('../../../context/DataContext', () => ({ useData: () => data }))
vi.mock('../../../api/descriptive', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/descriptive')>()
  return { ...actual, computeDescriptiveStats: vi.fn() }
})

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(yes => { resolve = yes })
  return { promise, resolve }
}
function result(mean: number, rows: StatRow[] = []): DescriptiveResult {
  return { rows, summary: { n: 1, mean, median: mean, std: 0, iqr: 0 }, histogram: { binEdges: [0, 1], counts: [1] }, boxData: { whiskerLo: mean, q1: mean, median: mean, q3: mean, whiskerHi: mean, outliers: [] } }
}

let root: Root
let container: HTMLDivElement
let hook!: ReturnType<typeof useDescriptiveTabState>
function Harness() { hook = useDescriptiveTabState(); return <DescriptiveStatus state={hook} /> }
const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(250) })
const calls = () => vi.mocked(computeDescriptiveStats).mock.calls
const lastRequest = () => calls()[calls().length - 1][0]

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.useFakeTimers()
  vi.mocked(computeDescriptiveStats).mockReset()
  container = document.createElement('div')
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  vi.useRealTimers()
})
const mount = () => act(() => root.render(<Harness />))

describe('descriptive result ownership', () => {
  it('asks for a result as soon as there is data, with the default statistics', async () => {
    vi.mocked(computeDescriptiveStats).mockResolvedValue(result(1))
    mount()
    await settle()
    expect(calls()).toHaveLength(1)
    expect(lastRequest()).toMatchObject({ column: 'a', weightsCol: null, quantileProbs: [0.25, 0.5, 0.75], trimAlpha: null, winsorLimits: null })
  })

  it('publishes only the newest response with its matching applied configuration', async () => {
    const first = deferred<DescriptiveResult>()
    const second = deferred<DescriptiveResult>()
    vi.mocked(computeDescriptiveStats).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    mount()
    await settle()
    act(() => hook.setDraft({ column: 'b' }))
    await settle()
    await act(async () => second.resolve(result(2)))
    expect(hook.result?.summary.mean).toBe(2)
    expect(hook.config?.column).toBe('b')

    await act(async () => first.resolve(result(1)))
    expect(hook.result?.summary.mean).toBe(2)
    expect(hook.config?.column).toBe('b')
    expect(hook.isComputing).toBe(false)
  })

  it('does not ask the backend again, or show a loading state, for display-only changes', async () => {
    vi.mocked(computeDescriptiveStats).mockResolvedValue(result(5))
    mount()
    await settle()
    expect(calls()).toHaveLength(1)

    act(() => hook.setDraft({ showConsistencyCorr: false, selected: hook.draft.selected.filter(id => id !== 'median') }))
    expect(hook.isComputing).toBe(false)
    await act(async () => { await vi.advanceTimersByTimeAsync(500) })
    expect(calls()).toHaveLength(1)
    expect(hook.config?.showConsistencyCorr).toBe(false)
    expect(hook.config?.selectedStats).not.toContain('median')
    expect(hook.result?.summary.mean).toBe(5)
  })

  it('shows a result that arrives after a display change with the newest display settings', async () => {
    const pending = deferred<DescriptiveResult>()
    vi.mocked(computeDescriptiveStats).mockReturnValueOnce(pending.promise)
    mount()
    await settle()
    act(() => hook.setDraft({ showConsistencyCorr: false }))
    expect(calls()).toHaveLength(1) // same request: not restarted
    await act(async () => pending.resolve(result(7)))
    expect(hook.result?.summary.mean).toBe(7)
    expect(hook.config?.showConsistencyCorr).toBe(false)
  })

  it.each([
    ['quantiles', { quantilesRaw: '0.1' }],
    ['the column', { column: 'b' }],
  ])('asks the backend again when %s change', async (_name, change) => {
    vi.mocked(computeDescriptiveStats).mockResolvedValue(result(1))
    mount()
    await settle()
    act(() => hook.setDraft(change))
    await settle()
    expect(calls()).toHaveLength(2)
  })

  it('reports a backend failure, and Retry asks again with the same settings', async () => {
    vi.mocked(computeDescriptiveStats).mockRejectedValueOnce(new Error('Weights column not found')).mockResolvedValue(result(4))
    mount()
    await settle()
    await act(async () => {})
    expect(hook.error).toBe('Weights column not found')
    act(() => hook.handleRetry())
    await settle()
    await act(async () => {})
    expect(calls()).toHaveLength(2)
    expect(hook.error).toBeNull()
    expect(hook.result?.summary.mean).toBe(4)
  })

  it('keeps the applied result visible while reset defaults recompute', async () => {
    vi.mocked(computeDescriptiveStats).mockResolvedValue(result(3))
    mount()
    await settle()
    act(() => hook.setDraft({ column: 'b' }))
    await settle()
    act(() => hook.handleReset())
    expect(hook.draft.column).toBe('a')
    expect(hook.result?.summary.mean).toBe(3)
  })
})

describe('descriptive validation', () => {
  beforeEach(async () => {
    vi.mocked(computeDescriptiveStats).mockResolvedValue(result(1))
    mount()
    await settle()
  })

  it('accepts blank quantile probabilities as "no quantiles"', async () => {
    act(() => hook.setDraft({ quantilesRaw: '' }))
    await settle()
    expect(hook.fieldErrors).toEqual({})
    expect(lastRequest().quantileProbs).toEqual([])
  })

  it('does not ask on invalid quantiles and says why under the field', async () => {
    act(() => hook.setDraft({ quantilesRaw: '0.5, 2' }))
    await settle()
    expect(calls()).toHaveLength(1)
    expect(hook.fieldErrors.quantilesRaw).toBe('Enter comma-separated probabilities from 0 to 1, or leave it empty.')
  })

  it('rejects a trim fraction of 0.5 or more', async () => {
    act(() => hook.setDraft({ selected: [...hook.draft.selected, 'trimmed_mean'] }))
    act(() => hook.setDraft({ trimRaw: '0.5' }))
    await settle()
    expect(hook.fieldErrors.trimRaw).toBe('Use a value from 0 up to, but not including, 0.5.')
  })

  it('rejects winsorize limits that are not two fractions below 0.5', async () => {
    act(() => hook.setDraft({ selected: [...hook.draft.selected, 'winsorized_mean'] }))
    act(() => hook.setDraft({ winsorRaw: '0.1' }))
    await settle()
    expect(hook.fieldErrors.winsorRaw).toBe('Enter two fractions from 0 up to, but not including, 0.5, e.g. 0.1, 0.1.')
  })

  it('fills a default trim fraction when Trimmed mean is ticked, and clears it when unticked', async () => {
    act(() => hook.setDraft({ selected: [...hook.draft.selected, 'trimmed_mean'] }))
    await settle()
    expect(hook.draft.trimRaw).toBe('0.10')
    expect(lastRequest().trimAlpha).toBe(0.1)
    act(() => hook.setDraft({ selected: hook.draft.selected.filter(id => id !== 'trimmed_mean') }))
    await settle()
    expect(hook.draft.trimRaw).toBe('')
    expect(lastRequest().trimAlpha).toBeNull()
  })
})

describe('descriptive status', () => {
  it('warnings stay until the result changes', async () => {
    vi.mocked(computeDescriptiveStats).mockResolvedValue(result(1, [
      { category: 'Central Tendency', measure: 'Mean', value: 1, consistencyCorr: null, statId: 'mean', warning: 'Few observations.' },
    ]))
    mount()
    await settle()
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
    const list = container.querySelector('[aria-label="Warnings"]')
    expect(list?.textContent).toBe('Mean: Few observations.')
  })

  it('shows no file · variable · n line above the result', async () => {
    vi.mocked(computeDescriptiveStats).mockResolvedValue(result(1))
    mount()
    await settle()
    expect(container.textContent).not.toContain('sample.csv')
  })
})
