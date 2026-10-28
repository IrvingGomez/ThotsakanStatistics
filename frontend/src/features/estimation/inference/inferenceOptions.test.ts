import { describe, expect, it } from 'vitest'
import { DEFAULT_SELECTED, methodFlags, selectionInfo } from './inferenceOptions'

describe('inference option selection', () => {
  it('defaults to normal-theory methods with no bootstrap', () => {
    const info = selectionInfo(DEFAULT_SELECTED)
    expect(info).toMatchObject({ wantsCI: true, wantsPI: true, anyBootstrap: false, needsDeviationEstimator: true })
    expect(methodFlags(DEFAULT_SELECTED)).toEqual({
      bootstrap_mean: false, bootstrap_median: false, bootstrap_deviation: false, bootstrap_pi: false,
      ci_mean_normal: true, ci_median_normal: true, ci_deviation_normal: true,
      pi_mean_normal: true, pi_median_normal: true, pi_iqr_normal: true,
    })
  })

  it('ignores ticks hidden under an unticked parent', () => {
    expect(selectionInfo(['ci.mean.normal', 'pi.boot'])).toMatchObject({ wantsCI: false, wantsPI: false, anyBootstrap: false })
    expect(methodFlags(['ci.mean.normal', 'pi.boot']).ci_mean_normal).toBe(false)
  })

  it('needs the deviation estimator only for options that assume normality and use sigma', () => {
    expect(selectionInfo(['ci', 'ci.mean', 'ci.mean.boot']).needsDeviationEstimator).toBe(false)
    expect(selectionInfo(['pi', 'pi.normal', 'pi.normal.iqr']).needsDeviationEstimator).toBe(false)
    expect(selectionInfo(['pi', 'pi.normal', 'pi.normal.mean']).needsDeviationEstimator).toBe(true)
  })

  it('knows when a bootstrap option is visible', () => {
    expect(selectionInfo(['pi', 'pi.boot']).anyBootstrap).toBe(true)
    expect(selectionInfo(['ci.deviation.boot']).anyBootstrap).toBe(false)
  })
})
