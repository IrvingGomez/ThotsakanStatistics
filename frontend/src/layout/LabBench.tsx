import { type ReactNode, useCallback, useRef } from 'react'
import { useLocalStorageState } from '../hooks/useLocalStorageState'
import { useResizablePanel } from '../hooks/useResizablePanel'
import { useSidebarKeyboard } from '../hooks/useSidebarKeyboard'
import { useContainerBreakpoint } from '../hooks/useContainerBreakpoint'
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
  const containerElRef = useRef<HTMLElement | null>(null)

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
    onToggleLeft: () => setLeftCollapsed(!state.leftCollapsed),
    onToggleRight: () => setRightCollapsed(!state.rightCollapsed),
  })

  // 4. Responsive breakpoints
  const breakpointRef = useContainerBreakpoint({
    breakpoints: [
      { width: 1024, onBelow: () => setRightCollapsed(true), onAbove: () => {} },
      {
        width: 768,
        onBelow: () => {
          setLeftCollapsed(true)
          setRightCollapsed(true)
        },
        onAbove: () => {},
      },
    ],
  })

  // Combine refs (container element + breakpoint observer)
  const setContainerRef = useCallback(
    (node: HTMLElement | null) => {
      containerElRef.current = node
      breakpointRef(node)
    },
    [breakpointRef],
  )

  const anyDragging = leftPanel.isDragging || rightPanel.isDragging

  return (
    <div ref={setContainerRef} className="flex flex-1 overflow-hidden min-h-0 relative">
      {/* Drag overlay — captures pointer events during resize */}
      {anyDragging && <div className="drag-overlay" />}

      {/* ── Left sidebar ── */}
      {state.leftCollapsed ? (
        <CollapsedRail side="left" label="Controls" onExpand={() => setLeftCollapsed(false)} />
      ) : (
        <aside
          style={{ width: leftPanel.width }}
          className={`shrink-0 overflow-y-auto border-r border-[var(--color-border)]
            bg-[var(--color-bg-panel)] px-4 py-4
            ${leftPanel.shouldTransition ? 'sidebar-transition' : ''}`}
        >
          {controls}
        </aside>
      )}

      {/* Left drag handle */}
      {!state.leftCollapsed && (
        <DragHandle {...leftPanel.handleProps} isDragging={leftPanel.isDragging} inSnapZone={leftPanel.inSnapZone} />
      )}

      {/* ── Center ── */}
      <main className="flex-1 min-w-[500px] overflow-y-auto bg-[var(--color-bg-base)] px-5 py-4">
        {observation}
      </main>

      {/* Right drag handle */}
      {!state.rightCollapsed && (
        <DragHandle {...rightPanel.handleProps} isDragging={rightPanel.isDragging} inSnapZone={rightPanel.inSnapZone} />
      )}

      {/* ── Right sidebar ── */}
      {state.rightCollapsed ? (
        <CollapsedRail side="right" label="Notebook" onExpand={() => setRightCollapsed(false)} />
      ) : (
        <aside
          style={{ width: rightPanel.width }}
          className={`shrink-0 overflow-y-auto border-l border-[var(--color-border)]
            bg-[var(--color-bg-panel)] px-4 py-4
            ${rightPanel.shouldTransition ? 'sidebar-transition' : ''}`}
        >
          {notebook}
        </aside>
      )}
    </div>
  )
}
