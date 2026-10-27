import json

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from main import app
from sessions.store import set_session

client = TestClient(app)

NAN = np.nan
# The complete rows (both value and weight present) are the first four in every case below.
COMPLETE = pd.DataFrame({"x": [1.0, 2.0, 4.0, 7.0], "w": [1.0, 3.0, 2.0, 1.0]})
MISSING = {
    "values missing": pd.DataFrame({"x": [1.0, 2.0, 4.0, 7.0, NAN], "w": [1.0, 3.0, 2.0, 1.0, 5.0]}),
    "weights missing": pd.DataFrame({"x": [1.0, 2.0, 4.0, 7.0, 50.0], "w": [1.0, 3.0, 2.0, 1.0, NAN]}),
    "both missing": pd.DataFrame({"x": [1.0, NAN, 2.0, 4.0, 7.0, 50.0], "w": [1.0, 9.0, 3.0, 2.0, 1.0, NAN]}),
}


def post(endpoint, df, **extra):
    session_id = f"inference-{endpoint}"
    set_session(session_id, df)
    payload = {"session_id": session_id, "column": "x", "weights_column": "w",
               "mean_estimator": "Weighted Mean", **extra}
    return client.post(f"/api/inference/{endpoint}", json=payload, headers={"x-session-id": session_id})


@pytest.mark.parametrize("case", MISSING)
@pytest.mark.parametrize("endpoint", ["ci", "pi"])
def test_weighted_intervals_drop_rows_missing_a_value_or_a_weight(endpoint, case):
    response = post(endpoint, MISSING[case])
    expected = post(endpoint, COMPLETE)
    assert response.status_code == 200, response.text
    assert response.json()["n"] == 4
    assert json.loads(response.json()["table"]) == json.loads(expected.json()["table"])


def test_weighted_mean_pairs_each_value_with_its_own_weight():
    table = json.loads(post("ci", MISSING["both missing"], sigma_estimator="Deviation (1 ddof)").json()["table"])
    lower, upper = next((r["Lower"], r["Upper"]) for r in table if r["Statistic"] == "Mean")
    weighted_mean = np.average(COMPLETE["x"], weights=COMPLETE["w"])
    assert lower + upper == pytest.approx(2 * weighted_mean)


def test_regions_ignore_missing_values():
    response = post("regions", MISSING["values missing"], probs=[0.95])
    expected = post("regions", COMPLETE, probs=[0.95])
    assert response.status_code == 200, response.text
    assert response.json()["mu_ci"] == expected.json()["mu_ci"]


def test_unknown_weights_column_is_an_error():
    response = post("ci", COMPLETE.rename(columns={"w": "weight"}))
    assert response.status_code == 400
    assert response.json()["detail"] == "Weights column 'w' not found in dataset"
