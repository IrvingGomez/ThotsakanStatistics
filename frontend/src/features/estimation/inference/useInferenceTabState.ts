import { useState, useCallback } from 'react';
import { useData } from '../../../context/DataContext';
import { inferenceApi, type IntervalsResponse, type ConfidenceRegionsResponse } from '../../../api/inference';

export type InferenceConfig = {
  column: string;
  estimationType: 'Confidence Intervals' | 'Prediction Intervals' | 'Confidence and Prediction Intervals' | 'Confidence Regions';
  alpha: number;
  mean_estimator: string;
  median_estimator: string;
  sigma_estimator: string;
  trim_param?: number | null;
  winsor_limits?: string | null;
  weights_column?: string | null;
  bootstrap_mean: boolean;
  bootstrap_median: boolean;
  bootstrap_deviation: boolean;
  bootstrap_pi: boolean;
  bootstrap_samples: number;
  probs?: string;
  eps_mu?: string;
  eps_sigma?: string;
  add_ci_box?: boolean;
  mu_ci_source?: string;
};

export function useInferenceTabState() {
  const { state: dataState } = useData();
  const [ciResult, setCiResult] = useState<IntervalsResponse | null>(null);
  const [piResult, setPiResult] = useState<IntervalsResponse | null>(null);
  const [regionResult, setRegionResult] = useState<ConfidenceRegionsResponse | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = useCallback(async (cfg: InferenceConfig) => {
    if (!dataState.sessionId) {
      setError('No active session. Please upload a dataset first.');
      return;
    }

    setError(null);
    setIsComputing(true);
    setCiResult(null);
    setPiResult(null);
    setRegionResult(null);

    const baseParams = {
      session_id: dataState.sessionId,
      column: cfg.column,
      alpha: cfg.alpha,
      mean_estimator: cfg.mean_estimator,
      median_estimator: cfg.median_estimator,
      sigma_estimator: cfg.sigma_estimator,
      trim_param: cfg.trim_param,
      winsor_limits: cfg.winsor_limits,
      weights_column: cfg.weights_column,
      bootstrap_mean: cfg.bootstrap_mean,
      bootstrap_median: cfg.bootstrap_median,
      bootstrap_deviation: cfg.bootstrap_deviation,
      bootstrap_pi: cfg.bootstrap_pi,
      bootstrap_samples: cfg.bootstrap_samples,
      filters: Object.keys(dataState.filters).length > 0 ? dataState.filters : null,
    };

    try {
      if (cfg.estimationType === 'Confidence Regions') {
        const probs = cfg.probs?.split(',').map(s => parseFloat(s.trim())) || [0.1, 0.5, 0.75, 0.89, 0.95];
        const eps_mu = cfg.eps_mu?.split(',').map(s => parseFloat(s.trim())) || [0.1, 0.1];
        const eps_sigma = cfg.eps_sigma?.split(',').map(s => parseFloat(s.trim())) || [0.05, 0.05];
        
        const res = await inferenceApi.computeRegions({
          ...baseParams,
          probs,
          eps_mu,
          eps_sigma,
          add_ci_box: cfg.add_ci_box ?? true,
          mu_ci_source: cfg.mu_ci_source ?? 'Mean-based CI',
        });
        setRegionResult(res);
      } else {
        if (cfg.estimationType === 'Confidence Intervals' || cfg.estimationType === 'Confidence and Prediction Intervals') {
          const res = await inferenceApi.computeCI(baseParams);
          setCiResult(res);
        }
        if (cfg.estimationType === 'Prediction Intervals' || cfg.estimationType === 'Confidence and Prediction Intervals') {
          const res = await inferenceApi.computePI(baseParams);
          setPiResult(res);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Computation failed');
    } finally {
      setIsComputing(false);
    }
  }, [dataState.sessionId, dataState.filters]);

  const handleReset = useCallback(() => {
    setCiResult(null);
    setPiResult(null);
    setRegionResult(null);
    setError(null);
  }, []);

  return {
    ciResult,
    piResult,
    regionResult,
    isComputing,
    error,
    handleRun,
    handleReset,
    hasData: dataState.status === 'ready' && dataState.numericCols.length > 0,
    numericCols: dataState.numericCols,
    precision: dataState.displayPrecision,
    sessionId: dataState.sessionId,
  };
}
