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
      <article className="rounded-2xl border border-[#2e4f63] bg-[#10202d] p-4">
        <h3 className="m-0 text-xs uppercase tracking-[0.04em] text-[#9fc0d3]">Population Tracked</h3>
        <p className="my-2 text-3xl font-bold">{formatCompact(summary.population)}</p>
      </article>
      <article className="rounded-2xl border border-[#2e4f63] bg-[#10202d] p-4">
        <h3 className="m-0 text-xs uppercase tracking-[0.04em] text-[#9fc0d3]">People In Need</h3>
        <p className="my-2 text-3xl font-bold">{formatCompact(summary.inNeed)}</p>
      </article>
      <article className="rounded-2xl border border-[#2e4f63] bg-[#10202d] p-4">
        <h3 className="m-0 text-xs uppercase tracking-[0.04em] text-[#9fc0d3]">Funding Gap</h3>
        <p className="my-2 text-3xl font-bold">${formatCompact(summary.fundingGap)}</p>
      </article>
      <article className="rounded-2xl border border-[#2e4f63] bg-[#10202d] p-4">
        <h3 className="m-0 text-xs uppercase tracking-[0.04em] text-[#9fc0d3]">Top Overlooked</h3>
        <p className="my-2 text-3xl font-bold">{overview?.top_overlooked[0]?.iso3 ?? "—"}</p>
        <small className="text-[#9fc0d3]">
          OCI {overview?.top_overlooked[0]?.oci_score?.toFixed(1) ?? "—"} •{" "}
          {overview?.top_overlooked[0]?.country ?? "Loading"}
        </small>
      </article>
    </motion.section>
  );
}
