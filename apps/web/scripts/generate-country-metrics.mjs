import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const root = process.cwd();
const dataDir = path.join(root, "data");
const outputDir = path.join(root, "public", "data");
const goldScoresPath = path.join(root, "..", "ml", "models", "artifacts", "gold_country_scores.json");

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function toNumber(raw) {
  const cleaned = String(raw ?? "")
    .replace(/,/g, "")
    .trim();
  if (!cleaned) return 0;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function cleanIso(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeCluster(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "_");
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 32);
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function stddev(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function clampPercent(value) {
  return Math.min(Math.max(value, 0), 100);
}

function computeOci(row) {
  const inNeedPct = row.population > 0 ? (row.inNeed / row.population) * 100 : 0;
  const coveragePct = row.inNeed > 0 ? (row.reached / row.inNeed) * 100 : 0;
  const fundingBaseline = row.fundingRequired > 0 ? row.fundingRequired : row.revisedPlanRequirements;
  const fundingGapPct =
    fundingBaseline > 0
      ? ((Math.max(fundingBaseline - row.fundingReceived, 0) / fundingBaseline) * 100)
      : 0;
  const coverageMismatchPct = Math.max(0, 100 - coveragePct);
  const score =
    clampPercent(row.severityScore) * 0.32 +
    clampPercent(inNeedPct) * 0.28 +
    clampPercent(fundingGapPct) * 0.22 +
    clampPercent(coverageMismatchPct) * 0.18;
  return Number(score.toFixed(2));
}

function getOrCreate(store, iso3, country = iso3) {
  if (!store.has(iso3)) {
    store.set(iso3, {
      iso3,
      country,
      population: 0,
      inNeed: 0,
      targeted: 0,
      affected: 0,
      reached: 0,
      fundingRequired: 0,
      fundingReceived: 0,
      percentFunded: 0,
      revisedPlanRequirements: 0,
      latestFundingYear: 0,
      severityScore: 0,
      overlookedScore: 0
    });
  }
  return store.get(iso3);
}

async function forEachCsvRow(filePath, onRow) {
  const stream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let headers = null;
  for await (const rawLine of rl) {
    const line = rawLine.replace(/^\uFEFF/, "").trimEnd();
    if (!line) continue;

    if (!headers) {
      headers = parseCsvLine(line).map((h) => h.trim());
      continue;
    }

    if (line.startsWith("#")) continue;

    const columns = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = columns[index] ?? "";
    });
    onRow(row);
  }
}

function annotateProjectOutliers(projects) {
  const groups = new Map();
  for (const project of projects) {
    const group = groups.get(project.cluster_name) ?? [];
    group.push(project);
    groups.set(project.cluster_name, group);
  }

  const zByProject = new Map();
  for (const group of groups.values()) {
    const values = group.map((row) => Math.log10(Math.max(row.bbr * 1_000_000, 1e-9)));
    const med = median(values);
    const mad = median(values.map((value) => Math.abs(value - med)));
    const fallbackStd = stddev(values);

    for (let index = 0; index < group.length; index += 1) {
      const row = group[index];
      const value = values[index];
      let z = 0;
      if (mad > 1e-8) {
        z = (0.6745 * (value - med)) / mad;
      } else if (fallbackStd > 1e-8) {
        z = (value - med) / fallbackStd;
      }
      zByProject.set(row.project_id, Number(z.toFixed(3)));
    }
  }

  return projects.map((project) => {
    const z = zByProject.get(project.project_id) ?? 0;
    return {
      ...project,
      bbr_z_score: z,
      outlier_flag: z >= 1.8 ? "high" : z <= -1.8 ? "low" : "none"
    };
  });
}

async function buildMetrics() {
  const metrics = new Map();
  const sourceFiles = [];

  const hnoByCluster = new Map();
  const hnoByCountryYear = new Map();
  const hnoClusterCounts = new Map();
  const clusterFunding = new Map();

  const populationFiles = [
    "cod_population_admin0.csv",
    "cod_population_admin1.csv",
    "cod_population_admin3.csv",
    "cod_population_admin4.csv"
  ];

  for (const file of populationFiles) {
    const filePath = path.join(dataDir, file);
    sourceFiles.push(`data/${file}`);
    await forEachCsvRow(filePath, (row) => {
      const iso3 = cleanIso(row.ISO3);
      if (!iso3 || iso3.length !== 3 || iso3.startsWith("#")) return;

      const country = row.Country || row.NAME_0 || iso3;
      const record = getOrCreate(metrics, iso3, country);
      const population = toNumber(row.Population);
      if (population > record.population) {
        record.population = population;
      }
    });
  }

  const hnoFiles = ["hpc_hno_2024.csv", "hpc_hno_2025.csv", "hpc_hno_2026.csv"];
  for (const file of hnoFiles) {
    const filePath = path.join(dataDir, file);
    const year = toNumber(file.match(/20\d{2}/)?.[0] || 0);
    sourceFiles.push(`data/${file}`);

    await forEachCsvRow(filePath, (row) => {
      const iso3 = cleanIso(row["Country ISO3"]);
      if (!iso3 || iso3.length !== 3 || iso3.startsWith("#")) return;
      const record = getOrCreate(metrics, iso3, iso3);

      const inNeed = toNumber(row["In Need"]);
      const targeted = toNumber(row.Targeted);
      const affected = toNumber(row.Affected);
      const reached = toNumber(row.Reached);
      const population = toNumber(row.Population);
      const clusterName = String(row.Cluster || "General").trim() || "General";
      const clusterKey = normalizeCluster(clusterName);

      record.inNeed += inNeed;
      record.targeted += targeted;
      record.affected += affected;
      record.reached += reached;

      if (year > 0) {
        const countryYearKey = `${iso3}|${year}`;
        const countryYearAgg = hnoByCountryYear.get(countryYearKey) ?? {
          inNeed: 0,
          targeted: 0,
          population: 0
        };
        countryYearAgg.inNeed += inNeed;
        countryYearAgg.targeted += targeted;
        countryYearAgg.population = Math.max(countryYearAgg.population, population);
        hnoByCountryYear.set(countryYearKey, countryYearAgg);

        const countKey = countryYearKey;
        hnoClusterCounts.set(countKey, (hnoClusterCounts.get(countKey) ?? 0) + 1);

        const key = `${iso3}|${year}|${clusterKey}`;
        const clusterAgg = hnoByCluster.get(key) ?? {
          cluster_name: clusterName,
          inNeed: 0,
          targeted: 0,
          affected: 0,
          reached: 0,
          population: 0
        };
        clusterAgg.cluster_name = clusterName;
        clusterAgg.inNeed += inNeed;
        clusterAgg.targeted += targeted;
        clusterAgg.affected += affected;
        clusterAgg.reached += reached;
        clusterAgg.population = Math.max(clusterAgg.population, population);
        hnoByCluster.set(key, clusterAgg);
      }
    });
  }

  {
    const file = "fts_requirements_funding_global.csv";
    sourceFiles.push(`data/${file}`);
    const perCountryYear = new Map();

    await forEachCsvRow(path.join(dataDir, file), (row) => {
      const iso3 = cleanIso(row.countryCode);
      const year = toNumber(row.year);
      if (!iso3 || iso3.length !== 3 || year < 2000 || iso3.startsWith("#")) return;

      const key = `${iso3}-${year}`;
      if (!perCountryYear.has(key)) {
        perCountryYear.set(key, {
          iso3,
          year,
          required: 0,
          received: 0,
          percentSum: 0,
          count: 0
        });
      }

      const agg = perCountryYear.get(key);
      agg.required += toNumber(row.requirements);
      agg.received += toNumber(row.funding);
      const pct = toNumber(row.percentFunded);
      if (pct > 0) {
        agg.percentSum += pct;
        agg.count += 1;
      }
    });

    const latestPerCountry = new Map();
    for (const agg of perCountryYear.values()) {
      const prev = latestPerCountry.get(agg.iso3);
      if (!prev || agg.year > prev.year) latestPerCountry.set(agg.iso3, agg);
    }

    for (const agg of latestPerCountry.values()) {
      const record = getOrCreate(metrics, agg.iso3, agg.iso3);
      record.fundingRequired = agg.required;
      record.fundingReceived = agg.received;
      record.latestFundingYear = agg.year;
      record.percentFunded =
        agg.count > 0
          ? agg.percentSum / agg.count
          : agg.required > 0
            ? (agg.received / agg.required) * 100
            : 0;
    }
  }

  {
    const file = "humanitarian-response-plans.csv";
    sourceFiles.push(`data/${file}`);

    await forEachCsvRow(path.join(dataDir, file), (row) => {
      const locations = String(row.locations || "").split("|");
      const revised = toNumber(row.revisedRequirements);
      locations.forEach((rawIso) => {
        const iso3 = cleanIso(rawIso);
        if (!iso3 || iso3.length !== 3 || iso3.startsWith("#")) return;
        const record = getOrCreate(metrics, iso3, iso3);
        record.revisedPlanRequirements += revised;
      });
    });
  }

  {
    const file = "fts_requirements_funding_cluster_global.csv";
    sourceFiles.push(`data/${file}`);

    await forEachCsvRow(path.join(dataDir, file), (row) => {
      const iso3 = cleanIso(row.countryCode);
      const year = toNumber(row.year);
      const clusterName = String(row.cluster || row.clusterCode || "General").trim();
      if (!iso3 || iso3.length !== 3 || year < 2000 || iso3.startsWith("#") || !clusterName) return;

      const key = `${iso3}|${year}|${normalizeCluster(clusterName)}`;
      const current = clusterFunding.get(key) ?? {
        iso3,
        year,
        cluster_name: clusterName,
        requirements: 0,
        funding: 0
      };
      current.requirements += toNumber(row.requirements);
      current.funding += toNumber(row.funding);
      clusterFunding.set(key, current);
    });
  }

  const rows = [...metrics.values()].map((row) => {
    const inNeedPressure = row.population > 0 ? (row.inNeed / row.population) * 100 : 0;
    const targetedGap = Math.max(row.inNeed - row.targeted, 0);
    const fundingBaseline = row.fundingRequired > 0 ? row.fundingRequired : row.revisedPlanRequirements;
    const fundingGapRatio =
      fundingBaseline > 0
        ? Math.max(fundingBaseline - row.fundingReceived, 0) / fundingBaseline
        : 0;
    const severityScore =
      Math.min(100, inNeedPressure * 1.2) +
      Math.min(100, fundingGapRatio * 100) * 0.6 +
      Math.min(100, targetedGap > 0 ? (targetedGap / Math.max(row.inNeed, 1)) * 100 : 0) * 0.4;

    const normalized = {
      ...row,
      country: row.country || row.iso3,
      severityScore: Number(severityScore.toFixed(2)),
      // ML defaults (overwritten below if gold scores exist)
      neglectScore: 0,
      ensembleScore: 0,
      modelScores: { lgbm: 0, rf: 0, xgb: 0, gbr: 0, stacking: 0, ensemble: 0 },
      modelAgreement: 0,
      fgiScore: 0,
      cmiScore: 0,
      cbpfTotalUsd: 0,
      cbpfShare: 0,
      pinPctPop: 0,
      anomalySeverity: "LOW",
      neglectFlag: false,
      topShapDriver: "fgi_score",
      peerIso3: [],
      clusterBreakdown: [],
      fundingTrend: [],
      reqUsd: row.fundingRequired,
      fundedUsd: row.fundingReceived,
      pin: row.inNeed,
      planName: ""
    };
    normalized.overlookedScore = computeOci(normalized);
    return normalized;
  });

  // Merge ML-enriched country scores when available.
  if (fs.existsSync(goldScoresPath)) {
    const goldRaw = fs.readFileSync(goldScoresPath, "utf-8");
    const goldScores = JSON.parse(goldRaw);
    const goldByIso = new Map(goldScores.map((g) => [g.iso3, g]));

    for (const row of rows) {
      const gold = goldByIso.get(row.iso3);
      if (!gold) continue;
      row.neglectScore = gold.neglectScore ?? 0;
      row.ensembleScore = gold.ensembleScore ?? gold.neglectScore ?? 0;
      row.modelScores = gold.modelScores ?? { lgbm: 0, rf: 0, xgb: 0, gbr: 0, stacking: 0, ensemble: 0 };
      row.modelAgreement = gold.modelAgreement ?? 0;
      row.fgiScore = gold.fgiScore ?? 0;
      row.cmiScore = gold.cmiScore ?? 0;
      row.cbpfTotalUsd = gold.cbpfTotalUsd ?? 0;
      row.cbpfShare = gold.cbpfShare ?? 0;
      row.pinPctPop = gold.pinPctPop ?? 0;
      row.anomalySeverity = gold.anomalySeverity ?? "LOW";
      row.neglectFlag = gold.neglectFlag ?? false;
      row.topShapDriver = gold.topShapDriver ?? "fgi_score";
      row.peerIso3 = gold.peerIso3 ?? [];
      row.clusterBreakdown = gold.clusterBreakdown ?? [];
      row.fundingTrend = gold.fundingTrend ?? [];
      row.reqUsd = gold.reqUsd ?? row.fundingRequired;
      row.fundedUsd = gold.fundedUsd ?? row.fundingReceived;
      row.pin = gold.pin ?? row.inNeed;
      row.planName = gold.planName ?? "";
    }
    console.log(
      `Merged ML scores for ${goldScores.length} countries from apps/ml/models/artifacts/gold_country_scores.json`
    );
  } else {
    console.warn("apps/ml/models/artifacts/gold_country_scores.json not found; ML fields default to zero.");
  }

  rows.sort(
    (a, b) =>
      b.ensembleScore - a.ensembleScore ||
      b.neglectScore - a.neglectScore ||
      b.overlookedScore - a.overlookedScore ||
      b.severityScore - a.severityScore
  );

  const projectRows = [...clusterFunding.values()]
    .map((clusterRow) => {
      const exactKey = `${clusterRow.iso3}|${clusterRow.year}|${normalizeCluster(clusterRow.cluster_name)}`;
      const countryYearKey = `${clusterRow.iso3}|${clusterRow.year}`;
      const exact = hnoByCluster.get(exactKey);
      const countryYear = hnoByCountryYear.get(countryYearKey);
      const clusterCount = Math.max(hnoClusterCounts.get(countryYearKey) ?? 1, 1);
      const sourceQuality = exact ? "exact_cluster_match" : "country_fallback";
      const targeted = exact
        ? exact.targeted
        : countryYear
          ? countryYear.targeted / clusterCount
          : 0;
      const inNeed = exact
        ? exact.inNeed
        : countryYear
          ? countryYear.inNeed / clusterCount
          : 0;
      const population = exact?.population || countryYear?.population || 0;
      const budget = clusterRow.requirements;
      const funding = clusterRow.funding;
      const fundingPct = budget > 0 ? (funding / budget) * 100 : 0;
      const bbr = targeted / Math.max(budget, 1);
      const country = metrics.get(clusterRow.iso3)?.country ?? clusterRow.iso3;

      return {
        project_id: `PRJ-${clusterRow.year}-${clusterRow.iso3}-${slug(clusterRow.cluster_name)}`,
        name: `${country} ${clusterRow.cluster_name} ${clusterRow.year}`,
        iso3: clusterRow.iso3,
        country,
        year: clusterRow.year,
        cluster_name: clusterRow.cluster_name,
        budget_usd: Math.max(0, budget),
        funding_usd: Math.max(0, funding),
        funding_pct: Number(clampPercent(fundingPct).toFixed(2)),
        people_targeted: Math.max(0, targeted),
        people_in_need: Math.max(0, inNeed),
        population: Math.max(0, population),
        bbr: Number(bbr.toFixed(8)),
        bbr_z_score: 0,
        outlier_flag: "none",
        source_quality: sourceQuality
      };
    })
    .filter((row) => row.budget_usd > 0);

  const projectProfiles = annotateProjectOutliers(projectRows).sort(
    (a, b) => Math.abs(b.bbr_z_score) - Math.abs(a.bbr_z_score)
  );

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "country-metrics.json"), JSON.stringify(rows, null, 2));
  fs.writeFileSync(path.join(outputDir, "project-profiles.json"), JSON.stringify(projectProfiles, null, 2));
  fs.writeFileSync(
    path.join(outputDir, "snapshot.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sourceFiles,
        recordCount: rows.length,
        projectRecordCount: projectProfiles.length
      },
      null,
      2
    )
  );

  console.log(`Generated ${rows.length} country rows and ${projectProfiles.length} project profiles.`);
}

buildMetrics().catch((error) => {
  console.error(error);
  process.exit(1);
});
