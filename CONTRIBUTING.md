# Contributing to Thotsakan Statistics

Thanks for helping. Please read the [Code of Conduct](CODE_OF_CONDUCT.md) first. It applies to everything below.

- **Before proposing a feature:** read [`docs/design.md`](docs/design.md), [`docs/decisions.md`](docs/decisions.md) and [`docs/interaction_contract.md`](docs/interaction_contract.md). A feature that conflicts with a recorded decision needs Irving Gomez's approval first.
- **Setup:** see the [README](README.md#getting-started).
- **Architecture:** see [`docs/architecture.md`](docs/architecture.md).

## Ground rules

1. **Zero frontend math.** All authoritative statistics are computed in `backend/core/`. The only exception is the provisional preview in `frontend/src/math/`. It must set `provisional: true` and is always overwritten by the backend response.
2. **Layering.**
   - `core/` doesn't import `services`, `api` or `sessions`, and stays framework-free.
   - `services/` doesn't import numpy, scipy or statsmodels (pandas and `api.schemas` are fine).
   - Routes are thin: parse, delegate, translate errors.
3. **`core/` is sacred.** It stays numerically correct and full-precision, and rounding happens only in the UI. Files copied from the professor's app stay byte-identical (`core/hypothesis_testing/__init__.py`, `core/estimation/graphical_analysis.py`). New behaviour goes in sibling modules.
4. **Uploaded data stays in memory.** Never persist, log or commit datasets. The dev stack's `UPLOAD_DUMP_DIR` copy into the git-ignored `dev-playground/` is a local debugging aid only.
5. **No secrets in tracked files.** Credentials live in the git-ignored root `.env`.
6. **No new dependency without discussion.** Explain why in the PR.
7. `ThotsakanStatistics/` and `Try_reflex/`, if present locally, are **read-only** references.

## Workflow

1. Branch from `dev` (`main` holds the original Gradio app). Name the branch `feat/…`, `fix/…`, `docs/…`, `refactor/…`, `test/…` or `chore/…`.
2. Make small, focused changes. Don't mix a refactor with a feature.
3. Add or update tests and docs in the same change.
4. Run the checks and open a PR against `dev`:

```bash
cd backend  && pytest
cd frontend && npm run test && npm run build   # build includes the tsc type check
```

CI only builds the Docker images and smoke-tests them. It doesn't run these checks, so run them yourself. If you change dependencies or a Dockerfile, make sure `docker compose up --build` still works.

No linter or formatter is configured, so match the surrounding code. Never commit virtual environments, `node_modules/`, `__pycache__/`, `.env` or `dev-playground/`.

## Python standards (backend)

**Style**

- **Formatting:** PEP 8, 4 spaces, ~100 columns.
- **Naming:** `snake_case` functions and modules, `PascalCase` classes and Pydantic models, `UPPER_SNAKE_CASE` constants, `_private` helpers.
- **Imports:** grouped as stdlib / third-party / local, with no wildcards.
- **Type hints:** modern hints (`str | None`, `list[float]`) on public signatures.
- **Docstrings:** every public `core/` function has one, stating what it computes, its conventions (`ddof`, α, tails), its return shape, and its reference when that isn't obvious.
- **Comments** explain *why*, not *what*.

**Layers**

| Layer | Do | Don't |
|---|---|---|
| `core/` | Pure functions, full precision, explicit conventions | Import upward, touch HTTP, round, hold state |
| `services/` | Validate, pick the core function, compose, map to schemas | Import numpy/scipy/statsmodels, do math |
| `api/routes/` | Declare the route, inject dependencies, delegate | Hold logic beyond error translation |
| `api/schemas/` | Pydantic models whose field names match the TS interfaces | Contain behaviour |
| `sessions/` | In-memory store with TTL | Persist to disk |

**Errors**

- Services raise `ValueError` with a message a student can read, and routes map it to HTTP 400.
- Never swallow exceptions, and never leak stack traces.
- JSON can't carry `NaN` or `Infinity`, so return `None` instead, plus a `warning` field where it helps (see `StatRow.warning`).

**Statistical correctness**

- **Conventions:** state them explicitly (population vs sample, tails, confidence level, estimator).
- **Libraries over hand-rolled math:** prefer scipy, statsmodels and pingouin. Hand-rolled math needs a test against a reference value.
- **Edge cases:** handle them deliberately: empty data, n = 1, zero variance, constant columns, NaNs, extreme parameters.
- **No figures on the API path:** functions used by the API return data, never figures.
- **Reproducibility:** bootstrap and other random procedures must be seedable.

## TypeScript standards (frontend)

**Compiler settings.** `tsconfig.json` is strict (`strict`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly`), so:

- No `any`. Use `unknown` and narrow it.
- No `@ts-ignore` or `@ts-expect-error` without a comment explaining why.
- `import type { … }` for type-only imports.
- No `enum` or namespaces. Use string-literal unions or `as const`.
- `interface` for object shapes, `type` for unions.

**Naming and files**

- **Components:** `PascalCase.tsx`, function components only.
- **Hooks:** `useCamelCase.ts`.
- **Utilities and API modules:** `camelCase.ts`.
- **Tests:** next to the code, named `Foo.test.tsx`.

**Architecture**

- **Tabs:** analysis tabs follow `*Controls` → `*Observation` → `*Notebook`, exposed through a `*Tab.tsx` (`ControlsSlot` / `ObservationSlot` / `NotebookSlot`) and wired into `LabBench` from `App.tsx`.
- **API access:** lives in `src/api/`, one file per area, with interfaces that mirror the Pydantic schemas. There is no shared client, and components never call `fetch`.
- **Hooks** orchestrate the API calls and expose `{ result, isLoading | isComputing, error }`.
  - Live controls use a ~250 ms debounce and abort stale requests with `AbortController`.
  - Clean up timers and controllers in the effect cleanup.
- **Global state:** only `DataContext` (`useData()`) and `AuthContext`. Send the dataset as the `x-session-id` header.
- **Reuse before writing new components:** `DualInput` (every numeric parameter), `AnalysisStatus`, `ControlPrimitives`, `ResultToolbar`, `ExportMenu`.
- **Persistence:** keep UI preferences with `useLocalStorageState`. Never store datasets in `localStorage`.
- **Plotly** stays lazy-loaded (`React.lazy` + `Suspense`). The chunk warning is at 1600 KB.

**React practice**

- **State:** keep components small and derive state instead of duplicating it. Give hook dependency arrays every value they use. Never call `setState` during render.
- **Observation components:** handle loading, empty and error states in every one. Never render `undefined`, `NaN` or `null` as a value.
- **Text and numbers:** UI text must be understandable to students. Display rounding uses the precision from `DataContext`.
- **Accessibility:** labeled inputs, keyboard support, sufficient contrast.

## Adding a feature

A statistics feature touches every layer, in this order:

1. `backend/core/…`: the math, with docstrings, checked against a reference.
2. `backend/services/…`: validation and mapping.
3. `backend/api/schemas/…` and `api/routes/…`: register the router in `main.py` with `dependencies=_protected`.
4. `backend/tests/…`: core/service tests plus an API test in `tests/api/`.
5. `frontend/src/api/<feature>.ts`: typed client.
6. `frontend/src/features/<area>/`: a `use<Feature>TabState` hook plus `*Controls`, `*Observation`, `*Notebook` and `*Tab`, wired into `App.tsx`.
7. Docs: the status table in `docs/roadmap.md`, the Features table in `README.md`, and a dated note under `changelogs/`.

Linear regression is the only feature left to migrate. Discuss the design first; the plan is in [`docs/roadmap.md`](docs/roadmap.md).

## Testing

- **Backend (pytest):**
  - Tests live in `tests/test_*.py` and `tests/services/`; API tests live in `tests/api/` (`conftest.py` signs them in).
  - Assert against **independent reference values** (scipy directly, a textbook example, a closed form), never against the function's own output.
  - Cover edge cases.
  - Seed any randomness, and don't depend on the network or the clock.
- **Frontend (Vitest + jsdom):**
  - Mock the `src/api/` layer, not `fetch`.
  - Test loading / error / success states and the debounce/abort behaviour.
  - Never assert statistical values; that belongs in the backend.
- **Bug fixes** come with a test that fails without the fix.

## Commits and pull requests

Use Conventional Commits (`feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`) with a short, lowercase, imperative subject. Explain *why* in the body when it isn't obvious:

```
feat: hypothesis testing tab with rejection region
fix: keep the null curve readable when the statistic is far out
```

Each PR should:

- Be small, and describe what changed and why.
- List the checks you ran.
- For `core/` changes, name the reference you verified against. The professor reviews them.
- Include a screenshot or short recording for UI changes.
- Update the docs listed under [Adding a feature](#adding-a-feature).

If a rule here blocks a good idea, raise it in an issue. Rules change through discussion, not silently.
