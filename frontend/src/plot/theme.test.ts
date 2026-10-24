import { describe, expect, it } from 'vitest'
import { PLOT_COLORS, TABLE_TINTS } from './theme'

const hue = (group: keyof typeof TABLE_TINTS) => TABLE_TINTS[group].row.match(/^bg-(\w+)-950/)![1]

describe('table tints', () => {
  it('give each Descriptive group its own color', () => {
    const groups = ['Extremes', 'Quantiles', 'Central Tendency', 'Dispersion', 'Shape'] as const
    expect(groups.map(hue)).toEqual(['rose', 'purple', 'blue', 'amber', 'stone'])
  })

  it('give each Inference interval kind the color of its plot', () => {
    const kinds = ['Prediction', 'Mean', 'Median', 'Deviation'] as const
    expect(kinds.map(hue)).toEqual(['rose', 'blue', 'emerald', 'amber'])
  })

  it('use one pattern for row, text and label, so every tint reads the same', () => {
    for (const [group, tint] of Object.entries(TABLE_TINTS)) {
      const name = hue(group as keyof typeof TABLE_TINTS)
      expect(tint, group).toEqual({ row: `bg-${name}-950/50`, text: `text-${name}-300`, label: `text-${name}-400` })
    }
  })
})

describe('plot colors', () => {
  it('draw the normal model in orange and the KDE in purple', () => {
    expect(PLOT_COLORS.normal).toBe('#fb923c')
    expect(PLOT_COLORS.fit).toBe('#c084fc')
  })
})
