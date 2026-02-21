from __future__ import annotations

import json
import pathlib
import sys
import warnings

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import KFold, cross_val_score
from sklearn.neighbors import NearestNeighbors

warnings.filterwarnings("ignore")

_HERE = pathlib.Path(__file__).parent.resolve()
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

from shared.data_loader import load_bronze, build_silver, build_gold, build_gold_multiyear   # noqa: E402
from shared.features import (  # noqa: E402
    build_feature_matrix, fit_scaler, FEATURE_COLS,
    build_feature_matrix_all_years, build_forecast_dataset,
    FUTURE_STEPS, FORECAST_HORIZONS, STEP_TO_HORIZON,
)
import lgbm.train as lgbm_def   # noqa: E402
import rf.train as rf_def     # noqa: E402
import xgb.train as xgb_def    # noqa: E402
import gbr.train as gbr_def    # noqa: E402
import stack.train as stack_def  # noqa: E402
from ensemble.blend import weighted_average_ensemble, compute_agreement  # noqa: E402o
from pathlib import Path

DATA_DIR = Path("../data/")

OUT_DIR = Path("models/artifacts")

print("Loading data")
bronze = load_bronze(DATA_DIR)
silver = build_silver(bronze)
gold   = build_gold(bronze, silver)
print(f"fts_req: {bronze['fts_req'].shape}  fts_cluster: {bronze['fts_cluster'].shape}")

feat, X, y = build_feature_matrix(gold["gold_fgi"], gold["gold_efficiency"], bronze["pop_total"])
scaler, X_scaled = fit_scaler(X)

kf = KFold(n_splits=5, shuffle=True, random_state=42)

models = {
    "LightGBM":     lgbm_def.build_model(),
    "RandomForest": rf_def.build_model(),
    "XGBoost":      xgb_def.build_model(),
    "GBR":          gbr_def.build_model(),
    "Stacking":     stack_def.build_model(),
}

print("\nCross-validating models (5-fold R2)")
cv_results = {}
for name, mdl in models.items():
    scores = cross_val_score(mdl, X_scaled, y, cv=kf, scoring="r2")
    cv_results[name] = {"mean": float(scores.mean()), "std": float(scores.std())}
    print(f"  {name:<15}  R2={scores.mean():.4f} ± {scores.std():.4f}")

print("\nFitting all models on full dataset")
for mdl in models.values():
    mdl.fit(X_scaled, y)

BASE_KEYS = ["LightGBM", "RandomForest", "XGBoost", "GBR"]

predictions = {name: np.clip(mdl.predict(X_scaled), 0, 100) for name, mdl in models.items()}
predictions["Ensemble"] = weighted_average_ensemble(predictions, cv_results, BASE_KEYS)
agreement = compute_agreement(predictions, BASE_KEYS)

feat["predicted_neglect"] = predictions["LightGBM"]
feat["neglect_rf"] = predictions["RandomForest"]
feat["neglect_xgb"] = predictions["XGBoost"]
feat["neglect_gbr"] = predictions["GBR"]
feat["neglect_stack"] = predictions["Stacking"]
feat["neglect_ensemble"] = predictions["Ensemble"]
feat["model_agreement"] = agreement

print(f"\nEnsemble  mean={predictions['Ensemble'].mean():.1f}  std={predictions['Ensemble'].std():.1f}")
print(f"Model disagreement (avg std): {agreement.mean():.2f} pts")

print("\nBuilding multi-year historical dataset for forecast model training")
gold_multiyear = build_gold_multiyear(bronze)
feat_all, X_all, _ = build_feature_matrix_all_years(gold_multiyear)
forecast_scaler, X_all_scaled = fit_scaler(X_all)

forecast_models = {}
forecast_cv = {}

for horizon_label, horizon_years in FORECAST_HORIZONS:
    X_h, y_h, meta_h = build_forecast_dataset(feat_all, horizon_years)
    n_pairs    = len(y_h)
    n_countries = meta_h["country_iso3"].nunique()
    print(f"\nForecast horizon {horizon_label}: {n_pairs} training pairs ({n_countries} countries)")
    X_h_scaled = forecast_scaler.transform(X_h)
    h_models = {
        "LightGBM":     lgbm_def.build_model(),
        "RandomForest": rf_def.build_model(),
        "XGBoost":      xgb_def.build_model(),
        "GBR":          gbr_def.build_model(),
        "Stacking":     stack_def.build_model(),
    }
    print(f"  Cross-validating {horizon_label} forecast models (5-fold R²)")
    h_cv: dict[str, dict] = {}
    for name, mdl in h_models.items():
        scores_cv = cross_val_score(mdl, X_h_scaled, y_h, cv=kf, scoring="r2")
        h_cv[name] = {"mean": float(scores_cv.mean()), "std": float(scores_cv.std())}
        print(f"    {name:<15}  R2={scores_cv.mean():.4f} ± {scores_cv.std():.4f}")
    for mdl in h_models.values():
        mdl.fit(X_h_scaled, y_h)
    forecast_models[horizon_label] = h_models
    forecast_cv[horizon_label]     = h_cv

print("\nGenerating future projections (ML forecast models)")
X_current_forecast = forecast_scaler.transform(X)  

# future_ml[step_label] = { "LightGBM": ndarray, ..., "Ensemble": ndarray }
future_ml: dict[str, dict[str, np.ndarray]] = {}
for label, _ in FUTURE_STEPS:
    h_label  = STEP_TO_HORIZON[label]
    h_models = forecast_models[h_label]
    h_cv_res = forecast_cv[h_label]
    preds_fut = {name: np.clip(mdl.predict(X_current_forecast), 0, 100)
                 for name, mdl in h_models.items()}
    preds_fut["Ensemble"] = weighted_average_ensemble(preds_fut, h_cv_res, BASE_KEYS)
    future_ml[label] = preds_fut
    print(f"  {label:5s} (→ {h_label} model)  ensemble mean={preds_fut['Ensemble'].mean():.1f}")

knn = NearestNeighbors(n_neighbors=6, metric="cosine")
knn.fit(X_scaled)
_, indices = knn.kneighbors(X_scaled)
iso3_list = feat["country_iso3"].tolist()
peer_map  = {iso3_list[i]: [iso3_list[j] for j in indices[i][1:]] for i in range(len(iso3_list))}

gold_efficiency = gold["gold_efficiency"]
fts_req = bronze["fts_req"]

cluster_bb = (gold_efficiency.groupby(["country_iso3", "cluster_name"]).agg(bbr=("bbr", "mean"), bbr_z_score=("bbr_z_score", "mean")).reset_index())
cluster_bb_map = (cluster_bb.groupby("country_iso3").apply(lambda g: g[["cluster_name", "bbr", "bbr_z_score"]].to_dict("records")).to_dict())

annual_country = (fts_req.dropna(subset=["req_usd", "funded_usd", "country_iso3"]).query("req_usd > 0").groupby(["country_iso3", "year"])[["req_usd", "funded_usd"]].sum().reset_index())
annual_country_map = (annual_country.groupby("country_iso3").apply(lambda g: g[["year", "req_usd", "funded_usd"]].sort_values("year").to_dict("records")).to_dict())

model_pkl_map: dict[str, pathlib.Path] = {
    "LightGBM":     _HERE / "lgbm"  / "lgbm_neglect.pkl",
    "RandomForest": _HERE / "rf"    / "rf_neglect.pkl",
    "XGBoost":      _HERE / "xgb"   / "xgb_neglect.pkl",
    "GBR":          _HERE / "gbr"   / "gbr_neglect.pkl",
    "Stacking":     _HERE / "stack" / "stack_neglect.pkl",
}
for name, dest in model_pkl_map.items():
    joblib.dump(models[name], dest)
    print(f"{dest.relative_to(_HERE.parent)}")

joblib.dump(scaler, OUT_DIR / "scaler.pkl")

with open(OUT_DIR / "feature_names.json", "w") as f:
    json.dump(FEATURE_COLS, f, indent=2)

with open(OUT_DIR / "cv_results.json", "w") as f:
    json.dump(cv_results, f, indent=2)

records = []
iso3_list_ordered = feat["country_iso3"].tolist()

for idx, row in feat.iterrows():
    iso = row["country_iso3"]
    i   = iso3_list_ordered.index(iso) if iso in iso3_list_ordered else -1

    future_projections = []
    for label, years in FUTURE_STEPS:
        step_preds = future_ml.get(label, {})
        months     = int(years * 12)
        scores: dict = {}
        if i >= 0 and step_preds:
            scores = {
                "neglectScore":  round(float(np.clip(step_preds["LightGBM"][i],     0, 100)), 2),
                "ensembleScore": round(float(np.clip(step_preds["Ensemble"][i],     0, 100)), 2),
                "lgbm":          round(float(np.clip(step_preds["LightGBM"][i],     0, 100)), 2),
                "rf":            round(float(np.clip(step_preds["RandomForest"][i], 0, 100)), 2),
                "xgb":           round(float(np.clip(step_preds["XGBoost"][i],      0, 100)), 2),
                "gbr":           round(float(np.clip(step_preds["GBR"][i],          0, 100)), 2),
            }
        future_projections.append({
            "step":         label,
            "monthsAhead":  months,
            "horizonModel": STEP_TO_HORIZON[label],
            "scores":       scores,
        })
    records.append({
        "iso3":           iso,
        "neglectScore":   round(float(row["predicted_neglect"]), 2),
        "ensembleScore":  round(float(row["neglect_ensemble"]), 2),
        "modelScores": {
            "lgbm":     round(float(row["predicted_neglect"]),  2),
            "rf":       round(float(row["neglect_rf"]),         2),
            "xgb":      round(float(row["neglect_xgb"]),        2),
            "gbr":      round(float(row["neglect_gbr"]),        2),
            "stacking": round(float(row["neglect_stack"]),      2),
            "ensemble": round(float(row["neglect_ensemble"]),   2),
        },
        "modelAgreement": round(float(row["model_agreement"]), 2),
        "fgiScore":       round(float(row["fgi_score"]),        2),
        "cmiScore":       round(float(row["cmi_score"]),        2),
        "cbpfTotalUsd":   round(float(row["cbpf_total_usd"]),   0),
        "cbpfShare":      round(float(row["cbpf_share"]),       4),
        "pinPctPop":      round(float(row["pin_pct_pop"]),      2),
        "anomalySeverity": str(row["anomaly_severity"]),
        "neglectFlag":    bool(row["neglect_ensemble"] >= 65),
        "topShapDriver":  "fgi_score",
        "peerIso3":       peer_map.get(iso, []),
        "clusterBreakdown": cluster_bb_map.get(iso, []),
        "fundingTrend":   annual_country_map.get(iso, []),
        "reqUsd":         round(float(row["req_usd"]),          0),
        "fundedUsd":      round(float(row["funded_usd"]),       0),
        "pin":            round(float(row["pin"]),              0),
        "planName":       str(row.get("plan_name", "")),
        "latestYear":     int(row.get("year", 0)) if pd.notna(row.get("year")) else 0,
        "futureProjections": future_projections,
    })

gold_path = OUT_DIR / "gold_country_scores.json"
with open(gold_path, "w") as f:
    json.dump(records, f, indent=2, default=str)

print(f"\nartifacts/scaler.pkl  feature_names.json  cv_results.json")
print(f"artifacts/gold_country_scores.json  ({len(records)} countries)")
print(f"\nNeglect flag (ensemble≥65): {sum(r['neglectFlag'] for r in records)} countries")
print(f"Critical anomaly: {sum(1 for r in records if r['anomalySeverity']=='CRITICAL')} countries")
print("\nTop 10 neglected (ensemble):")
for r in sorted(records, key=lambda x: -x["ensembleScore"])[:10]:
    print(
        f"  {r['iso3']}  ensemble={r['ensembleScore']:.1f}  "
        f"lgbm={r['neglectScore']:.1f}  agree={r['modelAgreement']:.1f}  sev={r['anomalySeverity']}"
    )
