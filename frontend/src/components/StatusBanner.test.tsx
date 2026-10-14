import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import StatusBanner, { EmptyState } from './StatusBanner'
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
})

describe('EmptyState and notebook parts', () => {
  it('renders the empty message as a status', () => {
    act(() => root.render(<EmptyState message="Upload a CSV in Data to begin." />))
    expect(container.querySelector('[role="status"]')?.textContent).toBe('Upload a CSV in Data to begin.')
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
