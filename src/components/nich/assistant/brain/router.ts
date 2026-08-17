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
import handleActiveTradeMessage from "./activeTrade";
import createLocalIntelligenceResponse, {
  enhanceTradeResponseLocally,
} from "./localIntelligence";

import type {
  NichBrainInput,
  NichResponse,
} from "./types";
import { normalizeLocalChatMessage } from "./language";

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


function looksLikeExplicitTwoSidedTrade(message: string) {
  const normalized = normalizeText(message);
  if (!normalized) return false;

  if (/^(?:wfl|w f l|win fair lose)\b/.test(normalized)) return true;

  const startsWithYourSide = /^(?:me|mine|my offer|my side|i give|i offer|i am giving|im giving|ako|akin|side ko|bigay ko|offer ko)\b/.test(normalized);
  const containsTheirSide = /\b(?:them|theirs|their offer|their side|him|his offer|her offer|they give|they offer|kanya|kanila|side nya|side niya|bigay nya|bigay niya|offer nya|offer niya)\b/.test(normalized);

  return startsWithYourSide && containsTheirSide;
}

function capitalize(value: string) {
  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}

type NichLanguageTone =
  | "english"
  | "taglish";

const TAGALOG_TONE_WORDS = new Set([
  "ako",
  "alin",
  "ano",
  "ba",
  "dito",
  "ganito",
  "gano",
  "ikaw",
  "kaya",
  "ko",
  "lang",
  "magkano",
  "mas",
  "mo",
  "naman",
  "ngayon",
  "para",
  "paano",
  "po",
  "sakin",
  "salamat",
  "siya",
  "sila",
  "yung",
  "yan",
  "yun",
]);

function detectLanguageTone(
  message: string,
): NichLanguageTone {
  const words =
    normalizeText(message).split(" ");

  return words.some((word) =>
    TAGALOG_TONE_WORDS.has(word),
  )
    ? "taglish"
    : "english";
}

function stableChoice<T>(
  choices: readonly T[],
  seed: string,
): T {
  let hash = 0;

  for (
    let index = 0;
    index < seed.length;
    index += 1
  ) {
    hash =
      (hash * 31 +
        seed.charCodeAt(index)) |
      0;
  }

  return choices[
    Math.abs(hash) % choices.length
  ];
}

function styleGenericResponse(
  response: NichResponse,
  originalMessage: string,
): NichResponse {
  const tone =
    detectLanguageTone(originalMessage);

  if (
    response.intent === "greeting" &&
    response.reaction === "welcome"
  ) {
    const text =
      tone === "taglish"
        ? stableChoice(
            [
              "Uy, hello! 👋 Anong pet or trade ang iche-check natin?",
              "Hi! Send mo lang yung pet or trade—check natin.",
              "Hey! 👋 Anong value or WFL ang kailangan mo?",
            ],
            originalMessage,
          )
        : stableChoice(
            [
              "Hey! 👋 What pet or trade are we checking?",
              "Hi! Send me a pet, value question, or trade.",
              "Hey! What do you want me to check today?",
            ],
            originalMessage,
          );

    return {
      ...response,
      text,
    };
  }

  if (response.intent === "thanks") {
    return {
      ...response,
      text:
        tone === "taglish"
          ? stableChoice(
              [
                "No problem 😄",
                "Sure, anytime!",
                "Walang problema—good luck sa trade!",
              ],
              originalMessage,
            )
          : stableChoice(
              [
                "No problem 😄",
                "Anytime!",
                "You got it—good luck trading.",
              ],
              originalMessage,
            ),
    };
  }

  if (response.intent === "goodbye") {
    return {
      ...response,
      text:
        tone === "taglish"
          ? "Sige, ingat! Good luck sa trades 👋"
          : "See you! Good luck with your trades 👋",
    };
  }

  if (
    response.intent === "fallback" &&
    /(?:didn.t fully|get that|couldn.t understand)/i.test(
      response.text,
    )
  ) {
    return {
      ...response,
      text:
        tone === "taglish"
          ? [
              "Di ko lang na-gets nang buo.",
              "",
              "Send mo yung pet name or buong trade, halimbawa: “2 FD vs Owl, WFL?”",
            ].join("\n")
          : [
              "I didn’t fully get that.",
              "",
              "Send the pet name or the full trade, for example: “2 FD vs Owl, WFL?”",
            ].join("\n"),
    };
  }

  return response;
}

function calculateTypingDuration(
  text: string,
  intent: NichResponse["intent"],
) {
  const intentDelay =
    intent === "tradeComparison"
      ? 420
      : intent === "nearbyValue"
        ? 330
        : intent === "petLookup"
          ? 260
          : 180;

  return Math.min(
    1_900,
    Math.max(
      320,
      intentDelay +
        Math.min(text.length, 220) * 6,
    ),
  );
}

function createGreetingResponse(): NichResponse {
  return {
    text: [
      "Hey! 👋 What are we checking?",
      "",
      "Send a pet name, an abbreviation like FD or SSBD, or a full trade.",
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
      "A trade can be fair even when the totals aren’t perfectly equal.",
      "",
      "Check the value gap first, then consider demand, how easy each item is to trade, and whether you’re upgrading or downgrading.",
      "",
      "Send me the full offer and I’ll break it down.",
    ].join("\n"),
    intent: "tradeAdvice",
    reaction: "calculator",
    localConfidence: 0.99,
    aiEligible: false,
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
      "🎒 Reading your saved Inventory and checking what you can afford",
      "🧠 Building optimized offers from items you actually own",
      "⭐ Ranking which Wishlist target you’re closest to",
      "🔁 Finding CSBT Exchange listings that fit your inventory",
      "📈 Checking recent value movement for saved items",
      "💧 Comparing demand/liquidity and spotting upgrades vs downgrades",
      "🛠️ Fixing an unfair trade with a local counteroffer suggestion",
      "👤 Using your saved trading preferences and trade history",
      "💬 Remembering items and trades from recent messages",
      "🧩 Remembering offer constraints like ‘don’t use Turtle’ or ‘high demand only’",
      "🧭 Finding pages and features on CSBT HUB",
      "",
      "When a name could mean several items, I’ll ask you to choose instead of guessing.",
      "You can type naturally too: ‘can my inv afford owl’, ‘build me an owl offer without turtle’, or ‘find exchange trades I can do’.",
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
      "I didn’t fully get that.",
      "",
      "Send the pet name or the full trade.",
      "",
      "Example: “2 FD vs Owl, WFL?”",
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

type NichItemCategory = Exclude<NichMessageAnalysis["requestedCategory"], null>;

function getCategoryLabel(
  category: NichItemCategory,
) {
  switch (category) {
    case "PETWEAR":
      return "Pet Wear";
    case "EGG":
      return "Egg";
    case "VEHICLE":
      return "Vehicle";
    case "FOOD":
      return "Food";
    case "GIFT":
      return "Gift";
    case "STROLLER":
      return "Stroller";
    case "TOY":
      return "Toy";
    case "STICKER":
      return "Sticker";
    case "OTHER":
      return "Other item";
    default:
      return "Pet";
  }
}

function getVariantLabel(
  analysis: NichMessageAnalysis,
  category: NichItemCategory,
) {
  if (
    category !== "PET" ||
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
      `I found a few possible matches for “${query}”:`,
      "",
      ...candidateLines,
      "",
      "Which one are you referring to?",
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
              candidate.pet.CATEGORY === "PET"
                ? candidate.pet.NAME
                : `${candidate.pet.NAME} · ${getCategoryLabel(candidate.pet.CATEGORY)}`,
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
          `You mean the ${variantLabel} version, but I’m missing the item name.`,
          "",
          `Try: “${variantLabel} Frost Dragon value.”`,
        ]
      : [
          "I know that’s a follow-up, but I don’t have a recent item or trade to connect it to.",
          "",
          "Send the item name or the full trade again.",
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

  const categoryText = analysis.requestedCategory
    ? getCategoryLabel(analysis.requestedCategory)
    : "item";

  return {
    text: [
      `I couldn’t match “${query}” to a ${categoryText}.`,
      "",
      "Try the full name, a common abbreviation, or a slightly different spelling.",
      "",
      "Examples: FD, NFR Turtle, or Cowboy Hat.",
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
    message === "hi po" ||
    message === "hello po" ||
    message === "uy" ||
    message === "oy" ||
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
    message === "tysm" ||
    message === "salamat" ||
    message === "salamat po" ||
    message === "thankyou" ||
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
    message === "bb" ||
    message === "gtg" ||
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
    ) ||
    message === "fair ba" ||
    message === "win ba" ||
    message === "lugi ba" ||
    message === "wfl ba"
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
    ) ||
    message.includes(
      "ano kaya mo",
    ) ||
    message.includes(
      "anong kaya mo",
    )
  );
}

function attachConversationMetadata(
  response: NichResponse,
  originalMessage: string,
  resolvedMessage: string,
): NichResponse {
  const styledResponse =
    styleGenericResponse(
      response,
      originalMessage,
    );

  return {
    ...styledResponse,
    typingDuration:
      calculateTypingDuration(
        styledResponse.text,
        styledResponse.intent,
      ),
    context: {
      ...styledResponse.context,
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
  const locallyNormalizedMessage =
    normalizeLocalChatMessage(originalMessage);

  // Structured screenshot/manual trade state gets first chance to interpret
  // corrections, side/variant edits, undo, and what-if follow-ups. This prevents
  // a casual correction from being treated as an unrelated new chat message.
  const activeTradeResponse = handleActiveTradeMessage({
    ...input,
    message: locallyNormalizedMessage,
  });
  if (activeTradeResponse) {
    return attachConversationMetadata(
      activeTradeResponse,
      originalMessage,
      locallyNormalizedMessage,
    );
  }

  /**
   * Analyze the user's cleaned chat wording before context resolution. This
   * fixes harmless compact typing (hmfd, wflme, mfrparrot, etc.) locally while
   * preserving the original message for display/memory.
   */
  const originalAnalysis =
    analyzeNichMessage(
      locallyNormalizedMessage,
    );

  const resolution =
    resolveContextualMessage({
      ...input,
      message: locallyNormalizedMessage,
    });

  const resolvedInput:
    NichBrainInput = {
      message: normalizeLocalChatMessage(resolution.message),
      context: input.context,
      localData: input.localData,
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
    // A fully parsed two-sided trade is authoritative and should win before
    // broader local-profile intents. This prevents casual phrases such as
    // “bigay ko ... kuha ko ...” from being mistaken for inventory commands.
    const directTradeResponse =
      (
        analysis.primaryIntent === "tradeComparison" ||
        (analysis.hasTradeStructure && looksLikeExplicitTwoSidedTrade(resolvedInput.message))
      )
        ? createTradeComparisonResponse(resolvedInput, analysis)
        : null;

    if (directTradeResponse) {
      response = directTradeResponse;
    } else {
    const localIntelligenceResponse =
      createLocalIntelligenceResponse(
        resolvedInput,
      );

    if (localIntelligenceResponse) {
      response = localIntelligenceResponse;
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
    }
  }

  if (response.tradeComparison) {
    response = enhanceTradeResponseLocally(
      response,
      resolvedInput,
    );
  }

  return attachConversationMetadata(
    response,
    originalMessage,
    resolvedInput.message,
  );
}

export default routeNichMessage;