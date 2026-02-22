import GlobeDashboard from "@/components/GlobeDashboard";
import { loadCountryMetrics, loadSnapshot } from "@/lib/loadMetrics";

type DashboardPageProps = {
  searchParams?: {
    mode?: string;
  };
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const [metrics, snapshot] = await Promise.all([loadCountryMetrics(), loadSnapshot()]);
  const modeParam = String(searchParams?.mode ?? "").toLowerCase();
  const initialMode = modeParam === "ml" ? "ml" : "genie";
  return (
    <GlobeDashboard metrics={metrics} generatedAt={snapshot.generatedAt} initialMode={initialMode} />
  );
}
