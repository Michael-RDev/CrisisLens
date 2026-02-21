import { CountryDrilldown, ProjectDetail } from "@/lib/api/crisiswatch";
import { getOutlierLabel } from "@/components/dashboard/dashboard-utils";

type ProjectOutliersPanelProps = {
  projectOutliers: CountryDrilldown["outlier_projects"];
  projectDetailLoading: boolean;
  projectDetail: ProjectDetail | null;
  onSelectProjectId: (projectId: string) => void;
};

export function ProjectOutliersPanel({
  projectOutliers,
  projectDetailLoading,
  projectDetail,
  onSelectProjectId
}: ProjectOutliersPanelProps) {
  return (
    <article className="integration-card min-w-0 overflow-hidden rounded-2xl border border-[#2e4f63] bg-[#10202d] p-4">
      <h2 className="m-0 text-xl font-semibold">Project Outliers & Benchmarks</h2>
      {projectOutliers.length === 0 ? (
        <p className="text-sm text-[#9db7c8]">No outlier projects for this country.</p>
      ) : (
        <ul className="grid list-none gap-1.5 p-0">
          {projectOutliers.slice(0, 8).map((project) => (
            <li key={project.project_id}>
              <button
                className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-[9px] border border-[#345871] bg-[#0a1925] px-2.5 py-2 text-left text-[#eaf3f8]"
                type="button"
                onClick={() => onSelectProjectId(project.project_id)}
              >
                <span className="min-w-0 break-words">
                  {project.cluster_name} • {getOutlierLabel(project.outlier_flag)}
                </span>
                <strong className="shrink-0">{project.bbr_z_score.toFixed(2)} z</strong>
              </button>
            </li>
          ))}
        </ul>
      )}
      {projectDetailLoading ? <p>Loading comparable projects...</p> : null}
      {!projectDetailLoading && projectDetail ? (
        <div className="mt-1 border-t border-dashed border-[#35566f] pt-2">
          <p>
            <strong>{projectDetail.project_name}</strong>
          </p>
          <p className="text-sm text-[#9db7c8]">
            Budget ${Math.round(projectDetail.metrics.budget_usd).toLocaleString()} • Targeted{" "}
            {Math.round(projectDetail.metrics.people_targeted).toLocaleString()}
          </p>
          <ul className="grid list-none gap-1.5 p-0">
            {projectDetail.comparable_projects.map((peer) => (
              <li
                key={peer.project_id}
                className="flex items-center justify-between gap-2 rounded-lg border border-[#2f5064] px-2.5 py-2"
              >
                <span className="min-w-0 break-words">
                  {peer.project_id} • {peer.rationale}
                </span>
                <strong className="shrink-0">{(peer.similarity_score * 100).toFixed(0)}%</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
