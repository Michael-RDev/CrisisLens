import Link from "next/link";

export function LandingHero() {
  return (
    <section className="landing-hero">
      <p className="landing-kicker">Humanitarian intelligence platform</p>
      <h1>CrisisLens</h1>
      <p className="landing-copy">
        Monitor severity, funding gaps, and country-level response signals from a single command-center
        experience.
      </p>
      <div className="landing-actions">
        <Link href="/dashboard" className="landing-primary-cta">
          Launch Dashboard
        </Link>
        <a href="#features" className="landing-secondary-cta">
          Explore Features
        </a>
      </div>
    </section>
  );
}
