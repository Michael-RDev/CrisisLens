import { motion } from "framer-motion";
import { AnalyticsOverviewResponse } from "@/lib/api/crisiswatch";
import { PanelLoading } from "@/components/dashboard/PanelLoading";

type OciPanelProps = {
  overviewLoading: boolean;
  overview: AnalyticsOverviewResponse | null;
  onSelectIso3: (iso3: string) => void;
  onHighlightIso3: (iso3: string[]) => void;
};

export function OciPanel({
  overviewLoading,
  overview,
  onSelectIso3,
  onHighlightIso3
}: OciPanelProps) {
  return (
    <motion.article
      className="min-w-0 overflow-hidden rounded-2xl border border-[var(--dbx-border-soft)] bg-[var(--dbx-surface-raised)] p-4 text-[var(--dbx-text)]"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: "easeOut" }}
    >
      <p className="m-0 font-['IBM_Plex_Mono','SFMono-Regular',Menlo,monospace] text-xs uppercase tracking-[0.14em] text-[var(--dbx-accent-soft)]">
        Explainability
      </p>
      <h2 className="m-0 text-xl font-semibold text-[var(--dbx-text)]">
        Overlooked Crisis Index (Explainable)
      </h2>
      <p className="m-0 mt-2 text-sm leading-relaxed text-[var(--dbx-text-muted)]">
        OCI = 32% severity + 28% in-need rate + 22% funding gap + 18% coverage mismatch.
      </p>
      {overviewLoading ? <PanelLoading label="Loading OCI leaderboard" rows={5} /> : null}
      {!overviewLoading && overview ? (
        <ul className="grid list-none gap-1.5 p-0">
          {overview.top_overlooked.slice(0, 8).map((row) => (
            <li key={row.iso3}>
              <button
                className="flex w-full items-center justify-between gap-2 rounded-[10px] border border-[var(--dbx-list-border)] bg-[var(--dbx-list-bg)] px-2.5 py-2 text-left text-sm text-[var(--dbx-text)] transition-colors hover:border-[var(--dbx-cyan)]"
                type="button"
                onClick={() => {
                  onSelectIso3(row.iso3);
                  onHighlightIso3([row.iso3]);
                }}
              >
                <span className="min-w-0 break-words">
                  #{row.rank} {row.country}
                </span>
                <strong className="shrink-0">OCI {row.oci_score.toFixed(1)}</strong>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </motion.article>
  );
}
