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
    <article className="integration-card dbx-panel-raised min-w-0 overflow-hidden">
      <p className="dbx-kicker">Explainability</p>
      <h2 className="dbx-title">Overlooked Crisis Index (Explainable)</h2>
      <p className="dbx-subtitle mt-2">
        OCI = 32% severity + 28% in-need rate + 22% funding gap + 18% coverage mismatch.
      </p>
      {overviewLoading ? (
        <ul className="dbx-loading list-none p-0" role="status" aria-label="Loading OCI leaderboard">
          {[0, 1, 2, 3, 4].map((idx) => (
            <li key={`oci-loading-${idx}`} className="dbx-loading-row">
              <span className={`dbx-loading-bar ${idx % 2 === 0 ? "w-3/4" : "w-5/6"}`} />
              <span className="dbx-loading-bar w-14" />
            </li>
          ))}
        </ul>
      ) : null}
      {!overviewLoading && overview ? (
        <ul className="grid list-none gap-1.5 p-0">
          {overview.top_overlooked.slice(0, 8).map((row) => (
            <li key={row.iso3}>
              <button
                className="dbx-list-button"
                type="button"
                onClick={() => {
                  onSelectIso3(row.iso3);
                  onHighlightIso3([row.iso3]);
                }}
              >
                <span className="min-w-0 break-words">
                  #{row.rank} {row.country} ({row.iso3})
                </span>
                <strong className="shrink-0">OCI {row.oci_score.toFixed(1)}</strong>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
