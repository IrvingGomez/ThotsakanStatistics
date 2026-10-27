import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computeDescriptiveStats } from '../../../api/descriptive'
import DescriptiveControls from './DescriptiveControls'
import { configFromDraft, useDescriptiveTabState } from './useDescriptiveTabState'
import type { DataState } from '../../../context/DataContext'

const data = {
  state: {
    status: 'ready' as DataState['status'], sessionId: 's' as string | null, filename: 'f.csv', numericCols: ['score', 'w'], categoricalCols: [] as string[],
    filters: {}, displayPrecision: 3, dataset: null,
  },
  filteredRows: [],
}
vi.mock('../../../context/DataContext', () => ({ useData: () => data }))
vi.mock('../../../api/descriptive', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/descriptive')>()
  return { ...actual, computeDescriptiveStats: vi.fn(() => new Promise(() => {})) }
})

let root: Root
let container: HTMLDivElement
let hook!: ReturnType<typeof useDescriptiveTabState>
function View() { hook = useDescriptiveTabState(); return <DescriptiveControls state={hook} /> }
const lastConfig = () => configFromDraft(hook.draft)

beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.mocked(computeDescriptiveStats).mockClear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => root.render(<View />))
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

const labelFor = (text: string) => [...container.querySelectorAll('label')].find(item => item.textContent === text)
const checkbox = (text: string) => labelFor(text)!.querySelector('input') as HTMLInputElement
const field = (text: string) => document.getElementById(labelFor(text)!.htmlFor) as HTMLInputElement | HTMLSelectElement
const has = (text: string) => !!labelFor(text)
const click = (element: HTMLElement) => act(async () => element.click())
async function type(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
const openAdvanced = () => click([...container.querySelectorAll('button')].find(button => button.textContent?.includes('Advanced statistics'))!)

describe('Descriptive controls', () => {
  it('starts with every basic statistic ticked and no advanced ones', () => {
    for (const label of ['Minimum', 'Maximum', 'Quantiles', 'Mean', 'Median', 'Std dev (ddof=1)', 'Variance (ddof=1)']) {
      expect(checkbox(label).checked).toBe(true)
    }
    expect(lastConfig()).toMatchObject({
      column: 'score', weightsCol: null, quantileProbs: [0.25, 0.5, 0.75], trimAlpha: null, winsorLimits: null,
    })
    expect(lastConfig().selectedStats).toEqual(expect.arrayContaining(['mean', 'median', 'quantiles', 'std_dev_1']))
    expect(lastConfig().selectedStats).not.toContain('iqr')
  })

  it('lets the user deselect a single basic statistic, and a whole group', async () => {
    await click(checkbox('Median'))
    expect(lastConfig().selectedStats).toContain('mean')
    expect(lastConfig().selectedStats).not.toContain('median')
    await click(checkbox('Central tendency'))
    expect(lastConfig().selectedStats).not.toContain('mean')
    expect(has('Mean')).toBe(false) // its sub-options are hidden with it
  })

  it('shows the weights column only while Weighted mean is ticked, and sends it only then', async () => {
    await openAdvanced()
    expect(has('Weights column')).toBe(false)
    await click(checkbox('Weighted mean'))
    expect(has('Weights column')).toBe(true)
    expect(container.textContent).toContain('Weighted mean needs a weights column.')
    expect(lastConfig().weightsCol).toBeNull() // ticked, but no column chosen yet
    await act(async () => {
      const select = field('Weights column') as HTMLSelectElement
      select.value = 'w'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(lastConfig().weightsCol).toBe('w')
    await click(checkbox('Weighted mean'))
    expect(has('Weights column')).toBe(false)
    expect(lastConfig().weightsCol).toBeNull()
  })

  it('shows an invalid quantile list under its field only, with no extra alert', async () => {
    await type(field('Quantile probabilities') as HTMLInputElement, '0.5, 2')
    const input = field('Quantile probabilities') as HTMLInputElement
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById(`${input.id}-error`)?.textContent).toBe('Enter comma-separated probabilities from 0 to 1, or leave it empty.')
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('sends no quantiles when the Quantiles box is unticked, and hides the probabilities field', async () => {
    await click(checkbox('Quantiles'))
    expect(lastConfig().quantileProbs).toEqual([])
    expect(has('Quantile probabilities')).toBe(false)
  })

  it('changes only display fields when the consistency switch is toggled', async () => {
    const before = lastConfig()
    await click(container.querySelector('[role="switch"]') as HTMLElement)
    const after = lastConfig()
    expect(after.showConsistencyCorr).toBe(false)
    for (const key of ['column', 'weightsCol', 'quantileProbs', 'trimAlpha', 'winsorLimits'] as const) {
      expect(after[key]).toEqual(before[key])
    }
  })

  it('shows the whole panel without a dataset, and picks the first variable once one loads', async () => {
    const loaded = data.state
    await act(async () => root.unmount())
    vi.mocked(computeDescriptiveStats).mockClear()
    data.state = { ...loaded, status: 'idle', sessionId: null, filename: '', numericCols: [] }
    root = createRoot(container)
    await act(async () => root.render(<View />))
    expect((field('Variable') as HTMLSelectElement).disabled).toBe(true)
    expect(container.textContent).toContain('Upload a CSV file in the Data tab.')
    expect(container.textContent).toContain('Basic statistics')
    expect(container.textContent).toContain('Reset to defaults')
    expect(computeDescriptiveStats).not.toHaveBeenCalled()
    data.state = loaded
    await act(async () => root.render(<View />))
    expect(hook.draft.column).toBe('score')
  })
})
