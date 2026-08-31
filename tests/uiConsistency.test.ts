/**
 * Site-wide UX consistency.
 *
 * Two things are guarded here, and both are the kind of regression that is
 * invisible until a user hits it:
 *
 *   1. The game switch is *universal*. It used to live inside the default home
 *      hero, so choosing any other appearance silently deleted it — the control
 *      that decides which game's catalog every other page reads. These tests
 *      render it for real and assert that every shell renders the shared one.
 *
 *   2. Engineering vocabulary stays out of the UI. The banned list is checked
 *      against rendered text only; the same words are perfectly fine as
 *      identifiers, and several of them are still used in the source on purpose.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";

import { GameModeSwitchView, gameForPath, CSBT_GAMES } from "../src/components/games/GameModeSwitch";
import { CSBT_THEME_IDS, CSBT_THEMES } from "../src/lib/theme";
import { mm2SourceLabel, MM2_SOURCE_DISPLAY, NICH_TAGLINE } from "../src/content/nichCopy";

const repo = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(repo, relative), "utf8");

function renderSwitch(pathname: string, variant: "rail" | "compact" | "inline" = "rail") {
  return renderToStaticMarkup(React.createElement(GameModeSwitchView, { pathname, variant }));
}

// ---------------------------------------------------------------------------
// 1 — the switch is one control, and it is universal
// ---------------------------------------------------------------------------

test("the switch offers both games and marks the one you are in", () => {
  const onAdoptMe = renderSwitch("/");
  assert.match(onAdoptMe, /href="\/"/);
  assert.match(onAdoptMe, /href="\/mm2"/);
  assert.match(onAdoptMe, /aria-current="page"[^>]*>[^<]*🐾|🐾[\s\S]{0,80}?Adopt Me/);

  const onMM2 = renderSwitch("/mm2/values");
  // Exactly one destination is ever marked current, in either game.
  assert.equal((onAdoptMe.match(/aria-current="page"/g) ?? []).length, 1);
  assert.equal((onMM2.match(/aria-current="page"/g) ?? []).length, 1);
});

test("the active game is read from the URL, so there is no second state to drift", () => {
  assert.equal(gameForPath("/"), "adopt-me");
  assert.equal(gameForPath("/values"), "adopt-me");
  assert.equal(gameForPath("/exchange/rooms/abc"), "adopt-me");
  assert.equal(gameForPath("/mm2"), "mm2");
  assert.equal(gameForPath("/mm2/values/mm2-harvester-ancient"), "mm2");
  // A path that merely starts with the letters must not count as MM2.
  assert.equal(gameForPath("/mm2xyz"), "adopt-me");
});

test("every appearance keeps the switch, because no appearance renders it", () => {
  /**
   * The four appearances swap the home hero, and only the default one used to
   * carry the switch. The guarantee now is structural: no hero renders it, and
   * the shared sidebar does — so there is nothing an appearance could remove.
   */
  const heroes = [
    "src/components/Hero.tsx",
    "src/components/home/HalloweenHomeHero.tsx",
    "src/components/home/RobloxHomeHero.tsx",
    "src/components/home/SnoopyHomeHero.tsx",
  ];

  for (const hero of heroes) {
    const source = read(hero);
    assert.doesNotMatch(
      source,
      /<GameModeSwitch|<GameSwitcher/,
      `${hero} renders its own game switch; it belongs to the shared shell`,
    );
  }

  const navbar = read("src/components/Navbar.tsx");
  assert.match(navbar, /<GameModeSwitch variant="rail"/, "the desktop sidebar must render the switch");
  assert.match(navbar, /<GameModeSwitch variant="compact"/, "the mobile header must render the switch");
});

test("the appearance picker still offers every theme it used to", () => {
  // Guards the other half of the promise: appearances change presentation only.
  assert.deepEqual([...CSBT_THEME_IDS].sort(), ["dark", "halloween", "light", "snoopy"]);
  for (const id of CSBT_THEME_IDS) {
    assert.ok(CSBT_THEMES[id].label, `${id} has no label`);
  }
});

test("both games render the same shared control, not two copies", () => {
  const mm2Navbar = read("src/components/mm2/MM2Navbar.tsx");
  assert.match(mm2Navbar, /<GameModeSwitch variant="rail"/);
  assert.match(mm2Navbar, /<GameModeSwitch variant="compact"/);

  // The MM2 rail used to hand-roll its own pair of links, labelled "ADM".
  assert.doesNotMatch(mm2Navbar, />ADM</, "MM2 still has a hand-written game switch");

  // And the retired component must not grow a second implementation.
  const legacy = read("src/components/GameSwitcher.tsx");
  assert.match(legacy, /GameModeSwitch/, "the legacy alias must delegate to the shared control");
});

test("only one switch is visible at any width", () => {
  const navbar = read("src/components/Navbar.tsx");
  // The rail is desktop-only (`lg:block`) and the header is mobile-only
  // (`lg:hidden`), so the two instances are never on screen together.
  assert.match(navbar, /hidden w-\[268px\][^"]*lg:block/);
  assert.match(navbar, /sticky top-0 z-50 px-3 py-2\.5 lg:hidden/);
});

test("the switch is reachable and labelled for assistive tech", () => {
  for (const variant of ["rail", "compact", "inline"] as const) {
    const markup = renderSwitch("/", variant);
    assert.match(markup, /role="group"/, `${variant} has no grouping role`);
    assert.match(markup, /aria-label="Choose game"/, `${variant} has no group label`);
    // Real links: keyboard focusable and navigable without JavaScript.
    assert.equal((markup.match(/<a /g) ?? []).length, CSBT_GAMES.length, `${variant} is not two links`);
    assert.match(markup, /focus-visible:/, `${variant} has no visible focus state`);
  }
});

test("tap targets meet the mobile minimum", () => {
  // 44px is the smallest comfortable touch target; min-h-11 is 44px.
  assert.match(renderSwitch("/", "compact"), /min-h-11/);
  assert.match(renderSwitch("/", "rail"), /min-h-11/);
  assert.match(renderSwitch("/", "inline"), /min-h-12/);
});

test("the compact switch still names both games when the label is hidden", () => {
  const markup = renderSwitch("/", "compact");
  for (const game of CSBT_GAMES) {
    assert.match(markup, new RegExp(`aria-label="${game.label}"`), `${game.label} is unlabelled`);
  }
});

test("MM2 restyles the switch instead of replacing it", () => {
  const css = read("src/app/globals.css");
  assert.match(css, /\.mm2-game-switch/, "MM2 has no skin for the shared switch");
  // The skin may only change presentation — no display:none anywhere in it.
  const block = css.slice(css.indexOf(".mm2-game-switch"), css.indexOf(".mm2-control-rail::-webkit-scrollbar"));
  assert.doesNotMatch(block, /display:\s*none/, "an appearance must never hide the switch");
});

// ---------------------------------------------------------------------------
// 2 — engineering vocabulary stays out of the UI
// ---------------------------------------------------------------------------

/**
 * Phrases that must never reach a trader.
 *
 * Deliberately multi-word and specific: single words like "provider" or
 * "cache" are correct and common in the source, and banning them outright
 * would be a rule about our own code rather than about the product.
 */
const BANNED_UI_PHRASES = [
  "local-first",
  "semantic resolver",
  "semantic intent",
  "catalog constrained",
  "catalog-constrained",
  "provider fallback",
  "vision pipeline",
  "recognition pipeline",
  "remote inference",
  "ai provider",
  "data layer",
  "confidence calibration",
  "cache version",
  "transport mode",
  "system telemetry",
  "unresolved entities",
  "no entities",
  "no active context",
  "local intelligence",
  "candidate resolver",
  "deterministic",
];

/** Source positions that end up on screen. */
function userFacingStrings(source: string): string[] {
  const found: string[] = [];
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;

    for (const match of line.matchAll(/>([^<>{}]{3,240})</g)) found.push(match[1]);
    for (const match of line.matchAll(
      /(?:aria-label|placeholder|title|alt|label|description|message|text|headline|subtitle|eyebrow)\s*[=:]\s*"([^"]{3,240})"/g,
    )) {
      found.push(match[1]);
    }
  }
  return found;
}

function walkSource(dir: string, files: string[] = []): string[] {
  const full = path.join(repo, dir);
  if (!fs.existsSync(full)) return files;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const relative = path.join(dir, entry.name);
    if (entry.isDirectory()) walkSource(relative, files);
    else if (/\.(tsx|ts)$/.test(entry.name)) files.push(relative);
  }
  return files;
}

test("no engineering jargon reaches the rendered UI", () => {
  const offenders: string[] = [];

  for (const file of [...walkSource("src/components"), ...walkSource("src/app"), ...walkSource("src/content")]) {
    for (const candidate of userFacingStrings(read(file))) {
      const lowered = candidate.toLowerCase();
      for (const phrase of BANNED_UI_PHRASES) {
        if (lowered.includes(phrase)) offenders.push(`${file}: "${candidate.trim().slice(0, 90)}" (${phrase})`);
      }
    }
  }

  assert.deepEqual(offenders, [], `engineering vocabulary is rendered to users:\n${offenders.join("\n")}`);
});

test("NICH introduces itself by what it does, not how it is built", () => {
  assert.equal(NICH_TAGLINE, "Values · Trades · Demand");

  const chat = read("src/components/nich/assistant/NichChat.tsx");
  assert.doesNotMatch(chat, /Local-first/i, "the old build-detail tagline is back");
  assert.match(chat, /NICH_TAGLINE/, "the chat header should use the shared tagline");
});

test("MM2 answer chips say where a number came from in plain words", () => {
  // The engine's own labels are identifiers and stay in the payload; only the
  // chip text is translated.
  assert.equal(mm2SourceLabel("LOCAL MM2 ENGINE"), "CSBT values");
  assert.equal(mm2SourceLabel("TRADE ENGINE"), "Trade calculator");
  assert.equal(mm2SourceLabel("MM2 CONTEXT"), "This conversation");

  // An unmapped label degrades to itself rather than disappearing.
  assert.equal(mm2SourceLabel("SOMETHING NEW"), "SOMETHING NEW");

  for (const display of Object.values(MM2_SOURCE_DISPLAY)) {
    assert.doesNotMatch(display, /ENGINE|PIPELINE|RESOLVER/i, `${display} still reads like a component name`);
  }

  const console_ = read("src/components/mm2/nich/MM2NichConsole.tsx");
  assert.match(console_, /mm2SourceLabel\(source\)/, "the console should render the friendly label");
  assert.doesNotMatch(console_, /<li><span>LOCAL ENGINE<\/span>/, "the developer status panel is back");
});

test("screenshot failures are explained in terms a trader can act on", () => {
  const vision = read("src/app/api/nich/vision/route.ts");
  const messages = [...vision.matchAll(/message: "([^"]+)"/g)].map((match) => match[1]);
  assert.ok(messages.length >= 8, "expected the vision route to still return user messages");

  for (const message of messages) {
    assert.doesNotMatch(message, /gemini|api[_ ]key|environment|manifest|pipeline|provider/i, `leaks internals: "${message}"`);
  }
});

test("product names are spelled one way", () => {
  const files = [...walkSource("src/components"), ...walkSource("src/app")];

  for (const file of files) {
    const source = read(file);
    const strings = userFacingStrings(source);

    for (const candidate of strings) {
      assert.doesNotMatch(candidate, /\bAdoptMe\b/, `${file} writes AdoptMe without the space`);
      assert.doesNotMatch(candidate, /\bCSBT Hub\b/, `${file} writes CSBT Hub instead of CSBT HUB`);
      // W/F/L is the abbreviation; the spelled-out form is spaced.
      assert.doesNotMatch(candidate, /Win\/Fair\/Lose/, `${file} writes Win/Fair/Lose unspaced`);
    }
  }
});

test("the calculator has one name across both games", () => {
  const alternatives = ["Value Calculator", "Trade Checker", "Value Checker"];
  for (const file of [...walkSource("src/components"), ...walkSource("src/app")]) {
    for (const candidate of userFacingStrings(read(file))) {
      for (const wrong of alternatives) {
        assert.ok(!candidate.includes(wrong), `${file} calls it "${wrong}"; CSBT calls it Trade Calculator`);
      }
    }
  }
});

test("the assistant is called NICH in the interface chrome", () => {
  // "Nich Cast" is the founder and is deliberately untouched; this covers the
  // controls, where the mixed casing was actually visible.
  const button = read("src/components/nich/assistant/NichButton.tsx");
  assert.match(button, /aria-label="Hide NICH"/);
  assert.match(button, />NICH AI</);

  const chat = read("src/components/nich/assistant/NichChat.tsx");
  assert.match(chat, /aria-label="Ask NICH"/);
  assert.match(chat, /aria-label="Close NICH"/);

  const about = read("src/app/about/page.tsx");
  assert.match(about, /Nich Cast/, "the founder's name must not be uppercased");
});
