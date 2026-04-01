interface DragHandleProps {
  onPointerDown: (e: React.PointerEvent) => void
  onDoubleClick: () => void
  isDragging: boolean
  inSnapZone?: boolean
  role?: string
  'aria-orientation'?: 'vertical'
  'aria-valuenow'?: number
  'aria-valuemin'?: number
  'aria-valuemax'?: number
  tabIndex?: number
}

export default function DragHandle({
  isDragging,
  inSnapZone = false,
  onPointerDown,
  onDoubleClick,
  ...aria
}: DragHandleProps) {
  return (
    <div
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      {...aria}
      className={`
        shrink-0 w-[var(--drag-handle-width)] cursor-col-resize
        flex items-center justify-center select-none touch-none
        group transition-colors
        ${isDragging && inSnapZone
          ? 'bg-red-500/10'
          : isDragging
          ? 'bg-[var(--color-accent)]/10'
          : 'hover:bg-white/5'}
      `}
    >
      {/* Visible line */}
      <div
        className={`
          w-[2px] h-8 rounded-full transition-colors
          ${isDragging && inSnapZone
            ? 'bg-red-500'
            : isDragging
            ? 'bg-[var(--color-accent)]'
            : 'bg-[var(--color-border-md)] group-hover:bg-[var(--color-accent)]/50'}
        `}
      />
    </div>
  )
}
