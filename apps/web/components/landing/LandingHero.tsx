import Link from "next/link";

export function LandingHero() {
  return (
    <section className="landing-card">
      <p className="landing-overline">Humanitarian crisis prioritization</p>
      <h1 className="mb-2 mt-1 text-5xl font-bold leading-tight sm:text-6xl">CrisisLens</h1>
      <p className="landing-body m-0 max-w-[64ch] text-base">
        CrisisLens combines four country signals in one place: severity, people in need, funding gap,
        and coverage. It then ranks where response pressure is highest so teams know what to review first.
      </p>
      <p className="landing-body mt-2 max-w-[64ch] text-base">
        Open a country to see why it ranked high, compare project outliers, and test funding scenarios
        before changing allocation plans.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/dashboard" className="landing-button-primary">
          Launch Dashboard
        </Link>
        <a href="#workflow" className="landing-button-secondary">
          See Workflow
        </a>
      </div>
    </section>
  );
}
