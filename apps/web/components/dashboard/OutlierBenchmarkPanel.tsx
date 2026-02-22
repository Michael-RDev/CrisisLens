"use client";

import { CountryDrilldown, ProjectDetail } from "@/lib/api/crisiswatch";
import { SectionCard } from "@/components/dashboard/ui-kit";
import { getOutlierLabel } from "@/components/dashboard/dashboard-utils";

type OutlierBenchmarkPanelProps = {
  projectOutliers: CountryDrilldown["outlier_projects"];
  projectDetailLoading: boolean;
  projectDetail: ProjectDetail | null;
  onSelectProjectId: (projectId: string) => void;
};

export function OutlierBenchmarkPanel({
  projectOutliers,
  projectDetailLoading,
  projectDetail,
  onSelectProjectId
}: OutlierBenchmarkPanelProps) {
  return (
    <SectionCard title="Outliers & Benchmarks" subtitle="Project-level anomalies with comparables">
      {projectOutliers.length === 0 ? (
        <p className="text-sm text-[#9db7c8]">No outliers for this country.</p>
      ) : (
        <ul className="grid list-none gap-1.5 p-0">
          {projectOutliers.slice(0, 6).map((project) => (
            <li key={project.project_id}>
              <button
                className="flex w-full items-center justify-between rounded-[10px] border border-[#345871] bg-[#0b1f2d] px-2.5 py-2 text-left text-sm text-[#eaf3f8] transition hover:border-[#5e83a0]"
                type="button"
                onClick={() => onSelectProjectId(project.project_id)}
              >
                <span>{project.cluster_name} • {getOutlierLabel(project.outlier_flag)}</span>
                <strong>{project.bbr_z_score.toFixed(2)} z</strong>
              </button>
            </li>
          ))}
        </ul>
      )}

      {projectDetailLoading ? <p className="mt-2 text-sm text-[#9db7c8]">Loading comparables...</p> : null}

      {!projectDetailLoading && projectDetail ? (
        <div className="mt-2 rounded-xl border border-[#2f5064] bg-[#0f2434] p-2.5">
          <p className="m-0 font-semibold">{projectDetail.project_name}</p>
          <p className="m-0 text-xs text-[#9db7c8]">
            Budget ${Math.round(projectDetail.metrics.budget_usd).toLocaleString()} • Targeted {Math.round(
              projectDetail.metrics.people_targeted
            ).toLocaleString()}
          </p>
          <ul className="mt-2 grid list-none gap-1 p-0">
            {projectDetail.comparable_projects.slice(0, 4).map((peer) => (
              <li key={peer.project_id} className="flex justify-between rounded-lg border border-[#2f5064] px-2 py-1.5 text-xs">
                <span>{peer.project_id}</span>
                <strong>{(peer.similarity_score * 100).toFixed(0)}%</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </SectionCard>
  );
}
