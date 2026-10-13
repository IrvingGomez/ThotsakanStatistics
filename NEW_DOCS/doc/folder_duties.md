# Folder Duties

Quick reference: what each folder is responsible for and what it must NOT do. File lists reflect the repository as of 2026-10-13.

---

## Frontend (`frontend/src/`)

### `api/`
**Duty:** typed fetch wrappers that talk to the Python backend. One file per feature area; each file builds its own URLs and declares its own TS interfaces (there is no shared `client.ts` or `types.ts`).
**Must NOT:** compute statistics — only send requests and return typed responses.

| File | Talks to |
|------|----------|
| `descriptive.ts` | `POST /api/descriptive/compute` |
| `inference.ts` | `POST /api/inference/estimators`, `/ci`, `/pi`, `/regions` |
| `graphical.ts` | `POST /api/graphical/compute` |
| `hypothesis.ts` | `POST /api/hypothesis/test` |
| `probability.ts` | `POST /api/probability/compute`, `/normal-pdf` |

The upload call (`POST /api/data/upload`) lives in `context/DataContext.tsx`; auth calls live in `context/AuthContext.tsx`.

---

### `features/`
**Duty:** one sub-folder per product tab. Each LabBench tab owns three panel components:

| Component | Duty |
|-----------|------|
| `*Controls.tsx` | User inputs — sliders, dropdowns, DualInput |
| `*Observation.tsx` | Plotly chart(s) — the visual output |
| `*Notebook.tsx` | Numbers, verdicts, written explanation |

Most tabs also have a `*Tab.tsx` that exports `ControlsSlot` / `ObservationSlot` / `NotebookSlot` for `App.tsx`, and a private `use*TabState.ts` hook.

| Folder | Tab |
|--------|-----|
| `home/` | Landing page (full width, no LabBench) |
| `data/` | Upload, column-type reclassification, filters, preview, precision (full width, no LabBench) |
| `probability/common/` | 12 common distributions (state and hook wired in `App.tsx`; no `*Tab.tsx`) |
| `estimation/descriptive/` | Descriptive statistics tables, histogram, box plot |
| `estimation/inference/` | CI / PI / confidence regions drawn over the data |
| `estimation/graphical/` | Histogram / empirical PMF / ECDF with overlays (`graphicalState.ts` holds config logic) |
| `hypothesis/` | Four tests with rejection region and verdict (`GroupBuilder.tsx` for group selection) |

---

### `hooks/`
**Duty:** shared hooks. **Must NOT:** render JSX or compute statistics.

| Hook | Duty |
|------|------|
| `useDistribution.ts` | Distributions tab: provisional preview, then debounced `/api/probability/compute` |
| `useChartRegistry.ts` | Registers charts in an Observation panel for export |
| `useLocalStorageState.ts` | `useState` + `localStorage` with schema validation |
| `useResizablePanel.ts` | Drag-to-resize panel logic |
| `useSidebarKeyboard.ts` | `Ctrl/⌘+B` / `Ctrl/⌘+J` sidebar toggles |
| `useContainerBreakpoint.ts` | ResizeObserver breakpoint helper — currently unused |

Feature-specific hooks (`useDescriptiveTabState`, `useInferenceTabState`, `useGraphicalTabState`, `useHypothesisTabState`) live in their feature folders.

---

### `components/`
**Duty:** reusable UI pieces with no statistics.

| Component | Duty |
|-----------|------|
| `DualInput.tsx` | Slider + text field pair (400 ms text debounce, arrow-key stepping, clamping) |
| `ControlPrimitives.tsx` | Shared form pieces: `FieldShell`, `SelectField`, `TextField`, `SwitchField`, `RadioGroup`, `Accordion`, `AnalysisActions` |
| `AnalysisStatus.tsx` | Shared computing / error (with Retry) / settings-changed status |
| `ResultToolbar.tsx` | Results header with the export menu |
| `ExportMenu.tsx` | CSV / PNG / PDF export menu |
| `DragHandle.tsx` | Drag target between resizable panels |
| `CollapsedRail.tsx` | Strip shown when a side panel is collapsed |
| `LoginGate.tsx` | Google sign-in screen shown until the user is authenticated |

---

### `context/`
**Duty:** global state shared across tabs.

| File | Duty |
|------|------|
| `DataContext.tsx` | `useReducer` store — parsed dataset, `sessionId`, column classifications, filters, display precision; performs the upload |
| `AuthContext.tsx` | Current user, sign-in/out, returns to login on `401` |

---

### `layout/`
**Duty:** page skeleton around every tab.

| File | Duty |
|------|------|
| `LabBench.tsx` | 3-panel layout with resize, collapse, persistence; stacks below 1200 px |
| `LogoBar.tsx` | Logos, signed-in user, sign-out, "Auth disabled (dev)" badge |
| `Header.tsx` | Main tab navigation |
| `SubHeader.tsx` | Sub-tab ribbon (Probability, Estimation) |
| `Footer.tsx` | Status bar (current view, version) |

---

### `math/`
**Duty:** `localDistributions.ts` — provisional-only distribution preview for slider drags. Output is marked `provisional: true` and always replaced by the backend result. **Must NOT** be used for any other tab or shown as authoritative.

---

### `utils/`
**Duty:** pure helpers with no React dependency.

| File | Duty |
|------|------|
| `parseFile.ts` | CSV/TSV → rows for the local preview; column type detection |
| `exportCSV.ts` | Serialise tables to a `.csv` download |
| `exportPNG.ts` | Capture a Plotly chart as PNG |
| `exportPDF.ts` | Build a PDF report (jsPDF) |
| `exportFilename.ts` | Consistent export file names |

---

## Backend (`backend/`)

### `core/`
**Duty:** pure statistical math — no HTTP, no sessions, no services. Files copied from the professor's app stay byte-identical so every calculation can be verified; additions live in sibling modules.
**Must NOT:** import anything from `services/`, `api/` or `sessions/`.

| File / Folder | Duty |
|---|---|
| `data_stats.py` | Legacy Gradio data helpers (imports `gradio`, which is not installed; not used by the API) |
| `probability/common_distributions/distributions.py` | 12 distributions via scipy.stats *(project addition)* |
| `probability/common_distributions/normal_pdf.py` | Normal PDF + CI shading data *(project addition)* |
| `probability/custom_distributions/`, `probability/approximation/` | Empty stubs |
| `estimation/descriptive.py` | Descriptive measures + `compute_histogram`, `compute_boxplot_data` |
| `estimation/graphical_analysis.py` | Professor's matplotlib histogram/ECDF functions (byte-identical) |
| `estimation/graphical_json.py` | JSON path for the API: histogram, PMF, ECDF + DKW band, KDE, rug, normal density, interval bands *(project addition)* |
| `estimation/inference/ci.py`, `ci_mean.py`, `ci_median.py`, `ci_deviation.py` | Confidence intervals |
| `estimation/inference/pi.py`, `pi_mean.py`, `pi_median.py`, `pi_iqr.py`, `pi_bootstrap.py` | Prediction intervals |
| `estimation/inference/estimators.py`, `estimator_options.py` | Point estimators and the valid choices |
| `estimation/inference/likelihood.py`, `confidence_regions.py` | Likelihood and joint confidence regions (+ `compute_confidence_regions_data`) |
| `hypothesis_testing/__init__.py` | Professor's tests: one-sample t, two-sample t, variance tests, one-way ANOVA (byte-identical — never edit) |
| `hypothesis_testing/rejection_region.py` | α, critical values, rejection region, p-value area *(project addition)* |
| `hypothesis_testing/tables.py` | Plot-free ANOVA table *(project addition)* |
| `linear_regression/` | Empty — not started |

---

### `services/`
**Duty:** orchestration — validate inputs, pick the right `core/` function(s), compose and map responses.
**Must NOT:** import numpy / scipy / statsmodels, define routes, or do math.

| File | Duty |
|------|------|
| `auth.py` | Verify Google ID tokens, issue and read session JWTs |
| `descriptive.py` | Filters, NaN handling, weights → `core/estimation/descriptive.py` |
| `inference.py` | Picks distribution and estimators; composes CI, PI and regions |
| `graphical.py` | Builds graph data via `graphical_json.py`; reuses `services/inference.py` for CI/PI bands |
| `hypothesis.py` | Dispatches the four tests, materialises groups, adds rejection region |
| `probability.py` | Thin wrapper over `core/probability/` |

---

### `api/`
**Duty:** HTTP boundary — routes, Pydantic schemas, shared dependencies.
**Must NOT:** contain statistical logic.

| File | Duty |
|------|------|
| `routes/auth.py` | `GET /api/auth/config`, `POST /api/auth/google`, `GET /api/auth/me`, `POST /api/auth/logout` |
| `routes/data.py` | `POST /api/data/upload` |
| `routes/descriptive.py` | `POST /api/descriptive/compute` |
| `routes/inference.py` | `POST /api/inference/estimators`, `/ci`, `/pi`, `/regions` |
| `routes/graphical.py` | `POST /api/graphical/compute` |
| `routes/hypothesis.py` | `POST /api/hypothesis/test` |
| `routes/probability.py` | `POST /api/probability/compute`, `/normal-pdf` |
| `schemas/*.py` | Request/response models for descriptive, inference, graphical, hypothesis, probability |
| `deps.py` | `require_user` (auth gate), `get_session_data` (`x-session-id` → DataFrame), `apply_filters` |

---

### `sessions/`
**Duty:** in-memory dataset store. Datasets are held server-side, keyed by session ID; the frontend only holds the key.

| File | Duty |
|------|------|
| `store.py` | `dict[session_id → {data, last_accessed}]`, 30-minute TTL; `clean_expired_sessions()` is called every 5 minutes by `main.py` |

---

### `tests/`
**Duty:** automated tests (pytest, `testpaths = tests`).

| Location | Duty |
|----------|------|
| `tests/test_*.py` | Core and service tests (inference, graphical, hypothesis, ANOVA table, rejection region, smoke) |
| `tests/services/` | Service-layer unit tests (descriptive) |
| `tests/api/` | FastAPI route tests (auth, descriptive, graphical, hypothesis) |
| `tests/conftest.py` | Signs API tests in as a test user |

---

### Top-level backend files

| File | Duty |
|------|------|
| `main.py` | Create the app, CORS for `localhost:5173`, mount routers (all but auth behind `require_user`), session cleanup loop, `/api/health` |
| `config.py` | Settings from environment / root `.env`; refuses to start if auth is misconfigured |
| `requirements.txt`, `requirements-dev.txt` | Runtime and test dependencies |
| `pytest.ini` | Test discovery |
| `Dockerfile`, `dev-start.sh` | Production image; dev-container start script |

---

## Dependency Rules (summary)

```
React components
  └── hooks / context
        └── src/api/ (HTTP)
              └── api/routes/  (+ api/deps, api/schemas)
                    └── services/  (+ api/schemas for response models)
                          └── core/   ← math lives here; nothing in core imports upward
```

- `core/` has no upstream dependencies inside the project.
- `services/` imports from `core/`, `api/schemas/`, and (for graphical) `services/inference.py`.
- `api/routes/` imports from `services/`, `api/schemas/`, `api/deps.py` and `sessions/`.
- The frontend calls the backend over HTTP only.
