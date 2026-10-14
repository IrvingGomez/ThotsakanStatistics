import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CheckboxTree, { visibleChecked, type CheckboxNode } from './CheckboxTree'

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

const nodes: CheckboxNode[] = [
  {
    id: 'ci', label: 'Confidence interval',
    children: [
      { id: 'ci-mean', label: 'For mean', children: [{ id: 'ci-mean-boot', label: 'Using bootstrap', detail: <span>B-field</span> }] },
      { id: 'ci-median', label: 'For median' },
    ],
  },
  { id: 'pi', label: 'Prediction interval' },
]

const labels = () => [...container.querySelectorAll('label')].map((item) => item.textContent)
const box = (text: string) =>
  [...container.querySelectorAll('label')].find((item) => item.textContent === text)!.querySelector('input') as HTMLInputElement

describe('visibleChecked', () => {
  it('drops ticked children whose parent is not ticked', () => {
    expect(visibleChecked(nodes, ['ci-mean', 'ci-mean-boot', 'pi'])).toEqual(['pi'])
  })

  it('keeps a ticked chain from the root down', () => {
    expect(visibleChecked(nodes, ['ci', 'ci-mean', 'ci-mean-boot', 'ci-median'])).toEqual(['ci', 'ci-mean', 'ci-mean-boot', 'ci-median'])
  })
})

describe('CheckboxTree', () => {
  it('shows sub-options and detail controls only while the parent is ticked', () => {
    act(() => root.render(<CheckboxTree label="Intervals" nodes={nodes} checked={[]} onChange={vi.fn()} />))
    expect(labels()).toEqual(['Confidence interval', 'Prediction interval'])

    act(() => root.render(<CheckboxTree label="Intervals" nodes={nodes} checked={['ci', 'ci-mean', 'ci-mean-boot']} onChange={vi.fn()} />))
    expect(labels()).toContain('For mean')
    expect(labels()).toContain('Using bootstrap')
    expect(container.textContent).toContain('B-field')
  })

  it('reports the next ticked set when a box is toggled', () => {
    const onChange = vi.fn()
    act(() => root.render(<CheckboxTree label="Intervals" nodes={nodes} checked={['pi']} onChange={onChange} />))
    act(() => box('Confidence interval').click())
    expect(onChange).toHaveBeenLastCalledWith(['pi', 'ci'])
    act(() => box('Prediction interval').click())
    expect(onChange).toHaveBeenLastCalledWith([])
  })

  it('keeps child state when the parent is unticked and re-ticked', () => {
    function Harness() {
      const [checked, setChecked] = useState(['ci', 'ci-median'])
      return <CheckboxTree label="Intervals" nodes={nodes} checked={checked} onChange={setChecked} />
    }
    act(() => root.render(<Harness />))
    act(() => box('Confidence interval').click())
    expect(labels()).toEqual(['Confidence interval', 'Prediction interval'])
    act(() => box('Confidence interval').click())
    expect(box('For median').checked).toBe(true)
  })

  it('disables every box when disabled', () => {
    act(() => root.render(<CheckboxTree label="Intervals" nodes={nodes} checked={[]} onChange={vi.fn()} disabled />))
    expect(box('Prediction interval').disabled).toBe(true)
  })
})
