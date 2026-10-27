import { describe, expect, it } from 'vitest'
import { confidenceReadout, estimatorLabel, estimatorOptions } from './labels'
import { baseLayout, PLOT_COLORS } from './plot/theme'

describe('labels', () => {
  it('shows consistent names without "bias corrected" but keeps the wire value', () => {
    expect(estimatorLabel('Sample Mean')).toBe('Mean')
    expect(estimatorLabel('MAD (bias corrected)')).toBe('MAD (median abs. deviation)')
    expect(estimatorOptions(['IQR (bias corrected)', 'Deviation (1 ddof)'])).toEqual([
      { value: 'IQR (bias corrected)', label: 'IQR (interquartile range)' },
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
})
