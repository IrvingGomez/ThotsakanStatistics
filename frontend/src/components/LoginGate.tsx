import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

const GSI_SRC = 'https://accounts.google.com/gsi/client'

function loadGoogleScript(): Promise<void> {
  if (window.google) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`)
    const script = existing ?? document.createElement('script')
    script.addEventListener('load', () => resolve())
    script.addEventListener('error', () => reject(new Error('Could not load Google sign-in.')))
    if (!existing) {
      script.src = GSI_SRC
      script.async = true
      document.head.appendChild(script)
    }
  })
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="h-full flex items-center justify-center bg-[var(--color-bg-base)] text-[var(--color-text)] p-6">
      {children}
    </div>
  )
}

function GoogleButton({ clientId, domain }: { clientId: string; domain: string }) {
  const { signIn } = useAuth()
  const slot = useRef<HTMLDivElement>(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    loadGoogleScript()
      .then(() => {
        if (cancelled || !slot.current || !window.google) return
        window.google.accounts.id.initialize({
          client_id: clientId,
          hd: domain, // account-chooser hint only; the backend enforces the domain
          callback: (r) => { void signIn(r.credential) },
        })
        window.google.accounts.id.renderButton(slot.current, {
          theme: 'filled_black', size: 'large', text: 'signin_with', shape: 'pill',
        })
      })
      .catch((e: Error) => setLoadError(e.message))
    return () => { cancelled = true }
  }, [clientId, domain, signIn])

  return (
    <>
      <div ref={slot} className="flex justify-center min-h-10" />
      {loadError && <p className="text-sm text-red-400 mt-3">{loadError}</p>}
    </>
  )
}

/** Renders children only for a signed-in user; otherwise the Google sign-in screen. */
export default function LoginGate({ children }: { children: ReactNode }) {
  const { status, config, error } = useAuth()

  if (status === 'loading') {
    return <Centered><span className="text-sm text-[var(--color-text-muted)]">Loading…</span></Centered>
  }
  if (status === 'error') {
    return (
      <Centered>
        <p className="text-sm text-red-400 max-w-md text-center">
          Could not reach the server: {error}
        </p>
      </Centered>
    )
  }
  if (status === 'signedIn' || (config && !config.enabled)) return <>{children}</>

  return (
    <Centered>
      <div className="w-full max-w-sm text-center border border-[var(--color-border)] rounded-xl p-8">
        <img src="/logos/ThotsakanStats.png" alt="Thotsakan Statistics" className="h-12 mx-auto mb-4 object-contain" />
        <h1 className="text-xl font-semibold mb-1">Stop Calculating. Start Simulating.</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">
          Sign in with your @{config?.allowedDomain} Google account.
        </p>
        {config && <GoogleButton clientId={config.clientId} domain={config.allowedDomain} />}
        {error && <p role="alert" className="text-sm text-red-400 mt-4">{error}</p>}
      </div>
    </Centered>
  )
}
