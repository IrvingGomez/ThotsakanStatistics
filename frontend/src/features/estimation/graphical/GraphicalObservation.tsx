// features/estimation/graphical/GraphicalObservation.tsx
// Centre panel: the plot itself. Histogram / ECDF with the
// requested overlays.

import { useCallback, useMemo } from 'react'
import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-basic-dist-min'
import type { GraphicalResponse } from '../../../api/graphical'
import ResultSection from '../../../components/ResultSection'
import ResultToolbar from '../../../components/ResultToolbar'
import { EmptyState } from '../../../components/StatusBanner'
import { downloadChartsPNG } from '../../../utils/exportPNG'
import { downloadCSV } from '../../../utils/exportCSV'
import { downloadPDF } from '../../../utils/exportPDF'
import { exportFilename } from '../../../utils/exportFilename'
import { useChartRegistry } from '../../../hooks/useChartRegistry'
import { HISTOGRAM_MARKER, PLOT_AXIS, PLOT_COLORS, PLOT_CONFIG, baseLayout } from '../../../plot/theme'

const Plot = createPlotlyComponent(Plotly)

const CHART_ORDER = ['graphical'] as const

// Colors come from the shared plot theme so every tab draws data the same way.
const C_MAIN = PLOT_COLORS.data
const C_KDE = PLOT_COLORS.fit
const C_BAND = PLOT_COLORS.dataBand
const C_NORMAL = PLOT_COLORS.normal

const AXIS = PLOT_AXIS
const CONFIG = PLOT_CONFIG

interface GraphicalObservationProps {
  result: GraphicalResponse | null
  column: string
  graphType: string
  hasData: boolean
  /** A dataset is loaded (it may have no numeric variables). */
  loaded: boolean
  isComputing: boolean
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
  result, column, graphType, hasData, loaded, isComputing,
}: GraphicalObservationProps) {
  const registry = useChartRegistry(CHART_ORDER)

  const traces = useMemo(() => {
    if (!result) return []
    const out: Record<string, unknown>[] = []

    if (result.histogram_data) {
      const { bins, densities, counts } = result.histogram_data
      const { x, width } = barsFromEdges(bins, densities)
      out.push({
        type: 'bar', x, y: densities, width,
        marker: HISTOGRAM_MARKER,
        name: 'Density',
        customdata: counts.map((count, index) => [bins[index], bins[index + 1], count]),
        hovertemplate: 'Bin: %{customdata[0]:.4g} to %{customdata[1]:.4g}<br>Count: %{customdata[2]}<br>Density: %{y:.4g}<extra></extra>',
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
        type: 'scatter', mode: 'lines', x, y,
        line: { shape: 'hv', color: C_MAIN, width: 1.5 }, name: 'ECDF',
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

    if (result.normal_curve) {
      out.push({
        type: 'scatter', mode: 'lines',
        x: result.normal_curve.x, y: result.normal_curve.y,
        line: { color: C_NORMAL, width: 2.5, dash: 'longdash' },
        name: graphType === 'ECDF' ? 'Normal CDF' : 'Normal density',
        hovertemplate: '%{x:.4g}<br>%{y:.4g}<extra></extra>',
      })
    }

    return out
  }, [result, graphType])

  const title =
    graphType === 'ECDF' ? 'Empirical Cumulative Distribution Function' : `Distribution of ${column}`

  const layout = useMemo(() => {
    const yTitle =
      graphType === 'ECDF' ? 'ECDF' : 'Density'

    return baseLayout({
      autosize: true,
      margin: { l: 56, r: 20, t: 12, b: 44 },
      // Touching histogram bars.
      bargap: 0.02,
      xaxis: { ...AXIS, title: column },
      yaxis: {
        ...AXIS,
        title: yTitle,
        ...(graphType === 'ECDF' ? { range: [0, 1.05] } : {}),
      },
      showlegend: true,
      legend: { font: { color: PLOT_COLORS.axisText, size: 12 }, bgcolor: 'transparent', orientation: 'h', y: -0.18 },
    })
  }, [column, graphType])

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
    return <EmptyState loaded={loaded} hasData={false} />
  }

  // While the first result is computing, the status banner above already says so.
  if (!result) return isComputing ? null : <EmptyState loaded={loaded} hasData />

  return (
    <div className="analysis-observation flex flex-col">
      <ResultToolbar title={`Graphical analysis — ${column}`}
        exports={exportReady ? { png: handleExportPNG, csv: handleExportCSV, pdf: handleExportPDF } : undefined}
        ready={exportReady} disabledReason={isComputing ? 'Waiting for the updated result.' : 'Chart is still loading.'} />
      <ResultSection title={title}>
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
      </ResultSection>
      {result.histogram_data && (
        <div className="px-2 pb-3">
          <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-3">
            Bar area represents proportion; height shows density. Hover a bar for its bin bounds and observation count.
          </p>
        </div>
      )}
    </div>
  )
}
