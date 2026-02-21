import { getRiskClass } from "@/components/dashboard/dashboard-utils";
import { DatabricksCountryState } from "@/lib/databricks/client";

type AgentStatePanelProps = {
  selectedIso3: string | null;
  agentLoading: boolean;
  agentState: DatabricksCountryState | null;
};

export function AgentStatePanel({ selectedIso3, agentLoading, agentState }: AgentStatePanelProps) {
  return (
    <article className="integration-card rounded-2xl border border-[#2e4f63] bg-[#10202d] p-4">
      <h2 className="m-0 text-xl font-semibold">Databricks Agent State</h2>
      {selectedIso3 ? <p className="text-sm text-[#9db7c8]">Country scope: {selectedIso3}</p> : null}
      {agentLoading ? <p>Loading agent state...</p> : null}
      {!agentLoading && agentState ? (
        <>
          <p className={getRiskClass(agentState.riskBand)}>Risk band: {agentState.riskBand ?? "n/a"}</p>
          <p>{agentState.narrative}</p>
        </>
      ) : null}
      {!agentLoading && !agentState ? (
        <p className="text-sm text-[#9db7c8]">No agent payload. Wire Databricks serving endpoint next.</p>
      ) : null}
    </article>
  );
}
