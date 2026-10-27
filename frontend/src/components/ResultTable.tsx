import type { ReactNode } from 'react'
import { TABLE_TINTS } from '../plot/theme'

/**
 * Rows with a type (statistic type, interval kind) take their tint from TABLE_TINTS in plot/theme.ts.
 * Tables whose rows have no type share the same frame, header and fonts but stay uncolored.
 */
const TABLE_GROUP_TINTS: Readonly<Record<string, { row: string; text: string; label: string }>> = TABLE_TINTS

/** Small labels beside a statistic's name, e.g. Robust. One color per meaning, in every table. */
export const TABLE_TAG_STYLES = {
  Robust: 'border-indigo-400/40 bg-indigo-500/20 text-indigo-300',
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
/** `tint` picks the row color when it differs from the group, e.g. Confidence rows tinted by their quantity. */
export interface ResultRow { group?: string; tint?: string; cells: Record<string, ReactNode> }

/** The one table look for results. A `group` column is added only when rows carry a group. */
export default function ResultTable({ caption, columns, rows, groupLabel = 'Category' }: {
  caption: string; columns: readonly ResultColumn[]; rows: readonly ResultRow[]; groupLabel?: string
}) {
  const grouped = rows.some((row) => row.group)
  const cellAlign = (column: ResultColumn) => column.align === 'right' ? 'text-right font-mono tabular-nums' : 'text-left'
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]" role="region" aria-label={caption} tabIndex={0}>
      <table className="w-full text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-[var(--color-bg-input)]">
          <tr className="border-b border-[var(--color-border-md)]">
            {grouped && <th scope="col" className="w-36 px-3 py-2 text-left font-normal text-[var(--color-text-muted)]">{groupLabel}</th>}
            {columns.map((column) => (
              <th key={column.key} scope="col" className={`px-3 py-2 font-normal text-[var(--color-text-muted)] ${column.align === 'right' ? 'text-right' : 'text-left'}`}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const tintKey = row.tint ?? row.group
            const tint = tintKey ? TABLE_GROUP_TINTS[tintKey] : undefined
            const firstOfRun = row.group === undefined || rows[index - 1]?.group !== row.group
            // The group label is one cell spanning its run. It takes the run's tint when all its rows share one,
            // and stays neutral when they differ (e.g. Confidence rows tinted by mean, median and deviation).
            let labelCell = null
            if (grouped && firstOfRun) {
              let span = 1
              while (row.group !== undefined && rows[index + span]?.group === row.group) span += 1
              const run = rows.slice(index, index + span)
              const shared = run.every((other) => (other.tint ?? other.group) === tintKey)
              const look = shared ? `${tint?.row ?? ''} ${tint?.label ?? 'text-[var(--color-text-muted)]'}` : 'bg-[var(--color-bg-input)] text-[var(--color-text)]'
              labelCell = <td rowSpan={span} className={`border-r border-[var(--color-border)] px-3 py-1.5 align-middle font-medium ${look}`}>{row.group ?? ''}</td>
            }
            return (
              <tr key={index} className={`border-b border-[var(--color-border)] last:border-0 ${tint?.row ?? ''}`}>
                {labelCell}
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
