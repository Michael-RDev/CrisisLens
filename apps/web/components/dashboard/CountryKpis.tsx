"use client";

import { GeoInsight, GeoMetrics } from "@/lib/api/crisiswatch";
import { LoadingSkeleton, MetricCard, SectionCard } from "@/components/dashboard/ui-kit";

type CountryKpisProps = {
  metrics: GeoMetrics | null;
  insight: GeoInsight | null;
  loading?: boolean;
  error?: string | null;
  className?: string;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Math.max(0, value));
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Math.max(0, value));
}

export function CountryKpis({ metrics, insight, loading = false, error = null, className }: CountryKpisProps) {

  return (
    <SectionCard
      className={className}
      title={
        metrics ? `${metrics.country} (${metrics.iso3})` : "Country Snapshot"
      }
      subtitle={metrics ? `Databricks metrics • ${metrics.year}` : "Select a country on the globe"}
    >
      {loading ? (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          <LoadingSkeleton className="h-24" />
          <LoadingSkeleton className="h-24" />
          <LoadingSkeleton className="h-24" />
          <LoadingSkeleton className="h-24" />
          <LoadingSkeleton className="h-24" />
          <LoadingSkeleton className="h-24" />
        </div>
      ) : error ? (
        <p className="rounded-lg border border-[#8a3d47] bg-[#3b1a22] p-2 text-sm">{error}</p>
      ) : metrics ? (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          <MetricCard label="Coverage %" value={`${metrics.coverage_pct.toFixed(1)}%`} />
          <MetricCard label="People In Need" value={formatCompact(metrics.people_in_need)} />
          <MetricCard label="People Targeted" value={formatCompact(metrics.people_targeted)} />
          <MetricCard label="Funding Received" value={formatCurrency(metrics.funding_usd)} />
          <MetricCard label="Requirements" value={formatCurrency(metrics.requirements_usd)} />
          <MetricCard label="Gap / Person" value={formatCurrency(metrics.funding_gap_per_person)} />
          <div className="col-span-2 rounded-xl border border-[#2a526d] bg-[#102739] p-3 lg:col-span-3">
            <p className="m-0 text-[11px] uppercase tracking-[0.05em] text-[#9db8ca]">Country Summary</p>
            <p className="m-0 mt-1.5 text-sm leading-6 text-[#eff8ff]">
              {insight?.summary ?? "Country-level summary will appear after selection."}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#a2bfd2]">Select a country to inspect KPI context.</p>
      )}
    </SectionCard>
  );
}
