import { useMemo } from 'react'

export interface NormalPDFParams {
  mean: number
  std: number
  n: number
  alpha: number
}

export interface NormalPDFResult {
  xValues: number[]
  yValues: number[]
  ciLow: number
  ciHigh: number
  /** x-coordinates of the shaded confidence region */
  shadeX: number[]
  /** y-coordinates of the shaded confidence region */
  shadeY: number[]
  se: number
  zCritical: number
}

function pdf(x: number, mean: number, std: number): number {
  const c = 1 / (std * Math.sqrt(2 * Math.PI))
  return c * Math.exp(-0.5 * ((x - mean) / std) ** 2)
}

/** Critical z for a two-sided (1-alpha) CI.
 *  Uses a rational approximation of the inverse-normal CDF (Beasley-Springer-Moro). */
function zCrit(alpha: number): number {
  const p = 1 - alpha / 2
  if (p <= 0.5 || p >= 1) return 1.96  // Fallback for edge cases
  // Rational approximation (accuracy ~3e-4 for p ∈ [0.5, 0.9999])
  const a = [2.515517, 0.802853, 0.010328]
  const b = [1.432788, 0.189269, 0.001308]
  const t = Math.sqrt(-2 * Math.log(1 - p))
  if (!isFinite(t)) return 1.96
  const num = a[0] + a[1] * t + a[2] * t * t
  const den = 1 + b[0] * t + b[1] * t * t + b[2] * t * t * t
  return t - num / den
}

export function useNormalPDF({ mean, std, n, alpha }: NormalPDFParams): NormalPDFResult {
  return useMemo(() => {
    const spread = 4 * std
    const steps = 160
    const step = (2 * spread) / steps

    const xValues: number[] = []
    const yValues: number[] = []

    for (let i = 0; i <= steps; i++) {
      const x = mean - spread + i * step
      xValues.push(x)
      yValues.push(pdf(x, mean, std))
    }

    const se = std / Math.sqrt(n)
    const z = zCrit(alpha)
    const ciLow = mean - z * se
    const ciHigh = mean + z * se

    // Shade between ciLow and ciHigh
    const shadeX: number[] = []
    const shadeY: number[] = []
    for (let i = 0; i <= steps; i++) {
      const x = xValues[i]
      if (x >= ciLow && x <= ciHigh) {
        shadeX.push(x)
        shadeY.push(yValues[i])
      }
    }
    // Close the filled polygon at y = 0
    if (shadeX.length > 0) {
      shadeX.push(shadeX[shadeX.length - 1])
      shadeY.push(0)
      shadeX.unshift(shadeX[0])
      shadeY.unshift(0)
    }

    return { xValues, yValues, ciLow, ciHigh, shadeX, shadeY, se, zCritical: z }
  }, [mean, std, n, alpha])
}
