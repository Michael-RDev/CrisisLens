import { AnalyticsOverviewResponse } from "@/lib/api/crisiswatch";

type OciPanelProps = {
  overviewLoading: boolean;
  overview: AnalyticsOverviewResponse | null;
  onSelectIso3: (iso3: string) => void;
  onHighlightIso3: (iso3: string[]) => void;
};

export function OciPanel({
  overviewLoading,
  overview,
  onSelectIso3,
  onHighlightIso3
}: OciPanelProps) {
  return (
    <article className="integration-card rounded-2xl border border-[#2e4f63] bg-[#10202d] p-4">
      <h2 className="m-0 text-xl font-semibold">Overlooked Crisis Index (Explainable)</h2>
      <p className="text-sm text-[#9db7c8]">
        OCI = 32% severity + 28% in-need rate + 22% funding gap + 18% coverage mismatch.
      </p>
      {overviewLoading ? <p>Loading OCI leaderboard...</p> : null}
      {!overviewLoading && overview ? (
        <ul className="grid list-none gap-1.5 p-0">
          {overview.top_overlooked.slice(0, 8).map((row) => (
            <li key={row.iso3}>
              <button
                className="plain-list-btn flex w-full cursor-pointer items-center justify-between rounded-[9px] border border-[#345871] bg-[#0a1925] px-2.5 py-2 text-left text-[#eaf3f8]"
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
    </article>
  );
}
