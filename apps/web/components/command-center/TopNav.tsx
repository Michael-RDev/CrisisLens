"use client";

import Link from "next/link";
import { Globe2 } from "lucide-react";

export type WorkspaceMode = "genie" | "ml";

type TopNavProps = {
  mode?: WorkspaceMode;
  onModeChange?: (mode: WorkspaceMode) => void;
};

function modeClass(active: boolean): string {
  if (active) {
    return "border-[#9fd2ef] bg-[#2a668d]/95 text-[#f0f9ff]";
  }
  return "border-[#6b97b4] bg-[#17435f]/70 text-[#d8eaf7] hover:bg-[#1f5678]/85";
}

export function TopNav({ mode = "genie", onModeChange }: TopNavProps) {
  return (
    <header className="pointer-events-none fixed left-3 right-3 top-3 z-20 md:left-4 md:right-4">
      <nav className="pointer-events-auto flex h-12 items-center justify-between rounded-xl border border-white/25 bg-[#d8ebff1f] px-3 shadow-[0_10px_24px_-16px_rgba(9,25,39,0.45)] backdrop-blur-md">
        <div className="flex items-center gap-2">
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

        <div className="flex items-center gap-1.5">
          <div className="inline-flex items-center gap-1 rounded-lg border border-[#6f9cb7] bg-[#123750]/70 p-1">
            <button
              type="button"
              onClick={() => onModeChange?.("genie")}
              className={`rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] transition ${modeClass(
                mode === "genie"
              )}`}
            >
              Genie Mode
            </button>
            <button
              type="button"
              onClick={() => onModeChange?.("ml")}
              className={`rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] transition ${modeClass(
                mode === "ml"
              )}`}
            >
              ML Mode
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
