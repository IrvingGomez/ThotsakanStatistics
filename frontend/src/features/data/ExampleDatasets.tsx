// features/data/ExampleDatasets.tsx
// Datasets shipped with the app (frontend/public/datasets), loaded exactly like an uploaded file.

import { useState } from 'react'
import { useData } from '../../context/DataContext'

export const EXAMPLE_DATASETS = [
  {
    file: 'WHR_2023_all_years_processed.csv',
    title: 'World Happiness Report 2023',
    description: 'From the UN’s World Happiness Report 2023: life evaluation (Life Ladder) and its explanatory factors for 165 countries, 2005–2023, with subregion and continent.',
    rows: 2363,
    columns: 13,
    isDefault: true,
  },
  {
    file: 'Howell.csv',
    title: 'Howell',
    description: 'Height, weight, age and sex of the !Kung San people, from Nancy Howell’s census.',
    rows: 544,
    columns: 5,
    isDefault: false,
  },
  {
    file: 'ElectricityDemand.csv',
    title: 'Electricity demand',
    description: 'Half-hourly electricity demand in Victoria, Australia, with temperature and holidays, for 2014.',
    rows: 17518,
    columns: 4,
    isDefault: false,
  },
] as const

export default function ExampleDatasets() {
  const { loadFile } = useData()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pick(dataset: (typeof EXAMPLE_DATASETS)[number]) {
    setError(null)
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}datasets/${dataset.file}`)
      if (!response.ok) throw new Error(`status ${response.status}`)
      loadFile(new File([await response.text()], dataset.file, { type: 'text/csv' }))
    } catch (cause) {
      setError(`Couldn’t load ${dataset.title} (${cause instanceof Error ? cause.message : String(cause)}).`)
    }
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-panel)]">
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-[var(--color-text)]">
        <span>Example datasets</span>
        <span aria-hidden="true" className="text-[var(--color-text-muted)]">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <ul className="flex flex-col gap-2 border-t border-[var(--color-border)] p-3">
          {EXAMPLE_DATASETS.map((dataset) => (
            <li key={dataset.file}>
              <button type="button" onClick={() => pick(dataset)}
                className="w-full rounded-lg border border-[var(--color-border-md)] px-4 py-3 text-left hover:border-[var(--color-accent)]">
                <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                  {dataset.title}
                  {dataset.isDefault && (
                    <span className="rounded border border-indigo-400/40 bg-indigo-500/20 px-1.5 py-0.5 text-xs text-indigo-300">Default</span>
                  )}
                  <span className="font-mono text-xs font-normal text-[var(--color-text-muted)]">
                    {dataset.rows.toLocaleString('en-US')} rows × {dataset.columns} columns
                  </span>
                </span>
                <span className="mt-1 block text-xs text-[var(--color-text-muted)]">{dataset.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="px-4 pb-3 text-xs text-red-400">{error}</p>}
    </div>
  )
}
