import { act } from 'react'
import { readFileSync } from 'node:fs'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ExampleDatasets, { EXAMPLE_DATASETS } from './ExampleDatasets'

const loadFile = vi.fn()
vi.mock('../../context/DataContext', () => ({ useData: () => ({ loadFile }) }))

let root: Root
let container: HTMLDivElement
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  loadFile.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => root.render(<ExampleDatasets />))
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})

function button(name: string) {
  return Array.from(container.querySelectorAll('button')).find((element) => element.textContent?.includes(name))!
}

describe('Example datasets', () => {
  it('lists the three datasets after the button is clicked, WHR first as the default', async () => {
    expect(container.textContent).not.toContain('Howell')
    await act(async () => button('Example datasets').click())
    const items = Array.from(container.querySelectorAll('li')).map((item) => item.textContent)
    expect(items).toHaveLength(3)
    expect(items[0]).toContain('World Happiness Report')
    expect(items[0]).toContain('Default')
    expect(items[1]).toContain('Howell')
    expect(items[2]).toContain('Electricity demand')
  })

  it('loads a picked dataset through the same path as an upload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('height,weight\n150,47\n'))
    vi.stubGlobal('fetch', fetchMock)
    await act(async () => button('Example datasets').click())
    await act(async () => button('Howell').click())
    expect(fetchMock.mock.calls[0][0]).toBe('/datasets/Howell.csv')
    const file = loadFile.mock.calls[0][0] as File
    expect(file.name).toBe('Howell.csv')
    expect(await file.text()).toBe('height,weight\n150,47\n')
  })

  it('says so when a dataset cannot be fetched, and loads nothing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })))
    await act(async () => button('Example datasets').click())
    await act(async () => button('Howell').click())
    expect(loadFile).not.toHaveBeenCalled()
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Howell')
  })

  it('ships every listed file, with the rows and columns the list shows', () => {
    for (const dataset of EXAMPLE_DATASETS) {
      const lines = readFileSync(`public/datasets/${dataset.file}`, 'utf-8').trim().split(/\r?\n/)
      expect(lines.length - 1, dataset.file).toBe(dataset.rows)
      expect(lines[0].split(',').length, dataset.file).toBe(dataset.columns)
    }
  })
})
