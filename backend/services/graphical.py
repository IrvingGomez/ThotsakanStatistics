import numpy as np
import pandas as pd
from scipy import stats
from statsmodels.distributions.empirical_distribution import ECDF
from typing import Dict, Any, List, Optional
from api.schemas.graphical import GraphicalParams, GraphicalResponse

def _compute_histogram(data: pd.Series) -> Dict[str, List[float]]:
    counts, bin_edges = np.histogram(data, bins='auto')
    densities, _ = np.histogram(data, bins=bin_edges, density=True)
    return {
        "bins": bin_edges.tolist(),
        "counts": counts.tolist(),
        "densities": densities.tolist()
    }

def _compute_pmf(data: pd.Series) -> Dict[str, List[float]]:
    values, counts = np.unique(data, return_counts=True)
    probs = counts / counts.sum()
    return {
        "values": values.tolist(),
        "probs": probs.tolist()
    }

def _compute_ecdf(data: pd.Series) -> Dict[str, List[float]]:
    ecdf = ECDF(data)
    x = ecdf.x.tolist()
    y = ecdf.y.tolist()
    
    # DKW bands (alpha = 0.05 => 95% confidence)
    n = len(data)
    alpha = 0.05
    epsilon = np.sqrt(np.log(2 / alpha) / (2 * n))
    
    lower = np.maximum(ecdf.y - epsilon, 0).tolist()
    upper = np.minimum(ecdf.y + epsilon, 1).tolist()
    
    return {
        "x": x,
        "y": y,
        "lower": lower,
        "upper": upper
    }

def _compute_kde(data: pd.Series) -> Dict[str, List[float]]:
    kde = stats.gaussian_kde(data)
    x_grid = np.linspace(data.min(), data.max(), 500)
    y_grid = kde.evaluate(x_grid)
    return {
        "x": x_grid.tolist(),
        "y": y_grid.tolist()
    }

def _compute_normal(data: pd.Series, is_cdf: bool = False) -> Dict[str, List[float]]:
    mu = data.mean()
    sigma = data.std(ddof=1)
    x_grid = np.linspace(data.min(), data.max(), 500)
    
    if is_cdf:
        y_grid = stats.norm.cdf(x_grid, loc=mu, scale=sigma)
    else:
        y_grid = stats.norm.pdf(x_grid, loc=mu, scale=sigma)
        
    return {
        "x": x_grid.tolist(),
        "y": y_grid.tolist()
    }

def compute_graphical_data(data: pd.Series, params: GraphicalParams) -> Dict[str, Any]:
    response = {}
    
    if params.graph_type == "Histogram":
        response["histogram_data"] = _compute_histogram(data)
    elif params.graph_type == "PMF":
        response["pmf_data"] = _compute_pmf(data)
    elif params.graph_type == "ECDF":
        response["ecdf_data"] = _compute_ecdf(data)
        
    if params.add_kde and params.graph_type in ["Histogram", "PMF"]:
        response["kde_curve"] = _compute_kde(data)
        
    if params.add_normal:
        is_cdf = params.graph_type == "ECDF"
        response["normal_curve"] = _compute_normal(data, is_cdf=is_cdf)
        
    return response
