import { useId, useState } from 'react'
import { AnalysisActions, RadioGroup, SelectField, SwitchField, TextField, VariableSection } from '../../components/ControlPrimitives'
import DualInput from '../../components/DualInput'
import { EQUAL_VARIANCE, ONE_SAMPLE_T, ONE_WAY_ANOVA, TEST_TYPES, TWO_SAMPLE_T, type Alternative } from '../../api/hypothesis'
import { LABELS, confidenceReadout } from '../../labels'
import GroupBuilder from './GroupBuilder'
import type { HypothesisTabState } from './useHypothesisTabState'

const alternatives: { value: Alternative; label: string }[] = [
  { value: 'two-sided', label: 'Different from (≠)' },
  { value: 'greater', label: 'Greater than (>)' },
  { value: 'less', label: 'Less than (<)' },
]

export default function HypothesisControls({ state }: { state: HypothesisTabState }) {
  const id = useId()
  const { draft, setDraft, validationErrors: errors } = state
  const needsGroups = draft.testType === TWO_SAMPLE_T || draft.testType === EQUAL_VARIANCE
  const isAnova = draft.testType === ONE_WAY_ANOVA
  const needsCategories = needsGroups || isAnova
  const showAlternative = draft.testType === ONE_SAMPLE_T || draft.testType === TWO_SAMPLE_T
  const overlapping = needsGroups && draft.group1.column === draft.group2.column &&
    draft.group1.values.some(value => draft.group2.values.includes(value))
  const alpha = Number(draft.alphaStr)
  const sliderAlpha = !errors.alphaStr && Number.isFinite(alpha) ? alpha : 0.05
  const [resetGeneration, setResetGeneration] = useState(0)

  return (
    <form className="analysis-panel flex flex-col gap-2 pb-4" onSubmit={event => event.preventDefault()}>
      <VariableSection value={draft.column} onChange={column => setDraft({ column })} options={state.numericCols} loaded={state.hasData} />
      <SelectField label="Test method" value={draft.testType} onChange={testType => setDraft({ testType })} options={TEST_TYPES} />

      {draft.testType === ONE_SAMPLE_T && <TextField label="Null value μ₀" value={draft.mu0Str}
        onChange={mu0Str => setDraft({ mu0Str })} inputMode="decimal" error={errors.mu0Str}
        hint="The population mean claimed by H0." placeholder="e.g. 30" />}

      {showAlternative && <RadioGroup label="Alternative H1" value={draft.alternative}
        onChange={alternative => setDraft({ alternative })} options={alternatives} />}

      {draft.testType === TWO_SAMPLE_T && <SwitchField label="Welch correction (unequal variances)"
        checked={draft.correction} onChange={correction => setDraft({ correction })} />}
      {draft.testType === EQUAL_VARIANCE && <SelectField label="Variance test" value={draft.varianceTestType}
        onChange={varianceTestType => setDraft({ varianceTestType })} options={['Levene', 'Bartlett']} />}

      {needsCategories && state.categoricalCols.length === 0 ? <p className="mb-2 text-xs text-[var(--color-text-muted)]">
        Mark a grouping column as categorical in Data → Column Types.
      </p> : <>
        {needsGroups && <>
          <GroupBuilder label="Group 1" value={draft.group1} onChange={group1 => setDraft({ group1 })} categoricalCols={state.categoricalCols} sampleCount={state.groupCounts[0]} describedBy={errors.groups ? `${id}-groups` : undefined} />
          <GroupBuilder label="Group 2" value={draft.group2} onChange={group2 => setDraft({ group2 })} categoricalCols={state.categoricalCols} sampleCount={state.groupCounts[1]} describedBy={errors.groups ? `${id}-groups` : undefined} />
          {overlapping && <p className="text-xs text-[var(--color-warning-text)]">These groups share categories. A two-sample test assumes independent groups.</p>}
        </>}
        {isAnova && <GroupBuilder label="Factor" value={draft.anovaGroup} onChange={anovaGroup => setDraft({ anovaGroup })} categoricalCols={state.categoricalCols} showName={false} describedBy={errors.groups ? `${id}-groups` : undefined} />}
      </>}
      {errors.groups && state.categoricalCols.length > 0 && <p id={`${id}-groups`} className="text-xs text-[var(--color-text-muted)]">{errors.groups}</p>}

      <div className="mt-2 border-t border-[var(--color-border)] pt-3">
        <DualInput label={LABELS.alpha} value={sliderAlpha} min={0.001} max={0.5} step={0.001} decimals={3}
          onChange={value => setDraft({ alphaStr: value.toFixed(3) })}
          textValue={draft.alphaStr} onTextChange={alphaStr => setDraft({ alphaStr })}
          resetSignal={resetGeneration}
          hint={errors.alphaStr ? undefined : confidenceReadout(sliderAlpha)}
          error={errors.alphaStr} />
      </div>

      <AnalysisActions onReset={() => { setResetGeneration(value => value + 1); state.handleReset() }} />
    </form>
  )
}
