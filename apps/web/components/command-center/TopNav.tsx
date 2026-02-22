"use client";

import Link from "next/link";
import { Download, Share2, Globe2 } from "lucide-react";

type TopNavProps = {
  onExport?: () => void;
  onShare?: () => void;
};

export function TopNav({ onExport, onShare }: TopNavProps) {
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
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-1 rounded-lg border border-[#84b3d5] bg-[#1c4f6f]/65 px-2.5 py-1 text-xs text-[#edf8ff] transition hover:bg-[#22618b]"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button
            type="button"
            onClick={onShare}
            className="inline-flex items-center gap-1 rounded-lg border border-[#84b3d5] bg-[#1c4f6f]/65 px-2.5 py-1 text-xs text-[#edf8ff] transition hover:bg-[#22618b]"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
        </div>
      </nav>
    </header>
  );
}

