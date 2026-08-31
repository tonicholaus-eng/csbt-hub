/**
 * MM2 semantic vocabulary.
 *
 * This file is deliberately *not* a routing table. Nothing here maps a phrase
 * to an answer. Each entry contributes evidence for a **concept** — "the user
 * is talking about value", "the user is asking my opinion" — and the intent
 * layer weighs concepts against entities and conversation state to decide what
 * the message is actually for.
 *
 * The difference is visible in a message like "would you take that?", which
 * matches only OPINION and REFERENCE and contains no trade vocabulary at all.
 * A routing table has nothing to route it to. A concept model plus an active
 * trade in memory reads it correctly.
 *
 * Phrases are matched on the normalized message with word boundaries, so
 * "value" never fires on "valuable" and "add" never fires on "adds up" by
 * accident.
 */

export type MM2Concept =
  | "VALUE"
  | "DEMAND"
  | "LIQUIDITY"
  | "DETAILS"
  | "COMPARE"
  | "SUPERLATIVE"
  | "LIST"
  | "TRADE_STRUCTURE"
  | "TRADE_JUDGEMENT"
  | "ADDS"
  | "UPGRADE"
  | "DOWNGRADE"
  | "RECOMMEND"
  | "AFFORD"
  | "INVENTORY"
  | "TOTAL"
  | "MARKET"
  | "EXPLAIN"
  | "CHEAPER"
  | "QUANTITY_PREF";

/**
 * One concept's surface forms.
 *
 * `weight` is how strongly a hit argues for the concept being *present*, not
 * for any particular intent. Multi-word phrases outrank single words because
 * "easy to trade" is unambiguous where "easy" is not.
 */
type ConceptEntry = { phrases: readonly string[]; weight: number };

export const MM2_CONCEPT_LEXICON: Readonly<Record<MM2Concept, readonly ConceptEntry[]>> = Object.freeze({
  VALUE: [
    { phrases: ["how much is", "how much are", "how much for", "whats the value", "value of", "worth of", "price of", "going for"], weight: 1 },
    { phrases: ["value", "values", "worth", "price", "priced", "cost", "val", "magkano", "hm"], weight: 0.8 },
  ],
  DEMAND: [
    { phrases: ["demand", "in demand", "high demand", "low demand", "demanded"], weight: 1 },
    { phrases: ["popular", "popularity", "wanted", "sought after", "people want"], weight: 0.7 },
  ],
  LIQUIDITY: [
    { phrases: ["easy to trade", "easier to trade", "hard to trade", "harder to trade", "easy to sell", "easier to sell", "hard to sell", "easy to flip", "easier to flip", "easy to move", "easier to move", "hard to move", "harder to move", "moves faster", "moves fast", "quick trade", "quick to trade", "tradeable", "tradable", "liquid", "sits forever", "hard to get rid of", "in demand"], weight: 1 },
    { phrases: ["flip", "flippable", "offload", "retrade", "re trade"], weight: 0.6 },
  ],
  DETAILS: [
    { phrases: ["what category", "which category", "what rarity", "which rarity", "what type", "tell me about", "info on", "details on", "stats on", "profile"], weight: 1 },
  ],
  COMPARE: [
    { phrases: ["vs", "versus", "compare", "compared to", "comparison", "which one", "which is", "which has", "which should"], weight: 0.9 },
    // Bare "or" and "for" are far too common to carry a comparison or a trade on
    // their own; they only matter once two entities are on the table.
    { phrases: ["or"], weight: 0.35 },
    { phrases: ["better", "worse", "higher", "lower", "more than", "less than", "bigger", "smaller", "stronger", "weaker", "alin"], weight: 0.6 },
  ],
  SUPERLATIVE: [
    { phrases: ["best", "top", "highest", "most expensive", "priciest", "richest", "cheapest", "lowest", "worst", "least expensive"], weight: 1 },
  ],
  LIST: [
    { phrases: ["show me", "give me", "list", "what are", "which are", "options", "some options", "suggestions"], weight: 0.9 },
  ],
  TRADE_STRUCTURE: [
    { phrases: ["in exchange for", "swap", "swapping", "traded for", "trade for", "offered me", "offering me", "he offered", "she offered", "they offered", "he wants", "she wants", "they want", "wants my", "i give", "im giving", "i offer", "im offering", "my side", "their side", "his side", "her side"], weight: 0.9 },
    { phrases: ["for"], weight: 0.35 },
    { phrases: ["trade", "trades", "trading", "offer", "offers", "deal"], weight: 0.5 },
  ],
  TRADE_JUDGEMENT: [
    { phrases: ["wfl", "win fair lose", "is this a win", "is this a lose", "is this fair", "good trade", "bad trade", "worth it", "should i take", "should i accept", "should i do", "would you take", "would you do", "would you accept", "do i take", "am i winning", "am i losing", "am i cooked", "is this ass", "lowball", "lowballing", "getting scammed", "is that fair", "still fair", "accept this", "would people accept", "is it a w", "is it an l"], weight: 1.2 },
  ],
  ADDS: [
    { phrases: ["adds", "add", "adding", "throw in", "throws in", "sweeten", "how much more", "how much should he add", "how much should they add", "what should he add", "what should they add", "overpay", "underpay", "on top"], weight: 1 },
  ],
  UPGRADE: [
    { phrases: ["upgrade", "upgrade to", "upgrade into", "step up", "trade up", "move up", "something better"], weight: 1 },
  ],
  DOWNGRADE: [
    { phrases: ["downgrade", "downgrade to", "downgrade into", "trade down", "split into", "break down", "something smaller"], weight: 1 },
  ],
  RECOMMEND: [
    { phrases: ["what can i get", "what could i get", "what can i trade", "what can i afford", "what should i", "recommend", "suggest", "looking for", "lf", "i want something", "i need something", "something around", "something like", "something easier", "something better", "something cheaper", "something else", "what else", "give me something", "anything around", "what would you get"], weight: 1.2 },
  ],
  AFFORD: [
    { phrases: ["afford", "budget", "with my", "if i add", "plus my", "can i get"], weight: 0.8 },
  ],
  INVENTORY: [
    { phrases: ["i have", "i own", "i got", "ive got", "my items", "my weapons", "my inventory", "meron ako", "these are mine", "my stuff"], weight: 1 },
  ],
  TOTAL: [
    { phrases: ["total", "totals", "altogether", "all together", "combined", "sum", "add up", "adds up", "how much are all", "how much are these", "how much are those"], weight: 1 },
  ],
  MARKET: [
    { phrases: ["rising", "going up", "dropping", "going down", "crashing", "stable", "trend", "trending", "inflating", "deflating", "market"], weight: 1 },
  ],
  EXPLAIN: [
    { phrases: ["what does", "what is a", "what is an", "what means", "what do you mean", "explain", "how does", "how do i", "why is", "why does", "meaning of"], weight: 1 },
  ],
  CHEAPER: [
    { phrases: ["cheaper", "less expensive", "budget version", "affordable", "cheap"], weight: 1 },
  ],
  QUANTITY_PREF: [
    { phrases: ["fewer items", "less items", "one item", "single item", "more items", "multiple items", "a few items"], weight: 1 },
  ],
});

/**
 * MM2 trader shorthand that is *not* an item name.
 *
 * These are expanded before concept matching so "wfl" and "hm" reach the same
 * concepts their long forms do. Item shorthand ("harv", "ip") is deliberately
 * absent — that belongs to the resolver, which can check it against the
 * catalog; expanding it here would be guessing at an identity in a file that
 * has no way to verify one.
 */
export const MM2_SHORTHAND: Readonly<Record<string, string>> = Object.freeze({
  wfl: "win fair lose",
  hm: "how much",
  hmu: "how much",
  lf: "looking for",
  nlf: "not looking for",
  op: "overpay",
  ty: "thanks",
  u: "you",
  ur: "your",
  rn: "right now",
  atm: "right now",
  tho: "though",
  ngl: "honestly",
  imo: "in my opinion",
  tbh: "honestly",
  idk: "i dont know",
  pls: "please",
  plz: "please",
  wdyt: "what do you think",
  vs: "versus",
});

/** Expand shorthand tokens in a normalized message. Whole tokens only. */
export function expandMM2Shorthand(normalized: string): string {
  return normalized
    .split(" ")
    .map((token) => MM2_SHORTHAND[token] ?? token)
    .join(" ");
}

export type MM2ConceptHits = Map<MM2Concept, { score: number; matched: string[] }>;

function phrasePattern(phrase: string): RegExp {
  return new RegExp(`(?:^|\\s)${phrase.replace(/\s+/g, "\\s+")}(?=$|\\s)`);
}

const COMPILED: Array<{ concept: MM2Concept; phrase: string; weight: number; pattern: RegExp }> = Object.entries(
  MM2_CONCEPT_LEXICON,
).flatMap(([concept, entries]) =>
  entries.flatMap((entry) =>
    entry.phrases.map((phrase) => ({
      concept: concept as MM2Concept,
      phrase,
      weight: entry.weight,
      pattern: phrasePattern(phrase),
    })),
  ),
);

/**
 * Score every concept present in a message.
 *
 * `negatedSpans` come from the discourse layer; a phrase that only occurs
 * inside one is dropped rather than scored, which is what makes "don't compare
 * harvester" stop being a comparison request.
 */
export function detectMM2Concepts(normalized: string, negatedSpans: readonly string[] = []): MM2ConceptHits {
  const hits: MM2ConceptHits = new Map();
  const negated = negatedSpans.filter(Boolean);

  for (const entry of COMPILED) {
    if (!entry.pattern.test(normalized)) continue;

    // Present, but only inside a clause the user denied.
    const onlyNegated =
      negated.length > 0 &&
      negated.some((span) => entry.pattern.test(span)) &&
      !entry.pattern.test(stripSpans(normalized, negated));
    if (onlyNegated) continue;

    const current = hits.get(entry.concept) ?? { score: 0, matched: [] };
    current.score = Math.max(current.score, entry.weight);
    current.matched.push(entry.phrase);
    hits.set(entry.concept, current);
  }

  return hits;
}

function stripSpans(normalized: string, spans: readonly string[]): string {
  return spans
    .reduce((text, span) => text.split(span).join(" "), normalized)
    .replace(/\s+/g, " ")
    .trim();
}

export function conceptScore(hits: MM2ConceptHits, concept: MM2Concept): number {
  return hits.get(concept)?.score ?? 0;
}

export function hasConcept(hits: MM2ConceptHits, concept: MM2Concept): boolean {
  return conceptScore(hits, concept) > 0;
}
