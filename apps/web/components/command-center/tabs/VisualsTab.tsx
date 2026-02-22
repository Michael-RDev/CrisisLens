"use client";

import { useEffect, useMemo, useState } from "react";
import { CountryComparisonChartPanel } from "@/components/dashboard/CountryComparisonChartPanel";
import { GeoStrategicQueryResult } from "@/lib/api/crisiswatch";
import { LayerMode } from "@/lib/types";

type VisualMetric = "top-overlooked" | "coverage-vs-pin" | "total-funding-gap";

type VisualsTabProps = {
  rows: GeoStrategicQueryResult["rows"];
  layerMode: LayerMode;
  selectedIso3: string | null;
  loading: boolean;
  error: string | null;
  onLayerChange: (mode: LayerMode) => void;
  onSelectIso3: (iso3: string) => void;
};

const VISUAL_OPTIONS: Array<{ id: VisualMetric; label: string; mode: LayerMode }> = [
  { id: "top-overlooked", label: "Top Overlooked", mode: "overlooked" },
  { id: "coverage-vs-pin", label: "Coverage vs PIN", mode: "coverage" },
  { id: "total-funding-gap", label: "Total Funding Gap", mode: "fundingGap" }
];

function activeVisual(layerMode: LayerMode): VisualMetric {
  if (layerMode === "coverage") return "coverage-vs-pin";
  if (layerMode === "fundingGap") return "total-funding-gap";
  return "top-overlooked";
}

export function VisualsTab({
  rows,
  layerMode,
  selectedIso3,
  loading,
  error,
  onLayerChange,
  onSelectIso3
}: VisualsTabProps) {
  const active = activeVisual(layerMode);
  const years = useMemo(() => {
    const allYears = [...new Set(rows.map((row) => row.year).filter((year) => Number.isFinite(year) && year > 0))];
    return allYears.sort((a, b) => b - a);
  }, [rows]);
  const [selectedYear, setSelectedYear] = useState<"all" | number>("all");
  useEffect(() => {
    if (selectedYear === "all") return;
    if (!years.includes(selectedYear)) {
      setSelectedYear("all");
    }
  }, [selectedYear, years]);
  const filteredRows = useMemo(() => {
    if (selectedYear === "all") return rows;
    return rows.filter((row) => row.year === selectedYear);
  }, [rows, selectedYear]);

  return (
    <div id="tabpanel-visuals" role="tabpanel" aria-labelledby="tab-visuals" className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {VISUAL_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onLayerChange(option.mode)}
            className={`rounded-full border px-2.5 py-1 text-xs ${
              active === option.id
                ? "border-[#6fc4f1] bg-[#16405c] text-[#ecf7ff]"
                : "border-[#3d627a] bg-[#112d40] text-[#cfe1ee]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2">
        <label className="grid gap-1 text-xs text-[#9eb9cb]">
          Year
          <select
            className="rounded-lg border border-[#355b75] bg-[#102738] px-2 py-1.5 text-xs text-[#e6f2fb]"
            value={selectedYear === "all" ? "all" : String(selectedYear)}
            onChange={(event) => {
              const value = event.target.value;
              setSelectedYear(value === "all" ? "all" : Number(value));
            }}
          >
            <option value="all">All available years</option>
            {years.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="m-0 text-xs text-[#a9c0d2]">
        Showing {filteredRows.length} real rows from current metric layer.
      </p>

      <CountryComparisonChartPanel
        rows={filteredRows}
        layerMode={layerMode}
        selectedIso3={selectedIso3}
        loading={loading}
        error={error}
        onSelectIso3={onSelectIso3}
      />
    </div>
  );
}
