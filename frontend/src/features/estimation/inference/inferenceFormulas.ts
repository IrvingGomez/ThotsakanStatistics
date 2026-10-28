// features/estimation/inference/inferenceFormulas.ts
// The formula of each interval, in LaTeX, written from what backend/core/estimation/inference computes
// (ci_mean.py, ci_median.py, ci_deviation.py, pi_mean.py, pi_median.py, pi_iqr.py, pi_bootstrap.py).
// The method is read from the row the backend returned, so the formula always matches the number shown.

import { quantityLabel, type IntervalRow } from './inferencePresentation'

export interface IntervalFormula { label: string; tex: string }

const Z = String.raw`z_{1-\alpha/2}`
const T = String.raw`t_{n-1,\,1-\alpha/2}`
const Q75 = String.raw`\Phi^{-1}(0.75)`
/** Bootstrap percentile interval of a statistic computed on each of the B resamples. */
const quantiles = (statistic: string) => String.raw`\left[\, q_{\alpha/2}\!\left(${statistic}^{*}\right),\; q_{1-\alpha/2}\!\left(${statistic}^{*}\right) \right]`
/** Asymptotic interval for σ from a scale statistic S with E[S] ≈ wσ and sd(S) ≈ kσ/√n. */
const asymptotic = (statistic: string, w: string, k: string) =>
  String.raw`\begin{gathered} \left[ \frac{${statistic}}{w + ${Z}\,k/\sqrt{n}},\; \frac{${statistic}}{w - ${Z}\,k/\sqrt{n}} \right] \\ w = ${w}, \quad k = ${k} \end{gathered}`

const DEVIATION_NORMAL: Record<string, IntervalFormula> = {
  'Deviation (1 ddof)': { label: 'Deviation · χ²', tex: String.raw`\left[ \frac{s\sqrt{n-1}}{\sqrt{\chi^{2}_{n-1,\,1-\alpha/2}}},\; \frac{s\sqrt{n-1}}{\sqrt{\chi^{2}_{n-1,\,\alpha/2}}} \right]` },
  'Range (bias corrected)': { label: 'Deviation · range', tex: String.raw`\left[ \frac{R}{d_2(n) + ${Z}\, d_3(n)},\; \frac{R}{d_2(n) - ${Z}\, d_3(n)} \right]` },
  'IQR (bias corrected)': { label: 'Deviation · IQR (asymptotic)', tex: asymptotic(String.raw`\mathrm{IQR}`, String.raw`2\,${Q75}`, String.raw`\sqrt{\pi / \left(2 e^{-${Q75}^{2}}\right)}`) },
  'MAD (bias corrected)': { label: 'Deviation · MAD (asymptotic)', tex: asymptotic(String.raw`\mathrm{MAD}`, Q75, String.raw`\sqrt{\pi / \left(8 e^{-${Q75}^{2}}\right)}`) },
  'AAD (bias corrected)': { label: 'Deviation · AAD (asymptotic)', tex: asymptotic(String.raw`\mathrm{AAD}`, String.raw`\sqrt{2/\pi}`, String.raw`\sqrt{1 - 2/\pi}`) },
}

/** The bootstrap deviation interval rescales the quantiles of the raw statistic by the estimator's constant. */
const DEVIATION_BOOTSTRAP: Record<string, string> = {
  'Deviation (1 ddof)': quantiles('s'),
  'Range (bias corrected)': String.raw`\frac{1}{d_2(n)}\, ${quantiles('R')}`,
  'IQR (bias corrected)': String.raw`\frac{1}{2\,${Q75}}\, ${quantiles(String.raw`\mathrm{IQR}`)}`,
  'MAD (bias corrected)': String.raw`\frac{1}{${Q75}}\, ${quantiles(String.raw`\mathrm{MAD}`)}`,
  'AAD (bias corrected)': String.raw`\sqrt{\pi/2}\, ${quantiles(String.raw`\mathrm{AAD}`)}`,
}

export function intervalFormula(kind: 'confidence' | 'prediction', row: Pick<IntervalRow, 'Statistic' | 'Method'>, sigmaEstimator: string): IntervalFormula {
  const quantity = quantityLabel(row.Statistic)
  const bootstrap = row.Method.startsWith('Bootstrap')
  const usesT = row.Method.startsWith('t (')

  if (kind === 'prediction') {
    if (quantity === 'Mean') return usesT
      ? { label: 'Based on the mean · t', tex: String.raw`\bar{x} \pm ${T}\, s\sqrt{1 + \frac{1}{n}}` }
      : { label: 'Based on the mean · normal (z)', tex: String.raw`\bar{x} \pm ${Z}\, \hat{\sigma}\sqrt{1 + \frac{1}{n}}` }
    if (quantity === 'Median') return { label: 'Based on the median · normal (asymptotic)', tex: String.raw`\tilde{x} \pm ${Z}\, \hat{\sigma}\sqrt{1 + \frac{\pi}{2n}}` }
    if (quantity === 'IQR') return {
      label: 'Based on the IQR',
      tex: String.raw`\begin{gathered} \left[ Q_1 - \delta\,\mathrm{IQR},\; Q_3 + \delta\,\mathrm{IQR} \right] \\ \delta =\tfrac{1}{2}\left( \frac{${Z}}{${Q75}} - 1 \right) \end{gathered}`,
    }
    return {
      label: 'Using bootstrap',
      tex: String.raw`\left[ \frac{1}{B}\sum_{b=1}^{B} q_{\alpha/2}\!\left(x^{*}_{b}\right),\; \frac{1}{B}\sum_{b=1}^{B} q_{1-\alpha/2}\!\left(x^{*}_{b}\right) \right]`,
    }
  }

  if (quantity === 'Mean') {
    if (bootstrap) return { label: 'Mean · bootstrap', tex: quantiles(String.raw`\bar{x}`) }
    return usesT
      ? { label: 'Mean · t', tex: String.raw`\bar{x} \pm ${T}\, \frac{s}{\sqrt{n}}` }
      : { label: 'Mean · normal (z)', tex: String.raw`\bar{x} \pm ${Z}\, \frac{\hat{\sigma}}{\sqrt{n}}` }
  }
  if (quantity === 'Median') return bootstrap
    ? { label: 'Median · bootstrap', tex: quantiles(String.raw`\tilde{x}`) }
    : { label: 'Median · normal (asymptotic)', tex: String.raw`\tilde{x} \pm ${Z}\, \hat{\sigma}\sqrt{\frac{\pi}{2n}}` }
  return bootstrap
    ? { label: 'Deviation · bootstrap', tex: DEVIATION_BOOTSTRAP[sigmaEstimator] ?? quantiles(String.raw`\hat{\sigma}`) }
    : DEVIATION_NORMAL[sigmaEstimator] ?? { label: 'Deviation', tex: String.raw`\hat{\sigma}` }
}

/**
 * How the joint confidence regions are built, from likelihood.py and confidence_regions.py: the normal
 * likelihood, its maximum (σ̂ divides by n), the relative likelihood as the backend computes it, and the
 * χ²(2) cut-off for each coverage p.
 */
export const REGION_FORMULAS: readonly IntervalFormula[] = [
  { label: 'Normal likelihood', tex: String.raw`L(\mu, \sigma) = \prod_{i=1}^{n} \frac{1}{\sigma\sqrt{2\pi}} \exp\!\left( -\frac{(x_i - \mu)^{2}}{2\sigma^{2}} \right)` },
  { label: 'Maximum-likelihood estimates (the deviation divides by n)', tex: String.raw`\hat{\mu} = \bar{x}, \qquad \hat{\sigma} = \sqrt{\frac{1}{n} \sum_{i=1}^{n} (x_i - \bar{x})^{2}}` },
  { label: 'Relative likelihood', tex: String.raw`\begin{gathered} R(\mu, \sigma) = \frac{L(\mu, \sigma)}{L(\hat{\mu}, \hat{\sigma})} \\ = \left( \frac{\hat{\sigma}}{\sigma} \right)^{n} \exp\!\left\{ \frac{n}{2} \left[ 1 - \frac{\hat{\sigma}^{2} + (\bar{x} - \mu)^{2}}{\sigma^{2}} \right] \right\} \end{gathered}` },
  { label: 'Region with coverage p', tex: String.raw`\left\{ (\mu, \sigma) : R(\mu, \sigma) \ge e^{-\chi^{2}_{2,\,p} / 2} \right\}` },
]

/** The dashed box: the t interval for the mean and the χ² interval for σ, always with s (ddof = 1). */
export const REGION_BOX: IntervalFormula = {
  label: 'Marginal box (dashed, not a joint region)',
  tex: String.raw`\left[ \bar{x} \pm ${T}\, \frac{s}{\sqrt{n}} \right] \times \left[ \frac{s\sqrt{n-1}}{\sqrt{\chi^{2}_{n-1,\,1-\alpha/2}}},\; \frac{s\sqrt{n-1}}{\sqrt{\chi^{2}_{n-1,\,\alpha/2}}} \right]`,
}

/** The symbols the formulas use, in the order a reader meets them. */
export const NOTATION: readonly { tex: string; text: string; namesEstimator?: boolean }[] = [
  { tex: String.raw`\bar{x},\ \tilde{x},\ s`, text: 'sample mean, sample median, standard deviation (ddof = 1)' },
  { tex: String.raw`\hat{\sigma}`, text: 'the deviation estimator chosen in the left panel', namesEstimator: true },
  { tex: String.raw`z_{p},\ t_{n-1,\,p},\ \chi^{2}_{n-1,\,p}`, text: 'p-quantiles of the standard normal, t and χ² distributions' },
  { tex: String.raw`q_{p}\!\left(\theta^{*}\right)`, text: 'p-quantile of a statistic θ over B bootstrap resamples; * marks a resample' },
]
