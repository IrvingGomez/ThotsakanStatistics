const BASE_URL = "/api/graphical";

export interface GraphicalParams {
  column: string;
  graph_type: string;
  add_kde: boolean;
  add_normal: boolean;
}

export interface GraphicalResponse {
  histogram_data?: { bins: number[]; counts: number[]; densities: number[] };
  ecdf_data?: { x: number[]; y: number[]; lower: number[]; upper: number[] };
  pmf_data?: { values: number[]; probs: number[] };
  kde_curve?: { x: number[]; y: number[] };
  normal_curve?: { x: number[]; y: number[] };
}

export const graphicalApi = {
  computeGraph: async (sessionId: string, params: GraphicalParams): Promise<GraphicalResponse> => {
    const response = await fetch(`${BASE_URL}/compute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": sessionId
      },
      body: JSON.stringify(params),
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
