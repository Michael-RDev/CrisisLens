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
    <article className="integration-card glass">
      <h2>Project Outliers & Benchmarks</h2>
      {projectOutliers.length === 0 ? (
        <p className="subtle">No outlier projects for this country.</p>
      ) : (
        <ul className="cluster-list">
          {projectOutliers.slice(0, 8).map((project) => (
            <li key={project.project_id}>
              <button
                className="plain-list-btn"
                type="button"
                onClick={() => onSelectProjectId(project.project_id)}
              >
                <span>
                  {project.cluster_name} • {getOutlierLabel(project.outlier_flag)}
                </span>
                <strong>{project.bbr_z_score.toFixed(2)} z</strong>
              </button>
            </li>
          ))}
        </ul>
      )}
      {projectDetailLoading ? <p>Loading comparable projects...</p> : null}
      {!projectDetailLoading && projectDetail ? (
        <div className="integration-output">
          <p>
            <strong>{projectDetail.project_name}</strong>
          </p>
          <p className="subtle">
            Budget ${Math.round(projectDetail.metrics.budget_usd).toLocaleString()} • Targeted{" "}
            {Math.round(projectDetail.metrics.people_targeted).toLocaleString()}
          </p>
          <ul className="cluster-list">
            {projectDetail.comparable_projects.map((peer) => (
              <li key={peer.project_id}>
                <span>
                  {peer.project_id} • {peer.rationale}
                </span>
                <strong>{(peer.similarity_score * 100).toFixed(0)}%</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
