"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { countryByIso3, iso3ByIso2 } from "@/lib/countries";
import {
  askGenieCountryInsight,
  ensureGenieConversation,
  runGeoStrategicQuery,
  subscribeToGlobeEvents
} from "@/lib/api/crisiswatch";
import type { GeoStrategicQueryResult } from "@/lib/api/crisiswatch";
import { CountryMetrics, LayerMode } from "@/lib/types";
import {
  CommandCenterLayout
} from "@/components/command-center/CommandCenterLayout";
import { RightPanel } from "@/components/command-center/RightPanel";
import { AssistantTab } from "@/components/command-center/tabs/AssistantTab";
import { CountryBriefTab } from "@/components/command-center/tabs/CountryBriefTab";
import { VisualsTab } from "@/components/command-center/tabs/VisualsTab";
import type { CommandTabId } from "@/components/command-center/Tabs";
import { HandControlsWidget } from "@/components/command-center/HandControlsWidget";
import { getCountrySuggestions, resolveJumpToCountryIso3 } from "@/components/dashboard/dashboard-utils";

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

function chartPromptForLayer(layerMode: LayerMode): string {
  if (layerMode === "coverage") {
    return "Show top 10 countries by coverage percentage with funding gap, gap per person, and people in need.";
  }
  if (layerMode === "severity") {
    return "Show top 10 countries by funding gap per person with coverage, funding gap, and people in need.";
  }
  if (layerMode === "inNeedRate") {
    return "Show top 10 countries by people in need with coverage, funding gap, and gap per person.";
  }
  if (layerMode === "overlooked") {
    return "Show top 10 most overlooked countries with coverage, funding gap, people in need, and gap per person.";
  }
  return "Show top 10 countries by funding gap in USD with coverage, gap per person, and people in need.";
}

function countryStatus(metric: CountryMetrics | null): string {
  if (!metric) return "Awaiting country selection";
  const oci = metric.overlookedScore ?? 0;
  if (oci >= 80) return "CRITICAL - Overlooked";
  if (oci >= 60) return "HIGH - Overlooked";
  if (oci >= 40) return "MODERATE - Watch";
  return metric.percentFunded < 20 ? "HIGH - Underfunded" : "LOW - Monitored";
}

export default function GlobeDashboard({ metrics, generatedAt }: GlobeDashboardProps) {
  const [selectedIso3, setSelectedIso3] = useState<string | null>(metrics[0]?.iso3 ?? null);
  const [hoverIso3, setHoverIso3] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [layerMode, setLayerMode] = useState<LayerMode>("overlooked");
  const [highlightedIso3, setHighlightedIso3] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<CommandTabId>("assistant");
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

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

  const [strategicQuestion, setStrategicQuestion] = useState("");
  const [strategicLoading, setStrategicLoading] = useState(false);
  const [strategicError, setStrategicError] = useState<string | null>(null);
  const [strategicResult, setStrategicResult] = useState<GeoStrategicQueryResult | null>(null);
  const [useSelectedCountry, setUseSelectedCountry] = useState(false);

  const [chartRows, setChartRows] = useState<GeoStrategicQueryResult["rows"]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);

  const byIso = useMemo(() => new Map(metrics.map((item) => [item.iso3, item])), [metrics]);
  const countrySuggestions = useMemo(() => getCountrySuggestions(), []);

  const activeCountryIso = insightSelection?.countryCode ?? selectedIso3 ?? undefined;
  const activeMetric = activeCountryIso ? byIso.get(activeCountryIso) ?? null : null;
  const activeCountryName =
    insightSelection?.countryName ??
    activeMetric?.country ??
    (activeCountryIso ? countryByIso3.get(activeCountryIso)?.name : undefined);

  const hoverCountryMetric = hoverIso3 ? byIso.get(hoverIso3) ?? null : null;
  const hoverCountryMeta = hoverIso3 ? countryByIso3.get(hoverIso3) ?? null : null;
  const hoverText = hoverCountryMeta
    ? `${hoverCountryMeta.name} (${hoverCountryMeta.iso3})`
    : hoverCountryMetric
      ? `${hoverCountryMetric.country} (${hoverCountryMetric.iso3})`
      : "Hover countries for details. Drag to rotate. Scroll to zoom. Pinch selects a country.";

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

  async function refreshChartData(currentLayer: LayerMode) {
    setChartLoading(true);
    setChartError(null);
    try {
      const result = await runGeoStrategicQuery(chartPromptForLayer(currentLayer));
      setChartRows(result.rows);
    } catch (error) {
      setChartRows([]);
      setChartError(error instanceof Error ? error.message : "Unable to load chart data.");
    } finally {
      setChartLoading(false);
    }
  }

  useEffect(() => {
    void refreshChartData(layerMode);
  }, [layerMode]);

  async function loadInsightForCountry(selection: PinchSelection) {
    const normalized = selection.countryCode ? normalizeCountryCode(selection.countryCode) : null;
    if (!normalized) {
      setInsightError("Country selection must resolve to ISO3 for Genie request.");
      return;
    }

    setInsightSelection({ countryCode: normalized, countryName: selection.countryName });
    setSelectedIso3(normalized);
    setInsightLoading(true);
    setInsightError(null);
    setInsightFormatted(null);
    setPanelOpen(true);
    setPanelCollapsed(false);
    setActiveTab("country-brief");

    try {
      const conversationId =
        genieConversationId ?? (await ensureGenieConversation()).conversationId;

      if (!genieConversationId) setGenieConversationId(conversationId);

      const payload = await askGenieCountryInsight({
        conversationId,
        iso3: normalized,
        countryName: selection.countryName,
        intent: "summary"
      });
      setInsightFormatted(payload.formatted ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load geo insight.";
      setInsightError(message);
      setInsightFormatted(null);
    } finally {
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
      setChartRows(result.rows);
      setChartError(null);
      setActiveTab("assistant");
      setPanelOpen(true);
      setPanelCollapsed(false);
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
        setChartRows(result.rows);
        setChartError(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to run strategic follow-up.";
        setStrategicError(message);
      } finally {
        setStrategicLoading(false);
      }
    })();
  }

  function jumpToCountry() {
    const iso3 = resolveJumpToCountryIso3(query);
    if (iso3) {
      setSelectedIso3(iso3);
      onCountryPinch({ countryCode: iso3, countryName: countryByIso3.get(iso3)?.name });
    }
  }

  return (
    <CommandCenterLayout
      generatedAt={generatedAt}
      layerMode={layerMode}
      query={query}
      countrySuggestions={countrySuggestions}
      hoverText={hoverText}
      onLayerChange={setLayerMode}
      onQueryChange={setQuery}
      onJump={jumpToCountry}
      globe={
        <Globe3D
          metrics={metrics}
          layerMode={layerMode}
          selectedIso3={selectedIso3}
          highlightedIso3={highlightedIso3}
          onSelect={(iso3) =>
            onCountryPinch({
              countryCode: iso3,
              countryName: countryByIso3.get(iso3)?.name
            })
          }
          onHover={setHoverIso3}
          className="globe-canvas-full"
        />
      }
      handControls={<HandControlsWidget />}
      rightPanel={
        <RightPanel
          open={panelOpen}
          collapsed={panelCollapsed}
          selectedCountryLabel={
            activeCountryIso
              ? `${activeCountryName ?? "Country"} • ${activeCountryIso}`
              : "No country selected"
          }
          statusLabel={countryStatus(activeMetric)}
          activeTab={activeTab}
          onToggleOpen={() => setPanelOpen((current) => !current)}
          onToggleCollapsed={() => setPanelCollapsed((current) => !current)}
          onTabChange={setActiveTab}
        >
          {activeTab === "assistant" ? (
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

          {activeTab === "country-brief" ? (
            <CountryBriefTab
              countryCode={activeCountryIso}
              countryName={activeCountryName}
              metric={activeMetric}
              loading={insightLoading}
              error={insightError}
              formatted={insightFormatted}
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
        </RightPanel>
      }
    />
  );
}
