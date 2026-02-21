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
    <main className="mx-auto flex min-h-screen w-full max-w-[1560px] flex-col gap-5 px-5 py-5 sm:gap-6 sm:px-6 sm:py-6">
      <LandingHero />
      <LandingGlobe />
      <LandingFootprint />
      <LandingFeatures />
      <LandingWorkflow />
      <LandingFooter />
    </main>
  );
}
