import {
  extractNearbyTargetValue,
} from "../tools/nearbySearch";

import {
  findPetsInMessage,
  normalizeText,
  type PetMessageMatch,
} from "../tools/petSearch";

import {
  parseTradeMessage,
  type ParsedTradeQuery,
} from "../tools/tradeComparison";

export type NichMessageAction =
  | "compare"
  | "lookup"
  | "nearby"
  | "trade"
  | "variant";

export type NichMessageAnalysis = {
  originalMessage: string;
  normalizedMessage: string;
  pets: PetMessageMatch[];
  numbers: number[];
  actions: NichMessageAction[];
  tradeQuery: ParsedTradeQuery | null;
  nearbyTargetValue: number | null;
};

function extractNumbers(message: string) {
  const matches = message
    .replace(/,/g, "")
    .match(/-?\d+(?:\.\d+)?/g);

  if (!matches) {
    return [];
  }

  return matches
    .map(Number)
    .filter(Number.isFinite);
}

function includesAny(
  message: string,
  phrases: string[],
) {
  return phrases.some((phrase) =>
    message.includes(phrase),
  );
}

function containsWholeWord(
  message: string,
  words: string[],
) {
  return words.some((word) => {
    const escapedWord = word.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

    return new RegExp(
      `(?:^|\\s)${escapedWord}(?=$|\\s)`,
      "i",
    ).test(message);
  });
}

function detectActions(
  normalizedMessage: string,
  tradeQuery: ParsedTradeQuery | null,
  nearbyTargetValue: number | null,
) {
  const actions =
    new Set<NichMessageAction>();

  if (
    tradeQuery ||
    includesAny(normalizedMessage, [
      "compare",
      "versus",
      " against ",
      " vs ",
      "trade",
      "overpay",
      "underpay",
      "win",
      "lose",
      "fair",
      "wfl",
      "w f l",
    ])
  ) {
    actions.add("compare");
  }

  if (tradeQuery) {
    actions.add("trade");
  }

  if (
    nearbyTargetValue !== null &&
    includesAny(normalizedMessage, [
      "around",
      "near",
      "close to",
      "similar value",
      "pets worth",
      "pets value",
    ])
  ) {
    actions.add("nearby");
  }

  if (
    includesAny(normalizedMessage, [
      "worth",
      "value",
      "how much",
      "what is",
      "whats",
      "show me",
      "check",
    ])
  ) {
    actions.add("lookup");
  }

  if (
    includesAny(normalizedMessage, [
      "normal",
      "regular",
      "no potion",
      "no pot",
      "neon",
      "mega",
    ]) ||
    containsWholeWord(
      normalizedMessage,
      [
        "f",
        "r",
        "fr",
        "n",
        "nf",
        "nr",
        "nfr",
        "m",
        "mf",
        "mr",
        "mfr",
      ],
    )
  ) {
    actions.add("variant");
  }

  return Array.from(actions);
}

export function analyzeNichMessage(
  message: string,
): NichMessageAnalysis {
  const originalMessage =
    message.trim();

  const normalizedMessage =
    normalizeText(originalMessage);

  const pets =
    findPetsInMessage(originalMessage);

  const tradeQuery =
    parseTradeMessage(originalMessage);

  const nearbyTargetValue =
    extractNearbyTargetValue(
      originalMessage,
    );

  return {
    originalMessage,
    normalizedMessage,
    pets,
    numbers:
      extractNumbers(originalMessage),
    actions: detectActions(
      normalizedMessage,
      tradeQuery,
      nearbyTargetValue,
    ),
    tradeQuery,
    nearbyTargetValue,
  };
}

export default analyzeNichMessage;