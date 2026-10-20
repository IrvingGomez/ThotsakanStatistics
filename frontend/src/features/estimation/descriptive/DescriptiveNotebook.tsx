// features/estimation/descriptive/DescriptiveNotebook.tsx
// Right panel: the formulas and the normal corrections (bias and consistency) and the formulas.

import type { DescriptiveResult } from '../../../api/descriptive'
import type { DescriptiveConfig } from './useDescriptiveTabState'
import { EmptyState } from '../../../components/StatusBanner'
import { Formula, Row, Section } from '../../../components/notebook/NotebookParts'
import MathFormula from '../../../components/MathFormula'

/** Under normality. The statistic is already consistent; the constant removes its finite-sample bias. */
const BIAS_CORRECTIONS = [
  { label: 'Variance', tex: String.raw`s^{2} = \frac{n}{n - 1}\, s_0^{2}` },
  { label: 'Std dev (ddof = 1)', tex: String.raw`\hat{\sigma} = \frac{s}{c_4(n)}, \quad c_4(n) = \sqrt{\frac{2}{n - 1}}\, \frac{\Gamma(n/2)}{\Gamma\left(\frac{n - 1}{2}\right)}` },
  { label: 'Std dev (ddof = 0)', tex: String.raw`\hat{\sigma} = \sqrt{\frac{n}{n - 1}}\, \frac{s_0}{c_4(n)}` },
  { label: 'Range', tex: String.raw`\hat{\sigma} = \frac{R}{d_2(n)}` },
] as const

/** Under normality. The statistic converges to a multiple of σ; the constant makes it consistent for σ. */
const CONSISTENCY_CORRECTIONS = [
  { label: 'MAD', tex: String.raw`\hat{\sigma} = \frac{\operatorname{MAD}}{\Phi^{-1}(0.75)} \approx 1.4826\,\operatorname{MAD}` },
  { label: 'IQR', tex: String.raw`\hat{\sigma} = \frac{\operatorname{IQR}}{2\,\Phi^{-1}(0.75)} \approx 0.7413\,\operatorname{IQR}` },
  { label: 'AAD', tex: String.raw`\hat{\sigma} = \sqrt{\pi/2}\,\operatorname{AAD} \approx 1.2533\,\operatorname{AAD}` },
] as const

const FORMULAS = [
  { label: 'Mean', tex: String.raw`\bar{x} = \frac{1}{n} \sum_{i=1}^{n} x_i` },
  { label: 'Variance (ddof = 1)', tex: String.raw`s^{2} = \frac{1}{n - 1} \sum_{i=1}^{n} (x_i - \bar{x})^{2}` },
  { label: 'MAD', tex: String.raw`\operatorname{MAD} = \operatorname{median}_i \left| x_i - \operatorname{median}(x) \right|` },
  { label: 'Skewness (sample-adjusted, SciPy bias=False)', tex: String.raw`G_1 = \frac{\sqrt{n(n - 1)}}{n - 2} \, \frac{m_3}{m_2^{3/2}}` },
  { label: 'Kurtosis (not excess; sample-adjusted)', tex: String.raw`G_2 + 3, \quad G_2 = \frac{n - 1}{(n - 2)(n - 3)} \left[ (n + 1)\, g_2 + 6 \right], \quad g_2 = \frac{m_4}{m_2^{2}} - 3` },
] as const

interface DescriptiveNotebookProps {
  result: DescriptiveResult | null
  config: DescriptiveConfig | null
  precision: number
  hasData: boolean
  loaded: boolean
}

export default function DescriptiveNotebook({ result, config, precision, hasData, loaded }: DescriptiveNotebookProps) {
  if (!result || !config) return <EmptyState loaded={loaded} hasData={hasData} compact />

  const { summary } = result
  const fmt = (value: number) => value.toFixed(precision)
  const stdRow = result.rows.find((row) => row.statId === 'std_dev_1' || row.measure === 'Std (ddof=1)')
  // c₄(n) is a fixed constant of the method, shown at 6 decimals whatever the display precision.
  const c4n = stdRow?.consistencyCorr != null && stdRow.value != null && stdRow.consistencyCorr !== 0
    ? (stdRow.value / stdRow.consistencyCorr).toFixed(6)
    : null

  return (
    <div>
      <Section title="Formulas">
        {FORMULAS.map((item) => <Formula key={item.label} label={item.label}><MathFormula tex={item.tex} /></Formula>)}
        {config.trimAlpha != null && (
          <Formula label={`Trimmed mean (α = ${config.trimAlpha})`}>
            <MathFormula tex={String.raw`\bar{x}_{\alpha} = \frac{1}{n - 2k} \sum_{i=k+1}^{n-k} x_{(i)}, \quad k = \lfloor \alpha n \rfloor`} />
          </Formula>
        )}
        {config.winsorLimits && (
          <Formula label="Winsorized mean">
            <MathFormula tex={String.raw`\bar{x}_{w} = \frac{1}{n} \sum_{i=1}^{n} w_i, \quad w_i = \min\!\left(\max\!\left(x_i,\, x_{(k_1+1)}\right),\, x_{(n-k_2)}\right)`} />
          </Formula>
        )}
      </Section>

      {config.showConsistencyCorr && (
        <>
          <Section title="Bias correction">
            {c4n && stdRow?.value != null && stdRow.consistencyCorr != null && (
              <div className="mb-2">
                <Row label={`c₄(n = ${summary.n})`} value={c4n} />
                <Row label="Std dev (ddof = 1)" value={fmt(stdRow.value)} />
                <Row label="Normal-corrected" value={fmt(stdRow.consistencyCorr)} />
              </div>
            )}
            {BIAS_CORRECTIONS.map((item) => <Formula key={item.label} label={item.label}><MathFormula tex={item.tex} /></Formula>)}
          </Section>
          <Section title="Consistency correction">
            {CONSISTENCY_CORRECTIONS.map((item) => <Formula key={item.label} label={item.label}><MathFormula tex={item.tex} /></Formula>)}
          </Section>
        </>
      )}
    </div>
  )
}
