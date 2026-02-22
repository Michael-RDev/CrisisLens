"use client";

import type { FormEvent } from "react";
import {
  AgentStatePanel,
  CountryPanel,
  CvPanel,
  GeniePanel,
  OciExplainabilityPanel,
  OutlierBenchmarkPanel,
  PriorityRankingPanel,
  SimulationPanel
} from "@/components/dashboard";
import { layerConfig } from "@/components/dashboard/layer-config";
import type { AnalyticsOverviewResponse, CountryDrilldown, ProjectDetail, SimulationResponse } from "@/lib/api/crisiswatch";
import type { CVDetection } from "@/lib/cv/provider";
import type { DatabricksCountryState } from "@/lib/databricks/client";
import type { CountryMetrics, LayerMode } from "@/lib/types";

export type MlPanelId = "country" | "priority" | "simulation" | "genie";

type MlOpsTabProps = {
  activePanel: MlPanelId;
  selectedIso3: string | null;
  selectedCountryMeta: { name: string; iso3: string } | null;
  selectedMetric: CountryMetrics | null;
  selectedOci: CountryDrilldown["oci"] | null;
  clusterBreakdown: CountryDrilldown["cluster_breakdown"];
  ranked: CountryMetrics[];
  layerMode: LayerMode;
  highlightedCount: number;
  overviewLoading: boolean;
  overview: AnalyticsOverviewResponse | null;
  agentLoading: boolean;
  agentState: DatabricksCountryState | null;
  cvFrameInput: string;
  cvLoading: boolean;
  cvDetection: CVDetection | null;
  projectOutliers: CountryDrilldown["outlier_projects"];
  projectDetailLoading: boolean;
  projectDetail: ProjectDetail | null;
  allocationUsd: string;
  simulationLoading: boolean;
  simulation: SimulationResponse | null;
  showImpactArrows: boolean;
  genieQuestion: string;
  genieAnswer: string;
  genieSource?: string;
  genieResults: Array<{ iso3: string; metric: string; score: number; rationale?: string }>;
  genieLoading: boolean;
  queryTemplates: string[];
  onPanelChange: (panel: MlPanelId) => void;
  onSelectIso3: (iso3: string) => void;
  onHighlightIso3: (iso3: string[]) => void;
  onCvInputChange: (value: string) => void;
  onDetectCv: () => void;
  onSelectProjectId: (projectId: string) => void;
  onAllocationChange: (value: string) => void;
  onAllocationAdjust: (deltaUsd: number) => void;
  onShowImpactArrowsChange: (value: boolean) => void;
  onSimulate: () => void;
  onSetGenieQuestion: (question: string) => void;
  onSubmitGenie: (event: FormEvent<HTMLFormElement>) => void;
};

function tabClass(isActive: boolean): string {
  if (isActive) {
    return "border-[#6fc4f1] bg-[#16405c] text-[#ecf7ff]";
  }
  return "border-[#3d627a] bg-[#112d40] text-[#cfe1ee]";
}

export function MlOpsTab({
  activePanel,
  selectedIso3,
  selectedCountryMeta,
  selectedMetric,
  selectedOci,
  clusterBreakdown,
  ranked,
  layerMode,
  highlightedCount,
  overviewLoading,
  overview,
  agentLoading,
  agentState,
  cvFrameInput,
  cvLoading,
  cvDetection,
  projectOutliers,
  projectDetailLoading,
  projectDetail,
  allocationUsd,
  simulationLoading,
  simulation,
  showImpactArrows,
  genieQuestion,
  genieAnswer,
  genieSource,
  genieResults,
  genieLoading,
  queryTemplates,
  onPanelChange,
  onSelectIso3,
  onHighlightIso3,
  onCvInputChange,
  onDetectCv,
  onSelectProjectId,
  onAllocationChange,
  onAllocationAdjust,
  onShowImpactArrowsChange,
  onSimulate,
  onSetGenieQuestion,
  onSubmitGenie
}: MlOpsTabProps) {
  return (
    <div id="tabpanel-ml-ops" role="tabpanel" aria-labelledby="tab-ml-ops" className="space-y-3">
      <section className="rounded-xl border border-[#31546d] bg-[#112738] p-3">
        <p className="m-0 text-xs uppercase tracking-[0.08em] text-[#9eb8ca]">ML Operations</p>
        <p className="m-0 mt-1 text-sm font-semibold text-[#edf7ff]">
          {selectedCountryMeta
            ? `${selectedCountryMeta.name} (${selectedCountryMeta.iso3})`
            : selectedIso3
              ? selectedIso3
              : "No country selected"}
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-[#2f526b] bg-[#0f2332] p-2">
            <p className="m-0 text-[11px] uppercase tracking-[0.07em] text-[#98b5c8]">Layer</p>
            <p className="m-0 mt-1 text-sm font-semibold text-[#eff7ff]">{layerConfig[layerMode].label}</p>
          </div>
          <div className="rounded-lg border border-[#2f526b] bg-[#0f2332] p-2">
            <p className="m-0 text-[11px] uppercase tracking-[0.07em] text-[#98b5c8]">Highlights</p>
            <p className="m-0 mt-1 text-sm font-semibold text-[#eff7ff]">{highlightedCount}</p>
          </div>
          <div className="rounded-lg border border-[#2f526b] bg-[#0f2332] p-2">
            <p className="m-0 text-[11px] uppercase tracking-[0.07em] text-[#98b5c8]">Ranked Rows</p>
            <p className="m-0 mt-1 text-sm font-semibold text-[#eff7ff]">{ranked.length}</p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onPanelChange("country")}
          className={`rounded-full border px-2.5 py-1 text-xs ${tabClass(activePanel === "country")}`}
        >
          Country Ops
        </button>
        <button
          type="button"
          onClick={() => onPanelChange("priority")}
          className={`rounded-full border px-2.5 py-1 text-xs ${tabClass(activePanel === "priority")}`}
        >
          Priority Stack
        </button>
        <button
          type="button"
          onClick={() => onPanelChange("simulation")}
          className={`rounded-full border px-2.5 py-1 text-xs ${tabClass(activePanel === "simulation")}`}
        >
          Simulation
        </button>
        <button
          type="button"
          onClick={() => onPanelChange("genie")}
          className={`rounded-full border px-2.5 py-1 text-xs ${tabClass(activePanel === "genie")}`}
        >
          Genie Query
        </button>
      </div>

      {activePanel === "country" ? (
        <div className="grid gap-3">
          <CountryPanel
            selected={selectedMetric}
            selectedCountryMeta={selectedCountryMeta}
            selectedOci={selectedOci}
            clusterBreakdown={clusterBreakdown}
          />
          <AgentStatePanel selectedIso3={selectedIso3} agentLoading={agentLoading} agentState={agentState} />
          <CvPanel
            cvFrameInput={cvFrameInput}
            cvLoading={cvLoading}
            cvDetection={cvDetection}
            onCvInputChange={onCvInputChange}
            onDetect={onDetectCv}
          />
        </div>
      ) : null}

      {activePanel === "priority" ? (
        <div className="grid gap-3">
          <PriorityRankingPanel ranked={ranked} layerMode={layerMode} onSelectIso3={onSelectIso3} />
          <OciExplainabilityPanel
            overviewLoading={overviewLoading}
            overview={overview}
            onSelectIso3={onSelectIso3}
            onHighlightIso3={onHighlightIso3}
          />
          <OutlierBenchmarkPanel
            projectOutliers={projectOutliers}
            projectDetailLoading={projectDetailLoading}
            projectDetail={projectDetail}
            onSelectProjectId={onSelectProjectId}
          />
        </div>
      ) : null}

      {activePanel === "simulation" ? (
        <div className="grid gap-3">
          <SimulationPanel
            selectedIso3={selectedIso3}
            allocationUsd={allocationUsd}
            simulationLoading={simulationLoading}
            simulation={simulation}
            onAllocationChange={onAllocationChange}
            onAllocationAdjust={onAllocationAdjust}
            showImpactArrows={showImpactArrows}
            onShowImpactArrowsChange={onShowImpactArrowsChange}
            onSimulate={onSimulate}
          />

          {simulation?.quarters?.length ? (
            <section className="rounded-xl border border-[#2f526b] bg-[#10283a] p-3">
              <p className="m-0 text-xs uppercase tracking-[0.07em] text-[#9eb9cb]">Quarterly Outlook</p>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-[640px] text-left text-xs text-[#d6e5f1]">
                  <thead className="border-b border-[#2d526a] bg-[#112d42] text-[#b7ccdc]">
                    <tr>
                      <th className="px-2 py-1.5 font-semibold">Quarter</th>
                      <th className="px-2 py-1.5 font-semibold">Rank</th>
                      <th className="px-2 py-1.5 font-semibold">OCI</th>
                      <th className="px-2 py-1.5 font-semibold">Projected Neglect</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulation.quarters.map((quarter) => (
                      <tr key={quarter.quarter_label} className="border-b border-[#1f3f55]">
                        <td className="px-2 py-1.5">{quarter.quarter_label}</td>
                        <td className="px-2 py-1.5">#{quarter.selected_country.rank}</td>
                        <td className="px-2 py-1.5">{quarter.selected_country.oci.toFixed(2)}</td>
                        <td className="px-2 py-1.5">{quarter.selected_country.projected_neglect.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {simulation?.leaderboard_changes?.length ? (
            <section className="rounded-xl border border-[#2f526b] bg-[#10283a] p-3">
              <p className="m-0 text-xs uppercase tracking-[0.07em] text-[#9eb9cb]">Leaderboard Shift</p>
              <ul className="mt-2 grid list-none gap-1.5 p-0 text-sm text-[#d6e5f1]">
                {simulation.leaderboard_changes.slice(0, 6).map((row) => (
                  <li key={row.iso3} className="flex items-center justify-between rounded-lg border border-[#2d526a] px-2.5 py-1.5">
                    <span>
                      {row.country} ({row.iso3})
                    </span>
                    <strong>
                      #{row.rank_before} → #{row.rank_after}
                    </strong>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      {activePanel === "genie" ? (
        <div className="grid gap-3">
          <GeniePanel
            queryTemplates={queryTemplates}
            question={genieQuestion}
            genieAnswer={genieAnswer}
            genieSource={genieSource}
            genieResults={genieResults}
            genieLoading={genieLoading}
            onSetQuestion={onSetGenieQuestion}
            onSubmit={onSubmitGenie}
          />
        </div>
      ) : null}
    </div>
  );
}
