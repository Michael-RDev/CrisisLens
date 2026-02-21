from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.preprocessing import RobustScaler

# ── Future-step definitions (must stay in sync with lib/simulation.ts) ────────
FUTURE_STEPS: list[tuple[str, float]] = [
    ("6mo",  0.5),
    ("12mo", 1.0),
    ("18mo", 1.5),
    ("24mo", 2.0),
]

# Trained forecast horizons (years of look-ahead used during model training)
FORECAST_HORIZONS: list[tuple[str, int]] = [
    ("1yr", 1),
    ("2yr", 2),
]

# Map each FUTURE_STEP label to the closest trained forecast horizon
STEP_TO_HORIZON: dict[str, str] = {
    "6mo":  "1yr",
    "12mo": "1yr",
    "18mo": "2yr",
    "24mo": "2yr",
}

FEATURE_COLS: list[str] = [
    "fgi_score",
    "cmi_score",
    "cbpf_share",
    "pin_pct_pop",
    "log_req_usd",
    "log_cbpf",
    "funded_pct",
    "cbpf_per_pin",
    "req_per_pin",
    "bbr_median_z",
    "bbr_max_z",
    "n_cluster_anomalies",
    "n_clusters",
]


def _norm01(s):
    lo, hi = s.min(), s.max()
    return (s - lo) / (hi - lo + 1e-9)


def severity_band(fgi):
    if fgi >= 86: return "CRITICAL"
    if fgi >= 61: return "HIGH"
    if fgi >= 31: return "MEDIUM"
    return "LOW"


def build_feature_matrix(gold_fgi,gold_efficiency, pop_total):

    bbr_country = (
        gold_efficiency.groupby("country_iso3").agg(
            bbr_median_z        = ("bbr_z_score", "median"),
            bbr_max_z           = ("bbr_z_score", "max"),
            n_cluster_anomalies = ("bbr_anomaly",  "sum"),
            n_clusters          = ("cluster_name", "nunique"),
        ).reset_index()
    )

    feat = (
        gold_fgi[[
            "country_iso3", "year", "plan_name",
            "req_usd", "funded_usd", "cbpf_total_usd",
            "fgi_score", "cmi_score", "cbpf_share", "pin",
        ]]
        .merge(pop_total, on="country_iso3", how="left")
        .merge(bbr_country, on="country_iso3", how="left")
    )

    for col in ["population", "bbr_median_z", "bbr_max_z", "n_cluster_anomalies", "n_clusters"]:
        feat[col] = feat[col].fillna(0)
    feat["pin"]            = feat["pin"].fillna(0)
    feat["cbpf_total_usd"] = feat["cbpf_total_usd"].fillna(0)

    feat["pin_pct_pop"]  = (feat["pin"] / feat["population"].replace(0, np.nan) * 100).fillna(0).clip(0, 100)
    feat["log_req_usd"]  = np.log1p(feat["req_usd"])
    feat["log_cbpf"]     = np.log1p(feat["cbpf_total_usd"])
    feat["funded_pct"]   = (feat["funded_usd"] / feat["req_usd"].replace(0, np.nan) * 100).fillna(0).clip(0, 100)
    feat["cbpf_per_pin"] = (feat["cbpf_total_usd"] / feat["pin"].replace(0, np.nan)).fillna(0)
    feat["req_per_pin"]  = (feat["req_usd"]        / feat["pin"].replace(0, np.nan)).fillna(0)

    feat["neglect_score"] = (
        0.35 * _norm01(feat["fgi_score"])       +
        0.25 * _norm01(feat["cmi_score"])       +
        0.20 * _norm01(feat["pin_pct_pop"])     +
        0.10 * (1 - _norm01(feat["log_cbpf"])) +
        0.10 * _norm01(feat["bbr_max_z"].clip(0))
    ) * 100

    feat["anomaly_severity"] = feat["fgi_score"].apply(severity_band)

    X = feat[FEATURE_COLS].fillna(0).values
    y = feat["neglect_score"].values
    return feat, X, y


def fit_scaler(X):
    scaler   = RobustScaler()
    X_scaled = scaler.fit_transform(X)
    return scaler, X_scaled


# ── Multi-year / forecast helpers ─────────────────────────────────────────────

def build_feature_matrix_all_years(gold_multiyear: "pd.DataFrame"):
    """
    Build a feature matrix from the multi-year gold table returned by
    ``build_gold_multiyear()``.  Each row is one (country, year) observation.

    Returns (feat, X, y) where y = same-year neglect_score.
    Normalisation uses the global distribution across all years so that the
    neglect_score scale is consistent with the single-year scoring path.
    """
    import pandas as pd  # local import avoids circular at module level

    feat = gold_multiyear.copy()
    for col in ["cbpf_per_pin", "req_per_pin"]:
        if col not in feat.columns:
            feat[col] = 0.0
        feat[col] = feat[col].fillna(0)

    feat["neglect_score"] = (
        0.35 * _norm01(feat["fgi_score"])       +
        0.25 * _norm01(feat["cmi_score"])       +
        0.20 * _norm01(feat["pin_pct_pop"])     +
        0.10 * (1 - _norm01(feat["log_cbpf"])) +
        0.10 * _norm01(feat["bbr_max_z"].clip(0))
    ) * 100

    X = feat[FEATURE_COLS].fillna(0).values
    y = feat["neglect_score"].values
    return feat, X, y


def build_forecast_dataset(
    feat_all: "pd.DataFrame",
    horizon_years: int,
    min_year: int = 2015,
):
    """
    Create a supervised forecast dataset:
        X  = feature vector at year T
        y  = neglect_score at year T + horizon_years

    Only rows with year >= min_year are used as base observations so that
    sparse pre-2015 data does not pollute the training signal.  Target
    values are drawn from the full feat_all table (including post-2015 rows
    that are used only as targets, not as features).

    Returns (X, y, meta) where meta is a DataFrame with country_iso3 / year.
    """
    df = feat_all[feat_all["year"] >= min_year].copy()

    # Build a target lookup: neglect_score at year T+horizon
    targets = (
        feat_all[["country_iso3", "year", "neglect_score"]]
        .rename(columns={"year": "year_target", "neglect_score": "future_neglect"})
        .copy()
    )
    targets["year"] = targets["year_target"] - horizon_years

    paired = df.merge(
        targets[["country_iso3", "year", "future_neglect"]],
        on=["country_iso3", "year"],
        how="inner",
    )

    X    = paired[FEATURE_COLS].fillna(0).values
    y    = paired["future_neglect"].values
    meta = paired[["country_iso3", "year"]].reset_index(drop=True)
    return X, y, meta
