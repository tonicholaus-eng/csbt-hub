"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Keeps `<html data-game>` in step with the route.
 *
 * This is the styling boundary between the two games. Every Adopt Me
 * appearance rule in `globals.css` is written as
 * `[data-theme="…"]:where(:not([data-game="mm2"])) …`, so this one attribute
 * decides whether a saved Adopt Me appearance is allowed to paint anything.
 *
 * Why it exists at all: appearances were applied to `<html>` and nothing scoped
 * them, so selectors written for Adopt Me chrome — `[data-theme="snoopy"]
 * header > div` among them — matched MM2's own markup too. MM2's NICH header
 * and HQ status panel are a `<header>` with a `<div>` inside, so they came out
 * cream.
 *
 * The first value is written by the inline script in the root layout before
 * paint; this only handles client-side navigation afterwards, which is why a
 * hard refresh on /mm2 with "snoopy" saved is correct from the first frame.
 *
 * It deliberately does not touch `data-theme`: the saved appearance stays
 * exactly as the user left it, ready for when they go back to Adopt Me.
 */

export function gameForPathname(pathname: string): "mm2" | "adopt-me" {
  return pathname === "/mm2" || pathname.startsWith("/mm2/") ? "mm2" : "adopt-me";
}

export default function GameBoundary() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const game = gameForPathname(pathname ?? "/");
    root.dataset.game = game;

    /**
     * `color-scheme` is an inline style set by the appearance script, so it
     * cannot be gated in CSS. Left alone, a light Adopt Me appearance made the
     * browser render MM2's scrollbars and form controls light-on-dark.
     */
    if (game === "mm2") {
      root.style.colorScheme = "dark";
      /**
       * Tailwind's `dark:` variants key off this class, and the shared
       * Exchange / Lounge / Trade Opinions components render inside MM2. Under
       * a light Adopt Me appearance they would otherwise switch to their light
       * values in the middle of MM2's black shell.
       */
      root.classList.add("dark");
    } else {
      const theme = root.dataset.theme;
      const light = theme === "light" || theme === "snoopy";
      root.style.colorScheme = light ? "light" : "dark";
      root.classList.toggle("dark", !light);
    }
  }, [pathname]);

  return null;
}
