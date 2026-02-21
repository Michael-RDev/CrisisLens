import Link from "next/link";

export function LandingHeader() {
  return (
    <header className="landing-card flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between" role="banner">
      <div className="flex items-center gap-3">
        <div className="rounded-md border border-[#37556b] bg-[#1a2c3d] px-2 py-1 text-xs uppercase tracking-[0.08em] text-[#f0b25d]">
          Tier-4 Ops
        </div>
        <div>
          <p className="m-0 text-lg font-bold tracking-[0.02em]">CrisisLens</p>
          <p className="m-0 text-xs text-[#adc3d3]">Humanitarian decision support</p>
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
