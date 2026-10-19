/**
 * Shared Plotly look (doc/interaction_contract.md, rule 17). Plotly cannot read CSS variables, so the
 * values are mirrored here from style.css. Semantic names, not hex literals, go in chart code; switching
 * theme later means changing the values in this file only.
 */
export const PLOT_COLORS = {
  /** Observed data: histogram bars, ECDF, empirical PMF, box plot. */
  data: '#818cf8',
  dataSoft: 'rgba(129,140,248,0.45)',
  /** Translucent fill behind data, e.g. the ECDF confidence band. */
  dataBand: 'rgba(129,140,248,0.25)',
  /** Smoothed/fitted overlays: KDE. */
  fit: '#c4b5fd',
  /** Reference curves: normal density / CDF, null distribution. */
  reference: '#e5e7eb',
  referenceMuted: '#9ca3af',
  /** Individual observations (rug). */
  rug: '#94a3b8',
  /** Interval roles; the same role has the same color in every tab. */
  ciMean: '#60a5fa',
  ciMedian: '#34d399',
  ciDeviation: '#fbbf24',
  pi: '#fb7185',
  /** Hypothesis regions and markers. */
  reject: 'rgba(239,68,68,0.28)',
  rejectLine: '#ef4444',
  pValue: 'rgba(59,130,246,0.45)',
  outlier: '#f87171',
  /** Observed test statistic (Hypothesis). */
  statistic: '#e5e7eb',
  /** Reference lines drawn over data: sample mean and median (same hues as their intervals). */
  mean: '#60a5fa',
  median: '#34d399',
  /** Part of a distribution selected by a query (Probability), and the rest of it. */
  highlight: '#6366f1',
  highlightFill: 'rgba(99,102,241,0.25)',
  inactive: '#334155',
  hoverBg: '#1e293b',
  hoverBorder: '#475569',
  grid: 'rgba(148,163,184,0.18)',
  axisText: '#9ca3af',
  text: '#cbd5e1',
} as const

export const PLOT_FONT = { color: PLOT_COLORS.text, size: 12 } as const

export const PLOT_AXIS = {
  gridcolor: PLOT_COLORS.grid,
  zeroline: false,
  color: PLOT_COLORS.axisText,
} as const

export const PLOT_CONFIG = { displayModeBar: false, responsive: true } as const

/** Base layout; pass overrides for height, margins, titles and axis specifics. */
export function baseLayout(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: PLOT_FONT,
    xaxis: { ...PLOT_AXIS },
    yaxis: { ...PLOT_AXIS },
    showlegend: false,
    hoverlabel: { bgcolor: PLOT_COLORS.hoverBg, bordercolor: PLOT_COLORS.hoverBorder, font: { color: PLOT_COLORS.text, size: 12 } },
    ...overrides,
  }
}

/** Bar width for a discrete variable whose values may be uneven or non-integer (empirical PMF). */
export function barWidth(sortedValues: readonly number[], fill = 0.8): number | undefined {
  let minGap = Infinity
  for (let i = 1; i < sortedValues.length; i += 1) {
    const gap = sortedValues[i] - sortedValues[i - 1]
    if (gap > 0 && gap < minGap) minGap = gap
  }
  return Number.isFinite(minGap) ? minGap * fill : undefined
}
