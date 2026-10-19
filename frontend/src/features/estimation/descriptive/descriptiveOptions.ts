import { visibleChecked, type CheckboxNode } from '../../../components/CheckboxTree'

/**
 * Which statistics the user wants on screen. Ids match `statId` on the rows the backend returns, so
 * showing or hiding a statistic is a filter over the result already loaded — it never asks the backend
 * again (doc/interaction_contract.md, rule 5).
 */

/** Basic statistics: grouped, each one individually deselectable, all ticked by default. */
export const BASIC_TREE: readonly CheckboxNode[] = [
  { id: 'extremes', label: 'Extremes', children: [{ id: 'minimum', label: 'Minimum' }, { id: 'maximum', label: 'Maximum' }] },
  { id: 'quantiles', label: 'Quantiles' },
  { id: 'central', label: 'Central tendency', children: [{ id: 'mean', label: 'Mean' }, { id: 'median', label: 'Median' }] },
  { id: 'dispersion', label: 'Dispersion', children: [{ id: 'std_dev_1', label: 'Std dev (ddof=1)' }, { id: 'variance_1', label: 'Variance (ddof=1)' }] },
]

/** Advanced statistics: off by default; some need an extra parameter (trim, winsor, weights). */
export const ADVANCED_GROUPS: readonly { title: string; items: readonly { id: string; label: string }[] }[] = [
  { title: 'Central tendency', items: [
    { id: 'iqm', label: 'Interquartile mean' }, { id: 'trimmed_mean', label: 'Trimmed mean' },
    { id: 'winsorized_mean', label: 'Winsorized mean' }, { id: 'geometric_mean', label: 'Geometric mean' },
    { id: 'harmonic_mean', label: 'Harmonic mean' }, { id: 'weighted_mean', label: 'Weighted mean' },
  ] },
  { title: 'Dispersion', items: [
    { id: 'std_dev_0', label: 'Std dev (ddof=0)' }, { id: 'variance_0', label: 'Variance (ddof=0)' },
    { id: 'range', label: 'Range' }, { id: 'iqr', label: 'IQR (interquartile range)' },
    { id: 'mad', label: 'MAD (median abs. deviation)' }, { id: 'aad', label: 'AAD (mean abs. deviation)' },
  ] },
  { title: 'Shape', items: [{ id: 'skewness', label: 'Skewness' }, { id: 'kurtosis', label: 'Kurtosis' }] },
]

export const ADVANCED_IDS: readonly string[] = ADVANCED_GROUPS.flatMap(group => group.items.map(item => item.id))

export const DEFAULT_SELECTED: readonly string[] = [
  'extremes', 'minimum', 'maximum', 'quantiles', 'central', 'mean', 'median', 'dispersion', 'std_dev_1', 'variance_1',
]

/** Ticked statistics that are actually visible (a basic child under an unticked group is not). */
export function visibleStatIds(selected: readonly string[]): string[] {
  return [...visibleChecked(BASIC_TREE, selected), ...ADVANCED_IDS.filter(id => selected.includes(id))]
}

export const isRowVisible = (row: { statId?: string }, visible: readonly string[]) => !row.statId || visible.includes(row.statId)

/**
 * Quantile probabilities as typed. Blank is allowed and means "no quantiles"; anything else must be a
 * comma-separated list of numbers from 0 to 1. Returns null when the text is not valid.
 */
export function parseQuantiles(raw: string): number[] | null {
  if (raw.trim() === '') return []
  const tokens = raw.split(',').map(token => token.trim())
  if (tokens.some(token => token === '')) return null
  const values = tokens.map(Number)
  return values.every(value => Number.isFinite(value) && value >= 0 && value <= 1) ? values : null
}

type EstimatorTag = 'Unbiased' | 'Consistent'
const MOMENTS = { shown: ['Consistent'], corrected: ['Unbiased', 'Consistent'] } as const
const SCALE_ONLY = { shown: [], corrected: ['Consistent'] } as const

/**
 * Properties of a statistic, under normality. `shown` holds for the value as computed: the variance
 * and standard deviations already converge to σ² and σ. `corrected` holds once the normal-corrected
 * value is shown: their constant also removes the finite-sample bias, the range divided by d₂(n) is
 * unbiased and consistent for σ, and MAD, IQR and AAD become consistent for σ (not unbiased). The ddof = 1
 * variance is unbiased for σ² as computed, for any distribution with finite variance.
 */
const ESTIMATOR_TAGS: Readonly<Record<string, { shown: readonly EstimatorTag[]; corrected: readonly EstimatorTag[] }>> = {
  variance_0: MOMENTS, variance_1: { shown: ['Unbiased', 'Consistent'], corrected: ['Unbiased', 'Consistent'] }, std_dev_0: MOMENTS, std_dev_1: MOMENTS,
  range: { shown: [], corrected: ['Unbiased', 'Consistent'] },
  aad: SCALE_ONLY, iqr: SCALE_ONLY, mad: SCALE_ONLY,
}

export function estimatorTags(row: { statId?: string; consistencyCorr: number | null }, corrected: boolean): readonly EstimatorTag[] {
  const tags = row.statId ? ESTIMATOR_TAGS[row.statId] : undefined
  if (!tags) return []
  return corrected && row.consistencyCorr != null ? tags.corrected : tags.shown
}
