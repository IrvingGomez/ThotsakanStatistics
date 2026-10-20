# 2026-10-20 — Probability queries, Descriptive chart, no summary line

## All tabs
- The `file · variable · n = …` line above the results is gone (`StatusBanner` has no `summary` prop and `summaryLine` is removed), and so are the right-panel "Sample" sections (Descriptive, Graphical). Graphical keeps α and the DKW ε under Definition for the ECDF band.

## Descriptive Statistics
- The mean and median lines are drawn over the histogram and again across the box only, with a blank gap between the two plots.

## Probability — Common Distributions
- Interval queries P(x₁ op X op x₂), with `<` or `≤` chosen at each end. The query row reads `[x₁] [op] X [op] [x₂]` (one-sided: `X [op] [x]`) above a slider whose handles cannot cross; the PMF bars or the PDF area of the query are highlighted.
- Exact probabilities: P(X = x) is 0 for continuous distributions (it showed the density), and discrete queries no longer round x, so P(X ≤ 2.5) = P(X ≤ 2). The instant preview and the backend agree.
- Query values must lie in the support (e.g. [0, 1] for Beta); a new distribution starts at P(X ≤ mean), or mean ± one standard deviation for an interval.
- Parameter sliders respect each other: Hypergeometric K, n ≤ N; Uniform a < b.
- The "Theoretical Mean" card is "Mean". The right panel shows a short description of the distribution ("About") instead of the current parameter values, lists each parameter on its own line with its meaning, and writes the Hypergeometric mean and variance with parenthesised factors.
- API: `POST /api/probability/compute` accepts `queryOp: "between"` with `queryUpper`, `lowerOp` and `upperOp` (`"<"` or `"<="`); an unknown operator or a reversed interval returns 400.
