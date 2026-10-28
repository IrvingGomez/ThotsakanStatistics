import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ExportMenu, { type ExportHandlers } from './ExportMenu'

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

const handlers = (png: ExportHandlers['png'] = vi.fn()): ExportHandlers => ({ png, csv: vi.fn(), pdf: vi.fn() })
const button = (text: string) => [...container.querySelectorAll('button')].find(item => item.textContent?.includes(text)) as HTMLButtonElement

describe('ExportMenu', () => {
  it('focuses the first ordinary action and restores trigger focus on Escape', () => {
    act(() => root.render(<ExportMenu handlers={handlers()} />))
    const trigger = button('Export')
    act(() => trigger.click())
    expect(document.activeElement?.textContent).toContain('PNG')
    act(() => container.firstElementChild!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(document.activeElement).toBe(trigger)
    expect(container.querySelector('[aria-label="Export formats"]')).toBeNull()
  })

  it('awaits failures, shows the error, clears busy state, and blocks duplicate exports', async () => {
    let reject!: (error: Error) => void
    const png = vi.fn(() => new Promise<void>((_, no) => { reject = no }))
    act(() => root.render(<ExportMenu handlers={handlers(png)} />))
    act(() => button('Export').click())
    const pngButton = button('PNG')
    act(() => { pngButton.click(); pngButton.click() })
    expect(png).toHaveBeenCalledTimes(1)
    await act(async () => reject(new Error('Renderer unavailable')))
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Renderer unavailable')
    expect(button('Export').disabled).toBe(false)
  })

  it('does not expose an enabled trigger without handlers', () => {
    act(() => root.render(<ExportMenu ready disabledReason="Result is not applied" />))
    expect(button('Export').disabled).toBe(true)
  })
})
