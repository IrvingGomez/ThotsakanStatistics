import { describe, expect, it } from 'vitest'
import { parseFile } from './parseFile'

describe('parseFile', () => {
  it('accepts only .csv files, like the server', async () => {
    for (const name of ['data.tsv', 'data.txt']) {
      await expect(parseFile(new File(['a\tb\n1\t2\n'], name))).rejects.toThrow('Only CSV files are supported')
    }
  })

  it('splits on commas only, so it sees the same columns as the server', async () => {
    const dataset = await parseFile(new File(['a\tb\n1\t2\n'], 'tabs.csv'))
    expect(dataset.headers).toEqual(['a\tb'])
  })
})
