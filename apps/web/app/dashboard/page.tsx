import GlobeDashboard from "@/components/GlobeDashboard";
import { loadCountryMetrics, loadSnapshot } from "@/lib/loadMetrics";

export default async function DashboardPage() {
  const [metrics, snapshot] = await Promise.all([loadCountryMetrics(), loadSnapshot()]);
  return <GlobeDashboard metrics={metrics} generatedAt={snapshot.generatedAt} />;
}
