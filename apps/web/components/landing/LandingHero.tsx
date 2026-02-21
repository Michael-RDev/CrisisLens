import Link from "next/link";

export function LandingHero() {
  return (
    <section className="rounded-2xl border border-[#335066] bg-[radial-gradient(circle_at_20%_10%,#18384e_0%,#10202d_38%,#0b1620_100%)] p-5 sm:p-8">
      <p className="m-0 text-xs uppercase tracking-[0.12em] text-[#9cc0d8]">
        Humanitarian intelligence platform
      </p>
      <h1 className="mb-2 mt-1 text-5xl font-bold leading-tight sm:text-6xl">CrisisLens</h1>
      <p className="m-0 max-w-[60ch] text-[#bfd3e2]">
        Monitor severity, funding gaps, and country-level response signals from a single command-center
        experience.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/dashboard"
          className="rounded-[10px] border border-[#f2a73d] bg-[#f2a73d] px-4 py-2 text-sm font-semibold text-[#0b1620]"
        >
          Launch Dashboard
        </Link>
        <a
          href="#features"
          className="rounded-[10px] border border-[#476880] bg-transparent px-4 py-2 text-sm font-semibold text-[#d5e6f2]"
        >
          Explore Features
        </a>
      </div>
    </section>
  );
}
