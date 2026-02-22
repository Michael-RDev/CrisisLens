import { motion } from "framer-motion";
import { formatCompact } from "@/components/summary-utils";
import { AnalyticsOverviewResponse } from "@/lib/api/crisiswatch";

type KpiGridProps = {
  summary: {
    population: number;
    inNeed: number;
    fundingGap: number;
  };
  overview: AnalyticsOverviewResponse | null;
};

export function KpiGrid({ summary, overview }: KpiGridProps) {
  return (
    <motion.section
      className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay: 0.08 }}
    >
      <article className="rounded-2xl border border-[var(--dbx-border-soft)] bg-[var(--dbx-surface-raised)] p-4 text-[var(--dbx-text)]">
        <h3 className="m-0 text-xs uppercase tracking-[0.04em] text-[var(--dbx-text-muted)]">Population Tracked</h3>
        <p className="my-2 text-3xl font-bold">{formatCompact(summary.population)}</p>
      </article>
      <article className="rounded-2xl border border-[var(--dbx-border-soft)] bg-[var(--dbx-surface-raised)] p-4 text-[var(--dbx-text)]">
        <h3 className="m-0 text-xs uppercase tracking-[0.04em] text-[var(--dbx-text-muted)]">People In Need</h3>
        <p className="my-2 text-3xl font-bold">{formatCompact(summary.inNeed)}</p>
      </article>
      <article className="rounded-2xl border border-[var(--dbx-border-soft)] bg-[var(--dbx-surface-raised)] p-4 text-[var(--dbx-text)]">
        <h3 className="m-0 text-xs uppercase tracking-[0.04em] text-[var(--dbx-text-muted)]">Funding Gap</h3>
        <p className="my-2 text-3xl font-bold">${formatCompact(summary.fundingGap)}</p>
      </article>
      <article className="rounded-2xl border border-[var(--dbx-border-soft)] bg-[var(--dbx-surface-raised)] p-4 text-[var(--dbx-text)]">
        <h3 className="m-0 text-xs uppercase tracking-[0.04em] text-[var(--dbx-text-muted)]">Top Overlooked</h3>
        <p className="my-2 text-2xl font-bold leading-tight break-words">{overview?.top_overlooked[0]?.country ?? "—"}</p>
        <small className="text-[var(--dbx-text-muted)]">
          OCI {overview?.top_overlooked[0]?.oci_score?.toFixed(1) ?? "—"} •{" "}
          Rank #{overview?.top_overlooked[0]?.rank ?? "—"}
        </small>
      </article>
    </motion.section>
  );
}
