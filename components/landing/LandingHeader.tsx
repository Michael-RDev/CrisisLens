import Link from "next/link";

export function LandingHeader() {
  return (
    <header
      className="flex items-center justify-between rounded-xl border border-[#2e4f63] bg-[#10202d] px-4 py-3"
      role="banner"
    >
      <div className="text-lg font-bold tracking-[0.02em]">CrisisLens</div>
      <nav className="flex gap-4" aria-label="Primary">
        <Link href="/dashboard" className="text-sm text-[#d5e6f2] hover:text-[#f5b768]">
          Dashboard
        </Link>
        <a href="#features" className="text-sm text-[#d5e6f2] hover:text-[#f5b768]">
          Features
        </a>
      </nav>
    </header>
  );
}
