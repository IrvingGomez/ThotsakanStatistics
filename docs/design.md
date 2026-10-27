# Design: Identity and UI

> **"Stop Calculating. Start Simulating."** · Project code **THOTSAKAN-LAB**, "The 10-Armed Laboratory"

This page is the product law. If a feature doesn't fit the lab identity, we don't build it. Items marked *(vision)* aren't implemented yet.

> **Scope for the December release:** the version deployed to Apex is an *analysis tool* in the style of jamovi / JASP. It reports numbers and plots, and the user makes every decision. The guided reveal flow, notebook reflection prompts and gamification described below are next semester's work. The rules every tab follows are in [`interaction_contract.md`](interaction_contract.md).

## 1. Vision

Thotsakan Statistics (ทศกัณฐ์ สถิติ) is not a calculator. It is a web-based **virtual statistics laboratory** for Thai university students. Statistics is about intuition, not memorizing formulas. Students should touch, break and manipulate data the way scientists do, instead of only listening.

The giant **Thotsakan** has 10 faces and 20 arms to see and control the world from every angle. The app gives students "10 arms" (sliders, toggles, selectors) to change the variables and watch the data respond.

- We don't give answers. We give tools.
- We don't check homework. We test hypotheses.
- We don't lecture. We let students fail safely.

| We are… | We are not… |
|---|---|
| A **sandbox** where you break things to learn | A textbook with one correct path |
| A **simulator** (Monte Carlo, bootstrapping) | A calculator (input X, get Y) |
| **Visual first**: graphs before numbers | Formula first |
| **Budget-based**: samples cost something *(vision)* | Infinite |
| **Thai-contextualized**: Lotto, PM2.5, Grab *(vision)* | Western-imported: baseball stats, dice |

**Audience:** visual learners who struggle with Greek notation but see patterns at once, and lecturers who would rather project a simulation than draw a curve by hand.

**Tone:** scientific but accessible (correct terms, simple explanations). Challenging: we say "Hypothesis confirmed", not "Good job!". Written for Thai students, with data from their world.

**Never build:** a photo-solver for homework, multiple-choice quizzes, or walls of static text. If something takes more than three sentences to explain, build a simulation for it.

## 2. Control → Observe → Log

Every analysis screen is a **lab bench** with three panels:

| Panel | Role | Rules |
|---|---|---|
| **Controls** (Thotsakan's hands, 280 px) | Selects, DualInput sliders, switches, Run/Reset | Every number has coarse (slider) and fine (typed) control. *(vision)* A budget, e.g. "1,000 Baht, 10 Baht per sample". |
| **Observation** (Thotsakan's eyes, flexible) | Plotly charts, export toolbar | **Show, don't tell** *(guided mode, after December; the December analysis tool always shows its numbers and never declares a verdict)*. Charts are interactive (hover, zoom); no static images. |
| **Notebook** (Thotsakan's brain, 320 px) | Key numbers, verdict, interpretation, collapsible details | We don't grade. December: technical details, assumptions checked and formula reference. *(Guided mode, after December: an interpretation and a prompt such as "You increased n to 10,000. Why did the curve narrow?")* |

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ LOGO BAR — Himmapan Lab · Thotsakan · CMKL · AICE · user · Sign out          │
│            (amber "Auth disabled (dev)" badge when AUTH_DISABLED=true)       │
├──────────────────────────────────────────────────────────────────────────────┤
│ HEADER — [Home] [Data] [Probability] [Estimation] [Hypothesis] [Lin. Regr.]  │
│ SUB-HEADER (Probability, Estimation) — sub-tab ribbon                        │
├────────────┬──────────────────────────────────┬──────────────────────────────┤
│ CONTROLS   │ OBSERVATION                      │ NOTEBOOK                     │
├────────────┴──────────────────────────────────┴──────────────────────────────┤
│ FOOTER — partner logos │ Analysis: <current view> │             v0.1.0-alpha │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Home and Data are full-width pages without the three panels.
- Side panels can be resized (drag handles), collapsed to a 40 px rail, and toggled with `Ctrl/⌘+B` and `Ctrl/⌘+J`. Widths persist in `localStorage` (`thotsakan-sidebar-state`).
- Below a 1200 px viewport the panels stack vertically.
- *(not built)* A Markdown + LaTeX scratchpad in the Notebook, a light theme, and a breadcrumb naming the current method.

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
| Mode | Dark only (lab-instrument look) |
| Accent | Indigo `#6366f1` (hover `#4f46e5`) |
| Background / panel | `#0b1020` / `#111827`; borders `#1f2937` |
| Font | Inter, system-ui fallback |
| Radius | ≈ 6–8 px; subtle borders, no heavy cards |

## 5. Performance budget

| Interaction | Target |
|---|---|
| Slider → provisional preview (distributions only) | Immediate |
| Slider → debounce fires | ~250 ms after the last move |
| Backend result | < 500 ms typical, < 2 s with bootstrap |
| Tab switch | < 200 ms (lazy-loaded) |
| Initial page load | < 2 s |

Plotly is lazy-loaded (`React.lazy` + `Suspense`), and the bundle is split into `react-vendor` and `plotly-vendor` chunks.
