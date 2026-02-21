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
    <article className="integration-card rounded-2xl border border-[#2e4f63] bg-[#10202d] p-4">
      <h2 className="m-0 text-xl font-semibold">CV Point-to-Highlight</h2>
      <p className="text-sm text-[#9db7c8]">
        Gesture control is enabled on the globe. CV endpoint remains available for external camera
        streams and country auto-select integration.
      </p>
      <div className="grid gap-2">
        <textarea
          className="w-full resize-y rounded-[9px] border border-[#2f5067] bg-[#0a1824] px-3 py-2 text-[#eaf3f8]"
          value={cvFrameInput}
          onChange={(event) => onCvInputChange(event.target.value)}
          rows={3}
          placeholder="Example: fingertip=0.42,0.31|country=SDN"
        />
        <button
          type="button"
          className="w-fit cursor-pointer rounded-lg border border-[#416986] bg-[#12344a] px-3 py-2 text-[#dbeaf2] disabled:cursor-progress disabled:opacity-70"
          onClick={onDetect}
          disabled={cvLoading}
        >
          {cvLoading ? "Detecting..." : "Detect Country"}
        </button>
      </div>
      {cvDetection ? (
        <div className="mt-1 border-t border-dashed border-[#35566f] pt-2">
          <p>
            Detected: <strong>{cvDetection.iso3}</strong> ({(cvDetection.confidence * 100).toFixed(1)}%)
          </p>
          <p className="text-sm text-[#9db7c8]">
            Mock frame timestamp: {new Date(cvDetection.frameTimestamp).toLocaleTimeString()}
          </p>
        </div>
      ) : (
        <p className="text-sm text-[#9db7c8]">No detection yet.</p>
      )}
    </article>
  );
}
