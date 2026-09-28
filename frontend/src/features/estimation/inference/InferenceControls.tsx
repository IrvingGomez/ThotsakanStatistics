import { useEffect, useRef } from 'react'
import { Accordion, AnalysisActions, SelectField, SwitchField, TextField } from '../../../components/ControlPrimitives'
import type { InferenceDraft, InferenceState } from './useInferenceTabState'

export default function InferenceControls({ state }: { state: InferenceState }) {
  const { draft, setDraft, fieldErrors, activate } = state
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => { activate() }, [activate])
  useEffect(() => {
    if (Object.keys(fieldErrors).length) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [fieldErrors])

  if (!state.hasData) return <p className="p-4 text-sm text-[var(--color-text-muted)]">{state.filename ? 'This dataset has no numeric variables. Check column types in Data.' : 'Upload a CSV in Data to calculate intervals.'}</p>

  const isRegions = draft.estimationType === 'Confidence Regions'
  const anyBootstrap = draft.bootstrapMean || draft.bootstrapMedian || draft.bootstrapDeviation || draft.bootstrapPi
  const alpha = Number(draft.alphaStr)
  const confidence = draft.alphaStr.trim() && Number.isFinite(alpha) && alpha > 0 && alpha < 1
    ? ((1 - alpha) * 100).toLocaleString(undefined, { maximumFractionDigits: 4 }) : null
  const textField = (key: 'alphaStr' | 'samplesStr' | 'crProbs' | 'crEpsMu' | 'crEpsSigma', label: string, hint?: string) => (
    <TextField label={label} value={draft[key]} onChange={value => setDraft({ [key]: value })}
      hint={hint} error={fieldErrors[key]}
      inputMode={key.startsWith('cr') ? 'text' : key === 'samplesStr' ? 'numeric' : 'decimal'} />
  )
  const toggle = (key: 'bootstrapMean' | 'bootstrapMedian' | 'bootstrapDeviation' | 'bootstrapPi' | 'addCiBox', label: string) => (
    <SwitchField label={label} checked={draft[key]} onChange={value => setDraft({ [key]: value })} />
  )

  return <form ref={formRef} onSubmit={event => { event.preventDefault(); void state.handleRun() }} noValidate className="analysis-panel flex flex-col gap-1 pb-4">
    <SelectField label="Variable" value={draft.column} onChange={column => setDraft({ column })} options={state.numericCols} error={fieldErrors.column} />
    <SelectField label="Estimate" value={draft.estimationType} onChange={value => setDraft({ estimationType: value as InferenceDraft['estimationType'] })} options={['Confidence Intervals', 'Prediction Intervals', 'Confidence and Prediction Intervals', 'Confidence Regions']} />
    <p className="mb-3 text-sm text-[var(--color-text-muted)]">A confidence interval describes uncertainty about a population quantity. A prediction interval gives a range for one future observation.</p>
    {textField('alphaStr', isRegions ? 'Marginal interval significance alpha' : 'Significance level alpha', confidence ? `${confidence}% confidence (alpha = ${draft.alphaStr}). Each interval has its own coverage; no correction across rows.` : 'Enter alpha to set confidence: confidence = 100 x (1 - alpha)%.')}
    {isRegions && <>
      {textField('crProbs', 'Region coverage levels', 'Use proportions: 0.5, 0.95 means 50%, 95%. These levels control the contours.')}
      {toggle('addCiBox', 'Show marginal confidence interval box')}
      {draft.addCiBox && <SelectField label="Location interval for box" value={draft.muCiSource} onChange={muCiSource => setDraft({ muCiSource })} options={['Mean-based CI', 'Median-based CI']} />}
      <Accordion title="Advanced display settings" open={draft.advancedOpen || !!fieldErrors.crEpsMu || !!fieldErrors.crEpsSigma} onToggle={() => setDraft({ advancedOpen: !draft.advancedOpen })}>
        <p className="mb-3 text-xs text-[var(--color-text-muted)]">Padding adds plot space on either side of the calculated range.</p>
        {textField('crEpsMu', 'Mean range padding (left, right)')}
        {textField('crEpsSigma', 'Deviation range padding (left, right)')}
      </Accordion>
    </>}
    <Accordion title="Estimators" open={draft.estimatorsOpen} onToggle={() => setDraft({ estimatorsOpen: !draft.estimatorsOpen })}>
      <SelectField label="Deviation estimator" value={draft.sigmaEst} onChange={sigmaEst => setDraft({ sigmaEst })} options={[...new Set([draft.sigmaEst, ...state.deviationEstimators])]} />
      <p className="text-xs text-[var(--color-text-muted)]">Used for analytical intervals. Mean and median use the sample mean and sample median.</p>
      {state.estimatorError && <p role="status" className="mt-2 text-xs text-amber-300">{state.estimatorError}</p>}
    </Accordion>
    {!isRegions && <Accordion title="Bootstrap resampling" open={draft.bootstrapOpen || !!fieldErrors.samplesStr} onToggle={() => setDraft({ bootstrapOpen: !draft.bootstrapOpen })}>
      {draft.estimationType.includes('Confidence') && <>
        {toggle('bootstrapMean', 'Bootstrap mean confidence interval')}
        {toggle('bootstrapMedian', 'Bootstrap median confidence interval')}
        {toggle('bootstrapDeviation', 'Bootstrap deviation confidence interval')}
      </>}
      {draft.estimationType.includes('Prediction') && toggle('bootstrapPi', 'Bootstrap prediction intervals')}
      {anyBootstrap && textField('samplesStr', 'Bootstrap samples', 'Number of resamples. More resamples can take longer.')}
    </Accordion>}
    {Object.keys(fieldErrors).length > 0 && <p role="alert" className="text-sm text-red-400">Check the highlighted fields before updating.</p>}
    <p className="mt-2 text-sm text-[var(--color-text-muted)]">Variable and estimate changes run automatically. Other settings apply when you select Update.</p>
    {state.isDirty && <p role="status" className="text-sm text-amber-300">Settings changed - update results. Select Update to apply.</p>}
    <AnalysisActions primaryLabel={state.isComputing ? 'Computing...' : 'Update'} onPrimary={() => void state.handleRun()}
      primaryDisabled={state.isComputing} onReset={state.handleReset} />
  </form>
}
