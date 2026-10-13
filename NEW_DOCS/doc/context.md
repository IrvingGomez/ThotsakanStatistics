# Project Context: Thotsakan Statistics

High-level onboarding: what the project is, what exists today, how the pieces fit, and where to read next.

## 1) What this project is

**Thotsakan Statistics** is an interactive statistics laboratory for engineering education, built by **Himmapan Lab** for CMKL University students.

- Frontend: **React 19 + TypeScript 5.9 + Vite 7 + Tailwind CSS 4** (`frontend/`)
- Backend: **FastAPI + Python** (`backend/`)
- Original reference: the professor's **Gradio app** (`ThotsakanStatistics/`, read-only, git-ignored; its code is on the `main` branch)
- Access: Google sign-in restricted to verified `@cmkl.ac.th` accounts
- License: no license file yet (see [`known_issues.md`](known_issues.md))

Primary goals:
1. Let students and instructors run statistics workflows interactively.
2. Provide a structured codebase for student contributors.
3. Let the professor verify statistical correctness by reading Python `core/`.

Product vision: [`identity.md`](identity.md).

---

## 2) Current functional scope

| Tab | Sub-tab | State |
|---|---|---|
| Home | — | Landing page with navigation |
| Data | — | CSV upload (stored server-side), preview, column-type reclassification, category filters, display precision |
| Probability | Common Distributions | 12 distributions: PMF/PDF/CDF, probability queries, moments |
| Probability | Custom Distribution, Approximations | "Coming soon" placeholders; `core/probability/custom_distributions/` and `approximation/` are empty |
| Estimation | Descriptive Statistics | Quantiles, central tendency, dispersion, shape (weighted / trimmed / Winsorized variants); histogram and box plot |
| Estimation | Statistical Inference (default sub-tab) | CI / PI for mean, median and deviation (analytic + bootstrap), confidence regions |
| Estimation | Graphical Analysis | Histogram / empirical PMF / ECDF with KDE, rug, normal overlay, DKW band, CI/PI strip |
| Hypothesis | — | One-sample t, two-sample t (optional Welch), Bartlett / Levene, one-way ANOVA (omnibus only, no Tukey HSD); α, critical values, rejection region, verdict |
| Linear Regression | — | Not started ("coming soon" placeholder; `core/linear_regression/` is empty) |

The authoritative status table is in [`migration_plan.md`](migration_plan.md).

---

## 3) Architecture at a glance

```
React Frontend                           Python Backend
┌──────────────────┐                    ┌──────────────────┐
│  UI components   │ ──POST /api/... ─► │  api/routes/     │
│  Feature hooks   │ ◄──── JSON ─────── │  api/schemas/    │
│  (debounce,      │                    │       │          │
│   AbortController)│                   │  services/       │
│  api/ wrappers   │                    │       │          │
│                  │                    │  core/ (math)    │
└──────────────────┘                    └──────────────────┘
        session cookie + x-session-id header
```

### Dependency direction (backend)

`api/routes/ → services/ → core/`

- **core/** must not depend on services, api or sessions.
- Files copied from the professor's app stay byte-identical; additions live in sibling modules (`core/probability/`, `graphical_json.py`, `rejection_region.py`, `tables.py`).
- **services/** must not import numpy, scipy or statsmodels.
- Rounding is presentation-level; core keeps full numerical precision.

### The "Zero Frontend Math" pattern

All statistical computation runs in the Python backend. Hooks send a debounced API call (cancelling stale requests where the result is live) and show a loading state; the backend result is what gets rendered.

One exception: `frontend/src/math/` holds a hand-rolled, provisional-only preview for the 12-distributions sliders. It is marked `provisional: true`, never trusted, and always overwritten by the backend response.

Request lifecycle, sessions and endpoints in detail: [`frontend_backend_interaction.md`](frontend_backend_interaction.md). Folder-by-folder responsibilities: [`folder_duties.md`](folder_duties.md).

---

## 4) Key architectural rules (project doctrine)

- Keep dependency flow one-way: **API → Services → Core**.
- **Core must not depend on API / services / sessions.**
- **Rounding is presentation-level.**
- Estimator / strategy choices must be explicit (no silent overrides).
- Random procedures (bootstrap) must be reproducible (seed-aware).
- Datasets are held server-side in memory with TTL cleanup; never persisted or logged.

---

## 5) Runtime and dependencies

### Frontend (`frontend/`)
- React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4
- Plotly via `react-plotly.js` + `plotly.js-basic-dist-min` (lazy-loaded)
- `papaparse` (CSV preview parsing), `jspdf` (PDF export), `react-error-boundary`
- Vitest 4 + jsdom for tests
- No KaTeX / MathLive (not installed)

### Backend (`backend/`)
- FastAPI, uvicorn, python-multipart
- numpy, pandas, scipy, statsmodels, pingouin, matplotlib, seaborn
- Auth: google-auth, requests, PyJWT, python-dotenv
- Dev: pytest, httpx (`requirements-dev.txt`)

### Ways to run

| Mode | Command | URLs |
|---|---|---|
| Local, both | `npm run dev` (root, via `concurrently`) | frontend :5173, backend :8000 |
| Docker dev | `docker compose -f docker-compose.dev.yml up` | frontend :5173, backend host :8097 |
| Docker prod-style | `docker compose up --build` | http://localhost:8080 |

In development Vite proxies `/api/*` to the backend. In the production-style stack **nginx** serves the built React app and proxies `/api` to the backend container (same origin, so no CORS). FastAPI never serves the frontend.

Sign-in configuration: [`AUTH.md`](AUTH.md).

---

## 6) How data flows through the app

### Dataset lifecycle
1. The student picks a CSV in the Data tab.
2. The browser parses it locally (papaparse) for the preview, column types and filter UI, and also POSTs the file to `/api/data/upload`.
3. The backend parses it with pandas and stores the DataFrame in memory under a new session ID (UUID).
4. The frontend keeps the session ID in `DataContext`; later API calls send it as the `x-session-id` header — no repeated data transfer.
5. Active category filters are sent with each request and applied server-side.
6. Sessions expire after 30 minutes without access (cleanup every 5 minutes). The UI does not yet notice expiry — see [`known_issues.md`](known_issues.md).

### Computation flow
1. The student adjusts controls (or presses Run, depending on the tab).
2. After the debounce, any previous in-flight request is aborted and a new request is sent; the UI shows a loading state.
3. The route validates with Pydantic → calls the service → the service calls core.
4. Core returns full-precision results; the service maps them to the response schema.
5. React renders the result, rounding only for display.

---

## 7) Testing and quality posture

- **Backend:** pytest suite under `backend/tests/` — core methods, services and API tests (auth gate, descriptive, graphical, hypothesis). API tests run as a signed-in user via `tests/conftest.py`.
- **Frontend:** Vitest tests next to the code — DualInput, ExportMenu, LabBench, the feature hooks, the hypothesis observation, export helpers and the provisional math.
- **CI:** builds both Docker images and smoke-tests the compose stack. CI does not run pytest or Vitest; run them locally before every PR.
- No linter or formatter is configured.

---

## 8) Repository maturity snapshot

- All Gradio features except Linear Regression are migrated to React + FastAPI.
- Authentication, Docker images and the GHCR publishing workflow are in place.
- Open defects are tracked in [`known_issues.md`](known_issues.md).

---

## 9) Fast onboarding checklist

1. Read [`identity.md`](identity.md) (project philosophy).
2. Read [`migration_plan.md`](migration_plan.md) (status and what is left).
3. `cp .env.example .env` and configure sign-in ([`AUTH.md`](AUTH.md)), or set `AUTH_DISABLED=true` locally.
4. Frontend: `cd frontend && npm install && npm run dev`
5. Backend: `cd backend && pip install -r requirements.txt -r requirements-dev.txt && uvicorn main:app --reload`
6. Or both: `npm install && npm run dev` from the project root.
