import { useState, useEffect } from 'react';
import type { GraphicalParams, GraphicalResponse } from '../../../api/graphical';
import { graphicalApi } from '../../../api/graphical';

export const useGraphicalTabState = (sessionId: string | null, column: string | null) => {
  const [graphType, setGraphType] = useState<string>("Histogram");
  const [addKde, setAddKde] = useState<boolean>(false);
  const [addNormal, setAddNormal] = useState<boolean>(false);

  const [graphData, setGraphData] = useState<GraphicalResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const fetchGraph = async () => {
      if (!sessionId || !column) {
         if (active) setGraphData(null);
         return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const params: GraphicalParams = {
          column,
          graph_type: graphType,
          add_kde: addKde,
          add_normal: addNormal
        };

        const result = await graphicalApi.computeGraph(sessionId, params);
        if (active) {
            setGraphData(result);
            setLoading(false);
        }
      } catch (err: any) {
        if (active) {
            setError(err.message || 'Error fetching graphical data');
            setLoading(false);
        }
      }
    };

    fetchGraph();

    return () => {
      active = false;
    };
  }, [sessionId, column, graphType, addKde, addNormal]);

  return {
    graphType, setGraphType,
    addKde, setAddKde,
    addNormal, setAddNormal,
    graphData,
    loading,
    error
  };
};
