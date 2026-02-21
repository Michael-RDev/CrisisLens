from __future__ import annotations

import pathlib

import numpy as np
import pandas as pd

CLUSTER_MAP: dict[str, str] = {
    "EDU": "Education",
    "FSC": "Food Security",
    "HEA": "Health",
    "NUT": "Nutrition",
    "SHL": "Shelter",
    "PRO": "Protection",
    "WSH": "Water Sanitation Hygiene",
    "NFI": "Non-food Items",
    "ERY": "Early Recovery",
    "CAP": "Coordination and Common Services",
}


def load_csv(data_dir: pathlib.Path, fname: str) -> pd.DataFrame:
    df = pd.read_csv(data_dir / fname, low_memory=False)
    if len(df) > 0 and str(df.iloc[0, 0]).startswith("#"):
        df = df.iloc[1:].reset_index(drop=True)
    df.columns = df.columns.str.strip()
    return df


def load_bronze(data_dir: pathlib.Path) -> dict[str, pd.DataFrame]:
    hno_2026 = load_csv(data_dir, "hpc_hno_2026.csv")
    hno_2026.rename(columns={"Country ISO3": "country_iso3"}, inplace=True)

    fts_req = load_csv(data_dir, "fts_requirements_funding_global.csv")
    fts_req.rename(columns={
        "countryCode": "country_iso3", "requirements": "req_usd",
        "funding": "funded_usd", "percentFunded": "pct_funded",
        "name": "plan_name", "year": "year",
    }, inplace=True)
    for c in ["req_usd", "funded_usd", "pct_funded"]:
        fts_req[c] = pd.to_numeric(fts_req[c], errors="coerce")
    fts_req["year"] = pd.to_numeric(fts_req["year"], errors="coerce")

    fts_cluster = load_csv(data_dir, "fts_requirements_funding_cluster_global.csv")
    fts_cluster.rename(columns={
        "countryCode": "country_iso3", "cluster": "cluster_name",
        "requirements": "cluster_req_usd", "funding": "cluster_funded_usd",
        "percentFunded": "cluster_pct_funded", "year": "year",
    }, inplace=True)
    for c in ["cluster_req_usd", "cluster_funded_usd"]:
        fts_cluster[c] = pd.to_numeric(fts_cluster[c], errors="coerce")
    fts_cluster["year"] = pd.to_numeric(fts_cluster["year"], errors="coerce")

    fts_out = load_csv(data_dir, "fts_outgoing_funding_global.csv")
    fts_out["amountUSD"] = pd.to_numeric(fts_out["amountUSD"], errors="coerce")

    pop = load_csv(data_dir, "cod_population_admin0.csv")
    pop.rename(columns={"ISO3": "country_iso3"}, inplace=True)
    pop["Population"] = pd.to_numeric(pop["Population"], errors="coerce")
    pop_total = (
        pop[pop["Population_group"] == "T_TL"]
        .groupby("country_iso3", as_index=False)["Population"].sum()
        .rename(columns={"Population": "population"})
    )

    return {
        "hno_2026":   hno_2026,
        "fts_req":    fts_req,
        "fts_cluster": fts_cluster,
        "fts_out":    fts_out,
        "pop_total":  pop_total,
    }


def build_silver(bronze: dict[str, pd.DataFrame]) -> dict[str, pd.DataFrame]:
    hno_2026    = bronze["hno_2026"]
    fts_cluster = bronze["fts_cluster"]
    fts_out     = bronze["fts_out"]

    hno26_clean = hno_2026.copy()
    hno26_clean["cluster"]  = hno26_clean.get("Cluster",  hno26_clean.get("cluster", ""))
    hno26_clean["pin"]      = pd.to_numeric(hno26_clean.get("In Need",  np.nan), errors="coerce")
    hno26_clean["targeted"] = pd.to_numeric(hno26_clean.get("Targeted", np.nan), errors="coerce")

    silver_severity = (
        hno26_clean[hno26_clean["cluster"].astype(str).str.upper() == "ALL"]
        [["country_iso3", "pin", "targeted"]].dropna(subset=["pin"])
        .drop_duplicates("country_iso3")
    )

    cbpf_out = fts_out[
        fts_out["destOrganizationTypes"].astype(str).str.contains("Pooled Fund", na=False)
    ].copy()
    cbpf_out.rename(columns={
        "destLocations": "country_iso3", "amountUSD": "cbpf_alloc_usd"
    }, inplace=True)
    cbpf_out = (
        cbpf_out
        .assign(country_iso3=cbpf_out["country_iso3"].str.split(","))
        .explode("country_iso3")
        .assign(country_iso3=lambda d: d["country_iso3"].str.strip())
    )
    cbpf_by_iso = (
        cbpf_out.groupby("country_iso3")["cbpf_alloc_usd"].sum()
        .reset_index().rename(columns={"cbpf_alloc_usd": "cbpf_total_usd"})
    )

    silver_hrp = fts_cluster.dropna(subset=["country_iso3", "cluster_name"]).copy()

    return {
        "hno26_clean":     hno26_clean,
        "silver_severity": silver_severity,
        "cbpf_by_iso":     cbpf_by_iso,
        "silver_hrp":      silver_hrp,
    }


def _z_score(x: pd.Series) -> pd.Series:
    mu, sigma = x.mean(), x.std()
    return (x - mu) / sigma if sigma > 0 else pd.Series(0, index=x.index)


def build_gold_multiyear(bronze: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """
    Build a multi-year gold table (one row per country-year) for forecast
    model training.  Covers all years where req_usd > 0 in fts_req, using
    CBPF outgoing flows and cluster-level BBR proxy z-scores per year.
    """
    fts_req     = bronze["fts_req"]
    pop_total   = bronze["pop_total"]
    fts_out     = bronze["fts_out"]
    fts_cluster = bronze["fts_cluster"]

    # ── CBPF allocation by country and budget year ─────────────────────────
    cbpf_out = fts_out[
        fts_out["destOrganizationTypes"].astype(str).str.contains("Pooled Fund", na=False)
    ].copy()
    cbpf_out["year"] = pd.to_numeric(cbpf_out["budgetYear"], errors="coerce")
    cbpf_out = (
        cbpf_out.assign(country_iso3=cbpf_out["destLocations"].str.split(","))
        .explode("country_iso3")
        .assign(country_iso3=lambda d: d["country_iso3"].str.strip())
    )
    cbpf_yearly = (
        cbpf_out.dropna(subset=["country_iso3", "year"])
        .groupby(["country_iso3", "year"])["amountUSD"].sum()
        .reset_index().rename(columns={"amountUSD": "cbpf_total_usd"})
    )
    cbpf_yearly["year"] = cbpf_yearly["year"].astype(int)

    # ── Cluster-level BBR proxy z-score by year ────────────────────────────
    # bbr_proxy = funded / req  (higher = better funded; z-score within cluster×year)
    cl = fts_cluster.copy()
    cl = cl.dropna(subset=["country_iso3", "cluster_name", "cluster_req_usd", "year"])
    cl = cl[cl["cluster_req_usd"] > 0].copy()
    cl["bbr_proxy"] = (
        cl["cluster_funded_usd"].fillna(0) / cl["cluster_req_usd"]
    ).clip(0, 10)
    cl["bbr_proxy_z"] = cl.groupby(
        ["year", "cluster_name"]
    )["bbr_proxy"].transform(_z_score)
    cl["bbr_anomaly"] = cl["bbr_proxy_z"].abs() > 2

    bbr_yearly = (
        cl.groupby(["country_iso3", "year"]).agg(
            bbr_median_z        = ("bbr_proxy_z", "median"),
            bbr_max_z           = ("bbr_proxy_z", "max"),
            n_cluster_anomalies = ("bbr_anomaly",  "sum"),
            n_clusters          = ("cluster_name", "nunique"),
        ).reset_index()
    )
    bbr_yearly["year"] = bbr_yearly["year"].astype(int)

    # ── Base: aggregate to one row per (country, year) ─────────────────────
    base = (
        fts_req.dropna(subset=["country_iso3", "req_usd", "funded_usd", "year"])
        .query("req_usd > 0")
        .groupby(["country_iso3", "year"], as_index=False)
        .agg(req_usd=("req_usd", "sum"),
             funded_usd=("funded_usd", "sum"),
             plan_name=("plan_name", "first"))
    )
    base["year"] = base["year"].astype(int)

    base = (
        base.merge(cbpf_yearly, on=["country_iso3", "year"], how="left")
            .merge(bbr_yearly,  on=["country_iso3", "year"], how="left")
            .merge(pop_total,   on="country_iso3",            how="left")
    )
    for col in ["cbpf_total_usd", "bbr_median_z", "bbr_max_z",
                "n_cluster_anomalies", "n_clusters", "population"]:
        base[col] = base[col].fillna(0)

    # ── Derived features (mirrors build_feature_matrix) ────────────────────
    safe_req = base["req_usd"].replace(0, np.nan)
    base["fgi_score"]    = ((base["req_usd"] - base["funded_usd"]) / safe_req * 100).fillna(0).clip(0, 100)
    base["funded_pct"]   = (base["funded_usd"] / safe_req * 100).fillna(0).clip(0, 100)
    base["cbpf_share"]   = (base["cbpf_total_usd"] / base["funded_usd"].replace(0, np.nan)).fillna(0).clip(0, 1)
    base["cmi_score"]    = base["fgi_score"] * (1 - base["cbpf_share"])
    base["log_req_usd"]  = np.log1p(base["req_usd"])
    base["log_cbpf"]     = np.log1p(base["cbpf_total_usd"])
    # PIN not available for most historical years → zero
    base["pin"]          = 0.0
    base["pin_pct_pop"]  = 0.0
    base["cbpf_per_pin"] = 0.0
    base["req_per_pin"]  = 0.0

    return base


def build_gold(bronze: dict[str, pd.DataFrame],silver: dict[str, pd.DataFrame]):
    fts_req = bronze["fts_req"]
    pop_total  = bronze["pop_total"]
    silver_severity = silver["silver_severity"]
    cbpf_by_iso = silver["cbpf_by_iso"]
    silver_hrp = silver["silver_hrp"]
    hno26_clean= silver["hno26_clean"]

    latest = (
        fts_req.dropna(subset=["req_usd", "funded_usd"])
        .query("req_usd > 0")
        .sort_values("year", ascending=False)
        .drop_duplicates("country_iso3")
    )
    gold_fgi = latest[["country_iso3", "year", "plan_name", "req_usd", "funded_usd"]].copy()
    gold_fgi["fgi_score"] = (
        (gold_fgi["req_usd"] - gold_fgi["funded_usd"]) / gold_fgi["req_usd"] * 100
    ).clip(0, 100)
    gold_fgi = gold_fgi.merge(cbpf_by_iso, on="country_iso3", how="left")
    gold_fgi["cbpf_total_usd"] = gold_fgi["cbpf_total_usd"].fillna(0)
    gold_fgi["cbpf_share"] = (
        gold_fgi["cbpf_total_usd"] / gold_fgi["funded_usd"].replace(0, np.nan)
    ).fillna(0).clip(0, 1)
    gold_fgi["cmi_score"] = gold_fgi["fgi_score"] * (1 - gold_fgi["cbpf_share"])
    gold_fgi = gold_fgi.merge(silver_severity[["country_iso3", "pin"]], on="country_iso3", how="left")
    gold_fgi = gold_fgi.merge(pop_total, on="country_iso3", how="left")

    hno26_clusters = (
        hno26_clean[hno26_clean["cluster"].astype(str).str.upper().isin(CLUSTER_MAP)]
        [["country_iso3", "cluster", "pin"]].dropna(subset=["pin"])
        .assign(pin=lambda d: pd.to_numeric(d["pin"], errors="coerce"))
    )
    hno26_clusters["cluster_name"] = (
        hno26_clusters["cluster"].map(CLUSTER_MAP).fillna(hno26_clusters["cluster"])
    )
    fts_cluster_2026 = (
        silver_hrp[silver_hrp["year"] == 2026].dropna(subset=["cluster_req_usd"]).copy()
    )
    bbr_df = hno26_clusters.merge(
        fts_cluster_2026[["country_iso3", "cluster_name", "cluster_req_usd", "cluster_funded_usd"]],
        on=["country_iso3", "cluster_name"], how="inner",
    )
    bbr_df = bbr_df[bbr_df["cluster_req_usd"] > 0].copy()
    bbr_df["bbr"] = bbr_df["pin"] / bbr_df["cluster_req_usd"]
    bbr_df["bbr_z_score"] = bbr_df.groupby("cluster_name")["bbr"].transform(_z_score)
    bbr_df["bbr_anomaly"] = bbr_df["bbr_z_score"].abs() > 2

    gold_efficiency = bbr_df[
        ["country_iso3", "cluster_name", "pin",
         "cluster_req_usd", "cluster_funded_usd",
         "bbr", "bbr_z_score", "bbr_anomaly"]
    ].copy()

    return {"gold_fgi": gold_fgi, "gold_efficiency": gold_efficiency}
