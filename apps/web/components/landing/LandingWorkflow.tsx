const workflowSteps = [
  {
    title: "1. Detect",
    description:
      "Spot countries where severity and in-need pressure diverge from funding and coverage signals."
  },
  {
    title: "2. Explain",
    description:
      "Open country and project panels to inspect OCI components, outliers, and the rationale behind rank movement."
  },
  {
    title: "3. Act",
    description:
      "Run what-if allocations, compare expected outcomes, and hand off a concrete recommendation to operations."
  }
];

export function LandingWorkflow() {
  return (
    <section className="landing-card" id="workflow">
      <div className="mb-4">
        <h2 className="landing-section-title">From Alert to Action</h2>
        <p className="landing-body mt-1">
          This is the core operating loop: detect risk, explain priority, and simulate intervention before
          committing funding decisions.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {workflowSteps.map((step) => (
          <article key={step.title} className="rounded-xl border border-[var(--cl-border-soft)] bg-[var(--cl-surface-elevated)] p-4">
            <h3 className="m-0 text-lg font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm text-[var(--cl-text-muted)]">{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
