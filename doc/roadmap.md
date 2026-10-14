# Roadmap and Known Issues

The migration from the professor's Gradio app (`ThotsakanStatistics/`, branch `main`) to React + FastAPI (branch `dev`), the work that's left, and open defects. **This status table is the authoritative one.** Checked on 2026-10-13.

## Status

| Feature | Status |
|---|---|
| Home, Data (upload → backend session) | ✅ Complete |
| Probability ▸ 12 common distributions | ✅ Complete (provisional preview + API) |
| Estimation ▸ Descriptive statistics | ✅ Complete |
| Estimation ▸ Inference (CI / PI / confidence regions) | ✅ Complete |
| Estimation ▸ Graphical analysis | ✅ Complete; replaced the Normal PDF / CI demo |
| Hypothesis testing | ✅ Complete: one-sample t, two-sample t (Welch option), Bartlett/Levene, one-way ANOVA; α, critical values, verdict |
| Google sign-in, Docker images, GHCR workflow | ✅ Complete (added outside the original plan) |
| **Linear regression** | 📋 Not started. The only Gradio feature left |
| Custom distributions, approximations, Thai/English i18n | 📋 Placeholders / empty stubs |

## Remaining work

### Linear regression

Formula-based OLS with CI/PI bands and residual analysis.

- [ ] Copy `ThotsakanStatistics/core/linear_regression.py` into `core/linear_regression/`, byte-identical. Put JSON/plot-free functions in a sibling module, as with `graphical_json.py`.
- [ ] `services/regression.py` (from `controllers/linear_regression_controller.py`), `api/schemas/regression.py`, `api/routes/regression.py` (`POST /api/regression/fit`, behind `require_user`)
- [ ] `features/regression/`: Controls (variables, formula, confidence level), Observation (fit + bands, observed vs predicted, residuals), Notebook (model summary, parameter table); `src/api/regression.ts`
- [ ] Tests: core against statsmodels reference values, service, API
- **Open question:** the formula input. MathLive was planned but isn't installed. Use a plain text field, or add the dependency?

### Polish

- [ ] Custom distribution builder; approximations (binomial → normal, CLT)
- [ ] Thai / English i18n
- [ ] Export improvements; Plotly bundle profiling
- [ ] Tie dataset sessions to the signed-in user

## Migration notes

Decisions that aren't obvious from the code:

- **Parallel JSON functions.** The professor's matplotlib functions stay byte-identical. The API uses parallel JSON-serializable versions: `graphical_json.py`, `compute_histogram` / `compute_boxplot_data` in `descriptive.py`, and `compute_confidence_regions_data` in `confidence_regions.py`.
- **Normal PDF demo retired.** Graphical Analysis took over its slot, and the React panels and `useNormalPDF` were deleted. The backend route, `normal_pdf.py` and `api/probability.ts` were kept: the math is verified and could come back under Probability.
- **Hypothesis testing differs from Gradio.** It adds α, critical values and an explicit verdict, and hides the p-value until the student asks. The five matplotlib plots (bootstrap KDE, mirror, mean/variance density, ANOVA KDE) are deferred: keeping bootstrap out of the request path is what lets α be a live slider, and the original's `np.random.choice` isn't seeded. Only dataset columns are supported; there's no manual summary-statistic entry. Tukey HSD doesn't exist in the original.
- **pingouin ≥ 0.6** renamed result columns (`p-unc` → `p_unc`). `services/hypothesis.py` accepts both spellings. The professor's `one_way_anova()` always builds a figure that reads `p-unc`, so on a modern pingouin it raises `KeyError`, and the Gradio app has the same bug. `core/hypothesis_testing/tables.py` exists to work around this; `__init__.py` is unmodified.
- `core/probability/` is a project addition; the professor's `core/` doesn't have it.

## Known issues

When you fix one, delete it here and add a dated note under `changelogs/`.

| # | Issue | Evidence | Fix direction |
|---|---|---|---|
| 1 | **Weighted analyses can misalign weights** when values are missing | `services/descriptive.py:60-61` and `api/routes/inference.py` drop NaNs from the data and the weights separately | Build one filtered frame and drop rows missing either value. Test the cases: data missing, weights missing, both. Moving the data prep out of the inference route (it breaks the thin-route rule) fixes both |
| 2 | Dataset session expiry isn't shown in the UI | 30-min TTL in `sessions/store.py`; the Data tab keeps showing the local table, then every analysis fails with 404 | Detect 404 and prompt for re-upload |
| 3 | Upload formats disagree | `DataTab.tsx` accepts `.csv,.tsv,.txt`; `routes/data.py` accepts only `.csv` with a comma delimiter | Align both sides |
| 4 | Dataset sessions aren't tied to the user | `get_session_data` checks only the header | Store the owner with the session |
| 5 | `LabBench` calls `setState` during render | Width sync in the render body of `layout/LabBench.tsx` | Move it into an effect |
| 6 | Descriptive tab never shows backend errors | `App.tsx` passes no `error` to the Descriptive slots | Use `AnalysisStatus` like the other tabs |
| 7 | Leftover KaTeX/MathLive declarations | `react-plotly.d.ts`, `custom-elements.d.ts`; packages not installed | Delete them |
| 8 | Unused `useContainerBreakpoint` hook | LabBench uses `matchMedia('(max-width: 1199px)')` | Delete it |
| 9 | `core/data_stats.py` imports `gradio` | Not installed; module unused | Leave it (legacy copy) or remove it |
| 10 | CI doesn't run tests | `docker.yml` only smoke-tests `/` and `/api/health` | Add pytest + Vitest jobs |
| 11 | No route tests for upload, inference, probability | `backend/tests/api/` covers auth, descriptive, graphical, hypothesis only | Add them |
| 12 | Frontend test status not re-verified | The 2026-10-06 changelog reported 2 failing `LabBench.test.tsx` tests | Re-run `npm run test` |
| 13 | No license file | Older docs disagreed (MIT vs "contact maintainers") | Maintainer decision |

Issues 1, 3, 5, 6 and 9 were first reported in the 2026-04-22 code review. Its other findings have been fixed, and the original report is in git history.
