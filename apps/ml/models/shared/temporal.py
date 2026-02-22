from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.preprocessing import RobustScaler


class TemporalFeatureEngineering:
    NEGLECT_TO_FUNDING_SENSITIVITY: float = -0.18
    NEGLECT_TO_CBPF_SENSITIVITY: float = 0.06
    NEGLECT_TO_PIN_SENSITIVITY: float = 0.04
    TEMPORAL_FEATURE_COLS: list[str] = ["fgi_score", "cmi_score", "cbpf_share", "pin_pct_pop", "log_req_usd", "log_cbpf", "funded_pct", "cbpf_per_pin", "req_per_pin", "bbr_median_z", "bbr_max_z", "n_cluster_anomalies", "n_clusters", "fgi_score_lag1", "fgi_score_lag2", "funded_pct_lag1", "cbpf_share_lag1", "pin_pct_pop_lag1", "log_cbpf_lag1", "delta_fgi_1yr", "delta_funded_pct_1yr", "delta_pin_pct_1yr", "trend_fgi_2yr"]

    @classmethod
    def compute_lag_features(cls, gold_multiyear_with_neglect):
        df = gold_multiyear_with_neglect.copy().sort_values(["country_iso3", "year"])
        lag_definitions: list[tuple[str, int]] = [("fgi_score", 1), ("fgi_score", 2), ("funded_pct", 1), ("cbpf_share", 1), ("pin_pct_pop", 1), ("log_cbpf", 1)]
        for col, lag in lag_definitions:
            new_col = f"{col}_lag{lag}"
            df[new_col] = df.groupby("country_iso3")[col].shift(lag)
        df["fgi_score_lag1"] = df["fgi_score_lag1"].fillna(df["fgi_score"])
        df["fgi_score_lag2"] = df["fgi_score_lag2"].fillna(df["fgi_score_lag1"])
        df["funded_pct_lag1"] = df["funded_pct_lag1"].fillna(df["funded_pct"])
        df["cbpf_share_lag1"] = df["cbpf_share_lag1"].fillna(df["cbpf_share"])
        df["pin_pct_pop_lag1"] = df["pin_pct_pop_lag1"].fillna(df["pin_pct_pop"])
        df["log_cbpf_lag1"] = df["log_cbpf_lag1"].fillna(df["log_cbpf"])
        df["delta_fgi_1yr"] = df["fgi_score"] - df["fgi_score_lag1"]
        df["delta_funded_pct_1yr"] = df["funded_pct"] - df["funded_pct_lag1"]
        df["delta_pin_pct_1yr"] = df["pin_pct_pop"] - df["pin_pct_pop_lag1"]
        df["trend_fgi_2yr"] = (df["fgi_score"] - df["fgi_score_lag2"]) / 2.0
        return df

    @classmethod
    def fit_temporal_scaler(cls, feat_all_temporal):
        X = feat_all_temporal[cls.TEMPORAL_FEATURE_COLS].fillna(0).values
        scaler = RobustScaler()
        X_scaled = scaler.fit_transform(X)
        return scaler, X_scaled

    @classmethod
    def build_temporal_forecast_dataset(cls, feat_all_temporal, horizon_years, min_year=2015):
        df = feat_all_temporal[feat_all_temporal["year"] >= min_year].copy()
        targets = feat_all_temporal[["country_iso3", "year", "neglect_score"]].rename(columns={"year": "year_target", "neglect_score": "future_neglect"}).copy()
        targets["year"] = targets["year_target"] - horizon_years
        paired = df.merge(targets[["country_iso3", "year", "future_neglect"]], on=["country_iso3", "year"], how="inner")
        X = paired[cls.TEMPORAL_FEATURE_COLS].fillna(0).values
        y = paired["future_neglect"].values
        meta = paired[["country_iso3", "year"]].reset_index(drop=True)
        return X, y, meta

    @classmethod
    def enrich_snapshot_with_lags(cls, feat_snapshot: pd.DataFrame, feat_all_temporal: pd.DataFrame) -> pd.DataFrame:
        latest_multi_year = feat_all_temporal["year"].max()
        lag1_cols = ["country_iso3", "fgi_score", "funded_pct", "cbpf_share", "pin_pct_pop", "log_cbpf"]
        lag2_cols = ["country_iso3", "fgi_score"]
        lag1_df = feat_all_temporal[feat_all_temporal["year"] == latest_multi_year][lag1_cols].rename(columns={"fgi_score": "fgi_score_lag1", "funded_pct": "funded_pct_lag1", "cbpf_share": "cbpf_share_lag1", "pin_pct_pop": "pin_pct_pop_lag1", "log_cbpf": "log_cbpf_lag1"})
        lag2_df = feat_all_temporal[feat_all_temporal["year"] == latest_multi_year - 1][lag2_cols].rename(columns={"fgi_score": "fgi_score_lag2"})
        enriched = feat_snapshot.copy().merge(lag1_df, on="country_iso3", how="left").merge(lag2_df, on="country_iso3", how="left")
        for src, dst in [("fgi_score", "fgi_score_lag1"), ("funded_pct", "funded_pct_lag1"), ("cbpf_share", "cbpf_share_lag1"), ("pin_pct_pop", "pin_pct_pop_lag1"), ("log_cbpf", "log_cbpf_lag1")]: enriched[dst] = enriched[dst].fillna(enriched[src].fillna(0))
        enriched["fgi_score_lag2"] = enriched["fgi_score_lag2"].fillna(enriched["fgi_score_lag1"])
        enriched["delta_fgi_1yr"] = enriched["fgi_score"] - enriched["fgi_score_lag1"]
        enriched["delta_funded_pct_1yr"] = enriched["funded_pct"] - enriched["funded_pct_lag1"]
        enriched["delta_pin_pct_1yr"] = enriched["pin_pct_pop"] - enriched["pin_pct_pop_lag1"]
        enriched["trend_fgi_2yr"] = (enriched["fgi_score"] - enriched["fgi_score_lag2"]) / 2.0
        return enriched


class TemporalProjector:
    DEFAULT_BASE_KEYS: list[str] = ["LightGBM", "RandomForest", "XGBoost", "GBR"]
    STEP_LABELS: list[str] = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8"]

    def __init__(self, models_1yr: dict, models_2yr: dict, cv_1yr: dict, cv_2yr: dict, scaler: RobustScaler, base_keys: list[str] | None = None) -> None:
        self._models: dict[str, dict] = {"1yr": models_1yr, "2yr": models_2yr}
        self._cv: dict[str, dict] = {"1yr": cv_1yr, "2yr": cv_2yr}
        self._scaler = scaler
        self._base_keys = base_keys or self.DEFAULT_BASE_KEYS

    @staticmethod
    def _horizon_for_step(step_label: str, step_years: float) -> str:
        idx = int(step_label[1:])
        cumulative_years = idx * step_years
        return "1yr" if cumulative_years <= 1.0 else "2yr"

    def _predict_from_state(self, state: dict[str, float], horizon_key: str) -> dict[str, float]:
        x_vec = np.array([state.get(c, 0.0) for c in TemporalFeatureEngineering.TEMPORAL_FEATURE_COLS], dtype=np.float64).reshape(1, -1)
        x_scaled = self._scaler.transform(x_vec)
        preds: dict[str, float] = {}
        for name, mdl in self._models[horizon_key].items(): preds[name] = float(np.clip(mdl.predict(x_scaled)[0], 0.0, 100.0))
        h_cv = self._cv[horizon_key]
        weights = {k: max(h_cv.get(k, {}).get("mean", 0.0), 0.0) for k in self._base_keys}
        total_w = max(sum(weights.values()), 1e-9)
        ensemble = sum(weights[k] * preds.get(k, 0.0) for k in self._base_keys) / total_w
        preds["Ensemble"] = float(np.clip(ensemble, 0.0, 100.0))
        return preds

    @staticmethod
    def _apply_feedback(state: dict[str, float], predicted_neglect: float, step_years: float) -> dict[str, float]:
        s: dict[str, float] = dict(state)
        prev_fgi = float(s.get("fgi_score", 50.0))
        prev_funded = float(s.get("funded_pct", 50.0))
        prev_cbpf = float(s.get("cbpf_share", 0.0))
        prev_pin = float(s.get("pin_pct_pop", 0.0))
        prev_log_cbpf = float(s.get("log_cbpf", 0.0))
        prev_fgi_lag1 = float(s.get("fgi_score_lag1", prev_fgi))
        pressure = float(np.clip(predicted_neglect / 100.0, 0.0, 1.0))
        delta_funded = TemporalFeatureEngineering.NEGLECT_TO_FUNDING_SENSITIVITY * pressure * step_years * 100.0
        s["funded_pct"] = float(np.clip(prev_funded + delta_funded, 0.0, 100.0))
        implied_fgi = (1.0 - s["funded_pct"] / 100.0) * 100.0
        s["fgi_score"] = float(np.clip(0.60 * implied_fgi + 0.40 * prev_fgi, 0.0, 100.0))
        delta_cbpf = TemporalFeatureEngineering.NEGLECT_TO_CBPF_SENSITIVITY * pressure * step_years
        s["cbpf_share"] = float(np.clip(prev_cbpf + delta_cbpf, 0.0, 1.0))
        s["cmi_score"] = float(np.clip(s["fgi_score"] * (1.0 - s["cbpf_share"]), 0.0, 100.0))
        delta_pin = TemporalFeatureEngineering.NEGLECT_TO_PIN_SENSITIVITY * pressure * step_years * 100.0
        s["pin_pct_pop"] = float(np.clip(prev_pin + delta_pin, 0.0, 100.0))
        cbpf_share_increase = max(s["cbpf_share"] - prev_cbpf, 0.0)
        s["log_cbpf"] = float(np.clip(prev_log_cbpf + cbpf_share_increase * 1.5, 0.0, 25.0))
        s["fgi_score_lag2"] = prev_fgi_lag1
        s["fgi_score_lag1"] = prev_fgi
        s["funded_pct_lag1"] = prev_funded
        s["cbpf_share_lag1"] = prev_cbpf
        s["pin_pct_pop_lag1"] = prev_pin
        s["log_cbpf_lag1"] = prev_log_cbpf
        s["delta_fgi_1yr"] = s["fgi_score"] - s["fgi_score_lag1"]
        s["delta_funded_pct_1yr"] = s["funded_pct"] - s["funded_pct_lag1"]
        s["delta_pin_pct_1yr"] = s["pin_pct_pop"] - s["pin_pct_pop_lag1"]
        s["trend_fgi_2yr"] = (s["fgi_score"] - s["fgi_score_lag2"]) / 2.0
        return s

    def project(self, initial_state: dict, n_steps: int = 8, step_years: float = 0.25) -> list[dict]:
        labels = [f"q{i + 1}" for i in range(n_steps)]
        state: dict[str, float] = {k: float(initial_state.get(k, 0.0)) for k in TemporalFeatureEngineering.TEMPORAL_FEATURE_COLS}
        results: list[dict] = []
        for label in labels:
            horizon_key = self._horizon_for_step(label, step_years)
            idx = int(label[1:])
            months_ahead = int(round(idx * step_years * 12))
            preds = self._predict_from_state(state, horizon_key)
            results.append({"step": label, "monthsAhead": months_ahead, "horizonModel": horizon_key, "scores": {"neglectScore": round(preds.get("LightGBM", 0.0), 2), "ensembleScore": round(preds["Ensemble"], 2), "lgbm": round(preds.get("LightGBM", 0.0), 2), "rf": round(preds.get("RandomForest", 0.0), 2), "xgb": round(preds.get("XGBoost", 0.0), 2), "gbr": round(preds.get("GBR", 0.0), 2)}, "stateSnapshot": {k: round(state[k], 4) for k in TemporalFeatureEngineering.TEMPORAL_FEATURE_COLS}})
            state = self._apply_feedback(state, preds["Ensemble"], step_years)
        return results

    def project_batch(self, feat_df: pd.DataFrame, n_steps: int = 8, step_years: float = 0.25) -> dict[str, list[dict]]:
        results: dict[str, list[dict]] = {}
        for _, row in feat_df.iterrows():
            iso3 = str(row.get("country_iso3", ""))
            results[iso3] = self.project(row.to_dict(), n_steps=n_steps, step_years=step_years)
        return results


NEGLECT_TO_FUNDING_SENSITIVITY = TemporalFeatureEngineering.NEGLECT_TO_FUNDING_SENSITIVITY
NEGLECT_TO_CBPF_SENSITIVITY = TemporalFeatureEngineering.NEGLECT_TO_CBPF_SENSITIVITY
NEGLECT_TO_PIN_SENSITIVITY = TemporalFeatureEngineering.NEGLECT_TO_PIN_SENSITIVITY
TEMPORAL_FEATURE_COLS = TemporalFeatureEngineering.TEMPORAL_FEATURE_COLS
