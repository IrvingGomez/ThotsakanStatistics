# Contributing to Thotsakan Statistics

Thanks for helping. Please read the [Code of Conduct](CODE_OF_CONDUCT.md) first. It applies to everything below.

Thotsakan Statistics is an interactive statistics lab: *"Stop Calculating. Start Simulating."* Before proposing a feature, read [`doc/identity.md`](doc/identity.md). If a feature doesn't fit the lab identity, we don't build it. For the full architecture see [`CLAUDE.md`](CLAUDE.md), [`doc/context.md`](doc/context.md) and [`doc/DESIGN_PROPOSAL.md`](doc/DESIGN_PROPOSAL.md).

## Table of Contents

1. [Repository Layout and Ground Rules](#repository-layout-and-ground-rules)
2. [Getting Started](#getting-started)
3. [Workflow](#workflow)
4. [Python Standards (backend)](#python-standards-backend)
5. [TypeScript Standards (frontend)](#typescript-standards-frontend)
6. [Adding a Feature](#adding-a-feature)
7. [Testing](#testing)
8. [Commits and Pull Requests](#commits-and-pull-requests)

## Repository Layout and Ground Rules

```
frontend/   React + Vite + TypeScript (UI only)
backend/    FastAPI + Python
  core/       pure math, verified by the professor
  services/   validate → call core → map to schema
  api/        routes (thin) + Pydantic schemas + deps
  sessions/   in-memory dataset store with TTL
doc/        design and migration docs
```

`ThotsakanStatistics/` and `Try_reflex/` (if present in your checkout) are **read-only references. Do not modify them.**

These rules are non-negotiable:

1. **Zero frontend math.** All authoritative statistics are computed in `backend/core/`. The frontend calls the API and renders the result. The only exception is the provisional preview in `frontend/src/math/`, which must set `provisional: true` and always be overwritten by the debounced backend response.
2. **Layering.**
   - `core/` must **not** import from `services`, `api` or `sessions`, and must stay framework-free.
   - `services/` must **not** import numpy, scipy or statsmodels. It validates, calls `core/`, and maps to schemas.
   - Routes are thin (~10 lines): parse, delegate, translate errors.
3. **`core/` is sacred.** Keep it numerically correct and full-precision. Rounding is presentation-level only. `core/hypothesis_testing/__init__.py` is byte-identical to the professor's file, so do not edit it. Add new behavior in sibling modules (as `rejection_region.py` and `tables.py` do).
4. **Session data stays in memory.** Never persist, log or commit uploaded datasets.
5. **No new dependency without discussion.** Explain why in the PR.

## Getting Started

Requirements: Node.js (current LTS), Python 3.11+.

```bash
# Backend (from backend/)
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn main:app --reload          # http://localhost:8000

# Frontend (from frontend/)
npm install
npm run dev                        # Vite dev server

# Both together (from the project root)
npm install && npm run dev
```

### With Docker

```bash
docker compose -f docker-compose.dev.yml up      # hot-reload dev stack (:5173 + :8000)
docker compose up --build                        # production-style stack (:8080)
```

CI (`.github/workflows/docker.yml`) builds both images on pushes to `dev` and on PRs targeting `dev` that touch `backend/` or `frontend/` and smoke-tests the compose stack. Make sure `docker compose up --build` still works if you change dependencies or a Dockerfile.

Never commit virtual environments, `node_modules/` or `__pycache__/`.

## Workflow

1. Branch from `main` (or the current integration branch). Use `feat/…`, `fix/…`, `docs/…`, `refactor/…`, `test/…` or `chore/…`.
2. Make small, focused changes. Don't mix a refactor with a feature.
3. Add or update tests and docs in the same change.
4. Run the checks below, then open a pull request.

Before every PR:

```bash
cd backend  && pytest
cd frontend && npm run test && npm run build   # build runs tsc, so it's the type check
```

No linter or formatter is configured yet. Until one is, follow the standards below by hand and match the surrounding code.

## Python Standards (backend)

**Style**

- Follow PEP 8 with 4-space indentation and a soft limit of ~100 columns. Match the file you are editing.
- `snake_case` for functions, variables and modules. `PascalCase` for classes and Pydantic models. `UPPER_SNAKE_CASE` for constants. A leading underscore marks module-private helpers (e.g. `_advanced_id`).
- Imports in three groups (standard library, third-party, local), separated by blank lines. No wildcard imports.
- Use modern type hints (`str | None`, `list[float]`) on all public function signatures.
- Write a docstring for every public `core/` function. State what it computes, the parameters (including `ddof`, α, tails and other statistical conventions), the return shape, and the reference or formula source when non-obvious.
- Comments explain *why*, not *what*.

**Layer rules**

| Layer | Do | Don't |
|---|---|---|
| `core/` | Pure functions, full precision, explicit statistical conventions | Import services/api/sessions, touch HTTP, round results, hold state |
| `services/` | Validate inputs, pick the core function, compose results, map to schemas | Import numpy/scipy/statsmodels, do math |
| `api/routes/` | Declare the route, inject dependencies, delegate | Contain logic beyond error translation |
| `api/schemas/` | Pydantic request/response models (field names match the TS interfaces) | Contain behavior |
| `sessions/` | In-memory store with TTL | Persist to disk |

**Errors**

- `services/` raises `ValueError` with a clear, student-readable message for invalid input. Routes map it to HTTP 400.
- Never swallow exceptions silently. Don't return `NaN` or `Infinity` where JSON can't carry it. Use `None` and, when useful, a `warning` field (see `StatRow.warning`).
- Don't leak stack traces or internals in error details.

**Statistical correctness**

- State conventions explicitly: population vs. sample (`ddof`), one- vs. two-tailed, confidence level, estimator choice.
- Prefer scipy, statsmodels and pingouin over hand-rolled formulas. Hand-rolled math needs a test against a reference value.
- Handle edge cases deliberately: empty data, n = 1, zero variance, constant columns, NaNs, extreme parameters.
- Plot-free computation only: `core/` returns data (see `compute_histogram`, `compute_boxplot_data`), never figures.

## TypeScript Standards (frontend)

**Compiler**

`tsconfig.json` is strict: `strict`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly`. The code must pass `npm run build` with no errors.

- No `any`. Use `unknown` and narrow it. Don't silence errors with `@ts-ignore` or `@ts-expect-error` without a comment explaining why.
- Use `import type { … }` for type-only imports (required by `verbatimModuleSyntax`).
- No `enum` or namespaces (`erasableSyntaxOnly`). Use string-literal unions and `as const` objects.
- Prefer `interface` for object shapes and `type` for unions and aliases.

**Naming and files**

- Components: `PascalCase.tsx`, one main component per file, function components only. Hooks: `useCamelCase.ts`. Utilities and API modules: `camelCase.ts`. Tests sit next to the code: `Foo.test.tsx`.
- Feature tabs follow **`*Controls.tsx` → `*Observation.tsx` → `*Notebook.tsx`**, wired into `LabBench` from `App.tsx`.
- Variables and functions in `camelCase`, types and components in `PascalCase`, constants in `UPPER_SNAKE_CASE`.

**Architecture**

- **No statistics in the frontend** (see the ground rules). Don't add formulas, distributions or estimators to components or hooks.
- API access lives in `src/api/`, one file per feature area, with typed wrappers and TS interfaces that mirror the Pydantic schemas. Components never call `fetch` directly.
- Computation and API orchestration live in hooks (`use*`) that expose `{ result, isLoading | isComputing, error }`.
- Slider-driven features use a ~250 ms debounce, abort the stale request with `AbortController`, and show a loading state. Always clean up timers and controllers in the effect cleanup.
- Send the dataset reference via the `x-session-id` header. Global state goes through `DataContext` (`useData()`). Everything else stays feature-local.
- Reuse the shared primitives before writing new ones: `DualInput` for every numeric parameter, `AnalysisStatus`, `ControlPrimitives`, `ResultToolbar`, `ExportMenu`.
- Persist UI preferences with `useLocalStorageState` (validated on load). Never store datasets in `localStorage`.
- Plotly charts are lazy-loaded with `React.lazy` + `Suspense`. Do not import Plotly eagerly. Watch the bundle size (chunk warning at 1600 KB).
- Static math uses KaTeX, and interactive math input uses MathLive.

**React practice**

- Keep components small and derive state instead of duplicating it. Give hook dependency arrays every value they use.
- Handle loading, empty and error states in every Observation component. Never render `undefined`, `NaN` or `null` as a value.
- UI text must be understandable to students. Display rounding uses the precision from `DataContext` and is presentation-only.
- Accessibility: labeled inputs, keyboard support (arrow keys in `DualInput`, sidebar shortcuts), sufficient contrast.

## Adding a Feature

A typical statistics feature touches every layer, in this order:

1. **`backend/core/…`**: the pure math, with docstrings. Run it by hand and compare against a reference.
2. **`backend/services/…`**: validation and mapping. No numpy/scipy imports.
3. **`backend/api/schemas/…` and `backend/api/routes/…`**: models and a thin route. Register the router in `main.py`.
4. **`backend/tests/…`**: core/service tests, plus an API test in `tests/api/`.
5. **`frontend/src/api/<feature>.ts`**: typed client and interfaces.
6. **`frontend/src/hooks/…` or the feature folder**: a hook with the debounce/abort pattern.
7. **`frontend/src/features/<area>/<Feature>{Controls,Observation,Notebook}.tsx`** plus a tab component, wired into `App.tsx`.
8. **Docs**: update the migration table in `CLAUDE.md` and `README.md`, and `doc/migration_plan.md` if the roadmap changed.

The only unmigrated feature is **Linear regression** (`core/linear_regression/` is empty). It is a good place to start, but discuss the design first.

## Testing

**Backend (pytest, from `backend/`)**

- Test files are `tests/test_*.py`, and API tests go in `tests/api/` using `httpx`/FastAPI's test client.
- Every new `core/` or `services/` function needs tests. Assert against **independent reference values** (scipy directly, a textbook example, or a known closed form), not against the function's own output.
- Cover edge cases: small n, zero variance, invalid parameters, missing session.
- Tests must be deterministic. Seed any randomness and don't depend on the network or on the clock.

**Frontend (Vitest, from `frontend/`)**

- Put tests next to the code (`*.test.ts(x)`), using jsdom and Testing Library-style queries where available.
- Mock the `src/api/` layer, not `fetch` internals. Test states (loading, error, success) and the debounce/abort behavior of hooks.
- Don't write frontend tests that assert statistical values. That belongs in the backend.

A bug fix should come with a test that fails without the fix.

## Commits and Pull Requests

**Commit messages** follow Conventional Commits, matching the history:

```
feat: hypothesis testing tab with rejection region and verdict
fix: keep the null curve readable when the statistic is far out
refactor: shared result status, export and control primitives across tabs
docs: record graphical, inference and hypothesis tabs as migrated
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`. Use a lowercase imperative subject with no trailing period, and explain *why* in the body when it isn't obvious.

**Pull requests**

- Keep them small and focused, with a description of what changed and why.
- List the checks you ran (`pytest`, `npm run test`, `npm run build`).
- For changes to `core/`, describe the reference you verified against. The professor will review them.
- For UI changes, include a screenshot or short recording.
- Update the docs listed under [Adding a Feature](#adding-a-feature) when behavior or status changes.
- Resolve review comments in the spirit of the [Code of Conduct](CODE_OF_CONDUCT.md).

## Questions

Open an issue or ask the maintainers. If a rule here blocks a good idea, raise it. Rules can change, but they change through discussion, not silently.
