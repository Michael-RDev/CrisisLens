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
    <article className="integration-card glass">
      <h2>Overlooked Crisis Index (Explainable)</h2>
      <p className="subtle">
        OCI = 32% severity + 28% in-need rate + 22% funding gap + 18% coverage mismatch.
      </p>
      {overviewLoading ? <p>Loading OCI leaderboard...</p> : null}
      {!overviewLoading && overview ? (
        <ul className="cluster-list">
          {overview.top_overlooked.slice(0, 8).map((row) => (
            <li key={row.iso3}>
              <button
                className="plain-list-btn"
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
