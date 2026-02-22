import { NextRequest, NextResponse } from "next/server";
import { comparableProjectsFor } from "@/lib/analytics";
import { loadProjectProfiles } from "@/lib/loadMetrics";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim() ?? "";
  if (!projectId) {
    return NextResponse.json({ error: "Invalid project ID." }, { status: 400 });
  }

  const projects = await loadProjectProfiles();
  const target = projects.find((project) => project.project_id === projectId);
  if (!target) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({
    project_id: target.project_id,
    project_name: target.name,
    metrics: {
      budget_usd: target.budget_usd,
      funding_usd: target.funding_usd,
      funding_pct: target.funding_pct,
      people_targeted: target.people_targeted,
      bbr: target.bbr,
      bbr_z_score: target.bbr_z_score,
      cluster_name: target.cluster_name,
      outlier_flag: target.outlier_flag
    },
    comparable_projects: comparableProjectsFor(target, projects, 6)
  });
}
