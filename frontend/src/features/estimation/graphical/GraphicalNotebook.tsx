// features/estimation/graphical/GraphicalNotebook.tsx
// Right panel: the numbers behind the picture — sample size, the estimates the normal
// overlay was drawn from, and the definition of what is plotted.

import type { GraphicalResponse } from '../../../api/graphical'
import { Row, Section } from '../../../components/notebook/NotebookParts'
import { EmptyState } from '../../../components/StatusBanner'

interface GraphicalNotebookProps {
  result: GraphicalResponse | null
  column: string
  graphType: string
  precision: number
}

/** What each plot is, in the notation of the formulas it uses. */
const DEFINITIONS: Record<string, string[]> = {
  Histogram: ['density = count / (n × bin width)', 'Bar areas sum to 1, so shapes stay comparable across bin counts.'],
  PMF: ['p(x) = count(x) / n', 'One bar per distinct value; meaningful for discrete variables.'],
  ECDF: ['F̂(x) = (number of observations ≤ x) / n', 'DKW band: F̂(x) ± ε, with ε = √(ln(2/α) / (2n)).'],
}

export default function GraphicalNotebook({ result, column, graphType, precision }: GraphicalNotebookProps) {
  if (!result) return <EmptyState loaded hasData compact />

  const fmt = (v: number | null | undefined) =>
    v === null || v === undefined ? '—' : Number(v).toFixed(precision)

  const { summary, point_estimates: pe, ecdf_data, alpha } = result

  return (
    <div className="flex flex-col">

      <Section title="Sample">
        <Row label="Variable" value={column} />
        <Row label="n" value={String(summary.n)} />
        <Row label="Unique values" value={String(summary.n_unique)} />
        {result.histogram_data && <Row label="Bins" value={String(result.histogram_data.counts.length)} />}
        {ecdf_data && alpha != null && <Row label="DKW ε" value={fmt(ecdf_data.epsilon)} />}
        {alpha != null && <Row label="α" value={fmt(alpha)} />}
      </Section>

      {(pe?.mu != null || pe?.sigma != null) && (
        <Section title="Normal overlay">
          <Row label="μ̂" value={fmt(pe?.mu)} />
          <Row label="σ̂" value={fmt(pe?.sigma)} />
        </Section>
      )}

      <Section title="Definition">
        {(DEFINITIONS[graphType] ?? []).map((line) => (
          <p key={line} className="mb-1 text-xs font-mono text-[var(--color-text-muted)] leading-relaxed">{line}</p>
        ))}
      </Section>
    </div>
  )
}
