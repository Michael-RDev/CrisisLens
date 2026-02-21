import {
  LandingFeatures,
  LandingFootprint,
  LandingFooter,
  LandingGlobe,
  LandingHeader,
  LandingHero,
  LandingWorkflow
} from "@/components/landing";

export default function Home() {
  return (
    <main className="landing-shell">
      <LandingHeader />
      <LandingHero />
      <LandingGlobe />
      <LandingFootprint />
      <LandingFeatures />
      <LandingWorkflow />
      <LandingFooter />
    </main>
  );
}
