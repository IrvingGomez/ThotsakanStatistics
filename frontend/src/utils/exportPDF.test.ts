import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  toImage: vi.fn(),
  documents: [] as Array<{
    page: number; texts: string[]; images: unknown[][]; saved: string
  }>,
}))

vi.mock('plotly.js-basic-dist-min', () => ({ default: { toImage: mocks.toImage } }))
vi.mock('jspdf', () => ({ default: class MockDocument {
  page = 1
  texts: string[] = []
  images: unknown[][] = []
  saved = ''
  internal = { pageSize: { getWidth: () => 297, getHeight: () => 210 } }
  constructor() { mocks.documents.push(this) }
  setFont() { return this }
  setFontSize() { return this }
  setTextColor() { return this }
  setDrawColor() { return this }
  text(value: string | string[]) { this.texts.push(Array.isArray(value) ? value.join(' ') : value); return this }
  splitTextToSize(value: string) { return [value] }
  addPage() { this.page += 1; return this }
  addImage(...args: unknown[]) { this.images.push(args); return this }
  line() { return this }
  getNumberOfPages() { return this.page }
  setPage() { return this }
  save(filename: string) { this.saved = filename }
} }))
import { downloadPDF } from './exportPDF'

afterEach(() => {
  mocks.toImage.mockReset()
  mocks.documents.length = 0
  document.body.replaceChildren()
})

describe('PDF export contract', () => {
  it('keeps chart rendering intact while ASCII-normalizing metadata and paginating tables', async () => {
    mocks.toImage.mockResolvedValue('data:image/png;base64,unicode-chart')
    const chart = document.createElement('div')
    document.body.appendChild(chart)
    Object.defineProperties(chart, { clientWidth: { value: 800 }, clientHeight: { value: 400 } })
    const rows = Array.from({ length: 70 }, (_, index) => [index, `row ${index}`])

    await downloadPDF({
      title: 'Inference α μ σ',
      charts: [{ element: chart, title: 'Unicode chart μ' }],
      stats: [{ label: 'α', value: 'μ and σ' }],
      tables: [{ title: 'Rows', columns: ['index', 'value'], rows }],
      filename: 'report.pdf',
    })

    const doc = mocks.documents[0]
    expect(mocks.toImage).toHaveBeenCalledWith(chart, expect.any(Object))
    expect(doc.images[0][0]).toBe('data:image/png;base64,unicode-chart')
    expect(doc.texts.join(' ')).toContain('alpha')
    expect(doc.texts.join(' ')).toContain('mu')
    expect(doc.texts.join(' ')).not.toMatch(/[αμσ]/)
    expect(doc.texts.filter(text => text === 'Rows').length).toBeGreaterThan(1)
    expect(doc.page).toBeGreaterThan(3)
    expect(doc.saved).toBe('report.pdf')
  })

  it('fails visibly when a required chart is missing', async () => {
    await expect(downloadPDF({ title: 'Report', charts: [], filename: 'report.pdf' }))
      .rejects.toThrow('Charts are still loading')
  })
})
