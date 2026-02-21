import { getRiskClass } from "@/components/dashboard/dashboard-utils";
import { DatabricksCountryState } from "@/lib/databricks/client";

type AgentStatePanelProps = {
  selectedIso3: string | null;
  agentLoading: boolean;
  agentState: DatabricksCountryState | null;
};

export function AgentStatePanel({ selectedIso3, agentLoading, agentState }: AgentStatePanelProps) {
  return (
    <article className="integration-card dbx-panel-raised min-w-0 overflow-hidden">
      <p className="dbx-kicker">Agent Runtime</p>
      <h2 className="dbx-title">Databricks Agent State</h2>
      {selectedIso3 ? <p className="dbx-subtitle mt-1">Country scope: {selectedIso3}</p> : null}
      {agentLoading ? (
        <div className="dbx-loading" role="status" aria-label="Loading agent state">
          <div className="dbx-loading-row">
            <span className="dbx-loading-bar w-28" />
            <span className="dbx-loading-bar w-16" />
          </div>
          <div className="dbx-loading-row">
            <span className="dbx-loading-bar w-4/5" />
            <span className="dbx-loading-bar w-12" />
          </div>
          <span className="dbx-loading-bar h-9 w-full" />
        </div>
      ) : null}
      {!agentLoading && agentState ? (
        <>
          <p className={getRiskClass(agentState.riskBand)}>Risk band: {agentState.riskBand ?? "n/a"}</p>
          <p className="dbx-subtitle mt-1">
            Confidence: {agentState.confidence ? `${(agentState.confidence * 100).toFixed(0)}%` : "n/a"}
          </p>
          <p className="dbx-subtitle mt-1 break-words">{agentState.narrative}</p>
        </>
      ) : null}
      <h3 className="mb-1 mt-3 text-sm text-[var(--dbx-text-muted)]">Mock Risk Drivers</h3>
      {agentLoading ? (
        <ul className="grid list-none gap-1.5 p-0 animate-pulse" aria-hidden>
          {[0, 1, 2].map((idx) => (
            <li key={`driver-loading-${idx}`} className="dbx-loading-row">
              <span className={`dbx-loading-bar ${idx === 0 ? "w-5/6" : idx === 1 ? "w-3/4" : "w-2/3"}`} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid list-none gap-1.5 p-0">
          {(agentState?.riskDrivers?.length
            ? agentState.riskDrivers.slice(0, 3)
            : ["Agent mock signals will appear once country state is available."]
          ).map((driver) => (
            <li key={driver} className="dbx-list-row break-words">
              {driver}
            </li>
          ))}
        </ul>
      )}
      <h3 className="mb-1 mt-2 text-sm text-[var(--dbx-text-muted)]">Mock Recommended Actions</h3>
      {agentLoading ? (
        <ul className="grid list-none gap-1.5 p-0 animate-pulse" aria-hidden>
          {[0, 1, 2].map((idx) => (
            <li key={`action-loading-${idx}`} className="dbx-loading-row">
              <span className={`dbx-loading-bar ${idx === 0 ? "w-4/5" : idx === 1 ? "w-5/6" : "w-3/4"}`} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid list-none gap-1.5 p-0">
          {(agentState?.recommendedActions?.length
            ? agentState.recommendedActions.slice(0, 3)
            : ["Actions are generated from mock heuristics in this demo mode."]
          ).map((action) => (
            <li key={action} className="dbx-list-row break-words">
              {action}
            </li>
          ))}
        </ul>
      )}
      {!agentLoading && !agentState ? (
        <p className="dbx-subtitle mt-2">No agent payload. Wire Databricks serving endpoint next.</p>
      ) : null}
    </article>
  );
}
