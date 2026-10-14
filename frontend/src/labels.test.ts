import { describe, expect, it } from 'vitest'
import { confidenceReadout, estimatorLabel, estimatorOptions } from './labels'
import { barWidth, baseLayout, PLOT_COLORS } from './plot/theme'

describe('labels', () => {
  it('shows consistent names without "bias corrected" but keeps the wire value', () => {
    expect(estimatorLabel('Sample Mean')).toBe('Mean')
    expect(estimatorLabel('MAD (bias corrected)')).toBe('MAD')
    expect(estimatorOptions(['IQR (bias corrected)', 'Deviation (1 ddof)'])).toEqual([
      { value: 'IQR (bias corrected)', label: 'IQR' },
      { value: 'Deviation (1 ddof)', label: 'Std dev (ddof=1)' },
    ])
  })

  it('passes unknown names through unchanged', () => {
    expect(estimatorLabel('Something New')).toBe('Something New')
  })

  it('derives the confidence readout from alpha', () => {
    expect(confidenceReadout(0.05)).toBe('= 95 % confidence')
    expect(confidenceReadout(0.1)).toBe('= 90 % confidence')
  })
})

describe('plot theme', () => {
  it('gives every chart a transparent background and the shared font', () => {
    const layout = baseLayout({ height: 300 })
    expect(layout.height).toBe(300)
    expect(layout.paper_bgcolor).toBe('rgba(0,0,0,0)')
    expect(layout.font).toMatchObject({ color: PLOT_COLORS.text })
  })

  it('sizes bars from the smallest gap between discrete values', () => {
    expect(barWidth([1, 2, 3, 4])).toBeCloseTo(0.8)
    expect(barWidth([0, 0.5, 2])).toBeCloseTo(0.4)
    expect(barWidth([7])).toBeUndefined()
  })
})
