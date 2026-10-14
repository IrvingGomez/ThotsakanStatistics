import type { FieldOption } from './components/ControlPrimitives'

/**
 * One display-name map for statistics and estimators (doc/interaction_contract.md, rule 11).
 * Only the *label* changes. The wire value sent to the backend is untouched, because professor-verified
 * core/ compares these strings literally (including the "(bias corrected)" suffix).
 */
const ESTIMATOR_LABELS: Readonly<Record<string, string>> = {
  'Sample Mean': 'Mean',
  'Geometric Mean': 'Geometric mean',
  'Harmonic Mean': 'Harmonic mean',
  'Interquartile Mean': 'Interquartile mean',
  'Trimmed Mean': 'Trimmed mean',
  'Winsorized Mean': 'Winsorized mean',
  'Weighted Mean': 'Weighted mean',
  'Sample Median': 'Median',
  'Deviation (1 ddof)': 'Std dev (ddof=1)',
  'IQR (bias corrected)': 'IQR',
  'MAD (bias corrected)': 'MAD',
  'AAD (bias corrected)': 'AAD',
}

export function estimatorLabel(wire: string): string {
  return ESTIMATOR_LABELS[wire] ?? wire
}

/** Turn backend estimator names into select options: shown label, untouched wire value. */
export function estimatorOptions(wire: readonly string[]): FieldOption[] {
  return wire.map((value) => ({ value, label: estimatorLabel(value) }))
}

/** Field labels that appear in more than one tab. */
export const LABELS = {
  alpha: 'Significance level α',
  trimFraction: 'Trimming fraction',
  winsorFractions: 'Winsorization fractions',
  weightsColumn: 'Weights column',
  bootstrapSamples: 'Bootstrap samples (B)',
  muEstimator: 'μ estimator',
  sigmaEstimator: 'σ estimator',
} as const

/** "Significance level α" is always shown with the confidence it implies, e.g. "= 95 % confidence". */
export function confidenceReadout(alpha: number): string {
  return `= ${Number(((1 - alpha) * 100).toFixed(2))} % confidence`
}
