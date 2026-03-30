interface CollapsedRailProps {
  side: 'left' | 'right'
  label: string
  onExpand: () => void
}

export default function CollapsedRail({ side, label, onExpand }: CollapsedRailProps) {
  const isLeft = side === 'left'

  return (
    <div
      className={`
        shrink-0 flex flex-col items-center py-3 gap-3
        bg-[var(--color-bg-panel)]
        ${isLeft ? 'border-r' : 'border-l'} border-[var(--color-border)]
      `}
      style={{ width: 'var(--sidebar-collapsed-width)' }}
    >
      {/* Expand button */}
      <button
        type="button"
        onClick={onExpand}
        className="w-7 h-7 flex items-center justify-center rounded
          text-[var(--color-text-muted)] hover:text-[var(--color-text)]
          hover:bg-white/10 transition-colors cursor-pointer text-xs"
        title={`Expand ${label}`}
      >
        {isLeft ? '>' : '<'}
      </button>

      {/* Vertical label */}
      <span
        className={`
          sidebar-rail-text text-[10px] tracking-widest uppercase
          text-[var(--color-text-muted)] select-none
          ${isLeft ? 'rotate-180' : ''}
        `}
      >
        {label}
      </span>
    </div>
  )
}
