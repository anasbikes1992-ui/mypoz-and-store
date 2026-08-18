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

export function ThemeToggle() {
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
      className="rounded-2xl border border-line px-3 py-1.5 text-sm text-text-dim transition duration-150 hover:border-accent hover:text-accent"
    >
      {theme === "light" ? "Dark" : "Light"}
    </button>
  );
}
