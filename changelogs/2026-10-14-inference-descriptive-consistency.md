# 2026-10-14 — Inference, Descriptive and Graphical follow the interaction contract

Follows the professor's review. The rules every tab follows are in `docs/interaction_contract.md`; new shared pieces are `CheckboxTree`, `StatusBanner`, `components/notebook/NotebookParts`, `plot/theme.ts` and `labels.ts`.

## Inference
- Checkbox tree replaces the bootstrap switches: confidence / prediction intervals x mean / median / deviation x normal / bootstrap. Normal-theory methods are ticked by default.
- A bootstrap interval now **adds** a row ("Mean – bootstrap") next to the normal-theory row instead of replacing it. New request flags `ci_*_normal` / `pi_*_normal` (default true) choose which rows come back.
- The deviation estimator appears only while a normality-based option that uses it is ticked; bootstrap B (slider) only while a bootstrap option is ticked. α is the shared slider, labelled "Significance level α".
- The two redundant modes ("Confidence Intervals", "Prediction Intervals") are gone.
- Confidence Regions always use the sample mean and the standard deviation with ddof=1 (normal theory); `mu_ci_source` and the estimator/bootstrap fields are ignored for regions.
- Every change updates automatically (250 ms; 700 ms while bootstrap is on). There is no Update button. The CI and PI endpoints compute only their own half.

## Descriptive
- Basic statistics (extremes, quantiles, mean, median, std dev, variance; all ticked by default, each individually deselectable) and Advanced statistics. Every row now carries a `statId` (renamed from `advancedId`).
- The weights column appears only while "Weighted mean" is ticked; trim / winsor fields only with their means.
- Quantile probabilities may be left empty (no quantiles), and 0 and 1 are accepted.
- Display-only changes (which statistics are shown, the consistency column) no longer re-request or show "Computing".
- Backend errors are now shown (shared status banner). Fixed: weights misaligned with values when either was missing (500). Fixed: the notebook's consistency-correction section never rendered (it looked up `Std Dev (ddof=1)`; core emits `Std (ddof=1)`).

## Graphical
- Removed the confidence / prediction interval overlays and the bootstrap options (they belong to the Inference tab), plus the Run button: every setting updates the plot automatically.
- The normal overlay takes one **μ estimator** (any mean estimator, or the sample median) and one **σ estimator**, instead of the old "μ based on Mean-/Median-based CI" choice. Estimator names use the shared labels ("bias corrected" is gone from the display; the values sent to the backend are unchanged).
- The ECDF band is set with the significance level **α** (like every other tab) instead of a confidence level. Wire fields `conf_level`, `ecdf_conf_level`, `add_ci`, `add_pi`, `bootstrap_*`, `normal_mu_source`, `mean_estimator`, `median_estimator` are replaced by `alpha`, `mu_estimator`; the response no longer has `interval_bands` or `dist_used`.
- The empirical PMF is drawn as bars (like Common Distributions) instead of lollipops, and its CSV export has `value,count,probability` columns.
- Fixed: the "KDE is not drawn on the ECDF" warning appeared for an option that cannot be switched off from the ECDF view. Options that belong to another plot type are no longer sent, and the backend ignores them silently instead of warning.
- The notebook shows sample numbers, the normal-overlay estimates and the definition of what is plotted. The "Lesson", "Overlay estimates", "Awaiting Run" and "Notes" sections are gone; warnings appear with the plot.
- Colors come from the shared plot theme.

## Not done yet
Normality test banner on Inference (needs the professor's choice of test); the Hypothesis tab.
