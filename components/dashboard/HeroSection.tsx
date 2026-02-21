import { motion } from "framer-motion";

type HeroSectionProps = {
  generatedAt: string;
};

export function HeroSection({ generatedAt }: HeroSectionProps) {
  return (
    <motion.section
      className="hero glass"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div>
        <h1>CrisisLens Command Center</h1>
        <p>
          Explainable overlooked-crisis analytics for UN decision support: OCI ranking, cluster-level
          beneficiary-to-budget outliers, benchmark lookalikes, and funding what-if simulation.
        </p>
        <p className="meta">Snapshot: {new Date(generatedAt).toLocaleString()}</p>
      </div>
      <div className="hero-badge">
        <span>OCI Explainability</span>
        <span>Outlier Benchmarking</span>
        <span>What-if Simulator</span>
      </div>
    </motion.section>
  );
}
