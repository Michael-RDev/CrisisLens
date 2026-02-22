"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { BlackHoleBackground } from "@/components/landing/BlackHoleBackground";
import { TrustBadges } from "@/components/landing/TrustBadges";

export function ImmersiveHero() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      className="relative isolate min-h-[95vh] overflow-hidden px-4 pb-16 pt-28 text-[#eef7ff] sm:px-6 lg:px-8"
      aria-label="CrisisLens mission hero"
    >
      <div className="pointer-events-none absolute inset-0 -z-30 bg-[radial-gradient(120%_95%_at_10%_0%,rgba(22,86,119,0.42),transparent_54%),radial-gradient(90%_95%_at_86%_10%,rgba(23,65,94,0.36),transparent_52%),linear-gradient(180deg,#030d19_0%,#061628_44%,#040b15_100%)]" />
      <div className="pointer-events-none absolute inset-0 -z-20 opacity-[0.045] [background-image:linear-gradient(180deg,rgba(122,167,191,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(122,167,191,0.1)_1px,transparent_1px)] [background-size:48px_48px]" />
      <BlackHoleBackground />

      <div className="relative mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-6xl flex-col items-center pt-6">
        <div className="max-w-3xl px-3 text-center sm:px-5">
          <motion.p
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.48, ease: "easeOut" }}
            className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-[#9dc0d6]"
          >
            CrisisLens
          </motion.p>

          <motion.h1
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="m-0 mt-3 text-balance text-4xl font-semibold leading-tight tracking-tight text-white sm:text-6xl"
          >
            Reveal the world&apos;s most overlooked crises.
          </motion.h1>

          <motion.p
            initial={prefersReducedMotion ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease: "easeOut" }}
            className="mx-auto mt-4 max-w-2xl text-lg text-[#c8dded]"
          >
            Need, funding, and risk - unified into one signal.
          </motion.p>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.15, ease: "easeOut" }}
            className="mt-7 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-1.5 rounded-xl border border-[#96d2f8] bg-[#19557c] px-4 py-2.5 text-sm font-medium text-[#edf8ff] shadow-[0_0_60px_-25px_rgba(96,196,255,0.9)] transition hover:bg-[#2370a3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#90ddff]"
            >
              Open Command Center
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22, ease: "easeOut" }}
            className="mt-6"
          >
            <TrustBadges />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
