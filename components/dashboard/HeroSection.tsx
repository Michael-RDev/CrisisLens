import { motion } from "framer-motion";

type HeroSectionProps = {
  generatedAt: string;
};

export function HeroSection({ generatedAt }: HeroSectionProps) {
  return (
    <motion.section
      className="flex flex-col justify-between gap-4 rounded-2xl border border-[#2e4f63] bg-[#10202d] p-4 lg:flex-row"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div>
        <h1 className="m-0 text-3xl font-semibold tracking-[0.02em] lg:text-5xl">CrisisLens Command Center</h1>
        <p className="max-w-[82ch] text-[#9db2c1]">
          Explainable overlooked-crisis analytics for UN decision support: OCI ranking, cluster-level
          beneficiary-to-budget outliers, benchmark lookalikes, and funding what-if simulation.
        </p>
        <p className="text-sm text-[#9db2c1]">Snapshot: {new Date(generatedAt).toLocaleString()}</p>
      </div>
      <div className="grid content-start gap-2">
        <span className="rounded-full border border-[#3c5f77] bg-[rgba(10,26,39,0.8)] px-3 py-1 text-center text-xs text-[#c9dbea]">OCI Explainability</span>
        <span className="rounded-full border border-[#3c5f77] bg-[rgba(10,26,39,0.8)] px-3 py-1 text-center text-xs text-[#c9dbea]">Outlier Benchmarking</span>
        <span className="rounded-full border border-[#3c5f77] bg-[rgba(10,26,39,0.8)] px-3 py-1 text-center text-xs text-[#c9dbea]">What-if Simulator</span>
      </div>
    </motion.section>
  );
}
