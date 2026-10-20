import { useState, Suspense, lazy, useMemo } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import LogoBar from './layout/LogoBar'
import Header from './layout/Header'
import SubHeader, { type SubTab } from './layout/SubHeader'
import LabBench from './layout/LabBench'
import Footer from './layout/Footer'
import HomeTab from './features/home/HomeTab'
import DataTab from './features/data/DataTab'

// ── Probability: Common Distributions ────────────────────────────────────────
import CommonDistControls from './features/probability/common/CommonDistControls'
import { useData } from './context/DataContext'
import {
  useDistribution,
  DISTRIBUTIONS,
  clampParams,
} from './hooks/useDistribution'
import type { DistQuery } from './math/probabilityQuery'
import { queryDomain } from './math/localDistributions'
import { clampQuery, defaultQuery } from './math/queryDomain'

// Lazy-loaded heavy chart components
const CommonDistObservation = lazy(() => import('./features/probability/common/CommonDistObservation'))
const CommonDistNotebook = lazy(() => import('./features/probability/common/CommonDistNotebook'))

// ─── Navigation config ────────────────────────────────────────────────────────

type TabId = 'home' | 'data' | 'probability' | 'estimation' | 'hypothesis' | 'regression'

// Lazy-loaded Descriptive Statistics panels (from composite DescriptiveTab)
import { useDescriptiveTabState } from './features/estimation/descriptive/useDescriptiveTabState'
const DescriptiveControlsSlot = lazy(() =>
  import('./features/estimation/descriptive/DescriptiveTab').then((m) => ({ default: m.ControlsSlot })))
const DescriptiveObservationSlot = lazy(() =>
  import('./features/estimation/descriptive/DescriptiveTab').then((m) => ({ default: m.ObservationSlot })))
const DescriptiveNotebookSlot = lazy(() =>
  import('./features/estimation/descriptive/DescriptiveTab').then((m) => ({ default: m.NotebookSlot })))

// Lazy-loaded Statistical Inference panels
import { useInferenceTabState } from './features/estimation/inference/useInferenceTabState'
const InferenceControlsSlot = lazy(() =>
  import('./features/estimation/inference/InferenceTab').then((m) => ({ default: m.ControlsSlot })))
const InferenceObservationSlot = lazy(() =>
  import('./features/estimation/inference/InferenceTab').then((m) => ({ default: m.ObservationSlot })))
const InferenceNotebookSlot = lazy(() =>
  import('./features/estimation/inference/InferenceTab').then((m) => ({ default: m.NotebookSlot })))

// Lazy-loaded Hypothesis Testing panels
import { useHypothesisTabState } from './features/hypothesis/useHypothesisTabState'
const HypothesisControlsSlot = lazy(() =>
  import('./features/hypothesis/HypothesisTab').then((m) => ({ default: m.ControlsSlot })))
const HypothesisObservationSlot = lazy(() =>
  import('./features/hypothesis/HypothesisTab').then((m) => ({ default: m.ObservationSlot })))
const HypothesisNotebookSlot = lazy(() =>
  import('./features/hypothesis/HypothesisTab').then((m) => ({ default: m.NotebookSlot })))

// Lazy-loaded Graphical Analysis panels
import { useGraphicalTabState } from './features/estimation/graphical/useGraphicalTabState'
const GraphicalControlsSlot = lazy(() =>
  import('./features/estimation/graphical/GraphicalTab').then((m) => ({ default: m.ControlsSlot })))
const GraphicalObservationSlot = lazy(() =>
  import('./features/estimation/graphical/GraphicalTab').then((m) => ({ default: m.ObservationSlot })))
const GraphicalNotebookSlot = lazy(() =>
  import('./features/estimation/graphical/GraphicalTab').then((m) => ({ default: m.NotebookSlot })))

const SUB_TABS: Partial<Record<TabId, SubTab[]>> = {
  probability: [
    { key: 'common',  label: '📜 Common Distributions' },
    { key: 'custom',  label: '✍️ Custom Distribution' },
    { key: 'approx',  label: '🤏 Approximations' },
  ],
  estimation: [
    { key: 'graphical',   label: '📊 Graphical Analysis' },
    { key: 'descriptive', label: '🧮 Descriptive Statistics' },
    { key: 'inference',   label: '💭 Statistical Inference' },
  ],
}

const DEFAULT_SUB_TAB: Partial<Record<TabId, string>> = {
  probability: 'common',
  estimation:  'graphical',
}

// ─── Placeholders ─────────────────────────────────────────────────────────────

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
      <span className="text-3xl">🚧</span>
      <span className="text-sm text-[var(--color-text-muted)]">{label} — coming soon</span>
    </div>
  )
}

function ChartFallback() {
  return (
    <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-sm">
      Loading chart…
    </div>
  )
}

function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 mx-auto max-w-2xl text-center">
      <div className="border border-red-900/50 bg-red-950/20 rounded-xl p-8 w-full shadow-2xl">
        <h2 className="text-2xl font-bold text-red-400 mb-4 flex justify-center items-center gap-2">
          <span className="text-3xl">⚠️</span> Something went wrong
        </h2>
        <div className="text-sm text-left w-full overflow-auto max-h-64 bg-black/40 border border-black/50 p-4 rounded-lg mb-6 shadow-inner">
          <pre className="font-mono text-red-200/90 leading-relaxed whitespace-pre-wrap">
            {error.name}: {error.message}
          </pre>
          {error.stack && (
            <pre className="mt-4 pt-4 border-t border-red-900/30 font-mono text-red-200/50 text-xs whitespace-pre-wrap">
              {error.stack}
            </pre>
          )}
        </div>
        <button
          onClick={resetErrorBoundary}
          className="px-6 py-3 bg-[var(--color-primary)] hover:brightness-110 text-white font-medium rounded-lg shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#111] focus:ring-[var(--color-primary)]"
        >
          Recover and Restart
        </button>
      </div>
    </div>
  )
}

// ─── App ────────────────────────────────────────────────────────────────────

export default function App() {
  // ── Navigation ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [subTabMap, setSubTabMap] = useState<Partial<Record<TabId, string>>>(DEFAULT_SUB_TAB)

  function handleTabChange(tab: string) {
    const t = tab as TabId
    setActiveTab(t)
  }

  function handleSubTabChange(key: string) {
    setSubTabMap((prev) => ({ ...prev, [activeTab]: key }))
  }

  const activeSubTab = subTabMap[activeTab] ?? null
  const subTabs = SUB_TABS[activeTab]

  // ── Probability / Common Distributions state ───────────────────────────────
  const firstDiscrete = DISTRIBUTIONS.find((d) => d.type === 'discrete')!
  const [probModelType, setProbModelType] = useState<'discrete' | 'continuous'>('discrete')
  const [probDistName, setProbDistName] = useState(firstDiscrete.name)
  const [probParamValues, setProbParamValues] = useState<Record<string, number>>(
    Object.fromEntries(firstDiscrete.params.map((p) => [p.key, p.default]))
  )
  const [probQuery, setProbQuery] = useState<DistQuery>(() => defaultQuery(firstDiscrete.name, probParamValues))

  const probDistParams = useMemo(() => ({
    distName: probDistName,
    paramValues: probParamValues,
    query: probQuery,
  }), [probDistName, probParamValues, probQuery])

  const { result: probResult, isLoading: probLoading, error: probError, retry: probRetry, appliedParams: probAppliedParams } = useDistribution(probDistParams)
  const { state: dataState } = useData()

  function handleDistChange(name: string) {
    const dist = DISTRIBUTIONS.find((d) => d.name === name)!
    const defaults = Object.fromEntries(dist.params.map((p) => [p.key, p.default]))
    setProbDistName(name)
    setProbParamValues(defaults)
    // A query for another distribution may lie outside this one's support (x = 5 for a Beta).
    setProbQuery((query) => defaultQuery(name, defaults, query))
  }

  function handleModelTypeChange(t: 'discrete' | 'continuous') {
    setProbModelType(t)
    const first = DISTRIBUTIONS.find((d) => d.type === t)!
    handleDistChange(first.name)
  }

  // ── Descriptive Statistics state ─────────────────────────────────────────
  const descriptive = useDescriptiveTabState()

  // ── Statistical Inference state ──────────────────────────────────────────
  const inference = useInferenceTabState()

  // ── Graphical Analysis state ─────────────────────────────────────────────
  const graphical = useGraphicalTabState()

  // ── Hypothesis Testing state ─────────────────────────────────────────────
  const hypothesis = useHypothesisTabState()

  // ── Slot content resolver ──────────────────────────────────────────────────
  let controls: React.ReactNode
  let observation: React.ReactNode
  let notebook: React.ReactNode
  let footerDataset: string | undefined

  // ── Probability tab ────────────────────────────────────────────────────────
  if (activeTab === 'probability') {
    if (activeSubTab === 'common') {
      footerDataset = `${probDistName} Distribution`
      controls = (
        <CommonDistControls
          modelType={probModelType}
          distName={probDistName}
          paramValues={probParamValues}
          query={probQuery}
          onModelTypeChange={handleModelTypeChange}
          onDistChange={handleDistChange}
          onParamChange={(key, val) => {
            const dist = DISTRIBUTIONS.find((entry) => entry.name === probDistName)!
            const values = clampParams(dist, { ...probParamValues, [key]: val })
            setProbParamValues(values)
            setProbQuery((query) => clampQuery(query, queryDomain(probDistName, values)))
          }}
          onQueryChange={setProbQuery}
          onReset={() => {
            const dist = DISTRIBUTIONS.find((entry) => entry.name === probDistName)!
            const defaults = Object.fromEntries(dist.params.map((param) => [param.key, param.default]))
            setProbParamValues(defaults)
            setProbQuery(defaultQuery(probDistName, defaults))
          }}
        />
      )
      observation = (
        <Suspense fallback={<ChartFallback />}>
          <CommonDistObservation
            distParams={probDistParams}
            appliedParams={probAppliedParams}
            result={probResult}
            isLoading={probLoading}
            error={probError}
            onRetry={probRetry}
            precision={dataState.displayPrecision}
          />
        </Suspense>
      )
      notebook = (
        <Suspense fallback={<ChartFallback />}>
          <CommonDistNotebook distParams={probDistParams} />
        </Suspense>
      )
    } else {
      controls    = <ComingSoon label="Custom Distribution" />
      observation = <ComingSoon label="Custom Distribution" />
      notebook    = <ComingSoon label="Custom Distribution" />
    }

  // ── Statistics tab (id 'estimation') ─────────────────────────────────────────────────────────
  } else if (activeTab === 'estimation') {
    if (activeSubTab === 'graphical') {
      footerDataset = 'Graphical Analysis'
      controls = (
        <Suspense fallback={<ChartFallback />}>
          <GraphicalControlsSlot state={graphical} />
        </Suspense>
      )
      observation = (
        <Suspense fallback={<ChartFallback />}>
          <GraphicalObservationSlot state={graphical} />
        </Suspense>
      )
      notebook = (
        <Suspense fallback={<ChartFallback />}>
          <GraphicalNotebookSlot state={graphical} />
        </Suspense>
      )
    } else if (activeSubTab === 'inference') {
      footerDataset = 'Statistical Inference'
      controls = (
        <Suspense fallback={<ChartFallback />}>
          <InferenceControlsSlot state={inference} />
        </Suspense>
      )
      observation = (
        <Suspense fallback={<ChartFallback />}>
          <InferenceObservationSlot state={inference} />
        </Suspense>
      )
      notebook = (
        <Suspense fallback={<ChartFallback />}>
          <InferenceNotebookSlot state={inference} />
        </Suspense>
      )
    } else if (activeSubTab === 'descriptive') {
      footerDataset = 'Descriptive Statistics'
      controls = (
        <Suspense fallback={<ChartFallback />}>
          <DescriptiveControlsSlot state={descriptive} />
        </Suspense>
      )
      observation = (
        <Suspense fallback={<ChartFallback />}>
          <DescriptiveObservationSlot state={descriptive} />
        </Suspense>
      )
      notebook = (
        <Suspense fallback={<ChartFallback />}>
          <DescriptiveNotebookSlot state={descriptive} />
        </Suspense>
      )
    }

  // ── Hypothesis Testing tab ─────────────────────────────────────────────────
  } else if (activeTab === 'hypothesis') {
    footerDataset = 'Hypothesis Testing'
    controls = (
      <Suspense fallback={<ChartFallback />}>
        <HypothesisControlsSlot state={hypothesis} />
      </Suspense>
    )
    observation = (
      <Suspense fallback={<ChartFallback />}>
        <HypothesisObservationSlot state={hypothesis} />
      </Suspense>
    )
    notebook = (
      <Suspense fallback={<ChartFallback />}>
        <HypothesisNotebookSlot state={hypothesis} />
      </Suspense>
    )

  // ── Other tabs ─────────────────────────────────────────────────────────────
  } else if (activeTab !== 'home') {
    const label = activeTab.charAt(0).toUpperCase() + activeTab.slice(1)
    controls    = <ComingSoon label={label} />
    observation = <ComingSoon label={label} />
    notebook    = <ComingSoon label={label} />
  }

  // ── Home/Data tabs use full-width layout instead of LabBench ──────────────
  const isHome = activeTab === 'home'
  const isFullWidth = isHome || activeTab === 'data'

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-base)] text-[var(--color-text)]">
      <LogoBar />
      <Header activeTab={activeTab} onTabChange={handleTabChange} />
      {!isFullWidth && (
        <SubHeader
          subTabs={subTabs}
          activeSubTab={activeSubTab ?? undefined}
          onSubTabChange={handleSubTabChange}
        />
      )}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error as Error} resetErrorBoundary={resetErrorBoundary} />} onReset={() => setActiveTab('home')}>
          {isHome
            ? <HomeTab onNavigate={handleTabChange} />
            : activeTab === 'data'
              ? <DataTab />
              : <LabBench controls={controls} observation={observation} notebook={notebook} />
          }
        </ErrorBoundary>
      </div>
      <Footer dataset={footerDataset} version="0.1.0-alpha" />
    </div>
  )
}
