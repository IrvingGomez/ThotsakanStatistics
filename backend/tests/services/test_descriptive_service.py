import pandas as pd
import pytest
from services.descriptive import calculate_descriptive, build_histogram
from api.schemas.descriptive import DescriptiveRequest

def test_calculate_descriptive_basic():
    df = pd.DataFrame({"Score": [10, 20, 20, 30, 40, 50]})
    req = DescriptiveRequest(
        session_id="dummy",
        column="Score"
    )
    
    res = calculate_descriptive(df, req)
    
    assert res.summary.n == 6
    assert res.summary.mean == 28.333333333333332
    assert res.summary.median == 25.0
    
    # Check rows mapped correctly
    assert len(res.rows) > 10
    
    # Check quantiles included
    quantiles = [r for r in res.rows if r.category == 'Quantiles']
    assert len(quantiles) == 3 # 0.25, 0.5, 0.75
    
    # Check Box Data — whiskers are exact fence values: Q1-1.5*IQR, Q3+1.5*IQR
    # Dataset: Q1=20, Q3=37.5 (pandas linear interp), IQR=17.5 → fences: -6.25 / 63.75
    assert res.boxData.whiskerLo == pytest.approx(-6.25)
    assert res.boxData.whiskerHi == pytest.approx(63.75)
    assert len(res.boxData.outliers) == 0

def test_build_histogram():
    series = pd.Series([1, 2, 2, 3, 3, 3, 4, 4, 5])
    hist = build_histogram(series)
    
    assert len(hist.binEdges) > 1
    assert len(hist.counts) == len(hist.binEdges) - 1
    assert sum(hist.counts) == 9


def _request(**overrides):
    base = dict(session_id="dummy", column="Score")
    base.update(overrides)
    return DescriptiveRequest(**base)


def test_every_selectable_statistic_carries_a_stat_id():
    df = pd.DataFrame({"Score": [10, 20, 20, 30, 40, 50], "W": [1, 2, 1, 2, 1, 2]})
    res = calculate_descriptive(df, _request(trimAlpha=0.1, winsorLimits=(0.1, 0.1), weightsCol="W"))
    ids = {r.measure: r.statId for r in res.rows}
    assert ids["Minimum"] == "minimum" and ids["Maximum"] == "maximum"
    assert ids["Mean"] == "mean" and ids["Median"] == "median"
    assert ids["Std (ddof=1)"] == "std_dev_1" and ids["Variance (ddof=1)"] == "variance_1"
    assert ids["Std (ddof=0)"] == "std_dev_0"
    assert ids["Weighted Mean"] == "weighted_mean"
    assert {r.statId for r in res.rows if r.category == "Quantiles"} == {"quantiles"}
    assert not [r.measure for r in res.rows if r.statId is None]


def test_empty_quantile_probabilities_give_no_quantile_rows():
    df = pd.DataFrame({"Score": [10, 20, 20, 30, 40, 50]})
    res = calculate_descriptive(df, _request(quantileProbs=[]))
    assert not [r for r in res.rows if r.category == "Quantiles"]
    assert any(r.measure == "Mean" for r in res.rows)  # everything else is still there


def test_quantile_probabilities_at_the_ends_are_allowed():
    df = pd.DataFrame({"Score": [10, 20, 20, 30, 40, 50]})
    res = calculate_descriptive(df, _request(quantileProbs=[0, 1]))
    values = {r.measure: r.value for r in res.rows if r.category == "Quantiles"}
    assert values == {"Q0.0": 10.0, "Q1.0": 50.0}


def test_weights_stay_aligned_when_values_or_weights_are_missing():
    df = pd.DataFrame({
        "Score": [10, 20, None, 40, 50, 60],
        "W": [1, None, 3, 1, 2, 2],
    })
    # rows 1 (weight missing) and 2 (value missing) are dropped together -> 10, 40, 50, 60
    res = calculate_descriptive(df, _request(weightsCol="W"))
    assert res.summary.n == 4
    weighted = next(r for r in res.rows if r.measure == "Weighted Mean")
    assert weighted.value == pytest.approx((10 * 1 + 40 * 1 + 50 * 2 + 60 * 2) / 6)


def test_unknown_weights_column_is_a_clear_error():
    df = pd.DataFrame({"Score": [1, 2, 3, 4]})
    with pytest.raises(ValueError, match="Weights column 'nope' not found"):
        calculate_descriptive(df, _request(weightsCol="nope"))
