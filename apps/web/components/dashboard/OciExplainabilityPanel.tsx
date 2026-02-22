"use client";

import { AnalyticsOverviewResponse } from "@/lib/api/crisiswatch";
import { ActionChip, SectionCard } from "@/components/dashboard/ui-kit";

type OciExplainabilityPanelProps = {
  overviewLoading: boolean;
  overview: AnalyticsOverviewResponse | null;
  onSelectIso3: (iso3: string) => void;
  onHighlightIso3: (iso3: string[]) => void;
};

export function OciExplainabilityPanel({
  overviewLoading,
  overview,
  onSelectIso3,
  onHighlightIso3
}: OciExplainabilityPanelProps) {
  return (
    <SectionCard
      title="OCI Explainability"
      subtitle="Weighting and high-priority country ranking"
      rightSlot={<ActionChip>32/28/22/18</ActionChip>}
    >
      <p className="mt-0 text-xs text-[#9db7c8]">
        Severity 32% • In-Need rate 28% • Funding gap 22% • Coverage mismatch 18%
      </p>
      {overviewLoading ? <p className="text-sm text-[#9db7c8]">Loading OCI leaderboard...</p> : null}
      {!overviewLoading && overview ? (
        <ul className="grid list-none gap-1.5 p-0">
          {overview.top_overlooked.slice(0, 8).map((row) => (
            <li key={row.iso3}>
              <button
                className="flex w-full items-center justify-between rounded-[10px] border border-[#345871] bg-[#0b1f2d] px-2.5 py-2 text-left text-sm text-[#eaf3f8] transition hover:border-[#5e83a0]"
                type="button"
                onClick={() => {
                  onSelectIso3(row.iso3);
                  onHighlightIso3([row.iso3]);
                }}
              >
                <span>
                  #{row.rank} {row.country} ({row.iso3})
                </span>
                <strong>OCI {row.oci_score.toFixed(1)}</strong>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </SectionCard>
  );
}
