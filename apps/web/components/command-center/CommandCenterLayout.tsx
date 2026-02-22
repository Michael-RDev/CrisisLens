"use client";

import { Download, Share2, Search } from "lucide-react";
import { layerConfig } from "@/components/dashboard/layer-config";
import { LayerMode } from "@/lib/types";

type CommandCenterLayoutProps = {
  generatedAt: string;
  layerMode: LayerMode;
  query: string;
  countrySuggestions: string[];
  hoverText: string;
  onLayerChange: (mode: LayerMode) => void;
  onQueryChange: (value: string) => void;
  onJump: () => void;
  globe: React.ReactNode;
  rightPanel: React.ReactNode;
  handControls?: React.ReactNode;
};

const PRIMARY_MODES: LayerMode[] = ["severity", "fundingGap", "coverage", "overlooked"];

export function CommandCenterLayout({
  generatedAt,
  layerMode,
  query,
  countrySuggestions,
  hoverText,
  onLayerChange,
  onQueryChange,
  onJump,
  globe,
  rightPanel,
  handControls
}: CommandCenterLayoutProps) {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#040d14] text-[#eaf3f8]">
      <div className="absolute inset-0 z-0">{globe}</div>
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_15%_10%,rgba(32,97,133,0.3),transparent_36%),radial-gradient(circle_at_80%_80%,rgba(86,53,151,0.2),transparent_42%),linear-gradient(180deg,rgba(2,8,14,0.55)_0%,rgba(2,8,14,0.65)_100%)]" />

      <header className="pointer-events-none fixed left-3 right-3 top-3 z-20 rounded-2xl border border-white/15 bg-[#081e2e]/72 px-3 py-3 shadow-[0_20px_50px_-35px_rgba(9,24,38,0.92)] backdrop-blur md:left-4 md:right-4 md:px-4">
        <div className="pointer-events-auto grid gap-2 md:grid-cols-[auto_1fr_auto] md:items-center">
          <div>
            <p className="m-0 text-xs uppercase tracking-[0.08em] text-[#9eb8ca]">CrisisLens</p>
            <h1 className="m-0 text-lg font-semibold tracking-[0.01em] text-[#edf7ff] sm:text-xl">Command Center</h1>
            <p className="m-0 text-[11px] text-[#9db6c8]">Last refresh {new Date(generatedAt).toLocaleString()}</p>
          </div>

          <div className="grid gap-2">
            <div className="flex flex-wrap gap-1.5">
              {PRIMARY_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onLayerChange(mode)}
                  className={`rounded-full border px-2.5 py-1 text-xs ${
                    mode === layerMode
                      ? "border-[#78c9f2] bg-[#17425d] text-[#eef8ff]"
                      : "border-[#355b74] bg-[#102b3e] text-[#c9deed]"
                  }`}
                >
                  {layerConfig[mode].label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <div className="min-w-0 flex-1">
                <input
                  className="w-full rounded-lg border border-[#355a73] bg-[#0a1824] px-2.5 py-1.5 text-sm text-[#eaf3f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#78d1ff]"
                  value={query}
                  onChange={(event) => onQueryChange(event.target.value)}
                  placeholder="Jump to country or ISO3"
                  aria-label="Jump to country"
                  list="country-suggestions-overlay"
                />
                <datalist id="country-suggestions-overlay">
                  {countrySuggestions.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </div>
              <button
                type="button"
                onClick={onJump}
                className="inline-flex items-center gap-1 rounded-lg border border-[#4a6f86] bg-[#11324a] px-2.5 py-1.5 text-xs text-[#e2eef7]"
              >
                <Search className="h-3.5 w-3.5" />
                Jump
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:justify-self-end">
            <button className="inline-flex items-center gap-1 rounded-lg border border-[#3a637c] bg-[#12344a] px-2.5 py-1.5 text-xs text-[#e1eef7]">
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            <button className="inline-flex items-center gap-1 rounded-lg border border-[#3a637c] bg-[#12344a] px-2.5 py-1.5 text-xs text-[#e1eef7]">
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
          </div>
        </div>
      </header>

      <div className="pointer-events-none fixed bottom-4 left-1/2 z-20 w-[min(90vw,760px)] -translate-x-1/2 rounded-lg border border-[#35566f]/80 bg-[#0f2333]/72 px-3 py-2 text-xs text-[#b5c8d6] backdrop-blur">
        {hoverText}
      </div>

      {handControls}
      {rightPanel}
    </main>
  );
}

