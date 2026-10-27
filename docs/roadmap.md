# Roadmap and Known Issues

Feature status, the backlog after v1, and open defects. **This status table is the authoritative one.**
Checked on 2026-10-27, on branch `irving-reviewing-experiment`. v1 (deploy 4 November 2026) and its remaining
steps are in [`plans/2026-10-23-v1-release.md`](plans/2026-10-23-v1-release.md); decisions are in
[`decisions.md`](decisions.md).

## Status

| Feature | Status |
|---|---|
| Home, Data (CSV upload → backend session, three example datasets) | ✅ Complete |
| Probability ▸ 12 common distributions: PMF / PDF with the area of a one-sided or interval query | ✅ Complete (provisional preview + API) |
| Statistics ▸ Descriptive statistics | ✅ Complete |
| Statistics ▸ Inference (CI / PI / confidence regions) | ✅ Complete |
| Statistics ▸ Graphical analysis | ✅ Complete |
| Hypothesis testing | 🔧 Works (one-sample t, two-sample t with Welch option, Bartlett/Levene, one-way ANOVA; α, critical values, rejection region) but needs a deep rework, second after v1. Not part of the v1 consistency work |
| Google sign-in, Docker images, GHCR workflow | ✅ Complete |
| **Linear regression** | 📋 Planned, third after v1. The only Gradio feature left |
| Custom distributions, approximations, Thai/English i18n | 📋 Placeholders / empty stubs |

## After v1 (backlog)

The first three are in the order Irving set (2026-10-27); the rest are not yet ordered.

1. **Goodness-of-fit test for the normal distribution** (Irving, 2026-10-24; first item after v1). Several
   results assume the data are normal (e.g. the z / t and χ² intervals and the median under normality in
   Inference), so show the result of a normality goodness-of-fit test at the top of the left panel, as evidence
   of whether assuming normality is reasonable. The normal model is already orange for this. To brainstorm with
   Irving: which test(s), which tabs show it, and what the user reads there. No normality test exists in the
   backend today.
2. **Hypothesis Testing: a deep rework** (Irving, 2026-10-27), to bring it in line with the other tabs and
   the interaction contract. Known items: stop sending the unused "Reject H₀" verdict; group pre-fill could
   skip categories with fewer than 2 values.
3. **Linear regression** (below).
4. **Classify variables** (continuous, discrete, ordinal, nominal, text, …) instead of guessing from the values.
   Then: width-1 bars from the classification, and the "View histogram data" table back for discrete variables.
5. **Data tab:** Excel and SPSS `.sav` upload, with the server reading every format. For large datasets: a
   searchable, scrollable column-type list with bulk reclassify; pagination or virtual scrolling in the
   preview with a sticky header; a progress bar while parsing; `1,450,239`-style numbers in the summary.
6. **Backend tidy-up:** unused `core/data_stats.py`, empty folders, the Normal PDF endpoint with no screen;
   keep the professor's verified files unchanged.
7. **Small UI items:** Graphical Reset blanks the plot until the defaults arrive (Descriptive keeps the old
   result meanwhile); emoji in the tab names and in two placeholders (rule 16 covers states; decide whether it
   covers navigation); code-split the 1.6 MB Plotly chunk to speed up the first load.
8. **Later:** custom distribution builder; approximations (binomial → normal, CLT); Thai / English text;
   export improvements; tie dataset sessions to the signed-in user; the guided-teaching layer described in
   [`design.md`](design.md).

### Linear regression

Formula-based OLS with CI/PI bands and residual analysis.

- [ ] Copy `ThotsakanStatistics/core/linear_regression.py` into `core/linear_regression/`, byte-identical. Put JSON/plot-free functions in a sibling module, as with `graphical_json.py`.
- [ ] `services/regression.py` (from `controllers/linear_regression_controller.py`), `api/schemas/regression.py`, `api/routes/regression.py` (`POST /api/regression/fit`, behind `require_user`)
- [ ] `features/regression/`: left panel (variables, formula, α), center (fit + bands, observed vs predicted, residuals), right panel (model formulas, then values); `src/api/regression.ts`. Follows the [interaction contract](interaction_contract.md).
- [ ] Tests: core against statsmodels reference values, service, API
- **Open question:** the formula input. MathLive isn't installed. Use a plain text field, or add the dependency?

## Migration notes

Decisions that aren't obvious from the code:

- **Parallel JSON functions.** The professor's matplotlib functions stay byte-identical. The API uses parallel JSON-serializable versions: `graphical_json.py`, `compute_histogram` / `compute_boxplot_data` in `descriptive.py`, and `compute_confidence_regions_data` in `confidence_regions.py`.
- **Normal PDF demo retired.** Graphical Analysis took over its slot, and the React panels and `useNormalPDF` were deleted. The backend route, `normal_pdf.py` and `api/probability.ts` were kept: the math is verified and could come back under Probability.
- **Hypothesis testing differs from Gradio.** It adds α, critical values and the rejection region, and shows the p-value at once; it prints no verdict. The five matplotlib plots (bootstrap KDE, mirror, mean/variance density, ANOVA KDE) are deferred: keeping bootstrap out of the request path is what lets α be a live slider, and the original's `np.random.choice` isn't seeded. Only dataset columns are supported; there's no manual summary-statistic entry. Tukey HSD doesn't exist in the original.
- **pingouin ≥ 0.6** renamed result columns (`p-unc` → `p_unc`). `services/hypothesis.py` accepts both spellings. The professor's `one_way_anova()` always builds a figure that reads `p-unc`, so on a modern pingouin it raises `KeyError`, and the Gradio app has the same bug. `core/hypothesis_testing/tables.py` exists to work around this; `__init__.py` is unmodified.
- `core/probability/` is a project addition; the professor's `core/` doesn't have it.

## Known issues

When you fix one, delete it here and add a dated note under `changelogs/`.

| # | Issue | Evidence | Fix direction |
|---|---|---|---|
| 2 | Dataset session expiry isn't shown in the UI | 30-min TTL in `sessions/store.py`; the Data tab keeps showing the local table, then every analysis fails with 404 | Detect 404 and prompt for re-upload |
| 4 | Dataset sessions aren't tied to the user | `get_session_data` checks only the header | Store the owner with the session |
| 7 | Leftover MathLive declaration | `frontend/src/custom-elements.d.ts`; package not installed | Delete it |
| 9 | `core/data_stats.py` imports `gradio` | Not installed; module unused | Leave it (legacy copy) or remove it |
| 10 | CI doesn't run tests | `docker.yml` only smoke-tests `/` and `/api/health` | Add pytest + Vitest jobs (v1 plan E2) |
| 13 | No license file | Older docs disagreed (MIT vs "contact maintainers") | Maintainer decision |

Fixed on this branch (2026-10-19 to 10-27): 1 weights misaligned with missing values, 3 upload formats disagreed,
5 `LabBench` `setState` during render, 8 unused `useContainerBreakpoint`, 11 missing route tests, 12 frontend
tests not re-verified (all pass).
