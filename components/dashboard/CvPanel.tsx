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
    <article className="integration-card glass">
      <h2>CV Point-to-Highlight</h2>
      <p className="subtle">
        Gesture control is enabled on the globe. CV endpoint remains available for external camera
        streams and country auto-select integration.
      </p>
      <div className="integration-form">
        <textarea
          value={cvFrameInput}
          onChange={(event) => onCvInputChange(event.target.value)}
          rows={3}
          placeholder="Example: fingertip=0.42,0.31|country=SDN"
        />
        <button type="button" onClick={onDetect} disabled={cvLoading}>
          {cvLoading ? "Detecting..." : "Detect Country"}
        </button>
      </div>
      {cvDetection ? (
        <div className="integration-output">
          <p>
            Detected: <strong>{cvDetection.iso3}</strong> ({(cvDetection.confidence * 100).toFixed(1)}%)
          </p>
        </div>
      ) : (
        <p className="subtle">No detection yet.</p>
      )}
    </article>
  );
}
