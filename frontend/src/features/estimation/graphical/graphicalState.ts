// features/estimation/graphical/graphicalState.ts
// Pure state logic for the Graphical Analysis tab, kept free of React so the rules
// (what is visible for each graph type, what is sent, what a dataset swap resets)
// can be tested directly.
//
// Every setting is live: there is no Run step. The request is built only from options
// that are visible for the current graph type (docs/interaction_contract.md, rule 1),
// so an option belonging to another plot never reaches the backend.

import type { GraphType, GraphicalParams } from '../../../api/graphical'

export const DEBOUNCE_MS = 250

/** Bounds mirrored by the backend schema; DualInput clamps to these. */
export const BOUNDS = {
  bins: { min: 2, max: 200, step: 1 },
  alpha: { min: 0.001, max: 0.5, step: 0.001 },
  trim: { min: 0.01, max: 0.49, step: 0.01 },
} as const

export interface GraphicalConfig {
  column: string
  graphType: GraphType

  // Histogram display
  bins: number | null
  addKde: boolean
  /** KDE bandwidth h; null is the default rule (Scott's), whose value comes back with the result. */
  kdeBandwidth: number | null

  // ECDF band (significance level, like every other tab)
  addConfBand: boolean
  alpha: number

  // Normal overlay and the estimators it is drawn from
  addNormal: boolean
  muEstimator: string
  sigmaEstimator: string
  trimParam: number | null
  winsorLimits: string | null
  weightsColumn: string | null
}

export const DEFAULT_MU_ESTIMATOR = 'Sample Mean'
export const DEFAULT_SIGMA_ESTIMATOR = 'Deviation (1 ddof)'
export const SAMPLE_MEDIAN = 'Sample Median'

export const DEFAULT_CONFIG: Omit<GraphicalConfig, 'column'> = {
  graphType: 'Histogram',
  bins: null,
  addKde: true,
  kdeBandwidth: null,
  addConfBand: true,
  alpha: 0.05,
  addNormal: false,
  muEstimator: DEFAULT_MU_ESTIMATOR,
  sigmaEstimator: DEFAULT_SIGMA_ESTIMATOR,
  trimParam: null,
  winsorLimits: null,
  weightsColumn: null,
}

/**
 * Reconcile the config with a (possibly new) dataset.
 *
 * A column from the previous file must not survive a new upload; when the
 * current selection is gone, fall back to the first numeric column and clear
 * the weights column, which is dataset-specific too.
 */
export function configForDataset(cfg: GraphicalConfig, numericCols: string[]): GraphicalConfig {
  const columnOk = !!cfg.column && numericCols.includes(cfg.column)
  const weightsOk = !cfg.weightsColumn || numericCols.includes(cfg.weightsColumn)
  if (columnOk && weightsOk) return cfg

  return {
    ...cfg,
    column: columnOk ? cfg.column : (numericCols[0] ?? ''),
    weightsColumn: weightsOk ? cfg.weightsColumn : null,
  }
}

/** A weights column only feeds the weighted mean; a stale selection must not linger. */
export function clearWeightsIfUnused(cfg: GraphicalConfig): GraphicalConfig {
  if (cfg.muEstimator === 'Weighted Mean' || cfg.weightsColumn === null) return cfg
  return { ...cfg, weightsColumn: null }
}

/** Keep visible defaults and required companion options in the actual draft. */
export function updateGraphicalConfig<K extends keyof GraphicalConfig>(
  cfg: GraphicalConfig, key: K, value: GraphicalConfig[K],
): GraphicalConfig {
  const next = { ...cfg, [key]: value }
  // A bandwidth is in the units of its variable, so a new variable starts from its own default.
  if (key === 'column' && value !== cfg.column) next.kdeBandwidth = null
  if (next.muEstimator === 'Trimmed Mean' && next.trimParam === null) next.trimParam = 0.1
  return clearWeightsIfUnused(next)
}

/** What each graph type can show. Options outside this are hidden in the UI and never sent. */
export function supportedOverlays(graphType: GraphType) {
  return {
    kde: graphType === 'Histogram',
    normal: true,
    confBand: graphType === 'ECDF',
    bins: graphType === 'Histogram',
  }
}

/** True when a normal overlay is actually drawn for this config. */
export const normalApplies = (cfg: GraphicalConfig) => supportedOverlays(cfg.graphType).normal && cfg.addNormal

export type GraphicalFieldErrors = Partial<Record<'column' | 'winsorLimits' | 'weightsColumn', string>>

export function validateGraphicalConfig(cfg: GraphicalConfig, winsorRaw: string): GraphicalFieldErrors {
  const errors: GraphicalFieldErrors = {}
  if (!cfg.column) errors.column = 'Select a numeric column.'
  if (normalApplies(cfg) && cfg.muEstimator === 'Winsorized Mean') {
    const parts = winsorRaw.split(',').map((part) => part.trim())
    if (parts.length !== 2 || parts.some((part) => !part || !Number.isFinite(Number(part)) || Number(part) < 0 || Number(part) >= 0.5)) {
      errors.winsorLimits = 'Enter two fractions from 0 up to 0.5, such as 0.1, 0.1.'
    }
  }
  if (normalApplies(cfg) && cfg.muEstimator === 'Weighted Mean' && !cfg.weightsColumn) {
    errors.weightsColumn = 'Select a weights column.'
  }
  return errors
}

export function toParams(
  cfg: GraphicalConfig,
  filters: Record<string, string[]>
): GraphicalParams {
  const shows = supportedOverlays(cfg.graphType)
  const normal = normalApplies(cfg)
  const band = shows.confBand && cfg.addConfBand
  return {
    column: cfg.column,
    graph_type: cfg.graphType,
    bins: shows.bins ? cfg.bins : null,
    add_kde: shows.kde && cfg.addKde,
    kde_bandwidth: shows.kde && cfg.addKde ? cfg.kdeBandwidth : null,
    add_conf_band: band,
    alpha: band ? cfg.alpha : DEFAULT_CONFIG.alpha,
    add_normal: normal,
    mu_estimator: normal ? cfg.muEstimator : DEFAULT_MU_ESTIMATOR,
    sigma_estimator: normal ? cfg.sigmaEstimator : DEFAULT_SIGMA_ESTIMATOR,
    trim_param: normal && cfg.muEstimator === 'Trimmed Mean' ? cfg.trimParam : null,
    winsor_limits: normal && cfg.muEstimator === 'Winsorized Mean' ? cfg.winsorLimits : null,
    weights_column: normal && cfg.muEstimator === 'Weighted Mean' ? cfg.weightsColumn : null,
    filters: Object.keys(filters).length > 0 ? filters : null,
  }
}
