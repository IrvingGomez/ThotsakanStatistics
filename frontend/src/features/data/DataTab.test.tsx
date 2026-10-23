import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import DataTab from './DataTab'

vi.mock('../../context/DataContext', () => ({
  useData: () => ({ state: { status: 'idle', dataset: null }, filteredRows: [], loadFile: vi.fn() }),
}))

it('offers the example datasets beside the upload area while no dataset is loaded', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const container = document.createElement('div')
  const root = createRoot(container)
  await act(async () => root.render(<DataTab />))
  expect(container.textContent).toContain('Drop a CSV file here')
  expect(container.textContent).not.toMatch(/tsv|txt/)
  expect(container.querySelector('input[type="file"]')?.getAttribute('accept')).toBe('.csv')
  expect(container.textContent).toContain('Example datasets')
  await act(async () => root.unmount())
})
