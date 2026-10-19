/**
 * LaTeX for the Probability notebook, one entry per distribution in DISTRIBUTIONS. The parameterizations
 * follow backend/core/probability/common_distributions/distributions.py (scipy): Geometric counts the
 * trials up to the first success (k ≥ 1), Negative Binomial counts the failures before the r-th success,
 * Exponential and Gamma use a rate. Mean and variance were checked against scipy's rv.mean() / rv.var().
 */
export interface DistFormulas {
  /** PMF for discrete, PDF for continuous distributions. */
  density: string
  support: string
  parameters: string
  mean: string
  variance: string
}

export const DIST_FORMULAS: Readonly<Record<string, DistFormulas>> = {
  'Poisson': {
    density: String.raw`P(X = k) = \frac{\lambda^{k} e^{-\lambda}}{k!}`,
    support: String.raw`k \in \{0, 1, 2, \dots\}`,
    parameters: String.raw`\lambda > 0`,
    mean: String.raw`\mathbb{E}[X] = \lambda`,
    variance: String.raw`\operatorname{Var}(X) = \lambda`,
  },
  'Binomial': {
    density: String.raw`P(X = k) = \binom{n}{k} p^{k} (1 - p)^{n - k}`,
    support: String.raw`k \in \{0, 1, \dots, n\}`,
    parameters: String.raw`n \in \{1, 2, \dots\},\ p \in (0, 1)`,
    mean: String.raw`\mathbb{E}[X] = np`,
    variance: String.raw`\operatorname{Var}(X) = np(1 - p)`,
  },
  'Geometric': {
    density: String.raw`P(X = k) = (1 - p)^{k - 1} p`,
    support: String.raw`k \in \{1, 2, 3, \dots\}`,
    parameters: String.raw`p \in (0, 1)`,
    mean: String.raw`\mathbb{E}[X] = \frac{1}{p}`,
    variance: String.raw`\operatorname{Var}(X) = \frac{1 - p}{p^{2}}`,
  },
  'Negative Binomial': {
    density: String.raw`P(X = k) = \binom{k + r - 1}{k} p^{r} (1 - p)^{k}`,
    support: String.raw`k \in \{0, 1, 2, \dots\}`,
    parameters: String.raw`r \in \{1, 2, \dots\},\ p \in (0, 1)`,
    mean: String.raw`\mathbb{E}[X] = \frac{r(1 - p)}{p}`,
    variance: String.raw`\operatorname{Var}(X) = \frac{r(1 - p)}{p^{2}}`,
  },
  'Hypergeometric': {
    density: String.raw`P(X = k) = \frac{\binom{K}{k} \binom{N - K}{n - k}}{\binom{N}{n}}`,
    support: String.raw`k \in \{\max(0,\, n + K - N), \dots, \min(n, K)\}`,
    parameters: String.raw`N \in \{1, 2, \dots\},\ K, n \in \{0, 1, \dots, N\}`,
    mean: String.raw`\mathbb{E}[X] = n \frac{K}{N}`,
    variance: String.raw`\operatorname{Var}(X) = n \frac{K}{N} \frac{N - K}{N} \frac{N - n}{N - 1}`,
  },
  'Normal': {
    density: String.raw`f(x) = \frac{1}{\sigma \sqrt{2\pi}} \exp\!\left( -\frac{(x - \mu)^{2}}{2\sigma^{2}} \right)`,
    support: String.raw`x \in \mathbb{R}`,
    parameters: String.raw`\mu \in \mathbb{R},\ \sigma > 0`,
    mean: String.raw`\mathbb{E}[X] = \mu`,
    variance: String.raw`\operatorname{Var}(X) = \sigma^{2}`,
  },
  'Exponential': {
    density: String.raw`f(x) = \lambda e^{-\lambda x}`,
    support: String.raw`x \in [0, \infty)`,
    parameters: String.raw`\lambda > 0 \ \text{(rate)}`,
    mean: String.raw`\mathbb{E}[X] = \frac{1}{\lambda}`,
    variance: String.raw`\operatorname{Var}(X) = \frac{1}{\lambda^{2}}`,
  },
  'Uniform': {
    density: String.raw`f(x) = \frac{1}{b - a}`,
    support: String.raw`x \in [a, b]`,
    parameters: String.raw`a < b`,
    mean: String.raw`\mathbb{E}[X] = \frac{a + b}{2}`,
    variance: String.raw`\operatorname{Var}(X) = \frac{(b - a)^{2}}{12}`,
  },
  'Gamma': {
    density: String.raw`f(x) = \frac{\beta^{\alpha}}{\Gamma(\alpha)} x^{\alpha - 1} e^{-\beta x}`,
    support: String.raw`x \in (0, \infty)`,
    parameters: String.raw`\alpha > 0 \ \text{(shape)},\ \beta > 0 \ \text{(rate)}`,
    mean: String.raw`\mathbb{E}[X] = \frac{\alpha}{\beta}`,
    variance: String.raw`\operatorname{Var}(X) = \frac{\alpha}{\beta^{2}}`,
  },
  'Beta': {
    density: String.raw`f(x) = \frac{x^{\alpha - 1} (1 - x)^{\beta - 1}}{\mathrm{B}(\alpha, \beta)}`,
    support: String.raw`x \in [0, 1]`,
    parameters: String.raw`\alpha > 0,\ \beta > 0`,
    mean: String.raw`\mathbb{E}[X] = \frac{\alpha}{\alpha + \beta}`,
    variance: String.raw`\operatorname{Var}(X) = \frac{\alpha \beta}{(\alpha + \beta)^{2} (\alpha + \beta + 1)}`,
  },
  'Chi-squared': {
    density: String.raw`f(x) = \frac{1}{2^{k/2} \Gamma(k/2)} x^{k/2 - 1} e^{-x/2}`,
    support: String.raw`x \in (0, \infty)`,
    parameters: String.raw`k \in \{1, 2, \dots\} \ \text{(degrees of freedom)}`,
    mean: String.raw`\mathbb{E}[X] = k`,
    variance: String.raw`\operatorname{Var}(X) = 2k`,
  },
  "Student's t": {
    density: String.raw`f(x) = \frac{\Gamma\!\left(\frac{\nu + 1}{2}\right)}{\sqrt{\nu\pi}\, \Gamma\!\left(\frac{\nu}{2}\right)} \left(1 + \frac{x^{2}}{\nu}\right)^{-\frac{\nu + 1}{2}}`,
    support: String.raw`x \in \mathbb{R}`,
    parameters: String.raw`\nu > 0 \ \text{(degrees of freedom)}`,
    mean: String.raw`\mathbb{E}[X] = 0 \ \text{for } \nu > 1,\ \text{otherwise undefined}`,
    variance: String.raw`\operatorname{Var}(X) = \begin{cases} \frac{\nu}{\nu - 2} & \nu > 2 \\ \infty & 1 < \nu \le 2 \\ \text{undefined} & \text{otherwise} \end{cases}`,
  },
}
