import { describe, it, expect } from 'vitest'
import {
  DEFAULT_CONFIG,
  clearWeightsIfUnused,
  configForDataset,
  normalApplies,
  supportedOverlays,
  toParams,
  updateGraphicalConfig,
  validateGraphicalConfig,
  type GraphicalConfig,
} from './graphicalState'

const base = (over: Partial<GraphicalConfig> = {}): GraphicalConfig => ({
  column: 'Age',
  ...DEFAULT_CONFIG,
  ...over,
})

describe('config shape', () => {
  it('no longer carries interval, bootstrap or confidence-level settings', () => {
    const keys = Object.keys(base())
    for (const removed of ['addCi', 'ciChoice', 'addPi', 'piChoice', 'confLevel', 'ecdfConfLevel', 'bootstrapMean', 'bootstrapSamples', 'normalMuSource', 'meanEstimator', 'medianEstimator']) {
      expect(keys).not.toContain(removed)
    }
    expect(base().alpha).toBe(0.05)
  })
})

describe('supportedOverlays', () => {
  it('shows each option only where it applies', () => {
    expect(supportedOverlays('Histogram')).toEqual({ kde: true, rug: true, normal: true, confBand: false, bins: true })
    expect(supportedOverlays('PMF')).toEqual({ kde: false, rug: true, normal: false, confBand: false, bins: false })
    expect(supportedOverlays('ECDF')).toEqual({ kde: false, rug: false, normal: true, confBand: true, bins: false })
  })

  it('draws a normal curve only where a density/CDF is comparable', () => {
    expect(normalApplies(base({ addNormal: true }))).toBe(true)
    expect(normalApplies(base({ addNormal: true, graphType: 'PMF' }))).toBe(false)
    expect(normalApplies(base({ addNormal: false }))).toBe(false)
  })
})

describe('toParams: a hidden option is never sent', () => {
  it('does not send a KDE flag from the ECDF view (the old "KDE is not drawn" warning)', () => {
    // addKde defaults to true and cannot be switched off from the ECDF view.
    expect(toParams(base({ graphType: 'ECDF' }), {}).add_kde).toBe(false)
    expect(toParams(base({ graphType: 'PMF' }), {}).add_kde).toBe(false)
    expect(toParams(base({ graphType: 'Histogram' }), {}).add_kde).toBe(true)
  })

  it('sends the rug only where it is shown', () => {
    expect(toParams(base({ graphType: 'ECDF', addData: true }), {}).add_data).toBe(false)
    expect(toParams(base({ graphType: 'PMF', addData: true }), {}).add_data).toBe(true)
  })

  it('sends bins only for the histogram', () => {
    expect(toParams(base({ bins: 12 }), {}).bins).toBe(12)
    expect(toParams(base({ bins: 12, graphType: 'ECDF' }), {}).bins).toBeNull()
  })

  it('sends the ECDF band and alpha only on the ECDF', () => {
    expect(toParams(base({ graphType: 'ECDF', alpha: 0.1 }), {})).toMatchObject({ add_conf_band: true, alpha: 0.1 })
    expect(toParams(base({ graphType: 'Histogram', alpha: 0.1 }), {})).toMatchObject({ add_conf_band: false, alpha: 0.05 })
    expect(toParams(base({ graphType: 'ECDF', alpha: 0.1, addConfBand: false }), {})).toMatchObject({ add_conf_band: false, alpha: 0.05 })
  })

  it('sends no normal overlay and no estimators on the PMF, even if it is ticked', () => {
    const params = toParams(base({ graphType: 'PMF', addNormal: true, muEstimator: 'Sample Median', sigmaEstimator: 'IQR (bias corrected)' }), {})
    expect(params).toMatchObject({ add_normal: false, mu_estimator: 'Sample Mean', sigma_estimator: 'Deviation (1 ddof)' })
  })

  it('sends the estimators only while the normal overlay is on', () => {
    const off = toParams(base({ muEstimator: 'Sample Median' }), {})
    expect(off).toMatchObject({ add_normal: false, mu_estimator: 'Sample Mean' })
    const on = toParams(base({ addNormal: true, muEstimator: 'Sample Median', sigmaEstimator: 'MAD (bias corrected)' }), {})
    expect(on).toMatchObject({ add_normal: true, mu_estimator: 'Sample Median', sigma_estimator: 'MAD (bias corrected)' })
  })

  it('sends trim, winsor and weights only for their own estimator', () => {
    const common = { addNormal: true, trimParam: 0.2, winsorLimits: '0.1, 0.1', weightsColumn: 'W' }
    expect(toParams(base({ ...common, muEstimator: 'Sample Mean' }), {})).toMatchObject({ trim_param: null, winsor_limits: null, weights_column: null })
    expect(toParams(base({ ...common, muEstimator: 'Trimmed Mean' }), {})).toMatchObject({ trim_param: 0.2, winsor_limits: null, weights_column: null })
    expect(toParams(base({ ...common, muEstimator: 'Winsorized Mean' }), {})).toMatchObject({ trim_param: null, winsor_limits: '0.1, 0.1', weights_column: null })
    expect(toParams(base({ ...common, muEstimator: 'Weighted Mean' }), {})).toMatchObject({ trim_param: null, winsor_limits: null, weights_column: 'W' })
  })

  it('produces an identical request when only an irrelevant option changes (so nothing is refetched)', () => {
    const before = JSON.stringify(toParams(base({ graphType: 'ECDF' }), {}))
    const after = JSON.stringify(toParams(base({ graphType: 'ECDF', addKde: false, bins: 40, muEstimator: 'Sample Median', addData: true }), {}))
    expect(after).toBe(before)
  })

  it('sends filters only when there are some', () => {
    expect(toParams(base(), {}).filters).toBeNull()
    expect(toParams(base(), { City: ['A'] }).filters).toEqual({ City: ['A'] })
  })
})

describe('validateGraphicalConfig', () => {
  it('requires a column', () => {
    expect(validateGraphicalConfig(base({ column: '' }), '').column).toBeTruthy()
  })

  it('checks winsor limits only while a winsorized normal overlay is drawn', () => {
    const cfg = base({ addNormal: true, muEstimator: 'Winsorized Mean' })
    expect(validateGraphicalConfig(cfg, '0.1,').winsorLimits).toBeTruthy()
    expect(validateGraphicalConfig(cfg, '0.1, 0.1').winsorLimits).toBeUndefined()
    expect(validateGraphicalConfig(base({ muEstimator: 'Winsorized Mean' }), '0.1,')).toEqual({})
    expect(validateGraphicalConfig({ ...cfg, graphType: 'PMF' }, '0.1,')).toEqual({})
  })

  it('asks for a weights column only for a drawn weighted mean', () => {
    expect(validateGraphicalConfig(base({ addNormal: true, muEstimator: 'Weighted Mean' }), '').weightsColumn).toBeTruthy()
    expect(validateGraphicalConfig(base({ addNormal: true, muEstimator: 'Weighted Mean', weightsColumn: 'W' }), '')).toEqual({})
    expect(validateGraphicalConfig(base({ muEstimator: 'Weighted Mean' }), '')).toEqual({})
  })
})

describe('updateGraphicalConfig', () => {
  it('fills a visible default trim fraction for the trimmed mean', () => {
    expect(updateGraphicalConfig(base(), 'muEstimator', 'Trimmed Mean').trimParam).toBe(0.1)
  })

  it('drops a stale weights column when the estimator no longer uses it', () => {
    const weighted = updateGraphicalConfig(base(), 'muEstimator', 'Weighted Mean')
    const withColumn = updateGraphicalConfig(weighted, 'weightsColumn', 'W')
    expect(withColumn.weightsColumn).toBe('W')
    expect(updateGraphicalConfig(withColumn, 'muEstimator', 'Sample Mean').weightsColumn).toBeNull()
    expect(clearWeightsIfUnused(withColumn)).toBe(withColumn)
  })
})

describe('configForDataset', () => {
  it('keeps a valid selection and replaces a column from a previous file', () => {
    const cfg = base({ column: 'Age' })
    expect(configForDataset(cfg, ['Age', 'Weight'])).toBe(cfg)
    expect(configForDataset(cfg, ['Score']).column).toBe('Score')
  })

  it('clears a weights column the new dataset does not have', () => {
    const cfg = base({ column: 'Age', weightsColumn: 'W' })
    expect(configForDataset(cfg, ['Age']).weightsColumn).toBeNull()
  })
})
