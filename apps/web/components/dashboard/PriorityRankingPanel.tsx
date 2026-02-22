import { motion } from "framer-motion";
import { layerConfig } from "@/components/dashboard/layer-config";
import { getLayerValue } from "@/lib/metrics";
import { CountryMetrics, LayerMode } from "@/lib/types";

type PriorityRankingPanelProps = {
  ranked: CountryMetrics[];
  layerMode: LayerMode;
  onSelectIso3: (iso3: string) => void;
};

export function PriorityRankingPanel({
  ranked,
  layerMode,
  onSelectIso3
}: PriorityRankingPanelProps) {
  return (
    <motion.article
      className="min-w-0 overflow-hidden rounded-2xl border border-[var(--dbx-border-soft)] bg-[var(--dbx-surface-raised)] p-4 text-[var(--dbx-text)]"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: "easeOut" }}
    >
      <p className="m-0 font-['IBM_Plex_Mono','SFMono-Regular',Menlo,monospace] text-xs uppercase tracking-[0.14em] text-[var(--dbx-accent-soft)]">
        Model Priority
      </p>
      <h2 className="m-0 text-xl font-semibold text-[var(--dbx-text)]">
        Priority Ranking ({layerConfig[layerMode].label})
      </h2>
      <ol className="[scrollbar-width:thin] [scrollbar-color:var(--dbx-scroll-thumb)_var(--dbx-scroll-track)] mt-2 grid max-h-[480px] list-none gap-1.5 overflow-auto p-0">
        {ranked.map((row) => {
          const value = getLayerValue(row, layerMode);
          return (
            <li key={row.iso3}>
              <button
                className="flex w-full items-center justify-between gap-2 rounded-[10px] border border-[var(--dbx-list-border)] bg-[var(--dbx-list-bg)] px-2.5 py-2 text-left text-sm text-[var(--dbx-text)] transition-colors hover:border-[var(--dbx-cyan)]"
                onClick={() => onSelectIso3(row.iso3)}
              >
                <span className="min-w-0 break-words">{row.country}</span>
                <strong className="shrink-0">
                  {value.toFixed(1)}
                  {layerConfig[layerMode].unit}
                </strong>
              </button>
            </li>
          );
        })}
      </ol>
    </motion.article>
  );
}
