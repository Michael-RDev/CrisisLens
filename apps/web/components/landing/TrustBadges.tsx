"use client";

const TRUST_BADGES = ["HDX", "OCHA", "HNO", "HRP", "CBPF"] as const;

export function TrustBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-[#b4cde0]">
      {TRUST_BADGES.map((badge) => (
        <span
          key={badge}
          className="rounded-full border border-[#6a9fbe66] bg-[#10253a99] px-2.5 py-1 tracking-[0.04em]"
        >
          {badge}
        </span>
      ))}
    </div>
  );
}
