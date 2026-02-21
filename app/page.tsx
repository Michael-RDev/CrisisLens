import {
  LandingFeatures,
  LandingFooter,
  LandingHeader,
  LandingHero
} from "@/components/landing";

export default function Home() {
  return (
    <main className="mx-auto grid min-h-screen max-w-[1180px] grid-rows-[auto_1fr_auto_auto] gap-4 p-5 sm:p-6">
      <LandingHeader />
      <LandingHero />
      <LandingFeatures />
      <LandingFooter />
    </main>
  );
}
