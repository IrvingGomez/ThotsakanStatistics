# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. Coding standards, layering rules and the commit/PR process are in [`CONTRIBUTING.md`](CONTRIBUTING.md); this file covers structure and commands.

## Project Overview

**Thotsakan Statistics** — an interactive statistics laboratory for Thai engineering students. Philosophy: "Stop Calculating. Start Simulating." — students manipulate variables and observe behavior rather than applying formulas.

**Hybrid architecture:** React/TypeScript frontend (`frontend/`) + Python/FastAPI backend (`backend/`). The frontend handles UI, interactivity and visual feedback; the backend is the authoritative source for all statistical computation (scipy, statsmodels, pingouin). The professor verifies the Python `core/` math directly.

Git: work happens on the `dev` branch (remote `origin` = github.com/IrvingGomez/ThotsakanStatistics). `main` holds the original Gradio app.

### Repository Layout

```
.
├── frontend/              # React + Vite + TypeScript (UI layer)
├── backend/               # FastAPI + Python (computation layer)
│   ├── core/              # Pure math (professor-verified)
│   ├── services/          # Orchestration
│   ├── api/               # FastAPI routes + Pydantic schemas + deps
│   ├── sessions/          # In-memory dataset store with TTL
│   ├── tests/             # pytest suite
│   ├── config.py          # Settings from the root .env
│   └── main.py            # App, CORS, router mounting, session cleanup loop
├── doc/                   # Design, architecture and setup docs
├── changelogs/            # Dated change notes
├── docker-compose.yml     # Production-style stack (nginx + backend, :8080)
├── docker-compose.dev.yml # Hot-reload dev stack (:5173, backend on host :8097)
├── .github/workflows/     # docker.yml — builds/pushes images to GHCR
├── .env.example           # Template for the git-ignored root .env
└── package.json           # Root: `npm run dev` runs both servers (concurrently)
```

`ThotsakanStatistics/` (original Gradio app) and `Try_reflex/` (Reflex prototype) may exist locally as **read-only** references. They are git-ignored. Never modify them.

## Commands

### Frontend (from `frontend/`)

```bash
npm run dev        # Vite dev server (:5173), proxies /api → VITE_PROXY_TARGET or http://localhost:8000
npm run build      # tsc (type check) + vite build (production)
npm run preview    # Preview production build
npm run test       # Vitest (run once)
npm run test:ui    # Vitest interactive UI
```

### Backend (from `backend/`)

```bash
pip install -r requirements.txt -r requirements-dev.txt   # runtime + pytest/httpx
uvicorn main:app --reload         # FastAPI dev server (:8000)
pytest                            # testpaths = tests (pytest.ini)
```

The backend refuses to start unless `GOOGLE_CLIENT_ID` and `AUTH_SECRET_KEY` (≥ 32 chars) are set in the root `.env`, or `AUTH_DISABLED=true` (local dev only).

### Both (from project root)

```bash
npm install && npm run dev        # frontend + backend via concurrently
```

### Docker (from project root)

```bash
docker compose up --build                       # prod-style: http://localhost:8080 (nginx proxies /api → backend)
docker compose -f docker-compose.dev.yml up     # dev with hot reload: frontend :5173, backend host :8097
```

`backend/Dockerfile` (Python 3.12) and `frontend/Dockerfile` (multi-stage: Node 22 Vite build → nginx 1.27) build the two images; base images come from `BASE_REGISTRY` (default `mirror.gcr.io/library`). `frontend/nginx.conf.template` proxies `/api` to `BACKEND_URL` (default `http://backend:8000`). The backend must run a **single uvicorn worker** because sessions are in memory. The dev stack runs `backend/dev-start.sh` and keeps pip/npm installs and a copy of every uploaded CSV (`UPLOAD_DUMP_DIR`) in the git-ignored `dev-playground/`.

`.github/workflows/docker.yml` builds both images on pushes to `dev` (and pushes them to GHCR with tags `dev` and `sha-<commit>`), on PRs targeting `dev` that touch `backend/`, `frontend/`, the compose files or the workflow (build only), and on manual dispatch. It then smoke-tests the compose stack with `AUTH_DISABLED=true`.

No linting or formatting is configured (no ESLint/Prettier, no ruff).

## Architecture

The full architecture write-up (data flow, folder duties, endpoint table) starts at [`doc/context.md`](doc/context.md). Essentials:

### Zero Frontend Math

All statistical computation runs in the Python backend. Hooks call API endpoints; the frontend renders results.

```
User drags slider
  → 250 ms debounce fires
  → previous in-flight request aborted (AbortController)
  → POST /api/... to Python backend
  → Python returns result
  → React renders authoritative result
```

One exception: `frontend/src/math/` holds a hand-rolled, provisional-only preview used by the 12-distributions tab (`useDistribution`) so slider drags render instantly. Its output is marked `provisional: true` and is always overwritten by the debounced backend call. `core/` remains the only verified math.

How each tab triggers computation:

| Tab | Hook | Trigger |
|---|---|---|
| Common Distributions | `hooks/useDistribution.ts` | Live: provisional preview, then 250 ms debounce + abort |
| Descriptive | `features/estimation/descriptive/useDescriptiveTabState.ts` | Controls submit (Run / Reset), sent after 250 ms debounce + abort |
| Statistical Inference | `features/estimation/inference/useInferenceTabState.ts` | Explicit Run button |
| Graphical Analysis | `features/estimation/graphical/useGraphicalTabState.ts` | Live 250 ms debounce + abort for display toggles; explicit `run()` for estimator/bootstrap overlays |
| Hypothesis Testing | `features/hypothesis/useHypothesisTabState.ts` | Explicit Run, then 250 ms debounced re-runs on later changes |

### Backend

**Request flow:** `React hook → POST /api/... → api/routes/ → services/ → core/ → JSON response`

```
backend/
├── core/
│   ├── data_stats.py              # Legacy Gradio helper (imports gradio; unused by the API)
│   ├── probability/
│   │   ├── common_distributions/  # distributions.py (12 dists), normal_pdf.py
│   │   ├── custom_distributions/  # empty stub
│   │   └── approximation/         # empty stub
│   ├── estimation/
│   │   ├── descriptive.py         # + compute_histogram, compute_boxplot_data
│   │   ├── graphical_analysis.py  # matplotlib version, byte-identical to the professor's file
│   │   ├── graphical_json.py      # JSON/Plotly path: histogram, PMF, ECDF+DKW, KDE, rug, normal, bands
│   │   └── inference/             # ci.py, ci_*.py, pi.py, pi_*.py, estimators.py, estimator_options.py,
│   │                              #   likelihood.py, confidence_regions.py (+ compute_confidence_regions_data)
│   ├── hypothesis_testing/
│   │   ├── __init__.py            # byte-identical to the professor's hypothesis_tests.py — never edit
│   │   ├── rejection_region.py    # α, critical values, rejection region, p-value area as JSON
│   │   └── tables.py              # plot-free ANOVA (pingouin ≥ 0.6 workaround)
│   └── linear_regression/         # empty — not started
├── services/                      # auth, descriptive, graphical, hypothesis, inference, probability
├── api/
│   ├── routes/                    # auth, data, descriptive, graphical, hypothesis, inference, probability
│   ├── schemas/                   # descriptive, graphical, hypothesis, inference, probability
│   └── deps.py                    # require_user, get_session_data (x-session-id), apply_filters
├── sessions/store.py              # dict + 30-min TTL; cleanup loop every 5 min (main.py lifespan)
├── config.py                      # Settings from env / root .env
└── main.py
```

**Auth:** every `/api` route except `/api/health` and `/api/auth/*` is gated by `api/deps.require_user` (signed HttpOnly session cookie issued after verifying a Google ID token; only `@AUTH_ALLOWED_DOMAIN`). Config comes from the root `.env` (`.env.example`, `backend/config.py`). Frontend: `AuthContext` + `LoginGate` wrap the app in `main.tsx`. Backend tests bypass the gate via `tests/conftest.py`. Setup guide: [`doc/AUTH.md`](doc/AUTH.md).

**Key rules:**
- `core/` must NOT depend on services, api or sessions.
- Files copied from the professor's app stay byte-identical; additions go in sibling modules.
- `services/` must NOT import numpy, scipy or statsmodels (pandas and `api.schemas` are used) — validate, call core, map schema only.
- Rounding is presentation-level — core keeps full numerical precision.
- Datasets are held server-side in memory, keyed by session ID (`x-session-id` header) with TTL cleanup.

### Frontend

#### The 3-Panel "LabBench" Pattern

Every analysis tab slots three components into `src/layout/LabBench.tsx`. Home and Data are full-width pages without LabBench.

```
┌────────────────────────────────────────────┐
│  LogoBar + Header (tabs) + SubHeader       │
├──────────────┬──────────────┬──────────────┤
│  *Controls   │ *Observation │  *Notebook   │
│  (280 px,    │  (flex-grow) │  (320 px,    │
│  200–400)    │  Plotly      │  240–480)    │
├──────────────┴──────────────┴──────────────┤
│  Footer (status bar)                       │
└────────────────────────────────────────────┘
```

Side panels are resizable (drag handles; arrow keys ±16 px and Enter to collapse on a focused handle), collapsible (`Ctrl/⌘+B` left, `Ctrl/⌘+J` right) and persist widths + collapsed state to `localStorage` key `thotsakan-sidebar-state`. Below a 1200 px viewport the panels stack vertically and the shortcuts are disabled.

#### Feature Organization

```
src/
├── api/              # descriptive, graphical, hypothesis, inference, probability (.ts)
│                     #   no shared client.ts/types.ts: each file builds its own URLs and TS interfaces
├── features/
│   ├── home/                     # HomeTab (full width)
│   ├── data/                     # DataTab (full width): upload, column types, filters, precision
│   ├── probability/common/       # CommonDist{Controls,Observation,Notebook}
│   ├── estimation/
│   │   ├── descriptive/          # Descriptive* + DescriptiveTab + useDescriptiveTabState
│   │   ├── inference/            # Inference* + InferenceTab + useInferenceTabState
│   │   └── graphical/            # Graphical* + GraphicalTab + graphicalState + useGraphicalTabState
│   └── hypothesis/               # Hypothesis* + GroupBuilder + HypothesisTab + useHypothesisTabState
├── hooks/            # useDistribution, useChartRegistry, useLocalStorageState, useResizablePanel,
│                     #   useSidebarKeyboard, useContainerBreakpoint (currently unused)
├── components/       # AnalysisStatus, CollapsedRail, ControlPrimitives, DragHandle, DualInput,
│                     #   ExportMenu, LoginGate, ResultToolbar
├── context/          # AuthContext, DataContext
├── layout/           # LabBench, Header, SubHeader, LogoBar, Footer
├── math/             # localDistributions.ts — provisional preview only
└── utils/            # parseFile, exportCSV, exportPNG, exportPDF, exportFilename
```

Feature files follow `*Controls.tsx`, `*Observation.tsx`, `*Notebook.tsx`. Except Common Distributions (wired directly), each tab has a `*Tab.tsx` exporting `ControlsSlot` / `ObservationSlot` / `NotebookSlot`; `App.tsx` lazy-loads them and passes them to `LabBench`.

#### State Management

- **Global:** `DataContext` (`useReducer`) — parsed dataset, backend `sessionId`, filters, column classifications, display precision (default 4). Access via `useData()`. `AuthContext` — signed-in user; a `401` from any data call returns to the login screen.
- **Feature-local:** one hook per tab (table above), exposing `{ result, isLoading | isComputing, error }`.
- **UI persistence:** `useLocalStorageState` wraps `useState` with schema validation on load.

#### DualInput

`src/components/DualInput.tsx` is used for numeric parameters: slider commits immediately; text commits after 400 ms or on blur/Enter; arrow keys step; values are clamped and rounded to the step precision.

#### Visualization

Plotly (`react-plotly.js` + `plotly.js-basic-dist-min`) charts are lazy-loaded with `React.lazy` + `Suspense`. Manual chunks: `react-vendor`, `plotly-vendor`. Chunk size warning threshold: 1600 KB. Styling uses Tailwind CSS 4.

KaTeX and MathLive are **not installed** (only leftover type declarations in `react-plotly.d.ts` and `custom-elements.d.ts`). Adding them needs approval like any new dependency.

## Performance Targets

| Interaction | Target |
|---|---|
| Slider → debounce fires | ~250 ms after last move |
| Backend result (distributions, PDF) | < 500 ms typical, < 2 s with bootstrap |
| Tab switch | < 200 ms (lazy loaded) |
| Initial page load | < 2 s |

## Status

Every feature is migrated except **Linear regression** (`core/linear_regression/` is empty; no service, route or UI). The authoritative status table and phase history are in [`doc/migration_plan.md`](doc/migration_plan.md); open defects are in [`doc/known_issues.md`](doc/known_issues.md).

## Documentation

All docs are listed in [`doc/README.md`](doc/README.md).
