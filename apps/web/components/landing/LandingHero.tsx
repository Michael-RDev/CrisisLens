import Link from "next/link";

export function LandingHero() {
  return (
    <section className="rounded-2xl border border-[var(--cl-border)] bg-[var(--cl-surface)] p-5 sm:p-6">
      <p className="m-0 text-xs uppercase tracking-[0.12em] text-[var(--cl-text-muted)]">
        Humanitarian crisis prioritization
      </p>
      <h1 className="mb-2 mt-1 text-5xl font-bold leading-tight sm:text-6xl">CrisisLens</h1>
      <p className="m-0 max-w-[64ch] text-sm leading-relaxed text-[var(--cl-text-muted)] sm:text-base">
        CrisisLens combines four country signals in one place: severity, people in need, funding gap,
        and coverage. It then ranks where response pressure is highest so teams know what to review first.
      </p>
      <p className="m-0 mt-2 max-w-[64ch] text-sm leading-relaxed text-[var(--cl-text-muted)] sm:text-base">
        Open a country to see why it ranked high, compare project outliers, and test funding scenarios
        before changing allocation plans.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-[10px] border border-[var(--cl-accent)] bg-[var(--cl-accent)] px-4 py-2 text-sm font-semibold text-[#10202d] transition-colors hover:border-[var(--cl-accent-strong)] hover:bg-[var(--cl-accent-strong)]"
        >
          Launch Dashboard
        </Link>
        <a
          href="#workflow"
          className="inline-flex items-center justify-center rounded-[10px] border border-[var(--cl-border)] bg-transparent px-4 py-2 text-sm font-semibold text-[var(--cl-text)] transition-colors hover:border-[var(--cl-accent)] hover:text-[var(--cl-accent-strong)]"
        >
          See Workflow
        </a>
      </div>
    </section>
  );
}
