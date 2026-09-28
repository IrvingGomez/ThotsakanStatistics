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
    <header className="app-header sticky top-0 z-50 flex items-center justify-between gap-4 px-5 shrink-0 min-w-0
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
      <nav aria-label="Main navigation" className="app-navigation flex items-center gap-0.5 min-w-0 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            aria-current={activeTab === tab.key ? 'page' : undefined}
            onClick={() => onTabChange(tab.key)}
            className={`shrink-0 whitespace-nowrap px-3 py-2 text-sm rounded-md transition-colors cursor-pointer
              ${activeTab === tab.key
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/5'
              }`}
          >
            <span aria-hidden="true" className="mr-1 text-[0.85em]">{tab.icon}</span>{tab.label}
          </button>
        ))}
      </nav>

    </header>
  )
}
