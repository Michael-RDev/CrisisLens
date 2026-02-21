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
      className="kpi-grid"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay: 0.08 }}
    >
      <article>
        <h3>Population Tracked</h3>
        <p>{formatCompact(summary.population)}</p>
      </article>
      <article>
        <h3>People In Need</h3>
        <p>{formatCompact(summary.inNeed)}</p>
      </article>
      <article>
        <h3>Funding Gap</h3>
        <p>${formatCompact(summary.fundingGap)}</p>
      </article>
      <article>
        <h3>Top Overlooked</h3>
        <p>{overview?.top_overlooked[0]?.iso3 ?? "—"}</p>
        <small>
          OCI {overview?.top_overlooked[0]?.oci_score?.toFixed(1) ?? "—"} •{" "}
          {overview?.top_overlooked[0]?.country ?? "Loading"}
        </small>
      </article>
    </motion.section>
  );
}
