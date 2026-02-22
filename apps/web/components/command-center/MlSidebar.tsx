"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Minimize2, Search } from "lucide-react";
import { LayerControls } from "@/components/command-center/LayerControls";
import { LayerMode } from "@/lib/types";

type MlSidebarProps = {
  side?: "left" | "right";
  open: boolean;
  selectedCountryLabel: string;
  statusLabel: string;
  generatedAt: string;
  layerMode: LayerMode;
  query: string;
  countrySuggestions: string[];
  onLayerChange: (mode: LayerMode) => void;
  onQueryChange: (value: string) => void;
  onJump: () => void;
  onToggleOpen: () => void;
  children: React.ReactNode;
};

export function MlSidebar({
  side = "right",
  open,
  selectedCountryLabel,
  statusLabel,
  generatedAt,
  layerMode,
  query,
  countrySuggestions,
  onLayerChange,
  onQueryChange,
  onJump,
  onToggleOpen,
  children
}: MlSidebarProps) {
  const reducedMotion = useReducedMotion();
  const isRight = side === "right";
  const desktopPanelWidth = 470;
  const desktopHiddenOffset = desktopPanelWidth + 48;

  return (
    <>
      <motion.aside
        initial={reducedMotion ? false : { opacity: 0, x: 24 }}
        animate={{
          opacity: 1,
          x: open ? 0 : isRight ? desktopHiddenOffset : -desktopHiddenOffset,
          width: desktopPanelWidth
        }}
        transition={{ duration: reducedMotion ? 0 : 0.23, ease: "easeOut" }}
        className={`pointer-events-auto fixed inset-y-16 z-30 hidden flex-col rounded-2xl border border-white/20 bg-[#d4e8fa1c] p-3 shadow-[0_18px_50px_-24px_rgba(13,36,58,0.55)] backdrop-blur-md md:flex ${
          isRight ? "right-3" : "left-3"
        }`}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="m-0 truncate text-sm font-semibold text-[#eff8ff]">{selectedCountryLabel}</p>
            <p className="m-0 mt-0.5 text-[11px] text-[#d1e3ef]">{statusLabel}</p>
            <p className="m-0 mt-0.5 text-[10px] text-[#b7cedd]" suppressHydrationWarning>
              ML refresh {new Date(generatedAt).toLocaleTimeString()}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleOpen}
            className="rounded-md border border-[#87b4d0] bg-[#1b4865]/70 p-1.5 text-[#e5f4ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ad8ff]"
            aria-label="Close sidebar"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mb-2">
          <p className="mb-1 text-[11px] uppercase tracking-[0.09em] text-[#cfe2ee]">ML Workspace</p>
          <div className="flex items-center gap-1.5">
            <input
              className="min-w-0 flex-1 rounded-lg border border-[#7ea6c2]/50 bg-[#123249]/70 px-2.5 py-1.5 text-xs text-[#ecf7ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9cdcff]"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Country or ISO3"
              list="country-suggestions-ml-sidebar"
            />
            <datalist id="country-suggestions-ml-sidebar">
              {countrySuggestions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <button
              type="button"
              onClick={onJump}
              className="inline-flex items-center gap-1 rounded-lg border border-[#8ab6d3] bg-[#1f5678]/80 px-2 py-1.5 text-xs text-[#edf8ff]"
            >
              <Search className="h-3 w-3" />
              Jump
            </button>
          </div>
        </div>

        <LayerControls layerMode={layerMode} onChange={onLayerChange} />
        <div className="mt-3 min-h-0 flex-1 overflow-auto pr-1">{children}</div>
      </motion.aside>

      <motion.aside
        initial={false}
        animate={{ y: open ? "0%" : "110%" }}
        transition={{ duration: reducedMotion ? 0 : 0.22, ease: "easeOut" }}
        className="pointer-events-auto fixed inset-x-2 bottom-2 top-16 z-30 flex flex-col rounded-2xl border border-white/20 bg-[#d4e8fa1c] p-3 shadow-[0_18px_50px_-24px_rgba(13,36,58,0.55)] backdrop-blur-md md:hidden"
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="m-0 truncate text-sm font-semibold text-[#eff8ff]">{selectedCountryLabel}</p>
            <p className="m-0 mt-0.5 text-[11px] text-[#d1e3ef]">{statusLabel}</p>
          </div>
          <button
            type="button"
            onClick={onToggleOpen}
            className="rounded-md border border-[#87b4d0] bg-[#1b4865]/70 p-1.5 text-[#e5f4ff]"
            aria-label="Close sidebar"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <LayerControls layerMode={layerMode} onChange={onLayerChange} />
        <div className="mt-2 min-h-0 flex-1 overflow-auto pr-1">{children}</div>
      </motion.aside>
    </>
  );
}
