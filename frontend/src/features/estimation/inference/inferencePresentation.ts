import type { IntervalsResponse } from '../../../api/inference'

export type IntervalRow = { Statistic: string; Lower: number | null; Upper: number | null; Method: string; 'Interval Type'?: string }
export function parseIntervalRows(result?: IntervalsResponse | null): IntervalRow[] {
  if (!result?.table) return []
  try { const rows = JSON.parse(result.table); return Array.isArray(rows) ? rows : [] } catch { return [] }
}
export function quantityLabel(statistic: string): string {
  const text = statistic.toLowerCase()
  if (text.includes('deviation') || text.includes('sigma')) return 'Deviation'
  if (text.includes('median')) return 'Median'
  if (text.includes('mean')) return 'Mean'
  if (text.includes('iqr')) return 'IQR'
  if (text.includes('bootstrap')) return 'Bootstrap'
  return statistic
}
export function pointEstimate(statistic: string, estimates: IntervalsResponse['point_estimates']): number | null {
  const label = quantityLabel(statistic)
  return label === 'Mean' ? estimates.mean : label === 'Median' ? estimates.median : label === 'Deviation' ? estimates.deviation : null
}
export const formatInferenceNumber = (value: number | null | undefined, precision: number) => value == null || !Number.isFinite(value) ? 'Unavailable' : value.toFixed(precision)
export const coveragePercent = (value: number) => (value * 100).toLocaleString(undefined, { maximumFractionDigits: 4 }) + '%'
export function intervalRange(values: (number | null)[]): [number, number] | undefined {
  const finite = values.filter((value): value is number => value !== null && Number.isFinite(value))
  if (!finite.length) return undefined
  const lower = Math.min(...finite), upper = Math.max(...finite)
  const padding = (upper - lower) * 0.06 || Math.max(Math.abs(upper), 1) * 0.02
  return [lower - padding, upper + padding]
}
