import { NextResponse } from "next/server";

type Params = {
  params: { project_id: string };
};

export async function GET(_: Request, { params }: Params) {
  const projectId = params.project_id.trim();
  if (!projectId) {
    return NextResponse.json({ error: "Invalid project ID." }, { status: 400 });
  }

  return NextResponse.json({
    project_id: projectId,
    project_name: `Mock project ${projectId}`,
    metrics: {
      budget_usd: 2_400_000,
      people_targeted: 170_000,
      bbr: 0.0708,
      bbr_z_score: 1.24
    },
    comparable_projects: [
      {
        project_id: `${projectId}-PEER-1`,
        similarity_score: 0.92,
        efficiency_delta_pct: 11.4
      },
      {
        project_id: `${projectId}-PEER-2`,
        similarity_score: 0.89,
        efficiency_delta_pct: 6.8
      },
      {
        project_id: `${projectId}-PEER-3`,
        similarity_score: 0.84,
        efficiency_delta_pct: -2.3
      }
    ]
  });
}
