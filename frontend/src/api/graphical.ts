const BASE_URL = "/api/graphical";

export type GraphType = "Histogram" | "PMF" | "ECDF";

export interface GraphicalParams {
  column: string;
  graph_type: GraphType;

  // Histogram / PMF display
  bins?: number | null;
  add_kde: boolean;
  add_data: boolean;

  // ECDF band: significance level alpha, as in every other tab
  add_conf_band?: boolean;
  alpha?: number;

  // Normal overlay and the estimators it is drawn from
  add_normal: boolean;
  mu_estimator?: string; // any mean estimator, or "Sample Median"
  sigma_estimator?: string;
  trim_param?: number | null;
  winsor_limits?: string | null;
  weights_column?: string | null;

  filters?: Record<string, string[]> | null;
}

export interface GraphicalResponse {
  summary: { n: number; n_unique: number };
  histogram_data?: { bins: number[]; counts: number[]; densities: number[] } | null;
  pmf_data?: { values: number[]; probs: number[] } | null;
  ecdf_data?: {
    x: number[];
    y: number[];
    epsilon: number;
    lower?: number[] | null;
    upper?: number[] | null;
  } | null;
  kde_curve?: { x: number[]; y: number[] } | null;
  normal_curve?: { x: number[]; y: number[]; mu: number; sigma: number } | null;
  rug_data?: { x: number[]; n_shown: number; n_total: number } | null;
  point_estimates?: { mu: number | null; sigma: number | null } | null;
  alpha?: number | null; // set only when an ECDF band was drawn
  warnings: string[];
}

export const graphicalApi = {
  computeGraph: async (
    sessionId: string,
    params: GraphicalParams,
    signal?: AbortSignal
  ): Promise<GraphicalResponse> => {
    const response = await fetch(`${BASE_URL}/compute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": sessionId
      },
      body: JSON.stringify(params),
      signal,
    });
    if (!response.ok) {
      const text = await response.text();
      let errStr = text;
      try { errStr = JSON.parse(text).detail || text; } catch {}
      throw new Error(errStr);
    }
    return response.json();
  }
};
