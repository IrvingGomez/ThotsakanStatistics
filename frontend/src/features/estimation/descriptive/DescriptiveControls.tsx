// features/estimation/descriptive/DescriptiveControls.tsx
// Left panel: variable, basic statistics, advanced statistics, display options. A pure view of the
// tab state; results update automatically and the hook only refetches when a *request* field changes.

import type { ReactNode } from 'react'
import { Accordion, AnalysisActions, Divider, SectionLabel, SelectField, SwitchField, TextField, VariableSection } from '../../../components/ControlPrimitives'
import CheckboxTree, { type CheckboxNode } from '../../../components/CheckboxTree'
import { LABELS } from '../../../labels'
import { ADVANCED_GROUPS, BASIC_TREE } from './descriptiveOptions'
import type { DescriptiveState } from './useDescriptiveTabState'

const DEFAULT_QUANTILES = '0.25, 0.5, 0.75'

export default function DescriptiveControls({ state }: { state: DescriptiveState }) {
  const { draft, setDraft, fieldErrors, numericCols } = state

  const quantilesField = (
    <TextField label="Quantile probabilities" value={draft.quantilesRaw} onChange={(quantilesRaw) => setDraft({ quantilesRaw })}
      placeholder={DEFAULT_QUANTILES} hint="Comma-separated, from 0 to 1. Leave empty for none."
      error={fieldErrors.quantilesRaw} />
  )
  const basicNodes: CheckboxNode[] = BASIC_TREE.map(node => node.id === 'quantiles' ? { ...node, detail: quantilesField } : node)

  const detailFor: Record<string, ReactNode> = {
    trimmed_mean: (
      <TextField label={LABELS.trimFraction} value={draft.trimRaw} onChange={(trimRaw) => setDraft({ trimRaw })}
        placeholder="0.10" hint="Fraction to trim from each tail."
        error={fieldErrors.trimRaw} inputMode="decimal" />
    ),
    winsorized_mean: (
      <TextField label={LABELS.winsorFractions} value={draft.winsorRaw} onChange={(winsorRaw) => setDraft({ winsorRaw })}
        placeholder="0.10, 0.10" hint="Comma-separated pair from 0 up to, but not including, 0.5."
        error={fieldErrors.winsorRaw} />
    ),
    weighted_mean: (
      <SelectField label={LABELS.weightsColumn} value={draft.weightsCol} onChange={(weightsCol) => setDraft({ weightsCol })}
        options={numericCols.filter((c) => c !== draft.column)} placeholder="— choose a column —"
        hint={draft.weightsCol ? undefined : 'Weighted mean needs a weights column.'} />
    ),
  }

  return (
    <div className="flex flex-col gap-0">

      <VariableSection value={draft.column} onChange={(column) => setDraft({ column })}
        options={numericCols} loaded={state.loaded} error={state.hasData ? fieldErrors.column : undefined} />

      <Accordion title="Basic statistics" open={draft.basicOpen} onToggle={() => setDraft({ basicOpen: !draft.basicOpen })}>
        <CheckboxTree label="Show" nodes={basicNodes} checked={draft.selected} onChange={(selected) => setDraft({ selected })} />
      </Accordion>

      <Accordion title="Advanced statistics" open={draft.advancedOpen} onToggle={() => setDraft({ advancedOpen: !draft.advancedOpen })}>
        {ADVANCED_GROUPS.map(({ title, items }) => (
          <CheckboxTree key={title} label={title} checked={draft.selected} onChange={(selected) => setDraft({ selected })}
            nodes={items.map(item => ({ id: item.id, label: item.label, detail: detailFor[item.id] }))} />
        ))}
      </Accordion>

      <Divider />

      <SectionLabel>Display</SectionLabel>
      <SwitchField label="Show normal-corrected values" checked={draft.showConsistencyCorr} onChange={(showConsistencyCorr) => setDraft({ showConsistencyCorr })} />

      <Divider />

      <AnalysisActions onReset={state.handleReset} />
    </div>
  )
}
