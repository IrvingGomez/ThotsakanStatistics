import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import ResultTable, { TABLE_TAG_STYLES } from './ResultTable'

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

const columns = [{ key: 'measure', label: 'Measure' }, { key: 'value', label: 'Value', align: 'right' as const }]

describe('ResultTable', () => {
  it('renders caption and headers', () => {
    act(() => root.render(<ResultTable caption="Statistics" columns={columns} rows={[{ cells: { measure: 'Mean', value: '1.00' } }]} />))
    expect(container.querySelector('caption')?.textContent).toBe('Statistics')
    expect([...container.querySelectorAll('th')].map((th) => th.textContent)).toEqual(['Measure', 'Value'])
  })

  it('prints a group label once per run, in one cell spanning the run, tinted like its rows', () => {
    act(() => root.render(<ResultTable caption="Statistics" columns={columns} rows={[
      { group: 'Shape', cells: { measure: 'Skewness', value: '0.10' } },
      { group: 'Shape', cells: { measure: 'Kurtosis', value: '3.00' } },
    ]} />))
    const rows = [...container.querySelectorAll('tbody tr')]
    const label = rows[0].firstElementChild as HTMLTableCellElement
    expect(label.textContent).toBe('Shape')
    expect(label.rowSpan).toBe(2)
    expect(label.className).toContain('text-stone-400')
    expect(rows[1].children).toHaveLength(2)
  })

  it('names the group column when asked', () => {
    act(() => root.render(<ResultTable caption="Intervals" groupLabel="Interval" columns={columns} rows={[
      { group: 'Confidence', tint: 'Mean', cells: { measure: 'Mean', value: '1.00' } },
      { group: 'Confidence', tint: 'Deviation', cells: { measure: 'Deviation', value: '2.00' } },
    ]} />))
    expect(container.querySelector('th')?.textContent).toBe('Interval')
    const rows = [...container.querySelectorAll('tbody tr')] as HTMLElement[]
    const label = rows[0].firstElementChild as HTMLTableCellElement
    expect(label.textContent).toBe('Confidence')
    expect(label.rowSpan).toBe(2)
    expect(label.className).not.toMatch(/text-(blue|amber)-400/)
    expect(rows[0].className).toContain('bg-blue-950/50')
    expect(rows[1].className).toContain('bg-amber-950/50')
  })

  it('rows without a group have no tint and no group column', () => {
    act(() => root.render(<ResultTable caption="Bins" columns={columns} rows={[{ cells: { measure: 'a', value: '1' } }]} />))
    const row = container.querySelector('tbody tr') as HTMLTableRowElement
    expect(row.className).not.toMatch(/-950/)
    expect(row.children).toHaveLength(2)
  })
})

describe('table tags', () => {
  it('all tags use the same light-on-tint pattern, so they read the same size', () => {
    for (const [tag, style] of Object.entries(TABLE_TAG_STYLES)) {
      expect(style, tag).toMatch(/^border-\w+-400\/40 bg-\w+-500\/20 text-\w+-300$/)
    }
  })
})
