"use client";

import { motion } from "framer-motion";
import { useRevealOnScroll } from "@/components/landing/effects/useRevealOnScroll";

const TOP_OVERLOOKED = [
  { country: "Syria", score: 71.3 },
  { country: "Niger", score: 69.8 },
  { country: "Burkina Faso", score: 68.9 }
] as const;

const PREVIEW_BARS = [
  { label: "Coverage", value: 24 },
  { label: "Gap / Person", value: 83 },
  { label: "Need Pressure", value: 91 }
] as const;

export function SnapshotTeaser() {
  const { ref, isVisible, prefersReducedMotion } = useRevealOnScroll({ threshold: 0.14 });

  return (
    <section ref={ref} className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8" aria-label="Product snapshot">
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 28 }}
        animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.45, ease: "easeOut" }}
        className="rounded-3xl border border-[#6b97b744] bg-[#091827d4] p-5 shadow-[0_30px_60px_-44px_rgba(111,188,242,0.9)] backdrop-blur-sm sm:p-7"
      >
        <p className="m-0 text-sm font-semibold uppercase tracking-[0.09em] text-[#a3c2d7]">Snapshot Preview</p>
        <p className="mt-1 text-lg text-[#eff8ff]">One glance. One ranked signal.</p>
        <p className="mt-1 text-sm text-[#b2cadc]">A compact view for top overlooked countries and pressure markers.</p>

        <div className="mt-5 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-[#5f8aa833] bg-[#0e2435b3] p-4">
            <p className="m-0 text-xs uppercase tracking-[0.08em] text-[#9ec1d8]">Top Overlooked</p>
            <ul className="mt-2 space-y-2">
              {TOP_OVERLOOKED.map((item, index) => (
                <li
                  key={item.country}
                  className="flex items-center justify-between rounded-lg border border-[#50758f4f] bg-[#102b3f99] px-3 py-2 text-sm text-[#e5f2fc]"
                >
                  <span>
                    {index + 1}. {item.country}
                  </span>
                  <span className="font-semibold">{item.score.toFixed(1)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[#5f8aa833] bg-[#0e2435b3] p-4">
            <p className="m-0 text-xs uppercase tracking-[0.08em] text-[#9ec1d8]">Signal Pulse</p>
            <div className="mt-3 space-y-3">
              {PREVIEW_BARS.map((bar, index) => (
                <div key={bar.label}>
                  <div className="mb-1 flex items-center justify-between text-xs text-[#c6daea]">
                    <span>{bar.label}</span>
                    <span>{bar.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#173348]">
                    <motion.div
                      initial={prefersReducedMotion ? false : { width: 0 }}
                      animate={isVisible ? { width: `${bar.value}%` } : { width: 0 }}
                      transition={{
                        duration: prefersReducedMotion ? 0 : 0.45,
                        delay: prefersReducedMotion ? 0 : 0.08 + index * 0.06,
                        ease: "easeOut"
                      }}
                      className="h-full rounded-full bg-[linear-gradient(90deg,#74c6f8,#5a8deb)]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
