import { LayerMode } from "@/lib/types";

export const layerConfig: Record<LayerMode, { label: string; unit: string; highIsBad: boolean }> = {
  severity: { label: "Severity", unit: "pts", highIsBad: true },
  inNeedRate: { label: "In-Need Rate", unit: "%", highIsBad: true },
  fundingGap: { label: "Funding Gap", unit: "%", highIsBad: true },
  coverage: { label: "Coverage", unit: "%", highIsBad: false },
  overlooked: { label: "Overlooked Index (OCI)", unit: "pts", highIsBad: true }
};
