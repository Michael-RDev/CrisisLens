import { SimulationResponse } from "@/lib/api/crisiswatch";

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
  return (
    <article className="integration-card dbx-panel-raised min-w-0 overflow-hidden">
      <p className="dbx-kicker">Scenario Modeling</p>
      <h2 className="dbx-title">Funding What-if Simulator</h2>
      <p className="dbx-subtitle mt-2">
        Test how adding pooled-fund allocation changes country OCI rank and global leaderboard.
      </p>
      <div className="grid gap-2">
        <input
          className="dbx-input w-full"
          value={allocationUsd}
          onChange={(event) => onAllocationChange(event.target.value)}
          placeholder="5000000"
          inputMode="numeric"
        />
        <button
          type="button"
          className="dbx-btn-primary w-fit disabled:cursor-progress disabled:opacity-70"
          onClick={onSimulate}
          disabled={simulationLoading || !selectedIso3}
        >
          {simulationLoading ? "Simulating..." : `Simulate for ${selectedIso3 ?? "country"}`}
        </button>
      </div>
      {simulation ? (
        <div className="dbx-divider mt-1 pt-2">
          <p>
            Rank change: <strong>{simulation.rank_delta >= 0 ? "+" : ""}{simulation.rank_delta}</strong>
            {" "} | OCI delta: <strong>{simulation.oci_delta.toFixed(2)}</strong>
          </p>
          <p>
            Funded {simulation.base.percent_funded.toFixed(1)}% → {simulation.scenario.percent_funded.toFixed(1)}%
          </p>
          <p className="dbx-subtitle mt-1">
            New rank: #{simulation.scenario.rank} (was #{simulation.base.rank})
          </p>
        </div>
      ) : null}
    </article>
  );
}
