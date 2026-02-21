import {
  LandingFeatures,
  LandingFootprint,
  LandingFooter,
  LandingGlobe,
  LandingHero,
  LandingWorkflow
} from "@/components/landing";

export default function Home() {
  return (
    <main className="landing-shell max-w-[1560px]">
      <LandingHero />
      <LandingGlobe />
      <LandingFootprint />
      <LandingFeatures />
      <LandingWorkflow />
      <LandingFooter />
    </main>
  );
}
