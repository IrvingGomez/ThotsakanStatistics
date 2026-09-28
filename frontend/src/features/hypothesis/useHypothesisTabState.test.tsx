import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hypothesisApi, ONE_SAMPLE_T, TWO_SAMPLE_T, type HypothesisResponse } from '../../api/hypothesis';
import { useHypothesisTabState, type HypothesisTabState } from './useHypothesisTabState';
import HypothesisControls from './HypothesisControls';

function dataFixture() {
  return {
    state: {
      status: 'ready' as const, sessionId: 'session-a', filename: 'ApneaCMKL.csv',
      dataset: { headers: ['Breath', 'Smoke'], rows: [], numericCols: ['Breath', 'Smoke'], categoricalCols: [] },
      numericCols: ['Breath', 'Smoke'], categoricalCols: [] as string[],
      filters: {} as Record<string, string[]>, displayPrecision: 3,
    },
    filteredRows: [{ Breath: '28', Smoke: '1' }, { Breath: '53', Smoke: '0' }],
    getUniqueValues: () => ['0', '1'],
  };
}
let data = dataFixture();
vi.mock('../../context/DataContext', () => ({ useData: () => data }));

function response(statistic = 2, alpha = 0.05): HypothesisResponse {
  return {
    test_type: ONE_SAMPLE_T, table: '[]', statistic, p_value: 0.04, alpha,
    reject: true, verdict: 'Reject H₀', h0: 'μ = 30', h1: 'μ ≠ 30', warnings: [],
    rejection_region: {
      dist: 't', dof: [24], x: [-3, 0, 3], pdf: [0.01, 0.4, 0.01], y_max: 0.4,
      x_range: [-3, 3], statistic, statistic_offscale: false, critical_values: [-1.9, 1.9],
      reject_region: [[-3, -1.9], [1.9, 3]], p_area: [[-3, -2], [2, 3]], tail: 'two-sided', reject: true,
    },
  };
}
function pending() {
  let resolve!: (value: HypothesisResponse) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<HypothesisResponse>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

let root: Root;
let container: HTMLDivElement;
let state: HypothesisTabState;
function Harness({ controls = true }: { controls?: boolean }) {
  state = useHypothesisTabState();
  return controls ? <HypothesisControls state={state} onOpenColumnTypes={() => {}} /> : null;
}
async function render(controls = true) {
  await act(async () => root.render(<Harness controls={controls} />));
}
async function setNull(value = '30') {
  await act(async () => state.setDraft({ mu0Str: value }));
}
async function run() {
  await act(async () => state.handleRun());
}
async function advance() {
  await act(async () => vi.advanceTimersByTimeAsync(250));
}

beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers();
  data = dataFixture();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  vi.spyOn(hypothesisApi, 'runTest').mockResolvedValue(response());
  await render();
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Hypothesis student workflow', () => {
  it('keeps incomplete numeric text when controls unmount and return', async () => {
    await act(async () => state.setDraft({ mu0Str: '-', alphaStr: '0.' }));
    await render(false);
    await render(true);
    expect(state.draft.mu0Str).toBe('-');
    expect(state.draft.alphaStr).toBe('0.');
    expect(Array.from(container.querySelectorAll('input[type="text"]')).map(input => (input as HTMLInputElement).value)).toEqual(['-', '0.']);
    expect(state.canRun).toBe(false);
  });

  it('explains the numeric-code grouping prerequisite and prevents an invalid run', async () => {
    await act(async () => state.setDraft({ testType: TWO_SAMPLE_T }));
    expect(container.textContent).toContain('No categorical columns available');
    expect(container.textContent).toContain('Open Column Types');
    expect((container.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
    expect(hypothesisApi.runTest).not.toHaveBeenCalled();
  });

  it('keeps the answer revealed through alpha changes and hides it for a new null value', async () => {
    await setNull();
    await run();
    await act(async () => state.onReveal());
    vi.mocked(hypothesisApi.runTest).mockResolvedValue(response(2, 0.01));
    await act(async () => state.setDraft({ alphaStr: '0.01' }));
    expect(state.revealed).toBe(true);
    expect(state.isDirty).toBe(true);
    await advance();
    expect(state.result?.alpha).toBe(0.01);
    expect(state.revealed).toBe(true);
    expect(state.isDirty).toBe(false);
    await setNull('31');
    expect(state.revealed).toBe(false);
  });

  it('keeps reveal through incomplete alpha typing and retries the completed alpha after failure', async () => {
    await setNull();
    await run();
    await act(async () => state.onReveal());
    await act(async () => state.setDraft({ alphaStr: '' }));
    expect(state.revealed).toBe(true);
    expect(state.canRun).toBe(false);
    expect(state.isDirty).toBe(true);
    await advance();
    expect(hypothesisApi.runTest).toHaveBeenCalledTimes(1);
    vi.mocked(hypothesisApi.runTest).mockRejectedValueOnce(new Error('Service unavailable'));
    await act(async () => state.setDraft({ alphaStr: '0.01' }));
    await advance();
    expect(state.error).toBe('Service unavailable');
    expect(state.result?.alpha).toBe(0.05);
    expect(state.applied?.config.alpha).toBe(0.05);
    expect(state.revealed).toBe(true);
    vi.mocked(hypothesisApi.runTest).mockResolvedValue(response(2, 0.01));
    await act(async () => state.handleRetry());
    expect(state.result?.alpha).toBe(0.01);
    expect(state.revealed).toBe(true);
    expect(state.error).toBeNull();
    expect(state.isDirty).toBe(false);
  });

  it('keeps test setup during Column Types detour and enables valid numeric-coded groups', async () => {
    await setNull('35');
    await act(async () => state.setDraft({ testType: TWO_SAMPLE_T, alphaStr: '0.01' }));
    await render(false);
    data = { ...data, state: { ...data.state, numericCols: ['Breath'], categoricalCols: ['Smoke'] } };
    await render(true);
    expect(state.draft.testType).toBe(TWO_SAMPLE_T);
    expect(state.draft.mu0Str).toBe('35');
    expect(state.draft.alphaStr).toBe('0.01');
    expect(state.canRun).toBe(false);
    expect(container.textContent).not.toContain('No categorical columns available');
    await act(async () => state.setDraft({
      group1: { column: 'Smoke', values: ['0'], name: 'Non-smokers' },
      group2: { column: 'Smoke', values: ['1'], name: 'Smokers' },
    }));
    expect(state.canRun).toBe(true);
    expect(state.groupCounts).toEqual([1, 1]);
    await render(false);
    await render(true);
    expect(state.draft.group2.values).toEqual(['1']);
    await run();
    expect(hypothesisApi.runTest).toHaveBeenCalledWith(expect.objectContaining({
      test_type: TWO_SAMPLE_T, column: 'Breath', alpha: 0.01,
      group1: { column: 'Smoke', values: ['0'], name: 'Non-smokers' },
      group2: { column: 'Smoke', values: ['1'], name: 'Smokers' },
    }));
  });

  it('marks retained output stale and cancels pending live runs when a draft becomes incomplete', async () => {
    await setNull();
    await run();
    await setNull('31');
    await setNull('');
    await advance();
    expect(hypothesisApi.runTest).toHaveBeenCalledTimes(1);
    expect(state.result).not.toBeNull();
    expect(state.isDirty).toBe(true);
    expect(state.canRun).toBe(false);
  });

  it('lets only the newest request publish results', async () => {
    const older = pending();
    const newer = pending();
    vi.mocked(hypothesisApi.runTest).mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
    await setNull();
    await run();
    await setNull('31');
    await run();
    await act(async () => newer.resolve(response(3)));
    await act(async () => older.resolve(response(1)));
    expect(state.result?.statistic).toBe(3);
    expect(state.applied?.config.mu0).toBe(31);
    expect(state.isComputing).toBe(false);
  });

  it('does not let an older failure clear a newer loading status', async () => {
    const older = pending();
    const newer = pending();
    vi.mocked(hypothesisApi.runTest).mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
    await setNull();
    await run();
    await setNull('31');
    await run();
    await act(async () => older.reject(new Error('Old failure')));
    expect(state.error).toBeNull();
    expect(state.isComputing).toBe(true);
    await act(async () => newer.resolve(response(3)));
    expect(state.result?.statistic).toBe(3);
  });

  it('ignores completion after Reset', async () => {
    const request = pending();
    vi.mocked(hypothesisApi.runTest).mockReturnValueOnce(request.promise);
    await setNull();
    await run();
    await act(async () => state.handleReset());
    await act(async () => request.resolve(response()));
    expect(state.result).toBeNull();
    expect(state.draft.mu0Str).toBe('');
    expect(state.isComputing).toBe(false);
    expect(state.updatesAutomatically).toBe(false);
  });

  it('invalidates outstanding work on filter changes and resets the draft for a new dataset', async () => {
    const request = pending();
    vi.mocked(hypothesisApi.runTest).mockReturnValueOnce(request.promise);
    await setNull();
    await run();
    data = { ...data, state: { ...data.state, filters: { Smoke: ['1'] } } };
    await render();
    await act(async () => request.resolve(response()));
    expect(state.result).toBeNull();
    expect(state.draft.mu0Str).toBe('30');
    data = { ...data, state: { ...data.state, sessionId: 'session-b', filename: 'new.csv' } };
    await render();
    expect(state.draft.mu0Str).toBe('');
    expect(state.result).toBeNull();
  });

  it('retries the failed configuration without losing valid settings', async () => {
    vi.mocked(hypothesisApi.runTest).mockRejectedValueOnce(new Error('Service unavailable'));
    await setNull('35');
    await run();
    expect(state.error).toBe('Service unavailable');
    expect(state.draft.mu0Str).toBe('35');
    await act(async () => state.handleRetry());
    expect(hypothesisApi.runTest).toHaveBeenCalledTimes(2);
    expect(vi.mocked(hypothesisApi.runTest).mock.calls[1][0].mu0).toBe(35);
    expect(state.result).not.toBeNull();
    expect(state.error).toBeNull();
  });
});
