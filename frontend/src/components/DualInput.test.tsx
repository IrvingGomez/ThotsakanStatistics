import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DualInput from './DualInput'

let root: Root
let container: HTMLDivElement

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.useFakeTimers()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.useRealTimers()
})

function textInput() {
  return container.querySelector('input[type="text"]') as HTMLInputElement
}

function enter(value: string) {
  const input = textInput()
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function blurTextInput() {
  const input = textInput()
  act(() => {
    input.focus()
    input.blur()
  })
}

describe('DualInput', () => {
  it('cancels a pending text commit when an external value replaces it', async () => {
    const onChange = vi.fn()
    act(() => root.render(<DualInput label="Value" value={1} min={0} max={10} step={1} onChange={onChange} />))
    enter('7')
    act(() => root.render(<DualInput label="Value" value={2} min={0} max={10} step={1} onChange={onChange} />))
    await act(async () => vi.advanceTimersByTimeAsync(500))
    expect(onChange).not.toHaveBeenCalled()
    expect(textInput().value).toBe('2.00')
  })

  it('cancels a pending commit when Reset restores the same numeric value', async () => {
    const onChange = vi.fn()
    act(() => root.render(<DualInput label="Value" value={1} min={0} max={10} step={1} resetSignal={0} onChange={onChange} />))
    enter('7')
    act(() => root.render(<DualInput label="Value" value={1} min={0} max={10} step={1} resetSignal={1} onChange={onChange} />))
    await act(async () => vi.advanceTimersByTimeAsync(500))
    expect(onChange).not.toHaveBeenCalled()
    expect(textInput().value).toBe('1.00')
  })

  it('rejects partial numeric strings and restores the last valid value on blur', () => {
    const onChange = vi.fn()
    act(() => root.render(<DualInput label="Value" value={1} min={0} max={10} step={0.5} onChange={onChange} />))
    enter('2abc')
    expect(textInput().value).toBe('2abc')
    blurTextInput()
    expect(textInput().value).toBe('1.00')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('keeps out-of-range text uncommitted and restores the last valid value', async () => {
    const onChange = vi.fn()
    act(() => root.render(<DualInput label="Value" value={1} min={0} max={10} step={0.5} onChange={onChange} />))
    enter('99')
    await act(async () => vi.advanceTimersByTimeAsync(500))
    expect(textInput().value).toBe('99')
    expect(onChange).not.toHaveBeenCalled()
    blurTextInput()
    expect(textInput().value).toBe('1.00')
  })

  it('rounds steps relative to a non-zero minimum', () => {
    const onChange = vi.fn()
    act(() => root.render(<DualInput label="Value" value={0.1} min={0.1} max={1} step={0.2} decimals={1} onChange={onChange} />))
    enter('0.38')
    blurTextInput()
    expect(onChange).toHaveBeenLastCalledWith(0.30000000000000004)
    expect(textInput().value).toBe('0.3')
  })
})
