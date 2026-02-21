import {
  LandingFeatures,
  LandingFooter,
  LandingHeader,
  LandingHero
} from "@/components/landing";

export default function Home() {
  return (
    <main className="landing-shell">
      <LandingHeader />
      <LandingHero />
      <LandingFeatures />
      <LandingFooter />
    </main>
  );
}
