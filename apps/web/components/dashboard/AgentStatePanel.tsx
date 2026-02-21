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
      className="min-w-0 overflow-hidden rounded-2xl border border-[var(--dbx-border-soft)] bg-[var(--dbx-surface-raised)] p-4 text-[var(--dbx-text)]"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: "easeOut" }}
    >
      <p className="m-0 font-['IBM_Plex_Mono','SFMono-Regular',Menlo,monospace] text-xs uppercase tracking-[0.14em] text-[var(--dbx-accent-soft)]">
        Agent Runtime
      </p>
      <h2 className="m-0 text-xl font-semibold text-[var(--dbx-text)]">Databricks Agent State</h2>
      {selectedCountryName ? (
        <p className="m-0 mt-1 text-sm leading-relaxed text-[var(--dbx-text-muted)]">
          Country scope: {selectedCountryName}
        </p>
      ) : null}
      {agentLoading ? <PanelLoading label="Loading agent state" rows={2} /> : null}
      {!agentLoading && agentState ? (
        <>
          <p className={getRiskClass(agentState.riskBand)}>Risk band: {agentState.riskBand ?? "n/a"}</p>
          <p className="m-0 mt-1 text-sm leading-relaxed text-[var(--dbx-text-muted)]">
            Confidence: {agentState.confidence ? `${(agentState.confidence * 100).toFixed(0)}%` : "n/a"}
          </p>
          <p className="m-0 mt-1 break-words text-sm leading-relaxed text-[var(--dbx-text-muted)]">
            {agentState.narrative}
          </p>
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
            <li
              key={driver}
              className="flex items-center justify-between gap-2 rounded-lg border border-[var(--dbx-list-border)] bg-[var(--dbx-list-bg)] px-2.5 py-2 text-sm break-words"
            >
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
            <li
              key={action}
              className="flex items-center justify-between gap-2 rounded-lg border border-[var(--dbx-list-border)] bg-[var(--dbx-list-bg)] px-2.5 py-2 text-sm break-words"
            >
              {action}
            </li>
          ))}
        </ul>
      )}
      {!agentLoading && !agentState ? (
        <p className="m-0 mt-2 text-sm leading-relaxed text-[var(--dbx-text-muted)]">
          No agent payload. Wire Databricks serving endpoint next.
        </p>
      ) : null}
    </motion.article>
  );
}
