import pandas as pd
import json

from api.schemas.inference import InferenceParams, ConfidenceRegionsParams

from core.estimation.inference.ci import (
    ci_mean_analytic,
    ci_median_analytic,
    ci_deviation_analytic,
    ci_mean_bootstrap,
    ci_median_bootstrap,
    ci_deviation_bootstrap,
)

from core.estimation.inference.pi import (
    pi_mean,
    pi_median,
    pi_iqr,
    pi_bootstrap,
)

from core.estimation.inference.estimator_options import available_estimators
from core.estimation.inference.confidence_regions import compute_confidence_regions_data
from core.estimation.inference.estimators import estimate_mean, estimate_median, estimate_sigma
from core.estimation.descriptive import compute_histogram

def select_distribution(mean_estimator: str, sigma_estimator: str) -> str:
    if mean_estimator == "Sample Mean" and sigma_estimator == "Deviation (1 ddof)":
        return "t"
    return "norm"

def get_estimators(data: pd.Series):
    mean_choices, deviation_choices = available_estimators(data)
    return {
        "mean_estimators": mean_choices,
        "deviation_estimators": deviation_choices,
    }

def calculate_intervals(data: pd.Series, params: InferenceParams, weights: pd.Series = None):
    n = len(data)
    dist = select_distribution(params.mean_estimator, params.sigma_estimator)
    
    # Parse winsor limits if string
    winsor_limits = None
    if params.winsor_limits:
        try:
            parts = [float(p.strip()) for p in params.winsor_limits.split(",") if p.strip()]
            if len(parts) == 2:
                winsor_limits = (parts[0], parts[1])
        except Exception:
            pass

    B = params.bootstrap_samples
    # "Deviation (1 ddof)" -> "s (ddof=1)"; the rest carry their own name
    sigma_name = (
        "s (ddof=1)" if params.sigma_estimator == "Deviation (1 ddof)"
        else params.sigma_estimator.split(" (")[0]
    )
    boot_method = f"Bootstrap (B={B})"

    # CI computation. Each method is computed independently and gets its own row, so a bootstrap
    # row sits next to the normal-theory row instead of replacing it. The returned mean_ci /
    # median_ci / sigma_ci stay the "primary" interval (bootstrap when requested, else
    # normal-theory): confidence regions and the Graphical tab consume those.
    # A normal-theory interval is only computed when a row or the primary interval needs it.
    mean_normal = mean_boot = median_normal = median_boot = sigma_normal = sigma_boot = None

    if params.ci_mean_normal or not params.bootstrap_mean:
        mean_normal = ci_mean_analytic(
            data=data, estimator=params.mean_estimator, alpha=params.alpha, dist=dist,
            sigma_estimator=params.sigma_estimator, trim_param=params.trim_param,
            winsor_limits=winsor_limits, weights=weights
        )
    if params.bootstrap_mean:
        mean_boot = ci_mean_bootstrap(
            data=data, estimator=params.mean_estimator, alpha=params.alpha,
            B=B, trim_param=params.trim_param,
            winsor_limits=winsor_limits, weights=weights
        )

    if params.ci_median_normal or not params.bootstrap_median:
        median_normal = ci_median_analytic(
            data=data, alpha=params.alpha, estimator=params.median_estimator, sigma_estimator=params.sigma_estimator
        )
    if params.bootstrap_median:
        median_boot = ci_median_bootstrap(
            data=data, alpha=params.alpha, estimator=params.median_estimator, B=B
        )

    if params.ci_deviation_normal or not params.bootstrap_deviation:
        sigma_normal = ci_deviation_analytic(
            data=data, alpha=params.alpha, estimator=params.sigma_estimator
        )
    if params.bootstrap_deviation:
        sigma_boot = ci_deviation_bootstrap(
            data=data, alpha=params.alpha, estimator=params.sigma_estimator, B=B
        )

    mean_ci = mean_boot if mean_boot is not None else mean_normal
    median_ci = median_boot if median_boot is not None else median_normal
    sigma_ci = sigma_boot if sigma_boot is not None else sigma_normal

    mean_method = f"t (df={n - 1})" if dist == "t" else f"Normal (z, {sigma_name})"
    median_method = f"Normal (asymptotic, {sigma_name})"
    if params.sigma_estimator == "Deviation (1 ddof)":
        dev_method = "Chi-square (s, ddof=1)"
    else:
        dev_method = f"Normal (asymptotic, {sigma_name})"

    ci_rows = []
    if params.ci_mean_normal and mean_normal is not None:
        ci_rows.append(["Confidence", "Mean", *mean_normal, mean_method])
    if mean_boot is not None:
        ci_rows.append(["Confidence", "Mean", *mean_boot, boot_method])
    if params.ci_median_normal and median_normal is not None:
        ci_rows.append(["Confidence", "Median", *median_normal, median_method])
    if median_boot is not None:
        ci_rows.append(["Confidence", "Median", *median_boot, boot_method])
    if params.ci_deviation_normal and sigma_normal is not None:
        ci_rows.append(["Confidence", "Deviation", *sigma_normal, dev_method])
    if sigma_boot is not None:
        ci_rows.append(["Confidence", "Deviation", *sigma_boot, boot_method])

    # PI computation: one row per requested method.
    pi_rows = []
    if params.pi_mean_normal:
        mean_pi = pi_mean(
            data=data, alpha=params.alpha, estimator=params.mean_estimator, dist=dist,
            sigma_estimator=params.sigma_estimator, trim_param=params.trim_param,
            winsor_limits=winsor_limits, weights=weights
        )
        pi_rows.append(["Prediction", "Mean", *mean_pi, mean_method])

    if params.pi_median_normal:
        median_pi = pi_median(
            data=data, alpha=params.alpha, estimator=params.median_estimator,
            sigma_estimator=params.sigma_estimator
        )
        pi_rows.append(["Prediction", "Median", *median_pi, f"Normal (asymptotic, {sigma_name})"])

    if params.pi_iqr_normal:
        iqr_pi = pi_iqr(data=data, alpha=params.alpha)
        pi_rows.append(["Prediction", "IQR", *iqr_pi, "IQR (normal-scaled)"])

    if params.bootstrap_pi:
        boot_pi = pi_bootstrap(data=data, alpha=params.alpha, B=B)
        pi_rows.append(["Prediction", "Bootstrap", *boot_pi, f"Bootstrap quantiles (B={B})"])

    columns = ["Interval Type", "Statistic", "Lower", "Upper", "Method"]
    ci_table = pd.DataFrame(ci_rows, columns=columns)
    pi_table = pd.DataFrame(pi_rows, columns=columns)

    context = {
        "n": int(n),
        "point_estimates": {
            "mean": float(estimate_mean(data, "Sample Mean")),
            "median": float(estimate_median(data, "Sample Median")),
            "deviation": float(estimate_sigma(data, params.sigma_estimator)),
        },
        "histogram": compute_histogram(data),
    }

    return ci_table, pi_table, mean_ci, sigma_ci, median_ci, context

# The CI and PI endpoints each need only their own half. Without this, a bootstrap request would
# also resample for the intervals it never returns, roughly doubling the wait.
_WITHOUT_PI = dict(pi_mean_normal=False, pi_median_normal=False, pi_iqr_normal=False, bootstrap_pi=False)
_WITHOUT_CI_BOOTSTRAP = dict(bootstrap_mean=False, bootstrap_median=False, bootstrap_deviation=False)


def calculate_ci(data: pd.Series, params: InferenceParams, weights: pd.Series = None):
    ci_table, _, _, _, _, context = calculate_intervals(data, params.model_copy(update=_WITHOUT_PI), weights)
    return ci_table, context


def calculate_pi(data: pd.Series, params: InferenceParams, weights: pd.Series = None):
    _, pi_table, _, _, _, context = calculate_intervals(
        data, params.model_copy(update=_WITHOUT_CI_BOOTSTRAP), weights
    )
    return pi_table, context


# Confidence regions always use the sample mean and the standard deviation with one degree of
# freedom, with normal-theory marginal intervals, whatever else the request carries.
_REGION_FIXED = dict(
    mean_estimator="Sample Mean",
    sigma_estimator="Deviation (1 ddof)",
    bootstrap_mean=False,
    bootstrap_median=False,
    bootstrap_deviation=False,
    bootstrap_pi=False,
    trim_param=None,
    winsor_limits=None,
    ci_mean_normal=True,
    ci_median_normal=True,
    ci_deviation_normal=True,
)


def calculate_regions(data: pd.Series, params: ConfidenceRegionsParams, weights: pd.Series = None):
    fixed = params.model_copy(update=_REGION_FIXED)
    ci_table, _, mean_ci, sigma_ci, _, _ = calculate_intervals(data, fixed, None)

    grid = compute_confidence_regions_data(
        data=data,
        mean_ci=mean_ci,
        sigma_ci=sigma_ci,
        probs=params.probs,
        eps_mu=params.eps_mu,
        eps_sigma=params.eps_sigma,
    )
    grid["mu_ci"] = [float(x) for x in mean_ci]
    grid["sigma_ci"] = [float(x) for x in sigma_ci]
    grid["table"] = ci_table.to_json(orient="records") if params.add_ci_box else None
    return grid
