type PanelLoadingProps = {
  label: string;
  rows?: number;
  className?: string;
};

export function PanelLoading({ label, rows = 3, className = "" }: PanelLoadingProps) {
  return (
    <div className={`dbx-loading ${className}`.trim()} role="status" aria-label={label}>
      <span className="dbx-loading-bar w-5/6" />
      <span className="dbx-loading-bar w-2/3" />
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={`${label}-${idx}`} className="dbx-loading-row">
          <span className="dbx-loading-bar w-4/5" />
          <span className="dbx-loading-bar w-12" />
        </div>
      ))}
    </div>
  );
}
