/**
 * Download a 2-D array of values as a CSV file.
 * The first row is treated as headers.
 */
export function downloadCSV(rows: (string | number)[][], filename = 'data.csv') {
  const lines = rows.map((row, i) =>
    row
      .map((v) => (i > 0 && typeof v === 'number' ? v.toFixed(6) : String(v)))
      .join(',')
  )
  const content = lines.join('\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
