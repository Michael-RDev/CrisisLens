"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

function getPreferredTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";

  const stored = window.localStorage.getItem("cl-theme");
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return "dark";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    const preferred = getPreferredTheme();
    setTheme(preferred);
    document.documentElement.dataset.theme = preferred;
  }, []);

  function toggleTheme() {
    const next: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("cl-theme", next);
  }

  return (
    <button
      type="button"
      className="inline-flex items-center justify-center rounded-[10px] border border-[var(--dbx-btn-secondary-border)] bg-[var(--dbx-btn-secondary-bg)] px-3 py-2 text-sm font-semibold text-[var(--dbx-btn-secondary-text)] transition-colors hover:border-[var(--dbx-cyan)] hover:text-[var(--dbx-text)]"
      onClick={toggleTheme}
    >
      Theme: {theme === "dark" ? "Dark" : "Light"}
    </button>
  );
}
