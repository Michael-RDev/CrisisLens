"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { countryByIso3, iso3ByIso2 } from "@/lib/countries";
import {
  askGenieCountryInsight,
  ensureGenieConversation,
  fetchAnalyticsOverview,
  fetchCountryDrilldown,
  fetchVisualRows,
  fetchProjectDetail,
  queryGenie,
  runGeoStrategicQuery,
  simulateFundingScenario,
  subscribeToGlobeEvents
} from "@/lib/api/crisiswatch";
import type {
  AnalyticsOverviewResponse,
  CountryDrilldown,
  GeoStrategicQueryResult,
  ProjectDetail,
  SimulationResponse
} from "@/lib/api/crisiswatch";
import type { CVDetection } from "@/lib/cv/provider";
import type { DatabricksCountryState } from "@/lib/databricks/client";
import { buildSimulationImpactArcs } from "@/lib/globe/simulation-arcs";
import { getLayerValue } from "@/lib/metrics";
import { CountryMetrics, LayerMode } from "@/lib/types";
import {
  GlobeCanvas
} from "@/components/command-center/GlobeCanvas";
import { MlSidebar } from "@/components/command-center/MlSidebar";
import { TopNav, WorkspaceMode } from "@/components/command-center/TopNav";
import { RightSidebar } from "@/components/command-center/RightSidebar";
import { AssistantTab } from "@/components/command-center/tabs/AssistantTab";
import { CountryBriefTab } from "@/components/command-center/tabs/CountryBriefTab";
import { MlOpsTab, MlPanelId } from "@/components/command-center/tabs/MlOpsTab";
import { VisualsTab } from "@/components/command-center/tabs/VisualsTab";
import type { CommandTabId } from "@/components/command-center/Tabs";
import { DatabricksChatPopup } from "@/components/dashboard/DatabricksChatPopup";
import {
  buildMlGenieQueryTemplates,
  getCountrySuggestions,
  resolveJumpToCountryIso3
} from "@/components/dashboard/dashboard-utils";

const Globe3D = dynamic(() => import("@/components/Globe3D"), {
  ssr: false,
  loading: () => <div className="h-screen w-screen bg-[#05111a]" />
});

type GlobeDashboardProps = {
  metrics: CountryMetrics[];
  generatedAt: string;
  initialMode?: WorkspaceMode;
};

type PinchSelection = {
  countryCode?: string;
  countryName?: string;
};

function normalizeCountryCode(countryCode: string): string | null {
  const normalized = countryCode.trim().toUpperCase();
  if (normalized.length === 3) return countryByIso3.has(normalized) ? normalized : null;
  if (normalized.length === 2) return iso3ByIso2.get(normalized) ?? null;
  return null;
}

function visualSortValue(
  row: GeoStrategicQueryResult["rows"][number],
  layerMode: LayerMode
): number {
  if (layerMode === "coverage") return row.coverage_pct;
  if (layerMode === "inNeedRate") return row.people_in_need;
  if (layerMode === "severity") return row.severity_score ?? 0;
  if (layerMode === "overlooked") return row.oci_score ?? row.funding_gap_usd;
  return row.funding_gap_usd;
}

function countryStatus(metric: CountryMetrics | null): string {
  if (!metric) return "Awaiting country selection";
  const oci = metric.overlookedScore ?? 0;
  if (oci >= 80) return "CRITICAL - Overlooked";
  if (oci >= 60) return "HIGH - Overlooked";
  if (oci >= 40) return "MODERATE - Watch";
  return metric.percentFunded < 20 ? "HIGH - Underfunded" : "LOW - Monitored";
}

function parseAllocationUsd(value: string): number {
  const parsed = Number(value.replace(/,/g, "").trim());
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed);
}

const EMPTY_CLUSTER_BREAKDOWN: CountryDrilldown["cluster_breakdown"] = [];
const EMPTY_PROJECT_OUTLIERS: CountryDrilldown["outlier_projects"] = [];
export default function GlobeDashboard({
  metrics,
  generatedAt,
  initialMode = "genie"
}: GlobeDashboardProps) {
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(initialMode);
  const [selectedIso3, setSelectedIso3] = useState<string | null>(metrics[0]?.iso3 ?? null);
  const [query, setQuery] = useState("");
  const [layerMode, setLayerMode] = useState<LayerMode>("overlooked");
  const [highlightedIso3, setHighlightedIso3] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<CommandTabId>("country-data");
  const [geniePanelOpen, setGeniePanelOpen] = useState(true);
  const [geniePanelCollapsed, setGeniePanelCollapsed] = useState(false);
  const [mlPanelOpen, setMlPanelOpen] = useState(true);
  const [mlPanelCollapsed, setMlPanelCollapsed] = useState(false);

  const [insightSelection, setInsightSelection] = useState<PinchSelection | null>(null);
  const [genieConversationId, setGenieConversationId] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [insightFormatted, setInsightFormatted] = useState<{
    headline: string;
    summary: string;
    keyPoints: string[];
    actions: string[];
    followups: string[];
    metricHighlights?: Array<{ label: string; value: string }>;
  } | null>(null);
  const [insightSummaryText, setInsightSummaryText] = useState<string | null>(null);
  const [insightSql, setInsightSql] = useState<string | null>(null);
  const [insightQueryResult, setInsightQueryResult] = useState<{
    columns: string[];
    rows: unknown[][];
    rowCount?: number;
  } | null>(null);

  const [strategicQuestion, setStrategicQuestion] = useState("");
  const [strategicLoading, setStrategicLoading] = useState(false);
  const [strategicError, setStrategicError] = useState<string | null>(null);
  const [strategicResult, setStrategicResult] = useState<GeoStrategicQueryResult | null>(null);
  const [useSelectedCountry, setUseSelectedCountry] = useState(false);
  const [visualRowsRaw, setVisualRowsRaw] = useState<GeoStrategicQueryResult["rows"]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);

  const [activeMlPanel, setActiveMlPanel] = useState<MlPanelId>("country");
  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [agentState, setAgentState] = useState<DatabricksCountryState | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [cvFrameInput, setCvFrameInput] = useState("frame: camera stream | country=Sudan");
  const [cvDetection, setCvDetection] = useState<CVDetection | null>(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [clusterBreakdown, setClusterBreakdown] = useState<CountryDrilldown["cluster_breakdown"]>(
    EMPTY_CLUSTER_BREAKDOWN
  );
  const [projectOutliers, setProjectOutliers] = useState<CountryDrilldown["outlier_projects"]>(
    EMPTY_PROJECT_OUTLIERS
  );
  const [selectedOci, setSelectedOci] = useState<CountryDrilldown["oci"] | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null);
  const [projectDetailLoading, setProjectDetailLoading] = useState(false);
  const [allocationUsd, setAllocationUsd] = useState("5000000");
  const [simulation, setSimulation] = useState<SimulationResponse | null>(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [showImpactArrows, setShowImpactArrows] = useState(true);
  const [mlGenieQuestion, setMlGenieQuestion] = useState("");
  const [mlGenieAnswer, setMlGenieAnswer] = useState("");
  const [mlGenieSource, setMlGenieSource] = useState<string>("genie");
  const [mlGenieResults, setMlGenieResults] = useState<
    Array<{ iso3: string; metric: string; score: number; rationale?: string }>
  >([]);
  const [mlGenieLoading, setMlGenieLoading] = useState(false);
  const selectedIso3Ref = useRef<string | null>(selectedIso3);
  const insightRequestIdRef = useRef(0);

  const byIso = useMemo(() => new Map(metrics.map((item) => [item.iso3, item])), [metrics]);
  const countrySuggestions = useMemo(() => getCountrySuggestions(), []);
  const queryTemplates = useMemo(
    () =>
      buildMlGenieQueryTemplates({
        metrics,
        layerMode,
        selectedIso3
      }),
    [layerMode, metrics, selectedIso3]
  );

  const activeCountryIso = insightSelection?.countryCode ?? selectedIso3 ?? undefined;
  const activeMetric = activeCountryIso ? byIso.get(activeCountryIso) ?? null : null;
  const activeCountryName =
    insightSelection?.countryName ??
    activeMetric?.country ??
    (activeCountryIso ? countryByIso3.get(activeCountryIso)?.name : undefined);
  const selectedCountryMeta = selectedIso3 ? countryByIso3.get(selectedIso3) ?? null : null;
  const ranked = useMemo(() => {
    const filtered = query.trim()
      ? metrics.filter((row) => {
          const needle = query.trim().toLowerCase();
          return row.country.toLowerCase().includes(needle) || row.iso3.toLowerCase().includes(needle);
        })
      : metrics;
    return [...filtered]
      .sort((a, b) => getLayerValue(b, layerMode) - getLayerValue(a, layerMode))
      .slice(0, 12);
  }, [layerMode, metrics, query]);
  const chartRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? visualRowsRaw.filter(
          (row) =>
            row.country.toLowerCase().includes(needle) ||
            row.iso3.toLowerCase().includes(needle)
        )
      : visualRowsRaw;
    return [...filtered]
      .sort((a, b) => visualSortValue(b, layerMode) - visualSortValue(a, layerMode))
      .slice(0, 40);
  }, [layerMode, query, visualRowsRaw]);
  const simulationArcs = useMemo(() => {
    if (!showImpactArrows) return [];
    return buildSimulationImpactArcs(simulation?.impact_arrows ?? []);
  }, [showImpactArrows, simulation?.impact_arrows]);
  const showGenieWorkspace = workspaceMode === "genie" || workspaceMode === "split";
  const showMlWorkspace = workspaceMode === "ml" || workspaceMode === "split";
  const isSplitView = workspaceMode === "split";

  useEffect(() => {
    selectedIso3Ref.current = selectedIso3;
  }, [selectedIso3]);

  useEffect(() => {
    let cancelled = false;
    setChartLoading(true);
    setChartError(null);
    fetchVisualRows()
      .then((rows) => {
        if (!cancelled) setVisualRowsRaw(rows);
      })
      .catch((error) => {
        if (!cancelled) {
          setVisualRowsRaw([]);
          setChartError(error instanceof Error ? error.message : "Unable to load visualization rows.");
        }
      })
      .finally(() => {
        if (!cancelled) setChartLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  useEffect(() => {
    let cancelled = false;
    setOverviewLoading(true);
    fetchAnalyticsOverview()
      .then((payload) => {
        if (!cancelled) setOverview(payload);
      })
      .catch(() => {
        if (!cancelled) setOverview(null);
      })
      .finally(() => {
        if (!cancelled) setOverviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedIso3) {
      setAgentState(null);
      setClusterBreakdown(EMPTY_CLUSTER_BREAKDOWN);
      setProjectOutliers(EMPTY_PROJECT_OUTLIERS);
      setSelectedOci(null);
      setSelectedProjectId(null);
      setProjectDetail(null);
      return;
    }

    const controller = new AbortController();
    setAgentLoading(true);

    const fetchAgent = fetch(`/api/agent?iso3=${encodeURIComponent(selectedIso3)}`, {
      signal: controller.signal
    }).then(async (response) => {
      if (!response.ok) throw new Error("Agent fetch failed");
      return (await response.json()) as DatabricksCountryState;
    });
    const fetchDrilldown = fetchCountryDrilldown(selectedIso3);

    Promise.allSettled([fetchAgent, fetchDrilldown])
      .then((results) => {
        if (controller.signal.aborted) return;
        const [agentResult, drilldownResult] = results;
        if (agentResult.status === "fulfilled") {
          setAgentState(agentResult.value);
        } else {
          setAgentState(null);
        }

        if (drilldownResult.status === "fulfilled") {
          setClusterBreakdown(drilldownResult.value.cluster_breakdown);
          setProjectOutliers(drilldownResult.value.outlier_projects);
          setSelectedOci(drilldownResult.value.oci);
          setSelectedProjectId((current) => {
            if (
              current &&
              drilldownResult.value.hrp_project_list.some((project) => project.project_id === current)
            ) {
              return current;
            }
            return (
              drilldownResult.value.outlier_projects[0]?.project_id ??
              drilldownResult.value.hrp_project_list[0]?.project_id ??
              null
            );
          });
        } else {
          setClusterBreakdown(EMPTY_CLUSTER_BREAKDOWN);
          setProjectOutliers(EMPTY_PROJECT_OUTLIERS);
          setSelectedOci(null);
          setSelectedProjectId(null);
          setProjectDetail(null);
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
    if (!mlGenieQuestion.trim() && queryTemplates[0]) {
      setMlGenieQuestion(queryTemplates[0]);
    }
  }, [mlGenieQuestion, queryTemplates]);

  useEffect(() => {
    setSimulation(null);
    setHighlightedIso3(selectedIso3 ? [selectedIso3] : []);
  }, [selectedIso3]);

  useEffect(() => {
    // Avoid showing stale country insight content while a new country query is pending.
    setInsightFormatted(null);
    setInsightSummaryText(null);
    setInsightSql(null);
    setInsightQueryResult(null);
    setInsightError(null);
  }, [selectedIso3]);

  useEffect(() => {
    if (workspaceMode !== "split") return;
    setGeniePanelOpen(true);
    setMlPanelOpen(true);
  }, [workspaceMode]);

  async function loadInsightForCountry(selection: PinchSelection) {
    const normalized = selection.countryCode ? normalizeCountryCode(selection.countryCode) : null;
    if (!normalized) {
      setInsightError("Country selection must resolve to ISO3 for Genie request.");
      return;
    }
    const requestId = insightRequestIdRef.current + 1;
    insightRequestIdRef.current = requestId;

    setInsightSelection({ countryCode: normalized, countryName: selection.countryName });
    setSelectedIso3(normalized);
    setInsightLoading(true);
    setInsightError(null);
    setInsightFormatted(null);
    setInsightSummaryText(null);
    setInsightSql(null);
    setInsightQueryResult(null);
    setGeniePanelOpen(true);
    setGeniePanelCollapsed(false);
    setActiveTab("country-data");

    try {
      let conversationId = genieConversationId ?? (await ensureGenieConversation()).conversationId;

      if (!genieConversationId) setGenieConversationId(conversationId);

      let payload;
      try {
        payload = await askGenieCountryInsight({
          conversationId,
          iso3: normalized,
          countryName: selection.countryName,
          intent: "summary"
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        const shouldRetryWithFreshConversation =
          /\b404\b/.test(message) ||
          message.toLowerCase().includes("not found") ||
          message.toLowerCase().includes("conversation");
        if (!shouldRetryWithFreshConversation) {
          throw error;
        }
        const restarted = await ensureGenieConversation();
        conversationId = restarted.conversationId;
        setGenieConversationId(conversationId);
        payload = await askGenieCountryInsight({
          conversationId,
          iso3: normalized,
          countryName: selection.countryName,
          intent: "summary"
        });
      }
      if (insightRequestIdRef.current !== requestId) return;
      if (payload.conversationId && payload.conversationId !== genieConversationId) {
        setGenieConversationId(payload.conversationId);
      }
      setInsightFormatted(payload.formatted ?? null);
      setInsightSummaryText(payload.summaryText ?? null);
      setInsightSql(payload.sql ?? null);
      setInsightQueryResult(payload.queryResult ?? null);
    } catch (error) {
      if (insightRequestIdRef.current !== requestId) return;
      const message = error instanceof Error ? error.message : "Unable to load geo insight.";
      setInsightError(message);
      setInsightFormatted(null);
      setInsightSummaryText(null);
      setInsightSql(null);
      setInsightQueryResult(null);
    } finally {
      if (insightRequestIdRef.current !== requestId) return;
      setInsightLoading(false);
    }
  }

  function onCountryPinch(selection: PinchSelection) {
    void loadInsightForCountry(selection);
  }

  async function submitStrategicQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!strategicQuestion.trim()) return;

    setStrategicLoading(true);
    setStrategicError(null);
    try {
      const contextQuestion =
        useSelectedCountry && activeCountryIso
          ? `${strategicQuestion.trim()} Context country: ${activeCountryName ?? activeCountryIso} (${activeCountryIso}).`
          : strategicQuestion.trim();

      const result = await runGeoStrategicQuery(contextQuestion);
      setStrategicResult(result);
      setActiveTab("insights");
      setGeniePanelOpen(true);
      setGeniePanelCollapsed(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to run strategic query.";
      setStrategicError(message);
      setStrategicResult(null);
    } finally {
      setStrategicLoading(false);
    }
  }

  function useStrategicFollowup(questionText: string) {
    setStrategicQuestion(questionText);
    void (async () => {
      setStrategicLoading(true);
      setStrategicError(null);
      try {
        const contextQuestion =
          useSelectedCountry && activeCountryIso
            ? `${questionText} Context country: ${activeCountryName ?? activeCountryIso} (${activeCountryIso}).`
            : questionText;
        const result = await runGeoStrategicQuery(contextQuestion);
        setStrategicResult(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to run strategic follow-up.";
        setStrategicError(message);
      } finally {
        setStrategicLoading(false);
      }
    })();
  }

  function focusCountry(iso3: string) {
    setSelectedIso3(iso3);
    setInsightSelection({
      countryCode: iso3,
      countryName: countryByIso3.get(iso3)?.name
    });
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
      if (payload.detection?.iso3) {
        const normalized = payload.detection.iso3.trim().toUpperCase();
        if (byIso.has(normalized)) {
          focusCountry(normalized);
        }
      }
    } catch {
      setCvDetection(null);
    } finally {
      setCvLoading(false);
    }
  }

  const runSimulation = useCallback(async () => {
    if (!selectedIso3) return;
    const parsed = parseAllocationUsd(allocationUsd);
    if (!Number.isFinite(parsed) || parsed < 0) return;

    setSimulationLoading(true);
    try {
      const payload = await simulateFundingScenario({
        iso3: selectedIso3,
        allocation_usd: parsed
      });
      if (selectedIso3Ref.current !== selectedIso3) return;
      setSimulation(payload);

      const highlighted = new Set<string>(payload.top_overlooked_after.slice(0, 3).map((item) => item.iso3));
      highlighted.add(payload.iso3);
      for (const arrow of payload.impact_arrows?.slice(0, 6) ?? []) {
        highlighted.add(arrow.to_iso3);
      }
      setHighlightedIso3([...highlighted]);
    } catch {
      setSimulation(null);
    } finally {
      setSimulationLoading(false);
    }
  }, [allocationUsd, selectedIso3]);

  function bumpAllocation(deltaUsd: number) {
    const next = parseAllocationUsd(allocationUsd) + deltaUsd;
    setAllocationUsd(String(Math.max(0, Math.round(next))));
  }

  async function submitMlGenieQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mlGenieQuestion.trim()) return;

    setMlGenieLoading(true);
    try {
      const data = await queryGenie({ nl_query: mlGenieQuestion, iso3: selectedIso3 ?? undefined });
      setMlGenieAnswer(data.answer);
      setMlGenieSource(data.source ?? "genie");
      setMlGenieResults(data.results ?? []);
      setHighlightedIso3(data.highlight_iso3);
      if (data.highlight_iso3[0]) {
        focusCountry(data.highlight_iso3[0]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to reach Genie endpoint.";
      setMlGenieAnswer(message);
      setMlGenieSource("error");
      setMlGenieResults([]);
    } finally {
      setMlGenieLoading(false);
    }
  }

  function jumpToCountry() {
    const iso3 = resolveJumpToCountryIso3(query);
    if (iso3) {
      focusCountry(iso3);
      if (workspaceMode !== "ml") {
        onCountryPinch({ countryCode: iso3, countryName: countryByIso3.get(iso3)?.name });
      }
    }
  }

  return (
    <GlobeCanvas
      overlays={
        <>
          <TopNav mode={workspaceMode} onModeChange={setWorkspaceMode} />

          {showGenieWorkspace ? (
            <RightSidebar
              side={isSplitView ? "left" : "right"}
              open={geniePanelOpen}
              collapsed={geniePanelCollapsed}
              activeTab={activeTab}
              selectedCountryLabel={
                activeCountryIso
                  ? `${activeCountryName ?? "Country"} • ${activeCountryIso}`
                  : "No country selected"
              }
              statusLabel={countryStatus(activeMetric)}
              generatedAt={generatedAt}
              layerMode={layerMode}
              query={query}
              countrySuggestions={countrySuggestions}
              onLayerChange={setLayerMode}
              onQueryChange={setQuery}
              onJump={jumpToCountry}
              onToggleOpen={() => setGeniePanelOpen((current) => !current)}
              onToggleCollapsed={() => setGeniePanelCollapsed((current) => !current)}
              onTabChange={setActiveTab}
            >
              {activeTab === "insights" ? (
                <AssistantTab
                  question={strategicQuestion}
                  loading={strategicLoading}
                  error={strategicError}
                  result={strategicResult}
                  useSelectedCountry={useSelectedCountry}
                  selectedCountryLabel={activeCountryIso ? `${activeCountryName ?? "Country"} (${activeCountryIso})` : "none"}
                  onQuestionChange={setStrategicQuestion}
                  onPromptFill={setStrategicQuestion}
                  onToggleUseCountry={setUseSelectedCountry}
                  onSubmit={submitStrategicQuery}
                  onClear={() => {
                    setStrategicQuestion("");
                    setStrategicResult(null);
                    setStrategicError(null);
                  }}
                  onUseFollowup={useStrategicFollowup}
                />
              ) : null}

              {activeTab === "country-data" ? (
                <CountryBriefTab
                  countryCode={activeCountryIso}
                  countryName={activeCountryName}
                  metric={activeMetric}
                  loading={insightLoading}
                  error={insightError}
                  formatted={insightFormatted}
                  summaryText={insightSummaryText}
                  sql={insightSql}
                  queryResult={insightQueryResult}
                />
              ) : null}

              {activeTab === "visuals" ? (
                <VisualsTab
                  rows={chartRows}
                  layerMode={layerMode}
                  selectedIso3={activeCountryIso ?? null}
                  loading={chartLoading}
                  error={chartError}
                  onLayerChange={setLayerMode}
                  onSelectIso3={(iso3) =>
                    onCountryPinch({
                      countryCode: iso3,
                      countryName: countryByIso3.get(iso3)?.name
                    })
                  }
                />
              ) : null}
            </RightSidebar>
          ) : null}

          {showMlWorkspace ? (
            <MlSidebar
              side="right"
              splitView={isSplitView}
              open={mlPanelOpen}
              collapsed={mlPanelCollapsed}
              selectedCountryLabel={
                selectedIso3
                  ? `${selectedCountryMeta?.name ?? "Country"} • ${selectedIso3}`
                  : "No country selected"
              }
              statusLabel={countryStatus(selectedIso3 ? byIso.get(selectedIso3) ?? null : null)}
              generatedAt={generatedAt}
              layerMode={layerMode}
              query={query}
              countrySuggestions={countrySuggestions}
              onLayerChange={setLayerMode}
              onQueryChange={setQuery}
              onJump={jumpToCountry}
              onToggleOpen={() => setMlPanelOpen((current) => !current)}
              onToggleCollapsed={() => setMlPanelCollapsed((current) => !current)}
            >
              <MlOpsTab
                activePanel={activeMlPanel}
                selectedIso3={selectedIso3}
                selectedCountryMeta={selectedCountryMeta ? { name: selectedCountryMeta.name, iso3: selectedCountryMeta.iso3 } : null}
                selectedMetric={selectedIso3 ? byIso.get(selectedIso3) ?? null : null}
                selectedOci={selectedOci}
                clusterBreakdown={clusterBreakdown}
                ranked={ranked}
                layerMode={layerMode}
                highlightedCount={highlightedIso3.length}
                overviewLoading={overviewLoading}
                overview={overview}
                agentLoading={agentLoading}
                agentState={agentState}
                cvFrameInput={cvFrameInput}
                cvLoading={cvLoading}
                cvDetection={cvDetection}
                projectOutliers={projectOutliers}
                projectDetailLoading={projectDetailLoading}
                projectDetail={projectDetail}
                allocationUsd={allocationUsd}
                simulationLoading={simulationLoading}
                simulation={simulation}
                showImpactArrows={showImpactArrows}
                genieQuestion={mlGenieQuestion}
                genieAnswer={mlGenieAnswer}
                genieSource={mlGenieSource}
                genieResults={mlGenieResults}
                genieLoading={mlGenieLoading}
                queryTemplates={queryTemplates}
                onPanelChange={setActiveMlPanel}
                onSelectIso3={focusCountry}
                onHighlightIso3={setHighlightedIso3}
                onCvInputChange={setCvFrameInput}
                onDetectCv={triggerCvDetection}
                onSelectProjectId={setSelectedProjectId}
                onAllocationChange={setAllocationUsd}
                onAllocationAdjust={bumpAllocation}
                onShowImpactArrowsChange={setShowImpactArrows}
                onSimulate={runSimulation}
                onSetGenieQuestion={setMlGenieQuestion}
                onSubmitGenie={submitMlGenieQuestion}
              />
            </MlSidebar>
          ) : null}
        </>
      }
    >
      <div className="h-full w-full">
        <Globe3D
          metrics={metrics}
          layerMode={layerMode}
          selectedIso3={selectedIso3}
          highlightedIso3={highlightedIso3}
          simulationArcs={simulationArcs}
          onSelect={(iso3) => {
            if (workspaceMode !== "ml") {
              onCountryPinch({
                countryCode: iso3,
                countryName: countryByIso3.get(iso3)?.name
              });
              return;
            }
            focusCountry(iso3);
          }}
          onHover={() => undefined}
          className="globe-canvas-full"
        />
      </div>
      {workspaceMode === "ml" ? (
        <DatabricksChatPopup
          queryTemplates={queryTemplates}
          question={mlGenieQuestion}
          genieAnswer={mlGenieAnswer}
          genieSource={mlGenieSource}
          genieResults={mlGenieResults}
          genieLoading={mlGenieLoading}
          onSetQuestion={setMlGenieQuestion}
          onSubmit={submitMlGenieQuestion}
        />
      ) : null}
    </GlobeCanvas>
  );
}
