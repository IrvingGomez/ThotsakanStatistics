/**
 * Slim logo bar displayed above the main tab header.
 * Matches the Python app's persistent header row:
 *   [HimmapanLab] [ThotsakanStats] Thotsakan Statistics             [CMKL] [AICE]
 */

const LEFT_LOGOS = [
  { src: '/logos/HimmapanLab.png',    alt: 'Himmapan Lab' },
  { src: '/logos/ThotsakanStats.png', alt: 'Thotsakan Statistics' },
]

const RIGHT_LOGOS = [
  { src: '/logos/CmklLogo.png', alt: 'CMKL University' },
  { src: '/logos/AiceLogo.png', alt: 'AICE' },
]

import { useAuth } from '../context/AuthContext'

export default function LogoBar() {
  const { user, signOut, config } = useAuth()
  return (
    <div className="h-14 flex items-center justify-between px-5 shrink-0
      bg-[var(--color-bg-base)] border-b border-[var(--color-border)]">

      {/* Left: lab + product logos, then the product name */}
      <div className="flex items-center gap-4 min-w-0">
        {LEFT_LOGOS.map((logo) => (
          <img
            key={logo.alt}
            src={logo.src}
            alt={logo.alt}
            className="h-9 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
            draggable={false}
          />
        ))}
        <span className="truncate text-lg font-bold tracking-tight text-[var(--color-text)]">
          Thotsakan Statistics
        </span>
      </div>

      {/* Right: signed-in user + institutional logos */}
      <div className="flex items-center gap-4">
        {config?.demo && (
          <span className="px-2 py-1 rounded text-xs font-medium text-[var(--color-text-muted)] border border-[var(--color-border)]"
            title="Demo version: no sign-in. An uploaded file is kept in memory for at most 30 minutes and never saved.">
            Demo
          </span>
        )}
        {config && !config.enabled && !config.demo && (
          <span className="px-2 py-1 rounded text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40"
            title="AUTH_DISABLED=true: login is skipped. Never use in production.">
            Auth disabled (dev)
          </span>
        )}
        {user && config?.enabled && (
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <span className="hidden sm:inline" title={user.email}>{user.name || user.email}</span>
            <button
              onClick={() => { void signOut() }}
              className="px-2 py-1 rounded border border-[var(--color-border)] hover:text-[var(--color-text)] transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
        {RIGHT_LOGOS.map((logo) => (
          <img
            key={logo.alt}
            src={logo.src}
            alt={logo.alt}
            className="h-9 w-auto object-contain opacity-75 hover:opacity-100 transition-opacity"
            draggable={false}
          />
        ))}
      </div>
    </div>
  )
}
