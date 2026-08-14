"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { CSBT_THEME_STORAGE_KEY, type CSBTTheme, isCSBTTheme } from "../lib/theme";

type ThemeContextValue = {
  theme: CSBTTheme;
  setTheme: (theme: CSBTTheme) => void;
  mounted: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_EVENT = "csbt-theme-change";

function readTheme(): CSBTTheme {
  if (typeof document === "undefined") return "dark";
  const value = document.documentElement.dataset.theme;
  return isCSBTTheme(value) ? value : "dark";
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function applyTheme(theme: CSBTTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark" || theme === "halloween");
  root.classList.add("theme-ready");
  root.style.colorScheme = theme === "light" ? "light" : "dark";
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "dark" as const);

  const setTheme = useCallback((next: CSBTTheme) => {
    applyTheme(next);
    try {
      window.localStorage.setItem(CSBT_THEME_STORAGE_KEY, next);
    } catch {
      // Appearance still updates when storage is unavailable.
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({ theme, setTheme, mounted: true }), [setTheme, theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useCSBTTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useCSBTTheme must be used inside ThemeProvider");
  return context;
}
