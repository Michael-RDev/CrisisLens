export function LandingFeatures() {
  const featureCards = [
    {
      title: "Global Signal Surface",
      description:
        "Visualize severity, in-need rate, funding gap, and coverage together in one consistent map and ranking layer."
    },
    {
      title: "Country Triage",
      description:
        "Open any country to inspect core metrics, response posture, and OCI component breakdown before escalation."
    },
    {
      title: "Explainable OCI Ranking",
      description:
        "Prioritize overlooked contexts with transparent weighting so teams can justify why a country moved up or down."
    },
    {
      title: "Project Outlier Review",
      description:
        "Find beneficiary-to-budget outliers and compare similar projects to validate operational assumptions."
    },
    {
      title: "What-if Allocation",
      description:
        "Run funding scenarios to estimate OCI and rank movement before committing changes to response plans."
    },
    {
      title: "Ops Integrations",
      description:
        "Databricks Agent, Genie, CV detection, and event hooks connect analysis output to broader workflow tooling."
    }
  ];

  return (
    <section className="rounded-2xl border border-[var(--cl-border)] bg-[var(--cl-surface)] p-5 sm:p-6" id="features">
      <div className="mb-4">
        <h2 className="m-0 text-2xl font-semibold text-[var(--cl-text)] sm:text-3xl">
          What CrisisLens Gives You
        </h2>
        <p className="m-0 mt-1 text-sm leading-relaxed text-[var(--cl-text-muted)] sm:text-base">
          The platform is designed to move teams from signal detection to action with explainable outputs,
          not just static dashboards.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {featureCards.map((card) => (
          <article key={card.title} className="rounded-xl border border-[var(--cl-border-soft)] bg-[var(--cl-surface-elevated)] p-4">
            <h3 className="m-0 text-base font-semibold">{card.title}</h3>
            <p className="mt-2 text-sm text-[var(--cl-text-muted)]">{card.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
