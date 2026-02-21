export function LandingFeatures() {
  const featureCards = [
    {
      title: "Risk Visibility",
      description: "Severity, in-need, and funding overlays with country and cluster context."
    },
    {
      title: "Drilldown Analysis",
      description: "Country detail panels surface response coverage, trend movement, and anomaly notes."
    },
    {
      title: "Priority Ranking",
      description: "OCI-style ranking pipeline prioritizes overlooked and underfunded crisis contexts."
    },
    {
      title: "Outlier Detection",
      description: "Beneficiary-to-budget outlier surfacing supports transparent justification paths."
    },
    {
      title: "What-if Simulation",
      description: "Budget shift simulations estimate coverage impact before scenario decisions."
    },
    {
      title: "Integration Seams",
      description: "Databricks Agent, Genie, CV detection, and websocket hooks are wired for extension."
    }
  ];

  return (
    <section className="landing-card" id="features">
      <div className="mb-4">
        <h2 className="landing-section-title">What You Can Monitor</h2>
        <p className="landing-body mt-1">
          The landing experience now mirrors the dashboard capability map so users can evaluate scope before
          entering operations mode.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {featureCards.map((card) => (
          <article key={card.title} className="rounded-xl border border-[#2e4b61] bg-[#152738] p-4">
            <h3 className="m-0 text-base font-semibold">{card.title}</h3>
            <p className="mt-2 text-sm text-[#adc4d5]">{card.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
