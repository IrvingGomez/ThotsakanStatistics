# Decision log

Decisions about how the app looks and behaves, taken by **Irving Gomez** (lab head, project owner). Each
entry says what was decided, when, where it was built and, where it was recorded, why.

**Rule for everyone, people and AI agents alike:** do not reverse or work around a decision recorded here. If
a change you want conflicts with one, stop and talk to Irving first. A decision changes only by a new dated
entry in this file, written or approved by Irving. The day-to-day rules that follow from these decisions are in
[`interaction_contract.md`](interaction_contract.md); keep both in step.

Commit hashes refer to the branch `irving-reviewing-experiment` (forked from `dev` at `b7f9545`).

---

## Product

### An analysis tool, not a guided lab — 2026-10-19
The app behaves like statistical software (jamovi / JASP style): it reports numbers and draws plots, and the
user decides. No lessons, reflection prompts, lab notebook or teaching flow in the analysis tabs; the
guided-teaching layer is separate, later work.
*Where:* [`interaction_contract.md`](interaction_contract.md); `2e4638c`, `af89387`.

### v1 scope — 2026-10-23
v1 is Common Distributions, Graphical Analysis, Descriptive Statistics, Statistical Inference and the Data tab,
all consistent with each other. Deferred: Hypothesis Testing stays as it is on this branch; Linear
Regression; data formats other than CSV.
*Where:* [`plans/2026-10-23-v1-release.md`](plans/2026-10-23-v1-release.md).

### Deploy date — 2026-10-24
Deploy on Wednesday 4 November 2026 (moved from 28 October).
*Why:* more inconsistencies than expected; time to fix them before the event.

---

## How results appear

### Results update on their own; no Run button and no verdict — 2026-10-19
Every analysis tab recalculates automatically after a short pause (about 250 ms; about 700 ms while bootstrap
is on). There are no Run or Update buttons, only Reset, and Reset shows the result for the defaults at once.
Hypothesis Testing reports the statistic, p-value, α and region but never prints "Reject H₀" / "Fail to
reject H₀", and no number is hidden behind a click.
*Why:* the program reports, the user decides; a tool should not make the user press a button to see a result.
*Where:* `2e4638c`, `04de850`, `5568d59`, `b685a5b` (Inference Reset, 2026-10-27).

### No "file · variable · n" line and no "Sample" sections — 2026-10-20
The line above the results and the right-panel "Sample" sections are removed from every tab.
*Where:* `af89387`.

### Panels usable without data — 2026-10-19
Every tab can be opened and its controls explored before a dataset is loaded; an empty state explains what is
missing.
*Where:* `0298b17`.

---

## Layout

### Left = inputs, center = results, right = formulas — 2026-10-19
The left panel holds inputs only, the center the tables and plots, the right panel the technical reference.
*Where:* [`interaction_contract.md`](interaction_contract.md), rule 14.

### Tables at the top of the center panel, plots below — 2026-10-23
*Where:* `c86cfc1`.

### Right panel: formulas first, values last — 2026-10-23
The right panel opens with the formulas, definitions and procedures of what is on screen, typeset with KaTeX,
and closes with a "Values" section (estimates, cut-offs, constants). Only the formulas of the statistics or
intervals actually chosen are shown.
*Where:* `285d571`, `441136d`, `2e9945a`.

### Formulas copied from the code — 2026-10-23
Every formula in a right panel is written from what `backend/core/` computes, never from a textbook.
*Where:* `285d571`, `441136d`, `2e9945a`.

### Left panels: what to show first, settings below — 2026-10-24
The choices of what to show come first; the settings that tune them sit together in one Settings section
below (Inference: α, σ estimator, bootstrap samples). A setting that belongs to one option stays nested under it.
*Where:* `19b1130`.

### Text size — 2026-10-23
Small text is 14 px across the app; no text under 12 px anywhere, plots included.
*Where:* `20584ab`, `86ee55d`.

### Plain tables share one style — 2026-10-19
Tables use the shared `ResultTable`. Rows that have a statistic type are tinted by it; tables whose rows
have none (Hypothesis detailed output, histogram bins) keep the frame and fonts but no tint.
*Where:* `b62cfdc`.

---

## Colors and plots

### One meaning per color — 2026-10-24
Within a tab a color has one meaning. In every plot: mean blue, median green, deviation amber, prediction
rose. Descriptive table groups: Extremes rose, Quantiles purple, Central Tendency blue, Dispersion amber,
Shape stone. Probability keeps its indigo highlight for the query. All colors live in `frontend/src/plot/theme.ts`.
*Why:* the same thing must look the same everywhere, so table and plot read as one.
*Where:* `1835289`.

### Confidence regions look — 2026-10-24
White contour lines labeled by coverage, a dark cross at the estimate, a white dashed box for the marginal
intervals, no outlier red.
*Where:* `1835289`.

### One histogram look; KDE purple; normal model orange — 2026-10-24
Descriptive, Graphical and Inference draw histograms the same soft way. The KDE is purple (another estimate
of the data's distribution). The normal model is orange, a color kept for the future goodness-of-fit result.
*Where:* `5a7cab4`.

### Graphical Analysis contents — 2026-10-24
No "Show data (rug)" and no empirical PMF. Automatic bins give one bar of width 1 per whole number when every
value is a whole number and at most half are distinct (at most 200 bars). The KDE bandwidth h has a slider,
default Scott's rule h = s·n^(−1/5), range a fifth to five times the default. Full names: "ECDF (empirical
cumulative distribution function)", "KDE (kernel density estimator)". No "View histogram data" table.
*Why:* the histogram table would appear only for some variables until variables are classified, and would
read as a bug.
*Where:* `9abf0a4`.

### Discrete probabilities are bars — 2026-10-19
Everywhere, as in Common Distributions, not lollipops.
*Where:* [`interaction_contract.md`](interaction_contract.md), rule 13.

### Infinite densities drawn as 0 — 2026-10-27
Where a density is infinite at the edge of its range (Beta with a shape below 1, Gamma with α < 1,
Chi-squared with k = 1), that one point is drawn as 0 so the rest of the curve stays visible.
*Why:* the infinite value stretched the y-axis and flattened the curve.
*Where:* `4478ab5`, `0a8ba80`.

---

## Tabs

### Descriptive: estimator tags and the "Normal-corrected" column — 2026-10-20
Beside each statistic's name, tags say whether its estimator is **Unbiased** and/or **Consistent**: variance
and standard deviation are always Consistent, plus Unbiased when the normal-corrected value is shown; the
variance with ddof = 1 is always Unbiased. Column names "Statistic" and "Normal-corrected". Correction
formulas sit below the general ones.
*Where:* `cbb7186`, `b1cf5a4`.

### Common Distributions: queries — 2026-10-20
Interval queries P(x₁ op X op x₂) with `<` or `≤` at each end, on a slider whose handles cannot cross.
Exact probabilities: P(X = x) is 0 for a continuous distribution, and P(X ≤ 2.5) = P(X ≤ 2) for a discrete
one. Query values stay inside the support; parameters respect each other (Hypergeometric K, n ≤ N; Uniform
a < b). The card is "Mean"; the right panel describes the distribution and each parameter.
*Where:* `53a494c`, `29c93b8`.

### Inference: intervals table — 2026-10-23
Columns Interval · Statistic · Method · Estimate · Lower · Upper; the Interval cell is merged over its rows
and is neutral when those rows differ in color. Choosing bootstrap adds a row next to the normal-theory row
instead of replacing it.
*Where:* `c86cfc1`.

### Inference: confidence regions panel — 2026-10-23
The right panel shows the normal likelihood, the relative likelihood R(μ, σ) = L(μ, σ) / L(μ̂, σ̂), the region
{(μ, σ) : R(μ, σ) ≥ exp(−χ²₂,ₚ / 2)} for each coverage p, the marginal box when drawn, then the values.
The plot window is chosen automatically.
*Where:* `441136d`, `5e0187c`.

---

## Data

### CSV only for now — 2026-10-23
The Data tab accepts comma-separated `.csv` files, the same as the server. Excel and SPSS `.sav` come after v1.
*Why:* the label promised formats the server could not read.
*Where:* `dae2613`.

### Example datasets — 2026-10-23
The Data tab ships three datasets: WHR 2023 (UN World Happiness Report, the default), Howell, and Victoria
(Australia) electricity demand 2014.
*Where:* `4b7843d`.

### Which columns are numeric — 2026-10-27
A column is numeric when at least 80 % of its filled cells are numbers; the other cells count as missing. The
browser and the server apply the same rule. Filters compare the values as written in the CSV.
*Why:* a stray "?" or "n/a" made every analysis of a column fail, and a blank cell broke filters.
*Where:* `6053639`, `774d618`.

### Missing values with weights — 2026-10-27
Rows missing a value or a weight are dropped together, so each value keeps its own weight; an unknown
weights column is an error.
*Where:* `9858504`.
