import GlobeDashboard from "@/components/GlobeDashboard";
import { loadCountryMetrics, loadSnapshot } from "@/lib/loadMetrics";

type DashboardPageProps = {
  searchParams?: {
    panel?: string;
  };
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const [metrics, snapshot] = await Promise.all([loadCountryMetrics(), loadSnapshot()]);
  const panelParam = searchParams?.panel;
  const initialPanel =
    panelParam === "priority" || panelParam === "simulation" ? panelParam : "country";
  return (
    <GlobeDashboard
      metrics={metrics}
      generatedAt={snapshot.generatedAt}
      initialPanel={initialPanel}
    />
  );
}
