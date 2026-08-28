import { routeNichMessage } from "../src/components/nich/assistant/brain/router";
import { findPetByName } from "../src/components/nich/assistant/tools/petSearch";
import { parseTradeMessage } from "../src/components/nich/assistant/tools/tradeComparison";
import { normalizeLocalChatMessage } from "../src/components/nich/assistant/brain/language";
import type { NichConversationContext } from "../src/components/nich/assistant/brain/types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function ask(message: string, context: NichConversationContext = {}) {
  return routeNichMessage({ gameId: "adopt-me", message, context });
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
  ["me frost dragon and them balloon uni + cow", /^Frost Dragon VS Balloon Unicorn \+ Cow$/],
  ["me frost drag and turtle and them balloon uni and cow", /^Frost Dragon \+ Turtle VS Balloon Unicorn \+ Cow$/],
  ["i give frost drag and turtle and they give balloon uni and cow", /^Frost Dragon \+ Turtle VS Balloon Unicorn \+ Cow$/],
  ["i have frost dragon and they have balloon uni", /^Frost Dragon VS Balloon Unicorn$/],
  ["wfl me nfrballoonuni and cow them frfrostdrag and turtle", /^NFR Balloon Unicorn \+ Cow VS FR Frost Dragon \+ Turtle$/],
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
  ["balloon uni", "Balloon Unicorn"],
  ["ball uni", "Balloon Unicorn"],
  ["diamond uni", "Diamond Unicorn"],
  ["gold uni", "Golden Unicorn"],
  ["frost uni", "Frost Unicorn"],
  ["nfrballoonuni", "Balloon Unicorn"],
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
  ["shark puppy gcash", "Shark Puppy"],
  ["shark puppy gcash value", "Shark Puppy"],
  ["shark puppy elve", "Shark Puppy"],
  ["balloon uni", "Balloon Unicorn"],
  ["balloon uni gcash", "Balloon Unicorn"],
  ["nfr balloon uni value", "Balloon Unicorn"],
  ["gold uni value", "Golden Unicorn"],
];

for (const [message, expectedName] of routingLookupCases) {
  const routed = ask(message);
  assert(routed.intent === "petLookup", `Expected local pet lookup for ${message}; got ${routed.intent}`);
  assert(routed.aiEligible === false || (routed.localConfidence ?? 0) >= 0.9, `Lookup should not need paid AI: ${message}`);
  assert(routed.text.toLowerCase().includes(expectedName.toLowerCase()), `Lookup response missing ${expectedName}: ${message}`);
}

const sharkPuppyGcash = ask("shark puppy gcash");
assert(/Shark Puppy/i.test(sharkPuppyGcash.text), "Shark Puppy GCash lookup must resolve the exact pet, not generic puppy matches.");
assert(/Normal:\s*180(?:\b|\.)/i.test(sharkPuppyGcash.text), `Expected Shark Puppy GCash normal value 180; got: ${sharkPuppyGcash.text}`);
const sharkPuppyElve = ask("shark puppy elve");
assert(/Shark Puppy/i.test(sharkPuppyElve.text), "Shark Puppy Elve lookup must resolve the exact pet.");
assert(/Normal:\s*12\.5\b/i.test(sharkPuppyElve.text), `Expected Shark Puppy Elve normal value 12.5; got: ${sharkPuppyElve.text}`);

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

const vagueAddsTrade = ask("me frost dragon and them balloon uni + other pets");
assert(vagueAddsTrade.intent === "tradeComparison", "Vague adds should still understand the trade structure locally");
assert(vagueAddsTrade.aiEligible === false, "Vague adds clarification must not spend paid AI");
assert(/Frost Dragon/i.test(vagueAddsTrade.text), "Vague adds clarification should retain Frost Dragon");
assert(/Balloon Unicorn/i.test(vagueAddsTrade.text), "Vague adds clarification should resolve Balloon Uni to Balloon Unicorn");
assert(/other pets/i.test(vagueAddsTrade.text) && /actual pet|missing item/i.test(vagueAddsTrade.text), "Vague adds should request the missing pet names instead of calculating a partial WFL");

console.log("NICH Credit Saver local parsing tests passed.");
console.log(`Trade scenarios: ${tradeCases.length}`);
console.log(`Alias/fuzzy scenarios: ${lookupCases.length}`);
console.log(`Local lookup scenarios: ${routingLookupCases.length}`);
console.log(`Local advice scenarios: ${adviceCases.length}`);
