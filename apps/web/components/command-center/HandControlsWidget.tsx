"use client";

import { Hand, SlidersHorizontal } from "lucide-react";

export function HandControlsWidget() {
  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-20 rounded-xl border border-[#355a72]/80 bg-[#0d2535]/72 px-3 py-2 text-xs text-[#d6e7f4] backdrop-blur">
      <p className="m-0 inline-flex items-center gap-1.5">
        <Hand className="h-3.5 w-3.5" />
        Hand controls available
      </p>
      <p className="m-0 mt-1 inline-flex items-center gap-1 text-[11px] text-[#a8c0d1]">
        <SlidersHorizontal className="h-3 w-3" />
        Use the floating widget on the globe
      </p>
    </div>
  );
}

