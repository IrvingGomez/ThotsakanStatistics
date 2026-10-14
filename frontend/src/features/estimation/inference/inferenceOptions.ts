import { visibleChecked, type CheckboxNode } from '../../../components/CheckboxTree'
import type { InferenceParams } from '../../../api/inference'

/**
 * Which intervals the user asked for, as a tree of ticks (confidence/prediction → quantity → method).
 * Everything the request needs is derived from the *visible* ticks, so an option hidden under an
 * unticked parent is never sent (doc/interaction_contract.md, rule 1).
 */
export const INTERVAL_TREE: readonly CheckboxNode[] = [
  {
    id: 'ci', label: 'Confidence intervals',
    children: [
      { id: 'ci.mean', label: 'For the mean', children: [
        { id: 'ci.mean.normal', label: 'Assuming normality' }, { id: 'ci.mean.boot', label: 'Using bootstrap' }] },
      { id: 'ci.median', label: 'For the median', children: [
        { id: 'ci.median.normal', label: 'Assuming normality' }, { id: 'ci.median.boot', label: 'Using bootstrap' }] },
      { id: 'ci.deviation', label: 'For the deviation', children: [
        { id: 'ci.deviation.normal', label: 'Assuming normality' }, { id: 'ci.deviation.boot', label: 'Using bootstrap' }] },
    ],
  },
  {
    id: 'pi', label: 'Prediction intervals',
    children: [
      { id: 'pi.normal', label: 'Assuming normality', children: [
        { id: 'pi.normal.mean', label: 'Based on the mean' },
        { id: 'pi.normal.median', label: 'Based on the median' },
        { id: 'pi.normal.iqr', label: 'Based on the IQR' }] },
      { id: 'pi.boot', label: 'Using bootstrap' },
    ],
  },
]

/** Normality is assumed by default, so the user does not have to click to get a result. */
export const DEFAULT_SELECTED: readonly string[] = [
  'ci', 'ci.mean', 'ci.mean.normal', 'ci.median', 'ci.median.normal', 'ci.deviation', 'ci.deviation.normal',
  'pi', 'pi.normal', 'pi.normal.mean', 'pi.normal.median', 'pi.normal.iqr',
]

/** Options whose formula needs a deviation estimator (they assume normality and use σ). */
const NEEDS_DEVIATION_ESTIMATOR = ['ci.mean.normal', 'ci.median.normal', 'ci.deviation.normal', 'pi.normal.mean', 'pi.normal.median']

export const DEFAULT_SIGMA_ESTIMATOR = 'Deviation (1 ddof)'

const has = (visible: readonly string[], ...ids: string[]) => ids.some(id => visible.includes(id))

export function selectionInfo(selected: readonly string[]) {
  const visible = visibleChecked(INTERVAL_TREE, selected)
  return {
    visible,
    wantsCI: has(visible, 'ci.mean.normal', 'ci.mean.boot', 'ci.median.normal', 'ci.median.boot', 'ci.deviation.normal', 'ci.deviation.boot'),
    wantsPI: has(visible, 'pi.normal.mean', 'pi.normal.median', 'pi.normal.iqr', 'pi.boot'),
    anyBootstrap: visible.some(id => id.endsWith('.boot')),
    needsDeviationEstimator: has(visible, ...NEEDS_DEVIATION_ESTIMATOR),
  }
}

/** The per-method flags for the request, derived only from visible ticks. */
export function methodFlags(selected: readonly string[]): Pick<InferenceParams,
  'bootstrap_mean' | 'bootstrap_median' | 'bootstrap_deviation' | 'bootstrap_pi' |
  'ci_mean_normal' | 'ci_median_normal' | 'ci_deviation_normal' | 'pi_mean_normal' | 'pi_median_normal' | 'pi_iqr_normal'> {
  const { visible } = selectionInfo(selected)
  return {
    bootstrap_mean: has(visible, 'ci.mean.boot'),
    bootstrap_median: has(visible, 'ci.median.boot'),
    bootstrap_deviation: has(visible, 'ci.deviation.boot'),
    bootstrap_pi: has(visible, 'pi.boot'),
    ci_mean_normal: has(visible, 'ci.mean.normal'),
    ci_median_normal: has(visible, 'ci.median.normal'),
    ci_deviation_normal: has(visible, 'ci.deviation.normal'),
    pi_mean_normal: has(visible, 'pi.normal.mean'),
    pi_median_normal: has(visible, 'pi.normal.median'),
    pi_iqr_normal: has(visible, 'pi.normal.iqr'),
  }
}

/** Flags for Confidence Regions: the backend pins the estimators; send the neutral defaults. */
export const REGION_FLAGS: ReturnType<typeof methodFlags> = {
  bootstrap_mean: false, bootstrap_median: false, bootstrap_deviation: false, bootstrap_pi: false,
  ci_mean_normal: true, ci_median_normal: true, ci_deviation_normal: true,
  pi_mean_normal: true, pi_median_normal: true, pi_iqr_normal: true,
}
