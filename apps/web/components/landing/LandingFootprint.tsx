const footprintStats = [
  { label: "Countries in scope", value: "118", detail: "Contexts available for country triage" },
  { label: "Priority alerts", value: "24", detail: "Contexts currently trending high risk" },
  { label: "Gap estimate", value: "$2.6B", detail: "Modeled shortfall across active contexts" },
  { label: "Data refresh", value: "6h", detail: "Snapshot and model refresh cadence" }
];

export function LandingFootprint() {
  return (
    <section className="rounded-2xl border border-[var(--cl-border)] bg-[var(--cl-surface)] p-5 sm:p-6" id="footprint">
      <div className="mb-4">
        <h2 className="m-0 text-2xl font-semibold text-[var(--cl-text)] sm:text-3xl">
          Platform Footprint
        </h2>
        <p className="m-0 mt-1 text-sm leading-relaxed text-[var(--cl-text-muted)] sm:text-base">
          Quick context on the operating scope so teams know what the current model cycle includes.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {footprintStats.map((stat) => (
          <article key={stat.label} className="rounded-xl border border-[var(--cl-border-soft)] bg-[var(--cl-surface-elevated)] p-4">
            <p className="m-0 text-xs uppercase tracking-[0.08em] text-[var(--cl-text-muted)]">{stat.label}</p>
            <p className="m-0 pt-2 text-3xl font-semibold text-[var(--cl-accent)]">{stat.value}</p>
            <p className="m-0 pt-1 text-xs text-[var(--cl-text-muted)]">{stat.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
