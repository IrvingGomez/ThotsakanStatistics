import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadCSV, serializeCSV } from './exportCSV'
import { exportFilename } from './exportFilename'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('CSV export contract', () => {
  it('uses RFC quoting, blank unavailable cells, CRLF, and spreadsheet-safe formulas', () => {
    expect(serializeCSV([
      ['name', 'value'],
      ['a,b', 'a"b'],
      ['line\nbreak', null],
      ['=SUM(A1:A2)', -2],
      ['  @cmd', '-2'],
    ])).toBe('name,value\r\n"a,b","a""b"\r\n"line\nbreak",\r\n\'=SUM(A1:A2),-2\r\n\'  @cmd,-2')
  })

  it('prefixes downloaded UTF-8 content with a BOM', () => {
    let parts: BlobPart[] = []
    class BlobCapture { constructor(next: BlobPart[]) { parts = next } }
    vi.stubGlobal('Blob', BlobCapture)
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:test', revokeObjectURL: vi.fn() })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    downloadCSV([['hello']], 'result.csv')
    expect(parts[0]).toBe('\uFEFF')
  })
})

describe('export filenames', () => {
  it('normalizes unsafe names, avoids Windows reserved names, and caps the stem', () => {
    expect(exportFilename('  My: Result?. ', 'csv')).toBe('my-result.csv')
    expect(exportFilename('CON', 'pdf', 'hypothesis')).toBe('hypothesis.pdf')
    expect(exportFilename('x'.repeat(150), '.png')).toBe(`${'x'.repeat(116)}.png`)
  })
})
