# Design: Identity and UI

> **"Stop Calculating. Start Simulating."** · Project code **THOTSAKAN-LAB**, "The 10-Armed Laboratory"

How the app looks and behaves. What was decided and why is in [`decisions.md`](decisions.md); the rules every
tab follows are in [`interaction_contract.md`](interaction_contract.md). When this page and those two
disagree, they win.

## 1. What the app is

Thotsakan Statistics (ทศกัณฐ์ สถิติ) is an **analysis tool** in the style of jamovi / JASP, for students and
staff at CMKL. It reports numbers and draws plots, and the user makes every decision: no verdicts, no lessons,
no teaching flow. Results update by themselves as the user changes a setting.

The giant **Thotsakan** has 10 faces and 20 arms to see and control the world from every angle. The app gives
its users "10 arms" (sliders, toggles, selectors) to change the variables and watch the data respond.

**Later (not built):** a guided-teaching layer on top of the tool: a sandbox where students break assumptions
and learn from simulations (Monte Carlo, bootstrapping), sampling budgets, Thai-context datasets (Lotto,
PM2.5, Grab) and Thai / English text. It is listed in [`roadmap.md`](roadmap.md) and needs its own decisions
before it is built.

## 2. Three panels

Every analysis screen has three panels (the code calls them `Controls`, `Observation` and `Notebook`):

| Panel | Holds | Rules |
|---|---|---|
| **Left** (280 px) | Inputs only: variable, what to show, then one Settings section, then Reset | Every number has coarse (slider) and fine (typed) control. No Run button. |
| **Center** (flexible) | Tables at the top, Plotly plots below, export toolbar | Status (computing, error, warnings) shows here, in the shared `StatusBanner`. Charts are interactive (hover, zoom). |
| **Right** (320 px) | Formulas, definitions and procedures of what is on screen (KaTeX), then a closing "Values" section | Only what is on screen. Formulas are copied from `backend/core/`. |

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ LOGO BAR — Himmapan Lab · Thotsakan · CMKL · AICE · user · Sign out          │
│            (amber "Auth disabled (dev)" badge when AUTH_DISABLED=true)       │
├──────────────────────────────────────────────────────────────────────────────┤
│ HEADER — [Home] [Data] [Probability] [Statistics] [Hypothesis Testing]       │
│          [Linear Regression]                                                 │
│ SUB-HEADER (Probability, Statistics) — sub-tab ribbon                        │
├────────────┬──────────────────────────────────┬──────────────────────────────┤
│ LEFT       │ CENTER                           │ RIGHT                        │
├────────────┴──────────────────────────────────┴──────────────────────────────┤
│ FOOTER — partner logos │ Analysis: <current view> │                  version │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Home and Data are full-width pages without the three panels.
- Side panels can be resized (drag handles), collapsed to a 40 px rail, and toggled with `Ctrl/⌘+B` and `Ctrl/⌘+J`. Widths persist in `localStorage` (`thotsakan-sidebar-state`).
- Below a 1200 px viewport the panels stack vertically.

### Slot pattern

The layout never changes. Each tab only supplies the three panel contents:

```tsx
// features/estimation/inference/InferenceTab.tsx
export function ControlsSlot({ state }: { state: InferenceState }) { … }
export function ObservationSlot({ state }: { state: InferenceState }) { … }
export function NotebookSlot({ state }: { state: InferenceState }) { … }

// App.tsx lazy-loads the slots and passes them to <LabBench controls observation notebook />
```

Common Distributions is the exception: it is wired directly in `App.tsx` with `CommonDistControls` / `Observation` / `Notebook`.

## 3. DualInput

Every numeric parameter uses `components/DualInput.tsx`:

```
Mean (μ)
<────────────●────────────>   ← slider: commits immediately
[ 5.23 ]                      ← text: commits after 400 ms, on blur or Enter
```

Arrow keys step the value. Values are clamped to the range and rounded to the step precision. Invalid text reverts to the last committed value on blur.

## 4. Theme

| Element | Value (CSS custom properties in `frontend/src/style.css`) |
|---|---|
| Mode | Dark only |
| Accent | Indigo `#6366f1` (hover `#4f46e5`) |
| Background / panel | `#0b1020` / `#111827`; borders `#1f2937` |
| Font | Inter, system-ui fallback; small text 14 px, nothing under 12 px |
| Plot colors | `frontend/src/plot/theme.ts` only: one meaning per color (mean blue, median green, deviation amber, prediction rose, KDE purple, normal model orange) |
| Radius | ≈ 6–8 px; subtle borders, no heavy cards |

## 5. Performance budget

| Interaction | Target |
|---|---|
| Slider → provisional preview (distributions only) | Immediate |
| Slider → debounce fires | ~250 ms after the last move |
| Any other setting → request | ~250 ms after the last change (~700 ms while bootstrap is on) |
| Backend result | < 500 ms typical, < 2 s with bootstrap |
| Tab switch | < 200 ms (lazy-loaded) |
| Initial page load | < 2 s |

Plotly is lazy-loaded (`React.lazy` + `Suspense`), and the bundle is split into `react-vendor` and `plotly-vendor` chunks. The Plotly chunk is about 1.6 MB, so the first load is the slowest.
