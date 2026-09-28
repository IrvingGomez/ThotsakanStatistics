import AnalysisStatus from '../../components/AnalysisStatus';
import { EQUAL_VARIANCE, TWO_SAMPLE_T } from '../../api/hypothesis';
import HypothesisControls from './HypothesisControls';
import HypothesisObservation from './HypothesisObservation';
import HypothesisNotebook from './HypothesisNotebook';
import type { HypothesisTabState } from './useHypothesisTabState';

function ResultStatus({ state }: { state: HypothesisTabState }) {
  const config = state.applied?.config;
  return <AnalysisStatus isComputing={state.isComputing} error={state.error} hasResult={!!state.result}
    isDirty={state.isDirty} onRetry={state.handleRetry}>
    <p>{state.applied?.filename || state.filename || 'No dataset'}{config ? ' · ' + config.column + ' · ' + config.testType : ''}</p>
    {state.hasData && <p>{state.applied?.filteredN ?? state.filteredN} rows after filters{config ? ' · α = ' + config.alpha : ''}</p>}
    {config && <p>Applied settings: {config.mu0 !== null ? 'μ₀ = ' + config.mu0 + ' · ' : ''}
      {config.alternative}{config.testType === TWO_SAMPLE_T ? ' · ' + (config.correction ? 'Welch correction' : 'Pooled variance') : ''}
      {config.testType === EQUAL_VARIANCE ? ' · ' + config.varianceTestType : ''}</p>}
    {config?.group1 && config.group2 && [config.group1, config.group2].map((group, index) =>
      <p key={index}>{group.name || 'Group ' + (index + 1)}: {group.column} = {group.values.join(', ')}</p>)}
    {config?.anovaColumn && <p>Factor: {config.anovaColumn} · {config.anovaLevels?.join(', ')}</p>}
  </AnalysisStatus>;
}

export function ControlsSlot({ state, onOpenColumnTypes }: { state: HypothesisTabState; onOpenColumnTypes: () => void }) {
  return <HypothesisControls state={state} onOpenColumnTypes={onOpenColumnTypes} />;
}

export function ObservationSlot({ state }: { state: HypothesisTabState }) {
  return <div className="analysis-panel flex flex-col gap-3">
    <ResultStatus state={state} />
    {(state.result || (!state.isComputing && !state.error)) && <HypothesisObservation result={state.result} hasData={state.hasData} revealed={state.revealed}
      onReveal={state.onReveal} precision={state.precision} canReveal={!state.isComputing && !state.isDirty && !state.error}
      isComputing={state.isComputing} isDirty={state.isDirty} />}
  </div>;
}

export function NotebookSlot({ state }: { state: HypothesisTabState }) {
  return <div className="analysis-panel">
    <ResultStatus state={state} />
    {(state.result || (!state.isComputing && !state.error)) && <HypothesisNotebook result={state.result} precision={state.precision} revealed={state.revealed}
      onReveal={state.onReveal} canReveal={!state.isComputing && !state.isDirty && !state.error} />}
  </div>;
}
