"""Service-level parity tests for Graphical Analysis.

Numbers are checked against the same core helpers the Gradio original calls, so
a drift in the JSON layer shows up here rather than in the UI.
"""

import math

import numpy as np
import pandas as pd
import pytest
from pydantic import ValidationError

from api.schemas.graphical import GraphicalParams
from core.estimation.inference.estimators import estimate_mean, estimate_sigma
from services.graphical import compute_graphical_data

RNG = np.random.default_rng(20260909)
VALUES = np.round(RNG.normal(loc=30.0, scale=8.0, size=60), 4)
WEIGHTS = np.abs(RNG.normal(loc=5.0, scale=1.0, size=60))


@pytest.fixture
def df():
    return pd.DataFrame({
        "Age": VALUES,
        "Weight": WEIGHTS,
        "City": ["A" if i % 2 else "B" for i in range(60)],
    })


def params(**kwargs) -> GraphicalParams:
    return GraphicalParams(column="Age", **kwargs)


# -- ECDF --------------------------------------------------------------------

def test_ecdf_drops_the_non_serializable_leading_point(df):
    res = compute_graphical_data(df, params(graph_type="ECDF"))
    xs = res["ecdf_data"]["x"]
    assert all(math.isfinite(x) for x in xs)
    assert xs[0] == pytest.approx(float(VALUES.min()))


def test_dkw_epsilon_follows_the_significance_level(df):
    n = len(VALUES)
    for alpha in (0.05, 0.10):
        res = compute_graphical_data(df, params(graph_type="ECDF", alpha=alpha))
        expected = math.sqrt(math.log(2.0 / alpha) / (2.0 * n))
        assert res["ecdf_data"]["epsilon"] == pytest.approx(expected)
        assert res["alpha"] == alpha

    tight = compute_graphical_data(df, params(graph_type="ECDF", alpha=0.10))
    wide = compute_graphical_data(df, params(graph_type="ECDF", alpha=0.05))
    assert tight["ecdf_data"]["epsilon"] < wide["ecdf_data"]["epsilon"]


def test_ecdf_band_omitted_when_switched_off(df):
    res = compute_graphical_data(df, params(graph_type="ECDF", add_conf_band=False))
    assert res["ecdf_data"].get("lower") is None
    assert res["ecdf_data"].get("upper") is None
    assert res["alpha"] is None  # no band, so no alpha to report


def test_alpha_is_only_reported_for_the_ecdf_band(df):
    assert compute_graphical_data(df, params())["alpha"] is None
    assert compute_graphical_data(df, params(graph_type="PMF"))["alpha"] is None


# -- Normal overlay ----------------------------------------------------------

def test_normal_overlay_honours_the_selected_estimators(df):
    res = compute_graphical_data(df, params(
        add_normal=True,
        mu_estimator="Interquartile Mean",
        sigma_estimator="MAD (bias corrected)",
    ))

    expected_mu = float(estimate_mean(pd.Series(VALUES), "Interquartile Mean"))
    expected_sigma = float(estimate_sigma(pd.Series(VALUES), "MAD (bias corrected)"))

    assert res["point_estimates"]["mu"] == pytest.approx(expected_mu)
    assert res["point_estimates"]["sigma"] == pytest.approx(expected_sigma)
    assert res["normal_curve"]["mu"] == pytest.approx(expected_mu)

    # Grid is hat_mu +/- 3 sigma, matching the matplotlib overlay.
    xs = res["normal_curve"]["x"]
    assert len(xs) == 200
    assert xs[0] == pytest.approx(expected_mu - 3 * expected_sigma)
    assert xs[-1] == pytest.approx(expected_mu + 3 * expected_sigma)


def test_normal_overlay_can_centre_on_the_median(df):
    res = compute_graphical_data(df, params(add_normal=True, mu_estimator="Sample Median"))
    assert res["point_estimates"]["mu"] == pytest.approx(float(np.median(VALUES)))


def test_normal_overlay_defaults_to_the_sample_mean_and_s(df):
    res = compute_graphical_data(df, params(add_normal=True))
    assert res["point_estimates"]["mu"] == pytest.approx(float(VALUES.mean()))
    assert res["point_estimates"]["sigma"] == pytest.approx(float(VALUES.std(ddof=1)))


def test_no_estimates_without_a_normal_overlay(df):
    res = compute_graphical_data(df, params(mu_estimator="Sample Median"))
    assert res["point_estimates"] == {"mu": None, "sigma": None}
    assert "normal_curve" not in res


def test_range_estimator_rejected_above_25_observations(df):
    with pytest.raises(ValueError, match="Range-based"):
        compute_graphical_data(df, params(
            add_normal=True, sigma_estimator="Range (bias corrected)"
        ))


def test_alpha_is_validated():
    # Bounds live on the schema, so an out-of-range level never reaches the
    # service. See test_graphical_edge_cases.TestParameterBounds for the sweep.
    with pytest.raises(ValidationError):
        params(graph_type="ECDF", alpha=1.5)


def test_interval_and_bootstrap_fields_are_gone():
    """CI / PI / bootstrap moved to the Inference tab; an old client's extra fields are ignored."""
    p = params(add_ci=True, bootstrap_mean=True, conf_level=0.9)
    assert not hasattr(p, "add_ci") and not hasattr(p, "bootstrap_mean")


# -- Histogram / PMF / rug ---------------------------------------------------

def test_histogram_bin_count_is_controllable(df):
    auto = compute_graphical_data(df, params())
    fixed = compute_graphical_data(df, params(bins=12))
    assert len(fixed["histogram_data"]["counts"]) == 12
    assert len(auto["histogram_data"]["counts"]) == len(auto["histogram_data"]["bins"]) - 1


def test_rug_data_only_when_requested(df):
    assert "rug_data" not in compute_graphical_data(df, params())
    res = compute_graphical_data(df, params(add_data=True))
    assert res["rug_data"]["n_total"] == len(VALUES)


def test_pmf_warns_on_a_near_continuous_column(df):
    res = compute_graphical_data(df, params(graph_type="PMF"))
    assert any("empirical PMF" in w for w in res["warnings"])


def test_unknown_graph_type_is_rejected():
    with pytest.raises(Exception):
        GraphicalParams(column="Age", graph_type="Empirical Probability Mass Function")


# -- Weights -----------------------------------------------------------------

def test_weights_column_aligns_with_the_data(df):
    res = compute_graphical_data(df, params(
        add_normal=True, mu_estimator="Weighted Mean", weights_column="Weight"
    ))
    expected = float(estimate_mean(df["Age"], "Weighted Mean", weights=df["Weight"]))
    assert res["point_estimates"]["mu"] == pytest.approx(expected)
