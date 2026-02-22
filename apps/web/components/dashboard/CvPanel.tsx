import { motion } from "framer-motion";
import { CVDetection } from "@/lib/cv/provider";
import { PanelLoading } from "@/components/dashboard/PanelLoading";
import { countryByIso3 } from "@/lib/countries";

type CvPanelProps = {
  cvFrameInput: string;
  cvLoading: boolean;
  cvDetection: CVDetection | null;
  onCvInputChange: (value: string) => void;
  onDetect: () => void;
};

export function CvPanel({
  cvFrameInput,
  cvLoading,
  cvDetection,
  onCvInputChange,
  onDetect
}: CvPanelProps) {
  const detectedCountryName = cvDetection ? countryByIso3.get(cvDetection.iso3)?.name ?? cvDetection.iso3 : null;

  return (
    <motion.article
      className="min-w-0 overflow-hidden rounded-2xl border border-[var(--dbx-border-soft)] bg-[var(--dbx-surface-raised)] p-4 text-[var(--dbx-text)]"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: "easeOut" }}
    >
      <p className="m-0 font-['IBM_Plex_Mono','SFMono-Regular',Menlo,monospace] text-xs uppercase tracking-[0.14em] text-[var(--dbx-accent-soft)]">
        Computer Vision Bridge
      </p>
      <h2 className="m-0 text-xl font-semibold text-[var(--dbx-text)]">CV Point-to-Highlight</h2>
      <p className="m-0 mt-2 text-sm leading-relaxed text-[var(--dbx-text-muted)]">
        Gesture control is enabled on the globe. CV endpoint remains available for external camera
        streams and country auto-select integration.
      </p>
      <div className="grid gap-2">
        <textarea
          className="w-full resize-y rounded-[10px] border border-[var(--dbx-input-border)] bg-[var(--dbx-input-bg)] px-3 py-2 text-sm text-[var(--dbx-text)]"
          value={cvFrameInput}
          onChange={(event) => onCvInputChange(event.target.value)}
          rows={3}
          placeholder="Example: fingertip=0.42,0.31|country=Sudan"
        />
        <button
          type="button"
          className="inline-flex w-fit items-center justify-center rounded-[10px] border border-[var(--dbx-btn-secondary-border)] bg-[var(--dbx-btn-secondary-bg)] px-3 py-2 text-sm font-semibold text-[var(--dbx-btn-secondary-text)] transition-colors hover:border-[var(--dbx-cyan)] hover:text-[var(--dbx-text)] disabled:cursor-progress disabled:opacity-70"
          onClick={onDetect}
          disabled={cvLoading}
        >
          {cvLoading ? "Loading..." : "Detect Country"}
        </button>
      </div>
      {cvLoading ? (
        <PanelLoading label="Detecting country from CV input" rows={1} />
      ) : cvDetection ? (
        <div className="mt-1 border-t border-dashed border-[var(--dbx-border)] pt-2">
          <p>
            Detected: <strong>{detectedCountryName}</strong> ({(cvDetection.confidence * 100).toFixed(1)}%)
          </p>
          <p className="m-0 mt-1 text-sm leading-relaxed text-[var(--dbx-text-muted)]">
            Mock frame timestamp: {new Date(cvDetection.frameTimestamp).toLocaleTimeString()}
          </p>
        </div>
      ) : (
        <p className="m-0 mt-1 text-sm leading-relaxed text-[var(--dbx-text-muted)]">No detection yet.</p>
      )}
    </motion.article>
  );
}
