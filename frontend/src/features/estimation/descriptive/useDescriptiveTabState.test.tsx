import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computeDescriptiveStats, type DescriptiveResult } from '../../../api/descriptive'
import type { DescriptiveConfig } from './DescriptiveControls'
import { useDescriptiveTabState } from './useDescriptiveTabState'

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
function result(mean: number): DescriptiveResult {
  return { rows: [], summary: { n: 1, mean, median: mean, std: 0, iqr: 0 }, histogram: { binEdges: [0, 1], counts: [1] }, boxData: { whiskerLo: mean, q1: mean, median: mean, q3: mean, whiskerHi: mean, outliers: [] } }
}
const config = (column: string): DescriptiveConfig => ({ column, weightsCol: null, quantileProbs: [0.25, 0.5, 0.75], trimAlpha: null, winsorLimits: null, showConsistencyCorr: true, advancedStats: [] })

let root: Root
let container: HTMLDivElement
let hook!: ReturnType<typeof useDescriptiveTabState>
function Harness() { hook = useDescriptiveTabState(); return null }

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.useFakeTimers()
  vi.mocked(computeDescriptiveStats).mockReset()
  container = document.createElement('div')
  root = createRoot(container)
  act(() => root.render(<Harness />))
})
afterEach(() => {
  act(() => root.unmount())
  vi.useRealTimers()
})

describe('descriptive result ownership', () => {
  it('publishes only the newest response with its matching applied configuration', async () => {
    const first = deferred<DescriptiveResult>()
    const second = deferred<DescriptiveResult>()
    vi.mocked(computeDescriptiveStats).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    act(() => hook.handleRun(config('a')))
    await act(async () => vi.advanceTimersByTimeAsync(250))
    act(() => hook.handleRun(config('b')))
    await act(async () => vi.advanceTimersByTimeAsync(250))
    await act(async () => second.resolve(result(2)))
    expect(hook.result?.summary.mean).toBe(2)
    expect(hook.config?.column).toBe('b')

    await act(async () => first.resolve(result(1)))
    expect(hook.result?.summary.mean).toBe(2)
    expect(hook.config?.column).toBe('b')
    expect(hook.isComputing).toBe(false)
  })

  it('keeps the applied result visible while reset defaults recompute', async () => {
    vi.mocked(computeDescriptiveStats).mockResolvedValue(result(3))
    act(() => hook.handleRun(config('a')))
    await act(async () => vi.advanceTimersByTimeAsync(250))
    await act(async () => {})
    act(() => hook.handleReset())
    expect(hook.result?.summary.mean).toBe(3)
  })
})
