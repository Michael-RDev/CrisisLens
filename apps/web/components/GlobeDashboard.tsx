"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
  CountryComparisonChartPanel,
  DashboardHeader,
  DashboardFooter,
  GlobeCard,
  LayerSelector,
  StrategicQueryPanel
} from "@/components/dashboard";
import InsightPanel from "@/components/InsightPanel";
import { getCountrySuggestions, resolveJumpToCountryIso3 } from "@/components/dashboard/dashboard-utils";

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
  if (layerMode === "inNeedRate") {
    return "Show top 10 countries by people in need with coverage, funding gap, and gap per person.";
  }
  if (layerMode === "severity") {
    return "Show top 10 countries by funding gap per person with coverage, funding gap, and people in need.";
  }
  return "Show top 10 countries by funding gap in USD with coverage, gap per person, and people in need.";
}

export default function GlobeDashboard({ metrics, generatedAt }: GlobeDashboardProps) {
  const [selectedIso3, setSelectedIso3] = useState<string | null>(metrics[0]?.iso3 ?? null);
  const [hoverIso3, setHoverIso3] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [layerMode, setLayerMode] = useState<LayerMode>("overlooked");
  const [highlightedIso3, setHighlightedIso3] = useState<string[]>([]);

  const [insightSelection, setInsightSelection] = useState<PinchSelection | null>(null);
  const [genieConversationId, setGenieConversationId] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [insightSummaryText, setInsightSummaryText] = useState("");
  const [insightQueryResult, setInsightQueryResult] = useState<{
    columns: string[];
    rows: unknown[][];
    rowCount?: number;
  } | null>(null);

  const [strategicQuestion, setStrategicQuestion] = useState("");
  const [strategicLoading, setStrategicLoading] = useState(false);
  const [strategicError, setStrategicError] = useState<string | null>(null);
  const [strategicResult, setStrategicResult] = useState<GeoStrategicQueryResult | null>(null);

  const [chartRows, setChartRows] = useState<GeoStrategicQueryResult["rows"]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const hasLoadedChartRef = useRef(false);

  const byIso = useMemo(() => new Map(metrics.map((item) => [item.iso3, item])), [metrics]);
  const countrySuggestions = useMemo(() => getCountrySuggestions(), []);
  const hoverCountryMetric = hoverIso3 ? byIso.get(hoverIso3) ?? null : null;
  const hoverCountryMeta = hoverIso3 ? countryByIso3.get(hoverIso3) ?? null : null;

  const hoverText = hoverCountryMeta
    ? `${hoverCountryMeta.name} (${hoverCountryMeta.iso3})`
    : hoverCountryMetric
      ? `${hoverCountryMetric.country} (${hoverCountryMetric.iso3})`
      : "Hover countries for details. Drag to rotate. Scroll to zoom.";

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
      setChartError(error instanceof Error ? error.message : "Unable to load Databricks chart data.");
    } finally {
      setChartLoading(false);
    }
  }

  useEffect(() => {
    if (!hasLoadedChartRef.current) {
      hasLoadedChartRef.current = true;
      return;
    }
    void refreshChartData(layerMode);
  }, [layerMode]);

  async function loadInsightForCountry(selection: PinchSelection) {
    const normalized = selection.countryCode ? normalizeCountryCode(selection.countryCode) : null;
    if (!normalized && !selection.countryName?.trim()) {
      setInsightError("Country selection is missing ISO3 and country name.");
      return;
    }

    if (!normalized) {
      setInsightError("Pinch selection must resolve to ISO3 for Genie request.");
      return;
    }

    setInsightSelection({ countryCode: normalized, countryName: selection.countryName });
    setSelectedIso3(normalized);
    setInsightLoading(true);
    setInsightError(null);
    setInsightSummaryText("");
    setInsightQueryResult(null);

    try {
      const conversationId =
        genieConversationId ??
        (
          await ensureGenieConversation()
        ).conversationId;

      if (!genieConversationId) {
        setGenieConversationId(conversationId);
      }

      const payload = await askGenieCountryInsight({
        conversationId,
        iso3: normalized,
        countryName: selection.countryName,
        intent: "summary"
      });
      setInsightSummaryText(payload.summaryText);
      setInsightQueryResult(payload.queryResult ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load geo insight.";
      setInsightError(message);
      setInsightSummaryText("");
      setInsightQueryResult(null);
    } finally {
      setInsightLoading(false);
    }
  }

  function onCountryPinch(selection: PinchSelection) {
    // Plug your existing globe pinch callback into this handler.
    // Expected payload shape: onCountryPinch({ countryCode, countryName? }).
    void loadInsightForCountry(selection);
  }

  async function submitStrategicQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!strategicQuestion.trim()) return;

    setStrategicLoading(true);
    setStrategicError(null);
    try {
      const result = await runGeoStrategicQuery(strategicQuestion.trim());
      setStrategicResult(result);
      setChartRows(result.rows);
      setChartError(null);
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
        const result = await runGeoStrategicQuery(questionText);
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
      void loadInsightForCountry({ countryCode: iso3, countryName: countryByIso3.get(iso3)?.name });
    }
  }

  return (
    <main className="mx-auto max-w-[1520px] p-4 sm:p-5">
      <DashboardHeader generatedAt={generatedAt} />
      <LayerSelector layerMode={layerMode} onChange={setLayerMode} />

      <section className="dashboard-grid mt-4 grid grid-cols-1 items-start gap-3 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <GlobeCard
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
        </div>

        <div className="xl:col-span-4">
          <StrategicQueryPanel
            question={strategicQuestion}
            loading={strategicLoading}
            error={strategicError}
            result={strategicResult}
            className="h-full"
            onQuestionChange={setStrategicQuestion}
            onSubmit={submitStrategicQuery}
            onUseFollowup={useStrategicFollowup}
          />
        </div>

        <div className="xl:col-span-6">
          <InsightPanel
            open={Boolean(insightSelection?.countryCode)}
            countryCode={insightSelection?.countryCode}
            countryName={insightSelection?.countryName}
            loading={insightLoading}
            error={insightError}
            summaryText={insightSummaryText}
            queryResult={insightQueryResult}
            onRetry={() => {
              if (insightSelection) {
                void loadInsightForCountry(insightSelection);
              }
            }}
          />
        </div>

        <div className="xl:col-span-6">
          <CountryComparisonChartPanel
            rows={chartRows}
            layerMode={layerMode}
            selectedIso3={insightSelection?.countryCode ?? selectedIso3}
            loading={chartLoading}
            error={chartError}
            className="h-full"
            onSelectIso3={(iso3) => {
              setSelectedIso3(iso3);
              void loadInsightForCountry({ countryCode: iso3, countryName: countryByIso3.get(iso3)?.name });
            }}
          />
        </div>
      </section>
      <DashboardFooter />
    </main>
  );
}
