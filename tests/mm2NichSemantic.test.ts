/**
 * MM2 NICH — semantic understanding.
 *
 * These tests are deliberately written the way people type, not the way the
 * parser would prefer. Every case here is a sentence that the previous
 * keyword-matched brain either misread or dropped, so the suite doubles as the
 * specification for what "understands conversations" means in MM2:
 *
 *   - the same question in five phrasings reaches the same answer
 *   - a follow-up keeps its subject without the user repeating it
 *   - a correction edits the conversation rather than starting a new one
 *   - a denial ("don't compare X") is not a request
 *   - and nothing, anywhere, invents a weapon or a number
 *
 * Values are read from the catalog inside the test rather than hard-coded, so
 * a data refresh cannot silently turn a passing assertion into a false one.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { routeNichForGame } from "../src/lib/nich/gameRouter";
import { createMM2Context, sanitizeMM2Context, type MM2NichContext } from "../src/lib/nich/mm2/context";
import { interpretMM2Message, type MM2UserIntent } from "../src/lib/nich/mm2/semantic";
import { scanMM2Entities } from "../src/lib/nich/mm2/entities";
import { resolveMM2Item } from "../src/lib/nich/mm2/resolver";
import { normalizeText } from "../src/lib/nich/core/text";
import { analyzeDiscourse } from "../src/lib/nich/core/discourse";
import {
  buildMM2TradeFacts,
  mm2AddNeededForFair,
  narrateMM2Trade,
} from "../src/lib/nich/mm2/tradeReasoning";
import {
  groundMM2SemanticParse,
  parseMM2SemanticJSON,
  rewriteMM2MessageFromParse,
} from "../src/lib/nich/mm2/aiSemantic";
import { routeMM2NichMessageWithModel } from "../src/lib/nich/mm2/brain";
import { mm2Catalog, type MM2CatalogItem } from "../src/lib/mm2/catalog";
import { mm2ItemValue } from "../src/lib/mm2/tradeMath";
import { isMM2ResponseMeta } from "../src/lib/nich/responseMeta";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mm2(name: string): MM2CatalogItem {
  const item = mm2Catalog.find((row) => row.NAME === name);
  assert.ok(item, `MM2 fixture "${name}" is missing from the catalog`);
  return item;
}

function ask(message: string, context: MM2NichContext = createMM2Context()) {
  const result = routeNichForGame({ gameId: "mm2", message, context });
  return {
    text: result.response.text,
    context: result.context as MM2NichContext,
    handledLocally: result.handledLocally,
    meta: isMM2ResponseMeta(result.response.meta) ? result.response.meta : undefined,
  };
}

/** Run a whole conversation, returning every turn. */
function conversation(messages: string[]) {
  let context = createMM2Context();
  return messages.map((message) => {
    const turn = ask(message, context);
    context = turn.context;
    return turn;
  });
}

function intentOf(message: string, context: MM2NichContext = createMM2Context()): MM2UserIntent {
  return interpretMM2Message(message, { gameId: "mm2", context }).primaryIntent;
}

function entitiesIn(message: string): string[] {
  return scanMM2Entities(normalizeText(message), { gameId: "mm2" }).entities.map((entity) => entity.item.NAME);
}

const HARVESTER = mm2("Harvester");
const ICEPIERCER = mm2("Icepiercer");
const CORRUPT = mm2("Corrupt");
const BATWING = mm2("Batwing");
const ICEBREAKER = mm2("Icebreaker");

function supreme(item: MM2CatalogItem): string {
  const value = mm2ItemValue(item, "SUPREME");
  assert.ok(value !== null, `${item.NAME} has no Supreme value; pick another fixture`);
  return value.toLocaleString("en-US");
}

// ---------------------------------------------------------------------------
// 1 — the same question, said five ways
// ---------------------------------------------------------------------------

test("a value question is understood however it is phrased", () => {
  const phrasings = [
    "harvester value",
    "how much is harv",
    "whats harvester worth rn",
    "hm harvester",
    "magkano ang harvester",
    "price of harvester pls",
  ];

  for (const message of phrasings) {
    const { text, handledLocally } = ask(message);
    assert.equal(handledLocally, true, `"${message}" was not answered locally`);
    assert.match(text, /Harvester/, `"${message}" lost the weapon`);
    assert.match(text, new RegExp(supreme(HARVESTER)), `"${message}" lost the value`);
  }
});

test("demand and tradeability questions are read as demand, not value", () => {
  for (const message of ["harvester demand", "is harv easy to trade", "does harvester have good demand"]) {
    const { text } = ask(message);
    assert.match(text, /Harvester/);
    assert.match(text, /demand/i, `"${message}" did not answer about demand`);
  }
});

test("an implied question with no question mark is still a question", () => {
  const priced = ask(`harvester ${Number(supreme(HARVESTER).replace(/,/g, "")) * 4}?`);
  assert.match(priced.text, /Harvester/);
  assert.match(priced.text, /above\*\* the catalog/i, "a floated price should be compared to the real one");

  assert.equal(intentOf("need something around 800"), "recommend_item");
  assert.equal(intentOf("looking for easy trades"), "recommend_item");
});

// ---------------------------------------------------------------------------
// 2 — entity resolution
// ---------------------------------------------------------------------------

test("shorthand, spacing, casing and typos all reach the same weapon", () => {
  const forms = ["harv", "HARV", "Harvester", "harvster", "harvestor"];
  for (const form of forms) {
    const resolution = resolveMM2Item(form, { gameId: "mm2" });
    assert.equal(resolution.status, "resolved", `"${form}" did not resolve`);
    if (resolution.status === "resolved") assert.equal(resolution.item.ID, HARVESTER.ID, `"${form}" resolved elsewhere`);
  }

  for (const form of ["ice piercer", "icepiercer", "icepicer", "ip"]) {
    const resolution = resolveMM2Item(form, { gameId: "mm2" });
    assert.equal(resolution.status, "resolved", `"${form}" did not resolve`);
    if (resolution.status === "resolved") assert.equal(resolution.item.ID, ICEPIERCER.ID);
  }
});

test("initials resolve only when they are unambiguous", () => {
  const acronym = resolveMM2Item("cf", { gameId: "mm2" });
  assert.equal(acronym.status, "resolved");
  if (acronym.status === "resolved") assert.equal(acronym.item.NAME, "Chroma Fang");
});

test("weapons are found anywhere in a sentence, not just after a keyword", () => {
  assert.deepEqual(entitiesIn("bro he wants my harv for his corrupt"), ["Harvester", "Corrupt"]);
  assert.deepEqual(entitiesIn("he offered corrupt and batwing for my harvester"), ["Corrupt", "Batwing", "Harvester"]);
});

test("quantities are read from the sentence", () => {
  const scan = scanMM2Entities(normalizeText("i have 2 icebreakers and a batwing"), { gameId: "mm2" });
  const icebreaker = scan.entities.find((entity) => entity.item.ID === ICEBREAKER.ID);
  assert.equal(icebreaker?.quantity, 2);
});

test("an everyday word is only a weapon when the sentence treats it like one", () => {
  // "Saw" is a real MM2 weapon. "i saw his offer" is not about it.
  assert.deepEqual(entitiesIn("i saw his offer"), []);
  assert.ok(entitiesIn("my saw value").includes("Saw"));
});

test("a name the catalog does not have is reported, never approximated", () => {
  const { text } = ask("frost dragon value");
  assert.match(text, /couldn't find/i);
  assert.match(text, /frost dragon/i, "the whole attempted name should be echoed back");
  assert.doesNotMatch(text, /Supreme Value: \d/, "no weapon's figures should be attached to a miss");
});

test("a miss mid-conversation is still a miss, not the previous weapon", () => {
  const [, missed, followUp] = conversation(["harvester value", "frost dragon value", "what about demand"]);

  assert.match(missed.text, /couldn't find/i);
  assert.doesNotMatch(missed.text, new RegExp(supreme(HARVESTER)), "the last weapon's value must not answer a new name");
  // …and the failed lookup must not have replaced what we were discussing.
  assert.match(followUp.text, /Harvester/);
});

test("an ambiguous name asks instead of picking", () => {
  const { meta } = ask("rainbowgun value");
  assert.equal(meta?.structured?.kind, "clarify");

  const short = ask("what about icep");
  assert.equal(short.meta?.structured?.kind, "clarify", "a prefix matching several weapons must ask");
});

// ---------------------------------------------------------------------------
// 3 — conversation memory
// ---------------------------------------------------------------------------

test("a follow-up keeps the weapon without it being repeated", () => {
  const [, gcash, demand] = conversation(["how much is harvester", "what about gcash", "and demand?"]);

  assert.match(gcash.text, /Harvester/);
  assert.match(gcash.text, /GCash/);
  assert.match(demand.text, /Harvester/);
  assert.match(demand.text, /demand/i);
});

test("a pronoun points at the weapon in hand", () => {
  const [, compared] = conversation(["harvester value", "compare it to icepiercer"]);
  assert.match(compared.text, /Harvester/);
  assert.match(compared.text, /Icepiercer/);
});

test("a metric follow-up after a comparison keeps both weapons", () => {
  const [, demand] = conversation(["harvester vs icepiercer", "what about demand tho"]);
  assert.match(demand.text, /Harvester/);
  assert.match(demand.text, /Icepiercer/);
  assert.match(demand.text, /\d+\/10/);
});

test("an ordinal points into the list NICH just offered", () => {
  const [listed, picked] = conversation(["give me something around 1k", "the first one"]);

  const rows = listed.meta?.structured?.kind === "catalog" ? listed.meta.structured.rows : [];
  assert.ok(rows.length >= 2, "the first turn should have produced a list");
  assert.match(picked.text, new RegExp(rows[0].name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("conversation state survives the sanitizer, ids and all", () => {
  const [, second] = conversation(["harvester vs icepiercer", "which has better demand"]);
  const restored = sanitizeMM2Context(JSON.parse(JSON.stringify(second.context)));

  assert.equal(restored.gameId, "mm2");
  assert.equal(restored.comparisonItemIds?.length, 2);
  assert.ok(restored.lastSemanticIntent, "the semantic intent should persist for follow-ups");
});

// ---------------------------------------------------------------------------
// 4 — corrections
// ---------------------------------------------------------------------------

test("a correction replaces the subject and re-runs the same question", () => {
  const [first, corrected] = conversation(["icebreaker value", "nah i meant icepiercer"]);

  assert.match(first.text, /Icebreaker/);
  assert.match(corrected.text, /Icepiercer/);
  assert.match(corrected.text, new RegExp(supreme(ICEPIERCER)));
  assert.doesNotMatch(corrected.text, /Icebreaker/, "the corrected weapon should be gone");
});

test("the \"not X, Y\" form is a correction too", () => {
  const discourse = analyzeDiscourse("not laser, luger");
  assert.ok(discourse.correction, "the correction was not detected");
  assert.equal(discourse.correction?.replacement, "luger");
  assert.equal(discourse.correction?.rejected, "laser");
});

// ---------------------------------------------------------------------------
// 5 — trades
// ---------------------------------------------------------------------------

test("trade sides are read from possessives, not from word order", () => {
  const interpretation = interpretMM2Message("he offered corrupt and batwing for my harvester", {
    gameId: "mm2",
    context: createMM2Context(),
  });

  assert.ok(interpretation.trade?.complete);
  assert.deepEqual(interpretation.trade?.yours.entities.map((entity) => entity.item.NAME), ["Harvester"]);
  assert.deepEqual(interpretation.trade?.theirs.entities.map((entity) => entity.item.NAME), ["Corrupt", "Batwing"]);
});

test("casual trade phrasings all produce a verdict", () => {
  for (const message of [
    "my harv for his corrupt",
    "bro he wants my harv for his corrupt would u",
    "wfl my harvester for their corrupt",
    "should i trade harvester for corrupt",
  ]) {
    const { meta } = ask(message);
    assert.equal(meta?.structured?.kind, "trade", `"${message}" did not produce a trade`);
  }
});

test("a numeric add is counted as value on the side that offered it", () => {
  const { meta, text } = ask("harv for corrupt + 200");
  assert.equal(meta?.structured?.kind, "trade");
  if (meta?.structured?.kind !== "trade") return;

  const corrupt = mm2ItemValue(CORRUPT, "SUPREME") ?? 0;
  assert.equal(meta.structured.theirTotal, corrupt + 200);
  assert.match(text, /adds — 200/);
});

test("the verdict still matches the calculator, adds included", () => {
  const facts = buildMM2TradeFacts({
    yours: [{ item: HARVESTER, quantity: 1 }],
    theirs: [{ item: ICEBREAKER, quantity: 1 }],
    theirAdds: 100,
    source: "SUPREME",
  });

  const yours = mm2ItemValue(HARVESTER, "SUPREME") ?? 0;
  const theirs = (mm2ItemValue(ICEBREAKER, "SUPREME") ?? 0) + 100;
  assert.equal(facts.yours.total, yours);
  assert.equal(facts.theirs.total, theirs);

  const gap = Math.abs(theirs - yours);
  const percent = (gap / Math.max(yours, theirs, 1)) * 100;
  const expected = percent <= 5 ? "FAIR" : theirs > yours ? "WIN" : "LOSE";
  assert.equal(facts.evaluation.verdict, expected);
});

test("an unpriced weapon still withholds the verdict, adds or not", () => {
  const unpriced = mm2Catalog.find((item) => item.SOURCE_VALUE === null && typeof item.GCASH_VALUE === "number");
  assert.ok(unpriced);

  const facts = buildMM2TradeFacts({
    yours: [{ item: unpriced, quantity: 1 }],
    theirs: [{ item: HARVESTER, quantity: 1 }],
    theirAdds: 5_000,
    source: "SUPREME",
  });

  assert.equal(facts.evaluation.verdict, "CHECK");
  assert.equal(facts.tier, "unpriced");
  assert.match(narrateMM2Trade(facts), /does not estimate/i);
});

test("a trade is judged on more than the number", () => {
  const facts = buildMM2TradeFacts({
    yours: [{ item: HARVESTER, quantity: 1 }],
    theirs: [
      { item: ICEBREAKER, quantity: 1 },
      { item: BATWING, quantity: 1 },
      { item: ICEPIERCER, quantity: 1 },
    ],
    source: "SUPREME",
  });

  assert.equal(facts.splittingUp, true, "one weapon for three is a split");
  assert.match(narrateMM2Trade(facts), /harder to trade back out of/i);
});

test("demand differences are reported from the catalog, never invented", () => {
  const facts = buildMM2TradeFacts({
    yours: [{ item: HARVESTER, quantity: 1 }],
    theirs: [{ item: CORRUPT, quantity: 1 }],
    source: "SUPREME",
  });

  const yourDemand = HARVESTER.DEMAND;
  const theirDemand = CORRUPT.DEMAND;
  assert.equal(typeof yourDemand, "number");
  assert.equal(typeof theirDemand, "number");
  assert.equal(facts.demandSwing, Number(((theirDemand as number) - (yourDemand as number)).toFixed(2)));
});

test("a trade can be edited by talking about it", () => {
  const [, removed] = conversation(["my harvester for their corrupt and batwing", "what if they remove batwing"]);

  assert.equal(removed.meta?.structured?.kind, "trade");
  if (removed.meta?.structured?.kind !== "trade") return;
  assert.deepEqual(removed.meta.structured.theirs.map((row) => row.name), ["Corrupt"]);
});

test("an opinion question with a trade on the table answers the trade", () => {
  const [, opinion] = conversation(["my harvester for their corrupt", "would u"]);
  assert.equal(opinion.handledLocally, true);
  assert.match(opinion.text, /Harvester|Corrupt|win|lose|fair/i);
});

test("how much should they add is answered from the gap", () => {
  const facts = buildMM2TradeFacts({
    yours: [{ item: HARVESTER, quantity: 1 }],
    theirs: [{ item: ICEBREAKER, quantity: 1 }],
    source: "SUPREME",
  });

  const gap = mm2AddNeededForFair(facts);
  assert.ok(gap, "a lopsided trade should have an add figure");
  assert.equal(gap?.side, "theirs");

  const yours = mm2ItemValue(HARVESTER, "SUPREME") ?? 0;
  const theirs = mm2ItemValue(ICEBREAKER, "SUPREME") ?? 0;
  // Adding the quoted amount must actually land inside the fair threshold.
  const afterwards = Math.abs(yours - (theirs + (gap?.amount ?? 0))) / Math.max(yours, theirs + (gap?.amount ?? 0), 1);
  assert.ok(afterwards <= 0.05, "the quoted add should reach fair, not merely approach it");
});

test("an unreadable name inside a trade blocks the verdict", () => {
  const { text } = ask("my zzzzqqq for their harvester");
  assert.match(text, /couldn't match/i);
  assert.doesNotMatch(text, /\bWIN\b|\bLOSE\b|\bFAIR\b/);
});

// ---------------------------------------------------------------------------
// 6 — recommendations and inventory
// ---------------------------------------------------------------------------

test("value ranges are understood in the language people use", () => {
  const around = ask("give me something around 1k");
  assert.equal(around.meta?.structured?.kind, "catalog");
  if (around.meta?.structured?.kind === "catalog") {
    for (const row of around.meta.structured.rows) {
      assert.ok(row.supreme !== null && row.supreme >= 700 && row.supreme <= 1_300, `${row.name} is not around 1k`);
    }
  }

  const under = ask("weapons under 100");
  if (under.meta?.structured?.kind === "catalog") {
    for (const row of under.meta.structured.rows) {
      assert.ok(row.supreme !== null && row.supreme <= 100, `${row.name} is over the ceiling`);
    }
  }
});

test("\"something like X but cheaper\" stays in X's category and below its value", () => {
  const { meta } = ask("something like harvester but cheaper");
  assert.equal(meta?.structured?.kind, "catalog");
  if (meta?.structured?.kind !== "catalog") return;

  const anchor = mm2ItemValue(HARVESTER, "SUPREME") ?? 0;
  for (const row of meta.structured.rows) {
    assert.equal(row.category, HARVESTER.CATEGORY);
    assert.ok(row.supreme !== null && row.supreme < anchor, `${row.name} is not cheaper`);
  }
});

test("upgrade targets are above the anchor and not absurdly above it", () => {
  const { meta } = ask("what should i upgrade harvester into");
  assert.equal(meta?.structured?.kind, "catalog");
  if (meta?.structured?.kind !== "catalog") return;

  const anchor = mm2ItemValue(HARVESTER, "SUPREME") ?? 0;
  for (const row of meta.structured.rows) {
    assert.ok(row.supreme !== null && row.supreme > anchor, `${row.name} is not an upgrade`);
    assert.ok((row.supreme ?? 0) <= anchor * 2.5, `${row.name} is out of reach, not an upgrade`);
  }
});

test("a listed inventory is totalled with its quantities and reused later", () => {
  const [listed, total, options] = conversation([
    "i have 2 icebreakers and a batwing",
    "how much are those together",
    "what can i get for all of them",
  ]);

  const expected = (mm2ItemValue(ICEBREAKER, "SUPREME") ?? 0) * 2 + (mm2ItemValue(BATWING, "SUPREME") ?? 0);
  assert.match(listed.text, new RegExp(expected.toLocaleString("en-US")));
  assert.match(total.text, new RegExp(expected.toLocaleString("en-US")), "the total must survive the follow-up");
  assert.equal(options.meta?.structured?.kind, "catalog");
});

test("a demand ranking never includes an unrated weapon", () => {
  const { meta } = ask("high demand weapons");
  assert.equal(meta?.structured?.kind, "catalog");
  if (meta?.structured?.kind !== "catalog") return;

  for (const row of meta.structured.rows) {
    assert.ok(row.demand !== null && row.demand >= 6, `${row.name} is not high demand`);
  }
});

test("an empty demand-filtered range says so rather than inventing a match", () => {
  const { text, meta } = ask("best demand around 300");
  if (meta?.structured?.kind === "catalog" && meta.structured.rows.length) {
    assert.match(text, /Nothing around|demand/i);
  }
  assert.doesNotMatch(text, /estimated|approximately worth/i);
});

// ---------------------------------------------------------------------------
// 7 — adversarial: negation, hypotheticals, hearsay
// ---------------------------------------------------------------------------

test("a denial is not a request", () => {
  const { handledLocally, text } = ask("dont compare harvester");
  assert.equal(handledLocally, false, "a negated comparison must not run");
  assert.doesNotMatch(text, /is worth more/);
});

test("a hearsay number never becomes the catalog value", () => {
  const { text } = ask("someone said harvester is 5k lol");
  assert.match(text, new RegExp(supreme(HARVESTER)), "the real value must still be quoted");
  assert.match(text, /off:/i, "hearsay should be contradicted, not adopted");
});

test("a floated price is compared, not stored", () => {
  const [floated, followUp] = conversation(["harvester 950?", "value"]);
  assert.match(floated.text, new RegExp(supreme(HARVESTER)));
  assert.match(followUp.text, new RegExp(supreme(HARVESTER)), "the catalog value must be unchanged next turn");
  assert.doesNotMatch(followUp.text, /\b950\b/);
});

test("a past possession is not an inventory", () => {
  const interpretation = interpretMM2Message("i used to have icepiercer", {
    gameId: "mm2",
    context: createMM2Context(),
  });
  assert.equal(interpretation.discourse.isPastTense, true);
  assert.equal(interpretation.declaresInventory, false);
});

test("a hypothetical is recognised as one", () => {
  const interpretation = interpretMM2Message("if i had corrupt would that be better", {
    gameId: "mm2",
    context: createMM2Context(),
  });
  assert.equal(interpretation.discourse.isHypothetical, true);
});

test("negated clauses drop the weapons inside them", () => {
  const interpretation = interpretMM2Message("harvester value, not corrupt", {
    gameId: "mm2",
    context: createMM2Context(),
  });
  const targets = interpretation.targets.map((item) => item.NAME);
  assert.ok(targets.includes("Harvester"));
  assert.ok(!targets.includes("Corrupt"), "a denied weapon should not be a target");
});

test("a chroma that does not exist is refused, not invented", () => {
  const [, variant] = conversation(["harvester value", "what if mine is chroma"]);
  assert.match(variant.text, /no Chroma Harvester/i);
  assert.doesNotMatch(variant.text, /Supreme Value: \d/);
});

// ---------------------------------------------------------------------------
// 8 — the boundary: no fabrication anywhere
// ---------------------------------------------------------------------------

test("every weapon NICH names exists in the catalog", () => {
  const names = new Set(mm2Catalog.map((item) => item.NAME));

  const messages = [
    "harvester value",
    "harvester vs icepiercer",
    "top 10 godlies",
    "my harvester for their corrupt and batwing",
    "something around 500",
    "high demand weapons",
    "what should i upgrade harvester into",
  ];

  for (const message of messages) {
    const { meta } = ask(message);
    const structured = meta?.structured;
    if (!structured) continue;

    const named =
      structured.kind === "catalog"
        ? structured.rows.map((row) => row.name)
        : structured.kind === "comparison"
          ? structured.items.map((item) => item.name)
          : structured.kind === "trade"
            ? [...structured.yours, ...structured.theirs].map((row) => row.name)
            : structured.kind === "item"
              ? [structured.item.name]
              : structured.candidates.map((candidate) => candidate.name);

    for (const name of named) assert.ok(names.has(name), `"${message}" produced a weapon that does not exist: ${name}`);
  }
});

test("a weapon with no value in the asked-for source is reported as missing", () => {
  const unpriced = mm2Catalog.find((item) => item.SOURCE_VALUE === null && typeof item.GCASH_VALUE === "number");
  assert.ok(unpriced);

  const { text, meta } = ask(`${unpriced.NAME} value`);
  assert.match(text, /no Supreme Value on record/i);
  if (meta?.structured?.kind === "item") assert.equal(meta.structured.item.supreme, null);
});

test("market questions admit there is no MM2 price history", () => {
  const [, market] = conversation(["harvester value", "is it going up"]);
  assert.match(market.text, /doesn't track price movement|no history feed/i);
});

// ---------------------------------------------------------------------------
// 9 — the AI semantic fallback is parsed, grounded and re-run locally
// ---------------------------------------------------------------------------

test("model output is parsed defensively", () => {
  assert.equal(parseMM2SemanticJSON("not json at all"), null);
  assert.equal(parseMM2SemanticJSON(""), null);

  const fenced = parseMM2SemanticJSON('```json\n{"intent":"item_value","subjects":["harv"]}\n```');
  assert.equal(fenced?.intent, "item_value");
  assert.deepEqual(fenced?.subjects, ["harv"]);

  const bogusIntent = parseMM2SemanticJSON('{"intent":"steal_items","subjects":[]}');
  assert.equal(bogusIntent?.intent, "unknown", "an unknown intent must not be passed through");
});

test("a weapon the model invents is rejected, not quoted", () => {
  const parse = parseMM2SemanticJSON('{"intent":"item_value","subjects":["Chroma Harvester","harv"]}');
  assert.ok(parse);

  const grounded = groundMM2SemanticParse(parse, { gameId: "mm2", context: createMM2Context() });
  assert.deepEqual(grounded.subjects.map((item) => item.NAME), ["Harvester"]);
  assert.deepEqual(grounded.rejected, ["Chroma Harvester"]);
});

test("a grounded parse becomes a plain message the local brain can answer", () => {
  const parse = parseMM2SemanticJSON('{"intent":"trade_wfl","yours":["harv"],"theirs":["corrupt"],"subjects":[]}');
  assert.ok(parse);

  const grounded = groundMM2SemanticParse(parse, { gameId: "mm2", context: createMM2Context() });
  const rewritten = rewriteMM2MessageFromParse(grounded);
  assert.equal(rewritten, "wfl my Harvester for their Corrupt");

  const { meta } = ask(rewritten ?? "");
  assert.equal(meta?.structured?.kind, "trade");
});

test("the smart path answers with local data and says the AI was involved", async () => {
  const result = await routeMM2NichMessageWithModel(
    {
      gameId: "mm2",
      // Nothing here resolves locally: no weapon name, no trade shape, no
      // metric. This is exactly the tail the semantic fallback exists for.
      message: "my mate reckons hoarding is better than flipping, thoughts",
      context: createMM2Context(),
    },
    async () => '{"intent":"compare_items","yours":[],"theirs":[],"subjects":["harvester","icepiercer"]}',
  );

  assert.ok(result, "the smart path should have produced an answer");
  assert.match(result.response.text, /Harvester/);
  assert.match(result.response.text, new RegExp(supreme(HARVESTER)));

  const meta = isMM2ResponseMeta(result.response.meta) ? result.response.meta : undefined;
  assert.ok(meta?.sources.includes("NICH AI"), "provenance must record that a model read the question");
});

test("the smart path never runs when the local brain already answered", async () => {
  let called = false;
  const result = await routeMM2NichMessageWithModel(
    { gameId: "mm2", message: "harvester value", context: createMM2Context() },
    async () => {
      called = true;
      return null;
    },
  );

  assert.equal(called, false, "a message the catalog answers must never cost a model call");
  assert.match(result?.response.text ?? "", new RegExp(supreme(HARVESTER)));
});

test("a model failure degrades to the ordinary decline", async () => {
  const result = await routeMM2NichMessageWithModel(
    { gameId: "mm2", message: "what is your long term outlook on the mm2 economy", context: createMM2Context() },
    async () => {
      throw new Error("provider down");
    },
  );

  assert.equal(result, null, "a provider failure must not produce an answer");
});

// ---------------------------------------------------------------------------
// 10 — the debug trace
// ---------------------------------------------------------------------------

test("a development answer carries the interpretation that produced it", () => {
  const { meta } = ask("bro he wants my harv for his corrupt");
  assert.ok(meta?.debug, "the debug trace should be attached outside production");
  assert.equal(meta?.debug?.intent, "trade_wfl");
  assert.deepEqual(meta?.debug?.trade?.yours, ["Harvester"]);
  assert.deepEqual(meta?.debug?.trade?.theirs, ["Corrupt"]);
  assert.ok((meta?.debug?.why.length ?? 0) > 0, "the trace should say why the intent won");
});

// ---------------------------------------------------------------------------
// 11 — parity with Adopt Me's conversational abilities
// ---------------------------------------------------------------------------

test("MM2 handles the generic conversational moves Adopt Me handles", () => {
  const moves: Array<[string, (turn: ReturnType<typeof ask>) => void]> = [
    ["hey", (turn) => assert.match(turn.text, /Nich/i)],
    ["what can you do", (turn) => assert.match(turn.text, /Values/i)],
    ["thanks", (turn) => assert.match(turn.text, /Anytime/i)],
  ];

  for (const [message, check] of moves) {
    const turn = ask(message);
    assert.equal(turn.handledLocally, true, `"${message}" fell through to the model`);
    check(turn);
  }
});

test("a genuinely open-ended question is still handed to the model", () => {
  const { handledLocally } = ask("whats your general strategy for building up to a godly over a few weeks?");
  assert.equal(handledLocally, false);
});
