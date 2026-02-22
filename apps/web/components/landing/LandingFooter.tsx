export function LandingFooter() {
  return (
    <footer className="flex flex-col justify-between gap-3 px-4 py-4 text-sm text-[var(--cl-text-muted)] sm:flex-row sm:items-center" >
      <div className="flex flex-col gap-1">
        <p className="m-0 font-semibold text-[var(--cl-text)]">CrisisLens</p>
        <p className="m-0 text-xs">Explainable crisis prioritization for humanitarian operations teams</p>
      </div>
    </footer>
  );
}
