"use client";

import { SimulationResponse } from "@/lib/api/crisiswatch";
import { SectionCard } from "@/components/dashboard/ui-kit";

type WhatIfSimulatorPanelProps = {
  selectedIso3: string | null;
  allocationUsd: string;
  simulationLoading: boolean;
  simulation: SimulationResponse | null;
  onAllocationChange: (value: string) => void;
  onSimulate: () => void;
};

export function WhatIfSimulatorPanel({
  selectedIso3,
  allocationUsd,
  simulationLoading,
  simulation,
  onAllocationChange,
  onSimulate
}: WhatIfSimulatorPanelProps) {
  return (
    <SectionCard title="What-if Simulator" subtitle="Model allocation changes and rank impact">
      <div className="grid gap-2">
        <input
          className="w-full rounded-[10px] border border-[#2f5067] bg-[#0a1824] px-3 py-2 text-[#eaf3f8]"
          value={allocationUsd}
          onChange={(event) => onAllocationChange(event.target.value)}
          placeholder="5000000"
          inputMode="numeric"
        />
        <button
          type="button"
          className="w-fit rounded-lg border border-[#416986] bg-[#12344a] px-3 py-2 text-sm text-[#dbeaf2] disabled:opacity-70"
          onClick={onSimulate}
          disabled={simulationLoading || !selectedIso3}
        >
          {simulationLoading ? "Simulating..." : `Simulate for ${selectedIso3 ?? "country"}`}
        </button>
      </div>

      {simulation ? (
        <div className="mt-2 rounded-xl border border-[#2f5064] bg-[#0f2434] p-2.5 text-sm">
          <p className="m-0">
            Rank delta: <strong>{simulation.rank_delta >= 0 ? "+" : ""}{simulation.rank_delta}</strong>
          </p>
          <p className="m-0">
            OCI delta: <strong>{simulation.oci_delta.toFixed(2)}</strong>
          </p>
          <p className="m-0 text-xs text-[#9db7c8]">
            Funded {simulation.base.percent_funded.toFixed(1)}% → {simulation.scenario.percent_funded.toFixed(1)}%
          </p>
        </div>
      ) : null}
    </SectionCard>
  );
}
