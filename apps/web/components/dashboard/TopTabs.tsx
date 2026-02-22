export function TopTabs() {
  return (
    <section className="mt-2 flex gap-1 overflow-x-auto border-b border-[var(--dbx-border)] pb-2">
      <button className="whitespace-nowrap rounded-lg border-b-2 border-[var(--dbx-accent)] px-3 py-1.5 text-sm text-[var(--dbx-text)]">
        Global View
      </button>
      <button className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-[var(--dbx-text-muted)]">Overlooked Index</button>
      <button className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-[var(--dbx-text-muted)]">Project Outliers</button>
      <button className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-[var(--dbx-text-muted)]">What-if Allocation</button>
      <button className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-[var(--dbx-text-muted)]">Genie Query</button>
    </section>
  );
}
