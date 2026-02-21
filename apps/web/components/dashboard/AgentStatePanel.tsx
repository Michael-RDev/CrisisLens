import { motion } from "framer-motion";
import { getRiskClass } from "@/components/dashboard/dashboard-utils";
import { PanelLoading } from "@/components/dashboard/PanelLoading";
import { countryByIso3 } from "@/lib/countries";
import { DatabricksCountryState } from "@/lib/databricks/client";

type AgentStatePanelProps = {
  selectedIso3: string | null;
  agentLoading: boolean;
  agentState: DatabricksCountryState | null;
};

export function AgentStatePanel({ selectedIso3, agentLoading, agentState }: AgentStatePanelProps) {
  const selectedCountryName = selectedIso3 ? countryByIso3.get(selectedIso3)?.name ?? selectedIso3 : null;

  return (
    <motion.article
      className="integration-card dbx-panel-raised min-w-0 overflow-hidden"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: "easeOut" }}
    >
      <p className="dbx-kicker">Agent Runtime</p>
      <h2 className="dbx-title">Databricks Agent State</h2>
      {selectedCountryName ? <p className="dbx-subtitle mt-1">Country scope: {selectedCountryName}</p> : null}
      {agentLoading ? <PanelLoading label="Loading agent state" rows={2} /> : null}
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
        <PanelLoading label="Loading risk drivers" rows={2} className="mt-1" />
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
        <PanelLoading label="Loading recommended actions" rows={2} className="mt-1" />
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
    </motion.article>
  );
}
