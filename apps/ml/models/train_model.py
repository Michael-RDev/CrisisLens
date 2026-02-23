from __future__ import annotations

import json
import logging
import pathlib
import sys
import warnings
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Literal, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.base import RegressorMixin
from sklearn.model_selection import GroupKFold, KFold,TimeSeriesSplit, cross_val_score

from sklearn.neighbors import NearestNeighbors
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
warnings.filterwarnings("ignore")
warnings.filterwarnings("ignore", category=UserWarning, module="lightgbm")
warnings.filterwarnings("ignore", category=FutureWarning, module="sklearn")
warnings.filterwarnings("ignore", category=FutureWarning, module="pandas")


_HERE = pathlib.Path(__file__).parent.resolve()
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

from shared.data_loader import (
    load_bronze,
    build_silver,
    build_gold,
    build_gold_multiyear,
)
from shared.features import ( 
    build_feature_matrix,
    FEATURE_COLS,
    build_feature_matrix_all_years,
    build_forecast_dataset,
    FUTURE_STEPS,
    FORECAST_HORIZONS,
    STEP_TO_HORIZON,
)
import lgbm.train as lgbm_def  
import rf.train as rf_def  
import xgb.train as xgb_def  
import gbr.train as gbr_def  
import stack.train as stack_def  
from ensemble.blend import (  
    weighted_average_ensemble,
    compute_agreement,
)


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
LOG = logging.getLogger("train")



CVStrategy = Literal["group_country", "time", "kfold"]

@dataclass(frozen=True)
class TrainConfig:
    data_dir: Path = Path("../../../data/")
    out_dir: Path = Path("models/artifacts")
    model_dir: Path = Path("models")
    random_state: int = 42


    cv_splits: int = 5
    cv_strategy: CVStrategy = "group_country" 
    scoring: str = "r2"

    # Forecasting
    forecast_cv_strategy: CVStrategy = "time" 
    forecast_time_splits: int = 5

    # KNN peers
    peer_k: int = 6
    peer_metric: str = "cosine"

    # Clipping
    clip_min: float = 0.0
    clip_max: float = 100.0

    # If you want 6mo separate from 12mo but only have 1yr model:
    # interpolate between current and 12mo prediction (approx).
    interpolate_short_steps: bool = True

    # Threshold above which a country is flagged as neglected (ensemble score >= value).
    neglect_flag_threshold: float = 65.0


def clip_scores(x: np.ndarray, lo: float, hi: float) -> np.ndarray:
    return np.clip(x.astype(float), lo, hi)

def safe_float(x: Any, ndigits: int = 2) -> float:
    try:
        return round(float(x), ndigits)
    except Exception:
        return float("nan")

def safe_int(x: Any, default: int = 0) -> int:
    try:
        if pd.isna(x):
            return default
        return int(x)
    except Exception:
        return default

def ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)

def build_models() -> Dict[str, RegressorMixin]:
    return {
        "LightGBM":     lgbm_def.build_model(),
        "RandomForest": rf_def.build_model(),
        "XGBoost":      xgb_def.build_model(),
        "GBR":          gbr_def.build_model(),
        "Stacking":     stack_def.build_model(),
    }

BASE_KEYS: List[str] = ["LightGBM", "RandomForest", "XGBoost", "GBR"]


@dataclass
class DataStep:
    cfg: TrainConfig

    def run(self) -> Tuple[Dict[str, pd.DataFrame], Dict[str, pd.DataFrame], Dict[str, pd.DataFrame]]:
        LOG.info("Loading data")
        bronze = load_bronze(self.cfg.data_dir)
        silver = build_silver(bronze)
        gold = build_gold(bronze, silver)

        try:
            LOG.info(
                "bronze: fts_req=%s  fts_cluster=%s",
                getattr(bronze.get("fts_req"), "shape", None),
                getattr(bronze.get("fts_cluster"), "shape", None),
            )
        except Exception:
            pass

        return bronze, silver, gold


@dataclass
class FeatureStep:
    cfg: TrainConfig

    def build_current(self, bronze: Dict[str, pd.DataFrame], gold: Dict[str, pd.DataFrame]) -> Tuple[pd.DataFrame, np.ndarray, np.ndarray]:
        feat, X, y = build_feature_matrix(
            gold["gold_fgi"],
            gold["gold_efficiency"],
            bronze["pop_total"],
        )
        return feat, X, y

    def build_multiyear(self, bronze: Dict[str, pd.DataFrame]) -> Tuple[pd.DataFrame, np.ndarray]:
        LOG.info("Building multi-year historical dataset for forecast model training")
        gold_multiyear = build_gold_multiyear(bronze)
        feat_all, X_all, _ = build_feature_matrix_all_years(gold_multiyear)
        return feat_all, X_all


@dataclass
class CVStep:
    cfg: TrainConfig

    def _pipeline(self, model: RegressorMixin) -> Pipeline:
        return Pipeline(
            steps=[
                ("scaler", StandardScaler(with_mean=True, with_std=True)),
                ("model", model),
            ]
        )

    def _get_splitter(
        self,
        X: np.ndarray,
        meta: Optional[pd.DataFrame],
        strategy: CVStrategy,
        n_splits: int,
        time_splits: Optional[int] = None,
    ):
        if strategy == "group_country":
            if meta is None or "country_iso3" not in meta.columns:
                return KFold(n_splits=n_splits, shuffle=True, random_state=self.cfg.random_state), None
            groups = meta["country_iso3"].to_numpy()
            n_groups = len(np.unique(groups))
            n_splits_safe = min(n_splits, n_groups)
            return GroupKFold(n_splits=n_splits_safe), groups

        if strategy == "time":
            if meta is None:
                return KFold(n_splits=n_splits, shuffle=True, random_state=self.cfg.random_state), None

            time_col = None
            for c in ["year", "t_year", "source_year", "year_t"]:
                if c in meta.columns:
                    time_col = c
                    break

            if time_col is None:
                if "country_iso3" in meta.columns:
                    groups = meta["country_iso3"].to_numpy()
                    return GroupKFold(n_splits=n_splits), groups
                return KFold(n_splits=n_splits, shuffle=True, random_state=self.cfg.random_state), None

        
            order = np.argsort(meta[time_col].to_numpy())
            X_ordered = X[order]  # only used to create correct fold sizes
            splitter = TimeSeriesSplit(n_splits=(time_splits or n_splits))
            return splitter, ("__ORDER__", order, X_ordered.shape[0])

        return KFold(n_splits=n_splits, shuffle=True, random_state=self.cfg.random_state), None

    def _cv_scores(
        self,
        model: RegressorMixin,
        X: np.ndarray,
        y: np.ndarray,
        meta: Optional[pd.DataFrame],
        strategy: CVStrategy,
        n_splits: int,
        time_splits: Optional[int] = None,
    ) -> np.ndarray:
        pipe = self._pipeline(model)
        splitter, groups = self._get_splitter(X, meta, strategy, n_splits, time_splits=time_splits)

        if isinstance(groups, tuple) and groups and groups[0] == "__ORDER__":
            _, order, _n = groups
            Xo = X[order]
            yo = y[order]
            return cross_val_score(pipe, Xo, yo, cv=splitter, scoring=self.cfg.scoring)

        if groups is None:
            return cross_val_score(pipe, X, y, cv=splitter, scoring=self.cfg.scoring)

        return cross_val_score(pipe, X, y, cv=splitter, groups=groups, scoring=self.cfg.scoring)

    def fit_full(self, model: RegressorMixin, X: np.ndarray, y: np.ndarray) -> Pipeline:
        pipe = self._pipeline(model)
        pipe.fit(X, y)
        return pipe

    def cross_validate_models(
        self,
        models: Dict[str, RegressorMixin],
        X: np.ndarray,
        y: np.ndarray,
        meta: Optional[pd.DataFrame],
        strategy: CVStrategy,
        n_splits: int,
        time_splits: Optional[int] = None,
        header: str = "",
        indent: int = 2,
    ) -> Dict[str, Dict[str, float]]:
        if header:
            LOG.info(header)

        out: Dict[str, Dict[str, float]] = {}
        pad = " " * indent
        for name, mdl in models.items():
            scores = self._cv_scores(mdl, X, y, meta, strategy, n_splits, time_splits=time_splits)
            out[name] = {"mean": float(scores.mean()), "std": float(scores.std())}
            LOG.info("%s%-15s R2=%.4f ± %.4f", pad, name, scores.mean(), scores.std())
        return out


@dataclass
class ScoringModelStep:
    cfg: TrainConfig
    cv: CVStep

    def run(self, feat: pd.DataFrame, X: np.ndarray, y: np.ndarray) -> Tuple[pd.DataFrame, Dict[str, Pipeline], Dict[str, Dict[str, float]]]:
        models = build_models()

        # meta for safer CV (prefer grouping by country)
        meta = feat[["country_iso3"]].copy() if "country_iso3" in feat.columns else None

        cv_results = self.cv.cross_validate_models(
            models=models,
            X=X,
            y=y,
            meta=meta,
            strategy=self.cfg.cv_strategy,
            n_splits=self.cfg.cv_splits,
            header="Cross-validating current-year models",
        )

        LOG.info("Fitting current-year models on full dataset")
        fitted: Dict[str, Pipeline] = {name: self.cv.fit_full(mdl, X, y) for name, mdl in models.items()}

        # Predict on full set (for artifacts)
        preds = {name: clip_scores(pipe.predict(X), self.cfg.clip_min, self.cfg.clip_max) for name, pipe in fitted.items()}
        preds["Ensemble"] = weighted_average_ensemble(preds, cv_results, BASE_KEYS)
        agreement = compute_agreement(preds, BASE_KEYS)

        # Attach to feature df
        feat = feat.copy()
        feat["predicted_neglect"] = preds["LightGBM"]
        feat["neglect_rf"] = preds["RandomForest"]
        feat["neglect_xgb"] = preds["XGBoost"]
        feat["neglect_gbr"] = preds["GBR"]
        feat["neglect_stack"] = preds["Stacking"]
        feat["neglect_ensemble"] = preds["Ensemble"]
        feat["model_agreement"] = agreement

        LOG.info("Ensemble mean=%.1f std=%.1f", preds["Ensemble"].mean(), preds["Ensemble"].std())
        LOG.info("Model disagreement (avg std): %.2f pts", agreement.mean())

        return feat, fitted, cv_results


@dataclass
class ForecastStep:
    cfg: TrainConfig
    cv: CVStep

    def train_forecast_models(
        self,
        feat_all: pd.DataFrame,
        X_all: np.ndarray,
    ) -> Tuple[Dict[str, Dict[str, Pipeline]], Dict[str, Dict[str, Dict[str, float]]]]:
        # We train separate model sets per horizon label ("1yr", "2yr", etc.)
        forecast_models: Dict[str, Dict[str, Pipeline]] = {}
        forecast_cv: Dict[str, Dict[str, Dict[str, float]]] = {}

        for horizon_label, horizon_years in FORECAST_HORIZONS:
            X_h, y_h, meta_h = build_forecast_dataset(feat_all, horizon_years)

            # Ensure meta_h is a DataFrame for our split logic
            if not isinstance(meta_h, pd.DataFrame):
                try:
                    meta_h = pd.DataFrame(meta_h)
                except Exception:
                    meta_h = None  # type: ignore

            n_pairs = len(y_h)
            n_countries = int(meta_h["country_iso3"].nunique()) if (meta_h is not None and "country_iso3" in meta_h.columns) else -1
            LOG.info("Forecast horizon %s: %d training pairs (%s countries)", horizon_label, n_pairs, n_countries if n_countries >= 0 else "unknown")

            models = build_models()

            h_cv = self.cv.cross_validate_models(
                models=models,
                X=X_h,
                y=y_h,
                meta=meta_h,
                strategy=self.cfg.forecast_cv_strategy,
                n_splits=self.cfg.cv_splits,
                time_splits=self.cfg.forecast_time_splits,
                header=f"Cross-validating {horizon_label} forecast models",
                indent=4,
            )

            # Fit full horizon models
            fitted = {name: self.cv.fit_full(mdl, X_h, y_h) for name, mdl in models.items()}
            forecast_models[horizon_label] = fitted
            forecast_cv[horizon_label] = h_cv

        return forecast_models, forecast_cv

    def forecast_future(
        self,
        X_current: np.ndarray,
        fitted_forecast: Dict[str, Dict[str, Pipeline]],
        forecast_cv: Dict[str, Dict[str, Dict[str, float]]],
        current_preds: Optional[Dict[str, np.ndarray]] = None,
    ) -> Dict[str, Dict[str, np.ndarray]]:
        """
        Generate future projections for each FUTURE_STEPS horizon.

        ``current_preds`` should be the model predictions for the *current* year
        (keyed by model name, including "Ensemble"). When provided and
        ``interpolate_short_steps`` is True, the 6-month prediction is computed
        as the midpoint between the current prediction and the 12-month model
        output rather than being a copy of the 12-month result.

        Note on distributional mismatch: the forecast pipelines contain their
        own ``StandardScaler`` fitted on multi-year data, whereas ``X_current``
        comes from a single year.  This is expected behaviour — feature
        distributions are similar across years — but callers should be aware of
        it when interpreting forecast confidence.
        """
        LOG.info("Generating future projections (forecast models)")
        future: Dict[str, Dict[str, np.ndarray]] = {}

        # Optionally compute "12mo" first so we can interpolate 6mo.
        # If your STEP_TO_HORIZON maps both 6mo and 12mo to 1yr, you'll otherwise get identical predictions.
        cache: Dict[str, Dict[str, np.ndarray]] = {}

        for label, _years in FUTURE_STEPS:
            h_label = STEP_TO_HORIZON[label]
            h_models = fitted_forecast[h_label]
            h_cv = forecast_cv[h_label]

            preds = {name: clip_scores(pipe.predict(X_current), self.cfg.clip_min, self.cfg.clip_max) for name, pipe in h_models.items()}
            preds["Ensemble"] = weighted_average_ensemble(preds, h_cv, BASE_KEYS)
            cache[label] = preds

        if self.cfg.interpolate_short_steps:
            # If 6mo uses the same horizon model as 12mo, approximate 6mo as
            # the midpoint between current and 12mo predictions so the two
            # steps are not identical.
            labels = [lbl for (lbl, _y) in FUTURE_STEPS]
            if "6mo" in labels and "12mo" in labels:
                if STEP_TO_HORIZON.get("6mo") == STEP_TO_HORIZON.get("12mo"):
                    interp: Dict[str, np.ndarray] = {}
                    if current_preds is not None:
                        LOG.info(
                            "Interpolating 6mo as midpoint between current and 12mo predictions (approx)"
                        )
                        for k, v in cache["12mo"].items():
                            curr = current_preds.get(k)
                            if curr is not None:
                                interp[k] = clip_scores(
                                    0.5 * (np.asarray(curr, dtype=float) + v),
                                    self.cfg.clip_min,
                                    self.cfg.clip_max,
                                )
                            else:
                                interp[k] = v.copy()
                    else:
                        LOG.warning(
                            "interpolate_short_steps=True but current_preds not provided; "
                            "6mo predictions will equal 12mo model output"
                        )
                        for k, v in cache["12mo"].items():
                            interp[k] = v.copy()
                    cache["6mo"] = interp

        for label, _years in FUTURE_STEPS:
            future[label] = cache[label]
            LOG.info("%-5s (-> %s model) ensemble mean=%.1f", label, STEP_TO_HORIZON[label], cache[label]["Ensemble"].mean())

        return future


@dataclass
class PeerStep:
    cfg: TrainConfig

    def compute_peers(self, feat: pd.DataFrame, X: np.ndarray) -> Dict[str, List[str]]:
        if "country_iso3" not in feat.columns:
            return {}

        # Scale before KNN so cosine distances are not dominated by high-magnitude columns.
        X_scaled = StandardScaler().fit_transform(X)

        knn = NearestNeighbors(n_neighbors=self.cfg.peer_k, metric=self.cfg.peer_metric)
        knn.fit(X_scaled)

        _, indices = knn.kneighbors(X_scaled)

        iso3 = feat["country_iso3"].astype(str).to_numpy()
        peer_map: Dict[str, List[str]] = {}
        for i, nbrs in enumerate(indices):
            # skip self at index 0
            peer_map[iso3[i]] = [str(iso3[j]) for j in nbrs[1:]]
        return peer_map


@dataclass
class ArtifactStep:
    cfg: TrainConfig

    def save_models(
        self,
        fitted_current: Dict[str, Pipeline],
        cv_results: Dict[str, Dict[str, float]],
    ) -> None:
        ensure_dir(self.cfg.out_dir)
        ensure_dir(self.cfg.model_dir / "lgbm")
        ensure_dir(self.cfg.model_dir / "rf")
        ensure_dir(self.cfg.model_dir / "xgb")
        ensure_dir(self.cfg.model_dir / "gbr")
        ensure_dir(self.cfg.model_dir / "stack")

        model_pkl_map = {
            "LightGBM":     self.cfg.model_dir / "lgbm"  / "lgbm_neglect.pkl",
            "RandomForest": self.cfg.model_dir / "rf"    / "rf_neglect.pkl",
            "XGBoost":      self.cfg.model_dir / "xgb"   / "xgb_neglect.pkl",
            "GBR":          self.cfg.model_dir / "gbr"   / "gbr_neglect.pkl",
            "Stacking":     self.cfg.model_dir / "stack" / "stack_neglect.pkl",
        }
        for name, dest in model_pkl_map.items():
            joblib.dump(fitted_current[name], dest)
            LOG.info("Saved %s", dest.as_posix())

        with open(self.cfg.out_dir / "feature_names.json", "w") as f:
            json.dump(FEATURE_COLS, f, indent=2)

        with open(self.cfg.out_dir / "cv_results.json", "w") as f:
            json.dump(cv_results, f, indent=2)

    def _score_at(self, step_preds: Dict[str, np.ndarray], k: str, i: int) -> float:
        """Extract, clip, and round a single model prediction at row index i."""
        return safe_float(
            clip_scores(step_preds[k][i : i + 1], self.cfg.clip_min, self.cfg.clip_max)[0], 2
        )

    def build_country_json(
        self,
        feat: pd.DataFrame,
        future: Dict[str, Dict[str, np.ndarray]],
        peer_map: Dict[str, List[str]],
        cluster_bb_map: Dict[str, List[Dict[str, Any]]],
        annual_country_map: Dict[str, List[Dict[str, Any]]],
    ) -> List[Dict[str, Any]]:
        # Stable row order
        iso3_list = feat["country_iso3"].astype(str).to_list() if "country_iso3" in feat.columns else []
        iso3_to_idx = {iso: i for i, iso in enumerate(iso3_list)}

        records: List[Dict[str, Any]] = []

        for _, row in feat.iterrows():
            iso = str(row.get("country_iso3", ""))
            i = iso3_to_idx.get(iso, -1)

            future_projections: List[Dict[str, Any]] = []
            for label, years in FUTURE_STEPS:
                step_preds = future.get(label, {})
                months = int(round(years * 12))
                scores: Dict[str, Any] = {}

                if i >= 0 and step_preds:
                    scores = {
                        "neglectScore":  self._score_at(step_preds, "LightGBM", i),
                        "ensembleScore": self._score_at(step_preds, "Ensemble", i),
                        "lgbm":          self._score_at(step_preds, "LightGBM", i),
                        "rf":            self._score_at(step_preds, "RandomForest", i),
                        "xgb":           self._score_at(step_preds, "XGBoost", i),
                        "gbr":           self._score_at(step_preds, "GBR", i),
                    }

                future_projections.append(
                    {
                        "step": label,
                        "monthsAhead": months,
                        "horizonModel": STEP_TO_HORIZON.get(label, ""),
                        "scores": scores,
                    }
                )

            rec = {
                "iso3": iso,
                "neglectScore": safe_float(row.get("predicted_neglect"), 2),
                "ensembleScore": safe_float(row.get("neglect_ensemble"), 2),
                "modelScores": {
                    "lgbm":     safe_float(row.get("predicted_neglect"), 2),
                    "rf":       safe_float(row.get("neglect_rf"), 2),
                    "xgb":      safe_float(row.get("neglect_xgb"), 2),
                    "gbr":      safe_float(row.get("neglect_gbr"), 2),
                    "stacking": safe_float(row.get("neglect_stack"), 2),
                    "ensemble": safe_float(row.get("neglect_ensemble"), 2),
                },
                "modelAgreement": safe_float(row.get("model_agreement"), 2),
                "fgiScore": safe_float(row.get("fgi_score"), 2),
                "cmiScore": safe_float(row.get("cmi_score"), 2),
                "cbpfTotalUsd": safe_int(row.get("cbpf_total_usd"), 0),
                "cbpfShare": safe_float(row.get("cbpf_share"), 4),
                "pinPctPop": safe_float(row.get("pin_pct_pop"), 2),
                "anomalySeverity": str(row.get("anomaly_severity", "")),
                "neglectFlag": bool(safe_float(row.get("neglect_ensemble"), 2) >= self.cfg.neglect_flag_threshold),
                "peerIso3": peer_map.get(iso, []),
                "clusterBreakdown": cluster_bb_map.get(iso, []),
                "fundingTrend": annual_country_map.get(iso, []),
                "reqUsd": safe_int(row.get("req_usd"), 0),
                "fundedUsd": safe_int(row.get("funded_usd"), 0),
                "pin": safe_float(row.get("pin"), 0),
                "planName": str(row.get("plan_name", "")),
                "latestYear": safe_int(row.get("year", 0), 0),
                "futureProjections": future_projections,
            }
            records.append(rec)

        return records

    def save_country_json(self, records: List[Dict[str, Any]]) -> Path:
        ensure_dir(self.cfg.out_dir)
        out_path = self.cfg.out_dir / "gold_country_scores.json"
        with open(out_path, "w") as f:
            json.dump(records, f, indent=2, default=str)
        return out_path



def build_cluster_breakdown_map(gold_efficiency: pd.DataFrame) -> Dict[str, List[Dict[str, Any]]]:
    cluster_bb = (
        gold_efficiency.groupby(["country_iso3", "cluster_name"])
        .agg(bbr=("bbr", "mean"), bbr_z_score=("bbr_z_score", "mean"))
        .reset_index()
    )
    return (
        cluster_bb.groupby("country_iso3")
        .apply(lambda g: g[["cluster_name", "bbr", "bbr_z_score"]].to_dict("records"), include_groups=False)
        .to_dict()
    )

def build_annual_funding_map(fts_req: pd.DataFrame) -> Dict[str, List[Dict[str, Any]]]:
    annual_country = (
        fts_req.dropna(subset=["req_usd", "funded_usd", "country_iso3"])
        .query("req_usd > 0")
        .groupby(["country_iso3", "year"])[["req_usd", "funded_usd"]]
        .sum()
        .reset_index()
    )
    return (
        annual_country.groupby("country_iso3")
        .apply(lambda g: g[["year", "req_usd", "funded_usd"]].sort_values("year").to_dict("records"), include_groups=False)
        .to_dict()
    )


# -----------------------------------------------------------------------------
# Orchestrator
# -----------------------------------------------------------------------------
@dataclass
class TrainOrchestrator:
    cfg: TrainConfig

    def run(self) -> None:
        ensure_dir(self.cfg.out_dir)
        ensure_dir(self.cfg.model_dir)

        data_step = DataStep(self.cfg)
        feat_step = FeatureStep(self.cfg)
        cv_step = CVStep(self.cfg)
        scoring_step = ScoringModelStep(self.cfg, cv_step)
        forecast_step = ForecastStep(self.cfg, cv_step)
        peer_step = PeerStep(self.cfg)
        artifact_step = ArtifactStep(self.cfg)

        bronze, _silver, gold = data_step.run()

        # Current-year features
        feat, X, y = feat_step.build_current(bronze, gold)

        # Train scoring models
        feat_scored, fitted_current, cv_results = scoring_step.run(feat, X, y)

        # Forecast features (multi-year)
        feat_all, X_all = feat_step.build_multiyear(bronze)

        # Train per-horizon forecast models
        fitted_forecast, forecast_cv = forecast_step.train_forecast_models(feat_all, X_all)

        # Produce future projections using current X (pipelines contain their own scaler).
        # current_preds enables true 6mo midpoint interpolation when interpolate_short_steps=True.
        current_preds_for_interp: Dict[str, np.ndarray] = {
            "LightGBM":     feat_scored["predicted_neglect"].to_numpy(),
            "RandomForest": feat_scored["neglect_rf"].to_numpy(),
            "XGBoost":      feat_scored["neglect_xgb"].to_numpy(),
            "GBR":          feat_scored["neglect_gbr"].to_numpy(),
            "Stacking":     feat_scored["neglect_stack"].to_numpy(),
            "Ensemble":     feat_scored["neglect_ensemble"].to_numpy(),
        }
        future = forecast_step.forecast_future(
            X_current=X,
            fitted_forecast=fitted_forecast,
            forecast_cv=forecast_cv,
            current_preds=current_preds_for_interp,
        )

        # Peer mapping — X is scaled internally by compute_peers before fitting KNN.
        peer_map = peer_step.compute_peers(feat_scored, X)

        # Supporting maps for JSON
        gold_efficiency = gold["gold_efficiency"]
        fts_req = bronze["fts_req"]
        cluster_bb_map = build_cluster_breakdown_map(gold_efficiency)
        annual_country_map = build_annual_funding_map(fts_req)

        # Save models + metadata
        artifact_step.save_models(fitted_current, cv_results)

        # Build and save country JSON
        records = artifact_step.build_country_json(
            feat=feat_scored,
            future=future,
            peer_map=peer_map,
            cluster_bb_map=cluster_bb_map,
            annual_country_map=annual_country_map,
        )
        out_path = artifact_step.save_country_json(records)

        # Print summary
        LOG.info("Artifacts written: %s", self.cfg.out_dir.as_posix())
        LOG.info("  feature_names.json, cv_results.json, gold_country_scores.json")
        LOG.info("  gold_country_scores.json (%d countries)", len(records))

        n_neglect = sum(bool(r.get("neglectFlag")) for r in records)
        n_critical = sum(1 for r in records if str(r.get("anomalySeverity")) == "CRITICAL")
        LOG.info("Neglect flag (ensemble≥%.0f): %d countries", self.cfg.neglect_flag_threshold, n_neglect)
        LOG.info("Critical anomaly: %d countries", n_critical)

        LOG.info("Top 10 neglected (ensemble):")
        top10 = sorted(records, key=lambda r: float(r.get("ensembleScore", -1)), reverse=True)[:10]
        for r in top10:
            LOG.info(
                "  %s ensemble=%.1f lgbm=%.1f agree=%.1f sev=%s",
                r.get("iso3", ""),
                float(r.get("ensembleScore", 0.0)),
                float(r.get("neglectScore", 0.0)),
                float(r.get("modelAgreement", 0.0)),
                r.get("anomalySeverity", ""),
            )

        LOG.info("Done. Output JSON: %s", out_path.as_posix())


# -----------------------------------------------------------------------------
# Entrypoint
# -----------------------------------------------------------------------------
def main() -> None:
    cfg = TrainConfig(
        data_dir=Path("../../../data/"),
        out_dir=Path("models/artifacts"),
        model_dir=Path("models"),
        # safer defaults:
        cv_strategy="group_country",        # current-year: avoid country leakage
        forecast_cv_strategy="time",        # forecast: respect time
        cv_splits=5,
        forecast_time_splits=5,
        interpolate_short_steps=True,
    )
    TrainOrchestrator(cfg).run()


if __name__ == "__main__":
    main()
