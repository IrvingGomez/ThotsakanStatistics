import { useMemo, useState } from 'react'
import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-basic-dist-min'

const Plot = createPlotlyComponent(Plotly)

function normalPdf(x: number, mean: number, std: number): number {
  const c = 1 / (std * Math.sqrt(2 * Math.PI))
  const z = (x - mean) / std
  return c * Math.exp(-0.5 * z * z)
}

export default function InteractivePlotTab() {
  const [mean, setMean] = useState(0)
  const [std, setStd] = useState(1)

  const xValues = useMemo(() => {
    const xs: number[] = []
    for (let x = mean - 4 * std; x <= mean + 4 * std; x += std / 20) {
      xs.push(Number(x.toFixed(4)))
    }
    return xs
  }, [mean, std])

  const yValues = useMemo(() => xValues.map((x) => normalPdf(x, mean, std)), [xValues, mean, std])

  return (
    <section className="panel">
      <h2>Normal Distribution Explorer</h2>
      <div className="controls-row">
        <label>
          Mean: <strong>{mean.toFixed(2)}</strong>
          <input
            type="range"
            min={-5}
            max={5}
            step={0.1}
            value={mean}
            onChange={(event) => setMean(Number(event.target.value))}
          />
        </label>
        <label>
          Std Dev: <strong>{std.toFixed(2)}</strong>
          <input
            type="range"
            min={0.2}
            max={3}
            step={0.1}
            value={std}
            onChange={(event) => setStd(Number(event.target.value))}
          />
        </label>
      </div>

      <Plot
        data={[
          {
            x: xValues,
            y: yValues,
            type: 'scatter',
            mode: 'lines',
            name: 'Normal PDF',
            line: { width: 3 },
          },
        ]}
        layout={{
          title: `N(${mean.toFixed(2)}, ${std.toFixed(2)}²)`,
          autosize: true,
          margin: { l: 40, r: 20, t: 40, b: 40 },
          xaxis: { title: 'x' },
          yaxis: { title: 'Density' },
        }}
        style={{ width: '100%', height: 420 }}
        config={{ responsive: true }}
        useResizeHandler
      />
    </section>
  )
}
