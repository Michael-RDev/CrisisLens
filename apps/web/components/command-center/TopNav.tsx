"use client";

import Link from "next/link";
import { Globe2, Menu } from "lucide-react";
import type { MapLayerKey } from "@/lib/services/databricks";

type TopNavProps = {
  sidebarOpen: boolean;
  layer: MapLayerKey;
  onToggleSidebar: () => void;
  onLayerChange: (layer: MapLayerKey) => void;
};

export function TopNav({
  sidebarOpen,
  layer,
  onToggleSidebar,
  onLayerChange
}: TopNavProps) {
  return (
    <header className="pointer-events-none fixed left-3 right-3 top-3 z-20 md:left-4 md:right-4">
      <nav className="pointer-events-auto grid h-12 grid-cols-[1fr_auto] items-center rounded-xl border border-white/25 bg-[#d8ebff1f] px-3 shadow-[0_10px_24px_-16px_rgba(9,25,39,0.45)] backdrop-blur-md">
        <div className="flex items-center gap-2 justify-self-start">
          <Link
            href="/"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#8ab8d8] bg-[#0f2e43]/70 text-[#dff3ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7fd3ff]"
            aria-label="Go to CrisisLens home"
          >
            <Globe2 className="h-4 w-4" />
          </Link>
          <div>
            <p className="m-0 text-sm font-semibold tracking-tight text-[#eef8ff]">CrisisLens</p>
            <p className="m-0 text-[10px] uppercase tracking-[0.09em] text-[#c2d8e8]">Global Map</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 justify-self-end">
          <label className="sr-only" htmlFor="map-layer-select">Map layer</label>
          <select
            id="map-layer-select"
            value={layer}
            onChange={(event) => onLayerChange(event.target.value as MapLayerKey)}
            className="w-40 rounded-lg border border-[#84b3d5] bg-[#1c4f6f]/65 px-2.5 py-1 text-xs text-[#edf8ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9fd8ff]"
            aria-label="Map layers"
          >
            <option value="severity">Severity</option>
            <option value="funding_gap">Funding Gap</option>
            <option value="coverage">Coverage</option>
            <option value="oci">Overlooked Index (OCI)</option>
          </select>
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex items-center gap-1 rounded-lg border border-[#84b3d5] bg-[#1c4f6f]/65 px-2.5 py-1 text-xs text-[#edf8ff] transition hover:bg-[#22618b]"
            aria-label={sidebarOpen ? "Close insights panel" : "Open insights panel"}
          >
            <Menu className="h-3.5 w-3.5" />
            Menu
          </button>
        </div>
      </nav>
    </header>
  );
}
