import type { ReactNode } from 'react'

/**
 * A titled block of results in the center panel (a plot or a table). No card; `divided` adds a line above
 * it to set it apart from the blocks before (e.g. a plot on a different scale), `tag` a small label beside the title.
 */
export default function ResultSection({ title, note, actions, tag, divided = false, children }: {
  title: string; note?: string; actions?: ReactNode; tag?: ReactNode; divided?: boolean; children: ReactNode
}) {
  return (
    <section className={`mb-5 ${divided ? 'border-t border-[var(--color-border-md)] pt-5' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex flex-wrap items-center gap-2 text-base font-semibold text-[var(--color-text)]">{title}{tag}</h3>
        {actions}
      </div>
      {note && <p className="mt-1 text-xs text-[var(--color-text-muted)]">{note}</p>}
      <div className="mt-2">{children}</div>
    </section>
  )
}
