"use client";

import { GeoStrategicQueryResult } from "@/lib/api/crisiswatch";
import { LayerMode } from "@/lib/types";
import { ActionChip, SectionCard } from "@/components/dashboard/ui-kit";

type CountryComparisonChartPanelProps = {
  rows: GeoStrategicQueryResult["rows"];
  layerMode: LayerMode;
  selectedIso3: string | null;
  loading?: boolean;
  error?: string | null;
  className?: string;
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

function metricValue(
  row: GeoStrategicQueryResult["rows"][number],
  layerMode: LayerMode
): number {
  if (layerMode === "coverage") return row.coverage_pct;
  if (layerMode === "inNeedRate") return row.people_in_need;
  if (layerMode === "severity") return row.funding_gap_per_person;
  return row.funding_gap_usd;
}

export function CountryComparisonChartPanel({
  rows,
  layerMode,
  selectedIso3,
  loading = false,
  error = null,
  className,
  onSelectIso3
}: CountryComparisonChartPanelProps) {
  const ranked = rows.slice(0, 10);

  const width = 640;
  const height = 220;
  const padding = { top: 16, right: 16, bottom: 36, left: 18 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...ranked.map((row) => metricValue(row, layerMode)), 1);

  const points = ranked.map((row, index) => {
    const x = padding.left + (index * plotWidth) / Math.max(ranked.length - 1, 1);
    const y = padding.top + (1 - metricValue(row, layerMode) / maxValue) * plotHeight;
    return { x, y, row };
  });

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${padding.top + plotHeight} L ${points[0].x} ${
        padding.top + plotHeight
      } Z`
    : "";

  return (
    <SectionCard className={className} title="Visualization" subtitle={`Top 10 countries by ${layerMode}`}>
      {error ? <p className="mb-2 rounded-lg border border-[#8a3d47] bg-[#3b1a22] p-2 text-sm">{error}</p> : null}
      <div className="rounded-xl border border-[#2f5064] bg-[#0c1d2b] p-2.5">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[220px] w-full"
          role="img"
          aria-label="Country ranking area chart"
        >
          <defs>
            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6ad0ff" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#6ad0ff" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          <line
            x1={padding.left}
            y1={padding.top + plotHeight}
            x2={width - padding.right}
            y2={padding.top + plotHeight}
            stroke="#284b63"
            strokeWidth="1"
          />

          {areaPath ? <path d={areaPath} fill="url(#chartFill)" /> : null}
          {linePath ? <path d={linePath} fill="none" stroke="#7fd8ff" strokeWidth="2.4" /> : null}

          {!loading &&
            points.map((point) => {
            const isSelected = point.row.iso3 === selectedIso3;
            return (
              <g key={`${point.row.iso3}-${point.row.country}`}>
                <circle cx={point.x} cy={point.y} r={isSelected ? 4 : 2.8} fill={isSelected ? "#ffd98c" : "#8bd8ff"} />
                <text x={point.x} y={height - 14} textAnchor="middle" className="fill-[#b7cddd] text-[10px]">
                  {point.row.iso3}
                </text>
              </g>
            );
            })}
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {ranked.slice(0, 6).map((row) => (
          <ActionChip key={row.iso3} onClick={() => onSelectIso3(row.iso3)} disabled={row.iso3 === selectedIso3}>
            {row.iso3} {formatValue(metricValue(row, layerMode), layerMode)}
          </ActionChip>
        ))}
      </div>
    </SectionCard>
  );
}
