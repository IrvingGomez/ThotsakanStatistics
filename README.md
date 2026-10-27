<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/FastAPI-0.111+-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
</p>

# ทศกัณฐ์ สถิติ — Thotsakan Statistics

> **"Stop Calculating. Start Simulating."**

An interactive **statistics analysis tool** for CMKL students and staff, in the style of jamovi / JASP. Move a slider or tick an option and the tables, plots and formulas update by themselves; the app reports, the user decides.

The React frontend only renders. Every number comes from a Python backend whose `core/` math the professor verifies directly. Sign-in is limited to verified `@cmkl.ac.th` Google accounts.

## Features

| Module | What it does | Status |
|---|---|---|
| **Data** | CSV upload or one of three example datasets; preview, column-type fixes, category filters, display precision | ✅ |
| **Probability → Common Distributions** | PMF / PDF / CDF and one-sided or interval probability queries for 12 distributions | ✅ |
| **Statistics → Graphical Analysis** | Histogram / ECDF with KDE, normal model, DKW band | ✅ |
| **Statistics → Descriptive Statistics** | Quantiles, centre, spread, shape (weighted / trimmed / Winsorized), estimator tags; histogram, box plot | ✅ |
| **Statistics → Statistical Inference** | Confidence and prediction intervals (normal theory and bootstrap), confidence regions | ✅ |
| **Hypothesis Testing** | One- and two-sample t (Welch), Bartlett / Levene, one-way ANOVA; α, critical values, rejection region | ✅ |
| **Linear Regression** | OLS, CI/PI bands, residuals | 📋 Not started |
| **Custom Distribution / Approximations** | User-defined distributions; binomial → normal, CLT | 📋 Planned |

## Getting started

Requirements: Node.js 20.19+ or 22.12+, Python 3.11+ (or just Docker with Compose v2).

```bash
git clone -b dev https://github.com/IrvingGomez/ThotsakanStatistics.git
cd ThotsakanStatistics
cp .env.example .env     # fill in GOOGLE_CLIENT_ID + AUTH_SECRET_KEY, or set AUTH_DISABLED=true locally
```

Sign-in setup is described in [`docs/AUTH.md`](docs/AUTH.md). Without that configuration the backend refuses to start.

**Local:**

```bash
(cd frontend && npm install)
(cd backend && python -m venv .venv && source .venv/bin/activate \
   && pip install -r requirements.txt -r requirements-dev.txt)
npm install && npm run dev     # frontend http://localhost:5173, backend :8000
```

**Docker:**

```bash
docker compose up --build                     # http://localhost:8080 (WEB_PORT to change)
docker compose -f docker-compose.dev.yml up   # hot reload: :5173, backend on host :8097
```

Prebuilt images are published from `dev`: `ghcr.io/irvinggomez/thotsakanstatistics-{backend,frontend}:dev`.

**Tests:**

```bash
cd backend && pytest
cd frontend && npm run test && npm run build
```

## Documentation

| Document | Contents |
|---|---|
| [`docs/decisions.md`](docs/decisions.md) | Every decision on how the app looks and behaves, with dates. Do not reverse one without Irving Gomez |
| [`docs/interaction_contract.md`](docs/interaction_contract.md) | Rules every analysis tab follows |
| [`docs/design.md`](docs/design.md) | What the app is, the three panels, DualInput, theme, performance |
| [`docs/architecture.md`](docs/architecture.md) | Layers, folders, request flow, sessions, API endpoints, testing |
| [`docs/roadmap.md`](docs/roadmap.md) | Authoritative feature status, backlog after v1, known issues |
| [`docs/AUTH.md`](docs/AUTH.md) | Google sign-in setup and troubleshooting |
| [`docs/guide/`](docs/guide/) | A readable PDF guide to all of the above, for the lab and its students |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Workflow, coding standards, testing, commits |
| [`changelogs/`](changelogs/) | Dated change notes |

## License

No license file is included yet. This project is developed for educational use; contact the maintainers for licensing details.
