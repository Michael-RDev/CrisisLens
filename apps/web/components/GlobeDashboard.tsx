"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { countryByIso3, iso3ByIso2 } from "@/lib/countries";
import { fetchGeoInsight, runGeoStrategicQuery, fetchGeoSummary, subscribeToGlobeEvents } from "@/lib/api/crisiswatch";
import type { GeoInsight, GeoMetrics, GeoStrategicQueryResult } from "@/lib/api/crisiswatch";
import { CountryMetrics, LayerMode } from "@/lib/types";
import {
  CountryComparisonChartPanel,
  CountryKpis,
  DashboardHeader,
  DashboardFooter,
  GlobeCard,
  InsightPanel,
  LayerSelector,
  StrategicQueryPanel,
  buildHoverText
} from "@/components/dashboard";
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

export default function GlobeDashboard({ metrics, generatedAt }: GlobeDashboardProps) {
  const [selectedIso3, setSelectedIso3] = useState<string | null>(metrics[0]?.iso3 ?? null);
  const [hoverIso3, setHoverIso3] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [layerMode, setLayerMode] = useState<LayerMode>("overlooked");
  const [highlightedIso3, setHighlightedIso3] = useState<string[]>([]);

  const [insightOpen, setInsightOpen] = useState(false);
  const [insightSelection, setInsightSelection] = useState<PinchSelection | null>(null);
  const [insightMetrics, setInsightMetrics] = useState<GeoMetrics | null>(null);
  const [insightSummary, setInsightSummary] = useState<GeoInsight | null>(null);
  const [insightMetricsLoading, setInsightMetricsLoading] = useState(false);
  const [insightSummaryLoading, setInsightSummaryLoading] = useState(false);
  const [insightMetricsError, setInsightMetricsError] = useState<string | null>(null);
  const [insightSummaryError, setInsightSummaryError] = useState<string | null>(null);
  const [insightProgressLabel, setInsightProgressLabel] = useState("Waiting for country selection.");
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [lastAskedQuestion, setLastAskedQuestion] = useState<string | null>(null);
  const [strategicQuestion, setStrategicQuestion] = useState("");
  const [strategicLoading, setStrategicLoading] = useState(false);
  const [strategicError, setStrategicError] = useState<string | null>(null);
  const [strategicResult, setStrategicResult] = useState<GeoStrategicQueryResult | null>(null);

  const byIso = useMemo(() => new Map(metrics.map((item) => [item.iso3, item])), [metrics]);
  const countrySuggestions = useMemo(() => getCountrySuggestions(), []);

  const selected = selectedIso3 ? byIso.get(selectedIso3) ?? null : null;
  const selectedCountryMeta = selectedIso3 ? countryByIso3.get(selectedIso3) ?? null : null;
  const hoverCountryMetric = hoverIso3 ? byIso.get(hoverIso3) ?? null : null;
  const hoverCountryMeta = hoverIso3 ? countryByIso3.get(hoverIso3) ?? null : null;

  const hoverText = buildHoverText({ hoverCountryMetric, hoverCountryMeta, layerMode });

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

  async function loadInsightForCountry(selection: PinchSelection, followUp?: string) {
    const normalized = selection.countryCode ? normalizeCountryCode(selection.countryCode) : null;
    if (!normalized && !selection.countryName?.trim()) {
      setInsightMetricsError("Country selection is missing ISO3 and country name.");
      setInsightSummaryError("Cannot load geo insight without a valid country selection.");
      return;
    }

    setInsightSelection({
      countryCode: normalized ?? undefined,
      countryName: selection.countryName
    });
    if (normalized) setSelectedIso3(normalized);
    setInsightOpen(true);
    setInsightMetrics(null);
    setInsightSummary(null);
    setLastAskedQuestion(followUp?.trim() ? followUp.trim() : null);
    setInsightMetricsError(null);
    setInsightSummaryError(null);
    setInsightProgressLabel("Loading geo insight...");
    setInsightMetricsLoading(true);
    setInsightSummaryLoading(true);

    try {
      const payload = await fetchGeoInsight({
        iso3: normalized ?? undefined,
        country: normalized ? undefined : selection.countryName
      });
      setInsightMetrics(payload.metrics);
      setInsightSummary(payload.insight);
      setInsightSelection({
        countryCode: payload.metrics.iso3,
        countryName: payload.metrics.country
      });
      setSelectedIso3(payload.metrics.iso3);
      if (followUp?.trim()) {
        setInsightProgressLabel("Applying follow-up question...");
        const refined = await fetchGeoSummary({
          metrics: payload.metrics,
          question: followUp.trim()
        });
        setInsightSummary(refined);
        setLastAskedQuestion(followUp.trim());
      }
      setInsightProgressLabel("Summary ready.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load geo insight.";
      setInsightMetricsError(message);
      setInsightSummaryError(message);
      setInsightMetrics(null);
      setInsightSummary(null);
      setInsightProgressLabel("Unable to load geo insight.");
    } finally {
      setInsightMetricsLoading(false);
      setInsightSummaryLoading(false);
    }
  }

  function onCountryPinch(selection: PinchSelection) {
    // Plug your existing globe pinch callback into this handler.
    // Expected payload shape: onCountryPinch({ countryCode, countryName? }).
    setFollowUpQuestion("");
    setLastAskedQuestion(null);
    void loadInsightForCountry(selection);
  }

  async function refreshInsightSummary() {
    if (!insightSelection) return;
    setFollowUpQuestion("");
    setLastAskedQuestion(null);
    await loadInsightForCountry(insightSelection);
  }

  async function submitInsightFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!insightSelection || !followUpQuestion.trim()) return;
    setLastAskedQuestion(followUpQuestion.trim());
    await loadInsightForCountry(insightSelection, followUpQuestion.trim());
    setFollowUpQuestion("");
  }

  async function askInsightFollowupChip(questionText: string) {
    if (!insightMetrics || !questionText.trim()) return;
    setInsightSummaryLoading(true);
    setInsightSummaryError(null);
    setInsightSummary(null);
    setInsightProgressLabel("Applying follow-up question...");
    try {
      const refined = await fetchGeoSummary({
        metrics: insightMetrics,
        question: questionText
      });
      setInsightSummary(refined);
      setFollowUpQuestion(questionText);
      setLastAskedQuestion(questionText);
      setInsightProgressLabel("Summary ready.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to apply follow-up.";
      setInsightSummaryError(message);
      setInsightProgressLabel("Unable to apply follow-up.");
    } finally {
      setInsightSummaryLoading(false);
    }
  }

  async function submitStrategicQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!strategicQuestion.trim()) return;
    setStrategicLoading(true);
    setStrategicError(null);
    try {
      const result = await runGeoStrategicQuery(strategicQuestion.trim());
      setStrategicResult(result);
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
    }
  }

  return (
    <main className="mx-auto max-w-[1520px] p-4 sm:p-5">
      <DashboardHeader generatedAt={generatedAt} />
      <LayerSelector layerMode={layerMode} onChange={setLayerMode} />

      <section className="dashboard-grid mt-4 grid grid-cols-1 items-start gap-3 xl:grid-cols-12">
        <div className="space-y-3 xl:col-span-8">
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

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <CountryKpis selected={selected} selectedCountryMeta={selectedCountryMeta} selectedOci={null} />
            <CountryComparisonChartPanel
              rows={metrics}
              layerMode={layerMode}
              selectedIso3={selectedIso3}
              onSelectIso3={setSelectedIso3}
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <StrategicQueryPanel
              question={strategicQuestion}
              loading={strategicLoading}
              error={strategicError}
              result={strategicResult}
              onQuestionChange={setStrategicQuestion}
              onSubmit={submitStrategicQuery}
              onUseFollowup={useStrategicFollowup}
            />
          </div>
        </div>

        <div className="xl:col-span-4 xl:self-start">
          <InsightPanel
            isOpen={insightOpen}
            countryCode={insightSelection?.countryCode}
            countryName={insightSelection?.countryName}
            metrics={insightMetrics}
            insight={insightSummary}
            metricsLoading={insightMetricsLoading}
            summaryLoading={insightSummaryLoading}
            metricsError={insightMetricsError}
            summaryError={insightSummaryError}
            progressLabel={insightProgressLabel}
            followUpQuestion={followUpQuestion}
            lastAskedQuestion={lastAskedQuestion}
            onClose={() => setInsightOpen(false)}
            onRefreshSummary={() => void refreshInsightSummary()}
            onFollowUpChange={setFollowUpQuestion}
            onSubmitFollowUp={submitInsightFollowUp}
            onFollowupChip={askInsightFollowupChip}
          />
        </div>
      </section>
      <DashboardFooter />
    </main>
  );
}
