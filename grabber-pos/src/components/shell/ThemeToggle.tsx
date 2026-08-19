"use client";

import { useEffect, useState } from "react";

const COOKIE = "mypoz_theme";

function persist(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(COOKIE, theme);
  } catch {
    /* private mode */
  }
  document.cookie = `${COOKIE}=${theme}; path=/; max-age=31536000; SameSite=Lax`;
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "light" || attr === "dark") setTheme(attr);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    persist(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={theme === "light"}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      className={`inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-2xl border border-line text-sm text-text-dim transition duration-150 hover:border-accent hover:text-accent ${
        compact ? "px-2" : "px-3"
      }`}
    >
      {theme === "light" ? "Dark" : "Light"}
    </button>
  );
}
