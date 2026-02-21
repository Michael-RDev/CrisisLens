import { motion } from "framer-motion";
import { CountryDrilldown } from "@/lib/api/crisiswatch";
import { computeDerivedMetrics } from "@/lib/metrics";
import { CountryMetrics } from "@/lib/types";

type CountryPanelProps = {
  selected: CountryMetrics | null;
  selectedCountryMeta: { name: string; iso3: string } | null;
  selectedOci: CountryDrilldown["oci"] | null;
  clusterBreakdown: CountryDrilldown["cluster_breakdown"];
};

export function CountryPanel({
  selected,
  selectedCountryMeta,
  selectedOci,
  clusterBreakdown
}: CountryPanelProps) {
  const selectedDerived = selected ? computeDerivedMetrics(selected) : null;

  return (
    <motion.article
      className="country-card dbx-panel-raised min-w-0 overflow-hidden"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay: 0.2 }}
    >
      <h2 className="dbx-title break-words">
        {selected
          ? `${selected.country} (${selected.iso3})`
          : selectedCountryMeta
            ? `${selectedCountryMeta.name} (${selectedCountryMeta.iso3})`
            : "Select a country"}
      </h2>
      {selected && selectedDerived ? (
        <dl className="mt-2 grid gap-2">
          <div className="dbx-divider flex items-center justify-between gap-2 pb-1.5">
            <dt className="min-w-0 break-words text-[#9bb0c6]">Overlooked Index (OCI)</dt>
            <dd className="m-0 shrink-0 font-bold">{selectedOci?.totalScore?.toFixed(2) ?? "—"}</dd>
          </div>
          <div className="dbx-divider flex items-center justify-between gap-2 pb-1.5">
            <dt className="min-w-0 break-words text-[#9bb0c6]">Severity Score</dt>
            <dd className="m-0 shrink-0 font-bold">{selected.severityScore.toFixed(1)}</dd>
          </div>
          <div className="dbx-divider flex items-center justify-between gap-2 pb-1.5">
            <dt className="min-w-0 break-words text-[#9bb0c6]">People In Need %</dt>
            <dd className="m-0 shrink-0 font-bold">{selectedDerived.inNeedPct.toFixed(1)}%</dd>
          </div>
          <div className="dbx-divider flex items-center justify-between gap-2 pb-1.5">
            <dt className="min-w-0 break-words text-[#9bb0c6]">Coverage %</dt>
            <dd className="m-0 shrink-0 font-bold">{selectedDerived.coveragePct.toFixed(1)}%</dd>
          </div>
          <div className="dbx-divider flex items-center justify-between gap-2 pb-1.5">
            <dt className="min-w-0 break-words text-[#9bb0c6]">Funding Gap %</dt>
            <dd className="m-0 shrink-0 font-bold">{selectedDerived.fundingGapPct.toFixed(1)}%</dd>
          </div>
        </dl>
      ) : selectedCountryMeta ? (
        <p>
          {selectedCountryMeta.name} is selected, but this country has no current metric record in the
          loaded snapshot yet.
        </p>
      ) : (
        <p>Select a country from the globe or ranking list.</p>
      )}

      <h3 className="mb-2 mt-4 text-sm text-[#b7ccda]">OCI Component Breakdown</h3>
      {selectedOci ? (
        <ul className="grid list-none gap-1.5 p-0">
          <li className="dbx-list-row">
            <span className="min-w-0 break-words">Severity Component</span>
            <strong className="shrink-0">{selectedOci.severityComponent.toFixed(1)}</strong>
          </li>
          <li className="dbx-list-row">
            <span className="min-w-0 break-words">In-Need Rate Component</span>
            <strong className="shrink-0">{selectedOci.inNeedRateComponent.toFixed(1)}</strong>
          </li>
          <li className="dbx-list-row">
            <span className="min-w-0 break-words">Funding Gap Component</span>
            <strong className="shrink-0">{selectedOci.fundingGapComponent.toFixed(1)}</strong>
          </li>
          <li className="dbx-list-row">
            <span className="min-w-0 break-words">Coverage Mismatch Component</span>
            <strong className="shrink-0">{selectedOci.coverageMismatchComponent.toFixed(1)}</strong>
          </li>
        </ul>
      ) : (
        <p className="text-sm text-[#9db7c8]">No OCI breakdown available for this selection.</p>
      )}

      <h3 className="mb-2 mt-4 text-sm text-[#b7ccda]">Cluster Outlier Severity</h3>
      <ul className="grid list-none gap-1.5 p-0">
        {clusterBreakdown.length === 0 ? (
          <li className="text-sm text-[#9db7c8]">No cluster rows available for this country.</li>
        ) : (
          clusterBreakdown.slice(0, 6).map((cluster) => (
            <li
              key={cluster.cluster_name}
              className="dbx-list-row"
            >
              <span className="min-w-0 break-words">{cluster.cluster_name}</span>
              <strong className="shrink-0">{cluster.bbr_z_score.toFixed(2)} z</strong>
            </li>
          ))
        )}
      </ul>
    </motion.article>
  );
}
