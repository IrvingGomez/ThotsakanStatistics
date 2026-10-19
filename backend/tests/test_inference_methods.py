import json

import pandas as pd
import pytest

from api.schemas.inference import InferenceParams
from services.inference import calculate_intervals


def _params(**overrides):
    base = dict(session_id="t", column="x")
    base.update(overrides)
    return InferenceParams(**base)


DATA = pd.Series([float(v) for v in range(2, 42)])  # n = 40


def _method(table, statistic):
    rows = json.loads(table.to_json(orient="records"))
    return next(r["Method"] for r in rows if r["Statistic"] == statistic)


def test_mean_method_t_for_sample_sd():
    ci, _, _, _, _, ctx = calculate_intervals(DATA, _params(sigma_estimator="Deviation (1 ddof)"))
    assert _method(ci, "Mean").startswith("t (df=")
    assert _method(ci, "Deviation") == "Chi-square (s, ddof=1)"
    assert ctx["n"] == 40


def test_mean_method_normal_for_robust_scale():
    ci, _, _, _, _, _ = calculate_intervals(DATA, _params(sigma_estimator="MAD (bias corrected)"))
    assert _method(ci, "Mean") == "Normal (z, MAD)"
    assert _method(ci, "Deviation") == "Normal (asymptotic, MAD)"


def _rows(table, statistic):
    return [r for r in json.loads(table.to_json(orient="records")) if r["Statistic"] == statistic]


def test_defaults_give_one_normal_row_per_quantity():
    ci, pi, _, _, _, _ = calculate_intervals(DATA, _params())
    assert [r["Statistic"] for r in json.loads(ci.to_json(orient="records"))] == ["Mean", "Median", "Deviation"]
    assert [r["Statistic"] for r in json.loads(pi.to_json(orient="records"))] == ["Mean", "Median", "IQR"]


def test_bootstrap_adds_a_row_next_to_the_normal_row():
    ci, _, mean_ci, _, _, _ = calculate_intervals(
        DATA, _params(bootstrap_mean=True, bootstrap_samples=200)
    )
    mean_rows = _rows(ci, "Mean")
    assert [r["Method"].split(" ")[0] for r in mean_rows] == ["t", "Bootstrap"]
    # the other quantities are untouched
    assert len(_rows(ci, "Median")) == 1 and len(_rows(ci, "Deviation")) == 1
    # the primary interval handed to regions / graphical is the bootstrap one
    assert list(mean_ci) == pytest.approx([mean_rows[1]["Lower"], mean_rows[1]["Upper"]])


def test_every_ci_bootstrap_adds_its_own_row():
    ci, _, _, _, _, _ = calculate_intervals(
        DATA,
        _params(bootstrap_mean=True, bootstrap_median=True, bootstrap_deviation=True, bootstrap_samples=200),
    )
    for statistic in ("Mean", "Median", "Deviation"):
        methods = [r["Method"] for r in _rows(ci, statistic)]
        assert len(methods) == 2 and methods[1] == "Bootstrap (B=200)"


def test_bootstrap_only_drops_the_normal_row():
    ci, _, mean_ci, _, _, _ = calculate_intervals(
        DATA, _params(ci_mean_normal=False, bootstrap_mean=True, bootstrap_samples=200)
    )
    rows = _rows(ci, "Mean")
    assert [r["Method"] for r in rows] == ["Bootstrap (B=200)"]
    assert list(mean_ci) == pytest.approx([rows[0]["Lower"], rows[0]["Upper"]])


def test_unticked_normal_methods_produce_no_rows():
    ci, pi, _, _, _, _ = calculate_intervals(
        DATA,
        _params(ci_mean_normal=False, ci_median_normal=False, ci_deviation_normal=False,
                pi_mean_normal=False, pi_median_normal=False, pi_iqr_normal=False),
    )
    assert ci.empty and pi.empty
    assert list(ci.columns) == ["Interval Type", "Statistic", "Lower", "Upper", "Method"]


def test_pi_flags_select_individual_rows_and_bootstrap_adds_one():
    _, pi, _, _, _, _ = calculate_intervals(
        DATA,
        _params(pi_mean_normal=False, pi_iqr_normal=False, bootstrap_pi=True, bootstrap_samples=200),
    )
    assert [r["Statistic"] for r in json.loads(pi.to_json(orient="records"))] == ["Median", "Bootstrap"]


def test_pi_iqr_row_names_its_normal_calibration():
    _, pi, _, _, _, _ = calculate_intervals(DATA, _params())
    assert _method(pi, "IQR") == "IQR (normal-scaled)"


def _region_params(**overrides):
    from api.schemas.inference import ConfidenceRegionsParams

    base = dict(session_id="t", column="x", probs=[0.5, 0.95])
    base.update(overrides)
    return ConfidenceRegionsParams(**base)


def test_regions_ignore_estimator_and_bootstrap_choices():
    """Regions always use the sample mean and std (ddof=1) with normal-theory intervals."""
    from services.inference import calculate_regions

    reference = calculate_regions(DATA, _region_params())
    tampered = calculate_regions(
        DATA,
        _region_params(
            sigma_estimator="MAD (bias corrected)", mean_estimator="Trimmed Mean", trim_param=0.2,
            bootstrap_mean=True, bootstrap_deviation=True, bootstrap_samples=50,
        ),
    )
    assert tampered["mu_ci"] == reference["mu_ci"]
    assert tampered["sigma_ci"] == reference["sigma_ci"]


def test_regions_box_is_the_mean_t_interval_and_the_chi_square_deviation_interval():
    from services.inference import calculate_regions

    res = calculate_regions(DATA, _region_params())
    rows = json.loads(res["table"])
    mean = next(r for r in rows if r["Statistic"] == "Mean")
    dev = next(r for r in rows if r["Statistic"] == "Deviation")
    assert mean["Method"].startswith("t (df=") and dev["Method"] == "Chi-square (s, ddof=1)"
    assert res["mu_ci"] == pytest.approx([mean["Lower"], mean["Upper"]])
    assert res["sigma_ci"] == pytest.approx([dev["Lower"], dev["Upper"]])


def test_regions_table_is_omitted_when_the_box_is_off():
    from services.inference import calculate_regions

    assert calculate_regions(DATA, _region_params(add_ci_box=False))["table"] is None


@pytest.mark.parametrize("data", [DATA, pd.Series([4.1, 5.3, 3.8, 6.0, 4.7]), pd.Series([0.001 * v for v in range(1, 201)])])
@pytest.mark.parametrize("probs", [[0.5, 0.95], [0.1, 0.99]])
def test_regions_window_holds_every_contour_and_the_box(data, probs):
    """No contour touches the plot edge, whatever the scale or n, and the drawn CI box fits inside."""
    import numpy as np
    from services.inference import calculate_regions

    res = calculate_regions(data, _region_params(probs=probs, alpha=0.001))
    z = np.array(res["z_matrix"])
    edge = np.concatenate([z[0], z[-1], z[:, 0], z[:, -1]])
    assert edge.max() < min(res["levels"])
    assert min(res["sigma_grid"]) > 0
    assert min(res["mu_grid"]) <= res["mu_ci"][0] and res["mu_ci"][1] <= max(res["mu_grid"])
    assert min(res["sigma_grid"]) <= res["sigma_ci"][0] and res["sigma_ci"][1] <= max(res["sigma_grid"])


def test_regions_window_is_tight_around_the_largest_contour():
    """The bounds are the exact projection: the contour reaches each bound, so R there equals the level."""
    import numpy as np
    from scipy.stats import chi2
    from core.estimation.inference.likelihood import relative_likelihood
    from core.estimation.inference.region_bounds import region_bounds

    data = DATA.to_numpy()
    (mu_lo, mu_hi), (s_lo, s_hi) = region_bounds(data=data, probs=[0.5, 0.95])
    level = np.exp(-0.5 * chi2.ppf(0.95, 2))
    mu_hat, s_hat = data.mean(), data.std(ddof=0)
    profile_sigma = lambda mu: np.sqrt(s_hat**2 + (mu - mu_hat) ** 2)
    for mu in (mu_lo, mu_hi):
        assert relative_likelihood(data=data, mu=mu, sigma=profile_sigma(mu), sigma_hat=s_hat) == pytest.approx(level)
    for s in (s_lo, s_hi):
        assert relative_likelihood(data=data, mu=mu_hat, sigma=s, sigma_hat=s_hat) == pytest.approx(level)


def test_ci_and_pi_halves_match_the_full_calculation():
    from services.inference import calculate_ci, calculate_pi

    params = _params(bootstrap_mean=True, bootstrap_pi=True, bootstrap_samples=200)
    full_ci, full_pi, _, _, _, _ = calculate_intervals(DATA, params)
    ci, ci_ctx = calculate_ci(DATA, params)
    pi, pi_ctx = calculate_pi(DATA, params)
    # normal-theory rows are deterministic, so they must be identical; bootstrap rows only need to exist
    stable = lambda table: [r for r in json.loads(table.to_json(orient="records")) if not r["Method"].startswith("Bootstrap")]
    assert stable(ci) == stable(full_ci)
    assert stable(pi) == stable(full_pi)
    assert [r["Method"] for r in _rows(ci, "Mean")][-1] == "Bootstrap (B=200)"
    assert _rows(pi, "Bootstrap")
    assert ci_ctx["n"] == pi_ctx["n"] == 40


def test_ci_half_does_not_resample_for_prediction_and_vice_versa(monkeypatch):
    import services.inference as module
    from services.inference import calculate_ci, calculate_pi

    calls = []
    monkeypatch.setattr(module, "pi_bootstrap", lambda **kw: calls.append("pi") or (0.0, 1.0))
    real = module.ci_mean_bootstrap
    monkeypatch.setattr(module, "ci_mean_bootstrap", lambda **kw: calls.append("ci") or real(**kw))
    params = _params(bootstrap_mean=True, bootstrap_pi=True, bootstrap_samples=50)
    calculate_ci(DATA, params)
    assert calls == ["ci"]
    calls.clear()
    calculate_pi(DATA, params)
    assert calls == ["pi"]
