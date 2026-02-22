"use client";

import { LayerMode } from "@/lib/types";
import { layerConfig } from "@/components/dashboard/layer-config";

type LayerControlsProps = {
  layerMode: LayerMode;
  onChange: (mode: LayerMode) => void;
};

const LAYER_MODES: LayerMode[] = ["severity", "inNeedRate", "fundingGap", "coverage", "overlooked"];

export function LayerControls({ layerMode, onChange }: LayerControlsProps) {
  return (
    <section className="rounded-xl border border-[#6f95b0]/35 bg-[#c8def114] p-2.5">
      <p className="m-0 mb-2 text-[11px] uppercase tracking-[0.09em] text-[#d0e2ef]">Map Layers</p>
      <div className="grid grid-cols-2 gap-1.5">
        {LAYER_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className={`truncate rounded-lg border px-2 py-1.5 text-xs transition ${
              mode === layerMode
                ? "border-[#97cff4] bg-[#2f7098]/75 text-[#f3faff]"
                : "border-[#7b9eb7]/45 bg-[#17374e]/55 text-[#d6e7f3] hover:bg-[#1f4660]/65"
            }`}
            aria-pressed={mode === layerMode}
          >
            {layerConfig[mode].label}
          </button>
        ))}
      </div>
    </section>
  );
}
