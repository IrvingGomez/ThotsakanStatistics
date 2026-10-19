import StatusBanner, { EmptyState, summaryLine } from '../../components/StatusBanner';
import HypothesisControls from './HypothesisControls';
import HypothesisObservation from './HypothesisObservation';
import HypothesisNotebook from './HypothesisNotebook';
import type { HypothesisTabState } from './useHypothesisTabState';

function ResultStatus({ state }: { state: HypothesisTabState }) {
  const config = state.applied?.config;
  return <StatusBanner isComputing={state.isComputing} error={state.error} hasResult={!!state.result} onRetry={state.handleRetry}
    summary={config && summaryLine([state.applied?.filename, config.column, config.testType, 'n = ' + state.applied?.filteredN, 'α = ' + config.alpha])} />;
}

export function ControlsSlot({ state, onOpenColumnTypes }: { state: HypothesisTabState; onOpenColumnTypes: () => void }) {
  return <HypothesisControls state={state} onOpenColumnTypes={onOpenColumnTypes} />;
}

export function ObservationSlot({ state }: { state: HypothesisTabState }) {
  return <div className="analysis-panel flex flex-col gap-3">
    <ResultStatus state={state} />
    {(state.result || (!state.isComputing && !state.error)) && <HypothesisObservation result={state.result}
      hasData={state.hasData && state.numericCols.length > 0} loaded={state.hasData} precision={state.precision}
      isComputing={state.isComputing} isDirty={state.isDirty} />}
  </div>;
}

export function NotebookSlot({ state }: { state: HypothesisTabState }) {
  if (!state.hasData || state.numericCols.length === 0) return <EmptyState loaded={state.hasData} hasData={false} compact />;
  return <div className="analysis-panel">
    {(state.result || (!state.isComputing && !state.error)) && <HypothesisNotebook result={state.result} precision={state.precision} />}
  </div>;
}
