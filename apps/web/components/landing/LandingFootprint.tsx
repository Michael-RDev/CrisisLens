const footprintStats = [
  { label: "Countries in scope", value: "118", detail: "Cross-region crisis coverage" },
  { label: "Priority alerts", value: "24", detail: "High urgency this cycle" },
  { label: "Gap estimate", value: "$2.6B", detail: "Modeled funding shortfall" },
  { label: "Data refresh", value: "6h", detail: "Snapshot + analytics cadence" }
];

export function LandingFootprint() {
  return (
    <section className="landing-card" id="footprint">
      <div className="mb-4">
        <h2 className="landing-section-title">Platform Footprint</h2>
        <p className="landing-body mt-1">
          Scope indicators provide a quick benchmark for what the dashboard currently tracks and updates.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {footprintStats.map((stat) => (
          <article key={stat.label} className="rounded-xl border border-[#2e4b61] bg-[#152738] p-4">
            <p className="m-0 text-xs uppercase tracking-[0.08em] text-[#9fb7c7]">{stat.label}</p>
            <p className="m-0 pt-2 text-3xl font-semibold text-[#f0b25d]">{stat.value}</p>
            <p className="m-0 pt-1 text-xs text-[#adc4d5]">{stat.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
