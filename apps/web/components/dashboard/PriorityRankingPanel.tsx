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
    <article className="list-card min-w-0 overflow-hidden rounded-2xl border border-[#2e4f63] bg-[#10202d] p-4">
      <h2 className="m-0 text-xl font-semibold">Priority Ranking ({layerConfig[layerMode].label})</h2>
      <ol className="mt-2 grid max-h-[480px] list-none gap-1.5 overflow-auto p-0">
        {ranked.map((row) => {
          const value = getLayerValue(row, layerMode);
          return (
            <li key={row.iso3}>
              <button
                className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-[9px] border border-[#345871] bg-[#0a1925] px-3 py-2 text-left text-[#eaf3f8]"
                onClick={() => onSelectIso3(row.iso3)}
              >
                <span className="min-w-0 break-words">
                  {row.country} <small className="text-[#93acbc]">{row.iso3}</small>
                </span>
                <strong className="shrink-0">
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
