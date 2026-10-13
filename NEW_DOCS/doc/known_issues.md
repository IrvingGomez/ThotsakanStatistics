# Known Issues

Open defects, gaps and documentation caveats, checked against the code on 2026-10-13. Each item names the evidence so it can be re-checked. When you fix one, delete it here and add a dated note under `changelogs/`.

## Correctness

### 1. Weighted analyses can misalign weights after filtering or dropping NaNs
- **Evidence:** `backend/services/descriptive.py:60-61` drops NaNs from the analysis column and from the weights column independently. `backend/api/routes/inference.py` (`/ci`, `/pi`, `/regions`) takes `df[column].dropna()` but passes `df[weights_column]` without re-aligning it.
- **Effect:** with missing values, weighted descriptive or inference results can be wrong or raise.
- **Fix direction:** build one filtered frame, drop rows missing either the column or the weights, and pass aligned arrays. Add tests for missing values in data only, weights only, and both.
- First reported in the 2026-04-22 [code review](code_review.md) (finding 2).

## Data and sessions

### 2. Dataset session expiry is not surfaced in the UI
- **Evidence:** `backend/sessions/store.py` expires datasets 30 minutes after last access; the Data tab keeps showing the locally parsed table.
- **Effect:** after a pause, every analysis fails with "Session expired or not found. Please upload the dataset again." (HTTP 404) while the data still looks loaded.

### 3. Frontend and backend disagree on upload formats
- **Evidence:** `frontend/src/features/data/DataTab.tsx` accepts `.csv,.tsv,.txt`; `backend/api/routes/data.py` rejects any filename not ending in `.csv` and always uses `pd.read_csv` with the default comma delimiter.
- **Effect:** a TSV previews fine in the browser and then fails to upload. First reported in the [code review](code_review.md) (finding 7).

### 4. Dataset sessions are not tied to the signed-in user
- **Evidence:** `get_session_data` in `backend/api/deps.py` looks up the `x-session-id` header only.
- **Effect:** any signed-in user who knows a session ID can read that dataset. Low risk (random UUIDs) but worth closing.

## Frontend

### 5. `LabBench` calls `setState` during render
- **Evidence:** `frontend/src/layout/LabBench.tsx` syncs dragged widths back into persisted state in the render body ("We check on every render").
- **Fix direction:** move the sync into an effect. First reported in the [code review](code_review.md) (finding 6).

### 6. Descriptive tab never shows backend errors
- **Evidence:** `useDescriptiveTabState` sets `error`, but `App.tsx` passes no `error` to the Descriptive slots and nothing in `features/estimation/descriptive/` renders it. (Inference, graphical and hypothesis use `AnalysisStatus` / their own status and do show errors.)
- **Effect:** a failed request (e.g. expired session, issue 2) just stops the spinner with no message. First reported in the [code review](code_review.md) (finding 5).

### 7. Leftover declarations for packages that are not installed
- **Evidence:** `frontend/src/react-plotly.d.ts` declares `katex/dist/katex.min.css`; `frontend/src/custom-elements.d.ts` declares MathLive's `<math-field>`. Neither `katex` nor `mathlive` is in `frontend/package.json`.
- **Effect:** none at runtime; misleading to readers. Earlier docs described KaTeX/MathLive as part of the stack.

### 8. Unused hook
- **Evidence:** `frontend/src/hooks/useContainerBreakpoint.ts` is not imported anywhere. LabBench uses a `matchMedia('(max-width: 1199px)')` check instead.

## Backend

### 9. `core/data_stats.py` imports `gradio`
- **Evidence:** line 3 `import gradio as gr`; `gradio` is not in `requirements.txt`; nothing in the backend imports `data_stats`.
- **Effect:** importing the module fails. It is a legacy copy of the professor's helper, kept for reference. First reported in the [code review](code_review.md) (finding 10).

### 10. Inference routes do data preparation
- **Evidence:** `backend/api/routes/inference.py` selects the column, drops NaNs and picks the weights before calling the service.
- **Effect:** goes beyond the "thin route" rule and is where part of issue 1 lives. Moving it into `services/inference.py` would fix both.

## Testing and CI

### 11. CI does not run the test suites
- **Evidence:** `.github/workflows/docker.yml` builds images and smoke-tests `/` and `/api/health` only.
- **Effect:** `pytest`, `npm run test` and `npm run build` are only run locally.

### 12. Frontend test status not re-verified
- The 2026-10-06 Google-auth changelog reported 2 failing tests in `LabBench.test.tsx` that predate that change. This was not re-checked on 2026-10-13 (dependencies were not installed in the checkout used for the docs review).

### 13. No API tests for some routes
- **Evidence:** `backend/tests/api/` covers auth, descriptive, graphical and hypothesis; there are no route tests for data upload, inference or probability (their logic is covered by core/service tests where present).

## Project

### 14. No license file
- **Evidence:** no `LICENSE` in the repository. Older docs disagreed (one said MIT, another "contact the maintainers").
- **Needs:** a maintainer decision.
