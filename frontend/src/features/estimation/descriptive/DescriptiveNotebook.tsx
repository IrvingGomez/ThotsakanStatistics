// features/estimation/descriptive/DescriptiveNotebook.tsx
// Right panel: the formula of each chosen statistic, then its normal correction (bias or consistency).

import type { DescriptiveResult } from '../../../api/descriptive'
import type { DescriptiveConfig } from './useDescriptiveTabState'
import { EmptyState } from '../../../components/StatusBanner'
import { Formula, Row, Section } from '../../../components/notebook/NotebookParts'
import MathFormula from '../../../components/MathFormula'
import { ADVANCED_GROUPS, BASIC_TREE, visibleStatIds } from './descriptiveOptions'

const LABELS: Record<string, string> = Object.fromEntries([
  ...BASIC_TREE.flatMap((node) => [node, ...(node.children ?? [])]),
  ...ADVANCED_GROUPS.flatMap((group) => group.items),
].map((item) => [item.id, item.label]))

/** Under normality. The statistic is already consistent; the constant removes its finite-sample bias. */
const BIAS_CORRECTIONS = [
  { id: 'variance_0', label: 'Variance (ddof = 0)', tex: String.raw`s^{2} = \frac{n}{n - 1}\, s_0^{2}` },
  { id: 'std_dev_1', label: 'Std dev (ddof = 1)', tex: String.raw`\hat{\sigma} = \frac{s}{c_4(n)}, \quad c_4(n) = \sqrt{\frac{2}{n - 1}}\, \frac{\Gamma(n/2)}{\Gamma\left(\frac{n - 1}{2}\right)}` },
  { id: 'std_dev_0', label: 'Std dev (ddof = 0)', tex: String.raw`\hat{\sigma} = \sqrt{\frac{n}{n - 1}}\, \frac{s_0}{c_4(n)}` },
  { id: 'range', label: 'Range', tex: String.raw`\hat{\sigma} = \frac{R}{d_2(n)}` },
] as const

/** Under normality. The statistic converges to a multiple of σ; the constant makes it consistent for σ. */
const CONSISTENCY_CORRECTIONS = [
  { id: 'mad', label: 'MAD', tex: String.raw`\hat{\sigma} = \frac{\operatorname{MAD}}{\Phi^{-1}(0.75)} \approx 1.4826\,\operatorname{MAD}` },
  { id: 'iqr', label: 'IQR', tex: String.raw`\hat{\sigma} = \frac{\operatorname{IQR}}{2\,\Phi^{-1}(0.75)} \approx 0.7413\,\operatorname{IQR}` },
  { id: 'aad', label: 'AAD', tex: String.raw`\hat{\sigma} = \sqrt{\pi/2}\,\operatorname{AAD} \approx 1.2533\,\operatorname{AAD}` },
] as const

/** Sample central moments, used by the skewness and kurtosis. */
const MOMENTS = String.raw`m_k = \frac{1}{n} \sum_{i=1}^{n} (x_i - \bar{x})^{k}`

/**
 * One formula per statistic, in the table's order, copied from core/estimation/descriptive.py (NumPy and
 * SciPy defaults: linear quantiles, scipy.stats.trim_mean, mstats.winsorize, skew/kurtosis with bias=False).
 */
const FORMULAS: readonly { id: string; tex: (config: DescriptiveConfig) => string }[] = [
  { id: 'minimum', tex: () => String.raw`x_{(1)} = \min_i x_i` },
  { id: 'maximum', tex: () => String.raw`x_{(n)} = \max_i x_i` },
  { id: 'quantiles', tex: () => String.raw`\begin{aligned} Q(p) &= x_{(\lfloor h \rfloor)} + (h - \lfloor h \rfloor)\left( x_{(\lfloor h \rfloor + 1)} - x_{(\lfloor h \rfloor)} \right) \\ h &= (n - 1)\,p + 1 \end{aligned}` },
  { id: 'mean', tex: () => String.raw`\bar{x} = \frac{1}{n} \sum_{i=1}^{n} x_i` },
  { id: 'median', tex: () => String.raw`\operatorname{median}(x) = \begin{cases} x_{((n+1)/2)} & n \text{ odd} \\ \frac{1}{2}\left( x_{(n/2)} + x_{(n/2+1)} \right) & n \text{ even} \end{cases}` },
  { id: 'iqm', tex: () => String.raw`\bar{x}_{0.25} = \frac{1}{n - 2k} \sum_{i=k+1}^{n-k} x_{(i)}, \quad k = \lfloor 0.25\, n \rfloor` },
  { id: 'weighted_mean', tex: () => String.raw`\bar{x}_{w} = \frac{\sum_{i=1}^{n} w_i\, x_i}{\sum_{i=1}^{n} w_i}` },
  { id: 'trimmed_mean', tex: () => String.raw`\bar{x}_{\alpha} = \frac{1}{n - 2k} \sum_{i=k+1}^{n-k} x_{(i)}, \quad k = \lfloor \alpha n \rfloor` },
  { id: 'winsorized_mean', tex: () => String.raw`\begin{aligned} \bar{x}_{W} &= \frac{1}{n} \sum_{i=1}^{n} \min\!\left( \max\!\left( x_i,\, x_{(k_1+1)} \right),\, x_{(n-k_2)} \right) \\ k_1 &= \lfloor \gamma_1 n \rfloor, \quad k_2 = \lfloor \gamma_2 n \rfloor \end{aligned}` },
  { id: 'geometric_mean', tex: () => String.raw`\bar{x}_{G} = \left( \prod_{i=1}^{n} x_i \right)^{1/n}, \quad x_i > 0` },
  { id: 'harmonic_mean', tex: () => String.raw`\bar{x}_{H} = \frac{n}{\sum_{i=1}^{n} 1/x_i}, \quad x_i > 0` },
  { id: 'variance_0', tex: () => String.raw`s_0^{2} = \frac{1}{n} \sum_{i=1}^{n} (x_i - \bar{x})^{2}` },
  { id: 'variance_1', tex: () => String.raw`s^{2} = \frac{1}{n - 1} \sum_{i=1}^{n} (x_i - \bar{x})^{2}` },
  { id: 'std_dev_0', tex: () => String.raw`s_0 = \sqrt{s_0^{2}}` },
  { id: 'std_dev_1', tex: () => String.raw`s = \sqrt{s^{2}}` },
  { id: 'range', tex: () => String.raw`R = x_{(n)} - x_{(1)}` },
  { id: 'aad', tex: () => String.raw`\operatorname{AAD} = \frac{1}{n} \sum_{i=1}^{n} \left| x_i - \bar{x} \right|` },
  { id: 'iqr', tex: () => String.raw`\operatorname{IQR} = Q(0.75) - Q(0.25)` },
  { id: 'mad', tex: () => String.raw`\operatorname{MAD} = \operatorname{median}_i \left| x_i - \operatorname{median}(x) \right|` },
  { id: 'skewness', tex: () => String.raw`\begin{aligned} G_1 &= \frac{\sqrt{n(n - 1)}}{n - 2} \, \frac{m_3}{m_2^{3/2}} \quad \text{(sample-adjusted)} \\ ${MOMENTS} \end{aligned}`.replace('m_k =', 'm_k &=') },
  { id: 'kurtosis', tex: () => String.raw`\begin{aligned} \text{Kurtosis} &= G_2 + 3 \quad \text{(not excess; sample-adjusted)} \\ G_2 &= \frac{n - 1}{(n - 2)(n - 3)} \left[ (n + 1)\, g_2 + 6 \right] \\ g_2 &= \frac{m_4}{m_2^{2}} - 3 \\ ${MOMENTS} \end{aligned}`.replace('m_k =', 'm_k &=') },
]

/** A trimmed or winsorized mean is computed only when its parameter is set. */
const computed = (id: string, config: DescriptiveConfig) =>
  (id !== 'trimmed_mean' || config.trimAlpha != null) && (id !== 'winsorized_mean' || !!config.winsorLimits)
  && (id !== 'quantiles' || config.quantileProbs.length > 0)
const formulaLabel = (id: string, config: DescriptiveConfig) =>
  id === 'trimmed_mean' ? `Trimmed mean (α = ${config.trimAlpha})` : id === 'winsorized_mean' ? 'Winsorized mean' : LABELS[id] ?? id

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

  // Only what the user chose to compute: a statistic that is not ticked has no formula on screen.
  const visible = visibleStatIds(config.selectedStats)
  const formulas = FORMULAS.filter((item) => visible.includes(item.id) && computed(item.id, config))
  const bias = BIAS_CORRECTIONS.filter((item) => visible.includes(item.id))
  const consistency = CONSISTENCY_CORRECTIONS.filter((item) => visible.includes(item.id))

  return (
    <div>
      {formulas.length > 0 && (
        <Section title="Formulas">
          {formulas.map((item) => (
            <Formula key={item.id} label={formulaLabel(item.id, config)}><MathFormula tex={item.tex(config)} /></Formula>
          ))}
        </Section>
      )}

      {config.showConsistencyCorr && (
        <>
          {bias.length > 0 && (
            <Section title="Bias correction">
              {bias.map((item) => <Formula key={item.id} label={item.label}><MathFormula tex={item.tex} /></Formula>)}
            </Section>
          )}
          {consistency.length > 0 && (
            <Section title="Consistency correction">
              {consistency.map((item) => <Formula key={item.id} label={item.label}><MathFormula tex={item.tex} /></Formula>)}
            </Section>
          )}
          {/* Formulas first, the values they use last (the same order in every tab). */}
          {visible.includes('std_dev_1') && c4n && stdRow?.value != null && stdRow.consistencyCorr != null && (
            <Section title="Values">
              <Row label={`c₄(n = ${summary.n})`} value={c4n} />
              <Row label="Std dev (ddof = 1)" value={fmt(stdRow.value)} />
              <Row label="Normal-corrected" value={fmt(stdRow.consistencyCorr)} />
            </Section>
          )}
        </>
      )}
    </div>
  )
}
