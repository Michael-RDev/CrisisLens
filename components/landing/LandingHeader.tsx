import Link from "next/link";

export function LandingHeader() {
  return (
    <header className="landing-header" role="banner">
      <div className="landing-brand">CrisisLens</div>
      <nav aria-label="Primary">
        <Link href="/dashboard">Dashboard</Link>
        <a href="#features">Features</a>
      </nav>
    </header>
  );
}
