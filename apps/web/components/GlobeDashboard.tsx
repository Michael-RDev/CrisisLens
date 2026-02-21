"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { countryByIso3 } from "@/lib/countries";
import {
  fetchAnalyticsOverview,
  fetchCountryDrilldown,
  fetchProjectDetail,
  queryGenie,
  simulateFundingScenario,
  subscribeToGlobeEvents
} from "@/lib/api/crisiswatch";
import type {
  AnalyticsOverviewResponse,
  CountryDrilldown,
  ProjectDetail,
  SimulationResponse
} from "@/lib/api/crisiswatch";
import { normalizeIso3, shouldApplyCVDetection } from "@/lib/cv/globeBridge";
import { getLayerValue } from "@/lib/metrics";
import { CountryMetrics, LayerMode } from "@/lib/types";
import type { DatabricksCountryState } from "@/lib/databricks/client";
import type { CVDetection } from "@/lib/cv/provider";
import {
  AgentStatePanel,
  CountryPanel,
  CvPanel,
  DatabricksChatPopup,
  DashboardFooter,
  GlobePanel,
  HeroSection,
  LayerSelector,
  OciPanel,
  PriorityRankingPanel,
  ProjectOutliersPanel,
  SimulationPanel,
  buildHoverText
} from "@/components/dashboard";
import { layerConfig } from "@/components/dashboard/layer-config";
import { getCountrySuggestions, resolveJumpToCountryIso3 } from "@/components/dashboard/dashboard-utils";

type GlobeDashboardProps = {
  metrics: CountryMetrics[];
  generatedAt: string;
};

type DashboardPanelKey = "country" | "priority" | "simulation";

const queryTemplates = [
  "What projects are most similar to the Sudan health response project and how does their efficiency compare?",
  "Rank the top 10 most overlooked crises by OCI and explain why."
];

export default function GlobeDashboard({ metrics, generatedAt }: GlobeDashboardProps) {
  const [selectedIso3, setSelectedIso3] = useState<string | null>(metrics[0]?.iso3 ?? null);
  const [hoverIso3, setHoverIso3] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [layerMode, setLayerMode] = useState<LayerMode>("overlooked");
  const [highlightedIso3, setHighlightedIso3] = useState<string[]>([]);
  const [activePanel, setActivePanel] = useState<DashboardPanelKey>("country");

  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const [agentState, setAgentState] = useState<DatabricksCountryState | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);

  const [question, setQuestion] = useState(
    "Rank the top 10 most overlooked crises by Coverage Mismatch Index"
  );
  const [genieAnswer, setGenieAnswer] = useState<string>("");
  const [genieSource, setGenieSource] = useState<string>("mock");
  const [genieResults, setGenieResults] = useState<
    Array<{ iso3: string; metric: string; score: number; rationale?: string }>
  >([]);
  const [genieLoading, setGenieLoading] = useState(false);

  const [cvFrameInput, setCvFrameInput] = useState("frame: camera stream | country=Sudan");
  const [cvDetection, setCvDetection] = useState<CVDetection | null>(null);
  const [cvLoading, setCvLoading] = useState(false);

  const [clusterBreakdown, setClusterBreakdown] = useState<CountryDrilldown["cluster_breakdown"]>([]);
  const [projectOutliers, setProjectOutliers] = useState<CountryDrilldown["outlier_projects"]>([]);
  const [selectedOci, setSelectedOci] = useState<CountryDrilldown["oci"] | null>(null);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null);
  const [projectDetailLoading, setProjectDetailLoading] = useState(false);

  const [allocationUsd, setAllocationUsd] = useState("5000000");
  const [simulation, setSimulation] = useState<SimulationResponse | null>(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [workspacePanelHeight, setWorkspacePanelHeight] = useState<number | null>(null);
  const leftStackRef = useRef<HTMLDivElement | null>(null);

  const byIso = useMemo(() => new Map(metrics.map((item) => [item.iso3, item])), [metrics]);
  const countrySuggestions = useMemo(() => getCountrySuggestions(), []);

  const filtered = useMemo(() => {
    if (!query.trim()) return metrics;
    const needle = query.trim().toLowerCase();
    return metrics.filter(
      (row) => row.country.toLowerCase().includes(needle) || row.iso3.toLowerCase().includes(needle)
    );
  }, [metrics, query]);

  const selected = selectedIso3 ? byIso.get(selectedIso3) ?? null : null;
  const selectedCountryMeta = selectedIso3 ? countryByIso3.get(selectedIso3) ?? null : null;
  const hoverCountryMetric = hoverIso3 ? byIso.get(hoverIso3) ?? null : null;
  const hoverCountryMeta = hoverIso3 ? countryByIso3.get(hoverIso3) ?? null : null;
  const selectedLayerValue = selected ? getLayerValue(selected, layerMode) : null;
  const selectedLabel = selected
    ? selected.country
    : selectedCountryMeta
      ? selectedCountryMeta.name
      : "No country selected";

  const ranked = useMemo(() => {
    return [...filtered]
      .sort((a, b) => getLayerValue(b, layerMode) - getLayerValue(a, layerMode))
      .slice(0, 12);
  }, [filtered, layerMode]);

  const hoverText = buildHoverText({ hoverCountryMetric, hoverCountryMeta, layerMode });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const leftStack = leftStackRef.current;
    if (!leftStack) return;

    const breakpoint = window.matchMedia("(min-width: 1536px)");
    const syncWorkspaceHeight = () => {
      if (!breakpoint.matches) {
        setWorkspacePanelHeight(null);
        return;
      }

      const nextHeight = Math.round(leftStack.getBoundingClientRect().height);
      setWorkspacePanelHeight((currentHeight) => (currentHeight === nextHeight ? currentHeight : nextHeight));
    };

    syncWorkspaceHeight();
    const observer = new ResizeObserver(syncWorkspaceHeight);
    observer.observe(leftStack);

    if (breakpoint.addEventListener) {
      breakpoint.addEventListener("change", syncWorkspaceHeight);
    } else {
      breakpoint.addListener(syncWorkspaceHeight);
    }

    return () => {
      observer.disconnect();
      if (breakpoint.removeEventListener) {
        breakpoint.removeEventListener("change", syncWorkspaceHeight);
      } else {
        breakpoint.removeListener(syncWorkspaceHeight);
      }
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setOverviewLoading(true);

    fetchAnalyticsOverview()
      .then((payload) => {
        if (!controller.signal.aborted) setOverview(payload);
      })
      .finally(() => {
        if (!controller.signal.aborted) setOverviewLoading(false);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedIso3) {
      setAgentState(null);
      setClusterBreakdown([]);
      setProjectOutliers([]);
      setSelectedProjectId(null);
      setProjectDetail(null);
      setSelectedOci(null);
      return;
    }

    const controller = new AbortController();
    setAgentLoading(true);

    Promise.all([
      fetch(`/api/agent/country/${selectedIso3}`, { signal: controller.signal }).then(async (res) => {
        if (!res.ok) throw new Error("Agent fetch failed");
        return (await res.json()) as DatabricksCountryState;
      }),
      fetchCountryDrilldown(selectedIso3)
    ])
      .then(([agent, drilldown]) => {
        if (controller.signal.aborted) return;
        setAgentState(agent);
        setClusterBreakdown(drilldown.cluster_breakdown);
        setProjectOutliers(drilldown.outlier_projects);
        setSelectedOci(drilldown.oci);
        setSelectedProjectId((current) => {
          if (current && drilldown.hrp_project_list.some((project) => project.project_id === current)) {
            return current;
          }
          return drilldown.outlier_projects[0]?.project_id ?? drilldown.hrp_project_list[0]?.project_id ?? null;
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setAgentState(null);
          setClusterBreakdown([]);
          setProjectOutliers([]);
          setSelectedProjectId(null);
          setProjectDetail(null);
          setSelectedOci(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setAgentLoading(false);
      });

    return () => controller.abort();
  }, [selectedIso3]);

  useEffect(() => {
    if (!selectedProjectId) {
      setProjectDetail(null);
      return;
    }
    const controller = new AbortController();
    setProjectDetailLoading(true);

    fetchProjectDetail(selectedProjectId)
      .then((payload) => {
        if (!controller.signal.aborted) setProjectDetail(payload);
      })
      .catch(() => {
        if (!controller.signal.aborted) setProjectDetail(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setProjectDetailLoading(false);
      });

    return () => controller.abort();
  }, [selectedProjectId]);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_GLOBE_WS_URL;
    if (!wsUrl) return;

    const unsubscribe = subscribeToGlobeEvents(wsUrl, (event) => {
      if (event.type === "anomaly") {
        setHighlightedIso3([event.iso3]);
        setSelectedIso3(event.iso3);
      }
      if (event.type === "highlight") {
        setHighlightedIso3(event.iso3);
        if (event.iso3[0]) setSelectedIso3(event.iso3[0]);
      }
    });

    return unsubscribe;
  }, []);

  async function submitGenieQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) return;

    setGenieLoading(true);
    try {
      const data = await queryGenie({ nl_query: question, iso3: selectedIso3 ?? undefined });
      setGenieAnswer(data.answer);
      setGenieSource(data.source ?? "mock");
      setGenieResults(data.results ?? []);
      setHighlightedIso3(data.highlight_iso3);
      if (data.highlight_iso3[0]) setSelectedIso3(data.highlight_iso3[0]);
    } catch {
      setGenieAnswer("Unable to reach Genie endpoint. Check backend wiring and auth.");
      setGenieSource("error");
      setGenieResults([]);
    } finally {
      setGenieLoading(false);
    }
  }

  async function triggerCvDetection() {
    setCvLoading(true);
    try {
      const response = await fetch("/api/cv/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: cvFrameInput })
      });
      if (!response.ok) throw new Error("CV request failed");

      const payload = (await response.json()) as { detection: CVDetection | null };
      setCvDetection(payload.detection);
      if (shouldApplyCVDetection(payload.detection)) {
        const iso3 = normalizeIso3(payload.detection!.iso3);
        if (byIso.has(iso3)) {
          setSelectedIso3(iso3);
        }
      }
    } catch {
      setCvDetection(null);
    } finally {
      setCvLoading(false);
    }
  }

  async function runSimulation() {
    if (!selectedIso3) return;
    const parsed = Number(allocationUsd.replace(/,/g, ""));
    if (!Number.isFinite(parsed) || parsed < 0) return;

    setSimulationLoading(true);
    try {
      const payload = await simulateFundingScenario({
        iso3: selectedIso3,
        allocation_usd: parsed
      });
      setSimulation(payload);
      setHighlightedIso3(payload.top_overlooked_after.slice(0, 3).map((item) => item.iso3));
    } catch {
      setSimulation(null);
    } finally {
      setSimulationLoading(false);
    }
  }

  function jumpToCountry() {
    const iso3 = resolveJumpToCountryIso3(query);
    if (iso3) {
      setSelectedIso3(iso3);
    }
  }

  return (
    <main className="dbx-workspace">
      <HeroSection generatedAt={generatedAt} />

      <section className="dashboard-grid mt-4 grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] 2xl:items-start">
        <div ref={leftStackRef} className="grid min-w-0 content-start gap-3">
          <motion.section
            className="dbx-panel"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.36, ease: "easeOut" }}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="dbx-kicker">Display Layer</p>
                <h2 className="dbx-title">Signal Overlay</h2>
                <p className="dbx-subtitle mt-1">Choose the metric used to color the globe and rankings.</p>
              </div>
            </div>
            <LayerSelector layerMode={layerMode} onChange={setLayerMode} />
          </motion.section>
          <GlobePanel
            metrics={metrics}
            layerMode={layerMode}
            selectedIso3={selectedIso3}
            highlightedIso3={highlightedIso3}
            query={query}
            countrySuggestions={countrySuggestions}
            hoverText={hoverText}
            onSelectIso3={setSelectedIso3}
            onHoverIso3={setHoverIso3}
            onQueryChange={setQuery}
            onJump={jumpToCountry}
          />
        </div>

        <motion.aside
          className="dbx-panel flex min-h-0 min-w-0 flex-col overflow-hidden"
          style={
            workspacePanelHeight !== null
              ? {
                  height: workspacePanelHeight,
                  maxHeight: workspacePanelHeight
                }
              : undefined
          }
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, ease: "easeOut" }}
        >
          <p className="dbx-kicker">Decision Workspace</p>
          <h2 className="dbx-title">Operations Panels</h2>
          <div role="tablist" aria-label="Operations panel selector" className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              role="tab"
              aria-selected={activePanel === "country"}
              className={`dbx-tab ${activePanel === "country" ? "dbx-tab-active" : ""}`}
              onClick={() => setActivePanel("country")}
            >
              Country Ops
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activePanel === "priority"}
              className={`dbx-tab ${activePanel === "priority" ? "dbx-tab-active" : ""}`}
              onClick={() => setActivePanel("priority")}
            >
              Priority View
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activePanel === "simulation"}
              className={`dbx-tab ${activePanel === "simulation" ? "dbx-tab-active" : ""}`}
              onClick={() => setActivePanel("simulation")}
            >
              Simulation
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-[var(--dbx-border-soft)] bg-[var(--dbx-surface-strong)] p-3 sm:grid-cols-3">
            <div className="min-w-0">
              <p className="dbx-kicker">Focus Country</p>
              <p className="m-0 pt-1 text-sm font-semibold break-words">{selectedLabel}</p>
            </div>
            <div className="min-w-0">
              <p className="dbx-kicker">Active Layer</p>
              <p className="m-0 pt-1 text-sm font-semibold">
                {layerConfig[layerMode].label}
                {selectedLayerValue !== null ? ` • ${selectedLayerValue.toFixed(1)}` : ""}
              </p>
            </div>
            <div className="min-w-0">
              <p className="dbx-kicker">Highlights</p>
              <p className="m-0 pt-1 text-sm font-semibold">{highlightedIso3.length} active</p>
            </div>
          </div>

          <div
            className="dbx-scroll mt-3 grid min-w-0 flex-1 content-start gap-3 overflow-x-hidden 2xl:min-h-0 2xl:overflow-y-auto"
            role="tabpanel"
          >
            {activePanel === "country" ? (
              <div className="grid min-w-0 gap-3 2xl:grid-cols-2">
                <div className="min-w-0">
                  <CountryPanel
                    selected={selected}
                    selectedCountryMeta={selectedCountryMeta}
                    selectedOci={selectedOci}
                    clusterBreakdown={clusterBreakdown}
                  />
                </div>
                <div className="grid min-w-0 content-start gap-3">
                  <AgentStatePanel
                    selectedIso3={selectedIso3}
                    agentLoading={agentLoading}
                    agentState={agentState}
                  />
                  <CvPanel
                    cvFrameInput={cvFrameInput}
                    cvLoading={cvLoading}
                    cvDetection={cvDetection}
                    onCvInputChange={setCvFrameInput}
                    onDetect={triggerCvDetection}
                  />
                </div>
              </div>
            ) : null}

            {activePanel === "priority" ? (
              <div className="grid min-w-0 gap-3">
                <h3 className="dbx-title text-lg">Priority Stack</h3>
                <div className="grid min-w-0 gap-3 2xl:grid-cols-2">
                  <div className="min-w-0">
                    <PriorityRankingPanel
                      ranked={ranked}
                      layerMode={layerMode}
                      onSelectIso3={setSelectedIso3}
                    />
                  </div>
                  <div className="grid min-w-0 content-start gap-3">
                    <OciPanel
                      overviewLoading={overviewLoading}
                      overview={overview}
                      onSelectIso3={setSelectedIso3}
                      onHighlightIso3={setHighlightedIso3}
                    />
                    <ProjectOutliersPanel
                      projectOutliers={projectOutliers}
                      projectDetailLoading={projectDetailLoading}
                      projectDetail={projectDetail}
                      onSelectProjectId={setSelectedProjectId}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {activePanel === "simulation" ? (
              <>
                <h3 className="dbx-title text-lg">Response Runbook</h3>
                <SimulationPanel
                  selectedIso3={selectedIso3}
                  allocationUsd={allocationUsd}
                  simulationLoading={simulationLoading}
                  simulation={simulation}
                  onAllocationChange={setAllocationUsd}
                  onSimulate={runSimulation}
                />
              </>
            ) : null}
          </div>
        </motion.aside>
      </section>
      <DatabricksChatPopup
        queryTemplates={queryTemplates}
        question={question}
        genieAnswer={genieAnswer}
        genieSource={genieSource}
        genieResults={genieResults}
        genieLoading={genieLoading}
        onSetQuestion={setQuestion}
        onSubmit={submitGenieQuestion}
      />
      <DashboardFooter />
    </main>
  );
}
