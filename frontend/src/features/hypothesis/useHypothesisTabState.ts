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
    mu0Str: '', correction: true, varianceTestType: 'Levene',
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
    errors.mu0Str = 'Enter a numeric null value μ₀.';
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

function substantiveKey(config: HypothesisConfig | null) {
  if (!config) return null;
  const { alpha: _alpha, ...rest } = config;
  return JSON.stringify(rest);
}

export function useHypothesisTabState() {
  const { state: data, filteredRows, getUniqueValues } = useData();
  const [draft, updateDraft] = useState(() => initialDraft(data.numericCols[0]));
  const draftRef = useRef(draft);
  const [result, setResult] = useState<HypothesisResponse | null>(null);
  const [applied, setApplied] = useState<{ config: HypothesisConfig; filename: string; filteredN: number } | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const hasRun = useRef(false);
  const requestId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAttempt = useRef<{ config: HypothesisConfig; context: string } | null>(null);
  const context = JSON.stringify([data.sessionId, data.status, data.filters, data.numericCols, data.categoricalCols]);
  const currentContext = useRef(context);
  currentContext.current = context;
  const previousSession = useRef(data.sessionId);
  const appliedRef = useRef(applied);
  appliedRef.current = applied;

  const invalidateRequest = useCallback(() => {
    requestId.current++;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setIsComputing(false);
  }, []);

  useEffect(() => {
    invalidateRequest();
    hasRun.current = false;
    lastAttempt.current = null;
    setResult(null); setApplied(null); setError(null); setRevealed(false);
    if (previousSession.current !== data.sessionId) {
      previousSession.current = data.sessionId;
      draftRef.current = initialDraft(data.numericCols[0]);
      updateDraft(draftRef.current);
    } else if (!data.numericCols.includes(draftRef.current.column)) {
      draftRef.current = { ...draftRef.current, column: data.numericCols[0] ?? '' };
      updateDraft(draftRef.current);
    }
    return () => {
      requestId.current++;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [context, data.sessionId, data.numericCols, invalidateRequest]);

  const run = useCallback(async (config: HypothesisConfig) => {
    if (!data.sessionId || data.status !== 'ready') return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const id = ++requestId.current;
    const runContext = context;
    lastAttempt.current = { config, context: runContext };
    setError(null);
    setIsComputing(true);
    if (substantiveKey(appliedRef.current?.config ?? null) !== substantiveKey(config)) setRevealed(false);
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
      hasRun.current = true;
    } catch (err) {
      if (id !== requestId.current || runContext !== currentContext.current) return;
      setError(err instanceof Error ? err.message : 'Test failed. Try again.');
    } finally {
      if (id === requestId.current && runContext === currentContext.current) setIsComputing(false);
    }
  }, [context, data.sessionId, data.status, data.filters, data.filename, filteredRows.length]);

  const setDraft = useCallback((patch: Partial<HypothesisDraft>) => {
    const next = { ...draftRef.current, ...patch };
    const { alphaStr: _beforeAlpha, ...beforeSettings } = draftRef.current;
    const { alphaStr: _afterAlpha, ...afterSettings } = next;
    const before = validateDraft(draftRef.current, data.numericCols, data.categoricalCols).config;
    const after = validateDraft(next, data.numericCols, data.categoricalCols).config;
    draftRef.current = next;
    updateDraft(next);
    if (before && after && JSON.stringify(before) === JSON.stringify(after)) return;
    invalidateRequest();
    setError(null);
    // Typing a new α can temporarily leave an empty/invalid value. That is still
    // an α-only edit, so keep the previous answer revealed while it is marked stale.
    if (JSON.stringify(beforeSettings) !== JSON.stringify(afterSettings)) setRevealed(false);
    if (after && hasRun.current) timer.current = setTimeout(() => void run(after), 250);
  }, [data.numericCols, data.categoricalCols, invalidateRequest, run]);

  const validation = validateDraft(draft, data.numericCols, data.categoricalCols);
  const handleRun = () => { if (validation.config) void run(validation.config); };
  const handleRetry = () => {
    const attempt = lastAttempt.current;
    if (attempt && attempt.context === context) void run(attempt.config);
  };
  const handleReset = () => {
    invalidateRequest();
    hasRun.current = false;
    lastAttempt.current = null;
    draftRef.current = initialDraft(data.numericCols[0]);
    updateDraft(draftRef.current);
    setResult(null); setApplied(null); setError(null); setRevealed(false);
  };
  const isDirty = !!result && JSON.stringify(validation.config) !== JSON.stringify(applied?.config);
  const countGroup = (group: GroupSpec) => filteredRows.filter(row =>
    group.values.includes(row[group.column]) && row[draft.column]?.trim() !== '' && Number.isFinite(Number(row[draft.column]))
  ).length;

  return {
    draft, setDraft, result, applied, isComputing, error, isDirty, revealed,
    onReveal: () => setRevealed(true), handleRun, handleRetry, handleReset,
    validationErrors: validation.errors, canRun: data.status === 'ready' && !!data.sessionId && !!validation.config && !isComputing,
    hasData: data.status === 'ready' && !!data.dataset,
    numericCols: data.numericCols, categoricalCols: data.categoricalCols,
    precision: data.displayPrecision, sessionId: data.sessionId, filename: data.filename,
    filteredN: filteredRows.length, getUniqueValues,
    groupCounts: [countGroup(draft.group1), countGroup(draft.group2)],
    updatesAutomatically: hasRun.current,
  };
}

export type HypothesisTabState = ReturnType<typeof useHypothesisTabState>;
