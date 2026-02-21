import { NextRequest, NextResponse } from "next/server";
import { computeOciComponents } from "@/lib/analytics";
import { loadCountryMetrics, loadProjectProfiles } from "@/lib/loadMetrics";

export async function GET(request: NextRequest) {
  const iso3 = request.nextUrl.searchParams.get("iso3")?.trim().toUpperCase() ?? "";
  if (!iso3 || iso3.length !== 3) {
    return NextResponse.json({ error: "Invalid ISO3 code." }, { status: 400 });
  }

  const [metrics, projects] = await Promise.all([loadCountryMetrics(), loadProjectProfiles()]);
  const row = metrics.find((item) => item.iso3 === iso3);
  if (!row) {
    return NextResponse.json({ error: "Country not found." }, { status: 404 });
  }

  const countryProjects = projects.filter((item) => item.iso3 === iso3);
  const clusterMap = new Map<
    string,
    {
      cluster_name: string;
      bbr_sum: number;
      bbr_z_score_abs_max: number;
      count: number;
      budget_usd: number;
      people_targeted: number;
    }
  >();

  countryProjects.forEach((project) => {
    const current = clusterMap.get(project.cluster_name) ?? {
      cluster_name: project.cluster_name,
      bbr_sum: 0,
      bbr_z_score_abs_max: 0,
      count: 0,
      budget_usd: 0,
      people_targeted: 0
    };
    current.bbr_sum += project.bbr;
    current.bbr_z_score_abs_max = Math.max(current.bbr_z_score_abs_max, Math.abs(project.bbr_z_score));
    current.count += 1;
    current.budget_usd += project.budget_usd;
    current.people_targeted += project.people_targeted;
    clusterMap.set(project.cluster_name, current);
  });

  const clusterBreakdown = [...clusterMap.values()]
    .map((cluster) => ({
      cluster_name: cluster.cluster_name,
      bbr: Number((cluster.bbr_sum / Math.max(cluster.count, 1)).toFixed(8)),
      bbr_z_score: Number(cluster.bbr_z_score_abs_max.toFixed(2)),
      budget_usd: Math.round(cluster.budget_usd),
      people_targeted: Math.round(cluster.people_targeted)
    }))
    .sort((a, b) => b.bbr_z_score - a.bbr_z_score);

  const projectList = countryProjects
    .map((project) => ({
      project_id: project.project_id,
      name: project.name,
      cluster_name: project.cluster_name,
      budget_usd: project.budget_usd,
      people_targeted: project.people_targeted,
      bbr: project.bbr,
      bbr_z_score: project.bbr_z_score,
      outlier_flag: project.outlier_flag
    }))
    .sort((a, b) => Math.abs(b.bbr_z_score) - Math.abs(a.bbr_z_score));

  const outlierProjects = projectList
    .filter((project) => Math.abs(project.bbr_z_score) >= 1.8)
    .slice(0, 12);

  return NextResponse.json({
    iso3,
    country: row.country,
    oci: computeOciComponents(row),
    cluster_breakdown: clusterBreakdown,
    outlier_projects: outlierProjects,
    hrp_project_list: projectList.slice(0, 20),
    metrics: row
  });
}
