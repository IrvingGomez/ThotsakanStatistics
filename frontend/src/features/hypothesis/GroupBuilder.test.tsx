import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SelectField, TextField } from '../../components/ControlPrimitives'
import GroupBuilder from './GroupBuilder'

vi.mock('../../context/DataContext', () => ({ useData: () => ({ getUniqueValues: () => ['0', '1'] }) }))

let root: Root
let container: HTMLDivElement
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => { act(() => root.unmount()); container.remove() })

describe('GroupBuilder', () => {
  it('uses the shared select and text field', () => {
    act(() => root.render(<>
      <div data-part="group"><GroupBuilder label="Group 1" value={{ column: 'Smoke', values: ['0'], name: 'Group 1' }} onChange={() => {}} categoricalCols={['Smoke']} /></div>
      <div data-part="shared"><SelectField label="x" value="" onChange={() => {}} options={[]} /><TextField label="y" value="" onChange={() => {}} /></div>
    </>))
    const part = (name: string) => container.querySelector(`[data-part="${name}"]`) as HTMLElement
    expect(part('group').querySelector('select')?.className).toBe(part('shared').querySelector('select')?.className)
    expect(part('group').querySelector('input[type="text"]')?.className).toBe(part('shared').querySelector('input[type="text"]')?.className)
  })

  it('changing the column clears the selected categories', () => {
    const onChange = vi.fn()
    act(() => root.render(<GroupBuilder label="Group 1" value={{ column: 'Smoke', values: ['0'], name: 'Group 1' }} onChange={onChange} categoricalCols={['Smoke', 'Sex']} />))
    const select = container.querySelector('select') as HTMLSelectElement
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(select, 'Sex')
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(onChange).toHaveBeenCalledWith({ column: 'Sex', values: [], name: 'Group 1' })
  })
})
