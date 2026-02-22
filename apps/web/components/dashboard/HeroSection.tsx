import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";

type HeroSectionProps = {
  generatedAt: string;
  selectedCountryLabel: string;
  onOpenSimulation: () => void;
};

export function HeroSection({ generatedAt, selectedCountryLabel, onOpenSimulation }: HeroSectionProps) {
  return (
    <motion.section
      className="flex flex-col justify-between gap-4 rounded-2xl border border-[var(--dbx-border)] bg-[var(--dbx-surface)] p-4 text-[var(--dbx-text)] shadow-[0_10px_30px_rgba(3,8,14,0.35)] lg:flex-row lg:items-end"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: "easeOut" }}
    >
      <div>
        <p className="m-0 font-['IBM_Plex_Mono','SFMono-Regular',Menlo,monospace] text-xs uppercase tracking-[0.14em] text-[var(--dbx-accent-soft)]">
          Databricks ML Ops Surface
        </p>
        <h1 className="m-0 text-3xl font-semibold tracking-[0.02em] lg:text-5xl">CrisisLens Command Center</h1>
        <p className="m-0 mt-2 max-w-[82ch] text-sm leading-relaxed text-[var(--dbx-text-muted)]">
          Explainable overlooked-crisis analytics for UN decision support: OCI ranking, cluster-level
          beneficiary-to-budget outliers, benchmark lookalikes, and funding what-if simulation.
        </p>
        <p className="m-0 mt-2 text-sm leading-relaxed text-[var(--dbx-text-muted)]">
          Snapshot: {new Date(generatedAt).toLocaleString()}
        </p>
      </div>
      <div className="grid content-start gap-2 sm:grid-cols-2 lg:grid-cols-1">
        <button
          type="button"
          onClick={onOpenSimulation}
          className="inline-flex items-center justify-center rounded-[10px] border border-[var(--dbx-accent)] bg-[var(--dbx-accent)] px-3 py-2 text-sm font-semibold text-[#160d08] transition-colors hover:border-[var(--dbx-accent-soft)] hover:bg-[var(--dbx-accent-soft)]"
        >
          Scenario Modeling
        </button>
        <p className="m-0 text-xs text-[var(--dbx-text-muted)]">
          Funding What-if Simulator for <span className="font-semibold">{selectedCountryLabel}</span>
        </p>
        <ThemeToggle />
      </div>
    </motion.section>
  );
}
