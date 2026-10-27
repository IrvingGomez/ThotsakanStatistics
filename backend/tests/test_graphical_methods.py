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
    assert compute_graphical_data(df, params(add_kde=False))["alpha"] is None


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


# -- Histogram ---------------------------------------------------------------

def test_histogram_bin_count_is_controllable(df):
    auto = compute_graphical_data(df, params())
    fixed = compute_graphical_data(df, params(bins=12))
    assert len(fixed["histogram_data"]["counts"]) == 12
    assert len(auto["histogram_data"]["counts"]) == len(auto["histogram_data"]["bins"]) - 1


def whole_numbers(values):
    return pd.DataFrame({"Age": np.asarray(values, dtype=float)})


def test_whole_numbers_get_one_bar_per_value():
    """Whole numbers with repeats read as discrete: bars of width 1 centred on each value."""
    res = compute_graphical_data(whole_numbers(np.repeat([2, 3, 5], [4, 10, 6])), params())
    hist = res["histogram_data"]
    assert hist["unit_width"] is True
    assert hist["bins"] == [1.5, 2.5, 3.5, 4.5, 5.5]
    assert hist["counts"] == [4, 10, 0, 6]
    assert sum(d * 1.0 for d in hist["densities"]) == pytest.approx(1.0)


def test_continuous_data_keep_the_automatic_bins(df):
    assert compute_graphical_data(df, params())["histogram_data"]["unit_width"] is False


def test_whole_numbers_without_enough_repeats_stay_continuous():
    # 60 distinct values in 60 observations: more than half are distinct.
    res = compute_graphical_data(whole_numbers(np.arange(60)), params())
    assert res["histogram_data"]["unit_width"] is False


def test_unit_width_is_skipped_when_it_would_need_more_than_200_bars():
    res = compute_graphical_data(whole_numbers(np.repeat([0, 500, 1000], 10)), params())
    assert res["histogram_data"]["unit_width"] is False


def test_a_chosen_bin_count_overrides_unit_width():
    res = compute_graphical_data(whole_numbers(np.repeat([2, 3, 5], [4, 10, 6])), params(bins=2))
    assert res["histogram_data"]["unit_width"] is False
    assert len(res["histogram_data"]["counts"]) == 2


def test_the_pmf_and_the_rug_are_gone(df):
    with pytest.raises(ValidationError):
        params(graph_type="PMF")
    res = compute_graphical_data(df, params(add_data=True))  # an old client's flag is ignored
    assert "rug_data" not in res and "pmf_data" not in res


def test_unknown_graph_type_is_rejected():
    with pytest.raises(Exception):
        GraphicalParams(column="Age", graph_type="Empirical Probability Mass Function")


# -- KDE ---------------------------------------------------------------------

def test_kde_defaults_to_scotts_rule(df):
    from scipy.stats import gaussian_kde

    kde = compute_graphical_data(df, params())["kde_curve"]
    scott = float(np.std(VALUES, ddof=1)) * len(VALUES) ** (-1 / 5)
    assert kde["bandwidth"] == pytest.approx(scott)
    assert kde["default_bandwidth"] == pytest.approx(scott)
    assert kde["y"] == pytest.approx(gaussian_kde(VALUES)(np.array(kde["x"])).tolist())


def test_kde_bandwidth_is_controllable(df):
    from scipy.stats import norm

    kde = compute_graphical_data(df, params(kde_bandwidth=2.0))["kde_curve"]
    assert kde["bandwidth"] == pytest.approx(2.0)
    assert kde["default_bandwidth"] == pytest.approx(float(np.std(VALUES, ddof=1)) * len(VALUES) ** (-1 / 5))
    x = kde["x"][250]
    assert kde["y"][250] == pytest.approx(float(norm.pdf(x, VALUES, 2.0).mean()))


def test_kde_bandwidth_must_be_positive():
    with pytest.raises(ValidationError):
        params(kde_bandwidth=0.0)


# -- Weights -----------------------------------------------------------------

def test_weights_column_aligns_with_the_data(df):
    res = compute_graphical_data(df, params(
        add_normal=True, mu_estimator="Weighted Mean", weights_column="Weight"
    ))
    expected = float(estimate_mean(df["Age"], "Weighted Mean", weights=df["Weight"]))
    assert res["point_estimates"]["mu"] == pytest.approx(expected)
