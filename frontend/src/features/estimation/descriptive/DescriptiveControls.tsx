// features/estimation/descriptive/DescriptiveControls.tsx
// Left panel: variable, basic statistics, advanced statistics, display options.
// Results update automatically; the hook only refetches when a *request* field changes.

import { useState, useCallback, useEffect } from 'react'
import { useData } from '../../../context/DataContext'
import { Accordion, AnalysisActions, SelectField, SwitchField, TextField } from '../../../components/ControlPrimitives'
import CheckboxTree, { type CheckboxNode } from '../../../components/CheckboxTree'
import { LABELS } from '../../../labels'
import {
  ADVANCED_GROUPS, BASIC_TREE, DEFAULT_SELECTED, parseQuantiles, visibleStatIds,
} from './descriptiveOptions'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DescriptiveConfig {
  // Request fields: changing one asks the backend again.
  column: string
  weightsCol: string | null
  quantileProbs: number[]
  trimAlpha: number | null
  winsorLimits: [number, number] | null
  // Display fields: changing one only re-filters the result already on screen.
  showConsistencyCorr: boolean
  /** Ids of the statistics that are ticked and visible (see descriptiveOptions.ts). */
  selectedStats: string[]
}

export const DEFAULT_CONFIG: Omit<DescriptiveConfig, 'column'> = {
  weightsCol: null,
  quantileProbs: [0.25, 0.5, 0.75],
  trimAlpha: null,
  winsorLimits: null,
  showConsistencyCorr: true,
  selectedStats: visibleStatIds(DEFAULT_SELECTED),
}

interface DescriptiveControlsProps {
  onRun: (cfg: DescriptiveConfig) => void
  onReset: () => void
  isComputing?: boolean
}

// ─── Small UI pieces ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
      {children}
    </p>
  )
}

function Divider() {
  return <div className="border-t border-[var(--color-border)] my-3" />
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

const DEFAULT_QUANTILES = '0.25, 0.5, 0.75'

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DescriptiveControls({ onRun, onReset }: DescriptiveControlsProps) {
  const { state } = useData()

  const [column, setColumn] = useState<string>(state.numericCols[0] ?? '')
  const [weightsCol, setWeightsCol] = useState<string>('')
  const [quantilesRaw, setQuantilesRaw] = useState(DEFAULT_QUANTILES)
  const [trimRaw, setTrimRaw] = useState('')
  const [winsorRaw, setWinsorRaw] = useState('')
  const [showConsistencyCorr, setShowConsistencyCorr] = useState(true)
  const [selected, setSelected] = useState<string[]>([...DEFAULT_SELECTED])
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ quantiles?: boolean; trim?: boolean; winsor?: boolean }>({})

  const hasData = state.status === 'ready' && state.numericCols.length > 0
  const visible = visibleStatIds(selected)
  const has = (id: string) => visible.includes(id)

  /** Ticking a statistic that needs a parameter fills a sensible default; unticking clears it. */
  const onSelect = (next: string[]) => {
    const was = (id: string) => selected.includes(id)
    const now = (id: string) => next.includes(id)
    if (now('trimmed_mean') && !was('trimmed_mean') && !trimRaw.trim()) setTrimRaw('0.10')
    if (!now('trimmed_mean') && was('trimmed_mean')) setTrimRaw('')
    if (now('winsorized_mean') && !was('winsorized_mean') && !winsorRaw.trim()) setWinsorRaw('0.10, 0.10')
    if (!now('winsorized_mean') && was('winsorized_mean')) setWinsorRaw('')
    if (!now('weighted_mean') && was('weighted_mean')) setWeightsCol('')
    setSelected(next)
  }

  const handleRun = useCallback(() => {
    setError(null)
    setFieldErrors({})

    if (!column) { setError('Please select a numeric variable.'); return }

    // Blank means "no quantiles"; an unticked Quantiles box asks for none either.
    const probs = parseQuantiles(quantilesRaw)
    if (probs === null) {
      setError('Invalid quantiles. Use comma-separated values from 0 to 1, e.g. "0.25, 0.5, 0.75", or leave it empty.')
      setFieldErrors(prev => ({ ...prev, quantiles: true }))
      return
    }
    const shown = visibleStatIds(selected)
    const quantileProbs = shown.includes('quantiles') ? probs : []

    const trimEnabled = shown.includes('trimmed_mean')
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

    const winsorEnabled = shown.includes('winsorized_mean')
    const winsorLimits = !winsorEnabled || winsorRaw.trim() === '' ? null : parsePair(winsorRaw)
    if (winsorEnabled && winsorRaw.trim() !== '' && (!winsorLimits || winsorLimits.some(l => l < 0 || l >= 0.5))) {
      setError('Invalid winsorize limits. Use two comma-separated values between 0 and 0.5 (exclusive), e.g. "0.1, 0.1".')
      setFieldErrors(prev => ({ ...prev, winsor: true }))
      return
    }

    onRun({
      column,
      // A hidden option is never sent: the weights column only counts while Weighted mean is ticked.
      weightsCol: shown.includes('weighted_mean') && weightsCol ? weightsCol : null,
      quantileProbs,
      trimAlpha: trimAlpha ?? null,
      winsorLimits,
      showConsistencyCorr,
      selectedStats: shown,
    })
  }, [column, weightsCol, quantilesRaw, trimRaw, winsorRaw, showConsistencyCorr, selected, onRun])

  // Auto-run on every change; the hook decides whether the backend is needed.
  useEffect(() => {
    if (hasData) handleRun()
  }, [handleRun, hasData])

  const handleReset = useCallback(() => {
    setColumn(state.numericCols[0] ?? '')
    setWeightsCol('')
    setQuantilesRaw(DEFAULT_QUANTILES)
    setTrimRaw('')
    setWinsorRaw('')
    setShowConsistencyCorr(true)
    setSelected([...DEFAULT_SELECTED])
    setAdvancedOpen(false)
    setError(null)
    setFieldErrors({})
    onReset()
  }, [state.numericCols, onReset])

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 pt-10 pb-6 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">
          No dataset loaded. Go to the <strong className="text-[var(--color-text)]">Data</strong> tab to upload a CSV file.
        </p>
      </div>
    )
  }

  const quantilesField = (
    <TextField label="Quantile probabilities" value={quantilesRaw} onChange={setQuantilesRaw}
      placeholder={DEFAULT_QUANTILES} hint="Comma-separated, from 0 to 1. Leave empty for none."
      error={fieldErrors.quantiles ? 'Enter comma-separated probabilities from 0 to 1, or leave it empty.' : undefined} />
  )
  const basicNodes: CheckboxNode[] = BASIC_TREE.map(node => node.id === 'quantiles' ? { ...node, detail: quantilesField } : node)

  const detailFor: Record<string, React.ReactNode> = {
    trimmed_mean: (
      <TextField label={LABELS.trimFraction} value={trimRaw} onChange={setTrimRaw}
        placeholder="0.10" hint="Fraction to trim from each tail."
        error={fieldErrors.trim ? 'Use a value from 0 up to, but not including, 0.5.' : undefined} inputMode="decimal" />
    ),
    winsorized_mean: (
      <TextField label={LABELS.winsorFractions} value={winsorRaw} onChange={setWinsorRaw}
        placeholder="0.10, 0.10" hint="Comma-separated pair from 0 up to, but not including, 0.5."
        error={fieldErrors.winsor ? 'Enter two valid fractions.' : undefined} />
    ),
    weighted_mean: (
      <SelectField label={LABELS.weightsColumn} value={weightsCol} onChange={setWeightsCol}
        options={state.numericCols.filter((c) => c !== column)} placeholder="— choose a column —"
        hint={weightsCol ? undefined : 'Pick the column that holds the weights.'} />
    ),
  }

  return (
    <div className="flex flex-col gap-0">

      <SectionLabel>Variable</SectionLabel>
      <SelectField
        label="Numeric variable"
        value={column}
        onChange={(v) => { setColumn(v); setError(null) }}
        options={state.numericCols}
        placeholder="— select column —"
      />

      <Divider />

      <SectionLabel>Basic statistics</SectionLabel>
      <CheckboxTree label="Show" nodes={basicNodes} checked={selected} onChange={onSelect} />

      <Accordion title="Advanced statistics" open={advancedOpen} onToggle={() => setAdvancedOpen(!advancedOpen)}>
        {ADVANCED_GROUPS.map(({ title, items }) => (
          <CheckboxTree key={title} label={title} checked={selected} onChange={onSelect}
            nodes={items.map(item => ({ id: item.id, label: item.label, detail: detailFor[item.id] }))} />
        ))}
      </Accordion>

      <Divider />

      <SectionLabel>Display</SectionLabel>
      <SwitchField label="Show consistency corrected" checked={showConsistencyCorr} onChange={setShowConsistencyCorr} />

      <Divider />

      {error && (
        <p role="alert" className="text-xs text-red-400 mb-3 leading-snug">{error}</p>
      )}
      {has('weighted_mean') && !weightsCol && (
        <p className="text-xs text-[var(--color-text-muted)] mb-3">Weighted mean needs a weights column.</p>
      )}

      <AnalysisActions onReset={handleReset} resetLabel="Reset to Defaults" />
    </div>
  )
}
