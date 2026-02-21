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
      className="integration-card dbx-panel-raised flex h-full min-w-0 flex-col overflow-hidden"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: "easeOut" }}
    >
      <p className="dbx-kicker">Computer Vision Bridge</p>
      <h2 className="dbx-title">CV Point-to-Highlight</h2>
      <p className="dbx-subtitle mt-2">
        Gesture control is enabled on the globe. CV endpoint remains available for external camera
        streams and country auto-select integration.
      </p>
      <div className="grid gap-2">
        <textarea
          className="dbx-textarea"
          value={cvFrameInput}
          onChange={(event) => onCvInputChange(event.target.value)}
          rows={3}
          placeholder="Example: fingertip=0.42,0.31|country=Sudan"
        />
        <button
          type="button"
          className="dbx-btn-secondary w-fit disabled:cursor-progress disabled:opacity-70"
          onClick={onDetect}
          disabled={cvLoading}
        >
          {cvLoading ? "Loading..." : "Detect Country"}
        </button>
      </div>
      {cvLoading ? (
        <PanelLoading label="Detecting country from CV input" rows={1} />
      ) : cvDetection ? (
        <div className="dbx-divider mt-1 pt-2">
          <p>
            Detected: <strong>{detectedCountryName}</strong> ({(cvDetection.confidence * 100).toFixed(1)}%)
          </p>
          <p className="dbx-subtitle mt-1">
            Mock frame timestamp: {new Date(cvDetection.frameTimestamp).toLocaleTimeString()}
          </p>
        </div>
      ) : (
        <p className="dbx-subtitle mt-1">No detection yet.</p>
      )}
    </motion.article>
  );
}
