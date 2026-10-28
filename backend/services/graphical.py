"""Orchestration for the Graphical Analysis tab.

Validates, resolves estimators, then delegates the drawing data to
``core.estimation.graphical_json``. No numpy / scipy / statsmodels imports here —
this layer only validates, delegates and maps schemas.

Options that do not apply to the requested plot are ignored silently: the frontend
does not send them (a hidden control is never sent), and an irrelevant option is not
a problem worth a warning. Warnings are reserved for things the user can act on.
"""

from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

from api.schemas.graphical import GraphicalParams
from core.estimation import graphical_json as gj
from core.estimation.graphical_json import DegenerateDataError
from core.estimation.inference.estimators import (
    estimate_mean,
    estimate_median,
    estimate_sigma,
)

# The only estimator that consumes a weights column. Any other selection must
# ignore it - otherwise aligning on the weights column silently drops rows.
_WEIGHTED_MEAN = "Weighted Mean"
_SAMPLE_MEDIAN = "Sample Median"


def validate_deviation_estimator(*, sigma_estimator: str, n: int) -> None:
    if sigma_estimator == "Range (bias corrected)" and n > 25:
        raise ValueError(
            "Range-based confidence intervals require n ≤ 25. "
            "Use another estimator."
        )


def _normal_overlay_applies(params: GraphicalParams) -> bool:
    """A normal curve is drawn as a density on the histogram and as a CDF on the ECDF."""
    return params.add_normal


def resolve_weights_column(params: GraphicalParams) -> Optional[str]:
    """
    A weights column is only meaningful for the weighted mean behind the normal overlay.

    Leaving a stale selection in place is not harmless: ``prepare_series``
    intersects the two columns' indices, so a weights column with missing values
    would quietly shrink the sample for every statistic on the plot.
    """
    if not _normal_overlay_applies(params) or params.mu_estimator != _WEIGHTED_MEAN:
        return None
    return params.weights_column


def prepare_series(
    df: pd.DataFrame,
    column: str,
    weights_col: Optional[str],
) -> Tuple[pd.Series, Optional[pd.Series]]:
    """Drop missing values and align an optional weights column on the same index."""
    if column not in df.columns:
        raise ValueError(f"Column '{column}' not found in the dataframe.")

    series = df[column].dropna()
    if series.empty:
        raise ValueError(f"Column '{column}' has no non-missing values.")

    weights = None
    if weights_col:
        if weights_col not in df.columns:
            raise ValueError(f"Weights column '{weights_col}' not found in the dataframe.")
        weights_series = df[weights_col].reindex(series.index).dropna()
        common_idx = series.index.intersection(weights_series.index)
        if len(common_idx) == 0:
            raise ValueError(
                f"No rows have both '{column}' and weights '{weights_col}' present."
            )
        series = series.loc[common_idx]
        weights = weights_series.loc[common_idx]

    return series, weights


def _estimate_mu(data: pd.Series, params: GraphicalParams, weights: Optional[pd.Series]) -> float:
    if params.mu_estimator == _SAMPLE_MEDIAN:
        return float(estimate_median(data, _SAMPLE_MEDIAN))
    return float(
        estimate_mean(
            data,
            params.mu_estimator,
            trim_param=params.trim_param,
            winsor_limits=params.winsor_limits,
            weights=weights,
        )
    )


def compute_graphical_data(df: pd.DataFrame, params: GraphicalParams) -> Dict[str, Any]:
    is_ecdf = params.graph_type == "ECDF"

    weights_col = resolve_weights_column(params)
    data, weights = prepare_series(df, params.column, weights_col)
    n = len(data)
    values = data.to_numpy()

    warnings: List[str] = []

    # The KDE is a density, drawn over the histogram only.
    add_kde = params.add_kde and params.graph_type == "Histogram"
    add_normal = _normal_overlay_applies(params)
    add_band = params.add_conf_band and is_ecdf

    hat_mu: Optional[float] = None
    hat_sigma: Optional[float] = None

    if add_normal:
        validate_deviation_estimator(sigma_estimator=params.sigma_estimator, n=n)
        hat_mu = _estimate_mu(data, params, weights)
        hat_sigma = float(estimate_sigma(data, params.sigma_estimator))

    # -- Assemble the drawing data --------------------------------------------
    response: Dict[str, Any] = {"summary": gj.compute_summary(values)}

    if params.graph_type == "Histogram":
        response["histogram_data"] = gj.compute_histogram_data(values, bins=params.bins)
    elif is_ecdf:
        response["ecdf_data"] = gj.compute_ecdf_data(
            values, alpha=params.alpha, add_conf_band=add_band
        )
    else:  # pragma: no cover - the schema's Literal already excludes this
        raise ValueError(f"Unknown graph type: {params.graph_type}")

    # A degenerate sample makes a density meaningless rather than wrong; say so
    # and keep the rest of the plot instead of failing the whole request.
    if add_kde:
        try:
            response["kde_curve"] = gj.compute_kde_data(values, bandwidth=params.kde_bandwidth)
        except DegenerateDataError as e:
            warnings.append(f"KDE not drawn: {e}")

    if add_normal:
        try:
            response["normal_curve"] = gj.compute_normal_density_data(
                values, is_cdf=is_ecdf, hat_mu=hat_mu, hat_sigma=hat_sigma
            )
        except DegenerateDataError as e:
            warnings.append(f"Normal overlay not drawn: {e}")

    response["point_estimates"] = {"mu": hat_mu, "sigma": hat_sigma}
    response["alpha"] = params.alpha if add_band else None
    response["warnings"] = warnings
    return response
