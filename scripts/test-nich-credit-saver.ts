import { routeNichMessage } from "../src/components/nich/assistant/brain/router";
import { findPetByName } from "../src/components/nich/assistant/tools/petSearch";
import { parseTradeMessage } from "../src/components/nich/assistant/tools/tradeComparison";
import { normalizeLocalChatMessage } from "../src/components/nich/assistant/brain/language";
import type { NichConversationContext } from "../src/components/nich/assistant/brain/types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function ask(message: string, context: NichConversationContext = {}) {
  return routeNichMessage({ message, context });
}

function tradeSignature(message: string) {
  const trade = parseTradeMessage(normalizeLocalChatMessage(message));
  if (!trade) return null;
  const side = (items: typeof trade.offerItems) => items.map((item) => `${item.code === "Normal" ? "" : item.code} ${item.petName}`.trim()).join(" + ");
  return `${side(trade.offerItems)} VS ${side(trade.requestItems)}`;
}

const tradeCases: Array<[string, RegExp]> = [
  ["WFL me mfr parrot him fr batdrag nfr kanga and fr cow", /^MFR Parrot VS FR Bat Dragon \+ NFR Kangaroo \+ FR Cow$/],
  ["wfl me:mfrparrot them:frbatdrag+nfrkanga+frcow", /^MFR Parrot VS FR Bat Dragon \+ NFR Kangaroo \+ FR Cow$/],
  ["mfrparrot vs frbatdrag nfrkanga frcow", /^MFR Parrot VS FR Bat Dragon \+ NFR Kangaroo \+ FR Cow$/],
  ["me mfrparrot | them frbatdrag nfrkanga frcow", /^MFR Parrot VS FR Bat Dragon \+ NFR Kangaroo \+ FR Cow$/],
  ["i give mfr parrot and get fr batdrag nfr kanga fr cow", /^MFR Parrot VS FR Bat Dragon \+ NFR Kangaroo \+ FR Cow$/],
  ["i get fr batdrag nfr kanga fr cow for my mfr parrot", /^MFR Parrot VS FR Bat Dragon \+ NFR Kangaroo \+ FR Cow$/],
  ["bigay ko mfr parrot kuha ko fr batdrag nfr kanga fr cow", /^MFR Parrot VS FR Bat Dragon \+ NFR Kangaroo \+ FR Cow$/],
  ["akin mfrparrot kanya frbatdrag nfrkanga frcow", /^MFR Parrot VS FR Bat Dragon \+ NFR Kangaroo \+ FR Cow$/],
  ["fdvsowl", /^Frost Dragon VS Owl$/],
  ["2xfrbatdrag vs 2x nfrkanga", /^FR Bat Dragon \+ FR Bat Dragon VS NFR Kangaroo \+ NFR Kangaroo$/],
  ["i get owl for my frost dragon", /^Frost Dragon VS Owl$/],
  ["they give owl for my frost dragon", /^Frost Dragon VS Owl$/],
  ["i got offered owl for my frost dragon", /^Frost Dragon VS Owl$/],
  ["someone offered me owl for frost dragon", /^Frost Dragon VS Owl$/],
  ["my frost dragon his owl", /^Frost Dragon VS Owl$/],
  ["i give frost dragon get owl", /^Frost Dragon VS Owl$/],
  ["frost dragon vs owl", /^Frost Dragon VS Owl$/],
  ["nfr kangaroo vs fr cow", /^NFR Kangaroo VS FR Cow$/],
];

for (const [message, expected] of tradeCases) {
  const signature = tradeSignature(message);
  assert(signature && expected.test(signature), `Trade parse failed: ${message}\nGot: ${signature}`);
}

// Routing is more expensive than direct parsing, so sample representative forms.
for (const [message] of [tradeCases[0], tradeCases[1], tradeCases[4], tradeCases[6], tradeCases[8]]) {
  const routed = ask(message);
  assert(routed.intent === "tradeComparison", `Expected local tradeComparison: ${message}; got ${routed.intent}`);
  assert(routed.aiEligible === false, `Trade should opt out of paid AI: ${message}`);
  assert((routed.localConfidence ?? 0) >= 0.9, `Trade should be high-confidence local: ${message}`);
}

const lookupCases: Array<[string, string]> = [
  ["batdrag", "Bat Dragon"],
  ["batdragn", "Bat Dragon"],
  ["frostdrag", "Frost Dragon"],
  ["shadowdrag", "Shadow Dragon"],
  ["arcticrein", "Arctic Reindeer"],
  ["evilunic", "Evil Unicorn"],
  ["albinomonk", "Albino Monkey"],
  ["monkking", "Monkey King"],
  ["kangroo", "Kangaroo"],
  ["parrrot", "Parrot"],
];

for (const [query, expectedName] of lookupCases) {
  assert(findPetByName(query)?.NAME === expectedName, `Alias/fuzzy lookup failed: ${query} -> ${findPetByName(query)?.NAME}`);
}

const routingLookupCases: Array<[string, string]> = [
  ["hmfd", "Frost Dragon"],
  ["froooost drag value", "Frost Dragon"],
  ["0wl value", "Owl"],
  ["frbatdrag", "Bat Dragon"],
  ["magkano batdrag", "Bat Dragon"],
];

for (const [message, expectedName] of routingLookupCases) {
  const routed = ask(message);
  assert(routed.intent === "petLookup", `Expected local pet lookup for ${message}; got ${routed.intent}`);
  assert(routed.aiEligible === false || (routed.localConfidence ?? 0) >= 0.9, `Lookup should not need paid AI: ${message}`);
  assert(routed.text.toLowerCase().includes(expectedName.toLowerCase()), `Lookup response missing ${expectedName}: ${message}`);
}

const adviceCases = [
  "what does high demand mean",
  "should i hold or trade frost dragon",
  "paano mag upgrade ng pets",
];

for (const message of adviceCases) {
  const routed = ask(message);
  assert(routed.intent === "tradeAdvice" || routed.intent === "petLookup", `Advice should stay local: ${message}; got ${routed.intent}`);
  assert(routed.aiEligible === false || (routed.localConfidence ?? 0) >= 0.9, `Advice should not silently use paid AI: ${message}`);
}

const compactFallbacks = [
  "wflme:mfrparrot them:frbatdrag nfrkanga frcow",
  "w/f/l me mfrparrot him frbatdrag nfrkanga frcow",
];

for (const message of compactFallbacks) {
  const routed = ask(message);
  assert(routed.intent !== "fallback", `Normal trader syntax should not fall back: ${message}`);
}

// Ambiguous/unknown trading text should fail safely and locally rather than require AI.
const unknownTrade = ask("wfl me mfr parrot them mysterydragon999 and cow");
assert(unknownTrade.aiEligible === false || (unknownTrade.localConfidence ?? 0) >= 0.9, "Unresolved trade should prefer local clarification over paid AI");

console.log("NICH Credit Saver local parsing tests passed.");
console.log(`Trade scenarios: ${tradeCases.length}`);
console.log(`Alias/fuzzy scenarios: ${lookupCases.length}`);
console.log(`Local lookup scenarios: ${routingLookupCases.length}`);
console.log(`Local advice scenarios: ${adviceCases.length}`);
