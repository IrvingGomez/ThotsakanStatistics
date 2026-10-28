import Plotly from 'plotly.js-basic-dist-min'

export interface ExportChart {
  element: HTMLElement
  title?: string
}

const EXPORT_WIDTH = 1200
const GAP = 24

async function chartImage(chart: ExportChart) {
  const ratio = chart.element.clientWidth > 0
    ? Math.max(0.25, chart.element.clientHeight / chart.element.clientWidth)
    : 0.5
  const height = Math.round(EXPORT_WIDTH * ratio)
  const url = await (Plotly as unknown as {
    toImage: (element: HTMLElement, options: object) => Promise<string>
  }).toImage(chart.element, { format: 'png', width: EXPORT_WIDTH, height })
  const image = new Image()
  image.src = url
  await image.decode()
  return { image, height }
}

export async function composeChartsPNG(charts: readonly ExportChart[], background = '#0b1020') {
  if (!charts.length || charts.some((chart) => !chart.element?.isConnected)) {
    throw new Error('Charts are still loading. Try exporting again in a moment.')
  }
  const images = await Promise.all(charts.map(chartImage))
  const canvas = document.createElement('canvas')
  canvas.width = EXPORT_WIDTH
  canvas.height = images.reduce((sum, image) => sum + image.height, 0) + GAP * (images.length - 1)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser cannot prepare the chart image.')
  context.fillStyle = background
  context.fillRect(0, 0, canvas.width, canvas.height)
  let y = 0
  images.forEach(({ image, height }) => {
    context.drawImage(image, 0, y, EXPORT_WIDTH, height)
    y += height + GAP
  })
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => {
    if (blob) resolve(blob)
    else reject(new Error('The chart image could not be created.'))
  }, 'image/png'))
}

export async function downloadChartsPNG(charts: readonly ExportChart[], filename = 'chart.png') {
  const blob = await composeChartsPNG(charts)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
