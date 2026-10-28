import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { useLocalStorageState } from '../hooks/useLocalStorageState'
import { useResizablePanel } from '../hooks/useResizablePanel'
import { useSidebarKeyboard } from '../hooks/useSidebarKeyboard'
import DragHandle from '../components/DragHandle'
import CollapsedRail from '../components/CollapsedRail'

// ── Persisted state shape ──────────────────────────────────────────────────────

interface SidebarState {
  leftWidth: number
  rightWidth: number
  leftCollapsed: boolean
  rightCollapsed: boolean
}

const DEFAULTS: SidebarState = {
  leftWidth: 280,
  rightWidth: 320,
  leftCollapsed: false,
  rightCollapsed: false,
}

function isValidSidebarState(v: unknown): v is SidebarState {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    typeof o.leftWidth === 'number' &&
    typeof o.rightWidth === 'number' &&
    typeof o.leftCollapsed === 'boolean' &&
    typeof o.rightCollapsed === 'boolean' &&
    isFinite(o.leftWidth) &&
    isFinite(o.rightWidth) &&
    o.leftWidth >= 200 &&
    o.leftWidth <= 400 &&
    o.rightWidth >= 240 &&
    o.rightWidth <= 480
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

interface LabBenchProps {
  controls: ReactNode
  observation: ReactNode
  notebook: ReactNode
}

export default function LabBench({ controls, observation, notebook }: LabBenchProps) {
  const containerElRef = useRef<HTMLDivElement | null>(null)
  const [stacked, setStacked] = useState(() => window.matchMedia('(max-width: 1199px)').matches)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1199px)')
    const update = () => setStacked(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const observation = containerElRef.current?.querySelector('main')
    if (!observation || typeof ResizeObserver === 'undefined') return
    let previousWidth = -1
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width === previousWidth) return
      previousWidth = entry.contentRect.width
      // Plotly listens to window resize, while sidebar resizing changes only
      // its container. Notify it without remounting charts or their settings.
      window.dispatchEvent(new Event('resize'))
    })
    observer.observe(observation)
    return () => observer.disconnect()
  }, [])

  // 1. Persisted sidebar widths + collapsed states
  const [state, setState] = useLocalStorageState<SidebarState>({
    key: 'thotsakan-sidebar-state',
    defaultValue: DEFAULTS,
    validate: isValidSidebarState,
  })

  const setLeftCollapsed = useCallback(
    (c: boolean) => setState((p) => ({ ...p, leftCollapsed: c })),
    [setState],
  )
  const setRightCollapsed = useCallback(
    (c: boolean) => setState((p) => ({ ...p, rightCollapsed: c })),
    [setState],
  )

  // 2. Resizable panels
  const leftPanel = useResizablePanel({
    constraints: { minWidth: 200, maxWidth: 400, defaultWidth: state.leftWidth },
    side: 'right',
    collapsed: state.leftCollapsed,
    onCollapsedChange: setLeftCollapsed,
    containerRef: containerElRef,
    otherPanelWidth: state.rightCollapsed ? 40 : state.rightWidth,
  })

  const rightPanel = useResizablePanel({
    constraints: { minWidth: 240, maxWidth: 480, defaultWidth: state.rightWidth },
    side: 'left',
    collapsed: state.rightCollapsed,
    onCollapsedChange: setRightCollapsed,
    containerRef: containerElRef,
    otherPanelWidth: state.leftCollapsed ? 40 : state.leftWidth,
  })

  // Sync expanded widths back to persisted state when drag ends
  // (We check on every render; only writes when width actually changed)
  if (!leftPanel.isDragging && leftPanel.width !== state.leftWidth && !state.leftCollapsed) {
    setState((p) => ({ ...p, leftWidth: leftPanel.width }))
  }
  if (!rightPanel.isDragging && rightPanel.width !== state.rightWidth && !state.rightCollapsed) {
    setState((p) => ({ ...p, rightWidth: rightPanel.width }))
  }

  // 3. Keyboard shortcuts
  useSidebarKeyboard({
    enabled: !stacked,
    onToggleLeft: () => setLeftCollapsed(!state.leftCollapsed),
    onToggleRight: () => setRightCollapsed(!state.rightCollapsed),
  })

  const anyDragging = leftPanel.isDragging || rightPanel.isDragging
  const leftHidden = !stacked && state.leftCollapsed
  const rightHidden = !stacked && state.rightCollapsed

  return (
    <div ref={containerElRef} className="lab-bench">
      {/* Drag overlay — captures pointer events during resize */}
      {anyDragging && <div className="drag-overlay" />}

      {/* ── Left sidebar ── */}
      {leftHidden && (
        <CollapsedRail side="left" label="Controls" onExpand={() => setLeftCollapsed(false)} />
      )}
        <aside
          id="lab-settings"
          aria-label="Analysis settings"
          hidden={leftHidden}
          style={{ width: stacked ? undefined : leftPanel.width }}
          className={`lab-settings
            ${leftPanel.shouldTransition ? 'sidebar-transition' : ''}`}
        >
          {!stacked && <button type="button" onClick={() => setLeftCollapsed(true)} aria-controls="lab-settings" aria-expanded="true" className="panel-collapse">Hide settings</button>}
          {stacked && <h2 className="text-base font-semibold mb-4">Settings</h2>}
          {controls}
        </aside>

      {/* Left drag handle */}
      {!stacked && !state.leftCollapsed && (
        <DragHandle {...leftPanel.handleProps} aria-label="Resize settings" onKeyDown={(event) => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault()
            leftPanel.setWidth(leftPanel.width + (event.key === 'ArrowRight' ? 16 : -16))
          } else if (event.key === 'Enter') setLeftCollapsed(true)
        }} isDragging={leftPanel.isDragging} inSnapZone={leftPanel.inSnapZone} />
      )}

      {/* ── Center ── */}
      <main id="lab-observation" aria-label="Observation" className="lab-observation">
        {observation}
      </main>

      {/* Right drag handle */}
      {!stacked && !state.rightCollapsed && (
        <DragHandle {...rightPanel.handleProps} aria-label="Resize notebook" onKeyDown={(event) => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault()
            rightPanel.setWidth(rightPanel.width + (event.key === 'ArrowLeft' ? 16 : -16))
          } else if (event.key === 'Enter') setRightCollapsed(true)
        }} isDragging={rightPanel.isDragging} inSnapZone={rightPanel.inSnapZone} />
      )}

      {/* ── Right sidebar ── */}
      {rightHidden && (
        <CollapsedRail side="right" label="Notebook" onExpand={() => setRightCollapsed(false)} />
      )}
        <aside
          id="lab-notebook"
          aria-label="Analysis notebook"
          hidden={rightHidden}
          style={{ width: stacked ? undefined : rightPanel.width }}
          className={`lab-notebook
            ${rightPanel.shouldTransition ? 'sidebar-transition' : ''}`}
        >
          {!stacked && <button type="button" onClick={() => setRightCollapsed(true)} aria-controls="lab-notebook" aria-expanded="true" className="panel-collapse">Hide notebook</button>}
          {stacked && <h2 className="text-base font-semibold mb-4">Notebook</h2>}
          {notebook}
        </aside>
    </div>
  )
}
