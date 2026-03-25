import { Suspense, lazy, useState } from 'react'

type TabKey = 'overview' | 'plot' | 'math'

const InteractivePlotTab = lazy(() => import('./tabs/InteractivePlotTab'))
const MathPlaygroundTab = lazy(() => import('./tabs/MathPlaygroundTab'))

const TAB_LABELS: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Project Context' },
  { key: 'plot', label: 'Interactive Plot' },
  { key: 'math', label: 'Math Playground' },
]

export default function App() {
  const [tab, setTab] = useState<TabKey>('overview')

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Thotsakan React Playground</h1>
        <p>Starter UI for porting the Gradio statistics app into React.</p>
      </header>

      <nav className="tab-nav">
        {TAB_LABELS.map((item) => (
          <button
            key={item.key}
            className={tab === item.key ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setTab(item.key)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <section className="panel">
          <h2>Project Fit</h2>
          <ul>
            <li>Frontend: React + Vite (this project).</li>
            <li>Charts: Plotly for interactive statistical visuals.</li>
            <li>Math rendering: KaTeX.</li>
            <li>Math input: MathLive field component.</li>
            <li>Recommended backend path: keep Python stats engine and expose API endpoints.</li>
          </ul>
        </section>
      )}

      <Suspense fallback={<section className="panel"><p>Loading tab…</p></section>}>
        {tab === 'plot' && <InteractivePlotTab />}
        {tab === 'math' && <MathPlaygroundTab />}
      </Suspense>
    </div>
  )
}
