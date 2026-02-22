import { layerConfig } from "@/components/dashboard/layer-config";
import { LayerMode } from "@/lib/types";

type LayerSelectorProps = {
  layerMode: LayerMode;
  onChange: (mode: LayerMode) => void;
};

export function LayerSelector({ layerMode, onChange }: LayerSelectorProps) {
  return (
    <section className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Display layer selector">
      {(Object.keys(layerConfig) as LayerMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          role="tab"
          aria-selected={mode === layerMode}
          className={`whitespace-nowrap rounded-full border border-[var(--dbx-tab-border)] bg-[var(--dbx-tab-bg)] px-3 py-1 text-sm text-[var(--dbx-tab-text)] transition-colors ${
            mode === layerMode
              ? "border-[var(--dbx-accent)] bg-[var(--dbx-tab-active-bg)] text-[var(--dbx-tab-active-text)]"
              : ""
          }`}
          onClick={() => onChange(mode)}
        >
          {layerConfig[mode].label}
        </button>
      ))}
    </section>
  );
}
