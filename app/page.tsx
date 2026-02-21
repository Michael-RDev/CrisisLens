import Link from "next/link";

export default function Home() {
  return (
    <main className="landing-shell">
      <header className="landing-header" role="banner">
        <div className="landing-brand">CrisisLens</div>
        <nav aria-label="Primary">
          <Link href="/dashboard">Dashboard</Link>
          <a href="#features">Features</a>
        </nav>
      </header>

      <section className="landing-hero">
        <p className="landing-kicker">Humanitarian intelligence platform</p>
        <h1>CrisisLens</h1>
        <p className="landing-copy">
          Monitor severity, funding gaps, and country-level response signals from a single
          command-center experience.
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

      <section id="features" className="landing-features">
        <article>
          <h2>Global Risk Visibility</h2>
          <p>Interactive globe overlays for severity, in-need rates, coverage, and funding gaps.</p>
        </article>
        <article>
          <h2>Analyst Workflows</h2>
          <p>Country drilldown, ranking views, and cluster context for rapid triage.</p>
        </article>
        <article>
          <h2>Integration Ready</h2>
          <p>Databricks Agent, Genie, CV detection, and WebSocket seams are already wired.</p>
        </article>
      </section>

      <footer className="landing-footer" role="contentinfo">
        <p>CrisisLens</p>
        <p>Tier-4 humanitarian operations UI</p>
      </footer>
    </main>
  );
}
