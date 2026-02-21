const workflowSteps = [
  {
    title: "1. Detect",
    description: "Spot unusual severity/funding divergence from the live globe and ranking streams."
  },
  {
    title: "2. Explain",
    description: "Open country context, inspect outliers, and review contributing indicators."
  },
  {
    title: "3. Act",
    description: "Model what-if funding shifts and share action-ready recommendations with teams."
  }
];

export function LandingWorkflow() {
  return (
    <section className="landing-card" id="workflow">
      <div className="mb-4">
        <h2 className="landing-section-title">From Alert to Action</h2>
        <p className="landing-body mt-1">
          A simple handoff flow keeps analysts, planners, and decision makers aligned on priority changes.
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
