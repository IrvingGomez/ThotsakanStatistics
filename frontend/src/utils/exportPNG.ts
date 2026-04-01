import Plotly from 'plotly.js-basic-dist-min'

/**
 * Download the Plotly chart identified by `divId` as a PNG file.
 */
export async function downloadChartPNG(divId: string, filename = 'chart.png') {
  const el = document.getElementById(divId)
  if (!el) return

  const url = await (Plotly as unknown as { toImage: (el: HTMLElement, opts: object) => Promise<string> })
    .toImage(el, { format: 'png', width: 1200, height: 600 })

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
