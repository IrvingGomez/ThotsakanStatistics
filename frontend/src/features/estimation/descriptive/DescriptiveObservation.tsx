// features/estimation/descriptive/DescriptiveObservation.tsx
// Center panel: statistics table + histogram and box plot

import { useState, useRef, useEffect, useCallback } from 'react'
import Plot from 'react-plotly.js'
import { type DescriptiveResult, type StatRow } from '../../../api/descriptive'
import type { DescriptiveConfig } from './useDescriptiveTabState'
import { estimatorTags } from './descriptiveOptions'
import ResultToolbar from '../../../components/ResultToolbar'
import ResultSection from '../../../components/ResultSection'
import ResultTable, { TableTagLabel } from '../../../components/ResultTable'
import { EmptyState } from '../../../components/StatusBanner'
import { PLOT_AXIS, PLOT_COLORS, PLOT_CONFIG, baseLayout } from '../../../plot/theme'
import { downloadCSV } from '../../../utils/exportCSV'
import { downloadChartsPNG } from '../../../utils/exportPNG'
import { downloadPDF } from '../../../utils/exportPDF'
import { exportFilename } from '../../../utils/exportFilename'
import { useChartRegistry } from '../../../hooks/useChartRegistry'

const CHART_ORDER = ['descriptive'] as const

/** Where the box plot sits, in paper coordinates (the histogram fills the space below). */
const BOX = { bottom: 0.78, low: 0.81, capLow: 0.85, middle: 0.89, capHigh: 0.93, high: 0.97 } as const

// ─── Statistics Table ─────────────────────────────────────────────────────────

function StatsTable({ rows, showConsistencyCorr, precision }: {
  rows: StatRow[]; showConsistencyCorr: boolean; precision: number
}) {
  const fmt = (v: number | null) => v === null || Number.isNaN(v) ? '—' : v.toFixed(precision)
  const columns = [
    { key: 'measure', label: 'Statistic' },
    { key: 'value', label: 'Value', align: 'right' as const },
    ...(showConsistencyCorr ? [{ key: 'corr', label: 'Normal-corrected', align: 'right' as const }] : []),
  ]
  return (
    <ResultTable caption="Descriptive statistics" columns={columns} rows={rows.map((row) => ({
      group: row.category,
      cells: {
        measure: (
          <span className="flex items-center gap-2">
            {row.measure}
            {row.robust && <TableTagLabel tag="Robust" title="Robust statistic" />}
            {estimatorTags(row, showConsistencyCorr).map((tag) => (
              <TableTagLabel key={tag} tag={tag} dataTag="correction"
                title={tag === 'Unbiased' ? 'Unbiased under normality' : 'Consistent: converges to the true value as n grows'} />
            ))}
          </span>
        ),
        value: fmt(row.value),
        corr: fmt(row.consistencyCorr),
      },
    }))} />
  )
}

// ─── Charts ───────────────────────────────────────────────────────────────────

function DescriptiveCharts({ result, colName, precision, onReady, onPurge }: {
  result: DescriptiveResult; colName: string; precision: number
  onReady: (figure: unknown, element: HTMLElement) => void
  onPurge: () => void
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [plotWidth, setPlotWidth] = useState<number | undefined>(undefined)

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width
      if (width) setPlotWidth(width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const { histogram, boxData } = result

  // Build histogram bin centers and width
  const histX = histogram.binEdges.slice(0, -1).map(
    (lo, i) => (lo + histogram.binEdges[i + 1]) / 2
  )
  const histWidth = histogram.binEdges.length > 1
    ? histogram.binEdges[1] - histogram.binEdges[0]
    : 1

  const fmt = (v: number) => v.toFixed(precision)

  // Invisible scatter marker on the box strip — one per stat, gives clean
  // individual hover labels. opacity:0 = invisible, size:14 = generous hit area.
  const statPoint = (label: string, x: number) => ({
    type: 'scatter' as const,
    mode: 'markers' as const,
    x: [x], y: [0],
    xaxis: 'x', yaxis: 'y2',
    marker: { opacity: 0, size: 14, color: PLOT_COLORS.data },
    hovertemplate: `${label}: ${fmt(x)}<extra></extra>`,
    showlegend: false,
  })

  // ── Traces ──────────────────────────────────────────────────────────────
  const traces = [
    // Histogram (bottom subplot)
    {
      type: 'bar' as const,
      x: histX,
      y: histogram.counts,
      width: histWidth,
      marker: { color: PLOT_COLORS.data, opacity: 0.85 },
      // Pass bin edges so the hover template can show the range instead of the center
      customdata: histogram.binEdges.slice(0, -1).map((lo, i) => [
        parseFloat(lo.toPrecision(4)),
        parseFloat(histogram.binEdges[i + 1].toPrecision(4)),
      ]),
      hovertemplate: '%{customdata[0]} – %{customdata[1]}<br>Count: %{y}<extra></extra>',
      showlegend: false,
    },
    // ── Invisible stat-point overlays for individual hover labels ────────────
    // One scatter marker per key stat on the box strip. opacity:0 = invisible,
    // size:14 = generous hit area. hovermode:'closest' ensures only one fires.
    statPoint('Lower fence', boxData.whiskerLo),
    statPoint('Q1',          boxData.q1),
    statPoint('Median',      boxData.median),
    statPoint('Mean',        result.summary.mean),
    statPoint('Q3',          boxData.q3),
    statPoint('Upper fence', boxData.whiskerHi),
    // Outliers — one scatter trace covering all outlier values
    ...(boxData.outliers.length > 0 ? [{
      type: 'scatter' as const,
      mode: 'markers' as const,
      x: boxData.outliers,
      y: boxData.outliers.map(() => 0),
      xaxis: 'x', yaxis: 'y2',
      marker: { opacity: 0.85, size: 10, color: PLOT_COLORS.outlier },
      hovertemplate: `Outlier: %{x:.${precision}f}<extra></extra>`,
      showlegend: false,
    }] : []),
  ]

  // ── Layout ──────────────────────────────────────────────────────────────
  const layout = baseLayout({
    margin: { t: 12, b: 48, l: 52, r: 12 },
    width: plotWidth,
    height: 400,
    dragmode: 'pan' as const,
    hovermode: 'closest' as const,
    xaxis: { ...PLOT_AXIS, title: { text: colName }, tickformat: '.4~g', nticks: 6, automargin: true },
    yaxis: { ...PLOT_AXIS, title: { text: 'Frequency' }, domain: [0, BOX.bottom - 0.05], tickformat: 'd', automargin: true },
    // The box strip: hover points and outliers sit at y = 0, the middle of the strip.
    yaxis2: { domain: [BOX.bottom, 1], range: [-1, 1], showticklabels: false, showgrid: false, zeroline: false, fixedrange: true },
    shapes: [
      // Box plot (Tukey), drawn as shapes so the mean and median lines below cross it unchanged.
      { type: 'line' as const, xref: 'x' as const, x0: boxData.whiskerLo, x1: boxData.q1, yref: 'paper' as const, y0: BOX.middle, y1: BOX.middle, line: { color: PLOT_COLORS.data, width: 1.5 } },
      { type: 'line' as const, xref: 'x' as const, x0: boxData.q3, x1: boxData.whiskerHi, yref: 'paper' as const, y0: BOX.middle, y1: BOX.middle, line: { color: PLOT_COLORS.data, width: 1.5 } },
      ...[boxData.whiskerLo, boxData.whiskerHi].map((x) => (
        { type: 'line' as const, xref: 'x' as const, x0: x, x1: x, yref: 'paper' as const, y0: BOX.capLow, y1: BOX.capHigh, line: { color: PLOT_COLORS.data, width: 1.5 } })),
      { type: 'rect' as const, xref: 'x' as const, x0: boxData.q1, x1: boxData.q3, yref: 'paper' as const, y0: BOX.low, y1: BOX.high,
        fillcolor: PLOT_COLORS.dataBand, line: { color: PLOT_COLORS.data, width: 1.5 } },
      // Mean and median: one line each, through the histogram and the box.
      { type: 'line' as const, xref: 'x' as const, x0: result.summary.mean, x1: result.summary.mean, yref: 'paper' as const, y0: 0, y1: 1,
        line: { color: PLOT_COLORS.mean, width: 2, dash: 'dash' } },
      { type: 'line' as const, xref: 'x' as const, x0: boxData.median, x1: boxData.median, yref: 'paper' as const, y0: 0, y1: 1,
        line: { color: PLOT_COLORS.median, width: 2, dash: 'dot' } },
    ],
  })

  const value = (v: number) => <span className="font-mono tabular-nums text-[var(--color-text)]">{fmt(v)}</span>
  return (
    <div ref={wrapperRef}>
      <ul aria-label="Plot legend" className="mb-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--color-text-muted)]">
        <li className="flex items-center gap-2"><span aria-hidden="true" className="w-5 border-t-2 border-dashed" style={{ borderColor: PLOT_COLORS.mean }} />Mean {value(result.summary.mean)}</li>
        <li className="flex items-center gap-2"><span aria-hidden="true" className="w-5 border-t-2 border-dotted" style={{ borderColor: PLOT_COLORS.median }} />Median {value(boxData.median)}</li>
        <li className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-4 border" style={{ background: PLOT_COLORS.dataBand, borderColor: PLOT_COLORS.data }} />Box Q1 {value(boxData.q1)} – Q3 {value(boxData.q3)}</li>
        <li className="flex items-center gap-2"><span aria-hidden="true" className="w-5 border-t-2" style={{ borderColor: PLOT_COLORS.data }} />Whiskers {value(boxData.whiskerLo)} – {value(boxData.whiskerHi)}</li>
        <li className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: PLOT_COLORS.outlier }} />Outliers <span className="font-mono tabular-nums text-[var(--color-text)]">{boxData.outliers.length}</span></li>
      </ul>
      <Plot
        data={traces}
        layout={layout}
        config={PLOT_CONFIG}
        useResizeHandler
        onInitialized={onReady}
        onUpdate={onReady}
        onPurge={onPurge}
      />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface DescriptiveObservationProps {
  result: DescriptiveResult | null
  config: DescriptiveConfig | null
  /** The rows of the statistics that are ticked. */
  rows: StatRow[]
  hasData: boolean
  /** A dataset is loaded (it may have no numeric variables). */
  loaded: boolean
  precision: number
  isComputing?: boolean
}

export default function DescriptiveObservation({
  result, config, rows: visibleRows, hasData, loaded, precision, isComputing = false,
}: DescriptiveObservationProps) {
  const registry = useChartRegistry(CHART_ORDER)
  const baseName = config ? `descriptive-${config.column}` : 'descriptive-statistics'
  const exportCSV = useCallback(() => {
    if (!result || !config) throw new Error('No applied descriptive result is available.')
    downloadCSV([
      ['category', 'statistic', 'value', 'normal_corrected', 'normal_corrected_properties', 'robust', 'warning'],
      ...visibleRows.map((row) => [row.category, row.measure, row.value, row.consistencyCorr, estimatorTags(row, true).join(' '), !!row.robust, row.warning ?? '']),
    ], exportFilename(baseName, 'csv', 'descriptive-statistics'))
  }, [result, config, visibleRows, baseName])
  const exportPNG = useCallback(() => downloadChartsPNG(registry.charts,
    exportFilename(`${baseName}-chart`, 'png', 'descriptive-statistics')), [registry.charts, baseName])
  const exportPDF = useCallback(async () => {
    if (!result || !config) throw new Error('No applied descriptive result is available.')
    await downloadPDF({
      title: `Descriptive Statistics - ${config.column}`,
      subtitle: `n = ${result.summary.n}`,
      charts: registry.charts,
      stats: [
        { label: 'Mean', value: String(result.summary.mean) },
        { label: 'Median', value: String(result.summary.median) },
        { label: 'Standard deviation', value: String(result.summary.std) },
        { label: 'IQR', value: String(result.summary.iqr) },
      ],
      tables: [{ title: 'Statistics', columns: ['Category', 'Statistic', 'Value', 'Normal-corrected'],
        rows: visibleRows.map((row) => [row.category, row.measure, row.value, row.consistencyCorr]) }],
      filename: exportFilename(`${baseName}-report`, 'pdf', 'descriptive-statistics'),
    })
  }, [result, config, registry.charts, visibleRows, baseName])
  const exportReady = !!result && !!config && !isComputing && registry.ready

  if (!result || !config) return <EmptyState hasData={hasData} loaded={loaded} />

  return (
    <div className="flex flex-col gap-4">
      <ResultToolbar title={`Descriptive statistics — ${config.column}`}
        exports={exportReady ? { png: exportPNG, csv: exportCSV, pdf: exportPDF } : undefined}
        ready={exportReady} disabledReason={isComputing ? 'Waiting for the updated result.' : 'Chart is still loading.'} />

      <ResultSection title="Statistics">
        <StatsTable rows={visibleRows} showConsistencyCorr={config.showConsistencyCorr} precision={precision} />
      </ResultSection>

      <ResultSection title="Distribution">
        <DescriptiveCharts result={result} colName={config.column} precision={precision}
          onReady={registry.register('descriptive', `Distribution of ${config.column}`)}
          onPurge={registry.unregister('descriptive')} />
      </ResultSection>
    </div>
  )
}
