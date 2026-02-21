"use client";

import dynamic from "next/dynamic";
import { LayerMode, CountryMetrics } from "@/lib/types";
import { SectionCard, StatPill } from "@/components/dashboard/ui-kit";

const Globe3D = dynamic(() => import("@/components/Globe3D"), {
  ssr: false,
  loading: () => <div className="globe-canvas globe-loading">Loading 3D globe...</div>
});

type GlobeCardProps = {
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

export function GlobeCard({
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
}: GlobeCardProps) {
  return (
    <SectionCard
      className="h-auto"
      title="Globe Intelligence"
      subtitle="Pinch, drag, hover, and jump to countries"
      rightSlot={<StatPill>{layerMode}</StatPill>}
    >
      <div className="mb-2 flex flex-col gap-2 sm:flex-row">
        <input
          className="min-w-0 flex-1 rounded-[10px] border border-[#2f5168] bg-[#0a1824] px-3 py-2 text-[#eaf3f8]"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Jump to country or ISO3"
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
          className="rounded-[10px] border border-[#4a6e86] bg-[#1f4056] px-3 py-2 text-sm font-semibold text-[#f7fbff]"
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

      <div className="mt-2 rounded-lg border border-dashed border-[#35566f] bg-[#0f2333] p-2 text-xs text-[#b5c8d6]">
        {hoverText}
      </div>
    </SectionCard>
  );
}
