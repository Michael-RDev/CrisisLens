import { getRiskClass } from "@/components/dashboard/dashboard-utils";
import { DatabricksCountryState } from "@/lib/databricks/client";

type AgentStatePanelProps = {
  selectedIso3: string | null;
  agentLoading: boolean;
  agentState: DatabricksCountryState | null;
};

export function AgentStatePanel({ selectedIso3, agentLoading, agentState }: AgentStatePanelProps) {
  return (
    <article className="integration-card glass">
      <h2>Databricks Agent State</h2>
      {selectedIso3 ? <p className="subtle">Country scope: {selectedIso3}</p> : null}
      {agentLoading ? <p>Loading agent state...</p> : null}
      {!agentLoading && agentState ? (
        <>
          <p className={`risk-chip ${getRiskClass(agentState.riskBand)}`}>
            Risk band: {agentState.riskBand ?? "n/a"}
          </p>
          <p>{agentState.narrative}</p>
        </>
      ) : null}
      {!agentLoading && !agentState ? (
        <p className="subtle">No agent payload. Wire Databricks serving endpoint next.</p>
      ) : null}
    </article>
  );
}
