export function LandingFeatures() {
  return (
    <section id="features" className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <article className="rounded-xl border border-[#2e4f63] bg-[#10202d] p-4">
        <h2 className="m-0 text-base font-semibold">Global Risk Visibility</h2>
        <p className="mt-2 text-sm text-[#adc4d5]">
          Interactive globe overlays for severity, in-need rates, coverage, and funding gaps.
        </p>
      </article>
      <article className="rounded-xl border border-[#2e4f63] bg-[#10202d] p-4">
        <h2 className="m-0 text-base font-semibold">Analyst Workflows</h2>
        <p className="mt-2 text-sm text-[#adc4d5]">
          Country drilldown, ranking views, and cluster context for rapid triage.
        </p>
      </article>
      <article className="rounded-xl border border-[#2e4f63] bg-[#10202d] p-4">
        <h2 className="m-0 text-base font-semibold">Integration Ready</h2>
        <p className="mt-2 text-sm text-[#adc4d5]">
          Databricks Agent, Genie, CV detection, and WebSocket seams are already wired.
        </p>
      </article>
    </section>
  );
}
