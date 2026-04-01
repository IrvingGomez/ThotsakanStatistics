import { useRef, useCallback } from 'react'

interface Breakpoint {
  width: number
  onBelow: () => void
  onAbove: () => void
}

interface UseContainerBreakpointOptions {
  breakpoints: Breakpoint[]
}

export function useContainerBreakpoint(
  options: UseContainerBreakpointOptions,
): React.RefCallback<HTMLElement> {
  const optionsRef = useRef(options)
  optionsRef.current = options

  const observerRef = useRef<ResizeObserver | null>(null)
  const prevWidthRef = useRef<number | null>(null)

  const refCallback = useCallback((node: HTMLElement | null) => {
    // Disconnect previous observer
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }

    if (!node) {
      prevWidthRef.current = null
      return
    }

    if (typeof ResizeObserver === 'undefined') return

    observerRef.current = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return

      const width =
        entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width

      const prev = prevWidthRef.current
      prevWidthRef.current = width

      // Skip initial measurement (no crossing to detect)
      if (prev === null) return

      const { breakpoints } = optionsRef.current
      for (const bp of breakpoints) {
        if (prev >= bp.width && width < bp.width) bp.onBelow()
        else if (prev < bp.width && width >= bp.width) bp.onAbove()
      }
    })

    observerRef.current.observe(node)
  }, [])

  return refCallback
}
