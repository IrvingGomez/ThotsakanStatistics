// features/data/DataTab.tsx
// Full-width Data tab: file upload, preview, column reclassifier, filters

import { useRef, useCallback, useState } from 'react'
import { useData } from '../../context/DataContext'

// ─── Drop Zone ────────────────────────────────────────────────────────────────

function DropZone() {
  const { state, loadFile } = useData()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = useCallback((file: File) => {
    loadFile(file)
  }, [loadFile])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed
        cursor-pointer transition-all px-8 py-12
        ${dragging
          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
          : 'border-[var(--color-border-md)] bg-[var(--color-bg-panel)] hover:border-[var(--color-accent)]/50'
        }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.tsv,.txt"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
      <span className="text-4xl">📂</span>
      <div className="text-center">
        <p className="text-sm font-semibold text-[var(--color-text)]">
          Drop a CSV file here, or click to browse
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          .csv, .tsv, .txt · First row must be headers
        </p>
      </div>
      {state.status === 'loading' && (
        <p className="text-xs text-[var(--color-accent)] animate-pulse">Parsing…</p>
      )}
      {state.status === 'error' && (
        <p className="text-xs text-red-400">{state.errorMsg}</p>
      )}
    </div>
  )
}

// ─── Stat Chips (top row) ─────────────────────────────────────────────────────

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg px-4 py-3 bg-[var(--color-bg-panel)] border border-[var(--color-border)]">
      <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">{label}</p>
      <p className="text-lg font-bold font-mono tabular-nums text-[var(--color-text)] mt-0.5">{value}</p>
    </div>
  )
}

// ─── Column Type Toggle ───────────────────────────────────────────────────────

function ColumnTypes() {
  const { state, reclassify } = useData()
  if (!state.dataset) return null

  const allCols = state.dataset.headers

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-panel)] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[var(--color-border)] flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest font-semibold text-[var(--color-text-muted)]">
          Column Types
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)]">— click to toggle</span>
      </div>
      <div className="p-3 flex flex-wrap gap-2">
        {allCols.map((col) => {
          const isNumeric = state.numericCols.includes(col)
          return (
            <button
              key={col}
              type="button"
              onClick={() => reclassify(col, isNumeric ? 'categorical' : 'numeric')}
              title={`Currently ${isNumeric ? 'numeric' : 'categorical'} — click to reclassify`}
              className={`px-2.5 py-1 rounded-full text-xs font-mono transition-colors cursor-pointer
                border ${isNumeric
                  ? 'border-[var(--color-accent)]/50 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                  : 'border-[var(--color-border-md)] bg-[var(--color-bg-input)] text-amber-400'
                }`}
            >
              {isNumeric ? '𝑥' : '𝑎'} {col}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Category Filters ─────────────────────────────────────────────────────────

function FilterBlock({ col, vals, selected, onToggle, onRemove }: { col: string, vals: string[], selected: string[], onToggle: (v: string, active: boolean, selected: string[]) => void, onRemove: () => void }) {
  const [search, setSearch] = useState('')
  const showSearch = vals.length > 10
  
  const filteredVals = vals.filter(v => String(v).toLowerCase().includes(search.toLowerCase()))
  
  // Show selected values first, then up to ~50 unselected to stop massive DOM bloat
  const unselectedFiltered = filteredVals.filter(v => !selected.includes(v)).slice(0, 50)
  const displayVals = [...selected.filter(v => filteredVals.includes(v)), ...unselectedFiltered]

  return (
    <div className="border border-[var(--color-border-md)] rounded bg-black/10 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-[var(--color-text)]">
          {col} <span className="text-[10px] text-[var(--color-text-muted)] font-normal ml-1">({vals.length} unique)</span>
        </p>
        <button type="button" onClick={onRemove} className="text-[10px] text-[var(--color-text-muted)] hover:text-red-400 cursor-pointer">
          ✕ Remove
        </button>
      </div>
      
      {showSearch && (
        <input 
          type="text" 
          placeholder={`🔍 Search '${col}' values...`} 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full mb-2 px-2 py-1.5 text-xs bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded focus:outline-none focus:border-[var(--color-accent)] text-[var(--color-text)] placeholder-[var(--color-text-muted)]/50"
        />
      )}
      
      <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
        {displayVals.map((v) => {
          const active = selected.includes(v)
          return (
            <button
              key={v}
              type="button"
              onClick={() => onToggle(v, active, selected)}
              className={`px-2.5 py-0.5 rounded-full text-xs transition-colors cursor-pointer border
                ${active
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                  : 'border-[var(--color-border-md)] bg-[var(--color-bg-panel)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text-muted)]'
                }`}
            >
              {v}
            </button>
          )
        })}
        {filteredVals.length === 0 && (
          <p className="text-[10px] text-[var(--color-text-muted)] italic">No matches for "{search}"</p>
        )}
        {filteredVals.length > displayVals.length && (
          <p className="text-[10px] text-[var(--color-text-muted)] italic pt-1 flex items-center w-full">
            + {filteredVals.length - displayVals.length} more (use search)
          </p>
        )}
      </div>
    </div>
  )
}

function CategoryFilters() {
  const { state, getUniqueValues, setFilter, clearFilters } = useData()
  const [activeCols, setActiveCols] = useState<string[]>(() => Object.keys(state.filters))
  const [isAdding, setIsAdding] = useState(false)

  if (!state.dataset || state.categoricalCols.length === 0) return null

  const validActiveCols = activeCols.filter(c => state.categoricalCols.includes(c))
  const colsWithFilters = Object.keys(state.filters)
  const displayCols = Array.from(new Set([...validActiveCols, ...colsWithFilters]))

  const availableToAdd = state.categoricalCols.filter(c => !displayCols.includes(c))

  const handleClearAll = () => {
    clearFilters()
    setActiveCols([])
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-panel)] flex flex-col max-h-[500px]">
      <div className="px-4 py-2.5 border-b border-[var(--color-border)] flex items-center justify-between shrink-0">
        <span className="text-[10px] uppercase tracking-widest font-semibold text-[var(--color-text-muted)]">
          Category Filters
        </span>
        <div className="flex items-center gap-3">
          {availableToAdd.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAdding(!isAdding)}
                className="text-[10px] text-[var(--color-text)] bg-[var(--color-bg-input)] border border-[var(--color-border-md)] px-2 py-1 rounded hover:border-[var(--color-accent)] transition-colors cursor-pointer shadow-sm"
              >
                + Add Filter
              </button>
              {isAdding && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsAdding(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded shadow-lg z-20 flex flex-col max-h-60 overflow-y-auto p-1 text-left">
                    {availableToAdd.map(col => (
                      <button
                        key={col}
                        type="button"
                        className="text-left text-xs px-2 py-1.5 text-[var(--color-text)] hover:bg-[var(--color-bg-input)] hover:text-[var(--color-accent)] rounded cursor-pointer truncate transition-colors"
                        onClick={() => {
                          setActiveCols([...displayCols, col])
                          setIsAdding(false)
                        }}
                      >
                        {col}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {Object.keys(state.filters).length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[10px] text-[var(--color-accent)] hover:underline cursor-pointer"
            >
              Clear all
            </button>
          )}
        </div>
      </div>
      <div className="p-4 flex flex-col gap-4 overflow-y-auto">
        {displayCols.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)] text-center py-4">
            No category filters added yet. Click "+ Add Filter" above.
          </p>
        ) : (
          displayCols.map((col) => (
            <FilterBlock 
              key={col}
              col={col} 
              vals={getUniqueValues(col)} 
              selected={state.filters[col] ?? []}
              onToggle={(v, active, selectedList) => {
                setFilter(col, active
                  ? selectedList.filter((s) => s !== v)
                  : [...selectedList, v])
              }}
              onRemove={() => {
                if (state.filters[col]) setFilter(col, [])
                setActiveCols(prev => prev.filter(c => c !== col))
              }}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ─── Data Preview Table ───────────────────────────────────────────────────────

function DataPreview() {
  const { state, filteredRows } = useData()
  if (!state.dataset) return null

  const headers = state.dataset.headers
  const previewRows = filteredRows.slice(0, 50)
  const totalRows = filteredRows.length
  const rawTotal = state.dataset.rows.length

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-panel)] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[var(--color-border)] flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest font-semibold text-[var(--color-text-muted)]">
          Data Preview
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)]">
          {totalRows < rawTotal
            ? `Showing ${previewRows.length} of ${totalRows} filtered rows (${rawTotal} total)`
            : `Showing ${previewRows.length} of ${totalRows} rows`}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="px-3 py-2 text-left text-[var(--color-text-muted)] font-normal w-10">#</th>
              {headers.map((h) => (
                <th key={h} className={`px-3 py-2 text-left font-semibold whitespace-nowrap
                  ${state.numericCols.includes(h)
                    ? 'text-[var(--color-accent)]'
                    : 'text-amber-400'
                  }`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-[var(--color-border)] ${
                  i % 2 === 0 ? '' : 'bg-white/[0.02]'
                }`}
              >
                <td className="px-3 py-1.5 text-[var(--color-text-muted)] tabular-nums">{i + 1}</td>
                {headers.map((h) => (
                  <td key={h} className={`px-3 py-1.5 tabular-nums whitespace-nowrap
                    ${state.numericCols.includes(h)
                      ? 'text-[var(--color-text)]'
                      : 'text-[var(--color-text-muted)]'
                    }`}>
                    {row[h] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Precision Selector ───────────────────────────────────────────────────────

function PrecisionControl() {
  const { state, clearData, setPrecision } = useData()
  if (!state.dataset) return null

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-xs text-[var(--color-text-muted)]">Display precision</label>
        <select
          value={state.displayPrecision}
          onChange={(e) => setPrecision(Number(e.target.value))}
          className="rounded px-2 py-1 text-xs bg-[var(--color-bg-input)] border border-[var(--color-border-md)]
            text-[var(--color-text)] cursor-pointer focus:outline-none focus:border-[var(--color-accent)]"
        >
          {[2, 3, 4, 5, 6].map((p) => (
            <option key={p} value={p}>{p} decimal places</option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={clearData}
        className="ml-auto px-3 py-1 rounded text-xs border border-[var(--color-border-md)]
          text-[var(--color-text-muted)] hover:text-red-400 hover:border-red-400/50 transition-colors cursor-pointer"
      >
        🗑 Remove dataset
      </button>
    </div>
  )
}

// ─── Main DataTab ─────────────────────────────────────────────────────────────

export default function DataTab() {
  const { state, filteredRows } = useData()

  const hasData = state.status === 'ready' && state.dataset != null

  return (
    <main className="flex-1 overflow-y-auto bg-[var(--color-bg-base)] px-6 py-5">
      <div className="max-w-6xl mx-auto flex flex-col gap-5">

        {/* Header */}
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text)]">Dataset</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Upload a CSV file to use across all analysis tabs.
            {hasData && ` · ${state.filename}`}
          </p>
        </div>

        {/* Upload zone — always visible but compact when data loaded */}
        {!hasData
          ? <DropZone />
          : (
            <div>
              {/* Summary chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <StatChip label="Rows (raw)" value={state.dataset!.rows.length} />
                <StatChip label="Rows (filtered)" value={filteredRows.length} />
                <StatChip label="Numeric cols" value={state.numericCols.length} />
                <StatChip label="Categorical cols" value={state.categoricalCols.length} />
              </div>

              {/* Controls row */}
              <PrecisionControl />
            </div>
          )
        }

        {/* Column types + filters side by side */}
        {hasData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ColumnTypes />
            <CategoryFilters />
          </div>
        )}

        {/* Preview table */}
        {hasData && <DataPreview />}

      </div>
    </main>
  )
}
