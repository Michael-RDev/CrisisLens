"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useRevealOnScroll } from "@/components/landing/effects/useRevealOnScroll";

export function FinalCTA() {
  const { ref, isVisible, prefersReducedMotion } = useRevealOnScroll({ threshold: 0.2 });

  return (
    <section ref={ref} className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
        animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.42, ease: "easeOut" }}
        className="rounded-3xl border border-[#7ab6da66] bg-[linear-gradient(135deg,#0c1e30,#11263a,#0c1e30)] p-6 text-center shadow-[0_25px_65px_-36px_rgba(93,181,237,0.95)] sm:p-8"
      >
        <p className="m-0 text-3xl font-semibold tracking-tight text-[#eff8ff] sm:text-4xl">
          Enter the Command Center.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-[#98d2f4] bg-[#1d5f8b] px-5 py-2.5 text-sm font-medium text-[#f2fbff] transition hover:bg-[#2474a9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9de0ff]"
        >
          Open Command Center
          <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>
    </section>
  );
}
