import { AnalyticsOverviewResponse } from "@/lib/api/crisiswatch";
import { PanelLoading } from "@/components/dashboard/PanelLoading";

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
      {overviewLoading ? <PanelLoading label="Loading OCI leaderboard" rows={5} /> : null}
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
