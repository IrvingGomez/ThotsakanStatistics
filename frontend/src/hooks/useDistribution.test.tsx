import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computeDistribution, type DistributionResponse } from '../api/probability'
import { useDistribution, type DistParams } from './useDistribution'

vi.mock('../api/probability', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/probability')>()
  return { ...actual, computeDistribution: vi.fn() }
})
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(yes => { resolve = yes })
  return { promise, resolve }
}
const response = (value: number): DistributionResponse => ({ ks: [0, 1], probs: [0.5, 0.5], cumProbs: [0.5, 1], queryResult: value, theorMean: 1, theorVariance: 1 })

let root: Root
let container: HTMLDivElement
let hook!: ReturnType<typeof useDistribution>
function Harness({ params }: { params: DistParams }) { hook = useDistribution(params); return null }
const params = (queryK: number): DistParams => ({ distName: 'Poisson', paramValues: { lambda: 5 }, queryOp: '<=', queryK })

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.useFakeTimers()
  vi.mocked(computeDistribution).mockReset()
  container = document.createElement('div')
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  vi.useRealTimers()
})

describe('distribution authoritative results', () => {
  it('marks changes pending immediately and never promotes a superseded response', async () => {
    const first = deferred<DistributionResponse>()
    const second = deferred<DistributionResponse>()
    vi.mocked(computeDistribution).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    act(() => root.render(<Harness params={params(5)} />))
    expect(hook.isLoading).toBe(true)
    expect(hook.result?.provisional).toBe(true)
    expect(hook.appliedParams).toBeNull()
    expect(computeDistribution).not.toHaveBeenCalled()

    await act(async () => vi.advanceTimersByTimeAsync(250))
    const firstSignal = vi.mocked(computeDistribution).mock.calls[0][1]!
    act(() => root.render(<Harness params={params(6)} />))
    expect(firstSignal.aborted).toBe(true)
    expect(hook.isLoading).toBe(true)
    expect(hook.result?.provisional).toBe(true)

    await act(async () => first.resolve(response(0.1)))
    expect(hook.appliedParams).toBeNull()
    await act(async () => vi.advanceTimersByTimeAsync(250))
    await act(async () => second.resolve(response(0.2)))
    expect(hook.result?.provisional).toBe(false)
    expect(hook.result?.queryResult).toBe(0.2)
    expect(hook.appliedParams?.queryK).toBe(6)
    expect(hook.result?.requestFingerprint).toBe(JSON.stringify(['Poisson', { lambda: 5 }, '<=', 6]))
  })
})
