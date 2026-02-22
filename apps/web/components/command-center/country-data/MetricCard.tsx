"use client";

import type { LucideIcon } from "lucide-react";
import { Info } from "lucide-react";

type MetricCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  description?: string;
  tone?: "default" | "critical" | "warning" | "good";
  progressPct?: number | null;
};

function toneClasses(tone: MetricCardProps["tone"]) {
  if (tone === "critical") return "border-[#7e4950] bg-[#2d1d26]";
  if (tone === "warning") return "border-[#786643] bg-[#2c2518]";
  if (tone === "good") return "border-[#3f6f58] bg-[#172d24]";
  return "border-[#2f526b] bg-[#0f2332]";
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  description,
  tone = "default",
  progressPct = null
}: MetricCardProps) {
  const safeProgress = progressPct === null ? null : Math.max(0, Math.min(100, progressPct));

  return (
    <article className={`rounded-xl border p-2.5 ${toneClasses(tone)}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="m-0 text-[11px] uppercase tracking-[0.08em] text-[#9db9cb]">{label}</p>
        <div className="inline-flex items-center gap-1 text-[#8fb4c9]">
          <Icon className="h-3.5 w-3.5" />
          {description ? (
            <span title={description}>
              <Info className="h-3 w-3" />
            </span>
          ) : null}
        </div>
      </div>
      <p className="m-0 mt-1 text-xl font-semibold leading-tight text-[#eff7ff]">{value}</p>
      {safeProgress !== null ? (
        <div className="mt-2 h-1.5 rounded-full bg-[#22445a]">
          <div
            className={`h-full rounded-full ${
              safeProgress < 30 ? "bg-[#f08a6c]" : safeProgress < 60 ? "bg-[#e6be67]" : "bg-[#88d6c0]"
            }`}
            style={{ width: `${safeProgress.toFixed(0)}%` }}
            aria-hidden
          />
        </div>
      ) : null}
    </article>
  );
}
