from pydantic import BaseModel, Field
from typing import Optional, List, Dict

class GraphicalParams(BaseModel):
    column: str
    graph_type: str = Field(..., description="One of 'Histogram', 'ECDF', 'PMF'")
    add_kde: bool = False
    add_normal: bool = False

class GraphicalResponse(BaseModel):
    histogram_data: Optional[Dict[str, List[float]]] = None
    ecdf_data: Optional[Dict[str, List[float]]] = None
    pmf_data: Optional[Dict[str, List[float]]] = None
    kde_curve: Optional[Dict[str, List[float]]] = None
    normal_curve: Optional[Dict[str, List[float]]] = None
