"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BarChart3, Globe, MessageSquare, X } from "lucide-react";
import { Tabs, CommandTabId } from "@/components/command-center/Tabs";

type RightSidebarProps = {
  open: boolean;
  activeTab: CommandTabId;
  title: string;
  selectedCountryLabel: string;
  statusLabel: string;
  generatedAt: string;
  onClose: () => void;
  onTabChange: (tab: CommandTabId) => void;
  children: React.ReactNode;
};

const TAB_ITEMS = [
  { id: "country-data" as const, label: "Country Data", icon: Globe },
  { id: "insights" as const, label: "Insights", icon: MessageSquare },
  { id: "visuals" as const, label: "Visuals", icon: BarChart3 }
];

export function RightSidebar({
  open,
  activeTab,
  title,
  selectedCountryLabel,
  statusLabel,
  generatedAt,
  onClose,
  onTabChange,
  children
}: RightSidebarProps) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            key="sidebar-backdrop"
            type="button"
            aria-label="Close sidebar"
            onClick={onClose}
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.18, ease: "easeOut" }}
            className="pointer-events-auto fixed inset-0 z-30 bg-[#04101a]/40 md:bg-[#04101a]/28"
          />

          <motion.aside
            key="sidebar-drawer"
            initial={reducedMotion ? false : { x: 520, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reducedMotion ? undefined : { x: 520, opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.24, ease: "easeOut" }}
            className="pointer-events-auto fixed bottom-3 right-3 top-16 z-40 flex w-[min(95vw,500px)] flex-col rounded-2xl border border-white/20 bg-[#d4e8fa1c] p-3 shadow-[0_18px_50px_-24px_rgba(13,36,58,0.55)] backdrop-blur-md"
          >
            <div className="shrink-0">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="m-0 text-[11px] uppercase tracking-[0.09em] text-[#cfe2ef]">{title}</p>
                  <p className="m-0 mt-0.5 truncate text-sm font-semibold text-[#eff8ff]">{selectedCountryLabel}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#75a9c8] bg-[#17425f]/75 px-2 py-0.5 text-[10px] font-medium text-[#edf8ff]">
                      {statusLabel}
                    </span>
                    <span className="text-[10px] text-[#b7cedd]">
                      Last refresh {new Date(generatedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-[#87b4d0] bg-[#1b4865]/70 p-1.5 text-[#e5f4ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ad8ff]"
                  aria-label="Close sidebar"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <Tabs tabs={TAB_ITEMS} activeTab={activeTab} onChange={onTabChange} />
            </div>

            <motion.div
              key={activeTab}
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: reducedMotion ? 0 : 0.18, ease: "easeOut" }}
              className="mt-3 min-h-0 flex-1"
            >
              {children}
            </motion.div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

