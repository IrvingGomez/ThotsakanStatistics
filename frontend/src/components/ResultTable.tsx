import type { ReactNode } from 'react'

/**
 * Row tints for tables whose rows have a statistic type (Descriptive Statistics). Tables whose rows have
 * no type share the same frame, header and fonts but stay uncolored.
 */
export const TABLE_GROUP_TINTS: Readonly<Record<string, { row: string; text: string; label: string }>> = {
  'Extremes': { row: 'bg-rose-950/50', text: 'text-rose-300', label: 'text-rose-400' },
  'Quantiles': { row: 'bg-violet-950/50', text: 'text-violet-300', label: 'text-violet-400' },
  'Central Tendency': { row: 'bg-blue-950/50', text: 'text-blue-300', label: 'text-blue-400' },
  'Dispersion': { row: 'bg-emerald-950/50', text: 'text-emerald-300', label: 'text-emerald-400' },
  'Shape': { row: 'bg-amber-950/50', text: 'text-amber-300', label: 'text-amber-400' },
}

/** Small labels beside a statistic's name, e.g. Robust. One color per meaning, in every table. */
export const TABLE_TAG_STYLES = {
  Robust: 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/20 text-[var(--color-accent)]',
  Unbiased: 'border-sky-400/40 bg-sky-500/20 text-sky-300',
  Consistent: 'border-fuchsia-400/40 bg-fuchsia-500/20 text-fuchsia-300',
} as const
export type TableTag = keyof typeof TABLE_TAG_STYLES

export function TableTagLabel({ tag, title, dataTag }: { tag: TableTag; title: string; dataTag?: string }) {
  return (
    <span data-tag={dataTag} title={title} className={`rounded border px-1.5 py-0.5 text-xs font-semibold ${TABLE_TAG_STYLES[tag]}`}>{tag}</span>
  )
}

export interface ResultColumn { key: string; label: string; align?: 'left' | 'right' }
export interface ResultRow { group?: string; cells: Record<string, ReactNode> }

/** The one table look for results. A `group` column is added only when rows carry a group. */
export default function ResultTable({ caption, columns, rows }: {
  caption: string; columns: readonly ResultColumn[]; rows: readonly ResultRow[]
}) {
  const grouped = rows.some((row) => row.group)
  const cellAlign = (column: ResultColumn) => column.align === 'right' ? 'text-right font-mono tabular-nums' : 'text-left'
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]" role="region" aria-label={caption} tabIndex={0}>
      <table className="w-full text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-[var(--color-bg-input)]">
          <tr className="border-b border-[var(--color-border-md)]">
            {grouped && <th scope="col" className="w-36 px-3 py-2 text-left font-normal text-[var(--color-text-muted)]">Category</th>}
            {columns.map((column) => (
              <th key={column.key} scope="col" className={`px-3 py-2 font-normal text-[var(--color-text-muted)] ${column.align === 'right' ? 'text-right' : 'text-left'}`}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const tint = row.group ? TABLE_GROUP_TINTS[row.group] : undefined
            const firstOfRun = row.group !== undefined && rows[index - 1]?.group !== row.group
            return (
              <tr key={index} className={`border-b border-[var(--color-border)] last:border-0 ${tint?.row ?? ''}`}>
                {grouped && <td className={`px-3 py-1.5 font-medium ${tint?.label ?? 'text-[var(--color-text-muted)]'}`}>{firstOfRun ? row.group : ''}</td>}
                {columns.map((column) => (
                  <td key={column.key} className={`px-3 py-1.5 ${cellAlign(column)} ${tint?.text ?? 'text-[var(--color-text)]'}`}>{row.cells[column.key]}</td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
