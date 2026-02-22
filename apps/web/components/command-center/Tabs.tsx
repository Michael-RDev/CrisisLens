"use client";

import { KeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";

export type CommandTabId = "assistant" | "country-brief" | "visuals";

type TabItem = {
  id: CommandTabId;
  label: string;
  icon: LucideIcon;
};

type TabsProps = {
  tabs: TabItem[];
  activeTab: CommandTabId;
  onChange: (tab: CommandTabId) => void;
};

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    if (currentIndex < 0) return;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      const next = tabs[(currentIndex + 1) % tabs.length];
      onChange(next.id);
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      const prev = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
      onChange(prev.id);
    }

    if (event.key === "Home") {
      event.preventDefault();
      onChange(tabs[0].id);
    }

    if (event.key === "End") {
      event.preventDefault();
      onChange(tabs[tabs.length - 1].id);
    }
  }

  return (
    <div
      className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-[#0b2232]/70 p-1"
      role="tablist"
      aria-label="Command center tabs"
      onKeyDown={onKeyDown}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7cd5ff] ${
              isActive
                ? "bg-[#16435f] text-[#ecf7ff]"
                : "text-[#aac4d6] hover:bg-[#113248] hover:text-[#ecf7ff]"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden min-[390px]:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

