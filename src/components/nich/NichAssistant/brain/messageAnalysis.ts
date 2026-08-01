import {
  extractNearbyTargetValue,
} from "../tools/nearbySearch";

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

export type NichMessageAction =
  | "compare"
  | "lookup"
  | "nearby"
  | "trade"
  | "variant";

export type NichPrimaryIntent =
  | "tradeComparison"
  | "nearbySearch"
  | "itemLookup"
  | "variantFollowUp"
  | "conversationFollowUp"
  | "help"
  | "greeting"
  | "unknown";

export type NichFollowUpKind =
  | "variant"
  | "modifyTrade"
  | "pronoun"
  | "generic"
  | null;

export type NichRequestedCategory =
  | "PET"
  | "PETWEAR"
  | null;

export type NichMessageAnalysis = {
  originalMessage: string;
  normalizedMessage: string;

  /**
   * Exact, alias, and high-confidence fuzzy matches found throughout
   * the message. Quantity and confidence are supplied by petSearch.ts.
   */
  pets: PetMessageMatch[];

  /**
   * Numeric values mentioned by the user. Compact values such as 1.5k
   * are converted to 1500.
   */
  numbers: number[];

  /**
   * Backward-compatible actions consumed by the existing Nich brain.
   */
  actions: NichMessageAction[];

  tradeQuery: ParsedTradeQuery | null;
  nearbyTargetValue: number | null;

  /**
   * New intelligence metadata. Existing response files can ignore these
   * fields until they are upgraded.
   */
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
  hasMultipleItemReferences: boolean;
  totalDetectedQuantity: number;
};

const LOOKUP_PHRASES = [
  "how much",
  "what is",
  "what are",
  "whats",
  "what's",
  "worth",
  "value",
  "values",
  "price",
  "prices",
  "check",
  "show me",
  "tell me",
  "look up",
  "lookup",
] as const;

const COMPARISON_PHRASES = [
  "compare",
  "versus",
  "against",
  "vs",
  "wfl",
  "w f l",
  "win fair lose",
  "win",
  "lose",
  "fair",
  "overpay",
  "underpay",
  "over",
  "under",
] as const;

const NEARBY_PHRASES = [
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

const HELP_PHRASES = [
  "help",
  "commands",
  "what can you do",
  "how do i use",
  "how to use",
  "examples",
  "show examples",
] as const;

const GREETING_PHRASES = [
  "hi",
  "hello",
  "hey",
  "hiya",
  "yo",
  "good morning",
  "good afternoon",
  "good evening",
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
  "what's",
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

function escapeRegExp(
  value: string,
) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

function containsWholePhrase(
  message: string,
  phrase: string,
) {
  const normalizedPhrase =
    normalizeText(phrase);

  if (
    !message ||
    !normalizedPhrase
  ) {
    return false;
  }

  return new RegExp(
    `(?:^|\\s)${escapeRegExp(
      normalizedPhrase,
    )}(?=$|\\s)`,
    "i",
  ).test(message);
}

function includesAnyWholePhrase(
  message: string,
  phrases: readonly string[],
) {
  return phrases.some((phrase) =>
    containsWholePhrase(
      message,
      phrase,
    ),
  );
}

function extractNumbers(
  message: string,
) {
  const matches = message
    .replace(/,/g, "")
    .match(
      /-?\d+(?:\.\d+)?\s*[km]?/gi,
    );

  if (!matches) {
    return [];
  }

  return matches
    .map((rawMatch) => {
      const compactMatch =
        rawMatch
          .trim()
          .toLowerCase()
          .match(
            /^(-?\d+(?:\.\d+)?)\s*([km])?$/,
          );

      if (!compactMatch) {
        return null;
      }

      const numericValue =
        Number(compactMatch[1]);

      if (
        !Number.isFinite(
          numericValue,
        )
      ) {
        return null;
      }

      const multiplier =
        compactMatch[2] === "k"
          ? 1_000
          : compactMatch[2] === "m"
            ? 1_000_000
            : 1;

      return (
        numericValue * multiplier
      );
    })
    .filter(
      (
        value,
      ): value is number =>
        value !== null &&
        Number.isFinite(value),
    );
}

function getRequestedCategory(
  normalizedMessage: string,
): NichRequestedCategory {
  if (
    includesAnyWholePhrase(
      normalizedMessage,
      [
        "pet wear",
        "petwear",
        "petwears",
      ],
    )
  ) {
    return "PETWEAR";
  }

  if (
    includesAnyWholePhrase(
      normalizedMessage,
      [
        "pet only",
        "pets only",
      ],
    )
  ) {
    return "PET";
  }

  return null;
}

function isGreetingMessage(
  normalizedMessage: string,
) {
  if (!normalizedMessage) {
    return false;
  }

  return GREETING_PHRASES.some(
    (greeting) =>
      normalizedMessage ===
        normalizeText(greeting) ||
      normalizedMessage.startsWith(
        `${normalizeText(greeting)} `,
      ),
  );
}

function isHelpMessage(
  normalizedMessage: string,
) {
  return includesAnyWholePhrase(
    normalizedMessage,
    HELP_PHRASES,
  );
}

function detectFollowUpKind(
  normalizedMessage: string,
  requestedVariant:
    | PetVariant
    | null,
  pets: PetMessageMatch[],
  tradeQuery:
    | ParsedTradeQuery
    | null,
): NichFollowUpKind {
  if (
    !normalizedMessage ||
    tradeQuery
  ) {
    return null;
  }

  const words =
    normalizedMessage.split(" ");

  const isShortVariantMessage =
    requestedVariant !== null &&
    pets.length === 0 &&
    words.length <= 5;

  if (isShortVariantMessage) {
    return "variant";
  }

  if (
    TRADE_MODIFIER_WORDS.some(
      (modifier) =>
        containsWholePhrase(
          normalizedMessage,
          modifier,
        ),
    )
  ) {
    return "modifyTrade";
  }

  if (
    FOLLOW_UP_PREFIXES.some(
      (prefix) =>
        normalizedMessage ===
          normalizeText(prefix) ||
        normalizedMessage.startsWith(
          `${normalizeText(prefix)} `,
        ),
    )
  ) {
    if (
      includesAnyWholePhrase(
        normalizedMessage,
        [
          "it",
          "that one",
          "this one",
          "them",
          "those",
          "same",
        ],
      )
    ) {
      return "pronoun";
    }

    return "generic";
  }

  return null;
}

function removeWholePhrase(
  value: string,
  phrase: string,
) {
  const normalizedPhrase =
    normalizeText(phrase);

  if (!normalizedPhrase) {
    return value;
  }

  return value.replace(
    new RegExp(
      `(?:^|\\s)${escapeRegExp(
        normalizedPhrase,
      )}(?=$|\\s)`,
      "gi",
    ),
    " ",
  );
}

function extractItemQuery(
  normalizedMessage: string,
  tradeQuery:
    | ParsedTradeQuery
    | null,
  nearbyTargetValue:
    | number
    | null,
  isGreeting: boolean,
  isHelpRequest: boolean,
  followUpKind:
    NichFollowUpKind,
) {
  if (
    !normalizedMessage ||
    tradeQuery ||
    nearbyTargetValue !== null ||
    isGreeting ||
    isHelpRequest ||
    followUpKind === "variant"
  ) {
    return null;
  }

  let candidate =
    normalizedMessage;

  const removals = [
    ...ITEM_QUERY_REMOVALS,
  ].sort(
    (
      firstPhrase,
      secondPhrase,
    ) =>
      secondPhrase.length -
      firstPhrase.length,
  );

  for (const phrase of removals) {
    candidate =
      removeWholePhrase(
        candidate,
        phrase,
      );
  }

  candidate = candidate
    .replace(
      /\b\d+(?:\.\d+)?\s*[km]?\b/gi,
      " ",
    )
    .replace(
      /\b(?:x|times|copies|copy)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

  if (!candidate) {
    return null;
  }

  const candidateWords =
    candidate.split(" ");

  /**
   * Avoid treating full conversational sentences as a pet name. Direct
   * item queries are normally short, while broad sentences should be
   * handled by another intent or clarification layer.
   */
  if (candidateWords.length > 7) {
    return null;
  }

  return candidate;
}

function detectActions(
  normalizedMessage: string,
  pets: PetMessageMatch[],
  tradeQuery: ParsedTradeQuery | null,
  nearbyTargetValue: number | null,
  itemResolution:
    | PetSearchResolution
    | null,
  requestedVariant:
    | PetVariant
    | null,
) {
  const actions =
    new Set<NichMessageAction>();

  const hasComparisonLanguage =
    includesAnyWholePhrase(
      normalizedMessage,
      COMPARISON_PHRASES,
    );

  const hasTradeSideLanguage =
    includesAnyWholePhrase(
      normalizedMessage,
      [
        "me",
        "mine",
        "my offer",
        "your offer",
        "them",
        "their offer",
        "his offer",
        "her offer",
        "offering",
        "looking for",
      ],
    );

  if (
    tradeQuery ||
    hasComparisonLanguage ||
    (
      pets.length >= 2 &&
      hasTradeSideLanguage
    )
  ) {
    actions.add("compare");
  }

  if (tradeQuery) {
    actions.add("trade");
  }

  if (
    nearbyTargetValue !== null &&
    includesAnyWholePhrase(
      normalizedMessage,
      NEARBY_PHRASES,
    )
  ) {
    actions.add("nearby");
  }

  const hasLookupLanguage =
    includesAnyWholePhrase(
      normalizedMessage,
      LOOKUP_PHRASES,
    );

  if (
    (
      pets.length > 0 ||
      itemResolution !== null
    ) &&
    !tradeQuery &&
    nearbyTargetValue === null
  ) {
    actions.add("lookup");
  } else if (
    hasLookupLanguage &&
    !tradeQuery
  ) {
    actions.add("lookup");
  }

  if (
    requestedVariant !== null
  ) {
    actions.add("variant");
  }

  return Array.from(actions);
}

function calculateConfidence(
  pets: PetMessageMatch[],
  itemResolution:
    | PetSearchResolution
    | null,
  tradeQuery:
    | ParsedTradeQuery
    | null,
) {
  if (tradeQuery) {
    /**
     * Parsing a full trade is deterministic, but the item matches inside
     * it may still be fuzzy. Use the lowest detected item confidence.
     */
    const petConfidences =
      pets
        .map(
          (pet) =>
            pet.confidence,
        )
        .filter(
          (
            confidence,
          ): confidence is number =>
            confidence !==
              undefined &&
            Number.isFinite(
              confidence,
            ),
        );

    if (
      petConfidences.length > 0
    ) {
      return Math.min(
        ...petConfidences,
      );
    }

    return 0.9;
  }

  if (pets.length > 0) {
    const confidences =
      pets.map(
        (pet) =>
          pet.confidence ?? 1,
      );

    return Math.min(
      ...confidences,
    );
  }

  if (
    itemResolution?.status ===
    "matched"
  ) {
    return (
      itemResolution.match
        .confidence
    );
  }

  if (
    itemResolution?.status ===
      "ambiguous" &&
    itemResolution.candidates[0]
  ) {
    return Math.min(
      itemResolution
        .candidates[0]
        .confidence,
      0.74,
    );
  }

  return 0;
}

function determinePrimaryIntent(
  actions: NichMessageAction[],
  isGreeting: boolean,
  isHelpRequest: boolean,
  followUpKind:
    NichFollowUpKind,
  clarificationNeeded: boolean,
) {
  if (
    actions.includes("trade") ||
    actions.includes("compare")
  ) {
    return "tradeComparison" as const;
  }

  if (
    actions.includes("nearby")
  ) {
    return "nearbySearch" as const;
  }

  if (
    clarificationNeeded ||
    actions.includes("lookup")
  ) {
    return "itemLookup" as const;
  }

  if (
    followUpKind === "variant"
  ) {
    return "variantFollowUp" as const;
  }

  if (followUpKind) {
    return "conversationFollowUp" as const;
  }

  if (isHelpRequest) {
    return "help" as const;
  }

  if (isGreeting) {
    return "greeting" as const;
  }

  return "unknown" as const;
}

export function analyzeNichMessage(
  message: string,
): NichMessageAnalysis {
  const originalMessage =
    message.trim();

  const normalizedMessage =
    normalizeText(originalMessage);

  const pets =
    findPetsInMessage(
      originalMessage,
    );

  const tradeQuery =
    parseTradeMessage(
      originalMessage,
    );

  const nearbyTargetValue =
    extractNearbyTargetValue(
      originalMessage,
    );

  const requestedVariant =
    detectPetVariant(
      originalMessage,
    ) ?? null;

  const requestedCategory =
    getRequestedCategory(
      normalizedMessage,
    );

  const isGreeting =
    isGreetingMessage(
      normalizedMessage,
    );

  const isHelpRequest =
    isHelpMessage(
      normalizedMessage,
    );

  const followUpKind =
    detectFollowUpKind(
      normalizedMessage,
      requestedVariant,
      pets,
      tradeQuery,
    );

  const itemQuery =
    extractItemQuery(
      normalizedMessage,
      tradeQuery,
      nearbyTargetValue,
      isGreeting,
      isHelpRequest,
      followUpKind,
    );

  const itemResolution =
    itemQuery
      ? resolvePetSearch(
          itemQuery,
          requestedCategory ??
            undefined,
        )
      : null;

  const clarificationNeeded =
    itemResolution?.status ===
    "ambiguous";

  const clarificationCandidates =
    itemResolution?.status ===
    "ambiguous"
      ? itemResolution.candidates
      : [];

  const actions =
    detectActions(
      normalizedMessage,
      pets,
      tradeQuery,
      nearbyTargetValue,
      itemResolution,
      requestedVariant,
    );

  const primaryIntent =
    determinePrimaryIntent(
      actions,
      isGreeting,
      isHelpRequest,
      followUpKind,
      clarificationNeeded,
    );

  const isFollowUp =
    followUpKind !== null;

  return {
    originalMessage,
    normalizedMessage,
    pets,
    numbers:
      extractNumbers(
        originalMessage,
      ),
    actions,
    tradeQuery,
    nearbyTargetValue,

    primaryIntent,
    requestedVariant,
    requestedCategory,
    itemQuery,
    itemResolution,
    clarificationNeeded,
    clarificationCandidates,
    confidence:
      calculateConfidence(
        pets,
        itemResolution,
        tradeQuery,
      ),
    isFollowUp,
    followUpKind,
    requiresContext:
      isFollowUp &&
      pets.length === 0 &&
      !tradeQuery,
    isGreeting,
    isHelpRequest,
    hasMultipleItemReferences:
      pets.length > 1,
    totalDetectedQuantity:
      pets.reduce(
        (total, pet) =>
          total +
          (pet.quantity ?? 1),
        0,
      ),
  };
}

export default analyzeNichMessage;
