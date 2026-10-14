from pydantic import BaseModel, Field
from typing import Dict, List, Literal, Optional

GraphType = Literal["Histogram", "PMF", "ECDF"]


class GraphicalParams(BaseModel):
    column: str
    graph_type: GraphType = Field("Histogram", description="Wire vocabulary: 'Histogram', 'PMF', 'ECDF'")

    # Histogram / PMF display options
    bins: Optional[int] = Field(None, ge=2, le=200, description="Histogram bin count; None means numpy 'auto'")
    add_kde: bool = True
    add_data: bool = False

    # ECDF band: significance level alpha, same convention as every other tab
    add_conf_band: bool = True
    alpha: float = Field(0.05, gt=0.0, lt=1.0)

    # Normal overlay (histogram density / ECDF curve) and the estimators it is drawn from
    add_normal: bool = False
    mu_estimator: str = Field("Sample Mean", description="Any mean estimator, or 'Sample Median'")
    sigma_estimator: str = "Deviation (1 ddof)"
    trim_param: Optional[float] = Field(None, gt=0.0, lt=0.5)
    winsor_limits: Optional[str] = None
    weights_column: Optional[str] = None

    filters: Optional[Dict[str, List[str]]] = None


class HistogramData(BaseModel):
    bins: List[float]
    counts: List[int]
    densities: List[float]


class PMFData(BaseModel):
    values: List[float]
    probs: List[float]


class ECDFData(BaseModel):
    x: List[float]
    y: List[float]
    epsilon: float
    lower: Optional[List[float]] = None
    upper: Optional[List[float]] = None


class Curve(BaseModel):
    x: List[float]
    y: List[float]


class NormalCurve(Curve):
    mu: float
    sigma: float


class RugData(BaseModel):
    x: List[float]
    n_shown: int
    n_total: int


class Summary(BaseModel):
    n: int
    n_unique: int


class PointEstimates(BaseModel):
    mu: Optional[float] = None
    sigma: Optional[float] = None


class GraphicalResponse(BaseModel):
    summary: Summary
    histogram_data: Optional[HistogramData] = None
    pmf_data: Optional[PMFData] = None
    ecdf_data: Optional[ECDFData] = None
    kde_curve: Optional[Curve] = None
    normal_curve: Optional[NormalCurve] = None
    rug_data: Optional[RugData] = None
    point_estimates: Optional[PointEstimates] = None
    alpha: Optional[float] = None  # set only when an ECDF band was drawn
    warnings: List[str] = []
