import pytest
from fastapi.testclient import TestClient
from scipy import stats

from core.probability.common_distributions.distributions import compute_distribution
from main import app

client = TestClient(app)

BINOM = {'n': 20, 'p': 0.5}
RV = stats.binom(20, 0.5)


def query(dist, params, op, k, **interval):
    return compute_distribution(dist, params, op, k, **interval)['queryResult']


def test_continuous_point_probability_is_zero():
    assert query('Normal', {'mu': 0, 'sigma': 1}, '=', 0) == 0


@pytest.mark.parametrize('op, k, expected', [
    ('<=', 2.5, RV.cdf(2)),
    ('<', 2.5, RV.cdf(2)),
    ('<', 3, RV.cdf(2)),
    ('>', 2.5, RV.sf(2)),
    ('>=', 2.5, RV.sf(2)),
    ('>=', 3, RV.sf(2)),
    ('=', 2.5, 0),
    ('=', 3, RV.pmf(3)),
])
def test_discrete_one_sided_is_exact_without_rounding(op, k, expected):
    assert query('Binomial', BINOM, op, k) == pytest.approx(expected, abs=1e-12)


@pytest.mark.parametrize('lower_op, upper_op, expected', [
    ('<', '<', RV.pmf(3) + RV.pmf(4)),
    ('<=', '<', RV.pmf(2) + RV.pmf(3) + RV.pmf(4)),
    ('<', '<=', RV.pmf(3) + RV.pmf(4) + RV.pmf(5)),
    ('<=', '<=', RV.pmf(2) + RV.pmf(3) + RV.pmf(4) + RV.pmf(5)),
])
def test_discrete_interval_respects_each_end(lower_op, upper_op, expected):
    result = query('Binomial', BINOM, 'between', 2, query_upper=5, lower_op=lower_op, upper_op=upper_op)
    assert result == pytest.approx(expected, abs=1e-12)


def test_continuous_interval_is_cdf_difference():
    result = query('Normal', {'mu': 0, 'sigma': 1}, 'between', -1, query_upper=1, lower_op='<', upper_op='<=')
    assert result == pytest.approx(stats.norm.cdf(1) - stats.norm.cdf(-1), abs=1e-12)


def test_interval_with_equal_ends():
    closed = query('Binomial', BINOM, 'between', 3, query_upper=3, lower_op='<=', upper_op='<=')
    assert closed == pytest.approx(RV.pmf(3), abs=1e-12)
    assert query('Binomial', BINOM, 'between', 3, query_upper=3, lower_op='<', upper_op='<=') == 0


def test_interval_rejects_lower_above_upper():
    with pytest.raises(ValueError, match='lower value'):
        query('Normal', {'mu': 0, 'sigma': 1}, 'between', 2, query_upper=1, lower_op='<', upper_op='<')


def test_unknown_operator_is_an_error():
    with pytest.raises(ValueError):
        query('Normal', {'mu': 0, 'sigma': 1}, '!=', 0)


def test_api_interval_query():
    response = client.post('/api/probability/compute', json={
        'distName': 'Binomial', 'params': BINOM, 'queryOp': 'between', 'queryK': 2,
        'queryUpper': 5, 'lowerOp': '<', 'upperOp': '<',
    })
    assert response.status_code == 200
    assert response.json()['queryResult'] == pytest.approx(RV.pmf(3) + RV.pmf(4), abs=1e-12)


def test_api_rejects_reversed_interval():
    response = client.post('/api/probability/compute', json={
        'distName': 'Normal', 'params': {'mu': 0, 'sigma': 1}, 'queryOp': 'between', 'queryK': 2,
        'queryUpper': 1, 'lowerOp': '<', 'upperOp': '<',
    })
    assert response.status_code == 400
