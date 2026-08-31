/**
 * Scope every Adopt Me appearance rule beneath the Adopt Me game boundary.
 *
 * Appearances are applied as `data-theme` on <html>, which means a selector
 * written for Adopt Me chrome matches identical markup anywhere in the app —
 * including MM2's. `[data-theme="snoopy"] header > div` is the one that showed
 * up in screenshots: MM2's NICH header and HQ status panel are both a <header>
 * with a <div> inside, so they rendered in Snoopy's cream.
 *
 * This rewrites every `[data-theme="<name>"]` into
 * `[data-theme="<name>"]:where(:not([data-game="mm2"]))`.
 *
 * `:where()` contributes zero specificity, so every rule keeps exactly the
 * weight it had — only its reach changes. `[data-theme]` with no value is left
 * alone on purpose: that block defines shared aliases that MM2 needs.
 *
 * Idempotent: running it twice changes nothing. Kept in the repo so the same
 * transformation can be re-applied if a new appearance is added.
 *
 *   node scripts/gate-theme-selectors.mjs [--check]
 */

import fs from "node:fs";

const FILE = "src/app/globals.css";
const GATE = ':where(:not([data-game="mm2"]))';
const THEMES = ["dark", "halloween", "light", "snoopy"];

const checkOnly = process.argv.includes("--check");
const original = fs.readFileSync(FILE, "utf8");
let css = original;
let gated = 0;

for (const theme of THEMES) {
  const token = `[data-theme="${theme}"]`;
  const gatedToken = token + GATE;

  // Split on the already-gated form first so it is never matched twice.
  css = css
    .split(gatedToken)
    .map((segment) => {
      const parts = segment.split(token);
      gated += parts.length - 1;
      return parts.join(gatedToken);
    })
    .join(gatedToken);
}

if (checkOnly) {
  const clean = css === original;
  console.log(clean ? "All appearance selectors are scoped." : "Ungated appearance selectors found.");
  process.exit(clean ? 0 : 1);
}

fs.writeFileSync(FILE, css);
console.log(`Scoped ${gated} appearance selector token(s) in ${FILE}.`);
