import { useMemo } from 'react';
import ReactPlotly from 'react-plotly.js';
import type { HypothesisResponse, RejectionRegionData } from '../../api/hypothesis';
import ResultToolbar from '../../components/ResultToolbar';
import { EmptyState } from '../../components/StatusBanner';
import { useChartRegistry } from '../../hooks/useChartRegistry';
import { downloadChartsPNG } from '../../utils/exportPNG';
import { downloadCSV } from '../../utils/exportCSV';
import { downloadPDF } from '../../utils/exportPDF';
import { exportFilename } from '../../utils/exportFilename';

const CHART_ORDER = ['hypothesis'] as const;

interface HypothesisObservationProps {
  result: HypothesisResponse | null;
  hasData: boolean;
  /** A dataset is loaded (it may have no numeric variables). */
  loaded: boolean;
  precision: number;
  isComputing: boolean;
  isDirty: boolean;
}

// ponytail: Plotly parses colors itself — CSS vars don't resolve, so use literals
const C_REJECT = 'rgba(239,68,68,0.28)';
const C_P_AREA = 'rgba(59,130,246,0.45)';
const C_CURVE = '#9ca3af';
const C_CRIT = '#ef4444';
const C_STAT = '#e5e7eb'; // near-white: the panel behind the plot is dark

const AXIS = { gridcolor: 'rgba(128,128,128,0.15)', zeroline: false };
const BASE_LAYOUT = {
  autosize: true,
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'transparent',
  font: { color: '#888', size: 11 },
  showlegend: false,
};
const CONFIG = { responsive: true, displayModeBar: false };

const DIST_LABEL: Record<RejectionRegionData['dist'], string> = { t: 't', chi2: 'χ²', f: 'F' };

/** Statistic symbol shown on the axis and the marker, per null distribution. */
function statSymbol(dist: RejectionRegionData['dist']): string {
  return dist === 't' ? 't' : dist === 'chi2' ? 'χ²' : 'F';
}

/** Pin a value to the plotted domain so an off-scale marker still draws, at the edge. */
function clampToRange(value: number, [lo, hi]: [number, number]): number {
  return Math.min(Math.max(value, lo), hi);
}

/** Label for a statistic pinned to the edge, so the real value is never hidden. */
function offscaleAnnotation(region: RejectionRegionData, precision: number): any {
  const beyondUpper = region.statistic > region.x_range[1];
  return {
    x: clampToRange(region.statistic, region.x_range),
    y: region.y_max,
    xanchor: beyondUpper ? 'right' : 'left',
    yanchor: 'top',
    text: `${statSymbol(region.dist)} = ${region.statistic.toFixed(precision)} ${beyondUpper ? '→' : '←'}`,
    showarrow: false,
    font: { color: C_STAT, size: 11 },
    bgcolor: 'rgba(0,0,0,0.35)',
    borderpad: 3,
  };
}

/** The slice of the curve lying inside [lo, hi], as a filled polygon. */
function shade(region: RejectionRegionData, lo: number, hi: number, color: string) {
  const xs: number[] = [];
  const ys: number[] = [];
  region.x.forEach((x, i) => {
    if (x >= lo && x <= hi) { xs.push(x); ys.push(region.pdf[i]); }
  });
  if (xs.length === 0) return null;
  return {
    x: xs,
    y: ys,
    type: 'scatter',
    mode: 'lines',
    fill: 'tozeroy',
    fillcolor: color,
    line: { width: 0 },
    hoverinfo: 'skip',
  };
}

export default function HypothesisObservation({
  result, hasData, loaded, precision, isComputing, isDirty,
}: HypothesisObservationProps) {
  const registry = useChartRegistry(CHART_ORDER);
  const traces = useMemo(() => {
    if (!result) return [];
    const region = result.rejection_region;
    const out: any[] = [];

    // 1. Rejection region — fixed by α.
    region.reject_region.forEach(([lo, hi]) => {
      const t = shade(region, lo, hi, C_REJECT);
      if (t) out.push(t);
    });

    // 2. p-value area — fixed by the observed statistic.
    region.p_area.forEach(([lo, hi]) => {
      const t = shade(region, lo, hi, C_P_AREA);
      if (t) out.push(t);
    });

    // 3. The null density itself.
    out.push({
      x: region.x, y: region.pdf, type: 'scatter', mode: 'lines',
      line: { color: C_CURVE, width: 2, dash: 'dot' }, hoverinfo: 'skip',
    });

    // 4. Critical value(s).
    region.critical_values.forEach((cv) => {
      out.push({
        x: [cv, cv], y: [0, region.y_max], type: 'scatter', mode: 'lines',
        line: { color: C_CRIT, width: 1.5, dash: 'dash' },
        hovertemplate: `critical ${statSymbol(region.dist)} = ${cv.toFixed(precision)}<extra></extra>`,
      });
    });

    // 5. The observed statistic, drawn last so it sits on top. A statistic far
    //    outside the null scale is pinned to the axis edge — the grid stays on
    //    the curve's scale, and the annotation below carries the true value.
    const at = clampToRange(region.statistic, region.x_range);
    out.push({
      x: [at, at], y: [0, region.y_max],
      type: 'scatter', mode: 'lines', line: { color: C_STAT, width: 2.5 },
      hovertemplate: `${statSymbol(region.dist)} = ${region.statistic.toFixed(precision)}<extra></extra>`,
    });

    return out;
  }, [result, precision]);

  if (!hasData) {
    return <EmptyState loaded={loaded} hasData={false} />;
  }

  if (!result) {
    return (
      <div className="p-6 text-sm text-[var(--color-text-muted)] border border-dashed border-[var(--color-border-md)] rounded-xl">
        Complete the test settings to see the result.
      </div>
    );
  }

  const region = result.rejection_region;
  const dofLabel = region.dof.map((d) => (Number.isInteger(d) ? d : d.toFixed(precision))).join(', ');
  const baseName = `hypothesis-${result.test_type}`;
  const canExport = !isDirty && !isComputing && registry.ready;
  const exportHandlers = canExport ? {
    png: () => downloadChartsPNG(registry.charts, exportFilename(`${baseName}-chart`, 'png', 'hypothesis')),
    csv: () => downloadCSV([
      ['section', 'metric', 'group', 'value'],
      ['settings', 'test_type', '', result.test_type],
      ['settings', 'alpha', '', result.alpha],
      ['result', 'statistic', '', result.statistic],
      ['result', 'p_value', '', result.p_value],
      ['result', 'degrees_of_freedom', '', region.dof.join('; ')],
      ['result', 'critical_values', '', region.critical_values.join('; ')],
      ...((result.group_summary ?? []).flatMap((group) => [
        ['group_summary', 'n', group.name, group.n],
        ['group_summary', 'mean', group.name, group.mean],
        ['group_summary', 'sd', group.name, group.sd],
        ['group_summary', 'variance', group.name, group.var],
      ])),
    ], exportFilename(baseName, 'csv', 'hypothesis')),
    pdf: () => downloadPDF({
      title: `Hypothesis Test - ${result.test_type}`,
      subtitle: `${result.h0} vs ${result.h1}`,
      charts: registry.charts,
      stats: [
        { label: 'Alpha', value: String(result.alpha) },
        { label: 'Statistic', value: String(result.statistic) },
        { label: 'P-value', value: String(result.p_value) },
        { label: 'Critical values', value: region.critical_values.join(', ') },
      ],
      filename: exportFilename(`${baseName}-report`, 'pdf', 'hypothesis'),
    }),
  } : undefined;

  return (
    <div className="analysis-observation flex flex-col gap-3">
      <ResultToolbar title="Hypothesis test result" exports={exportHandlers} ready={canExport}
        disabledReason={isDirty ? 'Waiting for the updated result.' : isComputing ? 'Waiting for the result.' : 'Chart is still loading.'} />
      <div className="flex flex-wrap items-baseline justify-between gap-2 shrink-0">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">
          Null distribution · {DIST_LABEL[region.dist]}({dofLabel})
        </h3>
        <span className="text-xs text-[var(--color-text-muted)]">
          Rejection area α = {result.alpha}
        </span>
      </div>

      <ul aria-label="Plot legend" className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--color-text-muted)]">
        <li className="flex items-center gap-2"><span aria-hidden="true" className="w-5 border-t-2 border-[#e5e7eb]" />Solid: observed statistic</li>
        <li className="flex items-center gap-2"><span aria-hidden="true" className="w-5 border-t-2 border-dashed border-red-400" />Dashed: critical boundary</li>
        <li className="flex items-center gap-2"><span aria-hidden="true" className="w-5 border-t-2 border-dotted border-gray-400" />Dotted: null density</li>
        <li className="flex items-center gap-2"><span aria-hidden="true" className="w-4 h-3 bg-red-500/30 border border-red-400" />Red area: rejection region</li>
        <li className="flex items-center gap-2"><span aria-hidden="true" className="w-4 h-3 bg-blue-500/50 border border-blue-400" />Blue area: p-value</li>
      </ul>
      <div className="hypothesis-plot min-w-0" style={{ height: 360 }} role="img" aria-label={`Null distribution. Observed ${statSymbol(region.dist)} statistic ${region.statistic.toFixed(precision)}; critical boundaries ${region.critical_values.map(value => value.toFixed(precision)).join(', ')}. p-value ${result.p_value.toPrecision(3)}.`}>
        <ReactPlotly
          data={traces}
          layout={{
            ...BASE_LAYOUT,
            margin: { l: 45, r: 20, t: 10, b: 40 },
            xaxis: {
              ...AXIS,
              range: region.x_range,
              title: { text: `${statSymbol(region.dist)} statistic`, standoff: 6 },
            },
            yaxis: { ...AXIS, range: [0, region.y_max * 1.05], title: { text: 'density', standoff: 6 } },
            annotations: region.statistic_offscale ? [offscaleAnnotation(region, precision)] : [],
          }}
          config={CONFIG}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler
          onInitialized={registry.register('hypothesis', 'Null distribution and rejection region')}
          onUpdate={registry.register('hypothesis', 'Null distribution and rejection region')}
          onPurge={registry.unregister('hypothesis')}
        />
      </div>

    </div>
  );
}
