import { useMemo, useCallback } from 'react'
import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-basic-dist-min'
import type { DistResult, DistParams, QueryOp } from '../../../hooks/useDistribution'
import { DISTRIBUTIONS } from '../../../hooks/useDistribution'
import ResultToolbar from '../../../components/ResultToolbar'
import ResultSection from '../../../components/ResultSection'
import StatusBanner from '../../../components/StatusBanner'
import { PLOT_AXIS, PLOT_COLORS, PLOT_CONFIG, baseLayout } from '../../../plot/theme'
import { downloadChartsPNG } from '../../../utils/exportPNG'
import { downloadCSV } from '../../../utils/exportCSV'
import { downloadPDF } from '../../../utils/exportPDF'
import { exportFilename } from '../../../utils/exportFilename'
import { useChartRegistry } from '../../../hooks/useChartRegistry'

const Plot = createPlotlyComponent(Plotly)

const CHART_ORDER = ['distribution'] as const

interface CommonDistObservationProps {
  distParams: DistParams
  appliedParams: DistParams | null
  result: DistResult | null
  isLoading: boolean
  error: string | null
  onRetry: () => void
  /** Data tab → Display precision. */
  precision: number
}

const LAYOUT_BASE = baseLayout({
  autosize: true,
  margin: { l: 52, r: 20, t: 20, b: 60 },
  showlegend: true,
  legend: { font: { color: PLOT_COLORS.axisText, size: 12 }, bgcolor: 'transparent', orientation: 'h' as const, y: -0.18 },
  bargap: 0.15,
})
const AXIS = PLOT_AXIS

function opLabel(op: QueryOp, k: number, result: number, precision: number): string {
  return `P(X ${op} ${k}) = ${result.toFixed(precision)}`
}

function barColors(ks: number[], op: QueryOp, kVal: number): string[] {
  return ks.map((k) => {
    switch (op) {
      case '<=': return k <= kVal ? PLOT_COLORS.highlight : PLOT_COLORS.inactive
      case '>=': return k >= kVal ? PLOT_COLORS.highlight : PLOT_COLORS.inactive
      case '=':  return k === kVal ? PLOT_COLORS.highlight : PLOT_COLORS.inactive
      case '<':  return k < kVal  ? PLOT_COLORS.highlight : PLOT_COLORS.inactive
      case '>':  return k > kVal  ? PLOT_COLORS.highlight : PLOT_COLORS.inactive
      default:   return PLOT_COLORS.inactive
    }
  })
}

function buildDiscreteChart(result: DistResult, op: QueryOp, queryK: number) {
  const kVal = Math.round(queryK)
  const ks = result.ks ?? []
  const probs = result.probs ?? []
  return {
    traces: [{
      x: ks,
      y: probs,
      type: 'bar' as const,
      marker: { color: barColors(ks, op, kVal) },
      name: 'P(X = k)',
      hovertemplate: 'k=%{x}<br>P(X=k)=%{y:.4f}<extra></extra>',
    }],
    layout: {
      ...LAYOUT_BASE,
      xaxis: { ...AXIS, title: { text: 'X (number of occurrences)' } },
      yaxis: { ...AXIS, title: { text: 'P(X = k)' } },
    },
  }
}

function buildContinuousChart(result: DistResult, op: QueryOp, queryK: number, precision: number) {
  const xs = result.xs ?? []
  const ys = result.ys ?? []

  const shadeXs: number[] = []
  const shadeYs: number[] = []
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i]
    let match = false
    switch (op) {
      case '<=': case '<': match = x <= queryK; break
      case '>=': case '>': match = x >= queryK; break
      case '=': match = false; break
    }
    if (match) { shadeXs.push(x); shadeYs.push(ys[i]) }
  }

  return {
    traces: [
      ...(shadeXs.length > 0 ? [{
        x: shadeXs, y: shadeYs,
        type: 'scatter' as const,
        mode: 'none' as const,
        fill: 'tozeroy' as const,
        fillcolor: PLOT_COLORS.highlightFill,
        name: opLabel(op, queryK, result.queryResult, precision),
        showlegend: true,
        hoverinfo: 'skip' as const,
      }] : []),
      {
        x: xs, y: ys,
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: 'PDF',
        line: { color: PLOT_COLORS.highlight, width: 2.5 },
      },
      {
        x: [queryK, queryK],
        y: [0, Math.max(0, ...ys.filter((y) => isFinite(y))) * 1.05],
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: `x = ${queryK}`,
        line: { color: PLOT_COLORS.reference, width: 1.5, dash: 'dash' as const },
      },
    ],
    layout: {
      ...LAYOUT_BASE,
      xaxis: { ...AXIS, title: { text: 'x' } },
      yaxis: { ...AXIS, title: { text: 'Density' } },
    },
  }
}

export default function CommonDistObservation({ distParams, appliedParams, result, isLoading, error, onRetry, precision }: CommonDistObservationProps) {
  const displayParams = result?.provisional ? distParams : (appliedParams ?? distParams)
  const { distName, queryOp, queryK, paramValues } = displayParams
  const dist = DISTRIBUTIONS.find((d) => d.name === distName)
  const registry = useChartRegistry(CHART_ORDER)
  const baseName = `${distName}-distribution`

  const handleExportPNG = useCallback(() => {
    return downloadChartsPNG(registry.charts, exportFilename(`${baseName}-chart`, 'png', 'distribution'))
  }, [registry.charts, baseName])

  const handleExportCSV = useCallback(() => {
    if (!result) return
    if (dist?.type === 'discrete') {
      const { ks = [], probs = [], cumProbs = [] } = result
      const rows: (string | number | null)[][] = [['k', 'probability', 'cumulative_probability']]
      ks.forEach((k: number, i: number) => rows.push([k, probs[i] ?? null, cumProbs[i] ?? null]))
      downloadCSV(rows, exportFilename(`${baseName}-pmf`, 'csv', 'distribution'))
    } else {
      const { xs = [], ys = [], cdfYs = [] } = result
      const rows: (string | number | null)[][] = [['x', 'density', 'cumulative_probability']]
      xs.forEach((x: number, i: number) => rows.push([x, ys[i] ?? null, cdfYs[i] ?? null]))
      downloadCSV(rows, exportFilename(`${baseName}-pdf`, 'csv', 'distribution'))
    }
  }, [dist, result, baseName])

  const handleExportPDF = useCallback(async () => {
    if (!result) return
    const meanStr = typeof result.theorMean === 'number' ? result.theorMean.toFixed(precision) : String(result.theorMean)
    const varStr  = typeof result.theorVariance === 'number' ? result.theorVariance.toFixed(precision) : String(result.theorVariance)
    await downloadPDF({
      charts: registry.charts,
      title: `${distName} Distribution`,
      subtitle: `Query: P(X ${queryOp} ${queryK}) = ${result.queryResult.toFixed(precision)}`,
      stats: [
        { label: 'Distribution', value: distName },
        { label: 'Type',         value: dist?.type === 'discrete' ? 'Discrete' : 'Continuous' },
        { label: 'Mean E[X]',    value: meanStr },
        { label: 'Variance',     value: varStr },
        { label: `P(X ${queryOp} ${queryK})`, value: result.queryResult.toFixed(precision) },
        ...Object.entries(paramValues).map(([k, v]) => ({ label: k, value: String(v) })),
      ],
      filename: exportFilename(`${baseName}-report`, 'pdf', 'distribution'),
    })
  }, [distName, dist, queryOp, queryK, result, paramValues, baseName, registry.charts, precision])

  const exportReady = !!result && !result.provisional && !isLoading && !!appliedParams && registry.ready
  const exportHandlers = exportReady ? { png: handleExportPNG, csv: handleExportCSV, pdf: handleExportPDF } : undefined

  const statCards = useMemo(() => {
    if (!result) return []
    return [
      {
        label: 'Theoretical Mean',
        value: typeof result.theorMean === 'number' ? result.theorMean.toFixed(precision) : String(result.theorMean),
      },
      {
        label: 'Variance',
        value: typeof result.theorVariance === 'number' ? result.theorVariance.toFixed(precision) : String(result.theorVariance),
      },
      {
        label: `P(X ${queryOp} ${queryK})`,
        value: result.queryResult.toFixed(precision),
        highlight: true,
      },
    ]
  }, [result, queryOp, queryK, precision])

  const { traces, layout } = useMemo(() => {
    if (!dist || !result) return { traces: [], layout: LAYOUT_BASE }
    return dist.type === 'discrete'
      ? buildDiscreteChart(result, queryOp, queryK)
      : buildContinuousChart(result, queryOp, queryK, precision)
  }, [dist, result, queryOp, queryK, precision])

  const status = <StatusBanner isComputing={false} error={error} hasResult={!!result} onRetry={onRetry} />

  if (!result) return status

  return (
    <div className="flex flex-col gap-4">
      {status}
      <ResultToolbar title={`${distName} distribution`} exports={exportHandlers} ready={exportReady}
        disabledReason={result.provisional || isLoading ? 'Waiting for the authoritative backend result.' : 'Chart is still loading.'} />

      <div className={`grid grid-cols-3 gap-3 transition-opacity ${result.provisional ? 'opacity-80' : ''}`}>
        {statCards.map((card) => (
          <div key={card.label} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] p-3">
            <p className="mb-1 text-xs text-[var(--color-text-muted)]">
              {card.label}
              {card.highlight && result.provisional && (
                <span className="ml-1 text-[var(--color-accent)]" title="Provisional — awaiting backend result">≈</span>
              )}
            </p>
            <p className={`text-2xl font-bold tabular-nums ${card.highlight ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <ResultSection title={dist?.type === 'discrete' ? 'Probability mass function' : 'Probability density function'}>
        <Plot
          data={traces}
          layout={layout as object}
          style={{ width: '100%', height: 380 }}
          config={PLOT_CONFIG}
          useResizeHandler
          onInitialized={registry.register('distribution', `${distName} distribution`)}
          onUpdate={registry.register('distribution', `${distName} distribution`)}
          onPurge={registry.unregister('distribution')}
        />
      </ResultSection>
    </div>
  )
}
