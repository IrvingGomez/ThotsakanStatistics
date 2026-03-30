type Tab = {
  key: string
  label: string
  icon: string
}

const TABS: Tab[] = [
  { key: 'home',        label: 'Home',             icon: '🏠' },
  { key: 'data',        label: 'Data',             icon: '📁' },
  { key: 'probability', label: 'Probability',      icon: '🎲' },
  { key: 'estimation',  label: 'Estimation',       icon: '📐' },
  { key: 'hypothesis',  label: 'Hypothesis',       icon: '🧪' },
  { key: 'regression',  label: 'Linear Regression', icon: '📈' },
]

interface HeaderProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 h-14 flex items-center justify-between px-5
      bg-[var(--color-bg-panel)] border-b border-[var(--color-border)]">

      {/* Logo + title */}
      <div className="flex items-center gap-2.5 shrink-0">
        <img
          src="/logos/ThotsakanStats.png"
          alt="Thotsakan Statistics"
          className="h-7 w-auto object-contain"
          draggable={false}
        />
        <span className="text-lg font-bold tracking-tight text-[var(--color-text)]">
          Thotsakan Statistics
        </span>
      </div>

      {/* Tab navigation */}
      <nav className="flex items-center gap-0.5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer
              ${activeTab === tab.key
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/5'
              }`}
          >
            <span className="mr-1 text-[0.85em]">{tab.icon}</span>{tab.label}
          </button>
        ))}
      </nav>

      {/* Right slot (dark mode toggle placeholder) */}
      <div className="shrink-0 w-24 flex justify-end" />
    </header>
  )
}
