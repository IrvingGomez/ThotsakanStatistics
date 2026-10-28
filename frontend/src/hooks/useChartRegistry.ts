import { useCallback, useMemo, useState } from 'react'
import type { ExportChart } from '../utils/exportPNG'

interface ChartEntry extends ExportChart { key: string }

export function useChartRegistry(order: readonly string[]) {
  const [entries, setEntries] = useState<Record<string, ChartEntry>>({})
  const register = useCallback((key: string, title?: string) => (_figure: unknown, element: HTMLElement) => {
    setEntries((current) => current[key]?.element === element
      ? current
      : { ...current, [key]: { key, title, element } })
  }, [])
  const unregister = useCallback((key: string) => () => {
    setEntries((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }, [])
  const charts = useMemo(() => order.map((key) => entries[key]).filter(Boolean), [entries, order])
  return { charts, ready: order.length > 0 && charts.length === order.length, register, unregister }
}
