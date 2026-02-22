"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

type ActionCardProps = {
  title: string;
  text: string;
  icon: LucideIcon;
  ctaLabel?: string;
  onCta?: () => void;
};

export function ActionCard({ title, text, icon: Icon, ctaLabel, onCta }: ActionCardProps) {
  return (
    <article className="rounded-xl border border-[#2f526b] bg-[#0f2332] p-2.5">
      <p className="m-0 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-[#9eb8ca]">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </p>
      <p className="m-0 mt-1 text-sm text-[#dbe9f5]">{text}</p>
      {ctaLabel && onCta ? (
        <button
          type="button"
          onClick={onCta}
          className="mt-2 inline-flex items-center gap-1 rounded-md border border-[#4e7894] bg-[#12384f] px-2 py-1 text-xs text-[#e7f4ff]"
        >
          {ctaLabel}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </article>
  );
}

