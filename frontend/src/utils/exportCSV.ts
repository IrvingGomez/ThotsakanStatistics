export type CSVCell = string | number | boolean | null | undefined

function spreadsheetSafe(value: string) {
  const candidate = value.trimStart()
  const safeNegativeNumber = /^-\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(candidate)
  return /^[=+@]/.test(candidate) || (candidate.startsWith('-') && !safeNegativeNumber) ? `'${value}` : value
}

export function serializeCSV(rows: readonly (readonly CSVCell[])[]) {
  return rows.map((row) => row.map((cell) => {
    if (cell == null) return ''
    const raw = typeof cell === 'number' ? (Number.isFinite(cell) ? String(cell) : '') : spreadsheetSafe(String(cell))
    return /[",\r\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw
  }).join(',')).join('\r\n')
}

/** Download RFC-style UTF-8 CSV that opens correctly in spreadsheet apps. */
export function downloadCSV(rows: readonly (readonly CSVCell[])[], filename = 'data.csv') {
  const blob = new Blob(['\uFEFF', serializeCSV(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
