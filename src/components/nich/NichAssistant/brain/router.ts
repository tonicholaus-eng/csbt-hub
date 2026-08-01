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

import type {
  NichBrainInput,
  NichResponse,
} from "./types";

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function capitalize(value: string) {
  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}

function createGreetingResponse(): NichResponse {
  return {
    text: [
      "Hey! 👋 I’m Nich, your CSBT trading buddy.",
      "",
      "You can ask me about one pet, several pets, trade comparisons, Pet Wear, or items near a certain value.",
      "",
      "I can also understand many abbreviations, quantities, and common spelling mistakes.",
    ].join("\n"),
    intent: "greeting",
    reaction: "welcome",
    typingDuration: 550,
    suggestions: [
      {
        id: "greeting-pet-values",
        label: "Check multiple items",
        message:
          "How much are Frost Dragon, Owl, and Kangaroo?",
      },
      {
        id: "greeting-compare-trade",
        label: "Compare a trade",
        message:
          "2 Frost Dragons vs 1 Owl",
      },
      {
        id: "greeting-nearby-value",
        label: "Find nearby values",
        message:
          "Find pets around 500 value",
      },
    ],
  };
}

function createHandsomeResponse(): NichResponse {
  return {
    text: "According to my highly accurate calculations... Big Boss Nich. 😎",
    intent: "greeting",
    reaction: "celebrate",
    typingDuration: 700,
    suggestions: [
      {
        id: "handsome-pet-values",
        label: "Check pet values",
        message:
          "What is Frost Dragon worth?",
      },
      {
        id: "handsome-compare",
        label: "Compare a trade",
        message:
          "Frost Dragon for Owl",
      },
      {
        id: "handsome-help",
        label: "What can you do?",
        message:
          "What can you do?",
      },
    ],
  };
}

function createThanksResponse(): NichResponse {
  return {
    text: "Anytime! 😄 Good luck with your trades.",
    intent: "thanks",
    reaction: "celebrate",
    typingDuration: 400,
    suggestions: [
      {
        id: "thanks-another-pet",
        label: "Check more items",
        message:
          "How much are Owl, Crow, and Parrot?",
      },
      {
        id: "thanks-compare",
        label: "Compare another trade",
        message:
          "2 Frost Dragons vs 1 Owl",
      },
    ],
  };
}

function createGoodbyeResponse(): NichResponse {
  return {
    text: "See you later! Good luck trading. 👋",
    intent: "goodbye",
    reaction: "goodbye",
    typingDuration: 400,
  };
}

function createCalculatorResponse(): NichResponse {
  return {
    text: [
      "Here’s how to use the Trade Calculator:",
      "",
      "1. Add the items you are offering under Your Offer.",
      "2. Add the items you are receiving under Their Offer.",
      "3. Choose Normal, Neon, or Mega when that variant is available.",
      "4. Compare both totals and check the Win, Fair, or Lose result.",
      "",
      "Always double-check current values and demand before completing a trade. 🐾",
    ].join("\n"),
    intent: "calculatorHelp",
    reaction: "calculator",
    typingDuration: 700,
    suggestions: [
      {
        id: "calculator-fair-trade",
        label: "What is fair?",
        message:
          "How do I know if a trade is fair?",
      },
      {
        id: "calculator-compare-trade",
        label: "Compare a trade",
        message:
          "2 Frost Dragons vs 1 Owl",
      },
      {
        id: "calculator-pet-value",
        label: "Check item values",
        message:
          "How much are Frost Dragon, Owl, and Kangaroo?",
      },
    ],
  };
}

function createTradeAdviceResponse(): NichResponse {
  return {
    text: [
      "A fair trade is one where both offers have similar total values.",
      "",
      "Small differences can still be fair depending on demand, rarity, and how easy each item is to trade.",
      "",
      "Use the calculator as a guide, but always check current demand before accepting. ⚖️",
    ].join("\n"),
    intent: "tradeAdvice",
    reaction: "calculator",
    typingDuration: 650,
    suggestions: [
      {
        id: "trade-compare-example",
        label: "Compare a trade",
        message:
          "2 Frost Dragons vs 1 Owl",
      },
      {
        id: "trade-calculator-help",
        label: "Use calculator",
        message:
          "How do I use the calculator?",
      },
      {
        id: "trade-check-values",
        label: "Check item values",
        message:
          "How much are Frost Dragon, Owl, and Kangaroo?",
      },
    ],
  };
}

function createHelpResponse(): NichResponse {
  return {
    text: [
      "I can help you with:",
      "",
      "🐾 Checking one or several Pet values",
      "🎩 Checking Pet Wear values",
      "✨ Checking Normal, Neon, or Mega variants",
      "🔢 Understanding quantities such as 2 Frost Dragons",
      "⚖️ Comparing offers for a Win, Fair, or Lose result",
      "🔎 Finding items near a certain value",
      "🧮 Using the Trade Calculator",
      "💬 Remembering items and trades from recent messages",
      "🧭 Finding pages and features on CSBT HUB",
      "",
      "When a name could mean several items, I’ll ask you to choose instead of guessing.",
    ].join("\n"),
    intent: "help",
    reaction: "wave",
    typingDuration: 700,
    suggestions: [
      {
        id: "help-multiple-values",
        label: "Multiple values",
        message:
          "How much are Frost Dragon, Owl, and Kangaroo?",
      },
      {
        id: "help-trade-comparison",
        label: "Compare trade",
        message:
          "2 Frost Dragons vs 1 Owl",
      },
      {
        id: "help-website-pages",
        label: "Website pages",
        message:
          "What pages are on this website?",
      },
    ],
  };
}

function createFallbackResponse(): NichResponse {
  return {
    text: [
      "I couldn’t understand that yet.",
      "",
      "Try giving me one or more item names, comparing two offers, finding items near a value, or asking about the Trade Calculator. 🐾",
      "",
      "Example: “How much are frost drag, owl, and kanga?”",
    ].join("\n"),
    intent: "fallback",
    reaction: "searchEmpty",
    typingDuration: 600,
    suggestions: [
      {
        id: "fallback-help",
        label: "What can you do?",
        message:
          "What can you do?",
      },
      {
        id: "fallback-pets",
        label: "Check multiple items",
        message:
          "How much are Frost Dragon, Owl, and Kangaroo?",
      },
      {
        id: "fallback-trade",
        label: "Compare trade",
        message:
          "2 Frost Dragons vs 1 Owl",
      },
    ],
  };
}

function getCategoryLabel(
  category: "PET" | "PETWEAR",
) {
  return category === "PETWEAR"
    ? "Pet Wear"
    : "Pet";
}

function getVariantLabel(
  analysis: NichMessageAnalysis,
  category: "PET" | "PETWEAR",
) {
  if (
    category === "PETWEAR" ||
    !analysis.requestedVariant
  ) {
    return "";
  }

  return `${capitalize(
    analysis.requestedVariant,
  )} `;
}

function createClarificationResponse(
  analysis: NichMessageAnalysis,
): NichResponse {
  const candidates =
    analysis.clarificationCandidates
      .slice(0, 5);

  const query =
    analysis.itemQuery ||
    analysis.originalMessage;

  const candidateLines =
    candidates.map(
      (candidate, index) =>
        `${index + 1}. ${candidate.pet.NAME} — ${getCategoryLabel(
          candidate.pet.CATEGORY,
        )}`,
    );

  return {
    text: [
      `I found several possible matches for “${query}.”`,
      "",
      ...candidateLines,
      "",
      "Which one did you mean?",
    ].join("\n"),
    intent: "petLookup",
    reaction: "searchEmpty",
    typingDuration:
      Math.min(
        650 +
          candidates.length * 90,
        1100,
      ),
    suggestions:
      candidates
        .slice(0, 3)
        .map(
          (candidate, index) => ({
            id:
              `clarify-item-${candidate.pet.ID}-${index}`,
            label:
              candidate.pet.CATEGORY ===
              "PETWEAR"
                ? `${candidate.pet.NAME} · Pet Wear`
                : candidate.pet.NAME,
            message:
              `What is ${getVariantLabel(
                analysis,
                candidate.pet.CATEGORY,
              )}${candidate.pet.NAME} worth?`,
          }),
        ),
  };
}

function createContextNeededResponse(
  analysis: NichMessageAnalysis,
): NichResponse {
  const variantLabel =
    analysis.requestedVariant
      ? capitalize(
          analysis.requestedVariant,
        )
      : null;

  const lines =
    variantLabel
      ? [
          `I understand that you mean the ${variantLabel} variant, but I don’t have a recent item to apply it to.`,
          "",
          `Include the item name, for example: “What is ${variantLabel} Frost Dragon worth?”`,
        ]
      : [
          "I understand that this is a follow-up, but I don’t have a recent item or trade to apply it to.",
          "",
          "Include the item name or the full trade so I can answer correctly.",
        ];

  return {
    text: lines.join("\n"),
    intent: "petLookup",
    reaction: "searchEmpty",
    typingDuration: 600,
    suggestions: [
      {
        id: "context-needed-value",
        label:
          variantLabel
            ? `Check ${variantLabel} Frost`
            : "Check Frost Dragon",
        message:
          variantLabel
            ? `What is ${variantLabel} Frost Dragon worth?`
            : "What is Frost Dragon worth?",
      },
      {
        id: "context-needed-trade",
        label: "Compare a trade",
        message:
          "2 Frost Dragons vs 1 Owl",
      },
    ],
  };
}

function createItemNotFoundResponse(
  analysis: NichMessageAnalysis,
): NichResponse {
  const query =
    analysis.itemQuery ||
    analysis.originalMessage;

  const categoryText =
    analysis.requestedCategory ===
    "PETWEAR"
      ? "Pet Wear item"
      : analysis.requestedCategory ===
          "PET"
        ? "Pet"
        : "item";

  return {
    text: [
      `I couldn’t find a matching ${categoryText} for “${query}.”`,
      "",
      "Try the complete official name, a common abbreviation, or check the spelling.",
      "",
      "Examples:",
      "• Frost Dragon",
      "• NFR Turtle",
      "• Pet Wear value of Cowboy Hat",
    ].join("\n"),
    intent: "petLookup",
    reaction: "searchEmpty",
    typingDuration: 650,
    suggestions: [
      {
        id: "not-found-frost",
        label: "Try Frost Dragon",
        message:
          "What is Frost Dragon worth?",
      },
      {
        id: "not-found-petwear",
        label: "Try Pet Wear",
        message:
          "Show me Pet Wear values",
      },
      {
        id: "not-found-help",
        label: "What can you do?",
        message:
          "What can you do?",
      },
    ],
  };
}

function isGreeting(message: string) {
  return (
    message === "hi" ||
    message === "hello" ||
    message === "hey" ||
    message === "hiya" ||
    message === "yo" ||
    message === "good morning" ||
    message === "good afternoon" ||
    message === "good evening" ||
    message.startsWith("hi nich") ||
    message.startsWith("hello nich") ||
    message.startsWith("hey nich")
  );
}

function isHandsomeQuestion(message: string) {
  return (
    message === "whos handsome" ||
    message === "who is handsome" ||
    message === "who handsome" ||
    message === "whos the most handsome" ||
    message === "who is the most handsome" ||
    message === "whos pogi" ||
    message === "who is pogi" ||
    message === "sino pogi" ||
    message === "sino ang pogi" ||
    message === "sino pinaka pogi" ||
    message === "sino ang pinaka pogi" ||
    message.includes(
      "who do you think is handsome",
    ) ||
    message.includes(
      "who is the handsomest",
    ) ||
    message.includes(
      "sino ang handsome",
    )
  );
}

function isThanks(message: string) {
  return (
    message === "thanks" ||
    message === "thank you" ||
    message === "thank u" ||
    message === "ty" ||
    message === "salamat" ||
    message.includes("thanks nich") ||
    message.includes(
      "thank you nich",
    )
  );
}

function isGoodbye(message: string) {
  return (
    message === "bye" ||
    message === "goodbye" ||
    message === "see you" ||
    message === "cya" ||
    message.includes(
      "see you later",
    ) ||
    message.includes(
      "later nich",
    )
  );
}

function isCalculatorHelp(message: string) {
  return (
    message.includes(
      "how to use the calculator",
    ) ||
    message.includes(
      "how do i use the calculator",
    ) ||
    message.includes(
      "calculator help",
    ) ||
    message.includes(
      "how to trade",
    )
  );
}

function isTradeAdvice(message: string) {
  return (
    message.includes(
      "what is a fair trade",
    ) ||
    message.includes(
      "how do i know if a trade is fair",
    ) ||
    message.includes(
      "win fair lose",
    ) ||
    message.includes(
      "explain trade values",
    )
  );
}

function isHelpRequest(message: string) {
  return (
    message === "help" ||
    message === "help me" ||
    message === "commands" ||
    message.includes(
      "what can you do",
    ) ||
    message.includes(
      "what can i ask you",
    ) ||
    message.includes(
      "show examples",
    )
  );
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
      lastUserMessage:
        originalMessage,
      lastResolvedMessage:
        resolvedMessage,
    },
  };
}

function runFeatureIntent(
  intent: NichFeatureIntent,
  input: NichBrainInput,
  analysis: NichMessageAnalysis,
): NichResponse | null {
  switch (intent) {
    case "tradeComparison":
      return createTradeComparisonResponse(
        input,
        analysis,
      );

    case "nearbyValue":
      return createNearbyPetsResponse(
        input,
        analysis,
      );

    case "petLookup":
      return createPetLookupResponse(
        input,
        analysis,
      );
  }
}

function runScoredFeatureRoutes(
  input: NichBrainInput,
  analysis: NichMessageAnalysis,
): NichResponse | null {
  const candidates =
    scoreFeatureIntents(analysis);

  for (const candidate of candidates) {
    const response =
      runFeatureIntent(
        candidate.intent,
        input,
        analysis,
      );

    if (response) {
      return response;
    }
  }

  return null;
}

function didContextResolverChangeMessage(
  originalMessage: string,
  resolvedMessage: string,
) {
  return (
    normalizeText(
      originalMessage,
    ) !==
    normalizeText(
      resolvedMessage,
    )
  );
}

export function routeNichMessage(
  input: NichBrainInput,
): NichResponse {
  const originalMessage =
    input.message.trim();

  /**
   * Analyze the user's original wording before context resolution. This lets
   * the router recognize unresolved follow-ups such as "what about neon?"
   */
  const originalAnalysis =
    analyzeNichMessage(
      originalMessage,
    );

  const resolution =
    resolveContextualMessage(input);

  const resolvedInput:
    NichBrainInput = {
      message: resolution.message,
      context: input.context,
    };

  /**
   * Analyze the resolved message as the authoritative version for value
   * lookups and trade calculations.
   */
  const analysis =
    analyzeNichMessage(
      resolvedInput.message,
    );

  const normalizedMessage =
    normalizeText(
      resolution.message,
    );

  const contextWasApplied =
    didContextResolverChangeMessage(
      originalMessage,
      resolution.message,
    );

  let response: NichResponse;

  if (!normalizedMessage) {
    response =
      createFallbackResponse();
  } else if (
    isGreeting(normalizedMessage) ||
    analysis.isGreeting
  ) {
    response =
      createGreetingResponse();
  } else if (
    isHandsomeQuestion(
      normalizedMessage,
    )
  ) {
    response =
      createHandsomeResponse();
  } else if (
    isThanks(normalizedMessage)
  ) {
    response =
      createThanksResponse();
  } else if (
    isGoodbye(normalizedMessage)
  ) {
    response =
      createGoodbyeResponse();
  } else if (
    isCalculatorHelp(
      normalizedMessage,
    )
  ) {
    response =
      createCalculatorResponse();
  } else if (
    isTradeAdvice(
      normalizedMessage,
    )
  ) {
    response =
      createTradeAdviceResponse();
  } else if (
    isHelpRequest(
      normalizedMessage,
    ) ||
    analysis.isHelpRequest
  ) {
    response =
      createHelpResponse();
  } else {
    const websiteResponse =
      createWebsiteKnowledgeResponse(
        resolvedInput.message,
      );

    if (websiteResponse) {
      response = websiteResponse;
    } else if (
      analysis.clarificationNeeded
    ) {
      /**
       * Ambiguous names are handled before petLookup so Nich does not choose
       * the wrong item with false confidence.
       */
      response =
        createClarificationResponse(
          analysis,
        );
    } else if (
      originalAnalysis.requiresContext &&
      !contextWasApplied
    ) {
      /**
       * A follow-up with no usable conversation context receives a clear
       * request for the missing item or trade.
       */
      response =
        createContextNeededResponse(
          originalAnalysis,
        );
    } else if (
      analysis.primaryIntent ===
        "itemLookup" &&
      analysis.itemResolution
        ?.status === "notFound" &&
      analysis.pets.length === 0
    ) {
      response =
        createItemNotFoundResponse(
          analysis,
        );
    } else {
      response =
        runScoredFeatureRoutes(
          resolvedInput,
          analysis,
        ) ??
        createSmartFallbackResponse(
          resolvedInput,
          analysis,
        );
    }
  }

  return attachConversationMetadata(
    response,
    originalMessage,
    resolution.message,
  );
}

export default routeNichMessage;
