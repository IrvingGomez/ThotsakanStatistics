import type { ReactNode } from 'react'

/** A titled block of results in the center panel (a plot or a table). No card, no border. */
export default function ResultSection({ title, note, actions, children }: {
  title: string; note?: string; actions?: ReactNode; children: ReactNode
}) {
  return (
    <section className="mb-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-[var(--color-text)]">{title}</h3>
        {actions}
      </div>
      {note && <p className="mt-1 text-xs text-[var(--color-text-muted)]">{note}</p>}
      <div className="mt-2">{children}</div>
    </section>
  )
}
