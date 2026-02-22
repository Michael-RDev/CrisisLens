"use client";

type StatusBadgeProps = {
  label: string;
  kind?: "risk" | "funding" | "neutral";
};

function resolveTone(label: string, kind: "risk" | "funding" | "neutral") {
  const upper = label.toUpperCase();
  if (kind === "neutral") {
    return "border-[#4a6a80] bg-[#173245] text-[#d9e9f5]";
  }
  if (upper.includes("CRITICAL") || upper.includes("HIGH") || upper.includes("UNDERFUNDED")) {
    return "border-[#955b52] bg-[#4a2723] text-[#ffd9d2]";
  }
  if (upper.includes("MODERATE") || upper.includes("PARTIAL")) {
    return "border-[#8f7b45] bg-[#40361e] text-[#ffe9b8]";
  }
  return "border-[#4b7d60] bg-[#1f3a2a] text-[#d4f5de]";
}

export function StatusBadge({ label, kind = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-[0.06em] ${resolveTone(label, kind)}`}
    >
      {label}
    </span>
  );
}

