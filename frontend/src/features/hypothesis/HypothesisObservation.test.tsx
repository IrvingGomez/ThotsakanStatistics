import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HypothesisResponse } from '../../api/hypothesis'

vi.mock('react-plotly.js', async () => {
  const React = await import('react')
  return { default: (props: { onInitialized?: (figure: unknown, element: HTMLElement) => void; onPurge?: () => void }) => {
    const ref = React.useRef<HTMLDivElement>(null)
    React.useEffect(() => {
      if (ref.current) props.onInitialized?.({}, ref.current)
      return () => props.onPurge?.()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps
    return <div ref={ref} data-testid="plot" />
  } }
})
vi.mock('../../components/ResultToolbar', () => ({ default: (props: { exports?: unknown; ready: boolean }) => (
  <button type="button" data-handlers={String(!!props.exports)} disabled={!props.ready}>Export</button>
) }))
import HypothesisObservation from './HypothesisObservation'

const result: HypothesisResponse = {
  test_type: 'One Sample t-test', table: '[]', statistic: 2, p_value: 0.04, alpha: 0.05,
  reject: true, verdict: 'Reject H0', h0: 'mu = 0', h1: 'mu != 0', warnings: [],
  rejection_region: {
    dist: 't', dof: [20], x: [-3, 0, 3], pdf: [0.01, 0.4, 0.01], y_max: 0.4,
    x_range: [-3, 3], statistic: 2, statistic_offscale: false,
    critical_values: [-1.96, 1.96], reject_region: [[-3, -1.96], [1.96, 3]],
    p_area: [[-3, -2], [2, 3]], tail: 'two-sided', reject: true,
  },
}

let root: Root
let container: HTMLDivElement
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => { act(() => root.unmount()); container.remove() })

function render(isDirty = false, isComputing = false) {
  act(() => root.render(<HypothesisObservation result={result} hasData loaded precision={3} isDirty={isDirty} isComputing={isComputing} />))
}

describe('hypothesis result panel', () => {
  it('offers export as soon as the shown result is current, and not while it is updating', () => {
    render()
    expect(container.querySelector('button[data-handlers]')?.getAttribute('data-handlers')).toBe('true')
    render(true)
    expect(container.querySelector('button[data-handlers]')?.getAttribute('data-handlers')).toBe('false')
    render(false, true)
    expect(container.querySelector('button[data-handlers]')?.getAttribute('data-handlers')).toBe('false')
  })

  it('shows the p-value area without any click and never prints a decision', () => {
    render()
    expect(container.textContent).toContain('Blue area: p-value')
    expect(container.textContent).not.toContain('Reveal')
    expect(container.textContent).not.toContain('Reject H')
  })
})
