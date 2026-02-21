"use client";

import { getLayerValue } from "@/lib/metrics";
import { CountryMetrics, LayerMode } from "@/lib/types";
import { SectionCard } from "@/components/dashboard/ui-kit";

type CountryComparisonChartPanelProps = {
  rows: CountryMetrics[];
  layerMode: LayerMode;
  selectedIso3: string | null;
  onSelectIso3: (iso3: string) => void;
};

function formatValue(value: number, layerMode: LayerMode): string {
  if (!Number.isFinite(value)) return "0";
  if (layerMode === "coverage" || layerMode === "inNeedRate") return `${(value * 100).toFixed(1)}%`;
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

export function CountryComparisonChartPanel({
  rows,
  layerMode,
  selectedIso3,
  onSelectIso3
}: CountryComparisonChartPanelProps) {
  const sorted = [...rows].sort((a, b) => getLayerValue(b, layerMode) - getLayerValue(a, layerMode)).slice(0, 8);
  const maxValue = Math.max(...sorted.map((row) => getLayerValue(row, layerMode)), 1);

  return (
    <SectionCard title="Visualization" subtitle={`Top countries by ${layerMode}`}>
      <div className="space-y-2">
        {sorted.map((row) => {
          const value = getLayerValue(row, layerMode);
          const widthPct = Math.max(6, Math.round((value / maxValue) * 100));
          const isSelected = selectedIso3 === row.iso3;

          return (
            <button
              key={row.iso3}
              type="button"
              onClick={() => onSelectIso3(row.iso3)}
              className={`w-full rounded-lg border px-2.5 py-2 text-left transition ${
                isSelected
                  ? "border-[#6ca8c9] bg-[#17364a]"
                  : "border-[#2f5064] bg-[#0f2434] hover:border-[#4e7690] hover:bg-[#143042]"
              }`}
            >
              <div className="mb-1 flex items-center justify-between text-xs text-[#c9dce9]">
                <span>
                  {row.country} ({row.iso3})
                </span>
                <strong>{formatValue(value, layerMode)}</strong>
              </div>
              <div className="h-1.5 rounded-full bg-[#0a1722]">
                <div className="h-full rounded-full bg-[#67b9f3]" style={{ width: `${widthPct}%` }} />
              </div>
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}
