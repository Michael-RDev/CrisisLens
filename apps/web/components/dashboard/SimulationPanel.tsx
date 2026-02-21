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
    <article className="integration-card min-w-0 overflow-hidden rounded-2xl border border-[#2e4f63] bg-[#10202d] p-4">
      <h2 className="m-0 text-xl font-semibold">Funding What-if Simulator</h2>
      <p className="text-sm text-[#9db7c8]">
        Test how adding pooled-fund allocation changes country OCI rank and global leaderboard.
      </p>
      <div className="grid gap-2">
        <input
          className="w-full rounded-[9px] border border-[#2f5067] bg-[#0a1824] px-3 py-2 text-[#eaf3f8]"
          value={allocationUsd}
          onChange={(event) => onAllocationChange(event.target.value)}
          placeholder="5000000"
          inputMode="numeric"
        />
        <button
          type="button"
          className="w-fit cursor-pointer rounded-lg border border-[#416986] bg-[#12344a] px-3 py-2 text-[#dbeaf2] disabled:cursor-progress disabled:opacity-70"
          onClick={onSimulate}
          disabled={simulationLoading || !selectedIso3}
        >
          {simulationLoading ? "Simulating..." : `Simulate for ${selectedIso3 ?? "country"}`}
        </button>
      </div>
      {simulation ? (
        <div className="mt-1 border-t border-dashed border-[#35566f] pt-2">
          <p>
            Rank change: <strong>{simulation.rank_delta >= 0 ? "+" : ""}{simulation.rank_delta}</strong>
            {" "} | OCI delta: <strong>{simulation.oci_delta.toFixed(2)}</strong>
          </p>
          <p>
            Funded {simulation.base.percent_funded.toFixed(1)}% → {simulation.scenario.percent_funded.toFixed(1)}%
          </p>
          <p className="text-sm text-[#9db7c8]">
            New rank: #{simulation.scenario.rank} (was #{simulation.base.rank})
          </p>
        </div>
      ) : null}
    </article>
  );
}
