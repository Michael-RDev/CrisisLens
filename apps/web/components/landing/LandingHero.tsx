import Link from "next/link";

export function LandingHero() {
  return (
    <section className="landing-card grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-center">
      <div>
        <p className="landing-overline">Humanitarian intelligence platform</p>
        <h1 className="mb-2 mt-1 text-5xl font-bold leading-tight sm:text-6xl">CrisisLens</h1>
        <p className="m-0 max-w-[64ch] text-base text-[#bfd3e2]">
          Unified operating view for severity, funding pressure, and response posture across countries.
          Built for analysts who need to move from anomaly to action quickly.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/dashboard" className="landing-button-primary">
            Launch Dashboard
          </Link>
          <a href="#workflow" className="landing-button-secondary">
            See Workflow
          </a>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="landing-chip">severity overlays</span>
          <span className="landing-chip">funding gaps</span>
          <span className="landing-chip">country triage</span>
          <span className="landing-chip">outlier simulation</span>
        </div>
      </div>
      <div className="landing-card-muted h-full">
        <h2 className="m-0 text-xl font-semibold" id="operational-briefing">
          Operational Briefing
        </h2>
        <p className="landing-body mt-2">
          Today&apos;s baseline combines live-like signal streams with explainable indicators so teams can
          prioritize follow-up where response risk is rising.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[#2f4b61] bg-[#111f2c] p-3">
            <dt className="text-xs uppercase tracking-[0.08em] text-[#9fb7c7]">Countries tracked</dt>
            <dd className="m-0 pt-1 text-2xl font-semibold">118</dd>
          </div>
          <div className="rounded-xl border border-[#2f4b61] bg-[#111f2c] p-3">
            <dt className="text-xs uppercase tracking-[0.08em] text-[#9fb7c7]">High-priority flags</dt>
            <dd className="m-0 pt-1 text-2xl font-semibold">24</dd>
          </div>
          <div className="rounded-xl border border-[#2f4b61] bg-[#111f2c] p-3">
            <dt className="text-xs uppercase tracking-[0.08em] text-[#9fb7c7]">Funding at risk</dt>
            <dd className="m-0 pt-1 text-2xl font-semibold">$2.6B</dd>
          </div>
          <div className="rounded-xl border border-[#2f4b61] bg-[#111f2c] p-3">
            <dt className="text-xs uppercase tracking-[0.08em] text-[#9fb7c7]">Coverage alerts</dt>
            <dd className="m-0 pt-1 text-2xl font-semibold">9 clusters</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
