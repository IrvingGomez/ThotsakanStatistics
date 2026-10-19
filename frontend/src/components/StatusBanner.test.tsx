import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import StatusBanner, { EmptyState, summaryLine } from './StatusBanner'
import { ResultCard, Row, Section } from './notebook/NotebookParts'

let root: Root
let container: HTMLDivElement

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('StatusBanner', () => {
  it('shows an error with Retry and keeps the previous-result notice', () => {
    const onRetry = vi.fn()
    act(() => root.render(<StatusBanner isComputing={false} error="boom" hasResult onRetry={onRetry} />))
    expect(container.textContent).toContain('Couldn’t update results')
    expect(container.textContent).toContain('boom')
    act(() => (container.querySelector('button') as HTMLButtonElement).click())
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('lists warnings only when there are some', () => {
    act(() => root.render(<StatusBanner isComputing={false} error={null} hasResult />))
    expect(container.querySelector('[aria-label="Warnings"]')).toBeNull()
    act(() => root.render(<StatusBanner isComputing={false} error={null} hasResult warnings={['n is small']} />))
    expect(container.querySelector('[aria-label="Warnings"]')?.textContent).toBe('n is small')
  })

  it('shows the summary line only when a result exists', () => {
    act(() => root.render(<StatusBanner isComputing={false} error={null} hasResult summary="data.csv · x · n = 10" />))
    expect(container.textContent).toContain('data.csv · x · n = 10')
    act(() => root.render(<StatusBanner isComputing={false} error={null} hasResult={false} summary="data.csv · x · n = 10" />))
    expect(container.textContent).not.toContain('data.csv')
  })

  it('has no settings-changed message', () => {
    act(() => root.render(<StatusBanner isComputing={false} error={null} hasResult summary="s" warnings={['w']} resultNotice="r" onRetry={() => {}} />))
    expect(container.textContent).not.toContain('Settings changed')
  })
})

describe('summaryLine', () => {
  it('drops empty parts', () => {
    expect(summaryLine(['a.csv', null, 'x', false, 'n = 3'])).toBe('a.csv · x · n = 3')
  })
})

describe('EmptyState and notebook parts', () => {
  it('asks for a dataset when none is loaded', () => {
    act(() => root.render(<EmptyState loaded={false} hasData={false} />))
    expect(container.querySelector('[role="status"]')?.textContent).toBe('Load a dataset in the Data tab to see results.')
  })

  it('tells a dataset without numeric variables apart', () => {
    act(() => root.render(<EmptyState loaded hasData={false} />))
    expect(container.querySelector('[role="status"]')?.textContent).toBe('This dataset has no numeric variables. Check the column types in the Data tab.')
  })

  it('points to the left panel when data is ready but there is no result', () => {
    act(() => root.render(<EmptyState loaded hasData />))
    expect(container.querySelector('[role="status"]')?.textContent).toBe('Choose the settings in the left panel to see results.')
  })

  it('renders a section with rows and a result card', () => {
    act(() => root.render(
      <Section title="Sample"><Row label="n" value={42} /><ResultCard title="Mean">body</ResultCard></Section>,
    ))
    expect(container.querySelector('h3')?.textContent).toBe('Sample')
    expect(container.textContent).toContain('n42')
    expect(container.querySelector('h4')?.textContent).toBe('Mean')
  })
})
