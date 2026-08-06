import resolveAdvancedFollowUp from "./followUp";
import { isExactPhrase, normalizeText, wordCount } from "./language";
import type {
  NichBrainInput,
  NichContextPet,
  NichConversationContext,
} from "./types";

const CONTEXT_EXPIRY_MS = 30 * 60 * 1000;

export type ContextResolution = {
  message: string;
  usedContext: boolean;
  expired: boolean;
  reason?: string;
};

const ORDINAL_INDEX: Record<string, number> = {
  first: 0,
  "1st": 0,
  second: 1,
  "2nd": 1,
  third: 2,
  "3rd": 2,
  fourth: 3,
  "4th": 3,
  fifth: 4,
  "5th": 4,
  sixth: 5,
  "6th": 5,
  seventh: 6,
  "7th": 6,
  eighth: 7,
  "8th": 7,
};

function isContextExpired(context: NichConversationContext): boolean {
  return Boolean(
    context.lastUpdatedAt &&
      Date.now() - context.lastUpdatedAt > CONTEXT_EXPIRY_MS,
  );
}

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

function resolveDirectComparison(
  message: string,
  context: NichConversationContext,
): ContextResolution | null {
  const normalized = normalizeText(message);
  const asksFirstTwo = isExactPhrase(normalized, [
    "compare the first two",
    "compare first two",
    "compare the first 2",
    "compare first 2",
    "compare both",
    "compare the two",
    "compare those",
    "compare them",
    "which one is worth more",
    "which is worth more",
  ]);

  if (!asksFirstTwo) {
    return null;
  }

  const pets = getRecentPets(context);
  if (pets.length < 2) {
    return null;
  }

  return {
    message: `${formatContextPet(pets[0])} for ${formatContextPet(pets[1])}`,
    usedContext: true,
    expired: false,
    reason: "compare-recent-items",
  };
}

function resolveVariantOnlyFollowUp(
  message: string,
  context: NichConversationContext,
): ContextResolution | null {
  const normalized = normalizeText(message);
  const match = normalized.match(
    /^(?:(?:what|how)\s+about\s+|and\s+|show\s+me\s+|what\s+is\s+|whats\s+)?(normal|regular|neon|nfr|mega|mfr)(?:\s+(?:value|worth|one|version|form))?$/,
  );

  const lastPet = getLastPet(context);
  if (!match || !lastPet) {
    return null;
  }

  const rawVariant = match[1];
  const variant =
    rawVariant === "mega" || rawVariant === "mfr"
      ? "mega"
      : rawVariant === "neon" || rawVariant === "nfr"
        ? "neon"
        : "normal";

  return {
    message: `What is the ${variant} ${lastPet.petName} worth?`,
    usedContext: true,
    expired: false,
    reason: "variant-follow-up",
  };
}


function resolveValueSourceFollowUp(
  message: string,
  context: NichConversationContext,
): ContextResolution | null {
  const normalized = normalizeText(message);
  const match = normalized.match(
    /^(?:(?:what|how)\s+about\s+|and\s+|show\s+me\s+|check\s+|use\s+|using\s+|switch\s+to\s+)?(gcash|g\s*cash|cash|php|peso|pesos|elve|elvebredd|elve\s+shark|shark|in\s+game)(?:\s+values?)?$/,
  );

  if (!match) {
    return null;
  }

  const source = /^(?:elve|elvebredd|elve\s+shark|shark|in\s+game)$/.test(match[1])
    ? "Elve Shark"
    : "GCash";

  const lastPet = getLastPet(context);
  if (lastPet) {
    return {
      message: `What is ${formatContextPet(lastPet)} worth using ${source} values?`,
      usedContext: true,
      expired: false,
      reason: "value-source-follow-up",
    };
  }

  const previousTrade = context.lastTradeComparison;
  if (
    previousTrade?.offeredItems?.length &&
    previousTrade.requestedItems?.length
  ) {
    const formatTradeSide = (items: typeof previousTrade.offeredItems) =>
      items.map((item) => `${item.petCode} ${item.petName}`).join(" + ");

    return {
      message: `WFL me ${formatTradeSide(previousTrade.offeredItems)} them ${formatTradeSide(previousTrade.requestedItems)} using ${source} values`,
      usedContext: true,
      expired: false,
      reason: "trade-value-source-follow-up",
    };
  }

  return null;
}

function resolveNearbyValueFollowUp(
  message: string,
  context: NichConversationContext,
): ContextResolution | null {
  const normalized = normalizeText(message);
  const refersToPreviousValue = [
    "around that value",
    "near that value",
    "close to that value",
    "similar value",
    "same value",
    "pets around it",
    "items around it",
  ].some((phrase) => normalized.includes(phrase));

  if (!refersToPreviousValue || context.lastNumericValue === undefined) {
    return null;
  }

  return {
    message: `Find pets around ${context.lastNumericValue} value`,
    usedContext: true,
    expired: false,
    reason: "previous-value",
  };
}

function resolveOrdinalReferences(
  message: string,
  context: NichConversationContext,
): Pick<ContextResolution, "message" | "usedContext"> {
  let usedContext = false;
  const expression =
    /\b(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|sixth|6th|seventh|7th|eighth|8th|last|former|latter)\s+(?:one|item|pet)\b/gi;

  const resolved = message.replace(expression, (match, ordinal: string) => {
    const pet = getPetByOrdinal(ordinal, context);
    if (!pet) {
      return match;
    }

    usedContext = true;
    return formatContextPet(pet);
  });

  return { message: resolved, usedContext };
}

function resolveSafePronouns(
  message: string,
  context: NichConversationContext,
): Pick<ContextResolution, "message" | "usedContext"> {
  const lastPet = getLastPet(context);
  if (!lastPet) {
    return { message, usedContext: false };
  }

  const formatted = formatContextPet(lastPet);
  let resolved = message;
  let usedContext = false;

  const explicitReferences = [
    /\bthat pet\b/gi,
    /\bthis pet\b/gi,
    /\bthat item\b/gi,
    /\bthis item\b/gi,
    /\bthe same pet\b/gi,
    /\bthe same item\b/gi,
    /\bthat one\b/gi,
    /\bthis one\b/gi,
  ];

  for (const expression of explicitReferences) {
    if (!expression.test(resolved)) {
      continue;
    }

    expression.lastIndex = 0;
    resolved = resolved.replace(expression, formatted);
    usedContext = true;
  }

  // Bare "it" is resolved only in short, clearly item-focused follow-ups.
  const normalized = normalizeText(resolved);
  const safeItPattern =
    /^(?:what(?:s| is)?|how much is|show|check|make|change|is)\s+it(?:\s+(?:worth|value|normal|neon|mega|good|better|higher|lower))?(?:\s+.*)?$/;

  if (
    wordCount(normalized) <= 8 &&
    safeItPattern.test(normalized) &&
    /\bit\b/i.test(resolved)
  ) {
    resolved = resolved.replace(/\bit\b/gi, formatted);
    usedContext = true;
  }

  return { message: resolved, usedContext };
}

export function resolveContextualMessage({
  message,
  context,
}: NichBrainInput): ContextResolution {
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    return { message: "", usedContext: false, expired: false };
  }

  if (isContextExpired(context)) {
    return {
      message: trimmedMessage,
      usedContext: false,
      expired: true,
      reason: "context-expired",
    };
  }

  const advanced = resolveAdvancedFollowUp(trimmedMessage, context);
  if (advanced) {
    return advanced;
  }

  const directResolvers = [
    resolveDirectComparison,
    resolveVariantOnlyFollowUp,
    resolveValueSourceFollowUp,
    resolveNearbyValueFollowUp,
  ] as const;

  for (const resolver of directResolvers) {
    const result = resolver(trimmedMessage, context);
    if (result) {
      return result;
    }
  }

  const ordinal = resolveOrdinalReferences(trimmedMessage, context);
  const pronoun = resolveSafePronouns(ordinal.message, context);

  return {
    message: pronoun.message,
    usedContext: ordinal.usedContext || pronoun.usedContext,
    expired: false,
    reason:
      ordinal.usedContext || pronoun.usedContext
        ? "reference-resolution"
        : undefined,
  };
}

export default resolveContextualMessage;
