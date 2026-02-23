"use client";

import Link from "next/link";
import { Globe2 } from "lucide-react";

export function LandingNav() {
  return (
    <header className="fixed left-3 right-3 top-3 z-30 md:left-6 md:right-6" role="banner">
      <nav className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between rounded-xl border border-[#6e9fbe4d] bg-[#091724c7] px-3 shadow-[0_18px_40px_-26px_rgba(0,0,0,0.75)] backdrop-blur-md md:px-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md text-[#eff8ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7fcbff]"
          aria-label="CrisisLens home"
        >
          <span className="inline-grid h-8 w-8 place-items-center rounded-lg border border-[#7ab5d5] bg-[#103249]">
            <Globe2 className="h-4 w-4" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold tracking-tight">CrisisLens</span>
            <span className="block text-[10px] uppercase tracking-[0.1em] text-[#bbd4e5]">Global Map</span>
          </span>
        </Link>

        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-lg border border-[#8dcaf0] bg-[#1a4e71] px-3 py-1.5 text-sm font-medium text-[#eff8ff] transition hover:bg-[#226794] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93dbff]"
        >
          Open Command Center
        </Link>
      </nav>
    </header>
  );
}
