import { layerConfig } from "@/components/dashboard/layer-config";
import { LayerMode } from "@/lib/types";

type LayerSelectorProps = {
  layerMode: LayerMode;
  onChange: (mode: LayerMode) => void;
};

export function LayerSelector({ layerMode, onChange }: LayerSelectorProps) {
  return (
    <section className="layer-row">
      {(Object.keys(layerConfig) as LayerMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          className={mode === layerMode ? "is-active" : ""}
          onClick={() => onChange(mode)}
        >
          {layerConfig[mode].label}
        </button>
      ))}
    </section>
  );
}
