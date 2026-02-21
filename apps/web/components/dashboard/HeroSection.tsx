import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";

type HeroSectionProps = {
  generatedAt: string;
};

export function HeroSection({ generatedAt }: HeroSectionProps) {
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
      <div className="grid content-start gap-2 sm:grid-cols-3 lg:grid-cols-1">
        <ThemeToggle />
      </div>
    </motion.section>
  );
}
