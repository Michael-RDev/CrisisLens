import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import type { SimulationImpactArc } from "@/lib/globe/simulation-arcs";
import { LayerMode, CountryMetrics } from "@/lib/types";
import { getLayerValue } from "@/lib/metrics";
import { layerConfig } from "@/components/dashboard/layer-config";
import { PanelLoading } from "@/components/dashboard/PanelLoading";

const Globe3D = dynamic(() => import("@/components/Globe3D"), {
  ssr: false,
  loading: () => (
    <div className="globe-canvas globe-loading">
      <div className="w-full max-w-[460px]">
        <PanelLoading label="Loading 3D globe" rows={3} />
      </div>
    </div>
  )
});

type GlobePanelProps = {
  metrics: CountryMetrics[];
  layerMode: LayerMode;
  selectedIso3: string | null;
  highlightedIso3: string[];
  simulationArcs: SimulationImpactArc[];
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
  simulationArcs,
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
      className="min-w-0 overflow-hidden rounded-2xl border border-[var(--dbx-border)] bg-[var(--dbx-surface)] p-4 text-[var(--dbx-text)] shadow-[0_10px_30px_rgba(3,8,14,0.35)] xl:row-span-2"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: "easeOut" }}
    >
      <div className="flex min-w-0 flex-col items-stretch gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="min-w-0 lg:flex-[1_1_220px]">
          <p className="m-0 font-['IBM_Plex_Mono','SFMono-Regular',Menlo,monospace] text-xs uppercase tracking-[0.14em] text-[var(--dbx-accent-soft)]">
            Realtime Geospatial Layer
          </p>
          <h2 className="m-0 text-xl font-semibold text-[var(--dbx-text)]">Live Global Pulse</h2>
        </div>
        <input
          className="w-full min-w-0 rounded-[10px] border border-[var(--dbx-input-border)] bg-[var(--dbx-input-bg)] px-3 py-2 text-sm text-[var(--dbx-text)] lg:w-auto lg:flex-[1_1_220px]"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Jump to country (example: Sudan)"
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
          className="inline-flex shrink-0 items-center justify-center rounded-[10px] border border-[var(--dbx-btn-secondary-border)] bg-[var(--dbx-btn-secondary-bg)] px-3 py-2 text-sm font-semibold text-[var(--dbx-btn-secondary-text)] transition-colors hover:border-[var(--dbx-cyan)] hover:text-[var(--dbx-text)]"
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
        simulationArcs={simulationArcs}
        onSelect={onSelectIso3}
        onHover={onHoverIso3}
      />
      <div className="mt-2 border-t border-dashed border-[var(--dbx-border)] pt-2 text-sm text-[var(--dbx-text-muted)]">
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
    return `${metric.country} • ${layerConfig[params.layerMode].label}: ${getLayerValue(
      metric,
      params.layerMode
    ).toFixed(1)}${layerConfig[params.layerMode].unit}`;
  }

  if (params.hoverCountryMeta) {
    return `${params.hoverCountryMeta.name} • no metrics in current snapshot`;
  }

  return "Hover countries for details. Drag to rotate. Scroll to zoom. Pinch-control is available from the overlay.";
}
