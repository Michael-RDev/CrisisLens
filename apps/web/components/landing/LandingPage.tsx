"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Check,
  FileText,
  Globe,
  MapPin,
  ShieldCheck,
  Zap
} from "lucide-react";

const NAV_LINKS = [
  { href: "#product", label: "Product" },
  { href: "#methodology", label: "Methodology" },
  { href: "#research", label: "Research" },
  { href: "#contact", label: "Team/Contact" }
];

const TRUST_ITEMS = ["HDX", "HNO", "HRP", "OCHA", "CBPF", "Open Methodology"];

const FEATURES = [
  {
    icon: Globe,
    title: "Interactive Globe",
    body: "Navigate global crisis signals with pinch, hover, and country-level focus in one view."
  },
  {
    icon: BarChart3,
    title: "Overlooked Index (OCI)",
    body: "Track severity, funding mismatch, and vulnerability with transparent scoring components."
  },
  {
    icon: FileText,
    title: "Country Briefs",
    body: "Generate concise humanitarian briefs with cited metrics and clear confidence context."
  },
  {
    icon: Zap,
    title: "Exportable Insights",
    body: "Move from analysis to action quickly with sharable outputs for teams and partners."
  },
  {
    icon: ShieldCheck,
    title: "Transparent Methodology",
    body: "Every recommendation is traceable to data fields, assumptions, and known limitations."
  }
];

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 }
};

function reveal(enabled: boolean) {
  return enabled
    ? {
        initial: "hidden" as const,
        whileInView: "show" as const,
        viewport: { once: true, margin: "-100px" },
        variants: fadeInUp,
        transition: { duration: 0.55, ease: "easeOut" as const }
      }
    : {};
}

function Section({
  id,
  title,
  subtitle,
  children,
  reducedMotion
}: {
  id?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  reducedMotion: boolean;
}) {
  return (
    <motion.section id={id} className="relative" {...reveal(!reducedMotion)}>
      <div className="mb-5">
        <h2 className="m-0 text-2xl font-semibold tracking-tight text-[#eef6ff] sm:text-3xl">{title}</h2>
        {subtitle ? <p className="mt-2 max-w-[70ch] text-sm text-[#9db4c7] sm:text-base">{subtitle}</p> : null}
      </div>
      {children}
    </motion.section>
  );
}

function Navbar({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <motion.header
      className="sticky top-0 z-40 border-b border-white/10 bg-[#07131dcc]/90 backdrop-blur supports-[backdrop-filter]:bg-[#07131dcc]"
      initial={reducedMotion ? undefined : { opacity: 0, y: -16 }}
      animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <nav aria-label="Primary" className="mx-auto flex h-16 w-full max-w-[1240px] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5ec8ff] rounded-md">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-[#2a5d7f] bg-[#102f44] text-[#8cd5ff]">
            <Globe className="h-4 w-4" />
          </span>
          <span className="text-base font-semibold tracking-tight text-[#edf6ff]">CrisisLens</span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="group relative text-sm text-[#b4c8d8] transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5ec8ff] rounded"
            >
              {item.label}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-[#74d5ff] transition-all duration-200 group-hover:w-full" />
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/insights"
            className="hidden rounded-lg border border-[#35576e] bg-[#0f2332] px-3 py-1.5 text-sm text-[#d7e8f5] transition hover:border-[#4f7894] hover:text-white sm:inline-flex"
          >
            Explore Insights
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 rounded-lg border border-[#4f8eb1] bg-[#123b55] px-3 py-1.5 text-sm font-medium text-[#e7f5ff] transition hover:border-[#74b7de] hover:bg-[#164a6a]"
          >
            Open Command Center <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>
    </motion.header>
  );
}

function HeroVisual({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_45%,rgba(80,183,255,0.28),transparent_62%)]" />

      <motion.div
        className="rounded-3xl border border-[#2f5670] bg-[linear-gradient(155deg,#0f2638,#0a1927)] p-4 shadow-[0_20px_90px_-45px_rgba(69,185,255,0.55)]"
        animate={reducedMotion ? undefined : { y: [0, -8, 0] }}
        transition={reducedMotion ? undefined : { duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="m-0 text-xs uppercase tracking-[0.12em] text-[#92b3c7]">Live Risk Preview</p>
          <span className="rounded-full border border-[#355b75] bg-[#0f2a3e] px-2 py-0.5 text-[11px] text-[#cce4f6]">Updated 2026</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl border border-[#2f5267] bg-[#0f2333] p-3">
            <p className="m-0 text-xs text-[#9eb9cb]">Top Overlooked</p>
            <ul className="mt-2 grid gap-1 text-sm text-[#e8f3fc]">
              {[
                "SYR • Severe gap-to-need mismatch",
                "NER • High per-capita gap pressure",
                "BFA • Coverage remains fragile"
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 text-[#80d7ff]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-2">
            {[
              ["Coverage", "13.7%"],
              ["PIN", "48.7M"],
              ["Gap / Person", "$40.87"]
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-[#2f5267] bg-[#0f2333] p-2.5">
                <p className="m-0 text-[11px] uppercase tracking-[0.08em] text-[#93b2c6]">{label}</p>
                <p className="m-0 mt-1 text-lg font-semibold text-[#eef6ff]">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

    </div>
  );
}

function Hero({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <section id="product" className="relative overflow-hidden rounded-3xl border border-[#274f69] bg-[linear-gradient(150deg,#0b1d2b,#09141f)] p-6 sm:p-8 lg:p-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_8%,rgba(86,177,255,0.16),transparent_42%),radial-gradient(circle_at_90%_88%,rgba(121,94,255,0.14),transparent_36%)]" />
      <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <motion.div {...reveal(!reducedMotion)}>
          <p className="m-0 text-xs uppercase tracking-[0.15em] text-[#9ec0d5]">Humanitarian Intelligence Platform</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Reveal the world&apos;s most overlooked crises.
          </h1>
          <p className="mt-4 max-w-[62ch] text-base leading-7 text-[#b7cbda]">
            CrisisLens links humanitarian need, funding adequacy, and risk signals so teams can prioritize where support is most urgent.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-[#63b2df] bg-[#155074] px-4 py-2.5 text-sm font-medium text-[#eff8ff] transition hover:bg-[#1a638f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#89d9ff]"
            >
              Open Command Center <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/insights"
              className="inline-flex items-center gap-2 rounded-xl border border-[#3d627b] bg-[#0f2333] px-4 py-2.5 text-sm font-medium text-[#d9e8f5] transition hover:border-[#5f89a7] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#89d9ff]"
            >
              Explore Insights
            </Link>
          </div>

          <p className="mt-4 text-xs text-[#90afc3]">Built on public humanitarian data • Updated 2026 plans</p>
        </motion.div>

        <HeroVisual reducedMotion={reducedMotion} />
      </div>

    </section>
  );
}

function TrustStrip({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <motion.section
      className="rounded-2xl border border-[#234a64] bg-[#0f1f2c] p-4"
      {...reveal(!reducedMotion)}
      aria-label="Trusted Inputs"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="m-0 mr-1 text-xs uppercase tracking-[0.1em] text-[#9bb8cb]">Trusted inputs</p>
        {TRUST_ITEMS.map((item) => (
          <span key={item} className="rounded-full border border-[#355b74] bg-[#12293a] px-2.5 py-1 text-xs text-[#d7e8f5]">
            {item}
          </span>
        ))}
        <a href="#methodology" className="ml-auto text-xs text-[#91d5ff] hover:text-[#c7edff]">
          Open methodology
        </a>
      </div>
    </motion.section>
  );
}

function FeatureGrid({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <Section
      title="Core Capabilities"
      subtitle="Purpose-built workflows for analysts, responders, and decision teams."
      reducedMotion={reducedMotion}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((item) => (
          <motion.article
            key={item.title}
            className="group rounded-2xl border border-[#274c65] bg-[#0f2333] p-4 shadow-[0_8px_30px_-18px_rgba(104,205,255,0.42)]"
            whileHover={reducedMotion ? undefined : { y: -4, borderColor: "#4b85ab" }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-3 inline-grid h-10 w-10 place-items-center rounded-xl border border-[#3a6480] bg-[#123248] text-[#9fe0ff]">
              <item.icon className="h-5 w-5" />
            </div>
            <h3 className="m-0 text-lg font-medium text-[#eff7ff]">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#a7bfd0]">{item.body}</p>
          </motion.article>
        ))}
      </div>
    </Section>
  );
}

function HowItWorks({ reducedMotion }: { reducedMotion: boolean }) {
  const steps = [
    { title: "Explore", body: "Scan global patterns and focus high-risk countries in seconds." },
    { title: "Understand", body: "Review funding, need, and overlooked drivers with transparent metrics." },
    { title: "Act", body: "Generate evidence-backed options for prioritization and coordination." }
  ];

  return (
    <Section title="How It Works" subtitle="A fast three-step analyst loop." reducedMotion={reducedMotion}>
      <div className="relative grid gap-3 md:grid-cols-3">
        <div className="pointer-events-none absolute left-4 right-4 top-6 hidden h-px bg-gradient-to-r from-transparent via-[#3b6d8f] to-transparent md:block" />
        {steps.map((step, index) => (
          <motion.article key={step.title} className="relative rounded-2xl border border-[#274b65] bg-[#0f2333] p-4" whileHover={reducedMotion ? undefined : { y: -3 }}>
            <span className="inline-grid h-7 w-7 place-items-center rounded-full border border-[#3d6a86] bg-[#14344a] text-xs text-[#d9ebf8]">
              {index + 1}
            </span>
            <h3 className="m-0 mt-3 text-lg text-[#eff7ff]">{step.title}</h3>
            <p className="mt-1 text-sm text-[#a6bfd0]">{step.body}</p>
          </motion.article>
        ))}
      </div>
    </Section>
  );
}

function Showcase({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <Section id="research" title="What You Can Answer In Seconds" subtitle="Turn complex humanitarian data into immediate, operationally useful insight." reducedMotion={reducedMotion}>
      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-2xl border border-[#274c66] bg-[#0f2333] p-4">
          <p className="m-0 text-sm leading-7 text-[#c3d7e6]">
            Ask strategic questions across countries and identify where funding shortfalls are most damaging.
            Compare coverage, gap-per-person, and crisis status with consistent context.
          </p>
        </article>

        <div className="grid gap-3">
          <article className="rounded-2xl border border-[#2a516c] bg-[#102635] p-4">
            <p className="m-0 text-xs uppercase tracking-[0.08em] text-[#94b4c8]">Priority Signal</p>
            <p className="m-0 mt-2 text-sm text-[#d7e7f3]">High gap/person + low coverage indicates urgent financing pressure.</p>
          </article>
          <article className="rounded-2xl border border-[#2a516c] bg-[#102635] p-4">
            <p className="m-0 text-xs uppercase tracking-[0.08em] text-[#94b4c8]">Reallocation Lens</p>
            <p className="m-0 mt-2 text-sm text-[#d7e7f3]">Higher coverage with lower risk can indicate review candidates.</p>
          </article>
        </div>
      </div>
    </Section>
  );
}

function Methodology({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <Section
      id="methodology"
      title="Methodology & Trust"
      subtitle="OCI combines humanitarian severity, scale, and funding adequacy into an interpretable signal."
      reducedMotion={reducedMotion}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
        <article className="rounded-2xl border border-[#2b526a] bg-[#0f2333] p-5">
          <ul className="m-0 grid gap-3 list-none p-0">
            {[
              "Transparent scoring components with explicit assumptions.",
              "Country snapshots are grounded in latest available plan-year records.",
              "Query responses include evidence tables for manual verification."
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-[#d5e5f2]">
                <Check className="mt-0.5 h-4 w-4 text-[#8bd8ff]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <a href="#research" className="mt-4 inline-flex items-center gap-1 text-sm text-[#8ad5ff] hover:text-[#c7ecff]">
            Read methodology <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </article>

        <aside className="rounded-2xl border border-[#7a5c35] bg-[#251c12] p-5">
          <p className="m-0 text-xs uppercase tracking-[0.1em] text-[#f0d7ab]">Limitations</p>
          <p className="mt-2 text-sm leading-6 text-[#f0e1c7]">
            CrisisLens is decision support. It highlights patterns and trade-offs, but final allocation decisions should include contextual, operational, and protection constraints.
          </p>
        </aside>
      </div>
    </Section>
  );
}

function FinalCta({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <motion.section
      className="rounded-3xl border border-[#3a6f90] bg-[linear-gradient(145deg,#10293b,#0d1d2b)] p-6 sm:p-8"
      {...reveal(!reducedMotion)}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="m-0 text-2xl font-semibold text-[#f1f8ff]">Ready to explore the command center?</h2>
          <p className="mt-2 text-sm text-[#aac2d3]">Move from signals to decisions with transparent humanitarian intelligence.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard" className="rounded-xl border border-[#63b2df] bg-[#155074] px-4 py-2 text-sm font-medium text-[#ecf6ff] hover:bg-[#1a638f]">
            Open Command Center
          </Link>
          <a href="#contact" className="rounded-xl border border-[#446d86] bg-[#102637] px-4 py-2 text-sm text-[#dceaf5] hover:border-[#6791ad]">
            Contact
          </a>
        </div>
      </div>
    </motion.section>
  );
}

function Footer({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <motion.footer
      id="contact"
      className="grid gap-5 border-t border-[#22425a] pt-6 sm:grid-cols-2 lg:grid-cols-4"
      {...reveal(!reducedMotion)}
    >
      <div>
        <p className="m-0 text-sm font-semibold text-[#edf6ff]">Product</p>
        <ul className="mt-2 grid gap-1 list-none p-0 text-sm text-[#9bb4c6]">
          <li><a href="#product">Overview</a></li>
          <li><Link href="/dashboard">Command Center</Link></li>
          <li><Link href="/insights">Insights</Link></li>
        </ul>
      </div>
      <div>
        <p className="m-0 text-sm font-semibold text-[#edf6ff]">Resources</p>
        <ul className="mt-2 grid gap-1 list-none p-0 text-sm text-[#9bb4c6]">
          <li><a href="#research">Research</a></li>
          <li><a href="#methodology">Methodology</a></li>
          <li><Link href="/insights">Insights</Link></li>
        </ul>
      </div>
      <div>
        <p className="m-0 text-sm font-semibold text-[#edf6ff]">Legal</p>
        <ul className="mt-2 grid gap-1 list-none p-0 text-sm text-[#9bb4c6]">
          <li>Terms</li>
          <li>Privacy</li>
          <li>Responsible Use</li>
        </ul>
      </div>
      <div>
        <p className="m-0 text-sm font-semibold text-[#edf6ff]">Contact</p>
        <ul className="mt-2 grid gap-1 list-none p-0 text-sm text-[#9bb4c6]">
          <li><a href="mailto:team@crisislens.org">team@crisislens.org</a></li>
          <li>Research collaborations</li>
          <li>Humanitarian analytics support</li>
        </ul>
      </div>
      <p className="sm:col-span-2 lg:col-span-4 m-0 text-xs text-[#7f9ab0]">© {new Date().getFullYear()} CrisisLens. All rights reserved.</p>
    </motion.footer>
  );
}

export function LandingPage() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="relative min-h-screen bg-[#07131d] text-[#eaf3f8]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute -left-24 top-16 h-[280px] w-[280px] rounded-full bg-[#1c6a95]/25 blur-[90px]"
          animate={reducedMotion ? undefined : { x: [0, 36, 0], y: [0, -18, 0] }}
          transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-[-60px] top-[42%] h-[320px] w-[320px] rounded-full bg-[#5741aa]/20 blur-[110px]"
          animate={reducedMotion ? undefined : { x: [0, -30, 0], y: [0, 22, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <Navbar reducedMotion={Boolean(reducedMotion)} />

      <main className="mx-auto grid w-full max-w-[1240px] gap-12 px-4 pb-12 pt-6 sm:px-6 sm:pt-8 lg:gap-16">
        <Hero reducedMotion={Boolean(reducedMotion)} />
        <TrustStrip reducedMotion={Boolean(reducedMotion)} />
        <FeatureGrid reducedMotion={Boolean(reducedMotion)} />
        <HowItWorks reducedMotion={Boolean(reducedMotion)} />
        <Showcase reducedMotion={Boolean(reducedMotion)} />
        <Methodology reducedMotion={Boolean(reducedMotion)} />
        <FinalCta reducedMotion={Boolean(reducedMotion)} />
        <Footer reducedMotion={Boolean(reducedMotion)} />
      </main>
    </div>
  );
}
