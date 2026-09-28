import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LabBench from './LabBench'

let root: Root
let container: HTMLDivElement
let smallScreen: boolean
let listeners: Set<() => void>

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  localStorage.clear()
  smallScreen = false
  listeners = new Set()
  vi.stubGlobal('matchMedia', () => ({
    get matches() { return smallScreen },
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }))
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  act(() => root.render(<LabBench
    controls={<input aria-label="Draft setting" defaultValue="original" />}
    observation={<p>Observation</p>}
    notebook={<p>Notebook</p>}
  />))
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})

function clickButton(name: string) {
  const button = [...container.querySelectorAll('button')].find(element =>
    (element.getAttribute('aria-label') ?? element.textContent) === name)
  expect(button).toBeDefined()
  act(() => button!.click())
}

describe('lab panel continuity', () => {
  it('keeps edited controls mounted through sidebar collapse and expansion', () => {
    const field = container.querySelector('input')!
    field.value = 'unfinished draft'
    clickButton('Hide settings')
    expect(container.querySelector<HTMLElement>('#lab-settings')!.hidden).toBe(true)
    clickButton('Show controls')
    expect(container.querySelector('input')).toBe(field)
    expect(field.value).toBe('unfinished draft')
  })

  it('shows both panels on small screens without overwriting desktop collapse preference', () => {
    clickButton('Hide settings')
    clickButton('Hide notebook')
    act(() => { smallScreen = true; listeners.forEach(listener => listener()) })
    expect(container.querySelector<HTMLElement>('#lab-settings')!.hidden).toBe(false)
    expect(container.querySelector<HTMLElement>('#lab-notebook')!.hidden).toBe(false)
    act(() => { smallScreen = false; listeners.forEach(listener => listener()) })
    expect(container.querySelector<HTMLElement>('#lab-settings')!.hidden).toBe(true)
    expect(container.querySelector<HTMLElement>('#lab-notebook')!.hidden).toBe(true)
  })
})
