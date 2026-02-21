"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { computeGlobalSummary } from "@/components/summary-utils";
import { countryByIso3, iso3ByIso2 } from "@/lib/countries";
import {
  ensureGenieSession,
  fetchAnalyticsOverview,
  fetchCountryDrilldown,
  fetchCountryInsightMetrics,
  fetchGenieSummary,
  fetchProjectDetail,
  queryGenie,
  simulateFundingScenario,
  subscribeToGlobeEvents
} from "@/lib/api/crisiswatch";
import type {
  AnalyticsOverviewResponse,
  CountryDrilldown,
  GenieSummaryResponse,
  InsightMetricsResponse,
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
  InsightPanel,
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

type PinchSelection = {
  countryCode: string;
  countryName?: string;
};

function normalizeCountryCode(countryCode: string): string | null {
  const normalized = countryCode.trim().toUpperCase();
  if (normalized.length === 3) return countryByIso3.has(normalized) ? normalized : null;
  if (normalized.length === 2) return iso3ByIso2.get(normalized) ?? null;
  return null;
}

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
  const [genieSource, setGenieSource] = useState<string>("mock");
  const [genieResults, setGenieResults] = useState<
    Array<{ iso3: string; metric: string; score: number; rationale?: string }>
  >([]);
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
  const [insightOpen, setInsightOpen] = useState(false);
  const [genieConversationId, setGenieConversationId] = useState<string | null>(null);
  const [insightSelection, setInsightSelection] = useState<PinchSelection | null>(null);
  const [insightMetrics, setInsightMetrics] = useState<InsightMetricsResponse | null>(null);
  const [insightSummary, setInsightSummary] = useState<GenieSummaryResponse | null>(null);
  const [insightMetricsLoading, setInsightMetricsLoading] = useState(false);
  const [insightSummaryLoading, setInsightSummaryLoading] = useState(false);
  const [insightMetricsError, setInsightMetricsError] = useState<string | null>(null);
  const [insightSummaryError, setInsightSummaryError] = useState<string | null>(null);
  const [insightProgressLabel, setInsightProgressLabel] = useState("Waiting for country selection.");
  const [followUpQuestion, setFollowUpQuestion] = useState("");

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
      fetch(`/api/agent?iso3=${encodeURIComponent(selectedIso3)}`, { signal: controller.signal }).then(async (res) => {
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
      const response = await fetch("/api/cv-detect", {
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

  async function ensureConversationId(): Promise<string> {
    if (genieConversationId) return genieConversationId;
    const session = await ensureGenieSession();
    setGenieConversationId(session.conversationId);
    return session.conversationId;
  }

  async function loadInsightForCountry(selection: PinchSelection, followUp?: string) {
    const normalized = normalizeCountryCode(selection.countryCode);
    if (!normalized) {
      setInsightMetricsError("Selected country code is invalid. Use ISO3 or ISO2.");
      setInsightSummaryError("Cannot query Genie because the country code is invalid.");
      return;
    }

    setInsightSelection({ countryCode: normalized, countryName: selection.countryName });
    setSelectedIso3(normalized);
    setInsightOpen(true);
    setInsightMetricsError(null);
    setInsightSummaryError(null);
    setInsightProgressLabel("Loading country metrics...");
    setInsightMetricsLoading(true);
    setInsightSummaryLoading(true);

    const metricsPromise = fetchCountryInsightMetrics(normalized)
      .then((payload) => setInsightMetrics(payload))
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Unable to load country metrics.";
        setInsightMetricsError(message);
        setInsightMetrics(null);
      })
      .finally(() => setInsightMetricsLoading(false));

    const summaryPromise = (async () => {
      try {
        setInsightProgressLabel("Starting Genie session...");
        const conversationId = await ensureConversationId();
        setInsightProgressLabel("Asking Databricks Genie for country summary...");
        const summaryPayload = await fetchGenieSummary({
          countryCode: normalized,
          countryName: selection.countryName,
          conversationId,
          followUpQuestion: followUp
        });
        if (summaryPayload.conversationId && summaryPayload.conversationId !== genieConversationId) {
          setGenieConversationId(summaryPayload.conversationId);
        }
        setInsightSummary(summaryPayload);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load Genie summary.";
        setInsightSummaryError(message);
        setInsightSummary(null);
      } finally {
        setInsightSummaryLoading(false);
        setInsightProgressLabel("Summary ready.");
      }
    })();

    await Promise.all([metricsPromise, summaryPromise]);
  }

  function onCountryPinch(selection: PinchSelection) {
    // Plug your existing globe pinch callback into this handler.
    // Expected payload shape: onCountryPinch({ countryCode, countryName? }).
    setFollowUpQuestion("");
    void loadInsightForCountry(selection);
  }

  async function refreshInsightSummary() {
    if (!insightSelection) return;
    await loadInsightForCountry(insightSelection);
  }

  async function submitInsightFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!insightSelection || !followUpQuestion.trim()) return;
    await loadInsightForCountry(insightSelection, followUpQuestion.trim());
    setFollowUpQuestion("");
  }

  function jumpToCountry() {
    const iso3 = resolveJumpToCountryIso3(query);
    if (iso3) {
      setSelectedIso3(iso3);
    }
  }

  return (
    <main className="mx-auto max-w-[1460px] p-4 sm:p-5">
      <HeroSection generatedAt={generatedAt} />
      <TopTabs />
      <KpiGrid summary={summary} overview={overview} />
      <LayerSelector layerMode={layerMode} onChange={setLayerMode} />

      <section className="dashboard-grid mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(520px,2fr)_minmax(330px,1fr)]">
        <GlobePanel
          metrics={metrics}
          layerMode={layerMode}
          selectedIso3={selectedIso3}
          highlightedIso3={highlightedIso3}
          query={query}
          countrySuggestions={countrySuggestions}
          hoverText={hoverText}
          onSelectIso3={(iso3) =>
            onCountryPinch({
              countryCode: iso3,
              countryName: countryByIso3.get(iso3)?.name
            })
          }
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
          genieSource={genieSource}
          genieResults={genieResults}
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
      <InsightPanel
        isOpen={insightOpen}
        countryCode={insightSelection?.countryCode}
        countryName={insightSelection?.countryName}
        metrics={insightMetrics}
        summary={insightSummary}
        metricsLoading={insightMetricsLoading}
        summaryLoading={insightSummaryLoading}
        metricsError={insightMetricsError}
        summaryError={insightSummaryError}
        progressLabel={insightProgressLabel}
        followUpQuestion={followUpQuestion}
        onClose={() => setInsightOpen(false)}
        onRefreshSummary={() => void refreshInsightSummary()}
        onFollowUpChange={setFollowUpQuestion}
        onSubmitFollowUp={submitInsightFollowUp}
      />
      <DashboardFooter />
    </main>
  );
}
