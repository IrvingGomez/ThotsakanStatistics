import { useEffect, useRef } from 'react'

interface UseSidebarKeyboardOptions {
  onToggleLeft: () => void
  onToggleRight: () => void
  enabled?: boolean
}

export function useSidebarKeyboard(options: UseSidebarKeyboardOptions): void {
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const opts = optionsRef.current
      if (opts.enabled === false) return

      // Don't hijack shortcuts when user is typing in an input
      const target = e.target as HTMLElement | null
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable ||
        target?.getAttribute('role') === 'textbox'
      ) {
        return
      }

      const mod = e.metaKey || e.ctrlKey
      if (!mod) return

      const key = e.key.toLowerCase()
      if (key === 'b') {
        e.preventDefault()
        opts.onToggleLeft()
      } else if (key === 'j') {
        e.preventDefault()
        opts.onToggleRight()
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])
}
