"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { computeGlobalSummary } from "@/components/summary-utils";
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
  DashboardFooter,
  GeniePanel,
  GlobePanel,
  HeroSection,
  KpiGrid,
  LayerSelector,
  OciPanel,
  PriorityRankingPanel,
  ProjectOutliersPanel,
  SimulationPanel,
  TopTabs,
  buildHoverText
} from "@/components/dashboard";
import { getCountrySuggestions, resolveJumpToCountryIso3 } from "@/components/dashboard/dashboard-utils";

type GlobeDashboardProps = {
  metrics: CountryMetrics[];
  generatedAt: string;
};

const queryTemplates = [
  "What projects are most similar to PRJ-2025-SDN-health and how does their efficiency compare?",
  "Rank the top 10 most overlooked crises by OCI and explain why."
];

export default function GlobeDashboard({ metrics, generatedAt }: GlobeDashboardProps) {
  const [selectedIso3, setSelectedIso3] = useState<string | null>(metrics[0]?.iso3 ?? null);
  const [hoverIso3, setHoverIso3] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [layerMode, setLayerMode] = useState<LayerMode>("overlooked");
  const [highlightedIso3, setHighlightedIso3] = useState<string[]>([]);

  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const [agentState, setAgentState] = useState<DatabricksCountryState | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);

  const [question, setQuestion] = useState(
    "Rank the top 10 most overlooked crises by Coverage Mismatch Index"
  );
  const [genieAnswer, setGenieAnswer] = useState<string>("");
  const [genieLoading, setGenieLoading] = useState(false);

  const [cvFrameInput, setCvFrameInput] = useState("frame: camera stream | candidate_country=ETH");
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

  const byIso = useMemo(() => new Map(metrics.map((item) => [item.iso3, item])), [metrics]);
  const summary = useMemo(() => computeGlobalSummary(metrics), [metrics]);
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

  const ranked = useMemo(() => {
    return [...filtered]
      .sort((a, b) => getLayerValue(b, layerMode) - getLayerValue(a, layerMode))
      .slice(0, 12);
  }, [filtered, layerMode]);

  const hoverText = buildHoverText({ hoverCountryMetric, hoverCountryMeta, layerMode });

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
      setHighlightedIso3(data.highlight_iso3);
      if (data.highlight_iso3[0]) setSelectedIso3(data.highlight_iso3[0]);
    } catch {
      setGenieAnswer("Unable to reach Genie endpoint. Check backend wiring and auth.");
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
    <main className="page-shell">
      <HeroSection generatedAt={generatedAt} />
      <TopTabs />
      <KpiGrid summary={summary} overview={overview} />
      <LayerSelector layerMode={layerMode} onChange={setLayerMode} />

      <section className="dashboard-grid">
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

        <CountryPanel
          selected={selected}
          selectedCountryMeta={selectedCountryMeta}
          selectedOci={selectedOci}
          clusterBreakdown={clusterBreakdown}
        />

        <PriorityRankingPanel ranked={ranked} layerMode={layerMode} onSelectIso3={setSelectedIso3} />
        <OciPanel
          overviewLoading={overviewLoading}
          overview={overview}
          onSelectIso3={setSelectedIso3}
          onHighlightIso3={setHighlightedIso3}
        />
        <SimulationPanel
          selectedIso3={selectedIso3}
          allocationUsd={allocationUsd}
          simulationLoading={simulationLoading}
          simulation={simulation}
          onAllocationChange={setAllocationUsd}
          onSimulate={runSimulation}
        />
        <ProjectOutliersPanel
          projectOutliers={projectOutliers}
          projectDetailLoading={projectDetailLoading}
          projectDetail={projectDetail}
          onSelectProjectId={setSelectedProjectId}
        />
        <AgentStatePanel selectedIso3={selectedIso3} agentLoading={agentLoading} agentState={agentState} />
        <GeniePanel
          queryTemplates={queryTemplates}
          question={question}
          genieAnswer={genieAnswer}
          genieLoading={genieLoading}
          onSetQuestion={setQuestion}
          onSubmit={submitGenieQuestion}
        />
        <CvPanel
          cvFrameInput={cvFrameInput}
          cvLoading={cvLoading}
          cvDetection={cvDetection}
          onCvInputChange={setCvFrameInput}
          onDetect={triggerCvDetection}
        />
      </section>
      <DashboardFooter />
    </main>
  );
}
