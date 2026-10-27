import katex from 'katex'
import { describe, expect, it } from 'vitest'
import { intervalFormula, REGION_BOX, REGION_FORMULAS } from './inferenceFormulas'

const row = (Statistic: string, Method: string) => ({ Statistic, Method, Lower: 0, Upper: 1 })
const DEVIATION_ESTIMATORS = ['Deviation (1 ddof)', 'Range (bias corrected)', 'IQR (bias corrected)', 'MAD (bias corrected)', 'AAD (bias corrected)']

describe('interval formulas follow the method the backend used', () => {
  it('uses t for the mean only when the method is t, and z otherwise', () => {
    expect(intervalFormula('confidence', row('Mean', 't (df=9)'), 'Deviation (1 ddof)')).toMatchObject({ label: 'Mean · t' })
    expect(intervalFormula('confidence', row('Mean', 't (df=9)'), 'Deviation (1 ddof)').tex).toContain('t_{n-1')
    const z = intervalFormula('confidence', row('Mean', 'Normal (z, MAD)'), 'MAD (bias corrected)')
    expect(z.label).toBe('Mean · normal (z)')
    expect(z.tex).toContain('z_{1-\\alpha/2}')
    expect(z.tex).toContain('\\hat{\\sigma}')
  })

  it('gives each deviation estimator its own interval', () => {
    const tex = (estimator: string) => intervalFormula('confidence', row('Deviation', 'x'), estimator).tex
    expect(tex('Deviation (1 ddof)')).toContain('\\chi^{2}_{n-1')
    expect(tex('Range (bias corrected)')).toContain('d_3(n)')
    expect(tex('IQR (bias corrected)')).toContain('2\\,\\Phi^{-1}(0.75)')
    expect(tex('IQR (bias corrected)')).toContain('2 e^{')
    expect(tex('MAD (bias corrected)')).toContain('8 e^{')
    expect(tex('AAD (bias corrected)')).toContain('\\sqrt{1 - 2/\\pi}')
  })

  it('labels bootstrap rows and writes them as bootstrap quantiles', () => {
    const mean = intervalFormula('confidence', row('Mean', 'Bootstrap (B=500)'), 'Deviation (1 ddof)')
    expect(mean.label).toBe('Mean · bootstrap')
    expect(mean.tex).toContain('q_{\\alpha/2}')
    expect(intervalFormula('confidence', row('Deviation', 'Bootstrap (B=500)'), 'MAD (bias corrected)').tex).toContain('\\Phi^{-1}(0.75)')
    const prediction = intervalFormula('prediction', row('Bootstrap', 'Bootstrap quantiles (B=500)'), 'Deviation (1 ddof)')
    expect(prediction.label).toBe('Using bootstrap')
    expect(prediction.tex).toContain('\\frac{1}{B}')
  })

  it('writes the prediction intervals with the left panel names', () => {
    expect(intervalFormula('prediction', row('Mean', 't (df=9)'), 'Deviation (1 ddof)')).toMatchObject({ label: 'Based on the mean · t' })
    expect(intervalFormula('prediction', row('Mean', 't (df=9)'), 'Deviation (1 ddof)').tex).toContain('1 + \\frac{1}{n}')
    expect(intervalFormula('prediction', row('Median', 'Normal (asymptotic, s)'), 'Deviation (1 ddof)').tex).toContain('\\frac{\\pi}{2n}')
    expect(intervalFormula('prediction', row('IQR', 'IQR (normal-scaled)'), 'Deviation (1 ddof)').tex).toContain('Q_1')
  })

  it('puts the constants of an interval on their own line below it', () => {
    const iqr = intervalFormula('prediction', row('IQR', 'IQR (normal-scaled)'), 'Deviation (1 ddof)').tex
    expect(iqr).toMatch(/\\\\\s*\\delta =/)
    for (const estimator of ['IQR (bias corrected)', 'MAD (bias corrected)', 'AAD (bias corrected)']) {
      expect(intervalFormula('confidence', row('Deviation', 'x'), estimator).tex).toMatch(/\\\\\s*w =/)
    }
  })

  it('every formula typesets without a KaTeX error', () => {
    const rows = [
      ...['t (df=9)', 'Normal (z, MAD)', 'Bootstrap (B=500)'].map(method => ['confidence', row('Mean', method)] as const),
      ...['Normal (asymptotic, s)', 'Bootstrap (B=500)'].map(method => ['confidence', row('Median', method)] as const),
      ...['t (df=9)', 'Normal (z, MAD)'].map(method => ['prediction', row('Mean', method)] as const),
      ['prediction', row('Median', 'Normal (asymptotic, s)')] as const,
      ['prediction', row('IQR', 'IQR (normal-scaled)')] as const,
      ['prediction', row('Bootstrap', 'Bootstrap quantiles (B=500)')] as const,
    ]
    const cases = [
      ...REGION_FORMULAS, REGION_BOX,
      ...rows.map(([kind, interval]) => intervalFormula(kind, interval, 'Deviation (1 ddof)')),
      ...DEVIATION_ESTIMATORS.flatMap(estimator => ['Chi', 'Bootstrap (B=500)'].map(method => intervalFormula('confidence', row('Deviation', method), estimator))),
    ]
    for (const { tex } of cases) {
      expect(() => katex.renderToString(tex, { throwOnError: true })).not.toThrow()
    }
  })
})
