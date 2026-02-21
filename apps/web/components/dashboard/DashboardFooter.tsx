export function DashboardFooter() {
  return (
    <footer
      className="mt-4 flex flex-col justify-between gap-2 border-t border-[var(--dbx-border)] pt-3 text-sm text-[var(--dbx-text-muted)] sm:flex-row"
      role="contentinfo"
    >
      <p className="m-0">CrisisLens Command Center</p>
      <p className="m-0">Operational snapshot and integration surfaces update in near real time.</p>
    </footer>
  );
}
