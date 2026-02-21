import { ComparableProject, CountryMetrics, OciComponents, ProjectProfile } from "@/lib/types";
import { clampToPercent, computeDerivedMetrics } from "@/lib/metrics";

const OCI_WEIGHTS = {
  severity: 0.32,
  inNeedRate: 0.28,
  fundingGap: 0.22,
  coverageMismatch: 0.18
};

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function safeLog(value: number): number {
  return Math.log10(Math.max(value, 1));
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function computeOciComponents(row: CountryMetrics): OciComponents {
  const derived = computeDerivedMetrics(row);
  const severityComponent = clamp01(clampToPercent(row.severityScore) / 100);
  const inNeedRateComponent = clamp01(derived.inNeedPct / 100);
  const fundingGapComponent = clamp01(derived.fundingGapPct / 100);
  const coverageMismatchComponent = clamp01((100 - derived.coveragePct) / 100);
  const totalScore =
    severityComponent * OCI_WEIGHTS.severity +
    inNeedRateComponent * OCI_WEIGHTS.inNeedRate +
    fundingGapComponent * OCI_WEIGHTS.fundingGap +
    coverageMismatchComponent * OCI_WEIGHTS.coverageMismatch;

  return {
    severityComponent: Number((severityComponent * 100).toFixed(2)),
    inNeedRateComponent: Number((inNeedRateComponent * 100).toFixed(2)),
    fundingGapComponent: Number((fundingGapComponent * 100).toFixed(2)),
    coverageMismatchComponent: Number((coverageMismatchComponent * 100).toFixed(2)),
    totalScore: Number((totalScore * 100).toFixed(2))
  };
}

export function withOverlookedScores(metrics: CountryMetrics[]): CountryMetrics[] {
  return metrics.map((row) => ({
    ...row,
    overlookedScore: computeOciComponents(row).totalScore
  }));
}

export function rankOverlooked(metrics: CountryMetrics[]): CountryMetrics[] {
  return [...withOverlookedScores(metrics)].sort(
    (a, b) => (b.overlookedScore ?? 0) - (a.overlookedScore ?? 0)
  );
}

export function simulateFundingAllocation(
  metrics: CountryMetrics[],
  iso3: string,
  allocationUsd: number
): CountryMetrics[] {
  const normalizedIso3 = iso3.trim().toUpperCase();
  const extra = Math.max(allocationUsd, 0);

  return withOverlookedScores(
    metrics.map((row) => {
      if (row.iso3 !== normalizedIso3) return row;
      const updatedFunding = row.fundingReceived + extra;
      const percentFunded =
        row.fundingRequired > 0 ? clampToPercent((updatedFunding / row.fundingRequired) * 100) : row.percentFunded;
      return {
        ...row,
        fundingReceived: updatedFunding,
        percentFunded
      };
    })
  );
}

export function annotateProjectOutliers(projects: ProjectProfile[]): ProjectProfile[] {
  const groups = new Map<string, ProjectProfile[]>();
  for (const project of projects) {
    const bucket = groups.get(project.cluster_name) ?? [];
    bucket.push(project);
    groups.set(project.cluster_name, bucket);
  }

  const zByProject = new Map<string, number>();
  for (const clusterProjects of groups.values()) {
    const values = clusterProjects.map((project) => safeLog(project.bbr * 1_000_000));
    const med = median(values);
    const absDeviations = values.map((value) => Math.abs(value - med));
    const mad = median(absDeviations);
    const fallbackStd = stddev(values);

    clusterProjects.forEach((project) => {
      const value = safeLog(project.bbr * 1_000_000);
      let z = 0;
      if (mad > 1e-8) {
        z = (0.6745 * (value - med)) / mad;
      } else if (fallbackStd > 1e-8) {
        z = (value - med) / fallbackStd;
      }
      zByProject.set(project.project_id, Number(z.toFixed(3)));
    });
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

export function comparableProjectsFor(
  target: ProjectProfile,
  projects: ProjectProfile[],
  maxRows = 5
): ComparableProject[] {
  const sameCluster = projects.filter(
    (project) => project.project_id !== target.project_id && project.cluster_name === target.cluster_name
  );
  const candidatePool = sameCluster.length >= 4 ? sameCluster : projects.filter((project) => project.project_id !== target.project_id);

  const targetVector = [
    safeLog(target.budget_usd),
    safeLog(target.people_targeted),
    clampToPercent(target.funding_pct) / 100,
    target.bbr_z_score
  ];

  const rows = candidatePool
    .map((project) => {
      const vector = [
        safeLog(project.budget_usd),
        safeLog(project.people_targeted),
        clampToPercent(project.funding_pct) / 100,
        project.bbr_z_score
      ];
      const distance = Math.sqrt(
        vector.reduce((sum, value, index) => sum + (value - targetVector[index]) ** 2, 0)
      );
      const similarity = Math.exp(-distance);
      const efficiencyDeltaPct =
        target.bbr > 0 ? ((project.bbr - target.bbr) / target.bbr) * 100 : 0;

      const rationale = [
        project.cluster_name === target.cluster_name ? "same cluster" : "cross-cluster match",
        Math.abs(project.budget_usd - target.budget_usd) / Math.max(target.budget_usd, 1) < 0.35
          ? "similar budget scale"
          : "different budget scale",
        Math.abs(project.funding_pct - target.funding_pct) < 10 ? "similar funding coverage" : "coverage differs"
      ].join(", ");

      return {
        project_id: project.project_id,
        similarity_score: Number(similarity.toFixed(3)),
        efficiency_delta_pct: Number(efficiencyDeltaPct.toFixed(2)),
        rationale
      };
    })
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, maxRows);

  return rows;
}

