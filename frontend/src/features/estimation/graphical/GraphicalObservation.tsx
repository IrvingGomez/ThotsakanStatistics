// features/estimation/graphical/GraphicalObservation.tsx
// Centre panel: the plot itself. Histogram / empirical PMF / ECDF with the
// requested overlays, plus an interval strip below when CI/PI bands are on.

import { useCallback, useMemo } from 'react'
import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-basic-dist-min'
import type { GraphicalResponse } from '../../../api/graphical'
import ResultToolbar from '../../../components/ResultToolbar'
import { downloadChartsPNG } from '../../../utils/exportPNG'
import { downloadCSV } from '../../../utils/exportCSV'
import { downloadPDF } from '../../../utils/exportPDF'
import { exportFilename } from '../../../utils/exportFilename'
import { useChartRegistry } from '../../../hooks/useChartRegistry'

const Plot = createPlotlyComponent(Plotly)

const CHART_ORDER = ['graphical'] as const

// Plotly parses colors itself — CSS vars don't resolve, so use literals.
const C_MAIN = '#a78bfa'      // rebeccapurple, lifted for dark backgrounds
const C_KDE = '#c4b5fd'
const C_BAND = 'rgba(167, 139, 250, 0.25)'
const C_RUG = '#94a3b8'
const C_NORMAL = '#e5e7eb'
const C_CI_MEAN = '#3b82f6'
const C_CI_MEDIAN = '#10b981'
const C_PI = '#f43f5e'

const AXIS = { color: '#9ca3af', gridcolor: 'rgba(128,128,128,0.15)', zeroline: false }
const CONFIG = { responsive: true, displayModeBar: false }

// Interval strip rows, matching the matplotlib overlay's geometry.
const BAND_Y: Record<string, number> = { ci_mean: 0.4, ci_median: 0.3, pi: 0.1 }
const BAND_COLOR: Record<string, string> = {
  ci_mean: C_CI_MEAN,
  ci_median: C_CI_MEDIAN,
  pi: C_PI,
}

interface GraphicalObservationProps {
  result: GraphicalResponse | null
  column: string
  graphType: string
  hasData: boolean
  isComputing: boolean
  /** Overlays the last Run produced that this result no longer carries. */
  staleOverlays: string[]
}

/** Bar centres and widths from histogram edges. */
function barsFromEdges(bins: number[], densities: number[]) {
  const x: number[] = []
  const width: number[] = []
  for (let i = 0; i < densities.length; i++) {
    x.push((bins[i] + bins[i + 1]) / 2)
    width.push(bins[i + 1] - bins[i])
  }
  return { x, width }
}

export default function GraphicalObservation({
  result, column, graphType, hasData, isComputing, staleOverlays,
}: GraphicalObservationProps) {
  const registry = useChartRegistry(CHART_ORDER)
  const bands = result?.interval_bands ?? []
  const hasStrip = bands.length > 0

  const traces = useMemo(() => {
    if (!result) return []
    const out: Record<string, unknown>[] = []

    if (result.histogram_data) {
      const { bins, densities, counts } = result.histogram_data
      const { x, width } = barsFromEdges(bins, densities)
      out.push({
        type: 'bar', x, y: densities, width,
        marker: { color: C_MAIN, opacity: 0.5, line: { color: C_MAIN, width: 1 } },
        name: 'Density',
        customdata: counts.map((count, index) => [bins[index], bins[index + 1], count]),
        hovertemplate: 'Bin: %{customdata[0]:.4g} to %{customdata[1]:.4g}<br>Count: %{customdata[2]}<br>Density: %{y:.4g}<extra></extra>',
      })
    }

    if (result.pmf_data) {
      const { values, probs } = result.pmf_data
      // Stem plot: one line segment per value, then the marker heads.
      const stemX: (number | null)[] = []
      const stemY: (number | null)[] = []
      values.forEach((v, i) => { stemX.push(v, v, null); stemY.push(0, probs[i], null) })
      out.push({
        type: 'scatter', mode: 'lines', x: stemX, y: stemY,
        line: { color: C_MAIN, width: 1.5 }, hoverinfo: 'skip', showlegend: false,
      })
      out.push({
        type: 'scatter', mode: 'markers', x: values, y: probs,
        marker: { color: C_MAIN, size: 7 }, name: 'Probability',
        hovertemplate: '%{x:.4g}<br>P = %{y:.4g}<extra></extra>',
      })
    }

    if (result.ecdf_data) {
      const { x, y, lower, upper } = result.ecdf_data
      if (lower && upper) {
        out.push({
          type: 'scatter', mode: 'lines', x, y: lower, line: { shape: 'hv', width: 0 },
          hoverinfo: 'skip', showlegend: false,
        })
        out.push({
          type: 'scatter', mode: 'lines', x, y: upper, line: { shape: 'hv', width: 0 },
          fill: 'tonexty', fillcolor: C_BAND, name: 'DKW band', hoverinfo: 'skip',
        })
      }
      out.push({
        type: 'scatter', mode: 'lines+markers', x, y,
        line: { shape: 'hv', color: C_MAIN, width: 2 },
        marker: { color: C_MAIN, size: 4 }, name: 'ECDF',
        hovertemplate: '%{x:.4g}<br>F(x) = %{y:.4g}<extra></extra>',
      })
    }

    if (result.kde_curve) {
      out.push({
        type: 'scatter', mode: 'lines',
        x: result.kde_curve.x, y: result.kde_curve.y,
        line: { color: C_KDE, width: 2 }, name: 'KDE', hoverinfo: 'skip',
      })
    }

    if (result.rug_data) {
      out.push({
        type: 'scatter', mode: 'markers',
        x: result.rug_data.x, y: result.rug_data.x.map(() => 0),
        marker: { color: C_RUG, size: 10, symbol: 'line-ns-open', line: { width: 1 } },
        name: 'Observations',
        hovertemplate: '%{x:.4g}<extra></extra>',
      })
    }

    if (result.normal_curve) {
      out.push({
        type: 'scatter', mode: 'lines',
        x: result.normal_curve.x, y: result.normal_curve.y,
        line: { color: C_NORMAL, width: 2, dash: 'dash' },
        name: graphType === 'ECDF' ? 'Normal CDF' : 'Normal density',
        hovertemplate: '%{x:.4g}<br>%{y:.4g}<extra></extra>',
      })
    }

    // Interval strip (second row).
    bands.forEach((b) => {
      const y = BAND_Y[b.kind] ?? 0.25
      const color = BAND_COLOR[b.kind] ?? C_PI
      out.push({
        type: 'scatter', mode: 'lines', yaxis: 'y2',
        x: [b.low, b.high], y: [y, y],
        line: { color, width: 3 }, name: b.label,
        hovertemplate: `${b.label}<br>[%{x:.4g}]<extra></extra>`,
      })
      out.push({
        type: 'scatter', mode: 'markers', yaxis: 'y2',
        x: [b.center], y: [y],
        marker: { color, size: 8 }, showlegend: false, hoverinfo: 'skip',
      })
    })

    return out
  }, [result, bands, graphType])

  const layout = useMemo(() => {
    const yTitle =
      graphType === 'ECDF' ? 'ECDF' : graphType === 'PMF' ? 'Probability' : 'Density'
    const title =
      graphType === 'ECDF' ? 'Empirical Cumulative Distribution Function'
        : graphType === 'PMF' ? `Empirical PMF of ${column}`
          : `Distribution of ${column}`

    return {
      autosize: true,
      title: { text: title, font: { color: '#9ca3af', size: 13 } },
      margin: { l: 56, r: 20, t: 44, b: 44 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { color: '#9ca3af', size: 12 },
      bargap: 0.02,
      xaxis: { ...AXIS, title: column, anchor: hasStrip ? 'y2' : 'y' },
      yaxis: {
        ...AXIS,
        title: yTitle,
        domain: hasStrip ? [0.34, 1] : [0, 1],
        ...(graphType === 'ECDF' ? { range: [0, 1.05] } : {}),
      },
      ...(hasStrip
        ? {
          yaxis2: {
            ...AXIS,
            domain: [0, 0.24],
            range: [0, 0.5],
            showticklabels: false,
            showgrid: false,
          },
        }
        : {}),
      showlegend: true,
      legend: { font: { color: '#9ca3af', size: 12 }, bgcolor: 'transparent', orientation: 'h', y: -0.18 },
    }
  }, [column, graphType, hasStrip])

  // ── Exports ───────────────────────────────────────────────────────────────
  const handleExportPNG = useCallback(() => {
    return downloadChartsPNG(registry.charts, exportFilename(`graphical-${column}-${graphType}`, 'png', 'graphical-analysis'))
  }, [column, graphType, registry.charts])

  const handleExportCSV = useCallback(() => {
    if (!result) return
    const rows: (string | number)[][] = []
    if (result.histogram_data) {
      rows.push(['bin_low', 'bin_high', 'count', 'density'])
      const { bins, counts, densities } = result.histogram_data
      counts.forEach((c, i) => rows.push([bins[i], bins[i + 1], c, densities[i]]))
    } else if (result.pmf_data) {
      rows.push(['bin_low', 'bin_high', 'count', 'density'])
      result.pmf_data.values.forEach((v, i) => {
        const probability = result.pmf_data!.probs[i]
        rows.push([v, v, Number.isFinite(probability) ? probability * result.summary.n : '', probability])
      })
    } else if (result.ecdf_data) {
      const { x, y, lower, upper } = result.ecdf_data
      rows.push(['x', 'cumulative_probability', 'lower_band', 'upper_band'])
      x.forEach((v, i) => rows.push([v, y[i], lower?.[i] ?? '', upper?.[i] ?? '']))
    }
    downloadCSV(rows, exportFilename(`graphical-${column}-${graphType}`, 'csv', 'graphical-analysis'))
  }, [result, column, graphType])

  const handleExportPDF = useCallback(async () => {
    const stats = [
      { label: 'n', value: String(result?.summary.n ?? '—') },
      { label: 'Unique values', value: String(result?.summary.n_unique ?? '—') },
    ]
    if (result?.point_estimates?.mu != null) {
      stats.push({ label: 'μ̂', value: result.point_estimates.mu.toPrecision(6) })
    }
    if (result?.point_estimates?.sigma != null) {
      stats.push({ label: 'σ̂', value: result.point_estimates.sigma.toPrecision(6) })
    }
    await downloadPDF({
      charts: registry.charts,
      title: `Graphical Analysis — ${column}`,
      subtitle: graphType,
      stats,
      filename: exportFilename(`graphical-${column}-${graphType}-report`, 'pdf', 'graphical-analysis'),
    })
  }, [result, column, graphType, registry.charts])

  const exportReady = !!result && !isComputing && registry.ready

  // ── States ────────────────────────────────────────────────────────────────
  if (!hasData) {
    return (
      <div className="min-h-48 flex items-center justify-center text-[var(--color-text-muted)]
        border border-dashed border-[var(--color-border-md)] rounded-xl m-4">
        Waiting for data — upload a CSV on the Data tab.
      </div>
    )
  }

  if (!result) {
    return (
      <div className="min-h-48 flex items-center justify-center text-[var(--color-text-muted)] text-sm">
        {isComputing ? 'Computing…' : 'Select a column to draw the plot.'}
      </div>
    )
  }

  return (
    <div className="analysis-observation flex flex-col">
      <ResultToolbar title={`Graphical analysis — ${column}`}
        exports={exportReady ? { png: handleExportPNG, csv: handleExportCSV, pdf: handleExportPDF } : undefined}
        ready={exportReady} disabledReason={isComputing ? 'Waiting for the updated result.' : 'Chart is still loading.'} />
      {staleOverlays.length > 0 && (
          <div className="mx-2 mt-2 px-3 py-2 rounded-md border border-amber-700/50 bg-amber-950/20
          text-xs text-amber-300 leading-snug" role="status">
          Not shown on this plot: {staleOverlays.join(', ')}. A resample cannot be
          repeated from a display change — press Run to draw it again.
        </div>
      )}
      <div>
        <Plot
          data={traces}
          layout={layout}
          config={CONFIG}
          useResizeHandler
          style={{ width: '100%', height: 440 }}
          onInitialized={registry.register('graphical', `${graphType} for ${column}`)}
          onUpdate={registry.register('graphical', `${graphType} for ${column}`)}
          onPurge={registry.unregister('graphical')}
        />
      </div>
      {result.histogram_data && (
        <div className="px-2 pb-3">
          <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-3">
            Bar area represents proportion; height shows density. Hover a bar for its bin bounds and observation count.
          </p>
          <details>
            <summary className="text-sm cursor-pointer py-2">View histogram data ({result.histogram_data.counts.length} bins)</summary>
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Histogram bin data">
              <table className="w-full text-xs text-right border-collapse">
                <caption className="text-left text-[var(--color-text-muted)] py-2">Histogram bins for {column}. Bounds and counts match the exported CSV.</caption>
                <thead><tr>{['Lower bound', 'Upper bound', 'Count', 'Density'].map((heading) => <th scope="col" key={heading} className="p-2 border-b border-[var(--color-border-md)]">{heading}</th>)}</tr></thead>
                <tbody>{result.histogram_data.counts.map((count, index) => (
                  <tr key={index} className="border-b border-[var(--color-border)]">
                    <td className="p-2 font-mono">{result.histogram_data!.bins[index]}</td>
                    <td className="p-2 font-mono">{result.histogram_data!.bins[index + 1]}</td>
                    <td className="p-2 font-mono">{count}</td>
                    <td className="p-2 font-mono">{result.histogram_data!.densities[index]}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
