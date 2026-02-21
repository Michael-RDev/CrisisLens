export function LandingFooter() {
  return (
    <footer className="landing-card flex flex-col justify-between gap-3 px-4 py-4 text-sm text-[#adc3d3] sm:flex-row sm:items-center" role="contentinfo">
      <div className="flex flex-col gap-1">
        <p className="m-0 font-semibold text-[#eaf3f8]">CrisisLens</p>
        <p className="m-0 text-xs">Tier-4 humanitarian operations interface</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.06em]">
        <a href="#monitor" className="landing-nav-link text-xs">
          Monitor
        </a>
        <a href="#workflow" className="landing-nav-link text-xs">
          Workflow
        </a>
        <a href="#footprint" className="landing-nav-link text-xs">
          Footprint
        </a>
      </div>
    </footer>
  );
}
