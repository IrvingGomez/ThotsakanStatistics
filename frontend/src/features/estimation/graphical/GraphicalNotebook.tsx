// features/estimation/graphical/GraphicalNotebook.tsx
// Right panel: the estimates the normal overlay was drawn from, and the definition of what
// is plotted (with the DKW ε of the ECDF band), typeset like the other tabs' formulas.

import type { GraphicalResponse } from '../../../api/graphical'
import { Formula, Row, Section } from '../../../components/notebook/NotebookParts'
import MathFormula from '../../../components/MathFormula'
import { EmptyState } from '../../../components/StatusBanner'

interface GraphicalNotebookProps {
  result: GraphicalResponse | null
  graphType: string
  precision: number
}

/** What each plot is, with one plain-language note under the formula. */
const DEFINITIONS: Record<string, { label: string; tex: string; note: string }> = {
  Histogram: {
    label: 'Density of bin j',
    tex: String.raw`\hat{f}_j = \frac{n_j}{n\,h_j}, \quad n_j = \text{count in bin } j, \quad h_j = \text{bin width}`,
    note: 'Bar areas sum to 1, so shapes stay comparable across bin counts.',
  },
  PMF: {
    label: 'Empirical PMF',
    tex: String.raw`\hat{p}(x) = \frac{\#\{\, i : x_i = x \,\}}{n}`,
    note: 'One bar per distinct value; meaningful for discrete variables.',
  },
  ECDF: {
    label: 'Empirical CDF',
    tex: String.raw`\hat{F}(x) = \frac{1}{n} \sum_{i=1}^{n} \mathbf{1}\{\, x_i \le x \,\}`,
    note: 'Proportion of observations at or below x.',
  },
}

const DKW_BAND = String.raw`\hat{F}(x) \pm \varepsilon, \quad \varepsilon = \sqrt{\frac{\ln(2/\alpha)}{2n}}`
const NORMAL_DENSITY = String.raw`\hat{f}(x) = \frac{1}{\hat{\sigma}\sqrt{2\pi}} \exp\!\left( -\frac{(x - \hat{\mu})^{2}}{2\hat{\sigma}^{2}} \right)`
const NORMAL_CDF = String.raw`\hat{F}(x) = \Phi\!\left( \frac{x - \hat{\mu}}{\hat{\sigma}} \right)`

export default function GraphicalNotebook({ result, graphType, precision }: GraphicalNotebookProps) {
  if (!result) return <EmptyState loaded hasData compact />

  const fmt = (v: number | null | undefined) =>
    v === null || v === undefined ? '—' : Number(v).toFixed(precision)

  const { point_estimates: pe, ecdf_data, alpha } = result
  const definition = DEFINITIONS[graphType]
  const band = !!ecdf_data && alpha != null
  const normal = pe?.mu != null || pe?.sigma != null

  // Formulas and definitions first, the values they use last (the same order in every tab).
  return (
    <div className="flex flex-col">

      {definition && (
        <Section title="Definition">
          <Formula label={definition.label}><MathFormula tex={definition.tex} /></Formula>
          <p className="mb-2 text-xs text-[var(--color-text-muted)] leading-relaxed">{definition.note}</p>
          {band && <Formula label="DKW band"><MathFormula tex={DKW_BAND} /></Formula>}
        </Section>
      )}

      {normal && (
        <Section title="Normal overlay">
          <Formula label={graphType === 'ECDF' ? 'Normal CDF' : 'Normal density'}>
            <MathFormula tex={graphType === 'ECDF' ? NORMAL_CDF : NORMAL_DENSITY} />
          </Formula>
        </Section>
      )}

      {(normal || band) && (
        <Section title="Values">
          {normal && (
            <>
              <Row label={<MathFormula inline tex={String.raw`\hat{\mu}`} />} value={fmt(pe?.mu)} />
              <Row label={<MathFormula inline tex={String.raw`\hat{\sigma}`} />} value={fmt(pe?.sigma)} />
            </>
          )}
          {band && (
            <>
              <Row label="α" value={fmt(alpha)} />
              <Row label="ε" value={fmt(ecdf_data!.epsilon)} />
            </>
          )}
        </Section>
      )}
    </div>
  )
}
