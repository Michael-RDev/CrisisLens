import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const root = process.cwd();
const dataDir = path.join(root, "data");
const outputDir = path.join(root, "public", "data");

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
      severityScore: 0
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

async function buildMetrics() {
  const metrics = new Map();
  const sourceFiles = [];

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
      if (!iso3 || iso3.length !== 3) return;

      const country = row.Country || iso3;
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
    sourceFiles.push(`data/${file}`);
    await forEachCsvRow(filePath, (row) => {
      const iso3 = cleanIso(row["Country ISO3"]);
      if (!iso3 || iso3.length !== 3) return;
      const record = getOrCreate(metrics, iso3, iso3);

      record.inNeed += toNumber(row["In Need"]);
      record.targeted += toNumber(row.Targeted);
      record.affected += toNumber(row.Affected);
      record.reached += toNumber(row.Reached);
    });
  }

  {
    const file = "fts_requirements_funding_global.csv";
    sourceFiles.push(`data/${file}`);
    const perCountryYear = new Map();

    await forEachCsvRow(path.join(dataDir, file), (row) => {
      const iso3 = cleanIso(row.countryCode);
      const year = toNumber(row.year);
      if (!iso3 || iso3.length !== 3 || year < 2000) return;

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
      if (!prev || agg.year > prev.year) {
        latestPerCountry.set(agg.iso3, agg);
      }
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
        if (!iso3 || iso3.length !== 3) return;
        const record = getOrCreate(metrics, iso3, iso3);
        record.revisedPlanRequirements += revised;
      });
    });
  }

  const rows = [...metrics.values()].map((row) => {
    const inNeedPressure = row.population > 0 ? (row.inNeed / row.population) * 100 : 0;
    const targetedGap = Math.max(row.inNeed - row.targeted, 0);
    const fundingGapRatio =
      row.fundingRequired > 0
        ? Math.max(row.fundingRequired - row.fundingReceived, 0) / row.fundingRequired
        : 0;

    const severityScore =
      Math.min(100, inNeedPressure * 1.2) +
      Math.min(100, fundingGapRatio * 100) * 0.6 +
      Math.min(100, targetedGap > 0 ? (targetedGap / Math.max(row.inNeed, 1)) * 100 : 0) * 0.4;

    return {
      ...row,
      country: row.country || row.iso3,
      severityScore: Number(severityScore.toFixed(2))
    };
  });

  rows.sort((a, b) => b.severityScore - a.severityScore);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "country-metrics.json"), JSON.stringify(rows, null, 2));
  fs.writeFileSync(
    path.join(outputDir, "snapshot.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sourceFiles,
        recordCount: rows.length
      },
      null,
      2
    )
  );

  console.log(`Generated ${rows.length} country rows.`);
}

buildMetrics().catch((error) => {
  console.error(error);
  process.exit(1);
});
