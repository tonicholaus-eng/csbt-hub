import { extractNearbyTargetValue } from "../tools/nearbySearch";
import {
  detectPetVariant,
  findPetsInMessage,
  normalizeText,
  resolvePetSearch,
  type PetMessageMatch,
  type PetSearchCandidate,
  type PetSearchResolution,
  type PetVariant,
} from "../tools/petSearch";
import {
  parseTradeMessage,
  type ParsedTradeQuery,
} from "../tools/tradeComparison";
import {
  containsWholePhrase,
  includesAnyWholePhrase,
  isExactPhrase,
  startsWithAnyPhrase,
  wordCount,
} from "./language";

export type NichMessageAction =
  | "compare"
  | "lookup"
  | "nearby"
  | "trade"
  | "variant"
  | "advice";

export type NichPrimaryIntent =
  | "tradeComparison"
  | "nearbySearch"
  | "itemLookup"
  | "variantFollowUp"
  | "conversationFollowUp"
  | "tradeAdvice"
  | "help"
  | "greeting"
  | "generalQuestion"
  | "unknown";

export type NichFollowUpKind =
  | "variant"
  | "modifyTrade"
  | "pronoun"
  | "generic"
  | null;

export type NichRequestedCategory = "PET" | "PETWEAR" | null;

export type NichMessageAnalysis = {
  originalMessage: string;
  normalizedMessage: string;
  pets: PetMessageMatch[];
  numbers: number[];
  actions: NichMessageAction[];
  tradeQuery: ParsedTradeQuery | null;
  nearbyTargetValue: number | null;
  primaryIntent: NichPrimaryIntent;
  requestedVariant: PetVariant | null;
  requestedCategory: NichRequestedCategory;
  itemQuery: string | null;
  itemResolution: PetSearchResolution | null;
  clarificationNeeded: boolean;
  clarificationCandidates: PetSearchCandidate[];
  confidence: number;
  isFollowUp: boolean;
  followUpKind: NichFollowUpKind;
  requiresContext: boolean;
  isGreeting: boolean;
  isHelpRequest: boolean;
  isDirectLookup: boolean;
  isGeneralQuestion: boolean;
  hasTradeStructure: boolean;
  isStandaloneNumber: boolean;
  hasMultipleItemReferences: boolean;
  totalDetectedQuantity: number;
};

const LOOKUP_TERMS = [
  "how much",
  "worth",
  "value",
  "values",
  "price",
  "prices",
  "check",
  "look up",
  "lookup",
] as const;

const EXPLICIT_COMPARISON_TERMS = [
  "compare",
  "versus",
  "against",
  "vs",
  "wfl",
  "w f l",
  "win fair lose",
  "overpay",
  "underpay",
] as const;

const TRADE_SIDE_TERMS = [
  "my offer",
  "your offer",
  "their offer",
  "his offer",
  "her offer",
  "me",
  "mine",
  "them",
  "offering",
  "looking for",
] as const;

const NEARBY_TERMS = [
  "around",
  "near",
  "close to",
  "similar value",
  "similar worth",
  "pets worth",
  "pets value",
  "items worth",
  "items value",
] as const;

const ADVICE_TERMS = [
  "demand",
  "tradeable",
  "tradable",
  "tradeability",
  "liquidity",
  "upgrade",
  "downgrade",
  "strategy",
  "negotiate",
  "negotiation",
  "counteroffer",
  "long term",
  "investment",
  "risk",
  "risky",
  "scam",
  "safe trade",
  "why is",
  "why are",
  "explain why",
  "good to trade",
  "bad trade",
] as const;

const FOLLOW_UP_PREFIXES = [
  "what about",
  "how about",
  "and what about",
  "and how about",
  "what if",
  "then",
  "instead",
  "same",
  "that one",
  "this one",
  "the other one",
  "it",
  "them",
  "those",
] as const;

const TRADE_MODIFIER_WORDS = [
  "add",
  "remove",
  "replace",
  "swap",
  "change",
  "include",
  "take out",
  "put",
  "drop",
] as const;

const ITEM_QUERY_REMOVALS = [
  "how much is",
  "how much are",
  "what is the value of",
  "what are the values of",
  "what is",
  "what are",
  "whats the value of",
  "whats",
  "show me the value of",
  "show me",
  "tell me the value of",
  "tell me",
  "look up",
  "lookup",
  "check the value of",
  "check value of",
  "check",
  "value of",
  "values of",
  "price of",
  "prices of",
  "worth",
  "value",
  "values",
  "price",
  "prices",
  "please",
  "pls",
  "for me",
  "using",
  "use",
  "gcash",
  "g cash",
  "cash",
  "php",
  "peso",
  "pesos",
  "elve",
  "elvebredd",
  "elve shark",
  "shark",
  "in game",
  "in-game",
  "pet wear",
  "petwear",
  "petwears",
  "pets",
  "pet",
  "items",
  "item",
  "normal",
  "regular",
  "no potion",
  "no pot",
  "fly ride",
  "fly only",
  "ride only",
  "mega neon",
  "neon",
  "mega",
  "mfr",
  "nfr",
  "fr",
  "mf",
  "mr",
  "nf",
  "nr",
  "np",
] as const;

function extractNumbers(message: string): number[] {
  const matches = message
    .replace(/,/g, "")
    .match(/-?\d+(?:\.\d+)?\s*[km]?/gi);

  if (!matches) {
    return [];
  }

  return matches
    .map((raw) => {
      const match = raw
        .trim()
        .toLowerCase()
        .match(/^(-?\d+(?:\.\d+)?)\s*([km])?$/);

      if (!match) {
        return null;
      }

      const base = Number(match[1]);
      if (!Number.isFinite(base)) {
        return null;
      }

      const multiplier = match[2] === "k" ? 1_000 : match[2] === "m" ? 1_000_000 : 1;
      return base * multiplier;
    })
    .filter((value): value is number => value !== null && Number.isFinite(value));
}

function stripValueSourceLanguage(message: string): string {
  return message
    .replace(
      /\b(?:using|use|with|on|from|according\s+to)\s+(?:the\s+)?(?:elvebredd|elve)(?:\s+shark)?(?:\s+values?)?\b/gi,
      " ",
    )
    .replace(/\b(?:elvebredd|elve)\s+shark\s+values?\b/gi, " ")
    .replace(/\b(?:gcash|g\s*cash)\s+values?\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getRequestedCategory(normalizedMessage: string): NichRequestedCategory {
  if (includesAnyWholePhrase(normalizedMessage, ["pet wear", "petwear", "petwears"])) {
    return "PETWEAR";
  }

  if (includesAnyWholePhrase(normalizedMessage, ["pet only", "pets only"])) {
    return "PET";
  }

  return null;
}

function isGreetingMessage(normalizedMessage: string): boolean {
  return isExactPhrase(normalizedMessage, [
    "hi",
    "hello",
    "hey",
    "hiya",
    "yo",
    "good morning",
    "good afternoon",
    "good evening",
    "hi nich",
    "hello nich",
    "hey nich",
  ]);
}

function isHelpMessage(normalizedMessage: string): boolean {
  if (
    isExactPhrase(normalizedMessage, [
      "help",
      "help me",
      "commands",
      "what can you do",
      "what can i ask you",
      "how do i use nich",
      "how to use nich",
      "show examples",
      "give me examples",
      "examples",
    ])
  ) {
    return true;
  }

  return (
    wordCount(normalizedMessage) <= 7 &&
    startsWithAnyPhrase(normalizedMessage, ["show me examples of your commands"])
  );
}

function detectFollowUpKind(
  normalizedMessage: string,
  requestedVariant: PetVariant | null,
  pets: PetMessageMatch[],
  tradeQuery: ParsedTradeQuery | null,
): NichFollowUpKind {
  if (!normalizedMessage || tradeQuery) {
    return null;
  }

  const words = normalizedMessage.split(" ");
  if (requestedVariant !== null && pets.length === 0 && words.length <= 6) {
    return "variant";
  }

  if (
    TRADE_MODIFIER_WORDS.some((word) => containsWholePhrase(normalizedMessage, word)) &&
    (startsWithAnyPhrase(normalizedMessage, ["what if", "add", "remove", "replace", "swap"]) ||
      includesAnyWholePhrase(normalizedMessage, ["my side", "their side", "my offer", "their offer"]))
  ) {
    return "modifyTrade";
  }

  if (startsWithAnyPhrase(normalizedMessage, FOLLOW_UP_PREFIXES)) {
    return includesAnyWholePhrase(normalizedMessage, [
      "it",
      "that one",
      "this one",
      "the other one",
      "them",
      "those",
      "same",
    ])
      ? "pronoun"
      : "generic";
  }

  return null;
}

function removeWholePhrase(value: string, phrase: string): string {
  const normalizedPhrase = normalizeText(phrase);
  if (!normalizedPhrase) {
    return value;
  }

  const escaped = normalizedPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return value.replace(new RegExp(`(?:^|\\s)${escaped}(?=$|\\s)`, "gi"), " ");
}

function isAdviceQuestion(normalizedMessage: string): boolean {
  return includesAnyWholePhrase(normalizedMessage, ADVICE_TERMS);
}

function isConciseItemRequest(
  normalizedMessage: string,
  pets: PetMessageMatch[],
  requestedVariant: PetVariant | null,
): boolean {
  if (pets.length === 0 || wordCount(normalizedMessage) > 8) {
    return false;
  }

  if (isAdviceQuestion(normalizedMessage)) {
    return false;
  }

  if (includesAnyWholePhrase(normalizedMessage, LOOKUP_TERMS)) {
    return true;
  }

  if (requestedVariant && wordCount(normalizedMessage) <= 5) {
    return true;
  }

  const petWords = pets.reduce(
    (total, pet) => total + normalizeText(pet.matchedName).split(" ").length,
    0,
  );

  return wordCount(normalizedMessage) <= petWords + 3;
}

function extractItemQuery(
  normalizedMessage: string,
  shouldExtract: boolean,
  tradeQuery: ParsedTradeQuery | null,
  nearbyTargetValue: number | null,
  isGreeting: boolean,
  isHelpRequest: boolean,
  followUpKind: NichFollowUpKind,
): string | null {
  if (
    !normalizedMessage ||
    !shouldExtract ||
    tradeQuery ||
    nearbyTargetValue !== null ||
    isGreeting ||
    isHelpRequest ||
    followUpKind === "variant"
  ) {
    return null;
  }

  let candidate = normalizedMessage;
  const removals = [...ITEM_QUERY_REMOVALS].sort((a, b) => b.length - a.length);

  for (const phrase of removals) {
    candidate = removeWholePhrase(candidate, phrase);
  }

  candidate = candidate
    .replace(/\b\d+(?:\.\d+)?\s*[km]?\b/gi, " ")
    .replace(/\b(?:x|times|copies|copy)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return candidate && wordCount(candidate) <= 7 ? candidate : null;
}

function calculateConfidence(
  pets: PetMessageMatch[],
  itemResolution: PetSearchResolution | null,
  tradeQuery: ParsedTradeQuery | null,
): number {
  if (tradeQuery) {
    const confidences = pets
      .map((pet) => pet.confidence)
      .filter((value): value is number => value !== undefined && Number.isFinite(value));
    return confidences.length ? Math.min(...confidences) : 0.9;
  }

  if (pets.length) {
    return Math.min(...pets.map((pet) => pet.confidence ?? 1));
  }

  if (itemResolution?.status === "matched") {
    return itemResolution.match.confidence;
  }

  if (itemResolution?.status === "ambiguous") {
    return Math.min(itemResolution.candidates[0]?.confidence ?? 0, 0.74);
  }

  return 0;
}

function determinePrimaryIntent(args: {
  actions: NichMessageAction[];
  isGreeting: boolean;
  isHelpRequest: boolean;
  followUpKind: NichFollowUpKind;
  clarificationNeeded: boolean;
  isGeneralQuestion: boolean;
}): NichPrimaryIntent {
  const { actions, isGreeting, isHelpRequest, followUpKind, clarificationNeeded, isGeneralQuestion } = args;

  if (actions.includes("trade")) return "tradeComparison";
  if (actions.includes("nearby")) return "nearbySearch";
  if (clarificationNeeded || actions.includes("lookup")) return "itemLookup";
  if (followUpKind === "variant") return "variantFollowUp";
  if (followUpKind) return "conversationFollowUp";
  if (actions.includes("advice")) return "tradeAdvice";
  if (isHelpRequest) return "help";
  if (isGreeting) return "greeting";
  if (isGeneralQuestion) return "generalQuestion";
  return "unknown";
}

export function analyzeNichMessage(message: string): NichMessageAnalysis {
  const originalMessage = message.trim();
  const normalizedMessage = normalizeText(originalMessage);
  const itemDetectionMessage = stripValueSourceLanguage(originalMessage);
  const normalizedItemMessage = normalizeText(itemDetectionMessage);
  const pets = findPetsInMessage(itemDetectionMessage);
  const tradeQuery = parseTradeMessage(originalMessage);
  const nearbyTargetValue = extractNearbyTargetValue(originalMessage);
  const requestedVariant = detectPetVariant(originalMessage) ?? null;
  const requestedCategory = getRequestedCategory(normalizedMessage);
  const isGreeting = isGreetingMessage(normalizedMessage);
  const isHelpRequest = isHelpMessage(normalizedMessage);
  const isAdvice = isAdviceQuestion(normalizedMessage);
  const followUpKind = detectFollowUpKind(
    normalizedMessage,
    requestedVariant,
    pets,
    tradeQuery,
  );

  const hasExplicitComparison = includesAnyWholePhrase(
    normalizedMessage,
    EXPLICIT_COMPARISON_TERMS,
  );
  const hasTradeSideLanguage = includesAnyWholePhrase(normalizedMessage, TRADE_SIDE_TERMS);
  const hasTradeStructure = Boolean(
    tradeQuery ||
      (pets.length >= 2 && (hasExplicitComparison || hasTradeSideLanguage)),
  );
  const isDirectLookup = isConciseItemRequest(
    normalizedItemMessage,
    pets,
    requestedVariant,
  );

  const itemQuery = extractItemQuery(
    normalizedItemMessage,
    isDirectLookup || (pets.length === 0 && includesAnyWholePhrase(normalizedMessage, LOOKUP_TERMS)),
    tradeQuery,
    nearbyTargetValue,
    isGreeting,
    isHelpRequest,
    followUpKind,
  );
  const itemResolution = itemQuery
    ? resolvePetSearch(itemQuery, requestedCategory ?? undefined)
    : null;
  const clarificationNeeded = itemResolution?.status === "ambiguous";
  const clarificationCandidates =
    itemResolution?.status === "ambiguous" ? itemResolution.candidates : [];

  const actions = new Set<NichMessageAction>();
  if (tradeQuery) {
    actions.add("trade");
    actions.add("compare");
  } else if (hasTradeStructure) {
    actions.add("compare");
  }

  if (
    nearbyTargetValue !== null &&
    includesAnyWholePhrase(normalizedMessage, NEARBY_TERMS)
  ) {
    actions.add("nearby");
  }

  if (
    !tradeQuery &&
    nearbyTargetValue === null &&
    (isDirectLookup || itemResolution !== null)
  ) {
    actions.add("lookup");
  }

  if (requestedVariant !== null) actions.add("variant");
  if (isAdvice) actions.add("advice");

  const numbers = extractNumbers(originalMessage);
  const isStandaloneNumber = /^-?\d+(?:\.\d+)?\s*[km]?$/.test(
    normalizedMessage.replace(/,/g, ""),
  );
  const isGeneralQuestion =
    !isGreeting &&
    !isHelpRequest &&
    !tradeQuery &&
    nearbyTargetValue === null &&
    !isDirectLookup &&
    (/[?]$/.test(originalMessage) || /^(?:why|how|should|can|could|would|is|are|do|does|what)\b/i.test(originalMessage));

  const primaryIntent = determinePrimaryIntent({
    actions: Array.from(actions),
    isGreeting,
    isHelpRequest,
    followUpKind,
    clarificationNeeded,
    isGeneralQuestion,
  });

  return {
    originalMessage,
    normalizedMessage,
    pets,
    numbers,
    actions: Array.from(actions),
    tradeQuery,
    nearbyTargetValue,
    primaryIntent,
    requestedVariant,
    requestedCategory,
    itemQuery,
    itemResolution,
    clarificationNeeded,
    clarificationCandidates,
    confidence: calculateConfidence(pets, itemResolution, tradeQuery),
    isFollowUp: followUpKind !== null,
    followUpKind,
    requiresContext: followUpKind !== null && pets.length === 0 && !tradeQuery,
    isGreeting,
    isHelpRequest,
    isDirectLookup,
    isGeneralQuestion,
    hasTradeStructure,
    isStandaloneNumber,
    hasMultipleItemReferences: pets.length > 1,
    totalDetectedQuantity: pets.reduce((total, pet) => total + (pet.quantity ?? 1), 0),
  };
}

export default analyzeNichMessage;
