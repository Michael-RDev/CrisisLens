import { motion } from "framer-motion";
import { SimulationResponse } from "@/lib/api/crisiswatch";
import { PanelLoading } from "@/components/dashboard/PanelLoading";
import { countryByIso3 } from "@/lib/countries";

type SimulationPanelProps = {
  selectedIso3: string | null;
  allocationUsd: string;
  simulationLoading: boolean;
  simulation: SimulationResponse | null;
  onAllocationChange: (value: string) => void;
  onSimulate: () => void;
};

export function SimulationPanel({
  selectedIso3,
  allocationUsd,
  simulationLoading,
  simulation,
  onAllocationChange,
  onSimulate
}: SimulationPanelProps) {
  const selectedCountryName = selectedIso3 ? countryByIso3.get(selectedIso3)?.name ?? selectedIso3 : null;

  return (
    <motion.article
      className="min-w-0 overflow-hidden rounded-2xl border border-[var(--dbx-border-soft)] bg-[var(--dbx-surface-raised)] p-4 text-[var(--dbx-text)]"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: "easeOut" }}
    >
      <p className="m-0 font-['IBM_Plex_Mono','SFMono-Regular',Menlo,monospace] text-xs uppercase tracking-[0.14em] text-[var(--dbx-accent-soft)]">
        Scenario Modeling
      </p>
      <h2 className="m-0 text-xl font-semibold text-[var(--dbx-text)]">Funding What-if Simulator</h2>
      <p className="m-0 mt-2 text-sm leading-relaxed text-[var(--dbx-text-muted)]">
        Test how adding pooled-fund allocation changes country OCI rank and global leaderboard.
      </p>
      <div className="grid gap-2">
        <input
          className="min-w-0 w-full rounded-[10px] border border-[var(--dbx-input-border)] bg-[var(--dbx-input-bg)] px-3 py-2 text-sm text-[var(--dbx-text)]"
          value={allocationUsd}
          onChange={(event) => onAllocationChange(event.target.value)}
          placeholder="5000000"
          inputMode="numeric"
        />
        <button
          type="button"
          className="inline-flex w-fit items-center justify-center rounded-[10px] border border-[var(--dbx-accent)] bg-[var(--dbx-accent)] px-3 py-2 text-sm font-semibold text-[#140a08] transition-colors hover:border-[var(--dbx-accent-soft)] hover:bg-[var(--dbx-accent-soft)] disabled:cursor-progress disabled:opacity-70"
          onClick={onSimulate}
          disabled={simulationLoading || !selectedIso3}
        >
          {simulationLoading ? "Loading..." : `Simulate for ${selectedCountryName ?? "country"}`}
        </button>
      </div>
      {simulationLoading ? (
        <PanelLoading label="Running funding simulation" rows={1} className="mt-1 border-t border-dashed border-[var(--dbx-border)] pt-2" />
      ) : simulation ? (
        <div className="mt-1 border-t border-dashed border-[var(--dbx-border)] pt-2">
          <p>
            Rank change: <strong>{simulation.rank_delta >= 0 ? "+" : ""}{simulation.rank_delta}</strong>
            {" "} | OCI delta: <strong>{simulation.oci_delta.toFixed(2)}</strong>
          </p>
          <p>
            Funded {simulation.base.percent_funded.toFixed(1)}% → {simulation.scenario.percent_funded.toFixed(1)}%
          </p>
          <p className="m-0 mt-1 text-sm leading-relaxed text-[var(--dbx-text-muted)]">
            New rank: #{simulation.scenario.rank} (was #{simulation.base.rank})
          </p>
        </div>
      ) : null}
    </motion.article>
  );
}
