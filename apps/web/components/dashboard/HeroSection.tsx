import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";

type HeroSectionProps = {
  generatedAt: string;
};

export function HeroSection({ generatedAt }: HeroSectionProps) {
  return (
    <motion.section
      className="dbx-panel flex flex-col justify-between gap-4 lg:flex-row lg:items-end"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: "easeOut" }}
    >
      <div>
        <p className="dbx-kicker">Databricks ML Ops Surface</p>
        <h1 className="m-0 text-3xl font-semibold tracking-[0.02em] lg:text-5xl">CrisisLens Command Center</h1>
        <p className="dbx-subtitle mt-2 max-w-[82ch]">
          Explainable overlooked-crisis analytics for UN decision support: OCI ranking, cluster-level
          beneficiary-to-budget outliers, benchmark lookalikes, and funding what-if simulation.
        </p>
        <p className="dbx-subtitle mt-2">Snapshot: {new Date(generatedAt).toLocaleString()}</p>
      </div>
      <div className="grid content-start gap-2 sm:grid-cols-3 lg:grid-cols-1">
        <ThemeToggle />
      </div>
    </motion.section>
  );
}
