import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import LogoBar from './LogoBar'

const auth = vi.hoisted(() => ({
  user: null,
  signOut: async () => {},
  config: { enabled: false, demo: false, clientId: '', allowedDomain: 'cmkl.ac.th' },
}))
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }))

async function renderText() {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const container = document.createElement('div')
  const root = createRoot(container)
  await act(async () => root.render(<LogoBar />))
  const text = container.textContent ?? ''
  await act(async () => root.unmount())
  return text
}

afterEach(() => {
  auth.config.demo = false
})

it('shows a neutral Demo badge, not the development warning, in demo mode', async () => {
  auth.config.demo = true
  const text = await renderText()
  expect(text).toContain('Demo')
  expect(text).not.toContain('Auth disabled')
})

it('keeps the development warning when login is only disabled', async () => {
  const text = await renderText()
  expect(text).toContain('Auth disabled (dev)')
})
