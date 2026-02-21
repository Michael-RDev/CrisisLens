"use client";

import { CountryDrilldown } from "@/lib/api/crisiswatch";
import { computeDerivedMetrics } from "@/lib/metrics";
import { CountryMetrics } from "@/lib/types";
import { MetricCard, SectionCard } from "@/components/dashboard/ui-kit";

type CountryKpisProps = {
  selected: CountryMetrics | null;
  selectedCountryMeta: { name: string; iso3: string } | null;
  selectedOci: CountryDrilldown["oci"] | null;
};

export function CountryKpis({ selected, selectedCountryMeta, selectedOci }: CountryKpisProps) {
  const derived = selected ? computeDerivedMetrics(selected) : null;

  return (
    <SectionCard
      title={
        selected
          ? `${selected.country} (${selected.iso3})`
          : selectedCountryMeta
            ? `${selectedCountryMeta.name} (${selectedCountryMeta.iso3})`
            : "Country Snapshot"
      }
      subtitle="Compact KPI context for selected country"
    >
      {selected && derived ? (
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="OCI" value={selectedOci?.totalScore?.toFixed(1) ?? "—"} />
          <MetricCard label="Severity" value={selected.severityScore.toFixed(1)} />
          <MetricCard label="In Need %" value={`${derived.inNeedPct.toFixed(1)}%`} />
          <MetricCard label="Funding Gap %" value={`${derived.fundingGapPct.toFixed(1)}%`} />
        </div>
      ) : (
        <p className="text-sm text-[#a2bfd2]">Select a country to inspect KPI context.</p>
      )}
    </SectionCard>
  );
}
