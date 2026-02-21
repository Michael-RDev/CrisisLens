type PanelLoadingProps = {
  label: string;
  rows?: number;
  className?: string;
};

export function PanelLoading({ label, rows = 3, className = "" }: PanelLoadingProps) {
  return (
    <div className={`mt-2 grid animate-pulse gap-1.5 ${className}`.trim()} role="status" aria-label={label}>
      <span className="h-2.5 w-5/6 rounded bg-[var(--dbx-surface-strong)]" />
      <span className="h-2.5 w-2/3 rounded bg-[var(--dbx-surface-strong)]" />
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={`${label}-${idx}`}
          className="flex items-center justify-between gap-2 rounded-[10px] border border-[var(--dbx-list-border)] bg-[var(--dbx-list-bg)] px-2.5 py-2"
        >
          <span className="h-2.5 w-4/5 rounded bg-[var(--dbx-surface-strong)]" />
          <span className="h-2.5 w-12 rounded bg-[var(--dbx-surface-strong)]" />
        </div>
      ))}
    </div>
  );
}
