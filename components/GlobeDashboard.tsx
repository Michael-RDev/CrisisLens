"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { computeGlobalSummary, formatCompact } from "@/components/summary-utils";
import { allCountriesSorted, countryByIso3 } from "@/lib/countries";
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
  coverage: { label: "Coverage", unit: "%", highIsBad: false },
  overlooked: { label: "Overlooked Index (OCI)", unit: "pts", highIsBad: true }
};

const queryTemplates = [
  "What projects are most similar to PRJ-2025-SDN-health and how does their efficiency compare?",
  "Rank the top 10 most overlooked crises by OCI and explain why."
];

function riskClass(riskBand?: RiskBand): string {
  if (riskBand === "critical") return "chip-critical";
  if (riskBand === "high") return "chip-high";
  if (riskBand === "moderate") return "chip-moderate";
  return "chip-low";
}

function outlierLabel(flag: "low" | "high" | "none"): string {
  if (flag === "high") return "High BBR outlier";
  if (flag === "low") return "Low BBR outlier";
  return "Within range";
}

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
            Explainable overlooked-crisis analytics for UN decision support: OCI ranking, cluster-level
            beneficiary-to-budget outliers, benchmark lookalikes, and funding what-if simulation.
          </p>
          <p className="meta">Snapshot: {new Date(generatedAt).toLocaleString()}</p>
        </div>
        <div className="hero-badge">
          <span>OCI Explainability</span>
          <span>Outlier Benchmarking</span>
          <span>What-if Simulator</span>
        </div>
      </motion.section>

      <section className="top-tabs">
        <button className="active">Global View</button>
        <button>Overlooked Index</button>
        <button>Project Outliers</button>
        <button>What-if Allocation</button>
        <button>Genie Query</button>
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
          <h3>Funding Gap</h3>
          <p>${formatCompact(summary.fundingGap)}</p>
        </article>
        <article>
          <h3>Top Overlooked</h3>
          <p>{overview?.top_overlooked[0]?.iso3 ?? "—"}</p>
          <small>
            OCI {overview?.top_overlooked[0]?.oci_score?.toFixed(1) ?? "—"} •{" "}
            {overview?.top_overlooked[0]?.country ?? "Loading"}
          </small>
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
            <h2>Interactive Globe</h2>
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
                  : "Hover countries for details. Drag to rotate. Scroll to zoom. Pinch-control is available from the overlay."}
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
                <dt>Overlooked Index (OCI)</dt>
                <dd>{selectedOci?.totalScore?.toFixed(2) ?? "—"}</dd>
              </div>
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
                <dt>Funding Gap %</dt>
                <dd>{selectedDerived.fundingGapPct.toFixed(1)}%</dd>
              </div>
            </dl>
          ) : selectedCountryMeta ? (
            <p>
              {selectedCountryMeta.name} is selected, but this country has no current metric record in
              the loaded snapshot yet.
            </p>
          ) : (
            <p>Select a country from the globe or ranking list.</p>
          )}

          <h3 className="panel-subtitle">OCI Component Breakdown</h3>
          {selectedOci ? (
            <ul className="cluster-list">
              <li>
                <span>Severity Component</span>
                <strong>{selectedOci.severityComponent.toFixed(1)}</strong>
              </li>
              <li>
                <span>In-Need Rate Component</span>
                <strong>{selectedOci.inNeedRateComponent.toFixed(1)}</strong>
              </li>
              <li>
                <span>Funding Gap Component</span>
                <strong>{selectedOci.fundingGapComponent.toFixed(1)}</strong>
              </li>
              <li>
                <span>Coverage Mismatch Component</span>
                <strong>{selectedOci.coverageMismatchComponent.toFixed(1)}</strong>
              </li>
            </ul>
          ) : (
            <p className="subtle">No OCI breakdown available for this selection.</p>
          )}

          <h3 className="panel-subtitle">Cluster Outlier Severity</h3>
          <ul className="cluster-list">
            {clusterBreakdown.length === 0 ? (
              <li className="subtle">No cluster rows available for this country.</li>
            ) : (
              clusterBreakdown.slice(0, 6).map((cluster) => (
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
          <h2>Overlooked Crisis Index (Explainable)</h2>
          <p className="subtle">
            OCI = 32% severity + 28% in-need rate + 22% funding gap + 18% coverage mismatch.
          </p>
          {overviewLoading ? <p>Loading OCI leaderboard...</p> : null}
          {!overviewLoading && overview ? (
            <ul className="cluster-list">
              {overview.top_overlooked.slice(0, 8).map((row) => (
                <li key={row.iso3}>
                  <button
                    className="plain-list-btn"
                    type="button"
                    onClick={() => {
                      setSelectedIso3(row.iso3);
                      setHighlightedIso3([row.iso3]);
                    }}
                  >
                    <span>
                      #{row.rank} {row.country} ({row.iso3})
                    </span>
                    <strong>OCI {row.oci_score.toFixed(1)}</strong>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </article>

        <article className="integration-card glass">
          <h2>Funding What-if Simulator</h2>
          <p className="subtle">
            Test how adding pooled-fund allocation changes country OCI rank and global leaderboard.
          </p>
          <div className="integration-form">
            <input
              value={allocationUsd}
              onChange={(event) => setAllocationUsd(event.target.value)}
              placeholder="5000000"
              inputMode="numeric"
            />
            <button type="button" onClick={runSimulation} disabled={simulationLoading || !selectedIso3}>
              {simulationLoading ? "Simulating..." : `Simulate for ${selectedIso3 ?? "country"}`}
            </button>
          </div>
          {simulation ? (
            <div className="integration-output">
              <p>
                Rank change: <strong>{simulation.rank_delta >= 0 ? "+" : ""}{simulation.rank_delta}</strong>
                {" "} | OCI delta: <strong>{simulation.oci_delta.toFixed(2)}</strong>
              </p>
              <p>
                Funded {simulation.base.percent_funded.toFixed(1)}% →{" "}
                {simulation.scenario.percent_funded.toFixed(1)}%
              </p>
              <p className="subtle">
                New rank: #{simulation.scenario.rank} (was #{simulation.base.rank})
              </p>
            </div>
          ) : null}
        </article>

        <article className="integration-card glass">
          <h2>Project Outliers & Benchmarks</h2>
          {projectOutliers.length === 0 ? (
            <p className="subtle">No outlier projects for this country.</p>
          ) : (
            <ul className="cluster-list">
              {projectOutliers.slice(0, 8).map((project) => (
                <li key={project.project_id}>
                  <button
                    className="plain-list-btn"
                    type="button"
                    onClick={() => setSelectedProjectId(project.project_id)}
                  >
                    <span>
                      {project.cluster_name} • {outlierLabel(project.outlier_flag)}
                    </span>
                    <strong>{project.bbr_z_score.toFixed(2)} z</strong>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {projectDetailLoading ? <p>Loading comparable projects...</p> : null}
          {!projectDetailLoading && projectDetail ? (
            <div className="integration-output">
              <p>
                <strong>{projectDetail.project_name}</strong>
              </p>
              <p className="subtle">
                Budget ${Math.round(projectDetail.metrics.budget_usd).toLocaleString()} • Targeted{" "}
                {Math.round(projectDetail.metrics.people_targeted).toLocaleString()}
              </p>
              <ul className="cluster-list">
                {projectDetail.comparable_projects.map((peer) => (
                  <li key={peer.project_id}>
                    <span>
                      {peer.project_id} • {peer.rationale}
                    </span>
                    <strong>{(peer.similarity_score * 100).toFixed(0)}%</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
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
              placeholder="Ask a query (example: top overlooked crises by OCI)."
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
            Gesture control is enabled on the globe. CV endpoint remains available for external camera
            streams and country auto-select integration.
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

