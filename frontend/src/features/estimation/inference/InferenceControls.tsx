import { useEffect, useRef } from 'react'
import { Accordion, AnalysisActions, SelectField, SwitchField, TextField } from '../../../components/ControlPrimitives'
import CheckboxTree from '../../../components/CheckboxTree'
import DualInput from '../../../components/DualInput'
import { LABELS, confidenceReadout, estimatorOptions } from '../../../labels'
import { INTERVAL_TREE, selectionInfo } from './inferenceOptions'
import type { InferenceDraft, InferenceState } from './useInferenceTabState'

const ALPHA = { min: 0.001, max: 0.5, step: 0.001, decimals: 3 }
const BOOTSTRAP = { min: 100, max: 5000, step: 100, decimals: 0 }
const clamp = (value: number, min: number, max: number, fallback: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback

export default function InferenceControls({ state }: { state: InferenceState }) {
  const { draft, setDraft, fieldErrors, activate, resetGeneration } = state
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => { activate() }, [activate])
  useEffect(() => {
    if (Object.keys(fieldErrors).length) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [fieldErrors])

  if (!state.hasData) return <p className="p-4 text-sm text-[var(--color-text-muted)]">{state.filename ? 'This dataset has no numeric variables. Check column types in Data.' : 'Upload a CSV in Data to calculate intervals.'}</p>

  const isRegions = draft.estimationType === 'Confidence Regions'
  const info = selectionInfo(draft.selected)
  const alpha = Number(draft.alphaStr)
  const validAlpha = draft.alphaStr.trim() !== '' && Number.isFinite(alpha) && alpha > 0 && alpha < 1
  const textField = (key: 'crProbs' | 'crEpsMu' | 'crEpsSigma', label: string, hint?: string) => (
    <TextField label={label} value={draft[key]} onChange={value => setDraft({ [key]: value })} hint={hint} error={fieldErrors[key]} />
  )

  return <form ref={formRef} onSubmit={event => { event.preventDefault(); void state.handleRun() }} noValidate className="analysis-panel flex flex-col gap-1 pb-4">
    <SelectField label="Variable" value={draft.column} onChange={column => setDraft({ column })} options={state.numericCols} error={fieldErrors.column} />
    <SelectField label="Estimate" value={draft.estimationType} onChange={value => setDraft({ estimationType: value as InferenceDraft['estimationType'] })} options={['Confidence and Prediction Intervals', 'Confidence Regions']} />
    <p className="mb-3 text-sm text-[var(--color-text-muted)]">A confidence interval describes uncertainty about a population quantity. A prediction interval gives a range for one future observation.</p>
    <DualInput label={LABELS.alpha} value={clamp(alpha, ALPHA.min, ALPHA.max, 0.05)} min={ALPHA.min} max={ALPHA.max} step={ALPHA.step} decimals={ALPHA.decimals}
      onChange={value => setDraft({ alphaStr: value.toFixed(ALPHA.decimals) })}
      textValue={draft.alphaStr} onTextChange={alphaStr => setDraft({ alphaStr })} resetSignal={resetGeneration}
      hint={validAlpha ? `${confidenceReadout(alpha)}${isRegions ? ' for the marginal intervals.' : '. Each interval has its own coverage; no correction across rows.'}` : 'Enter a value between 0 and 1.'}
      error={fieldErrors.alphaStr} />
    {isRegions ? <>
      {textField('crProbs', 'Region coverage levels', 'Use proportions: 0.5, 0.95 means 50%, 95%. These levels control the contours.')}
      <p className="mb-3 text-xs text-[var(--color-text-muted)]">Regions use the sample mean and the standard deviation with one degree of freedom, assuming normality.</p>
      <SwitchField label="Show marginal confidence interval box" checked={draft.addCiBox} onChange={addCiBox => setDraft({ addCiBox })} />
      <Accordion title="Advanced display settings" open={draft.advancedOpen || !!fieldErrors.crEpsMu || !!fieldErrors.crEpsSigma} onToggle={() => setDraft({ advancedOpen: !draft.advancedOpen })}>
        <p className="mb-3 text-xs text-[var(--color-text-muted)]">Padding adds plot space on either side of the calculated range.</p>
        {textField('crEpsMu', 'Mean range padding (left, right)')}
        {textField('crEpsSigma', 'Deviation range padding (left, right)')}
      </Accordion>
    </> : <>
      <CheckboxTree label="Intervals" nodes={INTERVAL_TREE} checked={draft.selected} onChange={selected => setDraft({ selected })} />
      {fieldErrors.selected && <p role="alert" className="mb-3 text-xs text-red-400">{fieldErrors.selected}</p>}
      {info.needsDeviationEstimator && <>
        <SelectField label={LABELS.sigmaEstimator} value={draft.sigmaEst} onChange={sigmaEst => setDraft({ sigmaEst })}
          options={estimatorOptions([...new Set([draft.sigmaEst, ...state.deviationEstimators])])}
          hint="Scale used by the methods that assume normality." />
        {state.estimatorError && <p role="status" className="mb-2 text-xs text-amber-300">{state.estimatorError}</p>}
      </>}
      {info.anyBootstrap && <DualInput label={LABELS.bootstrapSamples} value={clamp(Number(draft.samplesStr), BOOTSTRAP.min, BOOTSTRAP.max, 1000)}
        min={BOOTSTRAP.min} max={BOOTSTRAP.max} step={BOOTSTRAP.step} decimals={BOOTSTRAP.decimals}
        onChange={value => setDraft({ samplesStr: String(Math.round(value)) })}
        textValue={draft.samplesStr} onTextChange={samplesStr => setDraft({ samplesStr })} resetSignal={resetGeneration}
        hint="Number of resamples. More resamples take longer." error={fieldErrors.samplesStr} />}
    </>}
    {Object.keys(fieldErrors).length > 0 && <p role="alert" className="text-sm text-red-400">Check the highlighted fields.</p>}
    <p className="mt-2 text-sm text-[var(--color-text-muted)]">{info.anyBootstrap && !isRegions ? 'Results update automatically. Bootstrap takes a moment.' : 'Results update automatically.'}</p>
    <AnalysisActions onReset={state.handleReset} />
  </form>
}
