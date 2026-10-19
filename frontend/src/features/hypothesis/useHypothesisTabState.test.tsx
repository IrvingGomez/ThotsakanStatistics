import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hypothesisApi, ONE_SAMPLE_T, ONE_WAY_ANOVA, TWO_SAMPLE_T, type HypothesisResponse } from '../../api/hypothesis';
import { useHypothesisTabState, type HypothesisTabState } from './useHypothesisTabState';
import HypothesisControls from './HypothesisControls';
import { NotebookSlot, ObservationSlot } from './HypothesisTab';

vi.mock('react-plotly.js', () => ({ default: () => null }));

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
  return controls ? <HypothesisControls state={state} /> : null;
}
async function render(controls = true) {
  await act(async () => root.render(<Harness controls={controls} />));
}
async function setNull(value = '30') {
  await act(async () => state.setDraft({ mu0Str: value }));
}
async function advance() {
  await act(async () => vi.advanceTimersByTimeAsync(250));
}
const lastRequest = () => vi.mocked(hypothesisApi.runTest).mock.lastCall![0];

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
  it('shows the full panel without a dataset, with the variable disabled', async () => {
    data = { ...data, state: { ...data.state, status: 'idle' as never, sessionId: null as never, filename: '', dataset: null as never, numericCols: [] } };
    vi.mocked(hypothesisApi.runTest).mockClear();
    await render();
    const select = [...container.querySelectorAll('select')][0];
    expect(select.disabled).toBe(true);
    expect(container.textContent).toContain('— no dataset loaded —');
    expect(container.textContent).toContain('Test method');
    expect(container.textContent).toContain('Upload a CSV file in the Data tab.');
    expect(container.textContent).not.toContain('Open Data');
    expect(hypothesisApi.runTest).not.toHaveBeenCalled();
  });

  it('calculates on its own with mu0 = 0 and has no Run or Reveal step', async () => {
    expect(hypothesisApi.runTest).toHaveBeenCalledTimes(1);
    expect(lastRequest()).toMatchObject({ test_type: ONE_SAMPLE_T, column: 'Breath', mu0: 0, alpha: 0.05 });
    expect(state.result).not.toBeNull();
    expect(container.textContent).not.toContain('Run Test');
    expect(container.textContent).toContain('Reset to defaults');
    expect(container.textContent).toContain('Significance level α');
  });

  it('collapses a burst of changes into one request after a short pause', async () => {
    await setNull('3');
    await setNull('30');
    await act(async () => state.setDraft({ alphaStr: '0.01' }));
    expect(state.isDirty).toBe(true);
    expect(hypothesisApi.runTest).toHaveBeenCalledTimes(1);
    await advance();
    expect(hypothesisApi.runTest).toHaveBeenCalledTimes(2);
    expect(lastRequest()).toMatchObject({ mu0: 30, alpha: 0.01 });
    expect(state.isDirty).toBe(false);
  });

  it('keeps incomplete numeric text when controls unmount and return, and waits for a valid value', async () => {
    await act(async () => state.setDraft({ mu0Str: '-', alphaStr: '0.' }));
    await render(false);
    await render(true);
    expect(state.draft.mu0Str).toBe('-');
    expect(state.draft.alphaStr).toBe('0.');
    expect(Array.from(container.querySelectorAll('input[type="text"]')).map(input => (input as HTMLInputElement).value)).toEqual(['-', '0.']);
    await advance();
    expect(hypothesisApi.runTest).toHaveBeenCalledTimes(1);
    expect(state.isDirty).toBe(true);
  });

  it('explains the grouping prerequisite and sends nothing without a categorical column', async () => {
    await act(async () => state.setDraft({ testType: TWO_SAMPLE_T }));
    await advance();
    expect(container.textContent).toContain('Mark a grouping column as categorical in Data → Column Types.');
    expect(container.textContent).not.toContain('Open Column Types');
    expect(hypothesisApi.runTest).toHaveBeenCalledTimes(1);
  });

  it('pre-fills groups from the first categorical column, and keeps what the user chose', async () => {
    data = { ...data, state: { ...data.state, numericCols: ['Breath'], categoricalCols: ['Smoke'] } };
    await render();
    await act(async () => state.setDraft({ testType: TWO_SAMPLE_T }));
    expect(state.draft.group1).toMatchObject({ column: 'Smoke', values: ['0'] });
    expect(state.draft.group2).toMatchObject({ column: 'Smoke', values: ['1'] });
    await advance();
    expect(lastRequest()).toMatchObject({
      test_type: TWO_SAMPLE_T, column: 'Breath',
      group1: { column: 'Smoke', values: ['0'], name: 'Group 1' }, group2: { column: 'Smoke', values: ['1'], name: 'Group 2' },
    });
    await act(async () => state.setDraft({ group1: { column: 'Smoke', values: ['1'], name: 'Smokers' } }));
    expect(state.draft.group1).toMatchObject({ values: ['1'], name: 'Smokers' });
    await act(async () => state.setDraft({ testType: ONE_WAY_ANOVA }));
    expect(state.draft.anovaGroup).toMatchObject({ column: 'Smoke', values: ['0', '1'] });
  });

  it('lets only the newest request publish results', async () => {
    const older = pending();
    const newer = pending();
    vi.mocked(hypothesisApi.runTest).mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
    await setNull('31');
    await advance();
    await setNull('32');
    await advance();
    await act(async () => newer.resolve(response(3)));
    await act(async () => older.resolve(response(1)));
    expect(state.result?.statistic).toBe(3);
    expect(state.applied?.config.mu0).toBe(32);
    expect(state.isComputing).toBe(false);
  });

  it('does not let an older failure clear a newer loading status', async () => {
    const older = pending();
    const newer = pending();
    vi.mocked(hypothesisApi.runTest).mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
    await setNull('31');
    await advance();
    await setNull('32');
    await advance();
    await act(async () => older.reject(new Error('Old failure')));
    expect(state.error).toBeNull();
    expect(state.isComputing).toBe(true);
    await act(async () => newer.resolve(response(3)));
    expect(state.result?.statistic).toBe(3);
  });

  it('restores the defaults on Reset and calculates them again', async () => {
    const request = pending();
    vi.mocked(hypothesisApi.runTest).mockReturnValueOnce(request.promise);
    await setNull('31');
    await advance();
    await act(async () => state.handleReset());
    await act(async () => request.resolve(response(9)));
    expect(state.draft.mu0Str).toBe('0');
    expect(lastRequest()).toMatchObject({ mu0: 0 });
    expect(state.result?.statistic).not.toBe(9);
  });

  it('recalculates on filter changes and resets the draft for a new dataset', async () => {
    const request = pending();
    vi.mocked(hypothesisApi.runTest).mockReturnValueOnce(request.promise);
    await setNull('30');
    await advance();
    data = { ...data, state: { ...data.state, filters: { Smoke: ['1'] } } };
    await render();
    await act(async () => request.resolve(response(9)));
    expect(state.result?.statistic).not.toBe(9);
    expect(state.draft.mu0Str).toBe('30');
    expect(lastRequest()).toMatchObject({ mu0: 30, filters: { Smoke: ['1'] } });
    data = { ...data, state: { ...data.state, sessionId: 'session-b', filename: 'new.csv' } };
    await render();
    expect(state.draft.mu0Str).toBe('0');
  });

  it('retries the failed configuration without losing valid settings', async () => {
    vi.mocked(hypothesisApi.runTest).mockRejectedValueOnce(new Error('Service unavailable'));
    await setNull('35');
    await advance();
    expect(state.error).toBe('Service unavailable');
    expect(state.draft.mu0Str).toBe('35');
    await act(async () => state.handleRetry());
    expect(lastRequest().mu0).toBe(35);
    expect(state.result).not.toBeNull();
    expect(state.error).toBeNull();
  });
});

describe('Hypothesis panels', () => {
  function Slots() {
    state = useHypothesisTabState();
    return <>
      <div data-panel="controls"><HypothesisControls state={state} /></div>
      <div data-panel="observation"><ObservationSlot state={state} /></div>
      <div data-panel="notebook"><NotebookSlot state={state} /></div>
    </>;
  }
  const panel = (name: string) => container.querySelector(`[data-panel="${name}"]`) as HTMLElement;

  it('shows backend warnings above the plot, not in the notebook', async () => {
    vi.mocked(hypothesisApi.runTest).mockResolvedValue({ ...response(), warnings: ['Group 2 has n < 5'] });
    await act(async () => root.render(<Slots />));
    expect(panel('observation').querySelector('[aria-label="Warnings"]')?.textContent).toContain('Group 2 has n < 5');
    expect(panel('notebook').textContent).not.toContain('Group 2 has n < 5');
  });

  it('never shows the settings-changed message or filler sentences', async () => {
    await act(async () => root.render(<Slots />));
    await setNull('12');
    expect(container.textContent).not.toContain('Settings changed');
    expect(panel('controls').textContent).not.toContain('Results update automatically');
    expect(panel('controls').textContent).not.toContain('Compare one population mean');
  });
});
