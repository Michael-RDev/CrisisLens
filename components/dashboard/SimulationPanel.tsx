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
    <article className="integration-card glass">
      <h2>Funding What-if Simulator</h2>
      <p className="subtle">
        Test how adding pooled-fund allocation changes country OCI rank and global leaderboard.
      </p>
      <div className="integration-form">
        <input
          value={allocationUsd}
          onChange={(event) => onAllocationChange(event.target.value)}
          placeholder="5000000"
          inputMode="numeric"
        />
        <button type="button" onClick={onSimulate} disabled={simulationLoading || !selectedIso3}>
          {simulationLoading ? "Simulating..." : `Simulate for ${selectedIso3 ?? "country"}`}
        </button>
      </div>
      {simulation ? (
        <div className="integration-output">
          <p>
            Rank change: <strong>{simulation.rank_delta >= 0 ? "+" : ""}{simulation.rank_delta}</strong>
            {" "} | OCI delta: <strong>{simulation.oci_delta.toFixed(2)}</strong>
          </p>
          <p>
            Funded {simulation.base.percent_funded.toFixed(1)}% → {simulation.scenario.percent_funded.toFixed(1)}%
          </p>
          <p className="subtle">
            New rank: #{simulation.scenario.rank} (was #{simulation.base.rank})
          </p>
        </div>
      ) : null}
    </article>
  );
}
