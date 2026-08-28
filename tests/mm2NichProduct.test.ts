import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { routeNichForGame } from "../src/lib/nich/gameRouter";
import { createMM2Context, type MM2NichContext } from "../src/lib/nich/mm2/context";
import { buildMM2NichHref, readForwardedQuery, MM2_QUERY_MAX_LENGTH } from "../src/lib/nich/mm2/client";
import { isMM2ResponseMeta } from "../src/lib/nich/responseMeta";
import { evaluateMM2Trade, mm2ItemValue } from "../src/lib/mm2/tradeMath";
import { getMM2TradeResult } from "../src/components/mm2/MM2TradeSummary";
import { mm2Catalog } from "../src/lib/mm2/catalog";
import { getItem } from "../src/lib/search";
import { initialNichContext } from "../src/components/nich/assistant/memory/context";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const repo = path.join(import.meta.dirname, "..");
const read = (relative: string) => fs.readFileSync(path.join(repo, relative), "utf8");

function askMM2(message: string, context: MM2NichContext = createMM2Context()) {
  return routeNichForGame({ gameId: "mm2", message, context });
}

const mm2 = (name: string) => {
  const item = mm2Catalog.find((entry) => entry.NAME.toLowerCase() === name.toLowerCase());
  assert.ok(item, `MM2 catalog is missing "${name}" — the fixture is stale`);
  return item;
};

/** The structured payload from a deterministic MM2 answer. */
function structuredOf(message: string, context?: MM2NichContext) {
  const result = askMM2(message, context);
  const meta = isMM2ResponseMeta(result.response.meta) ? result.response.meta : undefined;
  return { result, meta, structured: meta?.structured };
}

// ---------------------------------------------------------------------------
// 1 — the route exists and is wired to the MM2 shell
// ---------------------------------------------------------------------------

test("/mm2/nich exists as an App Router page inside the MM2 shell", () => {
  const pagePath = path.join(repo, "src/app/mm2/nich/page.tsx");
  assert.ok(fs.existsSync(pagePath), "src/app/mm2/nich/page.tsx is missing");

  const source = read("src/app/mm2/nich/page.tsx");
  assert.match(source, /export default (async )?function/, "the route has no default export");
  // Same shell as every other MM2 route, so the sidebar and mobile nav behave.
  assert.match(source, /MM2Shell/);
  assert.match(source, /MM2NichConsole/);
});

// ---------------------------------------------------------------------------
// 2 — gameId is a hard-coded literal on every MM2 client path
// ---------------------------------------------------------------------------

test("the MM2 console transport hard-codes gameId \"mm2\"", () => {
  const client = read("src/lib/nich/mm2/client.ts");
  assert.match(client, /gameId:\s*"mm2"/, "the transport must send a literal MM2 game id");

  // It must not derive the game from anything — no prop, param or variable.
  assert.doesNotMatch(client, /gameId:\s*gameId/);
  assert.doesNotMatch(client, /gameId:\s*props/);

  // And it must never reference the Adopt Me catalog or resolver.
  for (const forbidden of ["tradingItems", "lib/search", "itemResolver", "adopt-me"]) {
    assert.doesNotMatch(client, new RegExp(forbidden), `MM2 transport referenced ${forbidden}`);
  }
});

test("neither MM2 NICH surface imports Adopt Me data", () => {
  for (const file of [
    "src/components/mm2/nich/MM2NichConsole.tsx",
    "src/components/mm2/nich/MM2NichCards.tsx",
    "src/components/mm2/MM2NichDesk.tsx",
    "src/app/mm2/nich/page.tsx",
  ]) {
    const source = read(file);
    for (const forbidden of ["tradingItems", "tradingMeta", "nich/itemResolver", "lib/search"]) {
      assert.doesNotMatch(source, new RegExp(forbidden), `${file} referenced ${forbidden}`);
    }
  }
});

// ---------------------------------------------------------------------------
// 3 & 4 — homepage → console navigation and query forwarding
// ---------------------------------------------------------------------------

test("the homepage desk links to /mm2/nich and forwards its query", () => {
  const desk = read("src/components/mm2/MM2NichDesk.tsx");
  assert.match(desk, /href="\/mm2\/nich"/, "the Open Console action must link to /mm2/nich");
  assert.match(desk, /buildMM2NichHref/, "the desk must use the shared href builder");

  // The desk is a gateway, not a second chat: it must not call the API itself.
  assert.doesNotMatch(desk, /askMM2Nich/);
  assert.doesNotMatch(desk, /fetch\(/);
});

test("query forwarding round-trips through the URL safely", () => {
  assert.equal(buildMM2NichHref("harvester value"), "/mm2/nich?q=harvester%20value");

  // Characters that would otherwise break or truncate the route.
  const awkward = "is Vampire's Gun > Harvester? #1 & best";
  const href = buildMM2NichHref(awkward);
  const forwarded = new URL(href, "https://example.test").searchParams.get("q");
  assert.equal(forwarded, awkward, "an awkward question did not survive the round trip");

  // Empty, whitespace and null go to the bare console, never ?q=
  for (const empty of ["", "   ", null, undefined]) {
    assert.equal(buildMM2NichHref(empty), "/mm2/nich");
  }

  // Length is capped on the way out and on the way back in.
  const long = "a".repeat(MM2_QUERY_MAX_LENGTH + 250);
  const cappedOut = new URL(buildMM2NichHref(long), "https://example.test").searchParams.get("q");
  assert.equal(cappedOut?.length, MM2_QUERY_MAX_LENGTH);
  assert.equal(readForwardedQuery(long)?.length, MM2_QUERY_MAX_LENGTH);
});

test("the console page reads a forwarded query defensively", () => {
  assert.equal(readForwardedQuery("harvester value"), "harvester value");
  assert.equal(readForwardedQuery("  padded  "), "padded");

  // Direct navigation with no query, and the repeated-param form.
  assert.equal(readForwardedQuery(undefined), undefined);
  assert.equal(readForwardedQuery(""), undefined);
  assert.equal(readForwardedQuery("   "), undefined);
  assert.equal(readForwardedQuery(["first", "second"]), "first");
});

// ---------------------------------------------------------------------------
// 5 — the forwarded query cannot run twice
// ---------------------------------------------------------------------------

test("the console guards the forwarded query against double execution", () => {
  const console_ = read("src/components/mm2/nich/MM2NichConsole.tsx");

  // A ref latch, compared against the query itself, is what makes a re-render
  // or React's dev double-invoke idempotent.
  assert.match(console_, /forwardedRef/);
  assert.match(console_, /if \(forwardedRef\.current === query\) return;/);

  // The desk must also refuse a second navigation from a double submit.
  const desk = read("src/components/mm2/MM2NichDesk.tsx");
  assert.match(desk, /submittedRef/);
});

// ---------------------------------------------------------------------------
// 6 — the sidebar carries NICH as a core MM2 tool
// ---------------------------------------------------------------------------

test("NICH is a core MM2 sidebar entry, not a community one", () => {
  const navbar = read("src/components/mm2/MM2Navbar.tsx");

  const commandBlock = navbar.slice(
    navbar.indexOf("const commandLinks"),
    navbar.indexOf("const communityLinks"),
  );
  assert.match(commandBlock, /href: "\/mm2\/nich"/, "NICH must sit in the Command Deck group");

  const communityBlock = navbar.slice(navbar.indexOf("const communityLinks"));
  assert.doesNotMatch(communityBlock, /\/mm2\/nich/);

  // Active state comes from the shared prefix matcher already used by every
  // other MM2 route, so /mm2/nich highlights without special-casing.
  assert.match(navbar, /function activeFor/);
});

// ---------------------------------------------------------------------------
// 7-9 — the product layer did not weaken the engine
// ---------------------------------------------------------------------------

test("a value query still runs on the MM2 engine, locally", () => {
  const { result, meta } = structuredOf("harvester value");
  assert.equal(result.handledLocally, true);
  assert.equal(result.response.aiEligible, false);
  assert.equal(meta?.channel, "LOCAL");
  assert.deepEqual(meta?.sources, ["LOCAL MM2 ENGINE", "SUPREME VALUES"]);
  assert.match(result.response.text, new RegExp(mm2("Harvester").SOURCE_VALUE!.toLocaleString("en-US")));
});

test("MM2 W/F/L from the console still matches the MM2 calculator", () => {
  const { structured } = structuredOf("my harvester for their icebreaker");
  assert.equal(structured?.kind, "trade");
  if (structured?.kind !== "trade") return;

  const calculator = evaluateMM2Trade({
    yourItems: [{ id: "y", item: mm2("Harvester"), quantity: 1 }],
    theirItems: [{ id: "t", item: mm2("Icebreaker"), quantity: 1 }],
    valueSource: "SUPREME",
  });

  assert.equal(structured.verdict, calculator.verdict);
  assert.equal(structured.yourTotal, calculator.yourTotal);
  assert.equal(structured.theirTotal, calculator.theirTotal);

  // And the calculator's own UI headline agrees with the card.
  const ui = getMM2TradeResult(
    calculator.yourTotal,
    calculator.theirTotal,
    "SUPREME",
    calculator.yourMissing + calculator.theirMissing,
  );
  assert.equal(ui.title, structured.verdict);
});

test("the MM2 console still cannot reach the Adopt Me catalog", () => {
  const frostDragon = getItem("Frost Dragon");
  assert.ok(frostDragon, "Adopt Me fixture is stale");

  const { result } = structuredOf("frost dragon value");
  assert.match(result.response.text, /couldn't find|MM2 catalog/i);

  const adoptValue = frostDragon.GCASH_NORMAL ?? frostDragon.NORMAL;
  if (typeof adoptValue === "number") {
    assert.doesNotMatch(result.response.text, new RegExp(`\\b${adoptValue.toLocaleString("en-US")}\\b`));
  }
});

// ---------------------------------------------------------------------------
// 10 — Adopt Me is untouched by the product layer
// ---------------------------------------------------------------------------

test("Adopt Me NICH still answers and carries no MM2 payload", () => {
  const result = routeNichForGame({
    gameId: "adopt-me",
    message: "frost dragon value",
    context: { ...initialNichContext },
  });

  assert.match(result.response.text, /Frost Dragon/i);
  assert.equal(isMM2ResponseMeta(result.response.meta), false);
});

test("the shared chat UI was not made MM2-specific", () => {
  // The Adopt Me chat must not have grown MM2 imports; the MM2 console is a
  // separate surface precisely so this stays true.
  const chat = read("src/components/nich/assistant/NichChat.tsx");
  assert.doesNotMatch(chat, /lib\/nich\/mm2/, "the Adopt Me chat imported MM2 code");
  assert.doesNotMatch(chat, /mm2Items/, "the Adopt Me chat imported the MM2 catalog");
  assert.match(chat, /gameId: "adopt-me"/, "the Adopt Me chat must still state its own game");

  // The Adopt Me brain is likewise free of MM2 imports.
  const admBrain = read("src/components/nich/assistant/brain/router.ts");
  assert.doesNotMatch(admBrain, /lib\/nich\/mm2/, "the Adopt Me brain imported MM2 code");
});

// ---------------------------------------------------------------------------
// 11 — missing values stay missing in the structured payload
// ---------------------------------------------------------------------------

test("a card never turns a missing MM2 value into a number", () => {
  const unpriced = mm2Catalog.find(
    (item) => item.SOURCE_VALUE === null && typeof item.GCASH_VALUE === "number",
  );
  assert.ok(unpriced, "expected a weapon priced in GCash but not Supreme");

  const { structured } = structuredOf(`${unpriced.NAME} value`);
  assert.equal(structured?.kind, "item");
  if (structured?.kind !== "item") return;

  // null, not 0 — a zero in a price column reads as "free".
  assert.equal(structured.item.supreme, null);
  assert.equal(structured.item.gcash, unpriced.GCASH_VALUE);

  const trade = structuredOf(`wfl my ${unpriced.NAME} for their harvester`).structured;
  assert.equal(trade?.kind, "trade");
  if (trade?.kind !== "trade") return;
  assert.equal(trade.verdict, "CHECK");
  assert.equal(trade.difference, 0);
  assert.ok(trade.missingNames.includes(unpriced.NAME));
  assert.ok(trade.yours.some((row) => row.unit === null && row.line === null));
});

// ---------------------------------------------------------------------------
// 12 — cards carry the engine's real numbers
// ---------------------------------------------------------------------------

test("the item card mirrors the catalog exactly", () => {
  const harvester = mm2("Harvester");
  const { structured } = structuredOf("harvester value");
  assert.equal(structured?.kind, "item");
  if (structured?.kind !== "item") return;

  assert.equal(structured.item.id, harvester.ID);
  assert.equal(structured.item.name, harvester.NAME);
  assert.equal(structured.item.category, harvester.CATEGORY);
  assert.equal(structured.item.supreme, mm2ItemValue(harvester, "SUPREME"));
  assert.equal(structured.item.gcash, mm2ItemValue(harvester, "GCASH"));
  assert.equal(structured.item.demand, harvester.DEMAND);
  assert.equal(structured.item.href, `/mm2/values/${encodeURIComponent(harvester.ID)}`);
  assert.equal(structured.focus, "SUPREME");
});

test("the comparison card's winner and edge match the prose", () => {
  const { result, structured } = structuredOf("harvester vs icepiercer");
  assert.equal(structured?.kind, "comparison");
  if (structured?.kind !== "comparison") return;

  const harvester = mm2("Harvester");
  const icepiercer = mm2("Icepiercer");
  const expectedWinner =
    (harvester.SOURCE_VALUE ?? 0) >= (icepiercer.SOURCE_VALUE ?? 0) ? harvester : icepiercer;
  const expectedEdge = Math.abs((harvester.SOURCE_VALUE ?? 0) - (icepiercer.SOURCE_VALUE ?? 0));

  assert.equal(structured.winnerId, expectedWinner.ID);
  assert.equal(structured.edge, expectedEdge);
  // The card and the sentence must name the same winner.
  assert.match(result.response.text, new RegExp(`\\*\\*${expectedWinner.NAME}\\*\\* is worth more`));
});

test("the catalog card carries the same rows the text lists", () => {
  const { result, structured } = structuredOf("top 5 godlies");
  assert.equal(structured?.kind, "catalog");
  if (structured?.kind !== "catalog") return;

  assert.equal(structured.rows.length, 5);
  assert.equal(structured.source, "SUPREME");
  assert.ok(structured.total > 5);
  for (const row of structured.rows) {
    assert.equal(row.category, "GODLY");
    assert.match(result.response.text, new RegExp(row.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("an ambiguous query produces a clarify card, not a guess", () => {
  const { structured } = structuredOf("rainbowgun value");
  assert.equal(structured?.kind, "clarify");
  if (structured?.kind !== "clarify") return;
  assert.ok(structured.candidates.length >= 2);
  // The two Rainbow weapons differ by 10x; the card must offer both.
  const names = structured.candidates.map((candidate) => candidate.name);
  assert.ok(names.includes("Rainbow Gun"));
  assert.ok(names.includes("Rainbow (Gun)"));
});

// ---------------------------------------------------------------------------
// Provenance is reported, never inferred
// ---------------------------------------------------------------------------

test("provenance labels match the data the engine actually read", () => {
  const cases: Array<[string, string[]]> = [
    ["harvester value", ["LOCAL MM2 ENGINE", "SUPREME VALUES"]],
    ["gcash value of harvester", ["LOCAL MM2 ENGINE", "GCASH DATABASE"]],
    ["demand of harvester", ["LOCAL MM2 ENGINE", "DEMAND DATA"]],
    ["my harvester for their icebreaker", ["TRADE ENGINE", "SUPREME VALUES"]],
    ["top 5 godlies", ["MM2 CATALOG", "SUPREME VALUES"]],
  ];

  for (const [message, expected] of cases) {
    const { meta } = structuredOf(message);
    assert.deepEqual(meta?.sources, expected, `wrong provenance for "${message}"`);
    assert.equal(meta?.channel, "LOCAL");
  }
});

test("an open-ended question is labelled AI, not local", () => {
  const { result, meta } = structuredOf(
    "what's your general strategy for building up to a godly over a few weeks?",
  );
  assert.equal(result.handledLocally, false);
  assert.equal(meta?.channel, "AI");
  assert.deepEqual(meta?.sources, ["NICH AI", "MM2 CONTEXT"]);
  assert.equal(meta?.structured, undefined, "an AI answer must carry no deterministic card");
});

// ---------------------------------------------------------------------------
// The console's conversation flow (the brief's worked example)
// ---------------------------------------------------------------------------

test("the homepage-to-console worked example runs end to end, locally", () => {
  let context = createMM2Context();
  const channels: string[] = [];

  const step = (message: string) => {
    const result = askMM2(message, context);
    context = result.context as MM2NichContext;
    const meta = isMM2ResponseMeta(result.response.meta) ? result.response.meta : undefined;
    channels.push(meta?.channel ?? "NONE");
    return { result, meta };
  };

  // 1 — forwarded from the homepage
  const value = step("harvester value");
  assert.equal(value.meta?.structured?.kind, "item");

  // 2 — bare source switch keeps the weapon
  const gcash = step("gcash?");
  assert.match(gcash.result.response.text, /Harvester/);
  assert.match(gcash.result.response.text, new RegExp(mm2("Harvester").GCASH_VALUE!.toLocaleString("en-US")));

  // 3 — pronoun comparison
  const compare = step("compare it to icepiercer");
  assert.equal(compare.meta?.structured?.kind, "comparison");

  // 4 — trade built from the comparison set
  const trade = step("what if I trade both for batwing?");
  assert.equal(trade.meta?.structured?.kind, "trade");
  if (trade.meta?.structured?.kind === "trade") {
    const yourNames = trade.meta.structured.yours.map((row) => row.name).sort();
    assert.deepEqual(yourNames, ["Harvester", "Icepiercer"], '"both" must expand to the compared pair');
    assert.deepEqual(trade.meta.structured.theirs.map((row) => row.name), ["Batwing"]);
  }

  // Every step stayed on the deterministic engine — no model was consulted.
  assert.deepEqual(channels, ["LOCAL", "LOCAL", "LOCAL", "LOCAL"]);
});
