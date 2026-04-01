import type { IntervalsResponse, ConfidenceRegionsResponse } from '../../../api/inference';
import ReactPlotly from 'react-plotly.js';

interface InferenceObservationProps {
  ciRow?: IntervalsResponse | null;
  piRow?: IntervalsResponse | null;
  regionData?: ConfidenceRegionsResponse | null;
  isComputing: boolean;
  hasData: boolean;
  precision: number;
}

export default function InferenceObservation({ ciRow, piRow, regionData, hasData }: InferenceObservationProps) {
  if (!hasData) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--color-text-muted)] border border-dashed border-[var(--color-border-md)] rounded-xl m-4">
        Waiting for data...
      </div>
    );
  }

  if (regionData) {
     const data: any[] = [{
       z: regionData.z_matrix,
       x: regionData.mu_grid,
       y: regionData.sigma_grid,
       type: 'contour',
       colorscale: 'Viridis',
       contours: {
         coloring: 'heatmap',
         start: regionData.levels[regionData.levels.length - 1],
         end: regionData.levels[0],
         size: (regionData.levels[0] - regionData.levels[regionData.levels.length - 1]) / 10
       },
       colorbar: { title: 'Relative Likelihood' }
     }];

     // Add MLE point
     data.push({
       x: [regionData.mu_hat],
       y: [regionData.sigma_hat],
       mode: 'markers',
       type: 'scatter',
       name: 'MLE',
       marker: { color: 'red', size: 10, symbol: 'x' }
     });

     // Add CI Box if available
     if (regionData.mean_ci && regionData.sigma_ci) {
        data.push({
           x: [regionData.mean_ci[0], regionData.mean_ci[1], regionData.mean_ci[1], regionData.mean_ci[0], regionData.mean_ci[0]],
           y: [regionData.sigma_ci[0], regionData.sigma_ci[0], regionData.sigma_ci[1], regionData.sigma_ci[1], regionData.sigma_ci[0]],
           mode: 'lines',
           type: 'scatter',
           name: 'Individual CIs',
           line: { color: 'black', dash: 'dash', width: 2 }
        })
     }

     return (
       <div className="flex flex-col h-full w-full relative group p-2">
         <ReactPlotly
            data={data}
            layout={{
              autosize: true,
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              font: { color: 'var(--color-text)' },
              margin: { l: 60, r: 60, b: 60, t: 60, pad: 4 },
              xaxis: { title: 'Parameter 1 (μ)' },
              yaxis: { title: 'Parameter 2 (σ)' },
              showlegend: true,
              legend: { x: 1.05, y: 1 }
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true, displayModeBar: false }}
         />
       </div>
    );
  }

  if (ciRow || piRow) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-muted)] border border-dashed border-[var(--color-border-md)] rounded-xl m-4 p-8 text-center text-sm bg-[var(--color-bg-elevated)] leading-relaxed">
         <span className="text-4xl mb-4">📊</span>
         <p className="text-[var(--color-text)] font-semibold text-lg mb-2">Interval Estimates Computed</p>
         <p>
           The statistical results are displayed in the Notebook panel on the right. 
           Interval plots are generally better viewed as summary tables, check the Notebook to see the values.
         </p>
      </div>
    )
  }

  return (
    <div className="h-full flex items-center justify-center text-[var(--color-text-muted)]">
      Run estimation to see plots or results.
    </div>
  );
}
