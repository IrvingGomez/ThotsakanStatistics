declare module 'react-plotly.js' {
  import { ComponentType } from 'react'
  const Plot: ComponentType<any>
  export default Plot
}

declare module 'react-plotly.js/factory' {
  function createPlotlyComponent(plotly: any): any
  export default createPlotlyComponent
}

declare module 'plotly.js-basic-dist-min' {
  const Plotly: any
  export default Plotly
}

declare module 'katex/dist/katex.min.css'
