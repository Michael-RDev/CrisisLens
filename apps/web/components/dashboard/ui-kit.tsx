"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

type SectionCardProps = {
  title?: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SectionCard({ title, subtitle, rightSlot, children, className }: SectionCardProps) {
  return (
    <motion.section
      className={`rounded-2xl border border-[#244a64] bg-[linear-gradient(180deg,#0f2535_0%,#0b1b29_100%)] p-4 shadow-[0_8px_30px_rgba(2,9,16,0.24)] ${className ?? ""}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
    >
      {(title || rightSlot) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title ? <h2 className="m-0 text-base font-semibold tracking-[0.01em] text-[#e9f4fb]">{title}</h2> : null}
            {subtitle ? <p className="m-0 mt-1 text-xs text-[#9ab9cd]">{subtitle}</p> : null}
          </div>
          {rightSlot}
        </header>
      )}
      {children}
    </motion.section>
  );
}

type MetricCardProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  className?: string;
};

export function MetricCard({ label, value, hint, icon, className }: MetricCardProps) {
  return (
    <article className={`rounded-xl border border-[#2a526d] bg-[#102739] p-3 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="m-0 text-[11px] uppercase tracking-[0.05em] text-[#9db8ca]">{label}</p>
        {icon}
      </div>
      <p className="m-0 mt-1.5 text-2xl font-semibold text-[#eff8ff]">{value}</p>
      {hint ? <p className="m-0 mt-1 text-xs text-[#97b3c7]">{hint}</p> : null}
    </article>
  );
}

export function StatPill({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-[#3a627b] bg-[#143247] px-2.5 py-1 text-xs text-[#d7e7f4]">{children}</span>;
}

export function LoadingSkeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl border border-[#27475e] bg-[#122737] ${className ?? "h-24"}`} />;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-[#335d78] bg-[#0e2232] p-4 text-center">
      <p className="m-0 text-sm font-semibold text-[#dbeaf6]">{title}</p>
      <p className="m-0 mt-1 text-xs text-[#9bb7cb]">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ActionChip({
  children,
  onClick,
  disabled
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-full border border-[#3f6278] bg-[#123248] px-2.5 py-1 text-xs text-[#d9e8f3] transition hover:border-[#5f88a3] hover:bg-[#1a3d55] disabled:opacity-60"
    >
      {children}
    </button>
  );
}
