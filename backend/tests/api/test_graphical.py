from fastapi.testclient import TestClient
import numpy as np
import pandas as pd
import pytest

from main import app
from sessions.store import set_session

client = TestClient(app)

RNG = np.random.default_rng(7)


@pytest.fixture
def mock_session():
    session_id = "test-graphical-session"
    df = pd.DataFrame({
        "Age": RNG.normal(30, 8, size=40),
        "City": ["Bangkok" if i % 2 else "Chiang Mai" for i in range(40)],
    })
    set_session(session_id, df)
    return session_id


def post(session_id, **params):
    return client.post(
        "/api/graphical/compute",
        json={"column": "Age", **params},
        headers={"x-session-id": session_id},
    )


def test_histogram_api(mock_session):
    res = post(mock_session, graph_type="Histogram", add_kde=True)
    assert res.status_code == 200
    body = res.json()
    assert body["histogram_data"] is not None
    assert body["kde_curve"] is not None
    assert body["summary"]["n"] == 40


def test_ecdf_api_is_json_serializable(mock_session):
    """Regression: statsmodels ECDF prepends -inf, which broke JSON rendering."""
    res = post(mock_session, graph_type="ECDF")
    assert res.status_code == 200
    body = res.json()
    assert body["ecdf_data"]["lower"] is not None
    assert body["ecdf_data"]["epsilon"] > 0


def test_unknown_graph_type_is_rejected(mock_session):
    res = post(mock_session, graph_type="Violin")
    assert res.status_code == 422


def test_missing_column(mock_session):
    res = client.post(
        "/api/graphical/compute",
        json={"column": "NotFound", "graph_type": "Histogram"},
        headers={"x-session-id": mock_session},
    )
    assert res.status_code == 400
    assert "NotFound" in res.json()["detail"]


def test_missing_session():
    res = client.post(
        "/api/graphical/compute",
        json={"column": "Age", "graph_type": "Histogram"},
        headers={"x-session-id": "no-such-session"},
    )
    assert res.status_code == 404


def test_filters_shrink_the_sample(mock_session):
    full = post(mock_session, graph_type="Histogram").json()
    filtered = post(
        mock_session, graph_type="Histogram", filters={"City": ["Bangkok"]}
    ).json()
    assert filtered["summary"]["n"] == 20
    assert filtered["summary"]["n"] < full["summary"]["n"]


def test_ecdf_alpha_sets_the_band_width(mock_session):
    wide = post(mock_session, graph_type="ECDF", alpha=0.01).json()
    narrow = post(mock_session, graph_type="ECDF", alpha=0.20).json()
    assert wide["ecdf_data"]["epsilon"] > narrow["ecdf_data"]["epsilon"]
    assert wide["alpha"] == 0.01


def test_normal_overlay_uses_the_chosen_estimators(mock_session):
    res = post(mock_session, add_normal=True, mu_estimator="Sample Median", sigma_estimator="IQR (bias corrected)")
    assert res.status_code == 200
    body = res.json()
    assert body["normal_curve"] is not None
    assert body["point_estimates"]["mu"] is not None and body["point_estimates"]["sigma"] > 0


def test_old_interval_and_bootstrap_fields_are_ignored_not_rejected(mock_session):
    res = post(mock_session, add_ci=True, add_pi=True, bootstrap_mean=True, conf_level=0.9)
    assert res.status_code == 200
    body = res.json()
    assert "interval_bands" not in body and "dist_used" not in body


def test_an_irrelevant_kde_flag_on_the_ecdf_is_silent(mock_session):
    body = post(mock_session, graph_type="ECDF", add_kde=True).json()
    assert body["warnings"] == []
