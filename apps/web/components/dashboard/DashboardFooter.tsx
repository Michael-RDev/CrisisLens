import { motion } from "framer-motion";

export function DashboardFooter() {
  return (
    <motion.footer
      className="mt-4 flex flex-col justify-between gap-2 border-t border-[var(--dbx-border)] pt-3 text-sm text-[var(--dbx-text-muted)] sm:flex-row"
      role="contentinfo"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <p className="m-0">CrisisLens Command Center</p>
      <p className="m-0">Operational snapshot and integration surfaces update in near real time.</p>
    </motion.footer>
  );
}
