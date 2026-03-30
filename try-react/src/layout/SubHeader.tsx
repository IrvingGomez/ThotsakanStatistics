export interface SubTab {
  key: string
  label: string
}

interface SubHeaderProps {
  subTabs?: SubTab[]
  activeSubTab?: string
  onSubTabChange?: (key: string) => void
}

export default function SubHeader({ subTabs, activeSubTab, onSubTabChange }: SubHeaderProps) {
  if (!subTabs || subTabs.length === 0) return null

  return (
    <div className="flex items-center px-5 gap-0.5 h-9
      bg-[var(--color-bg-panel)] border-b border-[var(--color-border)]">
      {subTabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onSubTabChange?.(tab.key)}
          className={`px-3 py-1 text-xs rounded-md transition-colors cursor-pointer
            ${
              activeSubTab === tab.key
                ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)] border border-[var(--color-accent)]/40'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/5'
            }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
