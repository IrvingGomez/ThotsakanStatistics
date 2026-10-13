# Migration Plan: ThotsakanStatistics → React + FastAPI

This document tracks the phased migration from the professor's Gradio app (`ThotsakanStatistics/`, branch `main`) to the hybrid React frontend + FastAPI backend (branch `dev`). Its status table is the authoritative one; other documents summarize it.

## Status (2026-10-13)

| Feature | Frontend | Backend | Status |
|---|---|---|---|
| Home tab | Done | N/A | ✅ Complete |
| Data tab | Done — uploads to the backend and holds `sessionId` | Done — upload route + session store | ✅ Complete (open issues: session expiry not surfaced in the UI; CSV-only backend) |
| 12 common distributions | Done (provisional preview + API) | Done | ✅ Complete |
| Descriptive statistics | Done | Done | ✅ Complete (open issue: weights alignment) |
| Normal PDF / CI demo | Retired (panels and `useNormalPDF` deleted) | Route kept | Superseded by Graphical Analysis |
| Inference (CI / PI / regions) | Done | Done | ✅ Complete (open issue: weights alignment) |
| Graphical analysis | Done | Done | ✅ Complete |
| Hypothesis testing | Done | Done | ✅ Complete — 4 tests, plus α / critical values / verdict |
| Google sign-in (`@cmkl.ac.th`) | Done | Done | ✅ Complete (not in the original plan) |
| Docker images + GHCR workflow | — | — | ✅ Complete (not in the original plan) |
| Linear regression | Not started | Not started (`core/linear_regression/` empty) | 📋 Phase 5 — the only Gradio feature left |
| Custom distributions, approximations, i18n | Placeholders | Empty stubs | 📋 Phase 7 |

Open issues mentioned above are detailed in [`known_issues.md`](known_issues.md).

## Guiding Principles

1. **`core/` is sacred.** Copied from `ThotsakanStatistics/core/`; the professor verifies the math by reading it. Copied files stay byte-identical; new behavior goes in sibling modules.
2. **One feature at a time.** Each phase delivers a working feature end-to-end (API route → React hook → UI).
3. **Zero frontend math.** All authoritative computation runs in the Python backend. The single exception is the provisional preview in `frontend/src/math/` for the distributions sliders.
4. **Old code stays for reference.** `ThotsakanStatistics/` and `Try_reflex/` remain read-only (and git-ignored) until migration is complete.

---

## Phase 0: Backend Skeleton ✅

**Goal:** set up the FastAPI project, session store and dev tooling so later phases can focus on features.

- [x] `backend/` structure: `main.py`, `core/`, `services/`, `api/`, `sessions/`
- [x] Copy `ThotsakanStatistics/core/` → `backend/core/`
- [x] `sessions/store.py` — in-memory dict keyed by session ID, 30-minute TTL, cleanup every 5 minutes
- [x] `main.py` — FastAPI app with CORS (allow `localhost:5173`), `/api/health`
- [x] `api/routes/data.py` — `POST /api/data/upload` (accept CSV, store in session, return metadata)
- [x] `api/deps.py` — `get_session_data()` (looks up the dataset by the `x-session-id` header)
- [x] `requirements.txt` — fastapi, uvicorn, pandas, numpy, scipy, statsmodels, pingouin, matplotlib, seaborn, python-multipart
- [x] Vite proxy: `/api/*` → `http://localhost:8000` (overridable with `VITE_PROXY_TARGET`)
- [x] Root `package.json` with `concurrently`: `npm run dev` runs both servers
- [x] Smoke test: upload CSV from the Data tab → backend stores it → returns column info

Reference: `ThotsakanStatistics/core/data_stats.py`, `ThotsakanStatistics/state/app_state.py`.

---

## Phase 1: Descriptive Statistics ✅

**Goal:** replace the original Web Worker with a backend API call — the first end-to-end feature through the full stack.

- [x] `api/schemas/descriptive.py` — request (session, column, quantiles, trim / Winsor options, weights, filters) and response
- [x] `services/descriptive.py` — from `controllers/estimation/descriptive_controller.py` (Gradio `state` replaced by the session store)
- [x] `api/routes/descriptive.py` — `POST /api/descriptive/compute`
- [x] `frontend/src/api/descriptive.ts`
- [x] `useDescriptiveTabState` calls the API; the Web Worker and `workers/` folder were deleted
- [x] Results checked against the Gradio app

Reference: `ThotsakanStatistics/controllers/estimation/descriptive_controller.py`, `ThotsakanStatistics/core/estimation/descriptive.py`.

---

## Phase 2: Statistical Inference (CI / PI / Confidence Regions) ✅

**Goal:** port the most complex orchestration layer and validate the `services/` pattern for multi-step computations.

- [x] `services/inference.py` — from `controllers/estimation/inference_controller.py` (`calculate_intervals`, `calculate_regions`, distribution selection)
- [x] `api/schemas/inference.py`
- [x] `api/routes/inference.py` — `/api/inference/estimators`, `/ci`, `/pi`, `/regions`
- [x] React UI `features/estimation/inference/` — estimator selection, α, bootstrap options; intervals drawn over the data; CI/PI tables
- [x] `frontend/src/api/inference.ts`

Reference: `ThotsakanStatistics/controllers/estimation/inference_controller.py`, `ThotsakanStatistics/core/estimation/inference/`, `ThotsakanStatistics/ui/tabs/estimation/inference_tab.py`.

---

## Phase 3: Graphical Analysis ✅

**Goal:** histogram, empirical PMF and ECDF with overlays.

- [x] `services/graphical.py` — reuses `services/inference.py::calculate_intervals` for the CI/PI strip
- [x] `api/routes/graphical.py` — `POST /api/graphical/compute`, Plotly-ready JSON
- [x] `core/estimation/graphical_json.py` — JSON compute functions (α-aware DKW band, estimator-driven normal overlay, KDE, rug, interval bands, bin control)
- [x] React UI `features/estimation/graphical/` — histogram / empirical PMF / ECDF with KDE, rug, normal, DKW band, CI/PI strip
- [x] `frontend/src/api/graphical.ts`
- [x] `backend/tests/test_graphical_methods.py`, `test_graphical_edge_cases.py`, `tests/api/test_graphical.py`

### Note on matplotlib → Plotly
The professor's matplotlib functions (`plot_histogram_with_overlays`, `plot_ecdf`) stay byte-identical in `core/estimation/graphical_analysis.py`. The React path uses the parallel, JSON-serializable functions in the separate module `core/estimation/graphical_json.py`. The same "parallel data function" approach is used by `compute_histogram` / `compute_boxplot_data` in `descriptive.py` and `compute_confidence_regions_data` in `confidence_regions.py`.

### Normal PDF retirement
The `Estimation ▸ Graphical Analysis` sub-tab previously rendered the Normal PDF / CI demo. Graphical Analysis now owns that slot; the `NormalPDF*` React panels and `hooks/useNormalPDF.ts` were deleted. The backend `POST /api/probability/normal-pdf` route, `core/probability/common_distributions/normal_pdf.py` and the `api/probability.ts` wrapper are kept — verified math, no maintenance cost, available if the demo returns under the Probability tab.

Reference: `ThotsakanStatistics/controllers/estimation/graphical_controller.py`, `ThotsakanStatistics/core/estimation/graphical_analysis.py`, `ThotsakanStatistics/ui/tabs/estimation/graphical_tab.py`.

---

## Phase 4: Hypothesis Testing ✅

**Goal:** new React UI + backend API for all 4 test types.

- [x] `core/hypothesis_testing/rejection_region.py` — α, critical values, rejection region and p-value area as JSON
- [x] `core/hypothesis_testing/tables.py` — plot-free ANOVA (see the pingouin note)
- [x] `services/hypothesis.py` — from `controllers/hypothesis_controller.py`
- [x] `api/schemas/hypothesis.py` — one request/response pair, per-test fields optional
- [x] `api/routes/hypothesis.py` — `POST /api/hypothesis/test` (dispatches by test type)
- [x] React UI `features/hypothesis/`
  - `HypothesisControls.tsx` (+ `GroupBuilder.tsx`) — test type, μ₀, groups, alternative hypothesis, α slider
  - `HypothesisObservation.tsx` — null distribution, rejection region, statistic marker, p-value shading
  - `HypothesisNotebook.tsx` — hypotheses, verdict, group summary, raw result table
- [x] `frontend/src/api/hypothesis.ts`

### Test types implemented
1. One-sample Student's t-test
2. Two-sample Student's t-test (with Welch correction option)
3. Equal-variance tests (Bartlett / Levene)
4. One-way ANOVA (omnibus only)

There is no Tukey HSD: it does not exist anywhere in `ThotsakanStatistics/`.

### Divergences from the Gradio app
- **New:** a significance level, critical values and an explicit "Reject H₀ / Fail to reject H₀" verdict. The original reports only a statistic and a p-value.
- **New:** the p-value, verdict and raw table stay hidden until the student asks, so the rejection-region plot answers first ("Show, Don't Tell" in [`identity.md`](identity.md)).
- **Deferred:** the five matplotlib plots (bootstrap mean KDE, mirror plot, mean density, variance density, ANOVA per-group KDE). Keeping bootstrap out of the request path is what lets α be a live slider. When they return they need a seed — the original's `np.random.choice` is unseeded and so non-reproducible.
- **Scope:** dataset columns only. No manual summary-statistic entry, no simulated samples.

### pingouin version note
The professor's app pins `pingouin==0.5.5`; `requirements.txt` allows `pingouin>=0.5.4`, and current installs get 0.6.x, where result columns were renamed (`p-val` → `p_val`, `p-unc` → `p_unc`). `services/hypothesis.py` reads through a helper that accepts either spelling. One consequence is not cosmetic: `one_way_anova()` has no `include_graph` flag, always builds its figure, and that figure reads `p-unc` — so on pingouin ≥ 0.6 it raises `KeyError` before returning. That is why `core/hypothesis_testing/tables.py` exists. **The professor's Gradio app has the same bug on a modern pingouin.** `__init__.py` was not modified.

Reference: `ThotsakanStatistics/controllers/hypothesis_controller.py`, `ThotsakanStatistics/core/hypothesis_tests.py`, `ThotsakanStatistics/ui/tabs/hypothesis_testing_tab.py`.

---

## Phase 5: Linear Regression 📋 Not started

**Goal:** formula-based OLS with CI/PI bands and residual analysis — the most complex UI.

- [ ] Copy `ThotsakanStatistics/core/linear_regression.py` into `core/linear_regression/` (currently empty), byte-identical
- [ ] Plot-free / JSON functions in a sibling module (same approach as `graphical_json.py`)
- [ ] `services/regression.py` — from `controllers/linear_regression_controller.py`
- [ ] `api/schemas/regression.py`
- [ ] `api/routes/regression.py` — `POST /api/regression/fit`, registered behind `require_user`
- [ ] React UI `features/regression/`
  - `RegressionControls.tsx` — dependent / independent variables, formula input, confidence level, graph options
  - `RegressionObservation.tsx` — regression line + CI/PI bands, observed vs. predicted, residuals
  - `RegressionNotebook.tsx` — model summary, parameter table
- [ ] `frontend/src/api/regression.ts`
- [ ] Tests: core against statsmodels reference values, service, API

Open design question: the original plan used MathLive for the formula input, but MathLive is not installed; choose between a plain text formula field and adding the dependency.

Reference: `ThotsakanStatistics/controllers/linear_regression_controller.py`, `ThotsakanStatistics/core/linear_regression.py`, `ThotsakanStatistics/ui/tabs/linear_regression_tab.py`.

---

## Phase 6: Distribution Backend ✅

**Goal:** Python backend for all 12 distributions and the normal PDF, making the backend the only authoritative source.

- [x] `core/probability/common_distributions/distributions.py` — 12 distributions via scipy.stats (PDF/PMF, CDF, quantiles, moments)
- [x] `core/probability/common_distributions/normal_pdf.py` — normal PDF data for the CI visualization
- [x] `services/probability.py` — thin wrapper
- [x] `api/routes/probability.py` — `POST /api/probability/compute`, `POST /api/probability/normal-pdf`
- [x] `frontend/src/api/probability.ts`
- [x] `useDistribution` — calls `/api/probability/compute`; later given the provisional local preview (`src/math/`) so slider drags render instantly
- [x] `useNormalPDF` — built here, later deleted with the Normal PDF tab (see Phase 3)

`core/probability/` is a project addition — it does not exist in the professor's `core/`.

---

## Infrastructure (added outside the original phases) ✅

- [x] Google sign-in restricted to `@cmkl.ac.th`: `config.py`, `services/auth.py`, `api/routes/auth.py`, `api/deps.require_user`, `AuthContext`, `LoginGate`
- [x] Docker: `backend/Dockerfile`, `frontend/Dockerfile` (Vite build → nginx), `docker-compose.yml`, `docker-compose.dev.yml`, configurable `BASE_REGISTRY`
- [x] CI: `.github/workflows/docker.yml` — image builds, GHCR publishing on `dev`, compose smoke test

---

## Phase 7: Polish 📋

- [ ] Custom distribution builder (Probability tab)
- [ ] Distribution approximations (binomial → normal, CLT)
- [ ] Thai / English i18n
- [ ] Export improvements
- [ ] Performance profiling and optimization (Plotly bundle size)
- [ ] Tie dataset sessions to the signed-in user
- [x] Production deployment config — done as the Docker / nginx stack (FastAPI does not serve the frontend)
