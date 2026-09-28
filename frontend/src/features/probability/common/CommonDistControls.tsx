import { useMemo, useState, useEffect } from 'react'
import DualInput from '../../../components/DualInput'
import { AnalysisActions, SelectField, TextField } from '../../../components/ControlPrimitives'
import { DISTRIBUTIONS, type QueryOp } from '../../../hooks/useDistribution'

interface CommonDistControlsProps {
  modelType: 'discrete' | 'continuous'
  distName: string
  paramValues: Record<string, number>
  queryOp: QueryOp
  queryK: number
  queryResult: number | null
  onModelTypeChange: (t: 'discrete' | 'continuous') => void
  onDistChange: (name: string) => void
  onParamChange: (key: string, value: number) => void
  onQueryOpChange: (op: QueryOp) => void
  onQueryKChange: (k: number) => void
  onReset: () => void
}

const QUERY_OPS: QueryOp[] = ['<=', '>=', '=', '<', '>']

export default function CommonDistControls({
  modelType,
  distName,
  paramValues,
  queryOp,
  queryK,
  queryResult,
  onModelTypeChange,
  onDistChange,
  onParamChange,
  onQueryOpChange,
  onQueryKChange,
  onReset,
}: CommonDistControlsProps) {
  const availableDists = useMemo(
    () => DISTRIBUTIONS.filter((d) => d.type === modelType),
    [modelType]
  )

  const currentDist = DISTRIBUTIONS.find((d) => d.name === distName)

  const [queryKText, setQueryKText] = useState(String(queryK))
  const [queryError, setQueryError] = useState<string | undefined>()
  const [resetGeneration, setResetGeneration] = useState(0)

  useEffect(() => {
    setQueryKText(String(queryK))
    setQueryError(undefined)
  }, [queryK])

  const handleQueryKChange = (raw: string) => {
    setQueryKText(raw)
    const trimmed = raw.trim()
    const valid = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(trimmed)
    const parsed = valid ? Number(trimmed) : Number.NaN
    if (Number.isFinite(parsed)) {
      setQueryError(undefined)
      onQueryKChange(parsed)
    } else setQueryError('Enter a complete numeric query value.')
  }

  const handleQueryKBlur = () => {
    if (queryError) {
      setQueryKText(String(queryK))
      setQueryError(undefined)
    }
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Model Type toggle */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest
          text-[var(--color-text-muted)] mb-2">
          Model Type
        </p>
        <div className="flex rounded-md overflow-hidden border border-[var(--color-border-md)]" role="group" aria-label="Model type">
          {(['discrete', 'continuous'] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={modelType === t}
              onClick={() => onModelTypeChange(t)}
              className={`flex-1 py-1.5 text-sm capitalize transition-colors cursor-pointer
                ${modelType === t
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-bg-input)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Distribution dropdown */}
      <SelectField label="Distribution" value={distName} onChange={onDistChange}
        options={availableDists.map((dist) => ({ value: dist.name, label: `${dist.name} Distribution` }))} />

      <div className="h-px bg-[var(--color-border)]" />

      {/* Distribution parameters */}
      {currentDist && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest
            text-[var(--color-text-muted)] mb-3">
            Distribution Parameters
          </p>
          <div className="flex flex-col gap-4">
            {currentDist.params.map((param) => (
              <DualInput
                key={param.key}
                label={param.label}
                value={paramValues[param.key] ?? param.default}
                min={param.min}
                max={param.max}
                step={param.step}
                decimals={param.decimals}
                resetSignal={resetGeneration}
                onChange={(v) => onParamChange(param.key, param.integer ? Math.round(v) : v)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="h-px bg-[var(--color-border)]" />

      {/* Probability Query */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest
          text-[var(--color-text-muted)] mb-3">
          Probability Query
        </p>
        <div className="flex gap-2 mb-3">
          {/* Op select */}
          <div className="w-20"><SelectField label="Op" value={queryOp}
            onChange={(value) => onQueryOpChange(value as QueryOp)} options={QUERY_OPS} /></div>
          {/* Value input */}
          <div className="flex-1"><TextField label="Value (k)" value={queryKText} error={queryError}
            inputMode="decimal" onChange={handleQueryKChange} onBlur={handleQueryKBlur} />
          </div>
        </div>
        {/* Live query result */}
        <div className="mt-2 rounded-md px-3 py-2 border border-[var(--color-accent)]/30
          bg-[var(--color-accent)]/5 text-center">
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] mb-0.5">
            P(X {queryOp} {modelType === 'discrete' ? Math.round(queryK) : queryK})
          </p>
          <p className="text-lg font-bold font-mono tabular-nums text-[var(--color-accent)]">
            {queryResult != null ? queryResult.toFixed(4) : '—'}
          </p>
        </div>
      </div>

      <AnalysisActions onReset={() => {
        setResetGeneration(value => value + 1)
        setQueryKText('5')
        setQueryError(undefined)
        onReset()
      }} resetLabel="Reset to defaults" />

    </div>
  )
}
