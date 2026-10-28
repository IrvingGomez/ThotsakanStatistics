import { describe, expect, it } from 'vitest'
import { DEFAULT_SELECTED, estimatorTags, isRowVisible, parseQuantiles, visibleStatIds } from './descriptiveOptions'

describe('visible statistics', () => {
  it('shows every basic statistic by default and no advanced ones', () => {
    expect(visibleStatIds(DEFAULT_SELECTED)).toEqual(expect.arrayContaining([
      'extremes', 'minimum', 'maximum', 'quantiles', 'central', 'mean', 'median', 'dispersion', 'std_dev_1', 'variance_1',
    ]))
    expect(visibleStatIds(DEFAULT_SELECTED)).not.toContain('iqr')
    expect(visibleStatIds(DEFAULT_SELECTED)).not.toContain('skewness')
  })

  it('hides a basic statistic whose group is unticked, even if it is still ticked', () => {
    const noCentral = DEFAULT_SELECTED.filter(id => id !== 'central')
    expect(visibleStatIds(noCentral)).not.toContain('mean')
    expect(visibleStatIds(noCentral)).toContain('minimum')
  })

  it('lets a single basic statistic be deselected', () => {
    const noMedian = DEFAULT_SELECTED.filter(id => id !== 'median')
    expect(visibleStatIds(noMedian)).toContain('mean')
    expect(visibleStatIds(noMedian)).not.toContain('median')
  })

  it('shows advanced statistics as soon as they are ticked', () => {
    expect(visibleStatIds([...DEFAULT_SELECTED, 'iqr', 'weighted_mean'])).toEqual(expect.arrayContaining(['iqr', 'weighted_mean']))
  })

  it('treats rows without an id as always visible', () => {
    expect(isRowVisible({}, [])).toBe(true)
    expect(isRowVisible({ statId: 'mean' }, ['median'])).toBe(false)
    expect(isRowVisible({ statId: 'mean' }, ['mean'])).toBe(true)
  })
})

describe('parseQuantiles', () => {
  it('accepts a list, the ends 0 and 1, and blank (no quantiles)', () => {
    expect(parseQuantiles('0.25, 0.5, 0.75')).toEqual([0.25, 0.5, 0.75])
    expect(parseQuantiles('0, 1')).toEqual([0, 1])
    expect(parseQuantiles('')).toEqual([])
    expect(parseQuantiles('   ')).toEqual([])
  })

  it('rejects malformed or out-of-range text', () => {
    expect(parseQuantiles('0.25,')).toBeNull()
    expect(parseQuantiles('a, 0.5')).toBeNull()
    expect(parseQuantiles('1.5')).toBeNull()
    expect(parseQuantiles('-0.1')).toBeNull()
  })
})

describe('estimatorTags', () => {
  const row = (statId: string) => ({ statId, consistencyCorr: 1 })
  it('marks the ddof = 1 variance unbiased even without the normal-corrected column', () => {
    expect(estimatorTags(row('variance_1'), false)).toEqual(['Unbiased', 'Consistent'])
    expect(estimatorTags(row('variance_0'), false)).toEqual(['Consistent'])
    expect(estimatorTags(row('std_dev_1'), false)).toEqual(['Consistent'])
    expect(estimatorTags(row('variance_0'), true)).toEqual(['Unbiased', 'Consistent'])
  })
})
