// features/estimation/descriptive/DescriptiveControls.tsx
// Left panel: variable selection, statistical parameters, display options, run/reset

import { useState, useCallback, useEffect } from 'react'
import { useData } from '../../../context/DataContext'
import { Accordion, AnalysisActions, SelectField, SwitchField, TextField } from '../../../components/ControlPrimitives'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DescriptiveConfig {
  column: string
  weightsCol: string | null
  quantileProbs: number[]
  trimAlpha: number | null
  winsorLimits: [number, number] | null
  showConsistencyCorr: boolean
  advancedStats: string[]
}

export const DEFAULT_CONFIG: Omit<DescriptiveConfig, 'column'> = {
  weightsCol: null,
  quantileProbs: [0.25, 0.5, 0.75],
  trimAlpha: null,
  winsorLimits: null,
  showConsistencyCorr: true,
  advancedStats: [],
}

interface DescriptiveControlsProps {
  onRun: (cfg: DescriptiveConfig) => void
  onReset: () => void
  isComputing?: boolean
}

// ─── Small UI pieces ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
      {children}
    </p>
  )
}

function Divider() {
  return <div className="border-t border-[var(--color-border)] my-3" />
}

const ADVANCED_STATS_GROUPS = [
  {
    group: 'Central Tendency',
    items: [
      { id: 'iqm',             label: 'Interquartile Mean (IQM)' },
      { id: 'trimmed_mean',    label: 'Trimmed Mean' },
      { id: 'winsorized_mean', label: 'Winsorized Mean' },
      { id: 'geometric_mean',  label: 'Geometric Mean' },
      { id: 'harmonic_mean',   label: 'Harmonic Mean' },
      { id: 'weighted_mean',   label: 'Weighted Mean' },
    ],
  },
  {
    group: 'Dispersion',
    items: [
      { id: 'variance_0', label: 'Variance (ddof=0)' },
      { id: 'variance_1', label: 'Variance (ddof=1)' },
      { id: 'std_dev_0',  label: 'Std Dev (ddof=0)' },
      { id: 'iqr',        label: 'IQR' },
      { id: 'range',      label: 'Range' },
      { id: 'mad',        label: 'MAD (Median Abs Dev)' },
      { id: 'aad',        label: 'AAD (Mean Abs Dev)' },
    ],
  },
  {
    group: 'Shape',
    items: [
      { id: 'skewness', label: 'Skewness' },
      { id: 'kurtosis', label: 'Kurtosis' },
    ],
  },
] as const

const ALL_ADVANCED_IDS = ADVANCED_STATS_GROUPS.flatMap(g => g.items.map(i => i.id))

function GroupedMultiSelect({
  selected, onChange, trimRaw, setTrimRaw, winsorRaw, setWinsorRaw, trimError, winsorError,
}: {
  selected: string[]
  onChange: (v: string[]) => void
  trimRaw: string
  setTrimRaw: (v: string) => void
  winsorRaw: string
  setWinsorRaw: (v: string) => void
  trimError?: boolean
  winsorError?: boolean
}) {
  const allSelected = ALL_ADVANCED_IDS.every(id => selected.includes(id))
  const ensureDefaults = (ids: readonly string[]) => {
    if (ids.includes('trimmed_mean') && !trimRaw.trim()) setTrimRaw('0.10')
    if (ids.includes('winsorized_mean') && !winsorRaw.trim()) setWinsorRaw('0.10, 0.10')
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Select All / Clear */}
      <div className="flex gap-2 text-[10px] text-[var(--color-accent)] font-medium">
        <button type="button" onClick={() => { ensureDefaults(ALL_ADVANCED_IDS); onChange(ALL_ADVANCED_IDS.slice()) }} disabled={allSelected}
          className="hover:underline cursor-pointer disabled:opacity-40">
          Select All
        </button>
        <span className="text-[var(--color-border-md)]">·</span>
        <button type="button" onClick={() => onChange([])} disabled={selected.length === 0}
          className="hover:underline cursor-pointer disabled:opacity-40">
          Clear
        </button>
      </div>

      {/* Grouped items */}
      <div className="flex flex-col gap-3 max-h-64 overflow-y-auto custom-scrollbar pr-1">
        {ADVANCED_STATS_GROUPS.map(({ group, items }) => {
          const groupIds = items.map(i => i.id)
          const allInGroup = groupIds.every(id => selected.includes(id))
          const someInGroup = groupIds.some(id => selected.includes(id))
          return (
            <div key={group}>
              <div className="flex items-center gap-1.5 mb-1">
                <input
                  type="checkbox"
                  checked={allInGroup}
                  ref={el => { if (el) el.indeterminate = someInGroup && !allInGroup }}
                  onChange={() => {
                    if (allInGroup) onChange(selected.filter(id => !groupIds.includes(id as never)))
                    else { ensureDefaults(groupIds); onChange([...selected, ...groupIds.filter(id => !selected.includes(id))]) }
                  }}
                  className="accent-[var(--color-accent)] cursor-pointer w-3 h-3"
                />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{group}</span>
              </div>
              <div className="flex flex-col gap-1 ml-4">
                {items.map((item) => {
                  const checked = selected.includes(item.id)
                  return (
                    <div key={item.id} className="flex flex-col">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--color-text)] hover:text-[var(--color-accent)] transition-colors">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) {
                              onChange(selected.filter(id => id !== item.id))
                              if (item.id === 'trimmed_mean') setTrimRaw('')
                              if (item.id === 'winsorized_mean') setWinsorRaw('')
                            } else {
                              onChange([...selected, item.id])
                              if (item.id === 'trimmed_mean' && !trimRaw.trim()) setTrimRaw('0.10')
                              if (item.id === 'winsorized_mean' && !winsorRaw.trim()) setWinsorRaw('0.10, 0.10')
                            }
                          }}
                          className="accent-[var(--color-accent)] cursor-pointer w-3.5 h-3.5 shrink-0"
                        />
                        {item.label}
                      </label>
                      {checked && item.id === 'trimmed_mean' && (
                        <div className="ml-5 mt-1 mb-1">
                          <TextField label="Trimming fraction" value={trimRaw} onChange={setTrimRaw}
                            placeholder="0.10" hint="Fraction to trim from each tail."
                            error={trimError ? 'Use a value from 0 up to, but not including, 0.5.' : undefined} inputMode="decimal" />
                        </div>
                      )}
                      {checked && item.id === 'winsorized_mean' && (
                        <div className="ml-5 mt-1 mb-1">
                          <TextField label="Winsorization fractions" value={winsorRaw} onChange={setWinsorRaw}
                            placeholder="0.10, 0.10" hint="Comma-separated pair from 0 up to, but not including, 0.5."
                            error={winsorError ? 'Enter two valid fractions.' : undefined} inputMode="text" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Parse helpers ────────────────────────────────────────────────────────────

function parseQuantiles(raw: string): number[] | null {
  try {
    const tokens = raw.split(',').map((s) => s.trim())
    if (tokens.some((token) => token === '')) return null
    const vals = tokens.map(Number).filter((v) => Number.isFinite(v) && v >= 0 && v <= 1)
    return vals.length > 0 ? vals : null
  } catch { return null }
}

function parsePair(raw: string): [number, number] | null {
  const tokens = raw.split(',').map((s) => s.trim())
  if (tokens.some((token) => token === '')) return null
  const parts = tokens.map(Number)
  if (parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
    return [parts[0], parts[1]]
  }
  return null
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DescriptiveControls({ onRun, onReset }: DescriptiveControlsProps) {
  const { state } = useData()

  // Local state
  const [column, setColumn] = useState<string>(state.numericCols[0] ?? '')
  const [weightsCol, setWeightsCol] = useState<string>('')
  const [quantilesRaw, setQuantilesRaw] = useState('0.25, 0.5, 0.75')
  const [trimRaw, setTrimRaw] = useState('')
  const [winsorRaw, setWinsorRaw] = useState('')
  const [showConsistencyCorr, setShowConsistencyCorr] = useState(true)
  const [advancedStats, setAdvancedStats] = useState<string[]>([])
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ quantiles?: boolean; trim?: boolean; winsor?: boolean }>({})

  const hasData = state.status === 'ready' && state.numericCols.length > 0

  const handleRun = useCallback(() => {
    setError(null)
    setFieldErrors({})

    if (!column) { setError('Please select a numeric variable.'); return }

    const quantileProbs = parseQuantiles(quantilesRaw)
    if (!quantileProbs || quantileProbs.length === 0 || quantileProbs.some(p => p <= 0 || p >= 1)) {
      setError('Invalid quantiles. Use comma-separated values between 0 and 1 (exclusive), e.g. "0.25, 0.5, 0.75".')
      setFieldErrors(prev => ({ ...prev, quantiles: true }))
      return
    }

    const trimEnabled = advancedStats.includes('trimmed_mean')
    const trimAlpha = !trimEnabled || trimRaw.trim() === ''
      ? null
      : (() => {
          const v = Number(trimRaw)
          if (!Number.isFinite(v) || v < 0 || v >= 0.5) return undefined
          return v
        })()

    if (trimEnabled && trimRaw.trim() !== '' && trimAlpha === undefined) {
      setError('Invalid trim alpha. Value must be between 0 (inclusive) and 0.5 (exclusive).')
      setFieldErrors(prev => ({ ...prev, trim: true }))
      return
    }

    const winsorEnabled = advancedStats.includes('winsorized_mean')
    const winsorLimits = !winsorEnabled || winsorRaw.trim() === '' ? null : parsePair(winsorRaw)
    if (winsorEnabled && winsorRaw.trim() !== '' && (!winsorLimits || winsorLimits.some(l => l < 0 || l >= 0.5))) {
      setError('Invalid winsorize limits. Use two comma-separated values between 0 and 0.5 (exclusive), e.g. "0.1, 0.1".')
      setFieldErrors(prev => ({ ...prev, winsor: true }))
      return
    }

    onRun({
      column,
      weightsCol: weightsCol || null,
      quantileProbs,
      trimAlpha: trimAlpha ?? null,
      winsorLimits,
      showConsistencyCorr,
      advancedStats,
    })
  }, [column, weightsCol, quantilesRaw, trimRaw, winsorRaw, showConsistencyCorr, advancedStats, onRun])

  // React to changes in configuration and auto-run
  useEffect(() => {
    if (hasData) {
      handleRun()
    }
  }, [handleRun, hasData])

  const handleReset = useCallback(() => {
    setColumn(state.numericCols[0] ?? '')
    setWeightsCol('')
    setQuantilesRaw('0.25, 0.5, 0.75')
    setTrimRaw('')
    setWinsorRaw('')
    setShowConsistencyCorr(true)
    setAdvancedStats([])
    setAdvancedOpen(false)
    setError(null)
    onReset()
  }, [state.numericCols, onReset])

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 pt-10 pb-6 text-center">
        <span className="text-3xl">📂</span>
        <p className="text-sm text-[var(--color-text-muted)]">
          No dataset loaded. Go to the <strong className="text-[var(--color-text)]">Data</strong> tab to upload a CSV file.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0">

      {/* Variable Selection */}
      <SectionLabel>Variable Selection</SectionLabel>
      <SelectField
        label="Numeric Variable"
        value={column}
        onChange={(v) => { setColumn(v); setError(null) }}
        options={state.numericCols}
        placeholder="— select column —"
      />
      <SelectField
        label="Weights Column (optional)"
        value={weightsCol}
        onChange={setWeightsCol}
        options={['', ...state.numericCols.filter((c) => c !== column)]}
        placeholder="— None —"
      />

      <Divider />

      {/* Statistical Parameters */}
      <SectionLabel>Statistical Parameters</SectionLabel>
      <TextField
        label="Quantile probabilities"
        value={quantilesRaw}
        onChange={setQuantilesRaw}
        placeholder="0.25, 0.5, 0.75"
        hint="Comma-separated, values in [0, 1]"
        error={fieldErrors.quantiles ? 'Enter comma-separated probabilities between 0 and 1.' : undefined}
      />
      <Accordion title="Advanced Statistics" open={advancedOpen} onToggle={() => setAdvancedOpen(!advancedOpen)}>
        <GroupedMultiSelect
          selected={advancedStats}
          onChange={setAdvancedStats}
          trimRaw={trimRaw}
          setTrimRaw={setTrimRaw}
          winsorRaw={winsorRaw}
          setWinsorRaw={setWinsorRaw}
          trimError={fieldErrors.trim}
          winsorError={fieldErrors.winsor}
        />
      </Accordion>

      <Divider />

      <SectionLabel>Display Options</SectionLabel>
      <SwitchField label="Show consistency corrected" checked={showConsistencyCorr} onChange={setShowConsistencyCorr} />

      <Divider />

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-400 mb-3 leading-snug">{error}</p>
      )}

      {/* Action buttons */}
      <AnalysisActions onReset={handleReset} resetLabel="Reset to Defaults" />
    </div>
  )
}
