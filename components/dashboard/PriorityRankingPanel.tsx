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
    <article className="list-card glass">
      <h2>Priority Ranking ({layerConfig[layerMode].label})</h2>
      <ol>
        {ranked.map((row) => {
          const value = getLayerValue(row, layerMode);
          return (
            <li key={row.iso3}>
              <button onClick={() => onSelectIso3(row.iso3)}>
                <span>
                  {row.country} <small>{row.iso3}</small>
                </span>
                <strong>
                  {value.toFixed(1)}
                  {layerConfig[layerMode].unit}
                </strong>
              </button>
            </li>
          );
        })}
      </ol>
    </article>
  );
}
