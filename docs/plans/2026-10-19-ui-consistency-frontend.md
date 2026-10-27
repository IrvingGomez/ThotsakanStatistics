# UI Consistency (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every analysis tab reports status, warnings, empty states, tables, headings and chart colors through the same shared pieces, and filler text is gone.

**Architecture:** First the shared pieces in `frontend/src/components` and `plot/theme.ts` are settled (one status banner, one empty state, one table, one section heading, one chart palette). Then each tab is switched over to them, one tab per task. No backend changes in this plan.

**Tech Stack:** React 19, TypeScript, Tailwind 4, Plotly (react-plotly.js), Vitest + jsdom.

**Spec:** `C:\Users\Dmitri\Documents\Thotsakan-Consistency-Review.pdf` (items 1–18; "Proposed fix" column approved by the user on 2026-10-19) and `docs/interaction_contract.md`. Items 19–22 (backend, docs) get their own plans.

## Global Constraints

- Branch `irving-reviewing-experiment` only. No new branches. Commit only after the user checks the checkpoint in the app.
- No new dependencies. No `any` in new code, `import type` for types, no `enum` (AGENT.md).
- Zero frontend math (AGENT.md); the Probability provisional preview stays as is.
- No text under 12 px (contract rule 17). Plot fonts 12.
- Colors only from `style.css` variables and `plot/theme.ts` — no hex literals in feature files.
- Results update automatically; no Run button, no "Settings changed" message, no "Results update automatically." sentence.
- Left panel = inputs only; center = summary line, warnings, results, export; right = technical details and formulas only (contract rules 14–15).
- Tests and build run inside the dev container:
  - `docker compose -f docker-compose.dev.yml exec -T frontend npx vitest run <files>`
  - `docker compose -f docker-compose.dev.yml exec -T frontend sh -c "npx tsc && npx vite build --outDir /tmp/buildcheck"`
  - The full suite may print "Failed to start forks worker… Timeout" on this machine; rerun the named files with `--maxWorkers=1`. That is not a test failure.

## Review Focus

1. A tab whose request fails must show the shared error box with Retry (Probability had none) — test in Task 4.
2. A dataset loaded but without numeric columns shows the "no numeric variables" message in center *and* right panel of every tab — covered by the `EmptyState` test (Task 1) and each tab task's empty-state assertion.
3. A warning must stay on screen while its cause stays (Descriptive's vanished after 6 s) — test in Task 5.
4. Changing Data → Display precision changes every number in Probability and Descriptive notebooks — tests in Tasks 4 and 5.
5. Exports stay disabled while a newer result is pending, even though the "Settings changed" text is gone (Hypothesis still uses `isDirty` for this) — existing `HypothesisObservation.test.tsx` export test must keep passing in Task 3.

---

## Phase 1 — Shared pieces

### Task 1: One status banner and one empty state

**Files:**
- Modify: `frontend/src/components/StatusBanner.tsx` (absorb `AnalysisStatus`)
- Delete: `frontend/src/components/AnalysisStatus.tsx`
- Modify: `frontend/src/style.css` (status tokens)
- Test: `frontend/src/components/StatusBanner.test.tsx`

**Interfaces:**
- Produces:
  - `default StatusBanner(props: { isComputing: boolean; error: string | null; hasResult: boolean; onRetry?: () => void; resultNotice?: string; summary?: string | null; warnings?: readonly string[] })` — no `isDirty`, no `dirtyMessage`, no `children`.
  - `summaryLine(parts: readonly (string | number | null | undefined | false)[]): string` — joins the truthy parts with `' · '`.
  - `EmptyState(props: { loaded: boolean; hasData: boolean; compact?: boolean })` — replaces both old `EmptyState` and `NoDataState`.
  - CSS classes `.status-warning`, `.status-error` in `style.css`, built on new variables `--color-warning-bg/-border/-text` and `--color-error-bg/-border/-text`.

- [ ] **Step 1: Rewrite `StatusBanner.test.tsx`** with these tests:
  - `shows the summary line only when a result exists`: `summary="data.csv · x · n = 10"` and `hasResult` → text present; `hasResult={false}` → absent.
  - `summaryLine drops empty parts`: `summaryLine(['a.csv', null, 'x', false, 'n = 3'])` → `'a.csv · x · n = 3'`.
  - keep the existing error/Retry test and the warnings test; add `has no settings-changed message`: render with every prop set, `textContent` never contains `'Settings changed'`.
  - `EmptyState` texts (exact copy):
    - `loaded={false}` → `'Load a dataset in the Data tab to see results.'`
    - `loaded hasData={false}` → `'This dataset has no numeric variables. Check the column types in the Data tab.'`
    - `loaded hasData` → `'Choose the settings in the left panel to see results.'`
  - keep the NotebookParts test.
- [ ] **Step 2: Run** `npx vitest run src/components/StatusBanner.test.tsx` → FAIL (`summaryLine` not exported, old wording).
- [ ] **Step 3: Implement.** Error box uses `.status-error`, warnings list uses `.status-warning` (no emoji, no dismiss, no timer). Summary is one `<p>` in muted text, shown only when `hasResult`. `EmptyState` uses no emoji; `compact` only changes height. Delete `AnalysisStatus.tsx`. Keep the build green: in every caller, rename `NoDataState` → `EmptyState` (`hasData={false}`), old `EmptyState message=…` → `EmptyState loaded hasData`, and Hypothesis's `AnalysisStatus` → `StatusBanner` (its `children` lines dropped for now). The tab tasks then finish each tab.
- [ ] **Step 4: Run** the test file → PASS; run the build → PASS.

### Task 2: One table, one section, one chart palette

**Files:**
- Create: `frontend/src/components/ResultTable.tsx`, `frontend/src/components/ResultTable.test.tsx`
- Modify: `frontend/src/components/notebook/NotebookParts.tsx`
- Create: `frontend/src/components/ResultSection.tsx`
- Modify: `frontend/src/plot/theme.ts`
- Delete: `frontend/src/hooks/useContainerBreakpoint.ts` (unused, item 18)
- Modify: `frontend/src/style.css` (the `text-[10px]`/`text-[11px]` override is removed in Task 7)

**Interfaces:**
- Produces:
  - `ResultTable(props: { caption: string; columns: readonly { key: string; label: string; align?: 'left' | 'right' }[]; rows: readonly { group?: string; cells: Record<string, ReactNode> }[] })`. Style copied from Descriptive's `StatsTable` (header row, thin row borders, mono right-aligned numbers). A row's `group` picks its tint from `TABLE_GROUP_TINTS` and the group name is printed in the first column on the first row of each run, exactly as Descriptive does today. Rows without a `group` get no tint: tables whose rows have no statistic type (Hypothesis detailed output, Graphical histogram bins) share the frame, header, borders and fonts but stay uncolored (user decision, 2026-10-19).
  - `TABLE_GROUP_TINTS: Readonly<Record<string, { row: string; text: string; label: string }>>` exported from `ResultTable.tsx`, holding Descriptive's current five entries (`Extremes` rose, `Quantiles` violet, `Central Tendency` blue, `Dispersion` emerald, `Shape` amber) — the user asked to keep these colors.
  - `ResultSection(props: { title: string; note?: string; actions?: ReactNode; children: ReactNode })` — the center-panel block heading: `h3` `text-base font-semibold`, optional one-line muted `note`, optional `actions` on the right (Inference's zoom button). No card, no border.
  - `NotebookParts.Section` stays the one right-panel heading (grey, uppercase). `Row` value color is `--color-text` (never accent). Add `Formula(props: { label: string; children: ReactNode })`: muted 12 px label over a mono 12 px line.
  - `PLOT_COLORS` gains: `mean: '#818cf8'`, `median: '#a5b4fc'`, `highlight: '#6366f1'`, `highlightFill: 'rgba(99,102,241,0.25)'`, `inactive: '#334155'`, `statistic: '#e5e7eb'`, `hoverBg: '#1e293b'`, `hoverBorder: '#475569'`. `PLOT_FONT.size` stays 12; `baseLayout` adds `hoverlabel` from these.
- [ ] **Step 1: Write `ResultTable.test.tsx`**: `prints a group label once per run` (two `Shape` rows → the label `Shape` appears once); `renders caption and headers` (caption text, header labels in order); `rows without group have no tint class`.
- [ ] **Step 2: Run** → FAIL (module missing).
- [ ] **Step 3: Implement** the three components and the theme additions; delete `useContainerBreakpoint.ts`.
- [ ] **Step 4: Run** `ResultTable.test.tsx` and `StatusBanner.test.tsx` → PASS; build → PASS.

**Checkpoint A:** run the full suite and build, report results, user opens the app (nothing visible changes yet except status/empty wording). Commit on approval: `refactor(ui): shared status, empty state, table, section and chart palette`.

---

## Phase 2 — Tabs onto the shared pieces

Every tab task ends with the same three checks: (1) no hex/rgba literal and no `text-[8–11px]` left in the tab's files (`grep -nE "#[0-9a-fA-F]{3,6}\b|rgba\(|text-\[(8|9|10|11)px\]"` prints nothing); (2) the tab's tests pass; (3) build passes. Each tab is its own checkpoint: user looks at that tab, then commit `refactor(<tab>): use shared UI pieces` (or `fix(...)` where a bug is fixed).

### Task 3: Hypothesis Testing (items 1, 2, 3, 4, 6, 10, 12, 13, 17)

**Files:** `features/hypothesis/HypothesisTab.tsx`, `HypothesisControls.tsx`, `HypothesisObservation.tsx`, `HypothesisNotebook.tsx`, `App.tsx` (drop `onOpenColumnTypes` for this tab), tests `useHypothesisTabState.test.tsx`, `HypothesisObservation.test.tsx`.

**Interfaces:** Consumes Task 1–2 exports. `useHypothesisTabState` keeps `isDirty` (exports use it) but nothing renders it.

- [ ] **Step 1: Update tests first:**
  - `useHypothesisTabState.test.tsx`: replace the `'Open Data'` / `'Open Column Types'` assertions with `expect(container.textContent).not.toContain('Open Data')` and the hint text `'Check the column types in the Data tab.'`; add `never shows the settings-changed message` after a draft change; add `does not print 'Results update automatically'`.
  - `HypothesisObservation.test.tsx`: keep the export-disabled-while-dirty test; add `shows backend warnings above the plot` (result with `warnings: ['Group 2 has n < 5']` → found inside `[aria-label="Warnings"]` in the observation slot, not in the notebook).
- [ ] **Step 2: Run** both files → FAIL.
- [ ] **Step 3: Implement:**
  - `HypothesisTab.tsx`: center uses `StatusBanner` with `summary={summaryLine([filename, column, testType, 'n = ' + filteredN, 'α = ' + alpha])}` and `warnings={result?.warnings}`; the notebook renders no status at all; empty states use `EmptyState`.
  - Controls: remove the Open Data/Open Column Types buttons and the per-test description line; the no-categorical case becomes a plain hint `'Mark a grouping column as categorical in Data → Column Types.'` (no button); remove the "Results update automatically." line.
  - Observation: drop local color constants and `BASE_LAYOUT`; use `baseLayout`, `PLOT_AXIS`, `PLOT_CONFIG` and `PLOT_COLORS.reject/rejectLine/pValue/reference/statistic`; legend swatches styled from the same values via inline `style` (no Tailwind palette classes); annotation font 12; heading via `ResultSection`.
  - Notebook: shared `Section`/`Row` for Hypotheses, Result, Groups; Warnings section removed (they are in the center now); "Detailed output" uses `ResultTable` (no groups) inside the existing `<details>`.
- [ ] **Step 4: Run** tests → PASS; three checks.

### Task 4: Probability (items 7, 9, 10, 11, 13, 14, 15)

**Files:** `features/probability/common/CommonDistControls.tsx`, `CommonDistObservation.tsx`, `CommonDistNotebook.tsx`, `App.tsx`, `hooks/useDistribution.test.tsx`; create `features/probability/common/CommonDist.test.tsx`.

**Interfaces:** Consumes `error` already returned by `useDistribution`; App passes `error` and `precision={data.displayPrecision}` to observation and notebook.

- [ ] **Step 1: Write `CommonDist.test.tsx`:** `shows the shared error box with Retry when the request fails` (observation with `error="boom"` → `'Couldn’t update results'` and `boom`); `left panel holds no result` (controls render without any `P(X` text); `notebook has parameters and formula but no Key Properties` (no `'Key Properties'`, contains `'Support'`); `numbers follow display precision` (precision 2, `theorMean: 1.23456` → `'1.23'` in the cards, notebook does not repeat it).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement:** `useDistribution` gets a `retry()` that re-sends the last params (add a test in `useDistribution.test.tsx`: after a failing fetch, `retry` calls fetch again). Observation shows `StatusBanner` (`summary` = distribution name with its parameters, e.g. `'Normal · μ = 0 · σ = 1'`), then the three cards (flat, `--color-bg-input`, no `#1e1b4b`), then the chart in a `ResultSection`; all numbers `toFixed(precision)`. Controls: delete the live result box and the `queryResult` prop. Notebook: `Section` "Parameters" (rows), `Section` "Formula" (`Formula` rows for density/mass, support, parameter ranges); `DistNotes` deleted; no accent/amber/emerald headings. Chart colors from `PLOT_COLORS.highlight/highlightFill/inactive/reference`.
- [ ] **Step 4: Run** → PASS; three checks.

### Task 5: Descriptive Statistics (items 6, 10, 12, 13, 14, 16, 18)

**Files:** `features/estimation/descriptive/*` (all six), `App.tsx`, tests `DescriptiveControls.test.tsx`, `useDescriptiveTabState.test.tsx`; create `DescriptiveNotebook.test.tsx`.

**Interfaces:**
- Produces: `useDescriptiveTabState()` returns `{ draft, setDraft, fieldErrors, result, config, isComputing, error, handleRetry, handleReset, hasData, loaded, precision, summary: string | null, warnings: string[] }` — the same draft/setDraft shape the Inference and Hypothesis hooks use, so `DescriptiveControls` becomes a pure view (`{ state }` prop) like `InferenceControls`. `DescriptiveTab.tsx` slots take `{ state }`.
- Draft fields = today's local state in `DescriptiveControls` (`column, weightsCol, quantilesRaw, trimRaw, winsorRaw, showConsistencyCorr, selected, basicOpen, advancedOpen`). Request key and display-only behavior stay exactly as in `requestKey` today.

- [ ] **Step 1: Tests first:** move the validation cases from `DescriptiveControls.test.tsx` into `useDescriptiveTabState.test.tsx` as hook tests (same inputs, same messages, now in `fieldErrors`); add `warnings stay until the result changes` (fake timers, advance 10 s, warning still rendered in `[aria-label="Warnings"]`, each formatted `'<measure>: <warning>'`); `DescriptiveNotebook.test.tsx`: `has no data story` (no `'So what?'`, no `'Technical Details'`), `uses display precision` (precision 2 and a result whose rows hold `1.23456` → the notebook shows `1.23` and never `1.235`; the c₄ factor keeps its fixed 6 decimals).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement:** move state into the hook; Controls render from `state` (validation messages under the field via `error`, no extra red paragraph); the "Weighted mean needs a weights column" note becomes the weights field `hint`. Observation: delete `WarningSnackbar` and the ⚠ badge; `StatsTable` → `ResultTable` with `group = row.category` (keeps today's colors through `TABLE_GROUP_TINTS`); Robust tag 12 px; chart uses `baseLayout` and `PLOT_COLORS.data/mean/median/outlier`, annotation fonts 12, inside `ResultSection` titled "Distribution". Notebook: `Section` "Sample" (variable, weights, rows filtered/raw, n, missing removed), `Section` "Consistency correction" (when shown), `Section` "Formulas" (shared `Formula`) — `generateNarrative`, `generateInterpretation`, `NarrativeCard`, `SoWhatCallout`, local `Section/Row/Bullet` deleted. Center `StatusBanner` with `summary` and `warnings`.
- [ ] **Step 4: Run** → PASS; three checks.

### Task 6: Statistical Inference (items 3, 5, 6, 8, 17)

**Files:** `features/estimation/inference/InferenceControls.tsx`, `InferenceResultStatus.tsx`, `InferenceObservation.tsx`, `InferenceNotebook.tsx`, test `useInferenceTabState.test.tsx`.

- [ ] **Step 1: Tests:** `notebook shows no status block` (notebook text has no `'Run settings'` and no file name); `estimator load failure is a warning above the results` (mock `getEstimators` reject → text inside observation `[aria-label="Warnings"]`, not in controls); `Estimate is a radio group` (`getAllByRole('radio')` has the two options).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement:** `InferenceResultStatus` → one `summary` (`summaryLine([filename, column, 'n = ' + n, coverage, filterCount && filterCount + ' filters'])`), no `<details>`; rendered only in the center. Estimate select → `RadioGroup`. Remove: the sentence under Estimate, the regions note under coverage levels, `'. Each interval has its own coverage; no correction across rows.'` from the α hint (keep `confidenceReadout`), the "Lines show interval bounds…" paragraph, the region paragraph, the notebook card subtitles, the notebook `h2` title. Section titles via `ResultSection`; the zoom note becomes `ResultSection.note` in muted color (no amber). Notebook empty state → `EmptyState`.
- [ ] **Step 4: Run** → PASS; three checks.

### Task 7: Graphical Analysis, and final sweep (items 3, 5, 6, 8, 12, 13)

**Files:** `features/estimation/graphical/GraphicalTab.tsx`, `GraphicalControls.tsx`, `GraphicalObservation.tsx`, `GraphicalNotebook.tsx`, `useGraphicalTabState.ts`, test `useGraphicalTabState.test.tsx`; `style.css`.

- [ ] **Step 1: Tests:** `Graph type uses the shared radio group` (legend text `'Graph'` comes from `RadioGroup`'s legend); `summary is one line and only in the center` (no `'Applied graph settings'`, notebook has no file name); `estimator notice is a warning above the plot`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement:** hand-made radio list → `RadioGroup`; `appliedContext` + `appliedSettings` → one `summary` string (`file · column · graph type · n · filters`); `estimatorNotice` joins `warnings`; histogram-bins table → `ResultTable`; empty states → `EmptyState`. Then remove the `text-[10px]/[11px]` override from `style.css` and confirm `grep -rnE "text-\[(8|9|10|11)px\]" frontend/src` prints nothing.
- [ ] **Step 4: Run** the full suite (rerun timeouts with `--maxWorkers=1`) and build → PASS.

**Final checkpoint:** user walks all five tabs; commit; then write the backend plan (items 19–21) and the docs plan (item 22).

**Continued in [`2026-10-23-v1-release.md`](2026-10-23-v1-release.md)** (Tasks 1–7 done; remaining work, v1 scope and backlog).
