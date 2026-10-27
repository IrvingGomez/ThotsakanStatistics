import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it } from 'vitest'
import Footer from './Footer'
import pkg from '../../package.json'

it('shows the version from package.json, its one home', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const container = document.createElement('div')
  const root = createRoot(container)
  await act(async () => root.render(<Footer />))
  expect(container.textContent).toContain(`v${pkg.version}`)
  expect(pkg.version).toBe('1.0.0')
  await act(async () => root.unmount())
})
