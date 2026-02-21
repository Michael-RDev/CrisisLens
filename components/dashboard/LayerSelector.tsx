import { layerConfig } from "@/components/dashboard/layer-config";
import { LayerMode } from "@/lib/types";

type LayerSelectorProps = {
  layerMode: LayerMode;
  onChange: (mode: LayerMode) => void;
};

export function LayerSelector({ layerMode, onChange }: LayerSelectorProps) {
  return (
    <section className="mt-3 flex flex-wrap gap-2">
      {(Object.keys(layerConfig) as LayerMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          className={`rounded-full border px-3 py-1.5 text-sm ${
            mode === layerMode
              ? "border-[#dab76b] bg-[rgba(57,44,24,0.95)] text-[#eaf3f8]"
              : "border-[#33566e] bg-[rgba(10,26,39,0.92)] text-[#eaf3f8]"
          }`}
          onClick={() => onChange(mode)}
        >
          {layerConfig[mode].label}
        </button>
      ))}
    </section>
  );
}
