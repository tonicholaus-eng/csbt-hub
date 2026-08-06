import assert from "node:assert/strict";

import { routeNichMessage } from "../src/components/nich/assistant/brain/router";
import type { NichConversationContext } from "../src/components/nich/assistant/brain/types";

function route(
  message: string,
  context: NichConversationContext = {
    recentPets: [],
    turnCount: 0,
  },
) {
  return routeNichMessage({ message, context });
}

const help = route("What can you do?");
assert.equal(help.intent, "help");

const strategy = route(
  "A player offers several low-demand pets whose combined value equals one high-demand pet. Explain why the trade may still be bad, give three examples, and create a negotiation strategy for the high-demand pet owner.",
);
assert.equal(strategy.intent, "tradeAdvice");
assert.match(strategy.text, /Equal listed value does not always mean/i);
assert.doesNotMatch(strategy.text, /I can help you with:/i);

const greetingQuestion = route(
  "Hello, what is Frost Dragon worth?",
);
assert.equal(greetingQuestion.intent, "petLookup");
assert.match(greetingQuestion.text, /Frost Dragon/i);

const quantityLookup = route("2 Neon Turtles");
assert.equal(quantityLookup.intent, "petLookup");
assert.match(quantityLookup.text, /2 × Neon Turtle/i);
assert.match(quantityLookup.text, /Combined value/i);


const gcashFrost = route(
  "What is Frost Dragon worth using GCash values?",
);
assert.equal(gcashFrost.intent, "petLookup");
assert.match(gcashFrost.text, /Normal: 3800/);
assert.match(gcashFrost.text, /Source: GCash Value/);

const elveFrost = route(
  "What is Frost Dragon worth using Elve Shark values?",
);
assert.equal(elveFrost.intent, "petLookup");
assert.match(elveFrost.text, /Normal: 304/);
assert.match(elveFrost.text, /Neon: 543/);
assert.match(elveFrost.text, /Mega: 1610/);
assert.match(elveFrost.text, /Source: Elve Shark Value/);

const lowerBoundRange = route("What is Mega Puma worth?");
assert.equal(lowerBoundRange.intent, "petLookup");
assert.match(lowerBoundRange.text, /Mega value: 8/);

const sharkPetDefaultsToGcash = route("What is Shark worth?");
assert.equal(sharkPetDefaultsToGcash.intent, "petLookup");
assert.match(sharkPetDefaultsToGcash.text, /Normal: 20/);
assert.match(sharkPetDefaultsToGcash.text, /Source: GCash Value/);

const broadDemandQuestion = route(
  "Why is Frost Dragon high demand?",
);
assert.equal(broadDemandQuestion.intent, "tradeAdvice");

const nearby = route("Find pets around 500 value");
assert.equal(nearby.intent, "nearbyValue");
assert.match(nearby.text, /Closest matches/i);

const lookup = route(
  "How much are Frost Dragon, Owl, and Kangaroo?",
);
assert.equal(lookup.intent, "petLookup");

const lookupContext: NichConversationContext = {
  recentPets: lookup.context?.recentPets,
  lastPetName: lookup.context?.lastPetName,
  lastVariant: lookup.context?.lastVariant,
  lastNumericValue: lookup.context?.lastNumericValue,
  lastIntent: lookup.intent,
  lastUpdatedAt: Date.now(),
  turnCount: 1,
};


const sourceFollowUp = route(
  "What about Elve?",
  lookupContext,
);
assert.equal(sourceFollowUp.intent, "petLookup");
assert.match(sourceFollowUp.text, /Source: Elve Shark Value/);
assert.equal(sourceFollowUp.context?.lastValueSource, "ELVE");

const compareOrdinals = route(
  "Compare the first and third",
  lookupContext,
);
assert.equal(compareOrdinals.intent, "tradeComparison");

const variantFollowUp = route(
  "What about Neon?",
  lookupContext,
);
assert.equal(variantFollowUp.intent, "petLookup");
assert.match(variantFollowUp.text, /Neon Kangaroo/i);

const trade = route(
  "WFL me FR Frost Dragon them FR Owl",
);
assert.equal(trade.intent, "tradeComparison");


const elveTrade = route(
  "WFL me FR Frost Dragon them FR Owl using Elve values",
);
assert.equal(elveTrade.intent, "tradeComparison");
assert.equal(elveTrade.tradeComparison?.valueSource, "ELVE");
assert.match(elveTrade.text, /Source: Elve Shark Value/);

const tradeContext: NichConversationContext = {
  recentPets: trade.context?.recentPets,
  lastTradeComparison: trade.tradeComparison,
  lastPetName: trade.context?.lastPetName,
  lastVariant: trade.context?.lastVariant,
  lastNumericValue: trade.context?.lastNumericValue,
  lastIntent: trade.intent,
  lastUpdatedAt: Date.now(),
  turnCount: 1,
};

const swapped = route("Swap sides", tradeContext);
assert.equal(swapped.intent, "tradeComparison");
assert.ok(swapped.tradeComparison);

console.log("All NICH brain tests passed.");
