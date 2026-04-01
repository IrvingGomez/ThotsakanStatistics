/**
 * Slim logo bar displayed above the main tab header.
 * Matches the Python app's persistent header row:
 *   [HimmapanLab] [ThotsakanStats]             [CMKL] [AICE]
 */

const LEFT_LOGOS = [
  { src: '/logos/HimmapanLab.png',    alt: 'Himmapan Lab' },
  { src: '/logos/ThotsakanStats.png', alt: 'Thotsakan Statistics' },
]

const RIGHT_LOGOS = [
  { src: '/logos/CmklLogo.png', alt: 'CMKL University' },
  { src: '/logos/AiceLogo.png', alt: 'AICE' },
]

export default function LogoBar() {
  return (
    <div className="h-14 flex items-center justify-between px-5 shrink-0
      bg-[var(--color-bg-base)] border-b border-[var(--color-border)]">

      {/* Left: lab + product logos */}
      <div className="flex items-center gap-4">
        {LEFT_LOGOS.map((logo) => (
          <img
            key={logo.alt}
            src={logo.src}
            alt={logo.alt}
            className="h-9 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
            draggable={false}
          />
        ))}
      </div>

      {/* Right: institutional logos */}
      <div className="flex items-center gap-4">
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
