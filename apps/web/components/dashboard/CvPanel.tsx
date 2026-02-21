import { CVDetection } from "@/lib/cv/provider";

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
  return (
    <article className="integration-card dbx-panel-raised min-w-0 overflow-hidden">
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
          placeholder="Example: fingertip=0.42,0.31|country=SDN"
        />
        <button
          type="button"
          className="dbx-btn-secondary w-fit disabled:cursor-progress disabled:opacity-70"
          onClick={onDetect}
          disabled={cvLoading}
        >
          {cvLoading ? "Detecting..." : "Detect Country"}
        </button>
      </div>
      {cvLoading ? (
        <div className="dbx-loading" role="status" aria-label="Detecting country from CV input">
          <span className="dbx-loading-bar w-44" />
          <div className="dbx-loading-row">
            <span className="dbx-loading-bar w-28" />
            <span className="dbx-loading-bar w-16" />
          </div>
        </div>
      ) : cvDetection ? (
        <div className="dbx-divider mt-1 pt-2">
          <p>
            Detected: <strong>{cvDetection.iso3}</strong> ({(cvDetection.confidence * 100).toFixed(1)}%)
          </p>
          <p className="dbx-subtitle mt-1">
            Mock frame timestamp: {new Date(cvDetection.frameTimestamp).toLocaleTimeString()}
          </p>
        </div>
      ) : (
        <p className="dbx-subtitle mt-1">No detection yet.</p>
      )}
    </article>
  );
}
