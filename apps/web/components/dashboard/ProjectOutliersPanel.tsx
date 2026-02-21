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
    <article className="integration-card dbx-panel-raised min-w-0 overflow-hidden">
      <p className="dbx-kicker">Project Intelligence</p>
      <h2 className="dbx-title">Project Outliers & Benchmarks</h2>
      {projectOutliers.length === 0 ? (
        <p className="dbx-subtitle mt-2">No outlier projects for this country.</p>
      ) : (
        <ul className="dbx-scroll mt-2 grid list-none gap-1.5 p-0">
          {projectOutliers.slice(0, 8).map((project) => (
            <li key={project.project_id}>
              <button
                className="dbx-list-button"
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
      {projectDetailLoading ? (
        <div className="dbx-divider dbx-loading mt-1 pt-2" role="status" aria-label="Loading comparable projects">
          <span className="dbx-loading-bar w-3/4" />
          <span className="dbx-loading-bar w-2/3" />
          {[0, 1, 2].map((idx) => (
            <div key={`project-loading-${idx}`} className="dbx-loading-row">
              <span className={`dbx-loading-bar ${idx === 1 ? "w-5/6" : "w-3/4"}`} />
              <span className="dbx-loading-bar w-12" />
            </div>
          ))}
        </div>
      ) : null}
      {!projectDetailLoading && projectDetail ? (
        <div className="dbx-divider mt-1 pt-2">
          <p>
            <strong>{projectDetail.project_name}</strong>
          </p>
          <p className="dbx-subtitle mt-1">
            Budget ${Math.round(projectDetail.metrics.budget_usd).toLocaleString()} • Targeted{" "}
            {Math.round(projectDetail.metrics.people_targeted).toLocaleString()}
          </p>
          <ul className="grid list-none gap-1.5 p-0">
            {projectDetail.comparable_projects.map((peer) => (
              <li
                key={peer.project_id}
                className="dbx-list-row"
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
