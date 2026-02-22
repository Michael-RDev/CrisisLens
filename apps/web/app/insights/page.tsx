import Link from "next/link";

export default function InsightsPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-[920px] flex-col items-center justify-center px-6 py-16 text-center">
      <p className="m-0 text-xs uppercase tracking-[0.14em] text-[#9bb8cb]">CrisisLens</p>
      <h1 className="m-0 mt-3 text-4xl font-semibold tracking-tight text-[#eef6ff] sm:text-5xl">Insights Workspace</h1>
      <p className="m-0 mt-4 max-w-[60ch] text-base text-[#b7cbda]">
        The full interactive insight workflows run inside the command center. Open the dashboard to explore
        country-level and cross-country analysis.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex rounded-xl border border-[#63b2df] bg-[#155074] px-4 py-2 text-sm font-medium text-[#ecf6ff] transition hover:bg-[#1a638f]"
      >
        Open Command Center
      </Link>
    </main>
  );
}
