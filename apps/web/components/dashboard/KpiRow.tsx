"use client";

import { useEffect, useMemo, useState } from "react";
import { MetricCard, SectionCard } from "@/components/dashboard/ui-kit";
import { AnalyticsOverviewResponse } from "@/lib/api/crisiswatch";

type KpiRowProps = {
  summary: {
    population: number;
    inNeed: number;
    fundingGap: number;
  };
  overview: AnalyticsOverviewResponse | null;
  selectedCoveragePct?: number | null;
  selectedFunding?: number | null;
  selectedRequirements?: number | null;
  selectedGapPerPerson?: number | null;
};

function useCountUp(target: number, durationMs = 600): number {
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const from = display;

    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (target - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return display;
}

function compact(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(
    Math.max(0, value)
  );
}

function currency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Math.max(0, value));
}

export function KpiRow({
  summary,
  overview,
  selectedCoveragePct,
  selectedFunding,
  selectedRequirements,
  selectedGapPerPerson
}: KpiRowProps) {
  const coverage = useCountUp(selectedCoveragePct ?? 0);
  const pin = useCountUp(summary.inNeed);
  const funding = useCountUp(selectedFunding ?? 0);
  const requirements = useCountUp(selectedRequirements ?? 0);
  const gapPerPerson = useCountUp(selectedGapPerPerson ?? 0);

  const topOverlooked = useMemo(() => overview?.top_overlooked[0] ?? null, [overview]);

  return (
    <SectionCard className="mb-4" title="Global + Country Snapshot" subtitle="Animated KPIs update on country change">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
        <MetricCard label="Coverage %" value={`${coverage.toFixed(1)}%`} hint="Selected country" />
        <MetricCard label="People In Need" value={compact(pin)} hint="Global tracked" />
        <MetricCard label="Funding" value={currency(funding)} hint="Selected country" />
        <MetricCard label="Requirements" value={currency(requirements)} hint="Selected country" />
        <MetricCard label="Gap / Person" value={currency(gapPerPerson)} hint="Selected country" />
        <MetricCard
          label="Top Overlooked"
          value={topOverlooked?.iso3 ?? "—"}
          hint={topOverlooked ? `${topOverlooked.country} • OCI ${topOverlooked.oci_score.toFixed(1)}` : "Loading"}
        />
      </div>
    </SectionCard>
  );
}
