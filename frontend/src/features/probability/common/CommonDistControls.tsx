import { useMemo, useState, useEffect } from 'react'
import DualInput from '../../../components/DualInput'
import { AnalysisActions, Divider, RadioGroup, SectionLabel, SelectField, TextField } from '../../../components/ControlPrimitives'
import { DISTRIBUTIONS, type QueryOp } from '../../../hooks/useDistribution'

interface CommonDistControlsProps {
  modelType: 'discrete' | 'continuous'
  distName: string
  paramValues: Record<string, number>
  queryOp: QueryOp
  queryK: number
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

      <RadioGroup label="Model type" value={modelType} onChange={onModelTypeChange}
        options={[{ value: 'discrete', label: 'Discrete' }, { value: 'continuous', label: 'Continuous' }]} />

      {/* Distribution dropdown */}
      <SelectField label="Distribution" value={distName} onChange={onDistChange}
        options={availableDists.map((dist) => ({ value: dist.name, label: `${dist.name} Distribution` }))} />

      <Divider />

      {/* Distribution parameters */}
      {currentDist && (
        <div>
          <SectionLabel>Parameters</SectionLabel>
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

      <Divider />

      {/* Probability Query */}
      <div>
        <SectionLabel>Probability query</SectionLabel>
        <div className="flex gap-2 mb-3">
          {/* Op select */}
          <div className="w-20"><SelectField label="Op" value={queryOp}
            onChange={(value) => onQueryOpChange(value as QueryOp)} options={QUERY_OPS} /></div>
          {/* Value input */}
          <div className="flex-1"><TextField label="Value (k)" value={queryKText} error={queryError}
            inputMode="decimal" onChange={handleQueryKChange} onBlur={handleQueryKBlur} />
          </div>
        </div>
      </div>

      <AnalysisActions onReset={() => {
        setResetGeneration(value => value + 1)
        setQueryKText('5')
        setQueryError(undefined)
        onReset()
      }} />

    </div>
  )
}
