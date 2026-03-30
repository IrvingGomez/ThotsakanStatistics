# Thotsakan Statistics — React Redesign Proposal

## 1. Context

Three projects exist in this workspace:

| Project | Stack | Role |
|---|---|---|
| `ThotsakanStatistics` | Python · Gradio | Full stats engine — source of all computation logic |
| `Try_reflex` | Python · Reflex | Layout prototype — 3-panel "lab bench" feel, no stats yet |
| `try-react` | TypeScript · React + Vite | **Target** — final redesign goes here |

The **Try_reflex** layout (Controls / Observation / Notebook columns, dark background, no rigid navbar) is the spatial model to follow. The goal is to bring that feel into React with a proper sticky header, then port the stats engine from `ThotsakanStatistics` over time.

---

## 2. Visual Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  HEADER BAR (sticky, 56px)                                                   │
│  🔱 Thotsakan Statistics   [Home] [Estimation] [Hypothesis] [Regression]     │
│                                                   [Data]  [☀/🌙]            │
├──────────────────────────────────────────────────────────────────────────────┤
│  SUB-HEADER / BREADCRUMB (32px, context-aware)                               │
│  Estimation ▸ Inference ▸ Confidence Interval for Mean                       │
├────────────┬──────────────────────────────────┬───────────────────────────────┤
│  CONTROLS  │       OBSERVATION DECK           │        NOTEBOOK              │
│  (280px)   │         (flex-grow)              │        (320px)               │
│            │                                  │                              │
│  Labeled   │   Primary interactive plot        │  ┌─ LIVE STATS ──────────┐  │
│  sliders   │   (Plotly)                       │  │  x̄ = 5.23            │  │
│  + number  │                                  │  │  CI: [4.81, 5.65]     │  │
│  inputs    │   Secondary visual               │  │  n = 30 · α = 0.05   │  │
│            │   (table / QQ / residuals)        │  └────────────────────────┘  │
│  Mode      │                                  │                              │
│  toggles   │                                  │  ┌─ LESSON ──────────────┐  │
│            │                                  │  │ Contextual teaching   │  │
│  [⟲ Reset] │                                  │  │ note + rendered LaTeX │  │
│  [📥 Export│                                  │  └────────────────────────┘  │
│            │                                  │                              │
│            │                                  │  ┌─ SCRATCHPAD ──────────┐  │
│            │                                  │  │ Markdown + LaTeX      │  │
│            │                                  │  │ student notes area    │  │
│            │                                  │  └────────────────────────┘  │
├────────────┴──────────────────────────────────┴───────────────────────────────┤
│  FOOTER STATUS BAR (24px)                                                    │
│  Dataset: Howell.csv  │  52 rows × 4 cols  │  < 1ms  │  v0.1.2             │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Architecture

```
src/
├── main.tsx
├── App.tsx                        # Router + layout shell
│
├── layout/
│   ├── Header.tsx                 # Sticky nav bar + tab buttons
│   ├── SubHeader.tsx              # Breadcrumb ribbon (per-tab)
│   ├── LabBench.tsx               # 3-panel resizable container
│   └── Footer.tsx                 # Status bar
│
├── panels/
│   ├── ControlPanel.tsx           # Left slot — swaps content per tab
│   ├── ObservationPanel.tsx       # Center slot — plots
│   └── NotebookPanel.tsx          # Right slot — stats + lesson + notes
│
├── tabs/                          # Each tab provides 3 panel components
│   ├── home/
│   ├── estimation/
│   │   ├── descriptive/
│   │   ├── graphical/
│   │   └── inference/             # First to implement
│   │       ├── InferenceControls.tsx
│   │       ├── InferenceObservation.tsx
│   │       └── InferenceNotebook.tsx
│   ├── hypothesis/
│   ├── regression/
│   └── data/
│
├── components/                    # Reusable atoms
│   ├── DualInput.tsx              # Slider + number input (synced)
│   ├── StatCard.tsx               # Single stat display
│   ├── PlotContainer.tsx          # Plotly wrapper with loading state
│   ├── MathBlock.tsx              # KaTeX rendered block
│   ├── MathEditor.tsx             # MathLive input field
│   ├── LessonCard.tsx             # Teaching tip card
│   └── DataTable.tsx              # Lightweight data grid
│
├── hooks/
│   ├── useNormalPDF.ts            # Generate normal curve points
│   ├── useConfidenceInterval.ts   # CI calculation
│   ├── useStats.ts                # General stats helpers
│   └── useDebounce.ts             # Smooth slider performance
│
├── api/
│   └── statsApi.ts                # Optional FastAPI calls to Python backend
│
└── styles/
    ├── globals.css
    └── lab-bench.css
```

---

## 4. Tab → Panel Slot Pattern

Each tab exports three components that slot into the fixed `LabBench` layout. The layout itself never changes — only the content inside each panel swaps:

```tsx
// Example: tabs/estimation/inference/index.ts
export { InferenceControls }     // → ControlPanel slot
export { InferenceObservation }  // → ObservationPanel slot
export { InferenceNotebook }     // → NotebookPanel slot
```

```tsx
// LabBench.tsx wires them together:
<ControlPanel>   <ActiveTab.Controls />   </ControlPanel>
<ObservationPanel> <ActiveTab.Observation /> </ObservationPanel>
<NotebookPanel>  <ActiveTab.Notebook />  </NotebookPanel>
```

---

## 5. DualInput Component Pattern

Every parameter slider uses the same synced input pair:

```
┌──────────────────────────────────┐
│  Mean (μ)                        │
│  <────────────●────────────>     │  ← slider (coarse adjustment)
│  [ 5.23 ]                        │  ← text input (fine adjustment)
└──────────────────────────────────┘
```

Both stay synced — typing into the number field moves the slider and vice versa.

---

## 6. User Flow

```
App loads (Home tab)
    │
    ▼
Student selects tab  ──────────────────────────────► Header nav
    │
    ▼
Sub-tab appears ──────────────────────────────────► Breadcrumb ribbon
    │
    ▼
LabBench loads (Controls / Observation / Notebook)
    │
    ├── Student moves a slider
    │       └── Plot + stats update in < 100ms
    │
    ├── Student reads lesson card + rendered formula
    │
    ├── Student types notes in scratchpad (Markdown + LaTeX)
    │
    └── Student exports PNG / copy stats / reset defaults
```

---

## 7. Implementation Phases

| Phase | Deliverable | Priority |
|---|---|---|
| **1** | Header + LabBench 3-panel layout + DualInput + Normal PDF tab | First |
| **2** | Notebook panel — StatCard, LessonCard, MathBlock, scratchpad | Second |
| **3** | Confidence interval tab (port `ci_mean.py` logic from ThotsakanStatistics) | Third |
| **4** | Data tab — CSV upload + DataTable preview | Fourth |
| **5** | Hypothesis testing + regression tabs | Fifth |
| **6** | Thai/English i18n, export buttons, polish | Last |

---

## 8. Performance Budget

| Interaction | Target |
|---|---|
| Slider → plot update | < 100ms |
| Tab switch | < 200ms (lazy loaded) |
| Initial page load | < 2s |
| Math render (KaTeX) | < 50ms |

---

## 9. Theme

| Element | Decision |
|---|---|
| Default mode | **Dark** (lab instrument aesthetic) |
| Primary accent | Indigo / violet |
| Font — UI | Inter |
| Font — math | KaTeX default |
| Panel borders | Subtle (`#1f2937`), no heavy cards |
| Border radius | Small (`8px`) — technical feel |
| Panel dividers | Draggable resize handles |
