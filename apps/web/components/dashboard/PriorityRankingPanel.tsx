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
      className="list-card dbx-panel-raised min-w-0 overflow-hidden"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: "easeOut" }}
    >
      <p className="dbx-kicker">Model Priority</p>
      <h2 className="dbx-title">Priority Ranking ({layerConfig[layerMode].label})</h2>
      <ol className="dbx-scroll mt-2 grid max-h-[480px] list-none gap-1.5 overflow-auto p-0">
        {ranked.map((row) => {
          const value = getLayerValue(row, layerMode);
          return (
            <li key={row.iso3}>
              <button
                className="dbx-list-button"
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
