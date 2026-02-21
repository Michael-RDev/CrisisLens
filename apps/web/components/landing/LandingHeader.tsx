import Link from "next/link";

export function LandingHeader() {
  return (
    <header className="landing-card flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between" role="banner">
      <div className="flex items-center gap-3">
        <div className="rounded-md border border-[var(--cl-border-soft)] bg-[var(--cl-surface-elevated)] px-2 py-1 text-xs uppercase tracking-[0.08em] text-[var(--cl-accent)]">
          Tier-4 Ops
        </div>
        <div>
          <p className="m-0 text-lg font-bold tracking-[0.02em]">CrisisLens</p>
          <p className="m-0 text-xs text-[var(--cl-text-muted)]">Humanitarian decision support</p>
        </div>
      </div>
      <nav className="flex flex-wrap items-center gap-4" aria-label="Primary">
        <a href="#monitor" className="landing-nav-link">
          Monitor
        </a>
        <a href="#features" className="landing-nav-link">
          Features
        </a>
        <a href="#workflow" className="landing-nav-link">
          Workflow
        </a>
        <a href="#footprint" className="landing-nav-link">
          Footprint
        </a>
        <Link href="/dashboard" className="landing-button-secondary px-3 py-1.5 text-xs sm:text-sm">
          Dashboard
        </Link>
      </nav>
    </header>
  );
}
