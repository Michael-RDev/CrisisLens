import { motion } from "framer-motion";
import { CountryDrilldown, ProjectDetail } from "@/lib/api/crisiswatch";
import { getOutlierLabel } from "@/components/dashboard/dashboard-utils";
import { PanelLoading } from "@/components/dashboard/PanelLoading";

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
    <motion.article
      className="min-w-0 overflow-hidden rounded-2xl border border-[var(--dbx-border-soft)] bg-[var(--dbx-surface-raised)] p-4 text-[var(--dbx-text)]"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: "easeOut" }}
    >
      <p className="m-0 font-['IBM_Plex_Mono','SFMono-Regular',Menlo,monospace] text-xs uppercase tracking-[0.14em] text-[var(--dbx-accent-soft)]">
        Project Intelligence
      </p>
      <h2 className="m-0 text-xl font-semibold text-[var(--dbx-text)]">Project Outliers & Benchmarks</h2>
      {projectOutliers.length === 0 ? (
        <p className="m-0 mt-2 text-sm leading-relaxed text-[var(--dbx-text-muted)]">
          No outlier projects for this country.
        </p>
      ) : (
        <ul className="[scrollbar-width:thin] [scrollbar-color:var(--dbx-scroll-thumb)_var(--dbx-scroll-track)] mt-2 grid list-none gap-1.5 p-0">
          {projectOutliers.slice(0, 8).map((project) => (
            <li key={project.project_id}>
              <button
                className="flex w-full items-center justify-between gap-2 rounded-[10px] border border-[var(--dbx-list-border)] bg-[var(--dbx-list-bg)] px-2.5 py-2 text-left text-sm text-[var(--dbx-text)] transition-colors hover:border-[var(--dbx-cyan)]"
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
        <PanelLoading
          label="Loading comparable projects"
          rows={3}
          className="mt-1 border-t border-dashed border-[var(--dbx-border)] pt-2"
        />
      ) : null}
      {!projectDetailLoading && projectDetail ? (
        <div className="mt-1 border-t border-dashed border-[var(--dbx-border)] pt-2">
          <p>
            <strong>{projectDetail.project_name}</strong>
          </p>
          <p className="m-0 mt-1 text-sm leading-relaxed text-[var(--dbx-text-muted)]">
            Budget ${Math.round(projectDetail.metrics.budget_usd).toLocaleString()} • Targeted{" "}
            {Math.round(projectDetail.metrics.people_targeted).toLocaleString()}
          </p>
          <ul className="grid list-none gap-1.5 p-0">
            {projectDetail.comparable_projects.map((peer) => (
              <li
                key={peer.project_id}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--dbx-list-border)] bg-[var(--dbx-list-bg)] px-2.5 py-2 text-sm"
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
    </motion.article>
  );
}
