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
      className="country-card glass"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay: 0.2 }}
    >
      <h2>
        {selected
          ? `${selected.country} (${selected.iso3})`
          : selectedCountryMeta
            ? `${selectedCountryMeta.name} (${selectedCountryMeta.iso3})`
            : "Select a country"}
      </h2>
      {selected && selectedDerived ? (
        <dl>
          <div>
            <dt>Overlooked Index (OCI)</dt>
            <dd>{selectedOci?.totalScore?.toFixed(2) ?? "—"}</dd>
          </div>
          <div>
            <dt>Severity Score</dt>
            <dd>{selected.severityScore.toFixed(1)}</dd>
          </div>
          <div>
            <dt>People In Need %</dt>
            <dd>{selectedDerived.inNeedPct.toFixed(1)}%</dd>
          </div>
          <div>
            <dt>Coverage %</dt>
            <dd>{selectedDerived.coveragePct.toFixed(1)}%</dd>
          </div>
          <div>
            <dt>Funding Gap %</dt>
            <dd>{selectedDerived.fundingGapPct.toFixed(1)}%</dd>
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

      <h3 className="panel-subtitle">OCI Component Breakdown</h3>
      {selectedOci ? (
        <ul className="cluster-list">
          <li>
            <span>Severity Component</span>
            <strong>{selectedOci.severityComponent.toFixed(1)}</strong>
          </li>
          <li>
            <span>In-Need Rate Component</span>
            <strong>{selectedOci.inNeedRateComponent.toFixed(1)}</strong>
          </li>
          <li>
            <span>Funding Gap Component</span>
            <strong>{selectedOci.fundingGapComponent.toFixed(1)}</strong>
          </li>
          <li>
            <span>Coverage Mismatch Component</span>
            <strong>{selectedOci.coverageMismatchComponent.toFixed(1)}</strong>
          </li>
        </ul>
      ) : (
        <p className="subtle">No OCI breakdown available for this selection.</p>
      )}

      <h3 className="panel-subtitle">Cluster Outlier Severity</h3>
      <ul className="cluster-list">
        {clusterBreakdown.length === 0 ? (
          <li className="subtle">No cluster rows available for this country.</li>
        ) : (
          clusterBreakdown.slice(0, 6).map((cluster) => (
            <li key={cluster.cluster_name}>
              <span>{cluster.cluster_name}</span>
              <strong>{cluster.bbr_z_score.toFixed(2)} z</strong>
            </li>
          ))
        )}
      </ul>
    </motion.article>
  );
}
