import { useState, useCallback, useRef } from 'react'

export interface PanelConstraints {
  minWidth: number
  maxWidth: number
  defaultWidth: number
}

interface UseResizablePanelOptions {
  constraints: PanelConstraints
  /** Which side of the panel the drag handle sits on */
  side: 'left' | 'right'
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  /** Width to report when collapsed (default 40) */
  collapsedWidth?: number
  /** Ref to LabBench container for dynamic max calculation */
  containerRef?: React.RefObject<HTMLElement | null>
  /** Current width of the *other* panel (for center-min enforcement) */
  otherPanelWidth?: number
}

export interface ResizablePanelResult {
  width: number
  setWidth: (w: number) => void
  isDragging: boolean
  inSnapZone: boolean
  handleProps: {
    onPointerDown: (e: React.PointerEvent) => void
    onDoubleClick: () => void
    role: 'separator'
    'aria-orientation': 'vertical'
    'aria-valuenow': number
    'aria-valuemin': number
    'aria-valuemax': number
    tabIndex: number
  }
  shouldTransition: boolean
}

const HANDLE_WIDTH = 8
const CENTER_MIN = 500

export function useResizablePanel(
  options: UseResizablePanelOptions,
): ResizablePanelResult {
  const {
    constraints,
    side,
    collapsed,
    onCollapsedChange,
    collapsedWidth = 40,
    containerRef,
    otherPanelWidth = 0,
  } = options

  const [expandedWidth, setExpandedWidth] = useState(constraints.defaultWidth)
  const [isDragging, setIsDragging] = useState(false)
  const [hasSnappedToCollapse, setHasSnappedToCollapse] = useState(false)
  const dragStartRef = useRef({ x: 0, startWidth: 0 })

  const clamp = useCallback(
    (raw: number): number => {
      if (!isFinite(raw)) return constraints.defaultWidth

      // Dynamic max: ensure center keeps at least CENTER_MIN
      let effectiveMax = constraints.maxWidth
      if (containerRef?.current) {
        const containerWidth = containerRef.current.offsetWidth
        const available = containerWidth - otherPanelWidth - HANDLE_WIDTH * 2 - CENTER_MIN
        if (isFinite(available) && available > 0) {
          effectiveMax = Math.min(constraints.maxWidth, available)
        }
      }

      return Math.round(
        Math.max(constraints.minWidth, Math.min(effectiveMax, raw)),
      )
    },
    [constraints, containerRef, otherPanelWidth],
  )

  const setWidth = useCallback(
    (w: number) => setExpandedWidth(clamp(w)),
    [clamp],
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isDragging) return // guard multi-touch
      if (e.button !== 0) return // left button only

      e.preventDefault()
      dragStartRef.current = { x: e.clientX, startWidth: expandedWidth }
      setIsDragging(true)
      setHasSnappedToCollapse(false) // Reset snap flag on new drag

      const target = e.currentTarget
      try {
        target.setPointerCapture(e.pointerId)
      } catch {
        // DOMException if element is detached — continue without capture
      }

      const pointerId = e.pointerId

      function onMove(ev: PointerEvent) {
        if (!isFinite(ev.clientX)) return
        const delta = ev.clientX - dragStartRef.current.x
        // side='right' means handle is on right edge of panel: drag right = grow
        // side='left' means handle is on left edge of panel: drag left = grow
        const newWidth =
          side === 'right'
            ? dragStartRef.current.startWidth + delta
            : dragStartRef.current.startWidth - delta

        // Snap-to-collapse logic
        const snapThreshold = constraints.minWidth - 30
        const reExpandThreshold = constraints.minWidth + 15

        // Auto-collapse when dragged below threshold
        if (newWidth <= snapThreshold && !collapsed && !hasSnappedToCollapse) {
          setHasSnappedToCollapse(true)
          onCollapsedChange(true)
          return
        }

        // Re-expand only with sufficient drag distance (hysteresis)
        if (collapsed && newWidth >= reExpandThreshold) {
          onCollapsedChange(false)
          setHasSnappedToCollapse(false)
          return
        }

        // Normal resize when not collapsed
        if (!collapsed) {
          setExpandedWidth(clamp(newWidth))
        }
      }

      function onUp() {
        setIsDragging(false)
        try {
          target.releasePointerCapture(pointerId)
        } catch {
          // May already be released
        }
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
        document.removeEventListener('pointercancel', onUp)
      }

      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
      document.addEventListener('pointercancel', onUp)
    },
    [isDragging, expandedWidth, side, clamp, constraints.minWidth, collapsed, onCollapsedChange, hasSnappedToCollapse],
  )

  const onDoubleClick = useCallback(() => {
    onCollapsedChange(!collapsed)
  }, [collapsed, onCollapsedChange])

  const displayWidth = collapsed ? collapsedWidth : expandedWidth

  return {
    width: displayWidth,
    setWidth,
    isDragging,
    inSnapZone: expandedWidth <= constraints.minWidth - 30 && isDragging && !collapsed,
    handleProps: {
      onPointerDown,
      onDoubleClick,
      role: 'separator' as const,
      'aria-orientation': 'vertical' as const,
      'aria-valuenow': expandedWidth,
      'aria-valuemin': constraints.minWidth,
      'aria-valuemax': constraints.maxWidth,
      tabIndex: 0,
    },
    shouldTransition: !isDragging,
  }
}
