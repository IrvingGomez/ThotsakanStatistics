import type { ReactNode } from 'react'

/** Notebook building blocks shared by every tab (replaces the per-tab local Section / Row copies). */

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-2 border-b border-[var(--color-border-md)] pb-1 text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
        {title}
      </h3>
      {children}
    </section>
  )
}

export function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--color-border)] py-1 text-xs">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className="font-mono text-[var(--color-text)]">{value}</span>
    </div>
  )
}

export function ResultCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="min-w-0 rounded-lg border border-[var(--color-border-md)] bg-[var(--color-bg-input)] p-3">
      <h4 className="mb-1 text-sm font-semibold text-[var(--color-text)]">{title}</h4>
      {children}
    </article>
  )
}
