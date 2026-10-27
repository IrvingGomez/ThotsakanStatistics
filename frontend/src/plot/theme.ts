/**
 * Shared Plotly look (docs/interaction_contract.md, rule 17). Plotly cannot read CSS variables, so the
 * values are mirrored here from style.css. Semantic names, not hex literals, go in chart code; switching
 * theme later means changing the values in this file only.
 *
 * Color rule (Irving Gomez, 2026-10-24): within one tab a color has one meaning; each tab assigns the
 * palette where it reads best, so a hue may mean different things in different tabs (rose is Extremes in
 * Descriptive, prediction in Inference). In every plot the mean is blue, the median green, the deviation
 * amber and prediction rose, and the normal model each sample is compared against is orange. Plots and
 * tables take their colors from this file only.
 */
export const PLOT_COLORS = {
  /** Observed data: histogram bars, ECDF, empirical PMF, box plot. */
  data: '#818cf8',
  dataSoft: 'rgba(129,140,248,0.45)',
  /** Translucent fill behind data, e.g. the ECDF confidence band. */
  dataBand: 'rgba(129,140,248,0.25)',
  /** KDE: purple, close to the data color, because it is another estimate of the same distribution. */
  fit: '#c084fc',
  /** The normal model the data are compared against (normal density / CDF); kept for goodness-of-fit. */
  normal: '#fb923c',
  /** Reference curves: the null distribution (Hypothesis), query marks (Probability). */
  reference: '#e5e7eb',
  referenceMuted: '#9ca3af',
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
  /**
   * Joint confidence regions (Inference), over the relative-likelihood heatmap: the estimate sits where the
   * heatmap is brightest, so it is dark; the marginal box is dashed to set it apart from the region lines.
   */
  regionEstimate: '#0f172a',
  regionBox: '#ffffff',
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

/** Region line `index` of `count`, all white, fainter as the coverage rises. */
export function regionLineColor(index: number, count: number): string {
  const opacity = count > 1 ? 1 - (0.55 * index) / (count - 1) : 1
  return `rgba(255,255,255,${opacity.toFixed(2)})`
}

/**
 * Row tints for tables whose rows have a type (ResultTable), as Tailwind classes. Descriptive Statistics
 * tints by statistic type; Statistical Inference by interval kind, with the hues of its interval plots.
 */
export const TABLE_TINTS = {
  // Descriptive Statistics
  'Extremes': { row: 'bg-rose-950/50', text: 'text-rose-300', label: 'text-rose-400' },
  'Quantiles': { row: 'bg-purple-950/50', text: 'text-purple-300', label: 'text-purple-400' },
  'Central Tendency': { row: 'bg-blue-950/50', text: 'text-blue-300', label: 'text-blue-400' },
  'Dispersion': { row: 'bg-amber-950/50', text: 'text-amber-300', label: 'text-amber-400' },
  // Shape is the least-read group, so it gets the quiet warm grey.
  'Shape': { row: 'bg-stone-950/50', text: 'text-stone-300', label: 'text-stone-400' },
  // Statistical Inference
  'Prediction': { row: 'bg-rose-950/50', text: 'text-rose-300', label: 'text-rose-400' },
  'Mean': { row: 'bg-blue-950/50', text: 'text-blue-300', label: 'text-blue-400' },
  'Median': { row: 'bg-emerald-950/50', text: 'text-emerald-300', label: 'text-emerald-400' },
  'Deviation': { row: 'bg-amber-950/50', text: 'text-amber-300', label: 'text-amber-400' },
} as const satisfies Record<string, { row: string; text: string; label: string }>

/** Histogram bars of observed data, the same soft look in every Statistics tab so lines drawn over them stand out. */
export const HISTOGRAM_MARKER = { color: PLOT_COLORS.dataSoft } as const

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
