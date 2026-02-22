"use client";

import { Download } from "lucide-react";
import { CountryComparisonChartPanel } from "@/components/dashboard/CountryComparisonChartPanel";
import { GeoStrategicQueryResult } from "@/lib/api/crisiswatch";
import { LayerMode } from "@/lib/types";

type VisualMetric = "top-overlooked" | "coverage-vs-pin" | "gap-per-person";

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
  { id: "gap-per-person", label: "Funding Gap per Person", mode: "severity" }
];

function activeVisual(layerMode: LayerMode): VisualMetric {
  if (layerMode === "coverage") return "coverage-vs-pin";
  if (layerMode === "severity") return "gap-per-person";
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

      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-xs text-[#9eb9cb]">
          Year
          <select className="rounded-lg border border-[#355b75] bg-[#102738] px-2 py-1.5 text-xs text-[#e6f2fb]">
            <option>Latest</option>
            <option>2026</option>
            <option>2025</option>
            <option>2024</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs text-[#9eb9cb]">
          Region
          <select className="rounded-lg border border-[#355b75] bg-[#102738] px-2 py-1.5 text-xs text-[#e6f2fb]">
            <option>All regions</option>
            <option>Africa</option>
            <option>Middle East</option>
            <option>Asia</option>
            <option>Americas</option>
          </select>
        </label>
      </div>

      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-lg border border-[#4c738d] bg-[#11354c] px-3 py-1.5 text-xs text-[#dcebf7]"
      >
        <Download className="h-3.5 w-3.5" />
        Export PNG
      </button>

      <CountryComparisonChartPanel
        rows={rows}
        layerMode={layerMode}
        selectedIso3={selectedIso3}
        loading={loading}
        error={error}
        onSelectIso3={onSelectIso3}
      />
    </div>
  );
}

