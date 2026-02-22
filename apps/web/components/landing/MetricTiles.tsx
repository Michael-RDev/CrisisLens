"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Gauge, Users2, WalletCards } from "lucide-react";
import { useRevealOnScroll } from "@/components/landing/effects/useRevealOnScroll";

const TILE_ITEMS = [
  {
    label: "Coverage",
    value: "17.6%",
    hint: "global response view",
    icon: Gauge
  },
  {
    label: "People in Need",
    value: "307M",
    hint: "latest plans",
    icon: Users2
  },
  {
    label: "Gap / Person",
    value: "$84",
    hint: "funding pressure",
    icon: WalletCards
  },
  {
    label: "Overlooked Signals",
    value: "68",
    hint: "high-risk threshold",
    icon: AlertTriangle
  }
] as const;

export function MetricTiles() {
  const { ref, isVisible, prefersReducedMotion } = useRevealOnScroll({ threshold: 0.1 });

  return (
    <section ref={ref} className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8" aria-label="Impact metrics">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TILE_ITEMS.map((item, index) => (
          <motion.article
            key={item.label}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.35,
              delay: prefersReducedMotion ? 0 : index * 0.06,
              ease: "easeOut"
            }}
            whileHover={prefersReducedMotion ? undefined : { y: -4, borderColor: "rgba(133,196,234,0.7)" }}
            className="rounded-2xl border border-[#5f8aa833] bg-[#0b1b2ab0] p-4 shadow-[0_22px_45px_-35px_rgba(114,190,241,0.8)] backdrop-blur-sm"
          >
            <div className="mb-3 inline-grid h-9 w-9 place-items-center rounded-lg border border-[#7eb1d055] bg-[#12334a] text-[#9dd8ff]">
              <item.icon className="h-4 w-4" />
            </div>
            <p className="m-0 text-xs uppercase tracking-[0.08em] text-[#9fc0d5]">{item.label}</p>
            <p className="m-0 mt-1 text-3xl font-semibold tracking-tight text-[#eff8ff]">{item.value}</p>
            <p className="m-0 mt-1 text-xs text-[#b2cada]">{item.hint}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
