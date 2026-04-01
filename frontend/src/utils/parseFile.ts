import Papa from 'papaparse'

export interface ParsedDataset {
  headers: string[]
  rows: Record<string, string>[]     // raw strings
  numericCols: string[]
  categoricalCols: string[]
}

function inferColType(values: string[]): 'numeric' | 'categorical' {
  const nonEmpty = values.filter((v) => v.trim() !== '' && v.toLowerCase() !== 'null' && v.toLowerCase() !== 'na')
  if (nonEmpty.length === 0) return 'categorical'
  const numericCount = nonEmpty.filter((v) => !isNaN(Number(v))).length
  return numericCount / nonEmpty.length >= 0.8 ? 'numeric' : 'categorical'
}

export async function parseFile(file: File): Promise<ParsedDataset> {
  const name = file.name.toLowerCase()
  if (!name.endsWith('.csv') && !name.endsWith('.tsv') && !name.endsWith('.txt')) {
    throw new Error('Only CSV/TSV/TXT files are supported. (Excel support coming soon)')
  }

  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          reject(new Error(results.errors[0].message))
          return
        }

        const rows = results.data
        const headers = results.meta.fields ?? []

        // Infer column types
        const numericCols: string[] = []
        const categoricalCols: string[] = []

        for (const h of headers) {
          const vals = rows.map((r) => r[h] ?? '')
          if (inferColType(vals) === 'numeric') numericCols.push(h)
          else categoricalCols.push(h)
        }

        resolve({ headers, rows, numericCols, categoricalCols })
      },
      error: (error: Error) => reject(error),
    })
  })
}

/** Extract a numeric column as a float array, dropping NaN/missing values */
export function extractNumeric(
  rows: Record<string, string>[],
  col: string
): number[] {
  return rows
    .map((r) => parseFloat(r[col] ?? ''))
    .filter((v) => !isNaN(v) && isFinite(v))
}

/** Get all unique values in a categorical column */
export function uniqueValues(rows: Record<string, string>[], col: string): string[] {
  return [...new Set(rows.map((r) => r[col] ?? '').filter((v) => v !== ''))].sort()
}
