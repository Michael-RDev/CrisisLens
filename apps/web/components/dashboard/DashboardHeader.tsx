"use client";

import { StatPill } from "@/components/dashboard/ui-kit";

type DashboardHeaderProps = {
  generatedAt: string;
};

export function DashboardHeader({ generatedAt }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-20 mb-4 rounded-2xl border border-[#23455d] bg-[linear-gradient(180deg,rgba(14,34,49,0.95)_0%,rgba(11,24,36,0.92)_100%)] p-4 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="m-0 text-xs uppercase tracking-[0.08em] text-[#9eb8ca]">CrisisLens</p>
          <h1 className="m-0 text-2xl font-semibold tracking-[0.01em] text-[#edf7ff] sm:text-3xl">Command Center</h1>
          <p className="m-0 mt-1 text-xs text-[#9db6c8]">Last refresh {new Date(generatedAt).toLocaleString()}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatPill>Production-ready UI</StatPill>
          <StatPill>Env: local</StatPill>
        </div>
      </div>
    </header>
  );
}
