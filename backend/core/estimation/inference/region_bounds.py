# core/estimation/inference/region_bounds.py
# Plot window for the likelihood confidence regions, chosen automatically.
#
# The outermost region {(μ, σ) : -2 log R(μ, σ) ≤ c}, with c = χ²₂(p_max), projects onto each axis
# as the profile-likelihood interval at the same cutoff c. For the normal model both have a
# closed form or a one-dimensional root (R from likelihood.relative_log_likelihood, σ̂ with ddof=0):
#   μ:  max over σ is at σ² = σ̂² + (μ - x̄)²   ⇒  -2 log R = n log(1 + d²/σ̂²)  ⇒  d = σ̂ √(e^{c/n} − 1)
#   σ:  max over μ is at μ = x̄, t = σ̂²/σ²     ⇒  -2 log R = n (t − 1 − log t) = c, one root each side of t = 1
# So the window contains every requested contour exactly; a margin is added around it.

import numpy as np
from scipy.optimize import brentq
from scipy.stats import chi2

MARGIN = 0.1  # fraction of each axis' width added on both sides


def region_bounds(*, data, probs):
    """(μ_low, μ_high), (σ_low, σ_high) of the largest requested region, without margin."""
    data = np.asarray(data, dtype=float)
    n = len(data)
    mu_hat = np.mean(data)
    sigma_hat = np.std(data, ddof=0)
    c = chi2.ppf(max(probs), 2)

    d = sigma_hat * np.sqrt(np.expm1(c / n))

    f = lambda t: n * (t - 1 - np.log(t)) - c
    t_low = brentq(f, np.exp(-c / n - 1), 1.0)  # f > 0 at the lower end since t − 1 > −1
    t_high = brentq(f, 1.0, 2.0 + 2.0 * c / n)  # for t ≥ 2, log t ≤ t/2, so f ≥ 0 there

    return (mu_hat - d, mu_hat + d), (sigma_hat / np.sqrt(t_high), sigma_hat / np.sqrt(t_low))


def region_padding(*, data, probs, mean_ci, sigma_ci, include_box):
    """
    eps_mu, eps_sigma for compute_confidence_regions_data: the grid covers the largest region (and
    the marginal CI box when it is drawn) plus a MARGIN on every side, with σ kept above zero.
    """
    (mu_lo, mu_hi), (s_lo, s_hi) = region_bounds(data=data, probs=probs)
    if include_box:
        mu_lo, mu_hi = min(mu_lo, mean_ci[0]), max(mu_hi, mean_ci[1])
        s_lo, s_hi = min(s_lo, sigma_ci[0]), max(s_hi, sigma_ci[1])

    mu_pad = MARGIN * (mu_hi - mu_lo)
    s_pad = MARGIN * (s_hi - s_lo)
    grid_mu = (mu_lo - mu_pad, mu_hi + mu_pad)
    grid_s = (max(s_lo - s_pad, 0.5 * s_lo), s_hi + s_pad)

    eps_mu = [float(mean_ci[0] - grid_mu[0]), float(grid_mu[1] - mean_ci[1])]
    eps_sigma = [float(sigma_ci[0] - grid_s[0]), float(grid_s[1] - sigma_ci[1])]
    return eps_mu, eps_sigma
