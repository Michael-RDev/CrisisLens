"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MessageSquare, Globe, BarChart3, Minimize2, Maximize2, Settings2 } from "lucide-react";
import { Tabs, CommandTabId } from "@/components/command-center/Tabs";

type RightPanelProps = {
  open: boolean;
  collapsed: boolean;
  selectedCountryLabel: string;
  statusLabel: string;
  activeTab: CommandTabId;
  onToggleOpen: () => void;
  onToggleCollapsed: () => void;
  onTabChange: (tab: CommandTabId) => void;
  children: React.ReactNode;
};

const TAB_ITEMS = [
  { id: "assistant" as const, label: "Assistant", icon: MessageSquare },
  { id: "country-brief" as const, label: "Country Brief", icon: Globe },
  { id: "visuals" as const, label: "Visuals", icon: BarChart3 }
];

export function RightPanel({
  open,
  collapsed,
  selectedCountryLabel,
  statusLabel,
  activeTab,
  onToggleOpen,
  onToggleCollapsed,
  onTabChange,
  children
}: RightPanelProps) {
  const reducedMotion = useReducedMotion();

  return (
    <>
      <button
        type="button"
        onClick={onToggleOpen}
        className="pointer-events-auto fixed bottom-4 right-4 z-40 rounded-full border border-[#4a7089] bg-[#12354c]/90 px-4 py-2 text-sm text-[#e4f2fc] backdrop-blur md:hidden"
      >
        Open Panel
      </button>

      <motion.aside
        initial={reducedMotion ? false : { opacity: 0, x: 30 }}
        animate={{
          opacity: 1,
          x: 0,
          y: open ? 0 : 420,
          width: collapsed ? 68 : 460
        }}
        transition={{ duration: reducedMotion ? 0 : 0.25, ease: "easeOut" }}
        className="pointer-events-auto fixed inset-x-3 bottom-3 top-auto z-30 flex h-[76vh] flex-col rounded-2xl border border-white/15 bg-[#081d2c]/72 p-3 shadow-[0_24px_80px_-38px_rgba(10,30,46,0.92)] backdrop-blur-lg md:inset-x-auto md:bottom-4 md:right-4 md:top-20 md:h-[calc(100vh-6.5rem)]"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          {collapsed ? null : (
            <div className="min-w-0">
              <p className="m-0 truncate text-sm font-semibold text-[#e9f4fd]">{selectedCountryLabel}</p>
              <p className="m-0 mt-0.5 text-[11px] text-[#a9c1d2]">{statusLabel}</p>
            </div>
          )}
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="rounded-md border border-[#406581] bg-[#113249] p-1.5 text-[#d9eaf7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79d2ff]"
              aria-label={collapsed ? "Expand panel" : "Collapse panel"}
            >
              {collapsed ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              className="rounded-md border border-[#406581] bg-[#113249] p-1.5 text-[#d9eaf7]"
              aria-label="Panel settings"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onToggleOpen}
              className="rounded-md border border-[#406581] bg-[#113249] p-1.5 text-[#d9eaf7] md:hidden"
              aria-label="Close panel"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {collapsed ? (
          <div className="flex flex-1 flex-col items-center justify-start gap-2 pt-2">
            {TAB_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`rounded-lg border p-2 ${
                    isActive
                      ? "border-[#77c8f1] bg-[#17445f] text-[#ebf8ff]"
                      : "border-[#3a627d] bg-[#122f43] text-[#cde3f4]"
                  }`}
                  aria-label={item.label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <Tabs tabs={TAB_ITEMS} activeTab={activeTab} onChange={onTabChange} />
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: reducedMotion ? 0 : 0.2, ease: "easeOut" }}
                className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </motion.aside>
    </>
  );
}

