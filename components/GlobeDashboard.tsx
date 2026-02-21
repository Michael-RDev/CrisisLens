"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { computeGlobalSummary, formatCompact } from "@/components/summary-utils";
import { allCountriesSorted, countryByIso3 } from "@/lib/countries";
import { fetchCountryDrilldown, queryGenie, subscribeToGlobeEvents } from "@/lib/api/crisiswatch";
import { normalizeIso3, shouldApplyCVDetection } from "@/lib/cv/globeBridge";
import { computeDerivedMetrics, getLayerValue } from "@/lib/metrics";
import { CountryMetrics, LayerMode, RiskBand } from "@/lib/types";
import type { DatabricksCountryState } from "@/lib/databricks/client";
import type { CVDetection } from "@/lib/cv/provider";

const Globe3D = dynamic(() => import("@/components/Globe3D"), {
  ssr: false,
  loading: () => <div className="globe-canvas globe-loading">Loading 3D globe...</div>
});

type GlobeDashboardProps = {
  metrics: CountryMetrics[];
  generatedAt: string;
};

const layerConfig: Record<LayerMode, { label: string; unit: string; highIsBad: boolean }> = {
  severity: { label: "Severity", unit: "pts", highIsBad: true },
  inNeedRate: { label: "In-Need Rate", unit: "%", highIsBad: true },
  fundingGap: { label: "Funding Gap", unit: "%", highIsBad: true },
  coverage: { label: "Coverage", unit: "%", highIsBad: false }
};

const queryTemplates = [
  "What projects are most similar to HRP-2024-ETH-00423 and how does their efficiency compare?",
  "Rank the top 10 most overlooked crises by Coverage Mismatch Index."
];

function riskClass(riskBand?: RiskBand): string {
  if (riskBand === "critical") return "chip-critical";
  if (riskBand === "high") return "chip-high";
  if (riskBand === "moderate") return "chip-moderate";
  return "chip-low";
}

export default function GlobeDashboard({ metrics, generatedAt }: GlobeDashboardProps) {
  const [selectedIso3, setSelectedIso3] = useState<string | null>(metrics[0]?.iso3 ?? null);
  const [hoverIso3, setHoverIso3] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [layerMode, setLayerMode] = useState<LayerMode>("severity");
  const [highlightedIso3, setHighlightedIso3] = useState<string[]>([]);

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

  const [clusterBreakdown, setClusterBreakdown] = useState<
    Array<{ cluster_name: string; bbr: number; bbr_z_score: number }>
  >([]);

  const byIso = useMemo(() => new Map(metrics.map((item) => [item.iso3, item])), [metrics]);
  const countryCatalogByIso = useMemo(() => countryByIso3, []);
  const summary = useMemo(() => computeGlobalSummary(metrics), [metrics]);
  const countrySuggestions = useMemo(
    () => allCountriesSorted.map((row) => `${row.name} (${row.iso3})`),
    []
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return metrics;
    const needle = query.trim().toLowerCase();
    return metrics.filter(
      (row) => row.country.toLowerCase().includes(needle) || row.iso3.toLowerCase().includes(needle)
    );
  }, [metrics, query]);

  const selected = selectedIso3 ? byIso.get(selectedIso3) ?? null : null;
  const selectedCountryMeta = selectedIso3 ? countryCatalogByIso.get(selectedIso3) ?? null : null;
  const hoverCountryMetric = hoverIso3 ? byIso.get(hoverIso3) ?? null : null;
  const hoverCountryMeta = hoverIso3 ? countryCatalogByIso.get(hoverIso3) ?? null : null;
  const selectedDerived = selected ? computeDerivedMetrics(selected) : null;

  const ranked = useMemo(() => {
    return [...filtered]
      .sort((a, b) => getLayerValue(b, layerMode) - getLayerValue(a, layerMode))
      .slice(0, 12);
  }, [filtered, layerMode]);

  useEffect(() => {
    if (!selectedIso3) {
      setAgentState(null);
      setClusterBreakdown([]);
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
        setAgentState(agent);
        setClusterBreakdown(drilldown.cluster_breakdown);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setAgentState(null);
          setClusterBreakdown([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setAgentLoading(false);
      });

    return () => controller.abort();
  }, [selectedIso3]);

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

  function jumpToCountry() {
    const raw = query.trim();
    const isoFromLabel = raw.match(/\(([A-Za-z]{3})\)$/)?.[1]?.toUpperCase();
    if (isoFromLabel && countryCatalogByIso.has(isoFromLabel)) {
      setSelectedIso3(isoFromLabel);
      return;
    }

    const needle = raw.toLowerCase();
    if (!needle) return;
    const exactIso = allCountriesSorted.find((item) => item.iso3.toLowerCase() === needle);
    if (exactIso) {
      setSelectedIso3(exactIso.iso3);
      return;
    }
    const nameMatch = allCountriesSorted.find((item) => item.name.toLowerCase().includes(needle));
    if (nameMatch) {
      setSelectedIso3(nameMatch.iso3);
    }
  }

  return (
    <main className="page-shell">
      <motion.section
        className="hero glass"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div>
          <h1>CrisisLens Command Center</h1>
          <p>
            Three.js Tier-4 interactive globe. Orbit, zoom, hover, click drill-down, and integration
            seams for Databricks Genie, Agent Bricks, CV pointing, and WebSocket anomaly events.
          </p>
          <p className="meta">Snapshot: {new Date(generatedAt).toLocaleString()}</p>
        </div>
        <div className="hero-badge">
          <span>3D Globe</span>
          <span>WebSocket Ready</span>
          <span>Genie Sync</span>
        </div>
      </motion.section>

      <section className="top-tabs">
        <button className="active">Global View</button>
        <button>Country Drilldown</button>
        <button>Agent Insights</button>
        <button>Genie Query</button>
        <button>CV Pointer</button>
      </section>

      <motion.section
        className="kpi-grid"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, delay: 0.08 }}
      >
        <article>
          <h3>Population Tracked</h3>
          <p>{formatCompact(summary.population)}</p>
        </article>
        <article>
          <h3>People In Need</h3>
          <p>{formatCompact(summary.inNeed)}</p>
        </article>
        <article>
          <h3>Funding Received</h3>
          <p>${formatCompact(summary.fundingReceived)}</p>
        </article>
        <article>
          <h3>Funding Gap</h3>
          <p>${formatCompact(summary.fundingGap)}</p>
          <small>{summary.fundedPct.toFixed(1)}% funded globally</small>
        </article>
      </motion.section>

      <section className="layer-row">
        {(Object.keys(layerConfig) as LayerMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            className={mode === layerMode ? "is-active" : ""}
            onClick={() => setLayerMode(mode)}
          >
            {layerConfig[mode].label}
          </button>
        ))}
      </section>

      <section className="dashboard-grid">
        <motion.article
          className="globe-card glass"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.14 }}
        >
          <div className="card-header-row">
            <h2>Interactive 3D Globe</h2>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Jump to country or ISO3 (example: Sudan, SDN)"
              aria-label="Search country"
              list="country-suggestions"
            />
            <datalist id="country-suggestions">
              {countrySuggestions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <button type="button" onClick={jumpToCountry}>
              Jump
            </button>
          </div>
          <Globe3D
            metrics={metrics}
            layerMode={layerMode}
            selectedIso3={selectedIso3}
            highlightedIso3={highlightedIso3}
            onSelect={setSelectedIso3}
            onHover={setHoverIso3}
          />
          <div className="globe-footer">
            <p>
              {hoverCountryMetric
                ? `${hoverCountryMetric.country} (${hoverCountryMetric.iso3}) • ${layerConfig[layerMode].label}: ${getLayerValue(
                    hoverCountryMetric,
                    layerMode
                  ).toFixed(1)}${layerConfig[layerMode].unit}`
                : hoverCountryMeta
                  ? `${hoverCountryMeta.name} (${hoverCountryMeta.iso3}) • no metrics in current snapshot`
                : "Hover countries for details. Drag to rotate. Scroll to zoom. Click any country polygon to open drill-down."}
            </p>
          </div>
        </motion.article>

        <motion.article
          className="country-card glass"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.2 }}
        >
          <h2>
            {selected
              ? `${selected.country} (${selected.iso3})`
              : selectedCountryMeta
                ? `${selectedCountryMeta.name} (${selectedCountryMeta.iso3})`
                : "Select a country"}
          </h2>
          {selected && selectedDerived ? (
            <dl>
              <div>
                <dt>Severity Score</dt>
                <dd>{selected.severityScore.toFixed(1)}</dd>
              </div>
              <div>
                <dt>People In Need %</dt>
                <dd>{selectedDerived.inNeedPct.toFixed(1)}%</dd>
              </div>
              <div>
                <dt>Coverage %</dt>
                <dd>{selectedDerived.coveragePct.toFixed(1)}%</dd>
              </div>
              <div>
                <dt>Funding Gap</dt>
                <dd>${selectedDerived.fundingGap.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Funding Gap %</dt>
                <dd>{selectedDerived.fundingGapPct.toFixed(1)}%</dd>
              </div>
              <div>
                <dt>Plan Requirements</dt>
                <dd>${selected.revisedPlanRequirements.toLocaleString()}</dd>
              </div>
            </dl>
          ) : selectedCountryMeta ? (
            <p>
              {selectedCountryMeta.name} is selected, but this country has no current metric record in
              the loaded snapshot yet. The selection is still valid and CV/Genie highlighting will work
              for it.
            </p>
          ) : (
            <p>Select a country from the globe or ranking list.</p>
          )}

          <h3 className="panel-subtitle">Cluster Breakdown (Mock)</h3>
          <ul className="cluster-list">
            {clusterBreakdown.length === 0 ? (
              <li className="subtle">No cluster rows available for this country yet.</li>
            ) : (
              clusterBreakdown.map((cluster) => (
                <li key={cluster.cluster_name}>
                  <span>{cluster.cluster_name}</span>
                  <strong>{cluster.bbr_z_score.toFixed(2)} z</strong>
                </li>
              ))
            )}
          </ul>
        </motion.article>

        <article className="list-card glass">
          <h2>Priority Ranking ({layerConfig[layerMode].label})</h2>
          <ol>
            {ranked.map((row) => {
              const value = getLayerValue(row, layerMode);
              return (
                <li key={row.iso3}>
                  <button onClick={() => setSelectedIso3(row.iso3)}>
                    <span>
                      {row.country} <small>{row.iso3}</small>
                    </span>
                    <strong>
                      {value.toFixed(1)}
                      {layerConfig[layerMode].unit}
                    </strong>
                  </button>
                </li>
              );
            })}
          </ol>
        </article>

        <article className="integration-card glass">
          <h2>Databricks Agent State</h2>
          {selectedIso3 ? <p className="subtle">Country scope: {selectedIso3}</p> : null}
          {agentLoading ? <p>Loading agent state...</p> : null}
          {!agentLoading && agentState ? (
            <>
              <p className={`risk-chip ${riskClass(agentState.riskBand)}`}>
                Risk band: {agentState.riskBand ?? "n/a"}
              </p>
              <p>{agentState.narrative}</p>
            </>
          ) : null}
          {!agentLoading && !agentState ? (
            <p className="subtle">No agent payload. Wire Databricks serving endpoint next.</p>
          ) : null}
        </article>

        <article className="integration-card glass">
          <h2>Databricks Genie (NLQ)</h2>
          <div className="template-row">
            {queryTemplates.map((template) => (
              <button key={template} type="button" onClick={() => setQuestion(template)}>
                Use Template
              </button>
            ))}
          </div>
          <form onSubmit={submitGenieQuestion} className="integration-form">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={3}
              placeholder="Ask a query (example: top overlooked crises by CMI)."
            />
            <button type="submit" disabled={genieLoading}>
              {genieLoading ? "Querying..." : "Run Genie Query"}
            </button>
          </form>
          {genieAnswer ? (
            <div className="integration-output">
              <p>{genieAnswer}</p>
              <p className="subtle">Globe highlights sync from `highlight_iso3`.</p>
            </div>
          ) : null}
        </article>

        <article className="integration-card glass">
          <h2>CV Point-to-Highlight</h2>
          <p className="subtle">
            Live hand control is now available on the globe card. Use <strong>Start Hand Control</strong>,
            then move one hand to rotate and pinch (thumb + index) to zoom.
          </p>
          <div className="integration-form">
            <textarea
              value={cvFrameInput}
              onChange={(event) => setCvFrameInput(event.target.value)}
              rows={3}
              placeholder="Example: fingertip=0.42,0.31|country=SDN"
            />
            <button type="button" onClick={triggerCvDetection} disabled={cvLoading}>
              {cvLoading ? "Detecting..." : "Detect Country"}
            </button>
          </div>
          {cvDetection ? (
            <div className="integration-output">
              <p>
                Detected: <strong>{cvDetection.iso3}</strong> ({(cvDetection.confidence * 100).toFixed(1)}%)
              </p>
            </div>
          ) : (
            <p className="subtle">No detection yet.</p>
          )}
        </article>
      </section>
    </main>
  );
}
