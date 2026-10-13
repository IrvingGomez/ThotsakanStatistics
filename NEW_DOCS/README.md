<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/FastAPI-0.111+-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
</p>

# ทศกัณฐ์ สถิติ — Thotsakan Statistics

> **"Stop Calculating. Start Simulating."**

An interactive **Virtual Statistics Laboratory** for Thai engineering students. Instead of memorizing formulas, students manipulate variables and observe behavior — like scientists, not test-takers.

Just as the mythical giant **Thotsakan (ทศกัณฐ์)** has 10 faces and 20 arms to command every angle of reality, this software gives students multi-dimensional tools to explore, break, and rebuild their intuition about data. The full vision is in [`doc/identity.md`](doc/identity.md).

---

## ✨ Features

| Module | Description | Status |
|--------|-------------|--------|
| **Home** | Landing page with philosophy and navigation | ✅ Complete |
| **Data** | CSV upload, preview, column-type reclassification, category filters, display precision | ✅ Complete |
| **Probability → Common Distributions** | Interactive PMF / PDF / CDF and probability queries for 12 distributions | ✅ Complete |
| **Estimation → Descriptive Statistics** | Quantiles, central tendency, dispersion, shape; histogram and box plot | ✅ Complete |
| **Estimation → Statistical Inference** | Confidence intervals, prediction intervals, confidence regions | ✅ Complete |
| **Estimation → Graphical Analysis** | Histogram / empirical PMF / ECDF with KDE, rug, normal overlay, DKW band, CI/PI strip | ✅ Complete |
| **Hypothesis Testing** | One-sample t, two-sample t (optional Welch), Bartlett / Levene variance tests, one-way ANOVA — with α, critical values, rejection region and verdict | ✅ Complete |
| **Linear Regression** | OLS, CI/PI bands, residual analysis | 📋 Not started (the only feature left to migrate) |
| **Probability → Custom Distribution / Approximations** | User-defined distributions; binomial→normal, CLT | 📋 Planned ("coming soon" placeholders in the UI) |

The phase-by-phase history and remaining work are in [`doc/migration_plan.md`](doc/migration_plan.md).

### Key Interactions

- **Slider → authoritative feedback**: drag a parameter; after a ~250 ms debounce the backend computes the result and the chart re-renders. Stale in-flight requests are cancelled (`AbortController`) so only the latest answer lands.
- **Visual-first**: in Hypothesis Testing the p-value, verdict and raw table stay hidden until the student asks, so the rejection-region plot answers first.
- **Sign-in required**: only Google accounts with a verified `@cmkl.ac.th` email can use the app.

---

## 🏗 Architecture

**Zero Frontend Math** — the React frontend renders; the Python backend computes. `backend/core/` is the only place where statistics are verified. One deliberate exception: `frontend/src/math/` renders a provisional preview for the 12-distributions sliders, marked `provisional: true` and always replaced by the backend result.

```
┌─────────────────────────────────────────────────────────────┐
│  React / TypeScript Frontend (Vite)                         │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐     │
│  │  Controls  │  │ Observation  │  │    Notebook      │     │
│  │  (sliders, │  │ (Plotly      │  │    (stats,       │     │
│  │  toggles)  │  │  charts)     │  │    explanations) │     │
│  └────────────┘  └──────────────┘  └──────────────────┘     │
│         │               ▲                    ▲              │
│         ▼               │                    │              │
│  ┌──────────────────────┴────────────────────┘              │
│  │  Feature hooks (useDistribution, use*TabState)           │
│  │  → debounced API calls + AbortController cancellation    │
│  └──────────────────────────────────────────────────────────│
│                          │  HTTP / JSON (session cookie)    │
└──────────────────────────┼──────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  FastAPI / Python Backend                                    │
│  ┌────────────┐  ┌─────────────┐  ┌─────────────────────┐    │
│  │ api/routes │→ │  services/  │→ │  core/ (pure math)  │    │
│  │ (endpoints)│  │(orchestrate)│  │ scipy, statsmodels, │    │
│  │            │  │             │  │ pingouin            │    │
│  └────────────┘  └─────────────┘  └─────────────────────┘    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ sessions/store.py — in-memory dataset store, 30-min TTL│  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Why this split?**
- The **frontend** gives students the "alive" feel — debounced requests with loading states keep sliders responsive.
- The **backend** is the mathematical authority — the professor reads `core/` and verifies correctness directly.
- `core/` has **no web-framework dependencies** — pure numpy / scipy / statsmodels / pingouin.

Full architecture: [`doc/context.md`](doc/context.md).

---

## 📁 Project Structure

```
.
├── frontend/                 # React + Vite + TypeScript (UI only)
│   └── src/
│       ├── api/              # Typed fetch wrappers, one file per feature area
│       ├── features/         # home, data, probability/common, estimation/{descriptive,inference,graphical}, hypothesis
│       ├── components/       # DualInput, ExportMenu, LoginGate, shared primitives
│       ├── context/          # AuthContext, DataContext
│       ├── hooks/            # useDistribution + layout/persistence hooks
│       ├── layout/           # LabBench 3-panel system, header, footer
│       ├── math/             # Provisional-only distribution preview
│       └── utils/            # Export helpers, file parsing
├── backend/                  # FastAPI + Python
│   ├── core/                 # Pure math (professor-verified)
│   ├── services/             # Orchestration
│   ├── api/                  # routes/, schemas/, deps.py
│   ├── sessions/store.py     # In-memory session store + TTL
│   ├── tests/                # pytest suite
│   ├── config.py             # Settings from the root .env
│   └── main.py               # App entry point
├── doc/                      # Design, architecture and setup docs
├── changelogs/               # Dated change notes
├── docker-compose.yml        # Production-style stack (:8080)
├── docker-compose.dev.yml    # Hot-reload dev stack
└── .github/workflows/        # docker.yml — image builds + smoke test
```

The original Gradio app (`ThotsakanStatistics/`) and the Reflex prototype (`Try_reflex/`) may exist in a local checkout as read-only references; they are git-ignored and not part of this branch.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.19+ or 22.12+ (required by Vite 7; the Docker images use Node 22) and **npm**
- **Python** 3.11+ (the Docker images use 3.12)
- *(Optional)* **Docker** with Compose v2 — see [Run with Docker](#-run-with-docker)

### 1. Clone the repository

```bash
git clone -b dev https://github.com/IrvingGomez/ThotsakanStatistics.git
cd ThotsakanStatistics
```

The React + FastAPI app lives on the `dev` branch (the branch CI builds). `main` holds the original Gradio application.

### 2. Configure sign-in

```bash
cp .env.example .env   # git-ignored; fill in GOOGLE_CLIENT_ID and AUTH_SECRET_KEY
```

The backend refuses to start without them unless `AUTH_DISABLED=true` (local development only, never production). Full walkthrough: [`doc/AUTH.md`](doc/AUTH.md).

### 3. Install dependencies

```bash
# Frontend
cd frontend && npm install

# Backend
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt -r requirements-dev.txt   # -dev adds pytest + httpx

# Root (only for running both together)
npm install                        # installs concurrently
```

### 4. Run the development servers

```bash
npm run dev                        # from the root: frontend (:5173) + backend (:8000)
```

Or separately:

```bash
cd frontend && npm run dev         # → http://localhost:5173
cd backend && uvicorn main:app --reload   # → http://localhost:8000
```

Vite proxies `/api/*` to `http://localhost:8000` (override with `VITE_PROXY_TARGET`).

### 5. Verify

- Open <http://localhost:5173> — you should see the Google sign-in screen (or the app with an amber "Auth disabled (dev)" badge).
- <http://localhost:8000/api/health> returns `{"status": "ok"}`.

---

## 🐳 Run with Docker

No local Node.js or Python needed. Both stacks read the root `.env`.

**Production-style stack** (nginx serves the built frontend and proxies `/api` to the backend; same origin, so no CORS):
```bash
docker compose up --build          # → http://localhost:8080
WEB_PORT=3000 docker compose up    # different host port
```

**Development stack** (hot reload; source is bind-mounted; installs and dev upload copies go to the git-ignored `dev-playground/`):
```bash
docker compose -f docker-compose.dev.yml up   # frontend → :5173, backend → host :8097 (container :8000)
```

**Prebuilt images** are pushed to GitHub Container Registry by the `Docker images` workflow on every push to `dev` (tags `dev` and `sha-<commit>`):
```bash
docker pull ghcr.io/irvinggomez/thotsakanstatistics-backend:dev
docker pull ghcr.io/irvinggomez/thotsakanstatistics-frontend:dev
```

Notes:
- The backend runs a **single** uvicorn worker on purpose — datasets live in an in-memory session store that workers would not share.
- The frontend image reads `BACKEND_URL` (default `http://backend:8000`) to know where to proxy `/api`.
- Base images come from `BASE_REGISTRY` (default `mirror.gcr.io/library`, no Docker Hub login needed).
- Run backend tests in the dev stack: `docker compose -f docker-compose.dev.yml exec backend python -m pytest`.

---

## 🧪 Running Tests

```bash
cd frontend && npm run test        # Vitest, single run (npm run test:ui for the UI)
cd frontend && npm run build       # tsc type check + production build
cd backend  && pytest              # needs requirements-dev.txt
```

---

## 🎨 The "LabBench" UI Pattern

Every analysis tab (all except Home and Data, which are full width) plugs into a shared 3-panel layout:

```
┌─────────────────────────────────────────────────────┐
│  Logo bar · tab navigation · sub-tab ribbon         │
├──────────────┬─────────────────┬────────────────────┤
│   Controls   │   Observation   │     Notebook       │
│   (280 px)   │   (flex-grow)   │     (320 px)       │
│  Sliders,    │  Plotly charts  │  Stats, verdicts,  │
│  selects     │                 │  explanations      │
├──────────────┴─────────────────┴────────────────────┤
│  Footer (status bar)                                │
└─────────────────────────────────────────────────────┘
```

- Side panels are **resizable** (drag handles, or arrow keys on a focused handle) and **collapsible** (`Ctrl/⌘+B` left, `Ctrl/⌘+J` right).
- Below **1200 px** viewport width the three panels **stack vertically**.
- Widths and collapsed state persist to `localStorage`.

---

## 🔑 Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **Zero frontend math** | All statistics computed in Python `core/` — one verifiable source of truth |
| **Debounce + AbortController** | Sliders stay responsive: stale requests are cancelled, only the latest result renders |
| **In-memory session store** | No database needed for a teaching tool; TTL cleanup keeps it simple (single worker) |
| **`core/` is framework-free** | The professor reads raw Python + scipy to verify formulas |
| **Plotly (not Matplotlib)** | Hover, zoom and pan are mandatory in a lab |
| **Lazy-loaded Plotly chunk** | Keeps the initial load small despite a heavy charting library |
| **Google ID-token sign-in** | No client secret; signed HttpOnly cookie; `@cmkl.ac.th` only |

---

## ⚡ Performance Targets

| Interaction | Target |
|-------------|--------|
| Slider → debounce fires | ~250 ms after last move |
| Backend result | < 500 ms typical, < 2 s with bootstrap |
| Tab switch | < 200 ms (lazy loaded) |
| Initial page load | < 2 s |

---

## 📚 Documentation

Start at the documentation index: [`doc/README.md`](doc/README.md). Contributors read [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## 📄 License

No license file is included yet. This project is developed for educational use; contact the maintainers for licensing details.

---

<p align="center">
  <sub>Built with 🔬 for Thai engineering students who learn by doing, not memorizing.</sub>
</p>
