# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Thotsakan Statistics** — an interactive statistics laboratory for Thai engineering students. The React/TypeScript app (`try-react/`) replaces a Python/Gradio predecessor. Philosophy: "Stop Calculating. Start Simulating." — students manipulate variables and observe behavior rather than applying formulas.

All substantive work lives in `try-react/`. The `Try_reflex/` directory is a legacy Python backend (Reflex framework), kept for reference only.

## Commands

All commands must be run from `try-react/`:

```bash
npm run dev        # Vite dev server with fast refresh
npm run build      # tsc (type check) + vite build (production)
npm run preview    # Preview production build
npm run test       # Vitest (run once)
npm run test:ui    # Vitest interactive UI
```

No linting is configured yet (no ESLint/Prettier).

## Architecture

### The 3-Panel "LabBench" Pattern

Every feature tab slots three components into a shared layout (`src/layout/LabBench.tsx`):

```
┌────────────────────────────────────────────┐
│  Header (LogoBar + nav tabs + SubHeader)   │
├──────────────┬──────────────┬──────────────┤
│  *Controls   │ *Observation │  *Notebook   │
│  (left,      │  (center,    │  (right,     │
│  ~280px)     │  flex-grow)  │  ~320px)     │
│  Sliders,    │  Plotly      │  Stats,      │
│  selects     │  charts      │  explanations│
├──────────────┴──────────────┴──────────────┤
│  Footer (status bar)                       │
└────────────────────────────────────────────┘
```

Panels are resizable (drag handles), collapsible, and persist widths to `localStorage` key `thotsakan-sidebar-state`. Auto-collapse at 768px (both sidebars) / 1024px (right sidebar).

### Feature Organization

```
src/features/
  home/                          # Full-width landing page
  data/                          # CSV upload + inspection
  probability/
    common/                      # 12 distributions (PMF/PDF/CDF)
  estimation/
    descriptive/                 # Stats tables, histograms, box plots
    inference/                   # Normal PDF with CI visualization
```

Each feature folder follows the naming convention: `*Controls.tsx`, `*Observation.tsx`, `*Notebook.tsx`. `App.tsx` wires the active tab's three components into `LabBench`.

### State Management

**Global (DataContext):** `src/context/DataContext.tsx` — `useReducer` managing dataset, filters, column classifications, and display precision. Access via `useData()`. Provides computed `filteredRows` and helpers `getNumericData(col)` / `getUniqueValues(col)`.

**Feature-local:** Each tab's computation lives in a dedicated hook (`useNormalPDF`, `useDistribution`, `useDescriptiveStats`). These hooks are memoized and do the heavy math, returning chart-ready data to Observation components.

**Heavy computation:** `src/workers/descriptiveStats.worker.ts` runs off the main thread via Comlink. Called from `useDescriptiveStats`.

**UI persistence:** `useLocalStorageState` wraps `useState` with schema validation on load.

### Key Hooks

| Hook | What it does |
|------|-------------|
| `useDistribution()` | 12 distributions with PMF/PDF/CDF and query operations |
| `useNormalPDF()` | Normal curve + CI shading (Beasley-Springer-Moro z-critical) |
| `useDescriptiveStats()` | Delegates to Web Worker via Comlink |
| `useResizablePanel()` | Drag logic for panel width |
| `useContainerBreakpoint()` | Viewport-based auto-collapse |
| `useSidebarKeyboard()` | Keyboard shortcuts for sidebar toggle |

### DualInput Component

`src/components/DualInput.tsx` is used everywhere for parameter controls:
- Slider → immediate commit; Text → 400ms debounce + blur commit
- Arrow keys for fine adjustment; internal text state decoupled from committed value
- Clamping + rounding to step precision

### Visualization

Plotly charts in Observation components are lazy-loaded with `React.lazy` + `Suspense` to avoid blocking initial render (plotly-vendor chunk is large). Bundle is split into `react-vendor`, `plotly-vendor`, and `math-vendor` chunks. Chunk size warning threshold: 1600 KB.

### Math Rendering

KaTeX for static formula display; MathLive for interactive math input. Custom element types declared in `src/custom-elements.d.ts`.

## Performance Targets

From `doc/DESIGN_PROPOSAL.md`: slider interaction → plot update < 100ms; tab switch < 200ms.

## Documentation

- `doc/DESIGN_PROPOSAL.md` — component architecture, tab/panel slot pattern, DualInput spec, implementation phases
- `doc/identity.md` — brand philosophy, UX pillars, what the app is and is NOT
- `doc/context.md` — high-level workspace onboarding, architecture layers, data flow
