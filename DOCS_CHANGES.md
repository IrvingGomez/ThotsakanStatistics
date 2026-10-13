# Documentation Review — 2026-10-13

This report records the check of every Markdown documentation file in the project, what was wrong, and what was changed. It covers:

- `LEGACY_DOCS/` — an exact backup of all 23 original Markdown files (byte-identical, verified with `diff`).
- `NEW_DOCS/` — the rewritten documentation set, with the same layout as the repository so it can be copied over the originals.
- This file.

**Nothing in the original files was modified or deleted.** The originals are still in place (`README.md`, `doc/`, …), so `NEW_DOCS/` is a proposal until it is copied over them. Nothing was committed.

---

## 1. Method

1. Read all 23 Markdown files (5 root files, 14 in `doc/`, 4 in `changelogs/`). `node_modules/` and the git-ignored reference folders (`ThotsakanStatistics/`, `Try_reflex/`) are not in this checkout.
2. Checked every factual claim against the code on branch `dev` at commit `1bb0cfd`: `backend/main.py`, `api/routes/*`, `api/deps.py`, `api/schemas/*`, `services/*`, `sessions/store.py`, `config.py`, `core/` file list and function definitions, `requirements*.txt`, `pytest.ini`, Dockerfiles, both compose files, `.github/workflows/docker.yml`, `.env.example`, `.gitignore`, `frontend/package.json`, `vite.config.ts`, `App.tsx`, `layout/*`, hooks, contexts, `src/api/*`, `DataTab.tsx`, `style.css`, and `.git/config`.
3. Compared the documents with each other for contradictions.
4. Built the link graph of the old docs and looked for circular references.
5. Wrote `NEW_DOCS/` and checked its link graph: every relative link resolves to an existing file, and there are no cycles.

**Not done:** `pytest`, `npm run test` and `npm run build` were not run — neither `frontend/node_modules` nor a backend virtualenv exists in this checkout, and installing them was outside the task. Test status in the docs is therefore described as "not re-verified".

---

## 2. File map: old → new

| Original file | Action in `NEW_DOCS/` |
|---|---|
| `README.md` | Rewritten (feature status, prerequisites, clone branch, Docker ports, tests, LabBench behavior, tech decisions, docs section, license) |
| `AGENT.md` | Updated (byte-identical file list, secrets rule, requirements-dev, status-update instruction) |
| `CLAUDE.md` | Rewritten (layout, commands, backend tree, frontend tree, hooks, LabBench, visualization, status, docs) |
| `CONTRIBUTING.md` | Updated (Node version, `.env` step, dev ports, CI triggers, branch, byte-identical files, KaTeX, `*Tab.tsx`, router auth, docs-to-update list) |
| `CODE_OF_CONDUCT.md` | One change: removed the link to `AGENT.md` (it created a cycle) |
| `doc/AUTH.md` | Updated (open routes, `/api/auth/me`, cookie attributes, dev port, non-Docker URLs, non-auth `.env` vars) |
| `doc/context.md` | Rewritten (scope, dependencies, production serving, data flow, testing, maturity, license) |
| `doc/DESIGN_PROPOSAL.md` | Rewritten as the current UI design (layout, slot pattern, phases, performance, theme) |
| `doc/folder_duties.md` | Rewritten against the real file tree |
| `doc/frontend_backend_interaction.md` | Rewritten (auth, ports/proxies, full endpoint table, trigger table, errors, filters) |
| `doc/identity.md` | Updated + merged with `doc/overview.md`; technical section corrected; unimplemented items marked *(vision)* |
| `doc/migration_plan.md` | Updated: new authoritative status table, Phase 3/6 corrections, infrastructure section, Phase 5/7 refreshed |
| `doc/code_review.md` | Kept verbatim under a new per-finding status table |
| `doc/descriptive_stats_flow.md` | Kept, labelled as a legacy **Gradio** reference, light copy-edit |
| `doc/descriptive_stats_ux_review.md` | Kept as a proposal with a status banner |
| `doc/data_tab_large_data_ux_review.md` | Kept as a proposal with a status banner (adopted / not adopted) |
| `doc/data_tab_redesign_mockup.md` | Kept as a proposal with a status banner |
| `doc/overview.md` | **Removed** — merged into `doc/identity.md` (it was a truncated duplicate) |
| `doc/details_descriptive_statistics.md` | **Removed** — the file was empty (0 bytes) |
| `changelogs/*.md` (4 files) | Copied unchanged (dated historical records) |
| — | **New:** `doc/README.md` (documentation index) |
| — | **New:** `doc/known_issues.md` (open defects with evidence) |

---

## 3. Cross-document inconsistencies (wrong in several files)

Each row: what the old docs said, what the code shows, and the files affected. All are fixed in `NEW_DOCS/`.

| # | Old claim | Reality (evidence) | Old files affected |
|---|---|---|---|
| C1 | Graphical Analysis "frontend not yet wired"; Hypothesis "planned"; Data "backend upload not wired"; Normal PDF/CI "Complete" | All of Data, Graphical and Hypothesis are wired and working; Normal PDF UI was retired (`App.tsx`, `features/`) | README |
| C2 | Hypothesis tests are "Z-test, t-test, chi-square, ANOVA" / "t-test, ANOVA, chi-square" / include "Tukey HSD" | Four tests: one-sample t, two-sample t (Welch option), Bartlett/Levene, one-way ANOVA; no Z, chi-square or Tukey (`core/hypothesis_testing/__init__.py`, `migration_plan.md`) | README, context, folder_duties |
| C3 | KaTeX and MathLive are used for formulas / math input | Neither is in `frontend/package.json`; only leftover type declarations exist | README, CLAUDE, CONTRIBUTING, DESIGN_PROPOSAL (via MathBlock), migration_plan (Phase 5) |
| C4 | Bundle split into `react-vendor`, `plotly-vendor`, `math-vendor` | Only `react-vendor` and `plotly-vendor` (`vite.config.ts`) | CLAUDE |
| C5 | Panels auto-collapse at 768 px / 1024 px | LabBench stacks panels vertically below 1200 px (`matchMedia('(max-width: 1199px)')`); `useContainerBreakpoint` is unused | README, CLAUDE |
| C6 | Dev compose backend on `:8000` | Host port is **8097** (`docker-compose.dev.yml`: `8097:8000`) | README, CLAUDE, CONTRIBUTING |
| C7 | `hooks/useNormalPDF.ts` exists | Deleted with the Normal PDF tab | README, DESIGN_PROPOSAL, folder_duties, migration_plan (Phase 6 still ticked it) |
| C8 | `src/workers/` exists (empty) | Folder does not exist | CLAUDE, folder_duties |
| C9 | `src/api/client.ts`, `types.ts`, `regression.ts` exist; `ApiError` class | None exist; each API file does its own fetch/errors; plain `Error` is thrown | DESIGN_PROPOSAL, folder_duties, frontend_backend_interaction |
| C10 | JSON graphical functions live in `graphical_analysis.py` "under a marker" | They are in a separate module `core/estimation/graphical_json.py` (its docstring says `graphical_analysis.py` stays byte-identical) | CLAUDE, migration_plan |
| C11 | `ThotsakanStatistics/` and `Try_reflex/` are in the repo tree | Git-ignored (`.gitignore`), absent from this checkout | CLAUDE, DESIGN_PROPOSAL, context (inconsistent with README/CONTRIBUTING, which said "local only") |
| C12 | "There is no login" / auth not mentioned | Google sign-in gates every data route (`main.py`, `api/deps.require_user`) | frontend_backend_interaction, context, folder_duties, DESIGN_PROPOSAL |
| C13 | In production FastAPI serves the React build | nginx serves the build and proxies `/api` (`frontend/Dockerfile`, `nginx.conf.template`) | context, migration_plan (Phase 7) |
| C14 | JS approximation layer for distributions / normal curve / CI shading; 200 ms debounce; "<100 ms" updates | Only a provisional preview for distributions (`src/math/`); debounce is 250 ms; backend target < 500 ms | frontend_backend_interaction, identity, overview, DESIGN_PROPOSAL |
| C15 | Frontend is "Powered by Reflex (React)" | React + Vite SPA; Reflex was an abandoned prototype | identity, overview |
| C16 | License "MIT" vs "contact the maintainers" | No `LICENSE` file exists | context vs README |
| C17 | Clone `-b react-migration` | Work branch is `dev` (`.git/config`, CI triggers, project instructions) | README |
| C18 | `pip install -r requirements.txt` is enough to run `pytest` | pytest/httpx are only in `requirements-dev.txt` | README, CLAUDE |
| C19 | React 18+ | React 19.2 (`package.json`) | context |
| C20 | Feature/hook/component/folder lists | Missing `features/hypothesis/`, `api/hypothesis.ts`, `services/{auth,graphical,probability,hypothesis}.py`, `routes/{auth,hypothesis}.py`, `schemas/hypothesis.py`, `AuthContext`, `LoginGate`, `AnalysisStatus`, `ControlPrimitives`, `ResultToolbar`, `useChartRegistry`, `useLocalStorageState`, `exportFilename`, `math/`, `config.py`, `ci.py`, `pi.py`, `graphical_json.py`; listed non-existent `services/regression.py` | CLAUDE, folder_duties, DESIGN_PROPOSAL, README |
| C21 | Endpoint names `/api/descriptive/summary`, `/api/graphical/qq`, `/pp`, `/ecdf`, `GET /api/data/columns` | Real: `/api/descriptive/compute`, `/api/graphical/compute`; no columns route | folder_duties |
| C22 | Graphical analysis is "Q-Q, P-P, empirical CDF" | Histogram / empirical PMF / ECDF + KDE, rug, normal, DKW, CI/PI strip; no Q-Q or P-P | folder_duties |
| C23 | Estimation ▸ Inference shows "Normal PDF with CI" | CI/PI/confidence regions over the data | context, folder_duties |
| C24 | `services/` imports only from `core/`; `api/` only from services/sessions | Services also import `api.schemas` (and graphical imports `services.inference`); routes import `api.deps`/schemas | folder_duties |
| C25 | Only `core/hypothesis_testing/__init__.py` is byte-identical | `core/estimation/graphical_analysis.py` is also kept byte-identical (per `graphical_json.py`) | AGENT, CONTRIBUTING |
| C26 | Feature status table in three places (README, CLAUDE, migration_plan), each different | One authoritative table in `doc/migration_plan.md`; README keeps a user-facing feature table; CLAUDE points to the plan | README, CLAUDE |
| C27 | "Budget constraints: simulations can impose sample budgets" (as a feature) | Not implemented anywhere in the code | README, identity |
| C28 | Branch from `main` | Integration branch is `dev`; `main` holds the Gradio app | CONTRIBUTING |
| C29 | CI runs on PRs "that touch backend/ or frontend/" | Also the compose files and the workflow; push to `dev` is not path-filtered; manual dispatch exists | CONTRIBUTING |

---

## 4. Per-file findings and changes

### `README.md`
- Features table was badly out of date (C1, C2, C27). Rewritten with current status; Linear Regression is the only unmigrated Gradio feature; Custom Distribution/Approximations shown as planned.
- Architecture diagram named `useNormalPDF` (C7); replaced with `use*TabState`; noted the `src/math/` provisional exception.
- Project tree: hypothesis_testing and features listed as stubs/in-progress; refreshed; added `config.py`, `changelogs/`, compose files, `math/`.
- Prerequisite "Node.js ≥ 18" is too old for Vite 7 (needs 20.19+ or 22.12+); fixed. Clone branch fixed (C17).
- Added the `.env` step **before** running the app — the backend refuses to start without it.
- Added `requirements-dev.txt` (C18); dev-stack backend port 8097 (C6); `BASE_REGISTRY`; `python -m pytest` in the dev container.
- LabBench section: 768 px auto-collapse → 1200 px stacking, keyboard shortcuts, Home/Data are full width (C5).
- Key decisions: removed KaTeX/MathLive (C3); added Google sign-in.
- Documentation section now points to the single index `doc/README.md`.
- License text now states there is no license file (C16).

### `AGENT.md`
- Byte-identical list extended (C25); added an explicit secrets rule (no credentials in tracked files).
- "Update the migration table in CLAUDE.md and README.md" → status table in `doc/migration_plan.md` + README Features table (C26).
- Noted pytest needs `requirements-dev.txt`.

### `CLAUDE.md`
- Repository layout listed git-ignored reference folders (C11) and omitted `config.py`, `tests/`, `changelogs/`, `.env.example`, root `package.json`; fixed.
- Commands: added `requirements-dev.txt`, the auth start-up requirement, `VITE_PROXY_TARGET`, dev port 8097 (C6), Dockerfile base images, `dev-start.sh`, `dev-playground/`, accurate CI triggers (C29).
- Backend tree: added `graphical_json.py` (C10), `ci.py`/`pi.py`, `config.py`, routes/schemas lists, `data_stats.py` gradio caveat; removed non-existent `services/regression.py` (C20).
- Frontend: added hypothesis feature, real hook/component lists, `math/`, `*Tab.tsx` slot pattern, AuthContext; removed `workers/` (C8); fixed LabBench breakpoints (C5); removed `math-vendor` (C4) and KaTeX/MathLive (C3).
- New table of how each tab triggers computation (previously implied all tabs were slider-debounced).
- Migration status table replaced by a pointer to `doc/migration_plan.md` (C26).
- Added links to `CONTRIBUTING.md`, `doc/context.md`, `doc/AUTH.md`, `doc/known_issues.md`, `doc/README.md`.

### `CONTRIBUTING.md`
- Node "current LTS" → 20.19+/22.12+; added the `.env`/`AUTH_DISABLED` setup step.
- Dev stack port (C6); CI trigger description (C29); branch from `dev` (C28); never commit `.env`/`dev-playground/`.
- Byte-identical files (C25); new rule: no secrets in tracked files; note on the dev `UPLOAD_DUMP_DIR` copy vs "never persist uploads".
- KaTeX/MathLive line replaced by "not installed — propose like any dependency" (C3).
- Clarified there is no shared API client; `*Tab.tsx` slot exports; "don't `setState` during render" (an open bug).
- Adding a Feature: register routers behind `require_user`; hooks live in feature folders; docs to update = migration plan + README Features table + a changelog note.
- Link to `CLAUDE.md` removed (it created a cycle; architecture link now goes to `doc/context.md`).

### `CODE_OF_CONDUCT.md`
- Removed the link to `AGENT.md` in *Scope* (cycle; see §5). Wording otherwise unchanged.

### `doc/AUTH.md`
- "Open routes: `/api/auth/*`" was inaccurate: `/api/auth/me` requires sign-in (`require_user`). Listed the open routes exactly.
- Added cookie attributes (SameSite=Lax, HS256), that the client ID is served at runtime, and that dataset sessions are not tied to the user.
- Added the dev-stack backend host port (8097) and the non-Docker verification URL (`:8000`); mentioned the non-auth `.env` variables; "top bar" → "logo bar".
- Removed "Regression" from the gated tab list (the tab does not exist yet).

### `doc/context.md`
- Scope section claimed descriptive/inference/graphical/hypothesis were "awaiting migration" and that Inference shows a Normal PDF — all wrong (C1, C2, C23). Replaced with a per-tab table.
- License "MIT" (C16), React 18 (C19), FastAPI serving the build (C13), testing "planned", maturity "backend being set up" — all corrected.
- Added auth, dependency list from `package.json`/`requirements.txt`, run-mode table with ports, client-side parse + server upload, session-expiry caveat, CI scope.

### `doc/DESIGN_PROPOSAL.md`
- Header mock-up had no Probability tab and showed a theme toggle that does not exist; footer version `v0.1.2` vs app `0.1.0-alpha`; scratchpad and lesson LaTeX not built (C3).
- Component tree listed non-existent files (C9, C7) and "graphical (Planned)".
- Slot example used a non-existent `tabs/…/index.ts` and claimed LabBench wires slots; real pattern is `*Tab.tsx` exports + `App.tsx` lazy imports.
- Phases table was stale (descriptive "Web Worker", phases 1–5 shown as pending); replaced with a pointer to the migration plan.
- Performance "< 100 ms" (C14) and theme values corrected from `style.css` (dark only, indigo `#6366f1`, Inter).
- Front-end/back-end folder trees removed in favour of a link to `folder_duties.md` (removes a duplicate that had drifted).

### `doc/folder_duties.md`
- Rewritten from the real tree: C8, C9, C20, C21, C22, C23, C24. Added `math/`, `AuthContext`, `LoginGate`, test folders, top-level backend files.

### `doc/frontend_backend_interaction.md`
- "There is no login" (C12); JS approximation mode and 200 ms debounce (C14); `api/client.ts`/`ApiError` (C9); upload "Auth needed: No" (it needs sign-in).
- Endpoint table was missing probability, hypothesis and all auth routes; now complete.
- Session ID "sent in two places" — now precise: header is authoritative; body field only on some schemas. Missing-header case returns 400, not 404.
- Filter application location corrected (`api/deps.apply_filters` vs service loop).
- Added the dev/compose/prod proxy table and per-tab trigger table.
- Relative links to source files (`../frontend/vite.config.ts` etc.) changed to code-formatted paths, so they don't break wherever the docs folder lives.

### `doc/identity.md` (+ `doc/overview.md`)
- Both said the UI is "Powered by Reflex (React)" (C15) and promised "< 100 ms" updates (C14).
- identity said "JS computes quick approximations" — contradicts zero-frontend-math (C14).
- "We are Option 2: The Sandbox" referred to options that are not in any document; changed to "The Sandbox".
- Budget and Thai-context data are not implemented; marked *(vision)* rather than removed (C27).
- `overview.md` ended mid-section (truncated) and duplicated identity; its unique parts (project code, coarse/fine control, wireframe) were merged into identity. Name normalized to "Thotsakan Statistics".

### `doc/migration_plan.md`
- No single status table; added one (C26), including auth and Docker work that the plan never recorded.
- Principle 3 said "no JS approximations" without the `src/math/` exception (C14).
- Phase 3 note placed the JSON functions in `graphical_analysis.py` (C10).
- Phase 6 still ticked `useNormalPDF` as current (C7).
- Phase 5 now notes copying `core/linear_regression.py`, auth registration, tests, and the MathLive decision (C3).
- Phase 7: production config marked done via Docker/nginx (C13); added "tie sessions to user".
- pingouin note now matches `requirements.txt` (`>=0.5.4`).

### `doc/code_review.md`
- Dated 2026-04-22 and mostly superseded, but presented as current. Added a status table per finding (fixed / partly fixed / open) and kept the original text unchanged below it.

### `doc/descriptive_stats_flow.md`
- Describes the **Gradio** app (`state/app_state.py`, `gr.*` widgets) without saying so. Added a legacy banner listing the differences from the React app.

### UX reviews and mockup
- Undated proposals presented as current state. Added status banners. Checked against `DataTab.tsx`/`DescriptiveNotebook.tsx`: adopted — per-column filter blocks, value search (>10 values) with 50-value cap, separate Remove-dataset button, collapsible Formula Reference; not adopted — preview pagination (still first 50 rows).

### `changelogs/`
- Accurate as dated records; copied unchanged. (The google-auth note's "Credentials → OAuth client ID" path is the older Google Console UI; `AUTH.md` covers both.)

### Empty / removed
- `doc/details_descriptive_statistics.md` was 0 bytes — removed from the new set.

---

## 5. Circular references

**Old docs — cycles found** (Markdown links):

- `AGENT.md → CODE_OF_CONDUCT.md → AGENT.md` (2-page loop)
- `AGENT.md → CONTRIBUTING.md → CODE_OF_CONDUCT.md → AGENT.md` (3-page loop)

The old `doc/` pages mostly referred to each other in plain text ("see `doc/migration_plan.md`"); `DESIGN_PROPOSAL.md` and `context.md` both pointed at the migration plan and each other's topics, and `README`/`CLAUDE`/`CONTRIBUTING` all repeated the same tables, which is why they drifted apart.

**New docs — rule used:** every "go to / see" pointer is written as a Markdown link, and links only go "down" this order:

```
README.md → AGENT.md → CLAUDE.md → CONTRIBUTING.md → CODE_OF_CONDUCT.md
  → doc/README.md → doc/context.md → doc/frontend_backend_interaction.md
  → doc/DESIGN_PROPOSAL.md → doc/migration_plan.md → doc/known_issues.md
  → doc/code_review.md → leaves (identity, folder_duties, AUTH, descriptive_stats_flow,
     descriptive_stats_ux_review, data_tab_redesign_mockup → data_tab_large_data_ux_review)
```

`doc/` pages never link to root files. Plain-text file names that remain (for example "update the Features table in `README.md`" in `CONTRIBUTING.md`) are edit instructions, not navigation.

**Verification:** all 69 internal links in `NEW_DOCS/` (59 to other files, 10 in-page anchors) were extracted with `grep`; every target file exists, every anchor matches a heading, and the file graph has no cycle. During writing, a `known_issues.md ↔ code_review.md` loop appeared and was removed: `code_review.md` now has no outgoing links.

---

## 6. Missing information that was added

- Google sign-in in the architecture docs, the endpoint table, and getting-started steps (`.env` is required before the backend starts).
- Complete API endpoint table (15 routes) with auth/session requirements.
- How each tab triggers computation (live vs Run, debounce, abort).
- Ports and proxies for all three run modes.
- `requirements-dev.txt`, `pytest.ini`, `dev-start.sh`, `dev-playground/`, `UPLOAD_DUMP_DIR`, `BASE_REGISTRY`, `WEB_PORT`, `VITE_PROXY_TARGET`, `BACKEND_URL`.
- The real frontend stack (Tailwind 4, papaparse, jsPDF, react-error-boundary, `plotly.js-basic-dist-min`).
- Keyboard shortcuts and panel width limits.
- A documentation index (`doc/README.md`).
- A consolidated open-issue list (`doc/known_issues.md`). Items found during this check that weren't documented before: Descriptive never renders backend errors (`App.tsx` passes no `error` to its slots); `/api/auth/me` is gated, unlike the rest of `/api/auth/*`; dataset sessions are not tied to the user; CI doesn't run tests; no route tests for upload/inference/probability; leftover KaTeX/MathLive type declarations; unused `useContainerBreakpoint`; inference routes do data preparation.

---

## 7. Decisions for Win

1. **License.** There is no `LICENSE` file, and the old docs disagreed (MIT vs "contact the maintainers"). `NEW_DOCS` says "no license file yet".
2. **Adopting NEW_DOCS.** Copy `NEW_DOCS/*` over the originals and delete `doc/overview.md` and `doc/details_descriptive_statistics.md`, then decide whether to keep `LEGACY_DOCS/` in git or delete it. Not done here, because it overwrites and deletes files.

(Minor: the old `CLAUDE.md` tree was rooted at `thotsakan-stats/`. The new one uses `.`, because the checkout folder is `ThotsakanStatistics`.)
