import test from "node:test";
import assert from "node:assert/strict";

import { routeNichForGame, routeNichForGameSafely, type NichGameRequest } from "../src/lib/nich/gameRouter";
import { createMM2Context, sanitizeMM2Context, type MM2NichContext } from "../src/lib/nich/mm2/context";
import { resolveMM2Item, getMM2ItemById } from "../src/lib/nich/mm2/resolver";
import { analyzeMM2Message } from "../src/lib/nich/mm2/intent";
import { parseMM2Trade, evaluateParsedMM2Trade } from "../src/lib/nich/mm2/trade";
import { evaluateMM2Trade, mm2ItemValue } from "../src/lib/mm2/tradeMath";
import { getMM2TradeResult } from "../src/components/mm2/MM2TradeSummary";
import { getNichGameAdapter } from "../src/lib/nich/game/registry";
import { assertGameContext, requireNichGameId, NichGameContextError } from "../src/lib/nich/game/guard";
import { parseNichGameId } from "../src/lib/nich/game/types";
import { buildNichSystemPrompt } from "../src/lib/nich/prompts";
import { initialNichContext } from "../src/components/nich/assistant/memory/context";
import { mm2Catalog } from "../src/lib/mm2/catalog";
import { getItem } from "../src/lib/search";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function askMM2(message: string, context: MM2NichContext = createMM2Context()) {
  return routeNichForGame({ gameId: "mm2", message, context });
}

function askAdoptMe(message: string) {
  return routeNichForGame({ gameId: "adopt-me", message, context: { ...initialNichContext } });
}

const mm2 = (name: string) => {
  const item = mm2Catalog.find((entry) => entry.NAME.toLowerCase() === name.toLowerCase());
  assert.ok(item, `MM2 catalog is missing "${name}" — the test fixture is stale`);
  return item;
};

// ---------------------------------------------------------------------------
// CRITICAL: cross-game isolation
//
// These are the tests the whole architecture exists to pass. Both catalogs
// contain items with the same display name, and their values are unrelated.
// ---------------------------------------------------------------------------

test("MM2: 'batwing value' resolves the MM2 Batwing", () => {
  const { response } = askMM2("batwing value");
  const batwing = mm2("Batwing");
  assert.match(response.text, /Batwing/);
  assert.match(response.text, new RegExp(String(batwing.SOURCE_VALUE)));
  assert.equal(response.aiEligible, false);
});

test("MM2: 'harvester value' resolves the MM2 Harvester", () => {
  const { response } = askMM2("harvester value");
  const harvester = mm2("Harvester");
  assert.match(response.text, /Harvester/);
  assert.match(response.text, new RegExp(harvester.SOURCE_VALUE!.toLocaleString("en-US")));
});

test("MM2: 'frost dragon value' never returns the Adopt Me Frost Dragon value", () => {
  const frostDragon = getItem("Frost Dragon");
  assert.ok(frostDragon, "Adopt Me catalog is missing Frost Dragon — fixture is stale");

  const { response } = askMM2("frost dragon value");

  // MM2 has no Frost Dragon. The only acceptable outcomes are "not found" or a
  // clarification — never an Adopt Me number.
  assert.match(response.text, /couldn't find|not|MM2 catalog/i);

  for (const source of ["GCASH_NORMAL", "ELVE_NORMAL", "NORMAL"] as const) {
    const value = frostDragon[source];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      assert.doesNotMatch(
        response.text,
        new RegExp(`\\b${value.toLocaleString("en-US")}\\b`),
        `MM2 answer leaked the Adopt Me Frost Dragon ${source} value`,
      );
    }
  }
});

test("Adopt Me: 'frost dragon value' still resolves the Adopt Me Frost Dragon", () => {
  const { response } = askAdoptMe("frost dragon value");
  assert.match(response.text, /Frost Dragon/i);
});

test("Adopt Me: 'harvester value' never returns the MM2 Harvester value", () => {
  const harvester = mm2("Harvester");
  const { response } = askAdoptMe("harvester value");

  assert.doesNotMatch(
    response.text,
    new RegExp(`\\b${harvester.SOURCE_VALUE!.toLocaleString("en-US")}\\b`),
    "Adopt Me answer leaked the MM2 Harvester Supreme value",
  );
});

test("a name that exists in BOTH catalogs resolves to the asking game's item", () => {
  // "Shark" is a real entry in both games with unrelated values.
  const mm2Shark = mm2("Shark");
  const adoptShark = getItem("Shark");
  assert.ok(adoptShark, "Adopt Me catalog is missing Shark — fixture is stale");

  const mm2Answer = askMM2("shark value").response.text;
  assert.match(mm2Answer, /Shark/);

  // The MM2 answer must carry the MM2 number and not the Adopt Me one.
  if (typeof mm2Shark.SOURCE_VALUE === "number") {
    assert.match(mm2Answer, new RegExp(mm2Shark.SOURCE_VALUE.toLocaleString("en-US")));
  }
  const adoptSharkValue = adoptShark.GCASH_NORMAL ?? adoptShark.NORMAL;
  if (typeof adoptSharkValue === "number" && adoptSharkValue !== mm2Shark.SOURCE_VALUE) {
    assert.doesNotMatch(mm2Answer, new RegExp(`\\b${adoptSharkValue.toLocaleString("en-US")}\\b`));
  }
});

// ---------------------------------------------------------------------------
// Game context is mandatory
// ---------------------------------------------------------------------------

test("a missing game id never silently becomes Adopt Me", () => {
  assert.equal(parseNichGameId(undefined), null);
  assert.equal(parseNichGameId(""), null);
  assert.equal(parseNichGameId("pet-sim"), null);
  assert.equal(parseNichGameId("mm2"), "mm2");
  assert.equal(parseNichGameId("adopt-me"), "adopt-me");

  assert.throws(() => requireNichGameId(undefined, "test"), NichGameContextError);
  assert.throws(() => requireNichGameId(null, "test"), NichGameContextError);
});

test("routing without a game id throws rather than defaulting", () => {
  assert.throws(
    () => routeNichForGame({ message: "harvester value", context: createMM2Context() } as unknown as NichGameRequest),
    NichGameContextError,
  );
});

test("a cross-game tool call is blocked, not silently answered", () => {
  assert.throws(() => resolveMM2Item("harvester", { gameId: "adopt-me" }), NichGameContextError);
  assert.throws(() => assertGameContext("mm2", "adopt-me", "test"), NichGameContextError);

  const adoptMeAdapter = getNichGameAdapter("adopt-me");
  assert.throws(() => adoptMeAdapter.resolveItem("harvester", "mm2"), NichGameContextError);

  const mm2Adapter = getNichGameAdapter("mm2");
  assert.throws(() => mm2Adapter.resolveItem("frost dragon", "adopt-me"), NichGameContextError);
});

test("a guard violation degrades to a refusal, never to the other game's answer", () => {
  const result = routeNichForGameSafely({
    message: "harvester value",
    context: createMM2Context(),
  } as unknown as NichGameRequest);
  assert.match(result.response.text, /couldn't tell which game/i);
  assert.equal(result.response.aiEligible, false);
});

test("each game asks a model with its own prompt", () => {
  const mm2Prompt = buildNichSystemPrompt("mm2");
  const adoptPrompt = buildNichSystemPrompt("adopt-me");

  assert.match(mm2Prompt, /MURDER MYSTERY 2/);
  assert.match(mm2Prompt, /Supreme Value/);
  // Elve Shark may appear only as an explicit denial, never as a usable source.
  assert.match(mm2Prompt, /Elve Shark values do not exist in MM2/);
  assert.doesNotMatch(mm2Prompt, /Frost Dragon/);

  assert.match(adoptPrompt, /Adopt Me/);
  assert.notEqual(mm2Prompt, adoptPrompt);
  assert.throws(() => buildNichSystemPrompt(undefined), NichGameContextError);
});

test("each game only accepts its own value sources", () => {
  const mm2Adapter = getNichGameAdapter("mm2");
  const adoptMeAdapter = getNichGameAdapter("adopt-me");

  assert.deepEqual([...mm2Adapter.valueSources], ["SUPREME", "GCASH"]);
  assert.deepEqual([...adoptMeAdapter.valueSources], ["GCASH", "ELVE"]);

  // MM2 has no Elve Shark; Adopt Me has no Supreme.
  assert.throws(() => mm2Adapter.getValue(mm2("Harvester").ID, "ELVE", "mm2"), /no value source/i);
  assert.throws(() => adoptMeAdapter.getValue("any", "SUPREME", "adopt-me"), /no value source/i);
});

// ---------------------------------------------------------------------------
// Memory isolation
// ---------------------------------------------------------------------------

test("MM2 conversation state cannot be read as Adopt Me state, or vice versa", () => {
  // An Adopt Me context object offered as MM2 context is discarded, not coerced.
  const adoptMeShaped = { lastPetName: "Frost Dragon", recentPets: [{ petName: "Frost Dragon" }], turnCount: 4 };
  const sanitized = sanitizeMM2Context(adoptMeShaped);

  assert.equal(sanitized.gameId, "mm2");
  assert.deepEqual(sanitized.recentItemIds, []);
  assert.equal(sanitized.turnCount, 0);
  assert.equal((sanitized as unknown as { lastPetName?: string }).lastPetName, undefined);
});

test("an MM2 turn leaves no trace in the Adopt Me context", () => {
  const mm2Result = askMM2("harvester value");
  const mm2Context = mm2Result.context as MM2NichContext;
  assert.ok(mm2Context.recentItemIds?.length, "MM2 turn should record an MM2 id");

  // The Adopt Me brain is handed its own untouched context.
  const adoptResult = askAdoptMe("what about gcash?");
  const adoptContext = adoptResult.context as typeof initialNichContext;
  assert.equal((adoptContext as unknown as MM2NichContext).recentItemIds, undefined);
});

test("an Adopt Me follow-up cannot resolve an MM2 weapon from MM2 memory", () => {
  // MM2 turn first, so MM2 memory holds Harvester.
  const mm2Context = askMM2("harvester value").context as MM2NichContext;
  assert.ok(mm2Context.recentItemIds?.includes(mm2("Harvester").ID));

  // The Adopt Me side is given a fresh Adopt Me context; there is no bridge.
  const { response } = askAdoptMe("what about it?");
  assert.doesNotMatch(response.text, new RegExp(mm2("Harvester").SOURCE_VALUE!.toLocaleString("en-US")));
});

// ---------------------------------------------------------------------------
// MM2 resolution
// ---------------------------------------------------------------------------

test("MM2 resolution is by canonical ID and survives case, spacing and punctuation", () => {
  const black = mm2("Black Luger");
  for (const query of ["Black Luger", "black luger", "BLACK  LUGER", "blackluger", black.ID]) {
    const resolution = resolveMM2Item(query, { gameId: "mm2" });
    assert.equal(resolution.status, "resolved", `"${query}" did not resolve`);
    if (resolution.status !== "resolved") continue;
    assert.equal(resolution.item.ID, black.ID, `"${query}" resolved to ${resolution.item.NAME}`);
  }
});

test("MM2 resolution tolerates a reasonable typo", () => {
  for (const [typo, expected] of [
    ["harvestor", "Harvester"],
    ["icebraker", "Icebreaker"],
    ["darkbringr", "Darkbringer"],
  ] as const) {
    const resolution = resolveMM2Item(typo, { gameId: "mm2" });
    assert.equal(resolution.status, "resolved", `"${typo}" did not resolve`);
    if (resolution.status !== "resolved") continue;
    assert.equal(resolution.item.NAME, expected, `"${typo}" resolved to ${resolution.item.NAME}`);
  }
});

test("MM2 aliases resolve to the canonical weapon", () => {
  for (const [alias, expected] of [
    ["ib", "Icebreaker"],
    ["ip", "Icepiercer"],
    ["db", "Darkbringer"],
    ["tg", "Traveler's Gun"],
  ] as const) {
    const resolution = resolveMM2Item(alias, { gameId: "mm2" });
    assert.equal(resolution.status, "resolved", `alias "${alias}" did not resolve`);
    if (resolution.status !== "resolved") continue;
    assert.equal(resolution.item.NAME, expected);
  }
});

test("an ambiguous MM2 name asks instead of guessing", () => {
  // "Rainbow Gun" (GODLY, 420) and "Rainbow (Gun)" (RARE, 41) collapse to the
  // same normalized key. Picking one silently is a 10x pricing error.
  const resolution = resolveMM2Item("rainbowgun", { gameId: "mm2" });
  assert.equal(resolution.status, "ambiguous");
  if (resolution.status !== "ambiguous") return;
  assert.ok(resolution.candidates.length >= 2);

  const { response } = askMM2("rainbowgun value");
  assert.match(response.text, /which one|more than one/i);
  // A clarification must not also quote one of the candidate values.
  assert.doesNotMatch(response.text, /\b420\b/);
});

test("MM2 category words are never treated as weapon names", () => {
  for (const word of ["godly", "godlies", "chroma", "ancient"]) {
    const resolution = resolveMM2Item(word, { gameId: "mm2" });
    assert.equal(resolution.status, "notFound", `"${word}" was treated as an item`);
  }
});

// ---------------------------------------------------------------------------
// Deterministic MM2 answers
// ---------------------------------------------------------------------------

test("MM2 value, GCash and demand answers come from the catalog", () => {
  const harvester = mm2("Harvester");

  const supreme = askMM2("harvester value").response;
  assert.match(supreme.text, new RegExp(harvester.SOURCE_VALUE!.toLocaleString("en-US")));
  assert.equal(supreme.aiEligible, false);

  const gcash = askMM2("gcash value of harvester").response;
  assert.match(gcash.text, new RegExp(harvester.GCASH_VALUE!.toLocaleString("en-US")));
  assert.match(gcash.text, /GCash/);

  const demand = askMM2("demand of harvester").response;
  assert.match(demand.text, new RegExp(`${harvester.DEMAND}/10`));
});

test("a missing MM2 value is reported, never invented", () => {
  const unpriced = mm2Catalog.find((item) => item.SOURCE_VALUE === null && item.GCASH_VALUE === null);
  assert.ok(unpriced, "expected at least one fully unpriced MM2 weapon");

  const { response } = askMM2(`${unpriced.NAME} value`);
  assert.match(response.text, /no Supreme Value on record|N\/A|no value/i);
  // "0" must not appear as the answer.
  assert.doesNotMatch(response.text, /\bis \*\*0\*\*/);
});

test("MM2 comparison ranks deterministically and names the winner", () => {
  const { response } = askMM2("harvester vs icepiercer");
  const harvester = mm2("Harvester");
  const icepiercer = mm2("Icepiercer");
  const winner = (harvester.SOURCE_VALUE ?? 0) >= (icepiercer.SOURCE_VALUE ?? 0) ? harvester : icepiercer;

  assert.match(response.text, /Harvester/);
  assert.match(response.text, /Icepiercer/);
  assert.match(response.text, new RegExp(`\\*\\*${winner.NAME}\\*\\* is worth more`));
});

test("MM2 top-items search is deterministic and ordered", () => {
  const first = askMM2("top 5 godlies").response.text;
  const second = askMM2("top 5 godlies").response.text;
  assert.equal(first, second, "the same query must produce the same answer");

  const expected = mm2Catalog
    .filter((item) => item.CATEGORY === "GODLY" && typeof item.SOURCE_VALUE === "number")
    .sort((a, b) => (b.SOURCE_VALUE ?? 0) - (a.SOURCE_VALUE ?? 0) || a.NAME.localeCompare(b.NAME))
    .slice(0, 5);

  for (const item of expected) assert.match(first, new RegExp(item.NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("MM2 value-range search is deterministic", () => {
  const { response } = askMM2("weapons between 100 and 200");
  const analysis = analyzeMM2Message("weapons between 100 and 200");
  assert.equal(analysis.minValue, 100);
  assert.equal(analysis.maxValue, 200);

  for (const line of response.text.split("\n").slice(1)) {
    const match = /—\s([\d,]+)\s/.exec(line);
    if (!match) continue;
    const value = Number(match[1].replace(/,/g, ""));
    assert.ok(value >= 100 && value <= 200, `${line} is outside the requested range`);
  }
});

test("MM2 high-demand search only returns rated weapons", () => {
  const { response } = askMM2("high demand weapons");
  for (const line of response.text.split("\n")) {
    const match = /demand (\d+)\/10/.exec(line);
    if (!match) continue;
    assert.ok(Number(match[1]) >= 6, `${line} is below the requested demand`);
  }
});

// ---------------------------------------------------------------------------
// Follow-up intelligence
// ---------------------------------------------------------------------------

test("'what about gcash?' keeps the weapon from the previous turn", () => {
  const first = askMM2("harvester value");
  const second = askMM2("what about gcash?", first.context as MM2NichContext);

  const harvester = mm2("Harvester");
  assert.match(second.response.text, /Harvester/);
  assert.match(second.response.text, new RegExp(harvester.GCASH_VALUE!.toLocaleString("en-US")));
});

test("a comparison follow-up keeps both weapons in context", () => {
  const first = askMM2("harvester vs icepiercer");
  const context = first.context as MM2NichContext;
  assert.equal(context.comparisonItemIds?.length, 2);

  const second = askMM2("which has better demand?", context);
  assert.match(second.response.text, /Harvester/);
  assert.match(second.response.text, /Icepiercer/);
  assert.match(second.response.text, /demand/i);
});

// ---------------------------------------------------------------------------
// Deterministic W/F/L, shared with the MM2 calculator
// ---------------------------------------------------------------------------

test("MM2 NICH W/F/L matches the MM2 calculator exactly", () => {
  const cases: Array<[string, string]> = [
    ["Harvester", "Icebreaker"],
    ["Black Luger", "Batwing"],
    ["Icepiercer", "Icepiercer"],
    ["Chroma Evergun", "Chroma Evergreen"],
  ];

  for (const source of ["SUPREME", "GCASH"] as const) {
    for (const [yours, theirs] of cases) {
      const parse = parseMM2Trade(`my ${yours} for their ${theirs}`, { gameId: "mm2" });
      assert.equal(parse.complete, true, `failed to parse ${yours} for ${theirs}`);

      const nich = evaluateParsedMM2Trade(parse, { valueSource: source, gameId: "mm2" });

      // The calculator's own path, from the same shared module.
      const calculator = evaluateMM2Trade({
        yourItems: [{ id: "y", item: mm2(yours), quantity: 1 }],
        theirItems: [{ id: "t", item: mm2(theirs), quantity: 1 }],
        valueSource: source,
      });

      assert.equal(nich.verdict, calculator.verdict, `${yours} for ${theirs} (${source})`);
      assert.equal(nich.yourTotal, calculator.yourTotal);
      assert.equal(nich.theirTotal, calculator.theirTotal);

      // And the UI headline the calculator renders agrees with both.
      const ui = getMM2TradeResult(
        calculator.yourTotal,
        calculator.theirTotal,
        source,
        calculator.yourMissing + calculator.theirMissing,
      );
      assert.equal(ui.title, nich.verdict, `calculator UI disagreed for ${yours} for ${theirs}`);
    }
  }
});

test("quantities and multi-item sides are priced the same as the calculator", () => {
  const parse = parseMM2Trade("my 2 batwing and harvester for their icebreaker", { gameId: "mm2" });
  assert.equal(parse.complete, true);

  const nich = evaluateParsedMM2Trade(parse, { valueSource: "SUPREME", gameId: "mm2" });
  const expectedYours =
    (mm2ItemValue(mm2("Batwing"), "SUPREME") ?? 0) * 2 + (mm2ItemValue(mm2("Harvester"), "SUPREME") ?? 0);

  assert.equal(nich.yourTotal, expectedYours);
  assert.equal(nich.theirTotal, mm2ItemValue(mm2("Icebreaker"), "SUPREME") ?? 0);
});

test("a trade containing an unpriced weapon is CHECK, and quotes no total", () => {
  // 29 weapons are priced in GCash but have no Supreme value. Asking for the
  // source they lack must withhold the verdict, not fall back to the other one.
  const unpriced = mm2Catalog.find(
    (item) => item.SOURCE_VALUE === null && typeof item.GCASH_VALUE === "number",
  );
  assert.ok(unpriced, "expected a weapon priced in GCash but not Supreme");

  const parse = parseMM2Trade(`my ${unpriced.NAME} for their harvester`, { gameId: "mm2" });
  assert.equal(parse.complete, true, `failed to parse a trade for ${unpriced.NAME}`);

  const evaluation = evaluateParsedMM2Trade(parse, { valueSource: "SUPREME", gameId: "mm2" });
  assert.equal(evaluation.verdict, "CHECK");
  assert.equal(evaluation.difference, 0);
  assert.equal(evaluation.missingCount, 1);

  const { response } = askMM2(`wfl my ${unpriced.NAME} for their harvester`);
  assert.match(response.text, /CHECK/);
  assert.match(response.text, /does not estimate/i);
});

test("an unparseable trade produces no verdict at all", () => {
  const { response } = askMM2("my zzzzqqq for their harvester");
  assert.doesNotMatch(response.text, /\bWIN\b|\bLOSE\b|\bFAIR\b/);
  assert.match(response.text, /couldn't match/i);
});

test("the MM2 trade result links back to the real calculator", () => {
  const { response } = askMM2("my harvester for their icebreaker");
  assert.ok(response.navigation?.href.startsWith("/mm2/calculator?"));
  assert.match(response.navigation!.href, /source=SUPREME/);
});

// ---------------------------------------------------------------------------
// AI routing
// ---------------------------------------------------------------------------

test("catalog answers are marked local-only so no model is consulted", () => {
  for (const message of [
    "harvester value",
    "gcash value of icebreaker",
    "demand of batwing",
    "harvester vs icepiercer",
    "top 10 godlies",
    "my harvester for their icebreaker",
  ]) {
    const { response, handledLocally } = askMM2(message);
    assert.equal(handledLocally, true, `"${message}" should be answered locally`);
    assert.equal(response.aiEligible, false, `"${message}" must not be sent to a model`);
  }
});

test("an open-ended MM2 question is allowed to reach the AI fallback", () => {
  const { response, handledLocally } = askMM2(
    "what's your general strategy for building up to a godly over a few weeks?",
  );
  assert.equal(handledLocally, false);
  assert.equal(response.aiEligible, true);
});

test("MM2 ids are namespaced and never collide with Adopt Me ids", () => {
  for (const item of mm2Catalog.slice(0, 50)) {
    assert.ok(item.ID.startsWith("mm2-"), `${item.ID} is not MM2-namespaced`);
    assert.equal(getItem(item.ID), undefined, `${item.ID} also resolved in the Adopt Me catalog`);
  }
  assert.ok(getMM2ItemById(mm2("Harvester").ID));
});
