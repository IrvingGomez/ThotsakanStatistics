/**
 * LaTeX for the Probability notebook, one entry per distribution in DISTRIBUTIONS. The parameterizations
 * follow backend/core/probability/common_distributions/distributions.py (scipy): Geometric counts the
 * trials up to the first success (k ≥ 1), Negative Binomial counts the failures before the r-th success,
 * Exponential and Gamma use a rate. Mean and variance were checked against scipy's rv.mean() / rv.var().
 */
export interface DistFormulas {
  /** One or two plain sentences: what the distribution models. */
  description: string
  /** PMF for discrete, PDF for continuous distributions. */
  density: string
  support: string
  /** Each parameter's allowed values, and what it is. */
  parameters: readonly { tex: string; meaning: string }[]
  mean: string
  variance: string
}

export const DIST_FORMULAS: Readonly<Record<string, DistFormulas>> = {
  'Poisson': {
    description: 'Number of events in a fixed interval of time or space, when events happen independently at a constant average rate.',
    density: String.raw`P(X = k) = \frac{\lambda^{k} e^{-\lambda}}{k!}`,
    support: String.raw`k \in \{0, 1, 2, \dots\}`,
    parameters: [
      { tex: String.raw`\lambda > 0`, meaning: 'rate: mean number of events per interval' },
    ],
    mean: String.raw`\mathbb{E}[X] = \lambda`,
    variance: String.raw`\operatorname{Var}(X) = \lambda`,
  },
  'Binomial': {
    description: 'Number of successes in n independent trials, each with the same probability of success p.',
    density: String.raw`P(X = k) = \binom{n}{k} p^{k} (1 - p)^{n - k}`,
    support: String.raw`k \in \{0, 1, \dots, n\}`,
    parameters: [
      { tex: String.raw`n \in \{1, 2, \dots\}`, meaning: 'number of trials' },
      { tex: String.raw`p \in (0, 1)`, meaning: 'probability of success in each trial' },
    ],
    mean: String.raw`\mathbb{E}[X] = np`,
    variance: String.raw`\operatorname{Var}(X) = np(1 - p)`,
  },
  'Geometric': {
    description: 'Number of trials needed to get the first success, when each independent trial succeeds with probability p.',
    density: String.raw`P(X = k) = (1 - p)^{k - 1} p`,
    support: String.raw`k \in \{1, 2, 3, \dots\}`,
    parameters: [
      { tex: String.raw`p \in (0, 1)`, meaning: 'probability of success in each trial' },
    ],
    mean: String.raw`\mathbb{E}[X] = \frac{1}{p}`,
    variance: String.raw`\operatorname{Var}(X) = \frac{1 - p}{p^{2}}`,
  },
  'Negative Binomial': {
    description: 'Number of failures before the r-th success, in independent trials that each succeed with probability p.',
    density: String.raw`P(X = k) = \binom{k + r - 1}{k} p^{r} (1 - p)^{k}`,
    support: String.raw`k \in \{0, 1, 2, \dots\}`,
    parameters: [
      { tex: String.raw`r \in \{1, 2, \dots\}`, meaning: 'number of successes to reach' },
      { tex: String.raw`p \in (0, 1)`, meaning: 'probability of success in each trial' },
    ],
    mean: String.raw`\mathbb{E}[X] = \frac{r(1 - p)}{p}`,
    variance: String.raw`\operatorname{Var}(X) = \frac{r(1 - p)}{p^{2}}`,
  },
  'Hypergeometric': {
    description: 'Number of successes in n draws without replacement from a population of N items, K of which are successes.',
    density: String.raw`P(X = k) = \frac{\binom{K}{k} \binom{N - K}{n - k}}{\binom{N}{n}}`,
    support: String.raw`k \in \{\max(0,\, n + K - N), \dots, \min(n, K)\}`,
    parameters: [
      { tex: String.raw`N \in \{1, 2, \dots\}`, meaning: 'population size' },
      { tex: String.raw`K \in \{0, 1, \dots, N\}`, meaning: 'number of successes in the population' },
      { tex: String.raw`n \in \{0, 1, \dots, N\}`, meaning: 'number of draws' },
    ],
    mean: String.raw`\mathbb{E}[X] = n \left( \frac{K}{N} \right)`,
    variance: String.raw`\operatorname{Var}(X) = n \left( \frac{K}{N} \right) \left( \frac{N - K}{N} \right) \left( \frac{N - n}{N - 1} \right)`,
  },
  'Normal': {
    description: 'Symmetric, bell-shaped distribution centered at μ with spread σ. Many measurements and sample means are approximately normal.',
    density: String.raw`f(x) = \frac{1}{\sigma \sqrt{2\pi}} \exp\!\left( -\frac{(x - \mu)^{2}}{2\sigma^{2}} \right)`,
    support: String.raw`x \in \mathbb{R}`,
    parameters: [
      { tex: String.raw`\mu \in \mathbb{R}`, meaning: 'mean (location)' },
      { tex: String.raw`\sigma > 0`, meaning: 'standard deviation (scale)' },
    ],
    mean: String.raw`\mathbb{E}[X] = \mu`,
    variance: String.raw`\operatorname{Var}(X) = \sigma^{2}`,
  },
  'Exponential': {
    description: 'Waiting time until the next event, when events happen at a constant rate λ. It has no memory: the remaining wait does not depend on the time already waited.',
    density: String.raw`f(x) = \lambda e^{-\lambda x}`,
    support: String.raw`x \in [0, \infty)`,
    parameters: [
      { tex: String.raw`\lambda > 0`, meaning: 'rate: mean number of events per unit of time' },
    ],
    mean: String.raw`\mathbb{E}[X] = \frac{1}{\lambda}`,
    variance: String.raw`\operatorname{Var}(X) = \frac{1}{\lambda^{2}}`,
  },
  'Uniform': {
    description: 'Every value between a and b is equally likely.',
    density: String.raw`f(x) = \frac{1}{b - a}`,
    support: String.raw`x \in [a, b]`,
    parameters: [
      { tex: String.raw`a \in \mathbb{R}`, meaning: 'lower bound' },
      { tex: String.raw`b > a`, meaning: 'upper bound' },
    ],
    mean: String.raw`\mathbb{E}[X] = \frac{a + b}{2}`,
    variance: String.raw`\operatorname{Var}(X) = \frac{(b - a)^{2}}{12}`,
  },
  'Gamma': {
    description: 'A flexible model for positive, right-skewed quantities. For a whole-number α, the waiting time until the α-th event when events happen at rate β.',
    density: String.raw`f(x) = \frac{\beta^{\alpha}}{\Gamma(\alpha)} x^{\alpha - 1} e^{-\beta x}`,
    support: String.raw`x \in (0, \infty)`,
    parameters: [
      { tex: String.raw`\alpha > 0`, meaning: 'shape' },
      { tex: String.raw`\beta > 0`, meaning: 'rate' },
    ],
    mean: String.raw`\mathbb{E}[X] = \frac{\alpha}{\beta}`,
    variance: String.raw`\operatorname{Var}(X) = \frac{\alpha}{\beta^{2}}`,
  },
  'Beta': {
    description: 'Values between 0 and 1, such as proportions or probabilities. The two shapes decide where the values concentrate.',
    density: String.raw`f(x) = \frac{x^{\alpha - 1} (1 - x)^{\beta - 1}}{\mathrm{B}(\alpha, \beta)}`,
    support: String.raw`x \in [0, 1]`,
    parameters: [
      { tex: String.raw`\alpha > 0`, meaning: 'shape: larger values pull the mass towards 1' },
      { tex: String.raw`\beta > 0`, meaning: 'shape: larger values pull the mass towards 0' },
    ],
    mean: String.raw`\mathbb{E}[X] = \frac{\alpha}{\alpha + \beta}`,
    variance: String.raw`\operatorname{Var}(X) = \frac{\alpha \beta}{(\alpha + \beta)^{2} (\alpha + \beta + 1)}`,
  },
  'Chi-squared': {
    description: 'Sum of the squares of k independent standard normal variables. Used in tests about variances and in goodness-of-fit tests.',
    density: String.raw`f(x) = \frac{1}{2^{k/2} \Gamma(k/2)} x^{k/2 - 1} e^{-x/2}`,
    support: String.raw`x \in (0, \infty)`,
    parameters: [
      { tex: String.raw`k \in \{1, 2, \dots\}`, meaning: 'degrees of freedom' },
    ],
    mean: String.raw`\mathbb{E}[X] = k`,
    variance: String.raw`\operatorname{Var}(X) = 2k`,
  },
  "Student's t": {
    description: 'Like the standard normal but with heavier tails. Used for inference about a mean when σ is estimated from the sample.',
    density: String.raw`f(x) = \frac{\Gamma\!\left(\frac{\nu + 1}{2}\right)}{\sqrt{\nu\pi}\, \Gamma\!\left(\frac{\nu}{2}\right)} \left(1 + \frac{x^{2}}{\nu}\right)^{-\frac{\nu + 1}{2}}`,
    support: String.raw`x \in \mathbb{R}`,
    parameters: [
      { tex: String.raw`\nu > 0`, meaning: 'degrees of freedom' },
    ],
    mean: String.raw`\mathbb{E}[X] = 0 \ \text{for } \nu > 1,\ \text{otherwise undefined}`,
    variance: String.raw`\operatorname{Var}(X) = \begin{cases} \frac{\nu}{\nu - 2} & \nu > 2 \\ \infty & 1 < \nu \le 2 \\ \text{undefined} & \text{otherwise} \end{cases}`,
  },
}
