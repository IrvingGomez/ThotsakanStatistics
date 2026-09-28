import ReactPlotly from 'react-plotly.js'
import type { IntervalsResponse } from '../../../api/inference'
import { useMemo } from 'react'
import type { InferenceState } from './useInferenceTabState'
import InferenceResultStatus from './InferenceResultStatus'
import { coveragePercent, intervalRange, parseIntervalRows, pointEstimate, quantityLabel, type IntervalRow } from './inferencePresentation'
import ResultToolbar from '../../../components/ResultToolbar'
import { useChartRegistry } from '../../../hooks/useChartRegistry'
import { downloadChartsPNG } from '../../../utils/exportPNG'
import { downloadCSV } from '../../../utils/exportCSV'
import { downloadPDF } from '../../../utils/exportPDF'
import { exportFilename } from '../../../utils/exportFilename'

const AXIS = { gridcolor: 'rgba(148,163,184,0.18)', zeroline: false, fixedrange: true }
const BASE_LAYOUT = { autosize: true, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', font: { color: '#cbd5e1', size: 12 }, showlegend: false, dragmode: false as const }
const CONFIG = { responsive: true, displayModeBar: false }
const COLORS = ['#fb923c', '#facc15', '#4ade80', '#38bdf8', '#c084fc']

function bracketTraces(rows: IntervalRow[], estimates: IntervalsResponse['point_estimates'], color: string, precision: number): any[] {
  return rows.flatMap((row, index) => {
    const estimate = pointEstimate(row.Statistic, estimates)
    return [
      { x: [row.Lower, row.Upper], y: [index, index], type: 'scatter', mode: 'lines+markers', line: { color, width: 3 }, marker: { color, size: 5 }, name: quantityLabel(row.Statistic), hovertemplate: '%{x:.' + precision + 'f}<extra></extra>' },
      ...(estimate !== null ? [{ x: [estimate], y: [index], type: 'scatter', mode: 'markers', marker: { color, size: 9, symbol: 'diamond' }, name: 'Sample estimate', hovertemplate: 'Sample estimate: %{x:.' + precision + 'f}<extra></extra>' }] : []),
    ]
  })
}
function IntervalPlot({ rows, result, range, color, variable, precision, onReady, onPurge }: {
  rows: IntervalRow[]; result: IntervalsResponse; range?: [number, number]; color: string; variable: string; precision: number
  onReady: (figure: unknown, element: HTMLElement) => void; onPurge: () => void
}) {
  const height = Math.max(145, rows.length * 38 + 74)
  return <>
    <ReactPlotly data={bracketTraces(rows, result.point_estimates, color, precision)} layout={{
      ...BASE_LAYOUT, height, margin: { l: 90, r: 24, b: 48, t: 10 },
      xaxis: { ...AXIS, range, title: { text: variable, standoff: 8 } },
      yaxis: { ...AXIS, tickvals: rows.map((_, index) => index), ticktext: rows.map(row => quantityLabel(row.Statistic)), range: [rows.length - 0.4, -0.6] },
    }} useResizeHandler style={{ width: '100%', height }} config={CONFIG}
      onInitialized={onReady} onUpdate={onReady} onPurge={onPurge} />
    <ul className="text-xs text-[var(--color-text-muted)] px-2 space-y-1 mb-3">
      {rows.map((row, index) => <li key={row.Statistic + index} className="break-words"><strong>{quantityLabel(row.Statistic)}:</strong> {row.Method}</li>)}
    </ul>
  </>
}
export default function InferenceObservation({ state }: { state: InferenceState }) {
  const ciRows = parseIntervalRows(state.ciResult)
  const piRows = parseIntervalRows(state.piResult)
  const region = state.regionResult
  const variable = state.appliedConfig?.column ?? ''
  const result = state.ciResult ?? state.piResult
  const hasResult = !!(result || region)
  const chartOrder = useMemo(() => {
    if (region) return ['region']
    if (!result) return []
    const order: string[] = []
    if ((result.histogram?.binEdges?.length ?? 0) > 1) order.push('observed')
    if (piRows.length) order.push('prediction')
    if (ciRows.some((row) => quantityLabel(row.Statistic) !== 'Deviation')) order.push('location')
    if (ciRows.some((row) => quantityLabel(row.Statistic) === 'Deviation')) order.push('deviation')
    return order
  }, [region, result, ciRows, piRows])
  const registry = useChartRegistry(chartOrder)
  let content
  if (region) {
    const data: any[] = [{
      z: region.z_matrix, x: region.mu_grid, y: region.sigma_grid, type: 'heatmap', colorscale: 'Viridis',
      colorbar: { title: { text: 'Relative likelihood', side: 'right' }, thickness: 12, x: 1.02 },
      hovertemplate: 'Mean %{x:.' + state.precision + 'f}<br>Deviation %{y:.' + state.precision + 'f}<br>Relative likelihood %{z:.3f}<extra></extra>',
    }]
    region.levels.forEach((level, index) => data.push({
      z: region.z_matrix, x: region.mu_grid, y: region.sigma_grid, type: 'contour',
      contours: { start: level, end: level, size: 1, coloring: 'lines' },
      line: { color: COLORS[index % COLORS.length], width: 2 }, name: coveragePercent(region.probs[index]) + ' region', showlegend: true, showscale: false, hoverinfo: 'skip',
    }))
    data.push({ x: [region.mu_hat], y: [region.sigma_hat], mode: 'markers', type: 'scatter', name: 'Estimated mean and deviation', showlegend: true, marker: { color: '#f87171', size: 11, symbol: 'x' }, hovertemplate: 'Mean %{x:.' + state.precision + 'f}<br>Deviation %{y:.' + state.precision + 'f}<extra></extra>' })
    if (state.appliedConfig?.add_ci_box && region.mu_ci && region.sigma_ci) data.push({
      x: [region.mu_ci[0], region.mu_ci[1], region.mu_ci[1], region.mu_ci[0], region.mu_ci[0]], y: [region.sigma_ci[0], region.sigma_ci[0], region.sigma_ci[1], region.sigma_ci[1], region.sigma_ci[0]],
      mode: 'lines', type: 'scatter', name: 'Separate marginal intervals', showlegend: true, line: { color: '#f87171', dash: 'dash', width: 2 }, hoverinfo: 'skip',
    })
    content = <section>
      <h3 className="font-semibold text-base px-2">Joint confidence regions</h3>
      <p className="text-sm text-[var(--color-text-muted)] px-2 mt-2">Contours show uncertainty about mean and deviation together. The cross marks their estimates; the dashed box, when shown, combines separate marginal intervals.</p>
      <div role="img" aria-label={'Joint confidence regions for ' + variable + '. Estimates and coverage levels are available in the results panel.'}>
        <ReactPlotly data={data} layout={{ ...BASE_LAYOUT, height: 470, margin: { l: 62, r: 80, b: 130, t: 20 }, xaxis: { ...AXIS, title: { text: 'Mean (μ)', standoff: 8 } }, yaxis: { ...AXIS, title: { text: 'Deviation (σ)', standoff: 8 } }, showlegend: true, legend: { x: 0, y: -0.25, orientation: 'h', font: { size: 11 } } }} useResizeHandler style={{ width: '100%', height: 470 }} config={CONFIG}
          onInitialized={registry.register('region', 'Joint confidence regions')}
          onUpdate={registry.register('region', 'Joint confidence regions')}
          onPurge={registry.unregister('region')} />
      </div>
    </section>
  } else if (result) {
    const edges = result.histogram?.binEdges ?? []
    const centers = edges.slice(0, -1).map((lower, index) => (lower + edges[index + 1]) / 2)
    const locationRows = ciRows.filter(row => quantityLabel(row.Statistic) !== 'Deviation')
    const deviationRows = ciRows.filter(row => quantityLabel(row.Statistic) === 'Deviation')
    const commonRange = intervalRange([...edges, ...locationRows.flatMap(row => [row.Lower, row.Upper]), ...piRows.flatMap(row => [row.Lower, row.Upper])])
    const ciRange = intervalRange(locationRows.flatMap(row => [row.Lower, row.Upper]))
    content = <div className="space-y-5">
      <p className="text-sm text-[var(--color-text-muted)] px-2">Lines show interval bounds; diamonds show sample estimates where applicable. Exact bounds and methods are in the results panel.</p>
      {centers.length > 0 && <section>
        <h3 className="text-base font-semibold px-2">Observed values</h3>
        <ReactPlotly data={[{ x: centers, y: result.histogram.counts, type: 'bar', marker: { color: 'rgba(148,163,184,0.7)' }, width: edges[1] - edges[0], hovertemplate: 'Count %{y}<extra></extra>' }]} layout={{ ...BASE_LAYOUT, height: 220, margin: { l: 90, r: 24, b: 48, t: 12 }, xaxis: { ...AXIS, range: commonRange, title: { text: variable, standoff: 8 } }, yaxis: { ...AXIS, title: { text: 'Count' } } }} useResizeHandler style={{ width: '100%', height: 220 }} config={CONFIG}
          onInitialized={registry.register('observed', 'Observed values')}
          onUpdate={registry.register('observed', 'Observed values')}
          onPurge={registry.unregister('observed')} />
      </section>}
      {piRows.length > 0 && <section>
        <h3 className="text-base font-semibold px-2">Prediction intervals</h3>
        <p className="text-xs text-[var(--color-text-muted)] px-2 mt-1">One future observation · same x-axis scale as observed values</p>
        <IntervalPlot rows={piRows} result={state.piResult!} range={commonRange} color="#60a5fa" variable={variable} precision={state.precision}
          onReady={registry.register('prediction', 'Prediction intervals')} onPurge={registry.unregister('prediction')} />
      </section>}
      {locationRows.length > 0 && <section>
        <div className="flex items-center justify-between gap-3 flex-wrap px-2">
          <h3 className="text-base font-semibold">Mean and median confidence intervals</h3>
          <button type="button" aria-pressed={state.draft.zoomCI} onClick={() => state.setDraft({ zoomCI: !state.draft.zoomCI })} className="px-3 py-2 rounded-md border border-[var(--color-border-md)] text-xs">{state.draft.zoomCI ? 'Use common scale' : 'Zoom to intervals'}</button>
        </div>
        <p role="status" className={'text-xs px-2 mt-2 ' + (state.draft.zoomCI ? 'text-amber-300' : 'text-[var(--color-text-muted)]')}>{state.draft.zoomCI ? 'Zoomed to confidence intervals — different x-axis scale from observed values and predictions.' : 'Same x-axis scale as observed values and prediction intervals.'}</p>
        <IntervalPlot rows={locationRows} result={state.ciResult!} range={state.draft.zoomCI ? ciRange : commonRange} color="#34d399" variable={variable} precision={state.precision}
          onReady={registry.register('location', 'Mean and median confidence intervals')} onPurge={registry.unregister('location')} />
      </section>}
      {deviationRows.length > 0 && <section>
        <h3 className="text-base font-semibold px-2">Deviation confidence intervals</h3>
        <p className="text-xs text-[var(--color-text-muted)] px-2 mt-1">Spread of the data · separate deviation axis</p>
        <IntervalPlot rows={deviationRows} result={state.ciResult!} color="#fbbf24" variable={'Deviation of ' + variable + ' (data units)'} precision={state.precision}
          onReady={registry.register('deviation', 'Deviation confidence intervals')} onPurge={registry.unregister('deviation')} />
      </section>}
    </div>
  }
  const baseName = `inference-${variable || 'analysis'}`
  const exportCSV = () => {
    if (region) {
      const rows: (string | number)[][] = [
        ['# mu_hat', region.mu_hat, ''], ['# sigma_hat', region.sigma_hat, ''],
        ['# coverage_probabilities', region.probs.join('; '), ''],
        ['mu', 'sigma', 'relative_likelihood'],
      ]
      region.mu_grid.forEach((mu, xIndex) => region.sigma_grid.forEach((sigma, yIndex) => {
        rows.push([mu, sigma, region.z_matrix[yIndex]?.[xIndex] ?? ''])
      }))
      downloadCSV(rows, exportFilename(`${baseName}-confidence-region`, 'csv', 'inference'))
      return
    }
    const rows: (string | number)[][] = [[
      'record_type', 'result_type', 'statistic', 'method', 'lower', 'upper', 'point_estimate', 'status', 'message',
    ]]
    ;[
      ...ciRows.map((row) => ({ row, type: 'confidence', source: state.ciResult! })),
      ...piRows.map((row) => ({ row, type: 'prediction', source: state.piResult! })),
    ].forEach(({ row, type, source }) => rows.push([
      'interval', type, quantityLabel(row.Statistic), row.Method, row.Lower ?? '', row.Upper ?? '',
      pointEstimate(row.Statistic, source.point_estimates) ?? '', 'complete', '',
    ]))
    if (state.partialResult) rows.push(['omitted', '', '', '', '', '', '', 'omitted', state.error ?? 'One requested section failed.'])
    downloadCSV(rows, exportFilename(`${baseName}-intervals`, 'csv', 'inference'))
  }
  const exportPNG = () => downloadChartsPNG(registry.charts, exportFilename(`${baseName}-charts`, 'png', 'inference'))
  const exportPDF = async () => {
    const intervalRows = [...ciRows.map((row) => ['Confidence', quantityLabel(row.Statistic), row.Method, row.Lower, row.Upper]),
      ...piRows.map((row) => ['Prediction', quantityLabel(row.Statistic), row.Method, row.Lower, row.Upper])]
    await downloadPDF({
      title: `Statistical Inference - ${variable}`,
      subtitle: state.appliedConfig?.estimationType,
      charts: registry.charts,
      stats: [
        { label: 'Variable', value: variable },
        { label: 'Alpha', value: String(state.appliedConfig?.alpha ?? '') },
        ...(state.partialResult ? [{ label: 'Partial result', value: state.error ?? 'One requested section failed.' }] : []),
      ],
      tables: intervalRows.length ? [{ title: 'Intervals', columns: ['Type', 'Statistic', 'Method', 'Lower', 'Upper'], rows: intervalRows }] : [],
      filename: exportFilename(`${baseName}-report`, 'pdf', 'inference'),
    })
  }
  const exportReady = hasResult && !state.isComputing && registry.ready

  return <div className="analysis-panel analysis-observation p-3">
    <InferenceResultStatus state={state} />
    <ResultToolbar title={`Inference — ${variable || 'results'}`}
      exports={exportReady ? { png: exportPNG, csv: exportCSV, pdf: exportPDF } : undefined}
      ready={exportReady} disabledReason={state.isComputing ? 'Waiting for the applied result.' : 'Charts are still loading.'} />
    {!hasResult && !state.isComputing && !state.error && <p className="text-sm text-[var(--color-text-muted)] p-6">{state.hasData ? 'Choose settings, then select Update to see interval plots.' : 'Upload a CSV in Data to begin.'}</p>}
    {content}
  </div>
}
