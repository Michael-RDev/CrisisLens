"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { countryByIso3, iso3ByIso2 } from "@/lib/countries";
import { subscribeToGlobeEvents } from "@/lib/api/crisiswatch";
import { CountryMetrics } from "@/lib/types";
import { GlobeCanvas } from "@/components/command-center/GlobeCanvas";
import { TopNav } from "@/components/command-center/TopNav";
import { RightSidebar } from "@/components/command-center/RightSidebar";
import { AssistantTab } from "@/components/command-center/tabs/AssistantTab";
import {
  buildAssistantMessage,
  buildUserMessage,
  type AssistantMessage
} from "@/components/command-center/tabs/insights-chat-utils";
import { CountryBriefTab } from "@/components/command-center/tabs/CountryBriefTab";
import { VisualsTab } from "@/components/command-center/tabs/VisualsTab";
import type { CommandTabId } from "@/components/command-center/Tabs";
import {
  fetchCountryInsights,
  fetchCountrySummary,
  fetchGeneralInsights,
  fetchLayerData,
  fetchVisuals,
  layerKeyToMode,
  type CountrySummary,
  type InsightsResult,
  type LayerDatum,
  type MapLayerKey,
  type VisualMetricKey,
  type VisualSeries
} from "@/lib/services/databricks";

const Globe3D = dynamic(() => import("@/components/Globe3D"), {
  ssr: false,
  loading: () => <div className="h-screen w-screen bg-[#05111a]" />
});

type GlobeDashboardProps = {
  metrics: CountryMetrics[];
  generatedAt: string;
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

export default function GlobeDashboard({ metrics, generatedAt }: GlobeDashboardProps) {
  const [selectedIso3, setSelectedIso3] = useState<string | null>(metrics[0]?.iso3 ?? null);
  const [highlightedIso3, setHighlightedIso3] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<CommandTabId>("country-data");
  const [panelOpen, setPanelOpen] = useState(false);

  const [layerKey, setLayerKey] = useState<MapLayerKey>("oci");
  const [layerData, setLayerData] = useState<LayerDatum[]>([]);
  const [layerError, setLayerError] = useState<string | null>(null);

  const [countrySummary, setCountrySummary] = useState<CountrySummary | null>(null);
  const [countryLoading, setCountryLoading] = useState(false);
  const [countryError, setCountryError] = useState<string | null>(null);

  const [insightQuestion, setInsightQuestion] = useState("");
  const [countryInsightLoading, setCountryInsightLoading] = useState(false);
  const [countryInsightError, setCountryInsightError] = useState<string | null>(null);
  const [countryInsightResult, setCountryInsightResult] = useState<InsightsResult | null>(null);
  const [countryInsightIso3, setCountryInsightIso3] = useState<string | null>(null);
  const [assistantInsightLoading, setAssistantInsightLoading] = useState(false);
  const [assistantInsightError, setAssistantInsightError] = useState<string | null>(null);
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([]);

  const [visualMetric, setVisualMetric] = useState<VisualMetricKey>("coverage_trend");
  const [visualSeries, setVisualSeries] = useState<VisualSeries | null>(null);
  const [visualLoading, setVisualLoading] = useState(false);
  const [visualError, setVisualError] = useState<string | null>(null);

  const countryRequestRef = useRef(0);
  const countryInsightRequestRef = useRef(0);
  const assistantInsightRequestRef = useRef(0);
  const visualsRequestRef = useRef(0);
  const autoInsightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoInsightBusyRef = useRef(false);
  const autoInsightPendingRef = useRef<{
    iso3: string;
    question: string;
    context?: { countryName?: string; year?: number };
  } | null>(null);
  const countryInsightByIsoRef = useRef<Map<string, InsightsResult>>(new Map());

  const byIso = useMemo(() => new Map(metrics.map((item) => [item.iso3, item])), [metrics]);

  const selectedMetricFallback = selectedIso3 ? byIso.get(selectedIso3) : null;
  const waitingForCountryPipeline = Boolean(
    selectedIso3 &&
    countryInsightIso3 !== selectedIso3 &&
    !countryInsightError
  );
  const selectedCountryLabel = countrySummary
    ? `${countrySummary.country} • ${countrySummary.iso3}`
    : selectedIso3
      ? `${selectedMetricFallback?.country ?? countryByIso3.get(selectedIso3)?.name ?? "Country"} • ${selectedIso3}`
      : "No country selected";

  const statusLabel = countrySummary?.riskLabel ?? "Select a country on the globe";
  const lastAssistantUserQuery = useMemo(() => {
    for (let index = assistantMessages.length - 1; index >= 0; index -= 1) {
      if (assistantMessages[index].role === "user") return assistantMessages[index].text;
    }
    return "";
  }, [assistantMessages]);
  const insightsQueryIsComparative = /(\btop\s*\d+\b|\bcompare\b|\bvs\b|\bversus\b|\bcountries\b|\brank|\bhighest\b|\blowest\b)/i.test(
    lastAssistantUserQuery
  );

  async function loadLayer(mode: MapLayerKey, force = false) {
    try {
      setLayerError(null);
      const data = await fetchLayerData(mode, force);
      setLayerData(data);
    } catch (error) {
      setLayerData([]);
      setLayerError(error instanceof Error ? error.message : "Unable to load layer data.");
    }
  }

  async function loadCountry(iso3: string, force = false, requestId?: number): Promise<CountrySummary | null> {
    setCountryLoading(true);
    setCountryError(null);
    try {
      const data = await fetchCountrySummary(iso3, force);
      if (requestId !== undefined && requestId !== countryRequestRef.current) return null;
      setCountrySummary(data);
      return data;
    } catch (error) {
      if (requestId !== undefined && requestId !== countryRequestRef.current) return null;
      setCountrySummary(null);
      setCountryError(error instanceof Error ? error.message : "Unable to load country summary.");
      return null;
    } finally {
      if (requestId === undefined || requestId === countryRequestRef.current) {
        setCountryLoading(false);
      }
    }
  }

  async function loadVisualData(iso3: string, metric: VisualMetricKey, force = false, requestId?: number) {
    setVisualLoading(true);
    setVisualError(null);
    try {
      const data = await fetchVisuals(iso3, metric, undefined, force);
      if (requestId !== undefined && requestId !== visualsRequestRef.current) return;
      setVisualSeries(data);
    } catch (error) {
      if (requestId !== undefined && requestId !== visualsRequestRef.current) return;
      setVisualSeries(null);
      setVisualError(error instanceof Error ? error.message : "Unable to load visuals.");
    } finally {
      if (requestId === undefined || requestId === visualsRequestRef.current) {
        setVisualLoading(false);
      }
    }
  }

  async function loadCountryInsight(
    iso3: string,
    question: string,
    context?: { countryName?: string; year?: number },
    requestId?: number,
    options?: { preserveExistingOnError?: boolean }
  ) {
    setCountryInsightLoading(true);
    setCountryInsightError(null);
    try {
      const data = await fetchCountryInsights(iso3, question, context);
      if (requestId !== undefined && requestId !== countryInsightRequestRef.current) return;
      setCountryInsightResult(data);
      setCountryInsightIso3(iso3);
      countryInsightByIsoRef.current.set(iso3, data);
    } catch (error) {
      if (requestId !== undefined && requestId !== countryInsightRequestRef.current) return;
      if (!options?.preserveExistingOnError) {
        setCountryInsightResult(null);
        setCountryInsightIso3(null);
      }
      setCountryInsightError(error instanceof Error ? error.message : "Unable to load country insight.");
    } finally {
      if (requestId === undefined || requestId === countryInsightRequestRef.current) {
        setCountryInsightLoading(false);
      }
    }
  }

  async function loadAssistantInsight(question: string, requestId?: number): Promise<InsightsResult | null> {
    setAssistantInsightLoading(true);
    setAssistantInsightError(null);
    try {
      const data = await fetchGeneralInsights(question);
      if (requestId !== undefined && requestId !== assistantInsightRequestRef.current) return null;
      return data;
    } catch (error) {
      if (requestId !== undefined && requestId !== assistantInsightRequestRef.current) return null;
      setAssistantInsightError(error instanceof Error ? error.message : "Unable to load general insight.");
      return null;
    } finally {
      if (requestId === undefined || requestId === assistantInsightRequestRef.current) {
        setAssistantInsightLoading(false);
      }
    }
  }

  const runQueuedAutoInsight = useCallback(() => {
    if (autoInsightBusyRef.current) return;
    const next = autoInsightPendingRef.current;
    if (!next) return;

    autoInsightPendingRef.current = null;
    autoInsightBusyRef.current = true;
    const requestId = ++countryInsightRequestRef.current;

    void loadCountryInsight(
      next.iso3,
      next.question,
      next.context,
      requestId,
      { preserveExistingOnError: true }
    ).finally(() => {
      autoInsightBusyRef.current = false;
      if (autoInsightPendingRef.current) {
        runQueuedAutoInsight();
      }
    });
  }, []);

  const enqueueAutoInsight = useCallback(
    (iso3: string, question: string, context?: { countryName?: string; year?: number }) => {
      autoInsightPendingRef.current = { iso3, question, context };
      runQueuedAutoInsight();
    },
    [runQueuedAutoInsight]
  );

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
    void loadLayer(layerKey);
  }, [layerKey]);

  useEffect(() => {
    if (!selectedIso3) {
      setCountrySummary(null);
      setCountryInsightResult(null);
      setCountryInsightIso3(null);
      setCountryInsightError(null);
      setCountryInsightLoading(false);
      setVisualSeries(null);
      return;
    }

    if (autoInsightTimerRef.current) {
      clearTimeout(autoInsightTimerRef.current);
      autoInsightTimerRef.current = null;
    }
    autoInsightPendingRef.current = null;

    const countryReqId = ++countryRequestRef.current;
    const cachedInsight = countryInsightByIsoRef.current.get(selectedIso3);
    setCountrySummary(null);
    setCountryInsightResult(cachedInsight ?? null);
    setCountryInsightIso3(cachedInsight ? selectedIso3 : null);
    setCountryInsightError(null);
    setCountryInsightLoading(true);
    setVisualSeries(null);
    setVisualError(null);

    const countrySummaryPromise = loadCountry(selectedIso3, false, countryReqId);
    autoInsightTimerRef.current = setTimeout(() => {
      void (async () => {
        const summary = await countrySummaryPromise;
        const defaultQuestion = summary
          ? `Summarize ${summary.country} (${summary.iso3}) in ${summary.year}. If any metric is unavailable, say it explicitly.`
          : `Summarize the current humanitarian situation and funding gap for ${selectedIso3}.`;
        enqueueAutoInsight(selectedIso3, defaultQuestion, {
          countryName: summary?.country,
          year: summary?.year
        });
      })();
    }, 500);

    return () => {
      if (autoInsightTimerRef.current) {
        clearTimeout(autoInsightTimerRef.current);
        autoInsightTimerRef.current = null;
      }
    };
  }, [enqueueAutoInsight, selectedIso3]);

  useEffect(() => {
    if (!selectedIso3) return;
    const visualReqId = ++visualsRequestRef.current;
    void loadVisualData(selectedIso3, visualMetric, false, visualReqId);
  }, [visualMetric, selectedIso3]);

  function onCountryPinch(selection: PinchSelection) {
    const normalized = selection.countryCode ? normalizeCountryCode(selection.countryCode) : null;
    if (!normalized) return;
    setSelectedIso3(normalized);
    setPanelOpen(true);
    setActiveTab("country-data");
  }

  function submitAssistantQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;
    const requestId = ++assistantInsightRequestRef.current;
    setAssistantMessages((current) => [...current, buildUserMessage(trimmed)]);
    setInsightQuestion("");
    void (async () => {
      const data = await loadAssistantInsight(trimmed, requestId);
      if (!data || requestId !== assistantInsightRequestRef.current) return;
      setAssistantMessages((current) => [...current, buildAssistantMessage(data)]);
    })();
  }

  return (
    <GlobeCanvas
      overlays={
        <>
          <TopNav
            sidebarOpen={panelOpen}
            layer={layerKey}
            onToggleSidebar={() => setPanelOpen((current) => !current)}
            onLayerChange={setLayerKey}
          />

          <RightSidebar
            open={panelOpen}
            activeTab={activeTab}
            title="Country Data & Insights"
            selectedCountryLabel={selectedCountryLabel}
            statusLabel={statusLabel}
            generatedAt={generatedAt}
            onClose={() => setPanelOpen(false)}
            onTabChange={setActiveTab}
          >
            {activeTab === "country-data" ? (
              <CountryBriefTab
                summary={countrySummary}
                loading={countryLoading}
                error={countryError}
                generatedAt={generatedAt}
                insightError={countryInsightError}
                insight={countryInsightIso3 === selectedIso3 ? countryInsightResult : null}
                insightLoading={countryInsightLoading}
                pipelineLoading={waitingForCountryPipeline}
                onOpenVisuals={() => setActiveTab("visuals")}
                onOpenInsights={() => setActiveTab("insights")}
              />
            ) : null}

            {activeTab === "insights" ? (
              <AssistantTab
                question={insightQuestion}
                loading={assistantInsightLoading}
                error={assistantInsightError}
                messages={assistantMessages}
                onQuestionChange={setInsightQuestion}
                onSend={submitAssistantQuestion}
                onClear={() => {
                  setInsightQuestion("");
                  setAssistantMessages([]);
                  setAssistantInsightError(null);
                }}
              />
            ) : null}

            {activeTab === "visuals" ? (
              <VisualsTab
                metric={visualMetric}
                series={visualSeries}
                loading={visualLoading}
                error={visualError}
                allowComparativeFromQuery={insightsQueryIsComparative}
                onMetricChange={setVisualMetric}
                onRetry={() => {
                  if (selectedIso3) {
                    void loadVisualData(selectedIso3, visualMetric, true);
                  }
                }}
              />
            ) : null}
          </RightSidebar>

          {layerError ? (
            <div className="pointer-events-none fixed left-1/2 top-16 z-20 w-[min(90vw,520px)] -translate-x-1/2 rounded-lg border border-[#8a3d47] bg-[#3b1a22]/95 px-3 py-2 text-sm text-[#ffd9df]">
              {layerError}
            </div>
          ) : null}
        </>
      }
    >
      <div className="h-full w-full">
        <Globe3D
          metrics={metrics}
          layerMode={layerKeyToMode(layerKey)}
          layerData={layerData}
          selectedIso3={selectedIso3}
          highlightedIso3={highlightedIso3}
          onSelect={(iso3) =>
            onCountryPinch({
              countryCode: iso3,
              countryName: countryByIso3.get(iso3)?.name
            })
          }
          onHover={() => undefined}
          className="globe-canvas-full"
        />
      </div>
    </GlobeCanvas>
  );
}
