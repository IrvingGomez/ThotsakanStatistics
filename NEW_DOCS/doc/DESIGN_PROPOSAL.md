# Thotsakan Statistics — UI Design

The design of the React app: layout, panel slot pattern, controls, theme and performance budget. It started as the React redesign proposal; it now describes what is built, and marks the remaining ideas as *(not built)*. Product principles behind it are in [`identity.md`](identity.md).

## 1. Context

| Component | Stack | Role |
|---|---|---|
| `frontend/` | TypeScript · React 19 + Vite 7 + Tailwind CSS 4 | **Active** — UI, interactive charts |
| `backend/` | Python · FastAPI | **Active** — authoritative statistical computation |
| `ThotsakanStatistics/` | Python · Gradio | **Read-only reference** (git-ignored, local only) — source of the `core/` math |
| `Try_reflex/` | Python · Reflex | **Read-only reference** (git-ignored, local only) — early layout prototype |

React handles the UI; all statistical computation runs in the Python backend, which wraps the professor's `core/` math. The professor verifies correctness by reading `backend/core/` directly.

---

## 2. Visual Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  LOGO BAR — Himmapan Lab, Thotsakan Statistics, CMKL, AICE logos ·           │
│             signed-in user · Sign out                                        │
│             (amber "Auth disabled (dev)" badge when AUTH_DISABLED=true)      │
├──────────────────────────────────────────────────────────────────────────────┤
│  HEADER (sticky) — Thotsakan Statistics   [Home] [Data] [Probability]        │
│                    [Estimation] [Hypothesis] [Linear Regression]             │
├──────────────────────────────────────────────────────────────────────────────┤
│  SUB-HEADER (Probability, Estimation only) — sub-tab ribbon                  │
│  e.g. Descriptive Statistics · Statistical Inference · Graphical Analysis    │
├────────────┬──────────────────────────────────┬──────────────────────────────┤
│  CONTROLS  │       OBSERVATION DECK           │        NOTEBOOK              │
│  (280 px)  │         (flex-grow)              │        (320 px)              │
│            │                                  │                              │
│  Selects,  │   Results toolbar (export)       │  Key numbers / verdict       │
│  DualInput │   Primary Plotly chart(s)        │  Interpretation text         │
│  sliders,  │   Secondary charts / tables      │  Collapsible details         │
│  switches  │                                  │                              │
│  Run/Reset │                                  │                              │
├────────────┴──────────────────────────────────┴──────────────────────────────┤
│  FOOTER — partner logos │ Analysis: <current view> │            v0.1.0-alpha │
└──────────────────────────────────────────────────────────────────────────────┘
```

Home and Data are full-width pages and do not use the three panels. Below a 1200 px viewport the three panels stack vertically.

*(not built)* A Markdown + LaTeX student scratchpad in the Notebook, a light/dark theme toggle, and a breadcrumb that names the current method (e.g. "Confidence Interval for Mean").

---

## 3. Component Architecture

The frontend and backend folder structure, file by file, is in [`folder_duties.md`](folder_duties.md). The design-relevant parts:

- `layout/` — `LogoBar`, `Header`, `SubHeader`, `LabBench`, `Footer`.
- `features/<area>/` — one folder per tab with `*Controls`, `*Observation`, `*Notebook`.
- `components/` — `DualInput`, `ControlPrimitives`, `AnalysisStatus`, `ResultToolbar`, `ExportMenu`, `DragHandle`, `CollapsedRail`, `LoginGate`.

---

## 4. Tab → Panel Slot Pattern

Each tab provides three components that slot into the fixed `LabBench` layout. The layout never changes — only the panel contents swap.

```tsx
// features/estimation/inference/InferenceTab.tsx
export function ControlsSlot({ state }: { state: InferenceState }) { … }     // → left panel
export function ObservationSlot({ state }: { state: InferenceState }) { … }  // → centre panel
export function NotebookSlot({ state }: { state: InferenceState }) { … }     // → right panel
```

```tsx
// App.tsx lazy-loads the slots and hands them to LabBench
const InferenceControlsSlot = lazy(() =>
  import('./features/estimation/inference/InferenceTab').then((m) => ({ default: m.ControlsSlot })))
…
<LabBench controls={controls} observation={observation} notebook={notebook} />
```

The tab's state hook (`useInferenceTabState()` etc.) lives in `App.tsx`, so switching tabs keeps each tab's state. Common Distributions is wired directly in `App.tsx` with `CommonDistControls` / `CommonDistObservation` / `CommonDistNotebook`.

---

## 5. DualInput Component Pattern

Every numeric parameter uses the same synced pair:

```
┌──────────────────────────────────┐
│  Mean (μ)                        │
│  <────────────●────────────>     │  ← slider (coarse): commits immediately
│  [ 5.23 ]                        │  ← text input (fine): commits after 400 ms, on blur or Enter
└──────────────────────────────────┘
```

Typing moves the slider and vice versa. Arrow keys step the value; values are clamped to the range and rounded to the step precision; invalid text is restored to the last committed value on blur.

---

## 6. User Flow

```
App loads → sign in with a @cmkl.ac.th Google account
    │
    ▼
Home tab ──► Data tab: upload a CSV, fix column types, set filters and precision
    │
    ▼
Student picks a tab (header) and a sub-tab (ribbon)
    │
    ▼
LabBench shows Controls / Observation / Notebook
    │
    ├── Moves a slider or presses Run
    │       └── loading state → backend result renders (~250 ms debounce + request)
    ├── Reads the Notebook interpretation
    └── Exports PNG / CSV / PDF, or resets to defaults
```

---

## 7. Implementation Phases

The phase-by-phase migration plan and the authoritative status table are in [`migration_plan.md`](migration_plan.md). In short: every tab is built except Linear Regression, Custom Distribution and Approximations.

---

## 8. Performance Budget

| Interaction | Target |
|---|---|
| Slider → provisional preview (distributions only) | immediate |
| Slider → debounce fires | ~250 ms after last move |
| Backend result | < 500 ms typical, < 2 s with bootstrap |
| Tab switch | < 200 ms (lazy loaded) |
| Initial page load | < 2 s |

---

## 9. Theme

| Element | Decision |
|---|---|
| Mode | **Dark only** (lab instrument aesthetic); no light theme yet |
| Primary accent | Indigo (`#6366f1`, hover `#4f46e5`) |
| Base / panel background | `#0b1020` / `#111827` |
| Font — UI | Inter (system-ui fallback) |
| Panel borders | Subtle (`#1f2937`), no heavy cards |
| Border radius | Small (≈ 6–8 px) — technical feel |
| Panel dividers | Draggable resize handles; collapsed panels show a 40 px rail |

Colors are CSS custom properties in `frontend/src/style.css`.
