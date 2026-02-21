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
          <p className="text-sm text-[#9db7c8]">
            Confidence: {agentState.confidence ? `${(agentState.confidence * 100).toFixed(0)}%` : "n/a"}
          </p>
          <p>{agentState.narrative}</p>
        </>
      ) : null}
      <h3 className="mb-1 mt-2 text-sm text-[#b7ccda]">Risk Drivers</h3>
      <ul className="grid list-none gap-1.5 p-0">
        {(agentState?.riskDrivers?.length
          ? agentState.riskDrivers.slice(0, 3)
          : ["Signals will appear once agent state is available."]
        ).map((driver) => (
          <li key={driver} className="rounded-lg border border-[#2f5064] px-2.5 py-2 text-sm">
            {driver}
          </li>
        ))}
      </ul>
      <h3 className="mb-1 mt-2 text-sm text-[#b7ccda]">Recommended Actions</h3>
      <ul className="grid list-none gap-1.5 p-0">
        {(agentState?.recommendedActions?.length
          ? agentState.recommendedActions.slice(0, 3)
          : ["Actions will appear once sufficient signals are available."]
        ).map((action) => (
          <li key={action} className="rounded-lg border border-[#2f5064] px-2.5 py-2 text-sm">
            {action}
          </li>
        ))}
      </ul>
      {!agentLoading && !agentState ? (
        <p className="text-sm text-[#9db7c8]">No agent payload. Wire Databricks serving endpoint next.</p>
      ) : null}
    </article>
  );
}
