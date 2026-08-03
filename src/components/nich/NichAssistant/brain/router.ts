import resolveContextualMessage from "./contextResolver";
import {
  analyzeNichMessage,
  type NichMessageAnalysis,
} from "./messageAnalysis";
import {
  scoreFeatureIntents,
  type NichFeatureIntent,
} from "./intentScoring";
import createNearbyPetsResponse from "./nearbyPets";
import createPetLookupResponse from "./petLookup";
import createTradeComparisonResponse from "./tradeComparison";
import createSmartFallbackResponse from "./smartFallback";
import createWebsiteKnowledgeResponse from "./websiteKnowledge";
import { includesAnyWholePhrase, isExactPhrase, normalizeText } from "./language";
import type { NichBrainInput, NichResponse } from "./types";

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function createGreetingResponse(): NichResponse {
  return {
    text: [
      "Hey! 👋 I’m Nich, your CSBT trading assistant.",
      "",
      "Ask me for GCash or Elve Shark item values, W/F/L comparisons, nearby-value matches, trading advice, or help finding a CSBT HUB page.",
    ].join("\n"),
    intent: "greeting",
    reaction: "welcome",
    typingDuration: 350,
    suggestions: [
      {
        id: "greeting-values",
        label: "Check multiple items",
        message: "How much are Frost Dragon, Owl, and Kangaroo?",
      },
      {
        id: "greeting-trade",
        label: "Compare a trade",
        message: "2 Frost Dragons vs 1 Owl",
      },
      {
        id: "greeting-advice",
        label: "Trading advice",
        message: "Why can demand matter more than value?",
      },
    ],
  };
}

function createThanksResponse(): NichResponse {
  return {
    text: "Anytime! 😄 Good luck with your trades.",
    intent: "thanks",
    reaction: "celebrate",
    typingDuration: 250,
    suggestions: [
      {
        id: "thanks-values",
        label: "Check more items",
        message: "How much are Owl, Crow, and Parrot?",
      },
      {
        id: "thanks-trade",
        label: "Compare another trade",
        message: "2 Frost Dragons vs 1 Owl",
      },
    ],
  };
}

function createGoodbyeResponse(): NichResponse {
  return {
    text: "See you later! Good luck trading. 👋",
    intent: "goodbye",
    reaction: "goodbye",
    typingDuration: 250,
  };
}

function createHandsomeResponse(): NichResponse {
  return {
    text: "According to my highly accurate calculations... Big Boss Nich. 😎",
    intent: "greeting",
    reaction: "celebrate",
    typingDuration: 350,
  };
}

function createCalculatorResponse(): NichResponse {
  return {
    text: [
      "To use the Trade Calculator:",
      "",
      "1. Choose either GCash or Elve Shark values at the top.",
      "2. Add what you are giving under Your Offer.",
      "3. Add what you are receiving under Their Offer.",
      "4. Select the correct Regular, Neon, or Mega variant.",
      "5. Review both totals and the W/F/L result.",
      "",
      "Treat the calculator as a value guide—demand and tradeability can still change the real quality of a trade.",
    ].join("\n"),
    intent: "calculatorHelp",
    reaction: "calculator",
    typingDuration: 500,
    suggestions: [
      {
        id: "calculator-open",
        label: "Open Calculator",
        message: "Open the Calculator",
      },
      {
        id: "calculator-example",
        label: "Compare a trade",
        message: "Frost Dragon for Owl",
      },
    ],
  };
}

function createBasicTradeAdviceResponse(): NichResponse {
  return {
    text: [
      "A fair trade has similar calculated value on both sides, but value is only one part of the decision.",
      "",
      "Also compare demand, how easy each item is to retrade, whether one side is a large downgrade, and whether the offer depends on weak or uncertain items.",
    ].join("\n"),
    intent: "tradeAdvice",
    reaction: "calculator",
    typingDuration: 450,
    suggestions: [
      {
        id: "advice-demand",
        label: "Demand vs value",
        message: "Why can demand matter more than value?",
      },
      {
        id: "advice-compare",
        label: "Compare a trade",
        message: "Frost Dragon for Owl",
      },
    ],
  };
}

function createHelpResponse(): NichResponse {
  return {
    text: [
      "I can help with:",
      "",
      "🐾 Separate GCash and Elve Shark values",
      "✨ Regular, Neon, and Mega variants",
      "⚖️ Multi-item W/F/L comparisons",
      "🔎 Items near a target value",
      "💬 Follow-ups such as “the second one” or “make them all Mega”",
      "🧠 Demand, upgrades, downgrades, negotiation, and trade-safety advice",
      "🧭 CSBT HUB page navigation",
      "",
      "For exact values, I use the CSBT database instead of guessing, and I always identify which value system was used.",
    ].join("\n"),
    intent: "help",
    reaction: "wave",
    typingDuration: 500,
    suggestions: [
      {
        id: "help-values",
        label: "Multiple values",
        message: "How much are Frost Dragon, Owl, and Kangaroo?",
      },
      {
        id: "help-trade",
        label: "Compare trade",
        message: "2 Frost Dragons vs 1 Owl",
      },
      {
        id: "help-pages",
        label: "Website pages",
        message: "What pages are on this website?",
      },
    ],
  };
}

function createFallbackResponse(): NichResponse {
  return {
    text: "Send an item name, a two-sided trade, a target value, or a specific trading question and I’ll work from there.",
    intent: "fallback",
    reaction: "searchEmpty",
    typingDuration: 300,
  };
}

function getCategoryLabel(category: "PET" | "PETWEAR"): string {
  return category === "PETWEAR" ? "Pet Wear" : "Pet";
}

function getVariantLabel(
  analysis: NichMessageAnalysis,
  category: "PET" | "PETWEAR",
): string {
  return category === "PETWEAR" || !analysis.requestedVariant
    ? ""
    : `${capitalize(analysis.requestedVariant)} `;
}

function createClarificationResponse(
  analysis: NichMessageAnalysis,
): NichResponse {
  const candidates = analysis.clarificationCandidates.slice(0, 5);
  const query = analysis.itemQuery || analysis.originalMessage;

  return {
    text: [
      `I found several possible matches for “${query}.”`,
      "",
      ...candidates.map(
        (candidate, index) =>
          `${index + 1}. ${candidate.pet.NAME} — ${getCategoryLabel(candidate.pet.CATEGORY)}`,
      ),
      "",
      "Which one did you mean?",
    ].join("\n"),
    intent: "petLookup",
    reaction: "searchEmpty",
    typingDuration: 450,
    suggestions: candidates.slice(0, 3).map((candidate, index) => ({
      id: `clarify-${candidate.pet.ID}-${index}`,
      label:
        candidate.pet.CATEGORY === "PETWEAR"
          ? `${candidate.pet.NAME} · Pet Wear`
          : candidate.pet.NAME,
      message: `What is ${getVariantLabel(
        analysis,
        candidate.pet.CATEGORY,
      )}${candidate.pet.NAME} worth?`,
    })),
  };
}

function createContextNeededResponse(
  analysis: NichMessageAnalysis,
  expired: boolean,
): NichResponse {
  const variant = analysis.requestedVariant
    ? capitalize(analysis.requestedVariant)
    : null;

  return {
    text: [
      expired
        ? "That earlier context has expired, so I need the item or trade again."
        : variant
          ? `I understand the ${variant} variant, but I don’t have a recent item to apply it to.`
          : "I understand that this is a follow-up, but I don’t have a recent item or trade to apply it to.",
      "",
      variant
        ? `Example: “What is ${variant} Frost Dragon worth?”`
        : "Include the item name or the complete two-sided trade.",
    ].join("\n"),
    intent: "petLookup",
    reaction: "searchEmpty",
    typingDuration: 400,
    suggestions: [
      {
        id: "context-value",
        label: variant ? `Check ${variant} Frost` : "Check Frost Dragon",
        message: variant
          ? `What is ${variant} Frost Dragon worth?`
          : "What is Frost Dragon worth?",
      },
      {
        id: "context-trade",
        label: "Compare a trade",
        message: "2 Frost Dragons vs 1 Owl",
      },
    ],
  };
}

function createItemNotFoundResponse(
  analysis: NichMessageAnalysis,
): NichResponse {
  const query = analysis.itemQuery || analysis.originalMessage;
  const category =
    analysis.requestedCategory === "PETWEAR"
      ? "Pet Wear item"
      : analysis.requestedCategory === "PET"
        ? "pet"
        : "item";

  return {
    text: [
      `I couldn’t find a matching ${category} for “${query}.”`,
      "",
      "Try the complete official name, a common abbreviation, or a corrected spelling.",
    ].join("\n"),
    intent: "petLookup",
    reaction: "searchEmpty",
    typingDuration: 400,
    suggestions: [
      {
        id: "not-found-frost",
        label: "Try Frost Dragon",
        message: "What is Frost Dragon worth?",
      },
      {
        id: "not-found-petwear",
        label: "Try Pet Wear",
        message: "What is Cowboy Hat worth?",
      },
    ],
  };
}

function isThanks(message: string): boolean {
  return isExactPhrase(message, [
    "thanks",
    "thank you",
    "thank u",
    "ty",
    "salamat",
    "thanks nich",
    "thank you nich",
  ]);
}

function isGoodbye(message: string): boolean {
  return isExactPhrase(message, [
    "bye",
    "goodbye",
    "see you",
    "cya",
    "see you later",
    "later nich",
  ]);
}

function isHandsomeQuestion(message: string): boolean {
  return includesAnyWholePhrase(message, [
    "whos handsome",
    "who is handsome",
    "whos the most handsome",
    "who is the most handsome",
    "whos pogi",
    "who is pogi",
    "sino pogi",
    "sino ang pogi",
    "sino pinaka pogi",
    "sino ang pinaka pogi",
  ]);
}

function isCalculatorHelp(message: string): boolean {
  return includesAnyWholePhrase(message, [
    "how to use the calculator",
    "how do i use the calculator",
    "calculator help",
    "how does the calculator work",
  ]);
}

function isBasicTradeAdvice(message: string): boolean {
  return includesAnyWholePhrase(message, [
    "what is a fair trade",
    "how do i know if a trade is fair",
    "explain trade values",
    "what does win fair lose mean",
  ]);
}

function runFeatureIntent(
  intent: NichFeatureIntent,
  input: NichBrainInput,
  analysis: NichMessageAnalysis,
): NichResponse | null {
  switch (intent) {
    case "tradeComparison":
      return createTradeComparisonResponse(input, analysis);
    case "nearbyValue":
      return createNearbyPetsResponse(input, analysis);
    case "petLookup":
      return createPetLookupResponse(input, analysis);
  }
}

function runScoredFeatureRoutes(
  input: NichBrainInput,
  analysis: NichMessageAnalysis,
): NichResponse | null {
  for (const candidate of scoreFeatureIntents(analysis)) {
    const response = runFeatureIntent(candidate.intent, input, analysis);
    if (response) return response;
  }
  return null;
}

function attachConversationMetadata(
  response: NichResponse,
  originalMessage: string,
  resolvedMessage: string,
): NichResponse {
  return {
    ...response,
    context: {
      ...response.context,
      lastUserMessage: originalMessage,
      lastResolvedMessage: resolvedMessage,
    },
  };
}

export function routeNichMessage(input: NichBrainInput): NichResponse {
  const originalMessage = input.message.trim();
  const originalAnalysis = analyzeNichMessage(originalMessage);
  const resolution = resolveContextualMessage(input);
  const resolvedInput: NichBrainInput = {
    message: resolution.message,
    context: input.context,
  };
  const analysis = analyzeNichMessage(resolvedInput.message);
  const normalized = normalizeText(resolvedInput.message);

  let response: NichResponse;

  if (!normalized) {
    response = createFallbackResponse();
  } else if (analysis.isGreeting) {
    response = createGreetingResponse();
  } else if (isHandsomeQuestion(normalized)) {
    response = createHandsomeResponse();
  } else if (isThanks(normalized)) {
    response = createThanksResponse();
  } else if (isGoodbye(normalized)) {
    response = createGoodbyeResponse();
  } else {
    const websiteResponse = createWebsiteKnowledgeResponse(resolvedInput.message);

    if (websiteResponse) {
      response = websiteResponse;
    } else if (isCalculatorHelp(normalized)) {
      response = createCalculatorResponse();
    } else if (isBasicTradeAdvice(normalized)) {
      response = createBasicTradeAdviceResponse();
    } else if (analysis.isHelpRequest) {
      response = createHelpResponse();
    } else if (analysis.clarificationNeeded) {
      response = createClarificationResponse(analysis);
    } else if (
      originalAnalysis.requiresContext &&
      !resolution.usedContext
    ) {
      response = createContextNeededResponse(originalAnalysis, resolution.expired);
    } else if (
      analysis.primaryIntent === "itemLookup" &&
      analysis.itemResolution?.status === "notFound" &&
      analysis.pets.length === 0
    ) {
      response = createItemNotFoundResponse(analysis);
    } else {
      response =
        runScoredFeatureRoutes(resolvedInput, analysis) ??
        createSmartFallbackResponse(resolvedInput, analysis);
    }
  }

  return attachConversationMetadata(response, originalMessage, resolution.message);
}

export default routeNichMessage;
