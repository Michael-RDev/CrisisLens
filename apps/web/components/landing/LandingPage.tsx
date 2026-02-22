"use client";

import { LandingNav } from "@/components/landing/LandingNav";
import { ImmersiveHero } from "@/components/landing/ImmersiveHero";
import { MetricTiles } from "@/components/landing/MetricTiles";
import { SnapshotTeaser } from "@/components/landing/SnapshotTeaser";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { MinimalFooter } from "@/components/landing/MinimalFooter";

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#040b15] text-[#eef7ff]">
      <LandingNav />
      <ImmersiveHero />
      <main className="space-y-10 pb-4 sm:space-y-12">
        <MetricTiles />
        <SnapshotTeaser />
        <FinalCTA />
      </main>
      <MinimalFooter />
    </div>
  );
}
