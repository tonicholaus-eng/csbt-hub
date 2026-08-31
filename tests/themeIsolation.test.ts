/**
 * Adopt Me appearances must never style MM2.
 *
 * The bug these tests lock down: appearances are applied as `data-theme` on
 * `<html>`, and several appearance rules were written against bare elements —
 * `[data-theme="snoopy"] header > div` being the one that showed up in
 * screenshots. MM2's NICH header and HQ status panel are both a `<header>` with
 * a `<div>` inside, so a Snoopy preference painted them cream. Halloween and
 * Roblox had the same rule, and all four appearances also styled `body::before`
 * and `aside > div`, which MM2's control rail matches.
 *
 * The fix is a boundary, not a patch: every appearance selector is gated on
 * `:where(:not([data-game="mm2"]))`. These tests assert the gate is complete,
 * that it costs no specificity, that it is set before first paint, and that the
 * user's saved appearance is still remembered.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repo = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(repo, relative), "utf8");

const css = read("src/app/globals.css");
const layout = read("src/app/layout.tsx");
const boundary = read("src/components/GameBoundary.tsx");

const THEMES = ["dark", "halloween", "light", "snoopy"] as const;
const GATE = ':where(:not([data-game="mm2"]))';

// ---------------------------------------------------------------------------
// The gate is complete
// ---------------------------------------------------------------------------

test("every appearance selector is gated behind the game boundary", () => {
  const ungated: string[] = [];

  for (const theme of THEMES) {
    const token = `[data-theme="${theme}"]`;
    let index = css.indexOf(token);
    while (index !== -1) {
      const following = css.slice(index + token.length, index + token.length + GATE.length);
      if (following !== GATE) {
        const line = css.slice(0, index).split("\n").length;
        ungated.push(`${theme} at line ${line}: ${css.slice(index, index + 90).split("\n")[0]}`);
      }
      index = css.indexOf(token, index + token.length);
    }
  }

  assert.deepEqual(ungated, [], `appearance rules that can still reach MM2:\n${ungated.join("\n")}`);
});

test("no appearance rule can match MM2's own markup", () => {
  /**
   * The strongest form of the check: walk the real stylesheet and ask, for each
   * appearance selector, whether it would match the elements MM2 actually
   * renders. Then do the same against a copy with the gate stripped out, to
   * prove the check can still see the bug it was written for.
   *
   * The shapes below are taken from MM2's own components:
   *   header > div   — the NICH console HUD and the HQ command header
   *   aside > div    — the MM2 control rail
   *   select         — the values and demand filters
   *   body::before   — a full-page overlay painted behind everything
   */
  const shapes: Array<[string, RegExp]> = [
    ["MM2 NICH / HQ header panel", /header\s*>\s*div/],
    ["MM2 control rail", /(^|\s)aside\s*>\s*div/],
    ["MM2 rail active link", /aside a\[aria-current/],
    ["MM2 form controls", /(^|\s)select(\s|$)/],
    ["full-page background overlay", /body::before/],
  ];

  const reaching = (stylesheet: string) => {
    const hits = new Set<string>();
    for (const block of stylesheet.matchAll(/([^{}]*)\{/g)) {
      for (const selector of block[1].split(",").map((part) => part.trim())) {
        for (const theme of THEMES) {
          const token = `[data-theme="${theme}"]`;
          if (!selector.startsWith(token)) continue;
          const rest = selector.slice(token.length).trim();
          if (!rest || rest.startsWith(GATE)) continue;
          for (const [name, pattern] of shapes) {
            if (pattern.test(` ${rest}`)) hits.add(`${theme}: ${name} — ${selector.slice(0, 70)}`);
          }
        }
      }
    }
    return [...hits];
  };

  // The check is not vacuous: without the gate it finds the original bug.
  const ungated = reaching(css.split(GATE).join(""));
  assert.ok(ungated.length >= 10, `the harness stopped detecting the original leak (found ${ungated.length})`);
  assert.ok(
    ungated.some((hit) => hit.startsWith("snoopy: MM2 NICH / HQ header panel")),
    "the reported Snoopy header symptom is no longer represented",
  );

  // And with it, nothing reaches MM2.
  assert.deepEqual(reaching(css), [], "an appearance rule can still style MM2");
});

test("the selectors that actually leaked are gated", () => {
  // Each of these matched real MM2 markup before the fix.
  const previouslyLeaking = [
    '[data-theme="snoopy"]:where(:not([data-game="mm2"])) header > div',
    '[data-theme="halloween"]:where(:not([data-game="mm2"])) header > div',
    '[data-theme="light"]:where(:not([data-game="mm2"])) header > div',
    '[data-theme="snoopy"]:where(:not([data-game="mm2"])) body::before',
    '[data-theme="light"]:where(:not([data-game="mm2"])) aside a[aria-current="page"]',
  ];

  for (const selector of previouslyLeaking) {
    assert.ok(css.includes(selector), `not gated: ${selector}`);
  }
});

test("gating costs no specificity, so Adopt Me looks exactly as it did", () => {
  // `:where()` always contributes zero. Anything else here would have silently
  // re-ranked appearance rules against the base stylesheet.
  assert.ok(GATE.startsWith(":where("), "the gate must be specificity-free");
  assert.equal((css.match(/:where\(:not\(\[data-game="mm2"\]\)\)/g) ?? []).length, 345);
});

test("shared token aliases are NOT gated, because MM2 needs them", () => {
  // `[data-theme]` with no value defines cross-game aliases and the base form
  // control colours. Gating it would leave MM2 without them.
  assert.match(css, /^\[data-theme\] \{/m);
  assert.match(css, /^\[data-theme\] :where\(input, textarea, select\) \{/m);
});

test("MM2 falls back to the base token set, which is the dark one", () => {
  // With every `[data-theme="…"]` block gated off, MM2 resolves shared tokens
  // from the bare `:root` block — so it must exist and must be the dark values.
  const rootBlock = css.slice(css.indexOf(":root,"), css.indexOf("}", css.indexOf(":root,")));
  assert.match(rootBlock, /\[data-theme="dark"\]/, ":root must pair with the dark palette");
  assert.match(css.slice(css.indexOf(":root,")), /--background: #06111f/);
});

// ---------------------------------------------------------------------------
// The boundary is set before anything is painted
// ---------------------------------------------------------------------------

test("the game boundary is written by the pre-paint script, not by React", () => {
  // A direct load of /mm2 with "snoopy" saved must never paint a cream frame.
  assert.match(layout, /root\.dataset\.game = isMM2 \? "mm2" : "adopt-me"/);
  assert.match(layout, /path === "\/mm2" \|\| path\.indexOf\("\/mm2\/"\) === 0/);

  // And it runs in <head>, before the body renders.
  const headAt = layout.indexOf("<head>");
  const scriptAt = layout.indexOf("__html: themeInitScript");
  const bodyAt = layout.indexOf("<body");
  assert.ok(headAt > 0, "no <head> in the root layout");
  assert.ok(scriptAt > headAt && scriptAt < bodyAt, "the init script must run in <head>, before <body>");
});

test("MM2 is dark whatever the saved appearance is", () => {
  // Two things CSS gating cannot cover: `color-scheme` is an inline style, and
  // Tailwind's `dark:` variants key off a class. Shared Exchange, Lounge and
  // Trade Opinions components render inside MM2 and would otherwise flip to
  // their light values under a Snoopy or Roblox preference.
  assert.match(layout, /if \(isMM2\) \{[\s\S]*colorScheme = "dark"[\s\S]*classList\.add\("dark"\)/);
  assert.match(boundary, /game === "mm2"[\s\S]*colorScheme = "dark"[\s\S]*classList\.add\("dark"\)/);
});

test("the boundary follows client-side navigation in both directions", () => {
  assert.match(boundary, /usePathname/);
  assert.match(boundary, /root\.dataset\.game = game/);
  // Returning to Adopt Me restores that appearance's own light/dark handling.
  assert.match(boundary, /classList\.toggle\("dark", !light\)/);
  assert.match(boundary, /theme === "light" \|\| theme === "snoopy"/);

  const mounted = read("src/app/layout.tsx");
  assert.match(mounted, /<GameBoundary \/>/, "the boundary must be mounted in the root layout");
});

// ---------------------------------------------------------------------------
// Persistence survives
// ---------------------------------------------------------------------------

test("the saved appearance is never cleared by visiting MM2", () => {
  // The fix must not work by resetting the preference.
  assert.doesNotMatch(boundary, /removeItem|dataset\.theme\s*=/);
  assert.doesNotMatch(boundary, /setTheme/);

  // The preference still round-trips through the same key it always used.
  const theme = read("src/lib/theme.ts");
  assert.match(theme, /CSBT_THEME_STORAGE_KEY = "csbt-theme"/);
  const provider = read("src/components/ThemeProvider.tsx");
  assert.match(provider, /localStorage\.setItem\(CSBT_THEME_STORAGE_KEY, next\)/);
});

test("the appearance attribute stays on the document for Adopt Me to read back", () => {
  // `data-theme` is the preference and is left alone; `data-game` gates it.
  assert.match(layout, /root\.dataset\.theme = theme/);
  const provider = read("src/components/ThemeProvider.tsx");
  assert.match(provider, /document\.documentElement\.dataset\.theme/);
});

// ---------------------------------------------------------------------------
// Nothing Adopt-Me-shaped renders inside MM2
// ---------------------------------------------------------------------------

test("Adopt Me decorations are not rendered on MM2 routes", () => {
  const decorations = read("src/components/theme/ThemeDecorations.tsx");
  assert.match(decorations, /pathname === "\/mm2" \|\| pathname\.startsWith\("\/mm2\/"\)/);
  assert.match(decorations, /return null/);
});

test("MM2 pages never mount the Adopt Me shell", () => {
  // The Adopt Me sidebar carries most of the appearance-specific chrome.
  const shell = read("src/components/mm2/MM2Shell.tsx");
  assert.doesNotMatch(shell, /from "\.\.\/Navbar"/);
  assert.match(shell, /MM2Navbar/);
});

test("no MM2 stylesheet reaches for an Adopt Me appearance", () => {
  const mm2Styles = ["src/components/mm2/MM2HQHome.module.css", "src/components/mm2/nich/MM2NichConsole.module.css", "src/components/mm2/MM2TradeCalculator.module.css", "src/components/mm2/MM2MobileLaunchpad.module.css"];
  for (const file of mm2Styles) {
    assert.doesNotMatch(read(file), /data-theme/, `${file} keys off an Adopt Me appearance`);
  }
});

// ---------------------------------------------------------------------------
// The fix is not a pile of overrides
// ---------------------------------------------------------------------------

test("the boundary was built with the cascade, not by overriding MM2", () => {
  /**
   * The fix must not be a pile of `.mm2Header { background: black !important }`.
   *
   * The check is structural rather than a count: `[data-game="mm2"]` may only
   * ever appear as a *negation*. The moment a rule starts targeting MM2
   * positively, someone is painting over a leak instead of closing it.
   *
   * (Appearance rules that already used `!important` for their own Adopt Me
   * purposes are untouched by this pass and are not what is being measured.)
   */
  const positive: string[] = [];
  let index = css.indexOf('[data-game="mm2"]');

  while (index !== -1) {
    const preceding = css.slice(Math.max(0, index - 6), index);
    if (!preceding.endsWith(":not(")) {
      positive.push(`line ${css.slice(0, index).split("\n").length}: ${css.slice(index - 40, index + 40)}`);
    }
    index = css.indexOf('[data-game="mm2"]', index + 1);
  }

  assert.deepEqual(positive, [], `MM2 is being overridden rather than isolated:\n${positive.join("\n")}`);
});

test("the gate is reproducible and self-checking", () => {
  // A new appearance added later must be gated too; the script is the tool.
  const script = read("scripts/gate-theme-selectors.mjs");
  assert.match(script, /--check/);
  assert.match(script, /:where\(:not\(\[data-game="mm2"\]\)\)/);
});
