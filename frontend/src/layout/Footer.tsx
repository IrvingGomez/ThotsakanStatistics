const FOOTER_LOGOS = [
  { src: '/logos/HimmapanLab.png', alt: 'Himmapan Lab' },
  { src: '/logos/CmklLogo.png',    alt: 'CMKL' },
  { src: '/logos/AiceLogo.png',    alt: 'AICE' },
]

interface FooterProps {
  dataset?: string
  rows?: number
  cols?: number
  version?: string
}

export default function Footer({
  dataset = 'No dataset loaded',
  rows,
  cols,
  version = '0.1.0-alpha',
}: FooterProps) {
  return (
    <footer className="app-footer min-h-8 flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-1 shrink-0 min-w-0
      bg-[var(--color-bg-panel)] border-t border-[var(--color-border)]
      text-xs text-[var(--color-text-muted)]">

      {/* Affiliation micro-logos */}
      <div className="flex items-center gap-2">
        {FOOTER_LOGOS.map((l) => (
          <img
            key={l.alt}
            src={l.src}
            alt={l.alt}
            className="h-4 w-auto object-contain opacity-60"
            draggable={false}
          />
        ))}
      </div>

      <span className="border-l border-[var(--color-border)] h-3" />

      <span className="min-w-0 break-words">Analysis: <span className="text-[var(--color-text)]">{dataset}</span></span>

      {rows !== undefined && cols !== undefined && (
        <span>{rows} rows × {cols} cols</span>
      )}

      <span className="ml-auto">v{version}</span>
    </footer>
  )
}
