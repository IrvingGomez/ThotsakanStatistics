import { useCallback, useEffect, useRef, useState } from 'react';
import { useData } from '../../context/DataContext';
import { hypothesisApi, ONE_SAMPLE_T, TWO_SAMPLE_T, EQUAL_VARIANCE, ONE_WAY_ANOVA, type Alternative, type GroupSpec, type HypothesisResponse } from '../../api/hypothesis';

export type HypothesisConfig = {
  column: string; testType: string; alpha: number; alternative: Alternative;
  mu0: number | null; correction: boolean; varianceTestType: string;
  group1: GroupSpec | null; group2: GroupSpec | null;
  anovaColumn: string | null; anovaLevels: string[] | null;
};

export type HypothesisDraft = {
  column: string; testType: string; alphaStr: string; alternative: Alternative;
  mu0Str: string; correction: boolean; varianceTestType: string;
  group1: GroupSpec; group2: GroupSpec; anovaGroup: GroupSpec;
};

export function initialDraft(column = ''): HypothesisDraft {
  return {
    column, testType: ONE_SAMPLE_T, alphaStr: '0.05', alternative: 'two-sided',
    mu0Str: '0', correction: true, varianceTestType: 'Levene',
    group1: { column: '', values: [], name: 'Group 1' },
    group2: { column: '', values: [], name: 'Group 2' },
    anovaGroup: { column: '', values: [], name: 'Groups' },
  };
}

export function validateDraft(draft: HypothesisDraft, numericCols: string[], categoricalCols: string[]) {
  const errors: Partial<Record<'column' | 'mu0Str' | 'alphaStr' | 'groups', string>> = {};
  const groups = draft.testType === TWO_SAMPLE_T || draft.testType === EQUAL_VARIANCE;
  const anova = draft.testType === ONE_WAY_ANOVA;
  if (!numericCols.includes(draft.column)) errors.column = 'Select a numeric variable.';
  if (draft.testType === ONE_SAMPLE_T && (!draft.mu0Str.trim() || !Number.isFinite(Number(draft.mu0Str)))) {
    errors.mu0Str = 'Enter a number for μ₀.';
  }
  const alpha = Number(draft.alphaStr);
  if (!draft.alphaStr.trim() || !Number.isFinite(alpha) || alpha < 0.001 || alpha > 0.5) {
    errors.alphaStr = 'Enter α between 0.001 and 0.5.';
  }
  if ((groups || anova) && categoricalCols.length === 0) errors.groups = 'Choose a categorical column in Data → Column Types first.';
  else if (groups && [draft.group1, draft.group2].some(g => !categoricalCols.includes(g.column) || !g.values.length)) {
    errors.groups = 'Choose a column and at least one category for each group.';
  } else if (anova && (!categoricalCols.includes(draft.anovaGroup.column) || draft.anovaGroup.values.length < 2)) {
    errors.groups = 'Choose a factor and at least two categories.';
  }
  const config: HypothesisConfig | null = Object.keys(errors).length ? null : {
    column: draft.column, testType: draft.testType, alpha,
    alternative: draft.testType === ONE_SAMPLE_T || draft.testType === TWO_SAMPLE_T ? draft.alternative : 'greater',
    mu0: draft.testType === ONE_SAMPLE_T ? Number(draft.mu0Str) : null,
    correction: draft.testType === TWO_SAMPLE_T ? draft.correction : true,
    varianceTestType: draft.testType === EQUAL_VARIANCE ? draft.varianceTestType : 'Levene',
    group1: groups ? draft.group1 : null, group2: groups ? draft.group2 : null,
    anovaColumn: anova ? draft.anovaGroup.column : null,
    anovaLevels: anova ? draft.anovaGroup.values : null,
  };
  return { errors, config };
}

/**
 * Group tests need groups from a categorical column. While a group points at no valid column, fill it
 * with the first categorical column: group 1 = its first category, group 2 = its second, the ANOVA
 * factor = all categories. A group the user has set up is never touched.
 */
export function withGroupDefaults(draft: HypothesisDraft, categoricalCols: string[], levelsOf: (column: string) => string[]): HypothesisDraft {
  const column = categoricalCols[0];
  if (!column) return draft;
  const levels = levelsOf(column);
  const fill = (group: GroupSpec, values: string[]) => categoricalCols.includes(group.column) ? group : { ...group, column, values };
  return {
    ...draft,
    group1: fill(draft.group1, levels.slice(0, 1)),
    group2: fill(draft.group2, levels.slice(1, 2)),
    anovaGroup: fill(draft.anovaGroup, levels),
  };
}

const AUTO_RUN_DELAY = 250;

export function useHypothesisTabState() {
  const { state: data, filteredRows, getUniqueValues } = useData();
  const prepare = useCallback((draft: HypothesisDraft) => withGroupDefaults(draft, data.categoricalCols, getUniqueValues),
    [data.categoricalCols, getUniqueValues]);
  const [draft, updateDraft] = useState(() => prepare(initialDraft(data.numericCols[0])));
  const draftRef = useRef(draft);
  const [result, setResult] = useState<HypothesisResponse | null>(null);
  const [applied, setApplied] = useState<{ config: HypothesisConfig; filename: string; filteredN: number } | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAttempt = useRef<{ config: HypothesisConfig; context: string } | null>(null);
  const context = JSON.stringify([data.sessionId, data.status, data.filters, data.numericCols, data.categoricalCols]);
  const currentContext = useRef(context);
  currentContext.current = context;
  const previousSession = useRef(data.sessionId);

  const invalidateRequest = useCallback(() => {
    requestId.current++;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setIsComputing(false);
  }, []);

  const run = useCallback(async (config: HypothesisConfig) => {
    if (!data.sessionId || data.status !== 'ready') return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const id = ++requestId.current;
    const runContext = context;
    lastAttempt.current = { config, context: runContext };
    setError(null);
    setIsComputing(true);
    try {
      const response = await hypothesisApi.runTest({
        session_id: data.sessionId, column: config.column, test_type: config.testType,
        alpha: config.alpha, alternative: config.alternative, mu0: config.mu0,
        correction: config.correction, variance_test_type: config.varianceTestType,
        group1: config.group1, group2: config.group2,
        anova_column: config.anovaColumn, anova_levels: config.anovaLevels,
        filters: Object.keys(data.filters).length ? data.filters : null,
      });
      if (id !== requestId.current || runContext !== currentContext.current) return;
      setResult(response);
      setApplied({ config, filename: data.filename, filteredN: filteredRows.length });
    } catch (err) {
      if (id !== requestId.current || runContext !== currentContext.current) return;
      setError(err instanceof Error ? err.message : 'Test failed. Try again.');
    } finally {
      if (id === requestId.current && runContext === currentContext.current) setIsComputing(false);
    }
  }, [context, data.sessionId, data.status, data.filters, data.filename, filteredRows.length]);
  const runRef = useRef(run);
  runRef.current = run;

  /** Run the draft now if it is complete; an incomplete draft just waits for the user. */
  const runIfValid = useCallback((next: HypothesisDraft) => {
    const { config } = validateDraft(next, data.numericCols, data.categoricalCols);
    if (config) void runRef.current(config);
  }, [data.numericCols, data.categoricalCols]);

  // New data, filters or column types: drop the old answer and calculate again.
  useEffect(() => {
    invalidateRequest();
    lastAttempt.current = null;
    setResult(null); setApplied(null); setError(null);
    let next = draftRef.current;
    if (previousSession.current !== data.sessionId) {
      previousSession.current = data.sessionId;
      next = initialDraft(data.numericCols[0]);
    } else if (!data.numericCols.includes(next.column)) {
      next = { ...next, column: data.numericCols[0] ?? '' };
    }
    next = prepare(next);
    draftRef.current = next;
    updateDraft(next);
    runIfValid(next);
    return () => {
      requestId.current++;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [context, data.sessionId, data.numericCols, invalidateRequest, prepare, runIfValid]);

  // Every change that alters the request updates the result on its own after a short pause.
  const setDraft = useCallback((patch: Partial<HypothesisDraft>) => {
    const next = prepare({ ...draftRef.current, ...patch });
    const before = validateDraft(draftRef.current, data.numericCols, data.categoricalCols).config;
    const after = validateDraft(next, data.numericCols, data.categoricalCols).config;
    draftRef.current = next;
    updateDraft(next);
    if (before && after && JSON.stringify(before) === JSON.stringify(after)) return;
    invalidateRequest();
    setError(null);
    if (after) timer.current = setTimeout(() => void runRef.current(after), AUTO_RUN_DELAY);
  }, [data.numericCols, data.categoricalCols, invalidateRequest, prepare]);

  const validation = validateDraft(draft, data.numericCols, data.categoricalCols);
  const handleRetry = () => {
    const attempt = lastAttempt.current;
    if (attempt && attempt.context === context) void run(attempt.config);
  };
  const handleReset = () => {
    invalidateRequest();
    lastAttempt.current = null;
    const next = prepare(initialDraft(data.numericCols[0]));
    draftRef.current = next;
    updateDraft(next);
    setResult(null); setApplied(null); setError(null);
    runIfValid(next);
  };
  const isDirty = !!result && JSON.stringify(validation.config) !== JSON.stringify(applied?.config);
  const countGroup = (group: GroupSpec) => filteredRows.filter(row =>
    group.values.includes(row[group.column]) && row[draft.column]?.trim() !== '' && Number.isFinite(Number(row[draft.column]))
  ).length;

  return {
    draft, setDraft, result, applied, isComputing, error, isDirty,
    handleRetry, handleReset,
    validationErrors: validation.errors,
    hasData: data.status === 'ready' && !!data.dataset,
    numericCols: data.numericCols, categoricalCols: data.categoricalCols,
    precision: data.displayPrecision, sessionId: data.sessionId, filename: data.filename,
    filteredN: filteredRows.length, getUniqueValues,
    groupCounts: [countGroup(draft.group1), countGroup(draft.group2)],
  };
}

export type HypothesisTabState = ReturnType<typeof useHypothesisTabState>;
