import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { LayerMode, CountryMetrics } from "@/lib/types";
import { getLayerValue } from "@/lib/metrics";
import { layerConfig } from "@/components/dashboard/layer-config";

const Globe3D = dynamic(() => import("@/components/Globe3D"), {
  ssr: false,
  loading: () => <div className="globe-canvas globe-loading">Loading 3D globe...</div>
});

type GlobePanelProps = {
  metrics: CountryMetrics[];
  layerMode: LayerMode;
  selectedIso3: string | null;
  highlightedIso3: string[];
  query: string;
  countrySuggestions: string[];
  hoverText: string;
  onSelectIso3: (iso3: string) => void;
  onHoverIso3: (iso3: string | null) => void;
  onQueryChange: (value: string) => void;
  onJump: () => void;
};

export function GlobePanel({
  metrics,
  layerMode,
  selectedIso3,
  highlightedIso3,
  query,
  countrySuggestions,
  hoverText,
  onSelectIso3,
  onHoverIso3,
  onQueryChange,
  onJump
}: GlobePanelProps) {
  return (
    <motion.article
      className="globe-card rounded-2xl border border-[#2e4f63] bg-[#10202d] p-4 xl:row-span-2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.14 }}
    >
      <div className="card-header-row flex flex-col items-stretch gap-2 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="m-0 text-xl font-semibold">Live Global Pulse</h2>
        <input
          className="min-w-0 rounded-[9px] border border-[#2f5168] bg-[#0a1824] px-3 py-2 text-[#eaf3f8] lg:min-w-[260px]"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Jump to country or ISO3 (example: Sudan, SDN)"
          aria-label="Search country"
          list="country-suggestions"
        />
        <datalist id="country-suggestions">
          {countrySuggestions.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
        <button
          type="button"
          className="cursor-pointer rounded-[9px] border border-[#4a6e86] bg-[#1f4056] px-3 py-2 font-semibold text-[#f7fbff]"
          onClick={onJump}
        >
          Jump
        </button>
      </div>
      <Globe3D
        metrics={metrics}
        layerMode={layerMode}
        selectedIso3={selectedIso3}
        highlightedIso3={highlightedIso3}
        onSelect={onSelectIso3}
        onHover={onHoverIso3}
      />
      <div className="mt-2 border-t border-dashed border-[#35566f] pt-2 text-sm text-[#b5c8d6]">
        <p>{hoverText}</p>
      </div>
    </motion.article>
  );
}

export function buildHoverText(params: {
  hoverCountryMetric?: CountryMetrics | null;
  hoverCountryMeta?: { name: string; iso3: string } | null;
  layerMode: LayerMode;
}): string {
  if (params.hoverCountryMetric) {
    const metric = params.hoverCountryMetric;
    return `${metric.country} (${metric.iso3}) • ${layerConfig[params.layerMode].label}: ${getLayerValue(
      metric,
      params.layerMode
    ).toFixed(1)}${layerConfig[params.layerMode].unit}`;
  }

  if (params.hoverCountryMeta) {
    return `${params.hoverCountryMeta.name} (${params.hoverCountryMeta.iso3}) • no metrics in current snapshot`;
  }

  return "Hover countries for details. Drag to rotate. Scroll to zoom. Pinch-control is available from the overlay.";
}
