import { findPetsInMessage } from "../tools/petSearch";
import {
  containsWholePhrase,
  isExactPhrase,
  normalizeText,
} from "./language";
import type {
  NichContextPet,
  NichConversationContext,
  NichTradeItem,
  PetVariant,
} from "./types";

export type FollowUpResolution = {
  message: string;
  usedContext: true;
  expired: false;
  reason:
    | "ordinal-comparison"
    | "highest-lowest"
    | "group-variant"
    | "single-variant"
    | "other-item"
    | "swap-trade"
    | "modify-trade";
};

const ORDINAL_INDEX: Record<string, number> = {
  first: 0,
  "1st": 0,
  one: 0,
  second: 1,
  "2nd": 1,
  two: 1,
  third: 2,
  "3rd": 2,
  three: 2,
  fourth: 3,
  "4th": 3,
  four: 3,
  fifth: 4,
  "5th": 4,
  five: 4,
  sixth: 5,
  "6th": 5,
  six: 5,
  seventh: 6,
  "7th": 6,
  seven: 6,
  eighth: 7,
  "8th": 7,
  eight: 7,
};

const ORDINAL_PATTERN =
  "first|1st|one|second|2nd|two|third|3rd|three|fourth|4th|four|fifth|5th|five|sixth|6th|six|seventh|7th|seven|eighth|8th|eight|last|former|latter";

function getRecentPets(context: NichConversationContext): NichContextPet[] {
  return context.recentPets ?? [];
}

function getLastPet(context: NichConversationContext): NichContextPet | undefined {
  if (context.lastPetName) {
    return {
      petName: context.lastPetName,
      variant: context.lastVariant,
      value: context.lastNumericValue,
    };
  }

  return getRecentPets(context)[0];
}

function formatContextPet(pet: NichContextPet): string {
  return pet.variant && pet.variant !== "normal"
    ? `${pet.variant} ${pet.petName}`
    : pet.petName;
}

function normalizeVariant(value: string): PetVariant {
  if (value === "mega" || value === "mfr") {
    return "mega";
  }

  if (value === "neon" || value === "nfr") {
    return "neon";
  }

  return "normal";
}

function getPetByOrdinal(
  ordinal: string,
  context: NichConversationContext,
): NichContextPet | undefined {
  const pets = getRecentPets(context);
  const normalized = ordinal.toLowerCase();

  if (normalized === "last" || normalized === "latter") {
    return pets.at(-1);
  }

  if (normalized === "former") {
    return pets[0];
  }

  const index = ORDINAL_INDEX[normalized];
  return index === undefined ? undefined : pets[index];
}

function resolveOrdinalComparison(
  message: string,
  context: NichConversationContext,
): FollowUpResolution | null {
  const normalized = normalizeText(message);
  const match = normalized.match(
    new RegExp(
      `^(?:now\\s+)?(?:compare|check)\\s+(?:the\\s+)?(${ORDINAL_PATTERN})(?:\\s+(?:one|item|pet))?\\s+(?:and|with|to|vs|versus|against)\\s+(?:the\\s+)?(${ORDINAL_PATTERN})(?:\\s+(?:one|item|pet))?$`,
    ),
  );

  if (!match) {
    return null;
  }

  const first = getPetByOrdinal(match[1], context);
  const second = getPetByOrdinal(match[2], context);

  if (!first || !second || first === second) {
    return null;
  }

  return {
    message: `${formatContextPet(first)} for ${formatContextPet(second)}`,
    usedContext: true,
    expired: false,
    reason: "ordinal-comparison",
  };
}

function resolveHighestLowestComparison(
  message: string,
  context: NichConversationContext,
): FollowUpResolution | null {
  const normalized = normalizeText(message);
  const requested = [
    "compare highest and lowest",
    "compare the highest and lowest",
    "compare highest with lowest",
    "compare the highest with the lowest",
    "compare most and least valuable",
    "compare the most and least valuable",
  ].includes(normalized);

  if (!requested) {
    return null;
  }

  const comparable = getRecentPets(context).filter(
    (pet): pet is NichContextPet & { value: number } =>
      typeof pet.value === "number" && Number.isFinite(pet.value),
  );

  if (comparable.length < 2) {
    return null;
  }

  const sorted = [...comparable].sort((a, b) => b.value - a.value);

  return {
    message: `${formatContextPet(sorted[0])} for ${formatContextPet(sorted.at(-1)!)}`,
    usedContext: true,
    expired: false,
    reason: "highest-lowest",
  };
}

function resolveAllPetsVariant(
  message: string,
  context: NichConversationContext,
): FollowUpResolution | null {
  const normalized = normalizeText(message);
  const patterns = [
    /^(?:now\s+)?(?:make|change|show)(?:\s+me)?\s+(?:them\s+)?(?:both|all)(?:\s+(?:to|as))?\s+(normal|regular|neon|nfr|mega|mfr)(?:\s+(?:versions?|values?|forms?))?$/,
    /^(?:what about|how about|and)\s+(?:their|the)\s+(normal|regular|neon|nfr|mega|mfr)(?:\s+(?:versions?|values?|forms?))?$/,
    /^(?:what about|how about|and)\s+(normal|regular|neon|nfr|mega|mfr)(?:\s+(?:versions?|values?|forms?))?\s+(?:for\s+)?(?:both|all|them)$/,
  ];

  const rawVariant = patterns
    .map((pattern) => normalized.match(pattern)?.[1])
    .find(Boolean);

  const pets = getRecentPets(context);
  if (!rawVariant || pets.length === 0) {
    return null;
  }

  const variant = normalizeVariant(rawVariant);

  return {
    message: pets.map((pet) => `${variant} ${pet.petName}`).join(", "),
    usedContext: true,
    expired: false,
    reason: "group-variant",
  };
}

function resolveSinglePetVariant(
  message: string,
  context: NichConversationContext,
): FollowUpResolution | null {
  const normalized = normalizeText(message);
  const match = normalized.match(
    /^(?:(?:what|how)\s+about\s+|and\s+|same\s+(?:but|in|as)\s+|now\s+|make\s+(?:it\s+)?|change\s+(?:it\s+)?(?:to\s+)?|show\s+(?:it\s+)?(?:as\s+)?)(normal|regular|neon|nfr|mega|mfr)(?:\s+(?:version|value|form|worth))?$/,
  );

  if (!match) {
    return null;
  }

  const lastPet = getLastPet(context);
  if (!lastPet) {
    return null;
  }

  return {
    message: `What is the ${normalizeVariant(match[1])} ${lastPet.petName} worth?`,
    usedContext: true,
    expired: false,
    reason: "single-variant",
  };
}

function resolveOtherPet(
  message: string,
  context: NichConversationContext,
): FollowUpResolution | null {
  const normalized = normalizeText(message);
  const asksForOther = [
    "what about the other one",
    "how about the other one",
    "show the other one",
    "check the other one",
    "what about the other pet",
    "how about the other pet",
    "the other one",
  ].includes(normalized);

  if (!asksForOther) {
    return null;
  }

  const pets = getRecentPets(context);
  if (pets.length !== 2) {
    return null;
  }

  const lastName = context.lastPetName
    ? normalizeText(context.lastPetName)
    : undefined;

  const other = lastName
    ? pets.find((pet) => normalizeText(pet.petName) !== lastName)
    : pets[1];

  if (!other) {
    return null;
  }

  return {
    message: `What is ${formatContextPet(other)} worth?`,
    usedContext: true,
    expired: false,
    reason: "other-item",
  };
}

function formatTradeItem(item: NichTradeItem): string {
  return `${item.petCode} ${item.petName}`.trim();
}

function formatTradeSide(items: NichTradeItem[]): string {
  return items.map(formatTradeItem).join(" + ");
}

function buildTradeMessage(
  offeredItems: NichTradeItem[],
  requestedItems: NichTradeItem[],
): string {
  return `WFL me ${formatTradeSide(offeredItems)} them ${formatTradeSide(requestedItems)}`;
}

function resolveSwapTrade(
  message: string,
  context: NichConversationContext,
): FollowUpResolution | null {
  if (
    !isExactPhrase(message, [
      "swap sides",
      "swap the sides",
      "reverse the trade",
      "reverse it",
      "what if we swap",
    ]) ||
    !context.lastTradeComparison
  ) {
    return null;
  }

  return {
    message: buildTradeMessage(
      context.lastTradeComparison.requestedItems,
      context.lastTradeComparison.offeredItems,
    ),
    usedContext: true,
    expired: false,
    reason: "swap-trade",
  };
}

function removeMatchedItems(
  currentItems: NichTradeItem[],
  fragment: string,
): NichTradeItem[] | null {
  const matches = findPetsInMessage(fragment);
  if (matches.length === 0) {
    return null;
  }

  const names = new Set(matches.map((match) => normalizeText(match.pet.PETS)));
  const remaining = currentItems.filter(
    (item) => !names.has(normalizeText(item.petName)),
  );

  return remaining.length < currentItems.length ? remaining : null;
}

function resolveTradeModification(
  message: string,
  context: NichConversationContext,
): FollowUpResolution | null {
  const comparison = context.lastTradeComparison;
  if (!comparison) {
    return null;
  }

  const normalized = normalizeText(message);
  let offered = [...comparison.offeredItems];
  let requested = [...comparison.requestedItems];

  const addMatch = normalized.match(
    /^(?:what if\s+)?(i|we|me|my side|my offer|they|them|their side|their offer|he|she)\s+(?:also\s+)?(?:add|adds|added|include|put in)\s+(.+)$/,
  );

  if (addMatch) {
    const side = addMatch[1];
    const addition = addMatch[2].trim();
    if (!addition) {
      return null;
    }

    const isMySide = ["i", "we", "me", "my side", "my offer"].includes(side);
    const offeredText = formatTradeSide(offered);
    const requestedText = formatTradeSide(requested);

    return {
      message: isMySide
        ? `WFL me ${offeredText} + ${addition} them ${requestedText}`
        : `WFL me ${offeredText} them ${requestedText} + ${addition}`,
      usedContext: true,
      expired: false,
      reason: "modify-trade",
    };
  }

  const removeMatch = normalized.match(
    /^(?:what if\s+)?(?:i|we|they|he|she)?\s*(?:remove|take out|drop)\s+(.+?)(?:\s+from\s+(my|our|their|his|her)\s+(?:side|offer))?$/,
  );

  if (removeMatch) {
    const fragment = removeMatch[1].trim();
    const sideHint = removeMatch[2];
    const tryOffered = !sideHint || sideHint === "my" || sideHint === "our";
    const tryRequested = !sideHint || ["their", "his", "her"].includes(sideHint);

    const nextOffered = tryOffered ? removeMatchedItems(offered, fragment) : null;
    const nextRequested = tryRequested ? removeMatchedItems(requested, fragment) : null;

    if (nextOffered && nextOffered.length > 0) {
      offered = nextOffered;
    } else if (nextRequested && nextRequested.length > 0) {
      requested = nextRequested;
    } else {
      return null;
    }

    return {
      message: buildTradeMessage(offered, requested),
      usedContext: true,
      expired: false,
      reason: "modify-trade",
    };
  }

  if (
    containsWholePhrase(normalized, "what if") &&
    (containsWholePhrase(normalized, "add") || containsWholePhrase(normalized, "remove"))
  ) {
    return null;
  }

  return null;
}

export function resolveAdvancedFollowUp(
  message: string,
  context: NichConversationContext,
): FollowUpResolution | null {
  const resolvers = [
    resolveSwapTrade,
    resolveTradeModification,
    resolveOrdinalComparison,
    resolveHighestLowestComparison,
    resolveAllPetsVariant,
    resolveSinglePetVariant,
    resolveOtherPet,
  ] as const;

  for (const resolver of resolvers) {
    const result = resolver(message, context);
    if (result) {
      return result;
    }
  }

  return null;
}

export default resolveAdvancedFollowUp;
