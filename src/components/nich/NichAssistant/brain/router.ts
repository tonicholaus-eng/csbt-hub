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

function createGreetingResponse(): NichResponse {
  return {
    text: [
      "Hey! 👋 I’m Nich, your CSBT trading buddy.",
      "",
      "You can ask me about one pet, several pets, trade comparisons, or pets near a certain value.",
    ].join("\n"),
    intent: "greeting",
    reaction: "welcome",
    typingDuration: 500,
    suggestions: [
      {
        id: "greeting-pet-values",
        label: "Check multiple pets",
        message:
          "How much are Frost Dragon, Owl, and Kangaroo?",
      },
      {
        id: "greeting-compare-trade",
        label: "Compare a trade",
        message: "Frost Dragon for Owl",
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
        message: "Frost Dragon for Owl",
      },
      {
        id: "handsome-help",
        label: "What can you do?",
        message: "What can you do?",
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
        label: "Check more pets",
        message:
          "How much are Owl, Crow, and Parrot?",
      },
      {
        id: "thanks-compare",
        label: "Compare a trade",
        message: "Frost Dragon for Owl",
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
      "1. Add the pets you are offering under Your Offer.",
      "2. Add the pets you are receiving under Their Offer.",
      "3. Choose Normal, Neon, or Mega for each pet.",
      "4. Compare both totals and check the Win, Fair, or Lose result.",
      "",
      "Always double-check values before completing a trade. 🐾",
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
        message: "Frost Dragon for Owl",
      },
      {
        id: "calculator-pet-value",
        label: "Check pet values",
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
      "Small differences can still be fair depending on demand, rarity, and how easy a pet is to trade.",
      "",
      "Use the calculator as a guide, but always check current demand before accepting. ⚖️",
    ].join("\n"),
    intent: "tradeAdvice",
    reaction: "calculator",
    typingDuration: 650,
    suggestions: [
      {
        id: "trade-compare-example",
        label: "Compare pets",
        message: "Frost Dragon for Owl",
      },
      {
        id: "trade-calculator-help",
        label: "Use calculator",
        message:
          "How do I use the calculator?",
      },
      {
        id: "trade-check-values",
        label: "Check pet values",
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
      "🐾 Checking one or several pet values",
      "✨ Checking Normal, Neon, or Mega values",
      "⚖️ Comparing pets for a Win, Fair, or Lose result",
      "🔎 Finding pets near a certain value",
      "🧮 Using the Trade Calculator",
      "💬 Remembering pets from recent messages",
      "🧭 Finding pages and features on CSBT HUB",
      "",
      "I can also distinguish between value lookups, nearby searches, trade comparisons, and website questions when a message could mean more than one thing.",
    ].join("\n"),
    intent: "help",
    reaction: "wave",
    typingDuration: 650,
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
          "Neon Turtle vs Mega Unicorn",
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
      "Try giving me one or more pet names, comparing pets, finding pets near a value, or asking about the Trade Calculator. 🐾",
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
        message: "What can you do?",
      },
      {
        id: "fallback-pets",
        label: "Check multiple pets",
        message:
          "How much are Frost Dragon, Owl, and Kangaroo?",
      },
      {
        id: "fallback-trade",
        label: "Compare trade",
        message: "Frost Dragon for Owl",
      },
    ],
  };
}

function isGreeting(message: string) {
  return (
    message === "hi" ||
    message === "hello" ||
    message === "hey" ||
    message === "yo" ||
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
    message.includes("who do you think is handsome") ||
    message.includes("who is the handsomest") ||
    message.includes("sino ang handsome")
  );
}

function isThanks(message: string) {
  return (
    message === "thanks" ||
    message === "thank you" ||
    message === "ty" ||
    message.includes("thanks nich") ||
    message.includes("thank you nich")
  );
}

function isGoodbye(message: string) {
  return (
    message === "bye" ||
    message === "goodbye" ||
    message === "see you" ||
    message.includes("see you later") ||
    message.includes("later nich")
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
    message.includes("how to trade")
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
    message.includes("win fair lose") ||
    message.includes(
      "explain trade values",
    )
  );
}

function isHelpRequest(message: string) {
  return (
    message === "help" ||
    message === "help me" ||
    message.includes("what can you do") ||
    message.includes(
      "what can i ask you",
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
      lastUserMessage: originalMessage,
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
    const response = runFeatureIntent(
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

export function routeNichMessage(
  input: NichBrainInput,
): NichResponse {
  const originalMessage =
    input.message.trim();

  const resolution =
    resolveContextualMessage(input);

  const resolvedInput: NichBrainInput = {
    message: resolution.message,
    context: input.context,
  };

  const analysis =
    analyzeNichMessage(
      resolvedInput.message,
    );

  const normalizedMessage =
    normalizeText(resolution.message);

  let response: NichResponse;

  if (!normalizedMessage) {
    response = createFallbackResponse();
  } else if (
    isGreeting(normalizedMessage)
  ) {
    response = createGreetingResponse();
  } else if (
    isHandsomeQuestion(normalizedMessage)
  ) {
    response = createHandsomeResponse();
  } else if (
    isThanks(normalizedMessage)
  ) {
    response = createThanksResponse();
  } else if (
    isGoodbye(normalizedMessage)
  ) {
    response = createGoodbyeResponse();
  } else if (
    isCalculatorHelp(normalizedMessage)
  ) {
    response =
      createCalculatorResponse();
  } else if (
    isTradeAdvice(normalizedMessage)
  ) {
    response =
      createTradeAdviceResponse();
  } else if (
    isHelpRequest(normalizedMessage)
  ) {
    response = createHelpResponse();
  } else {
    response =
      createWebsiteKnowledgeResponse(
        resolvedInput.message,
      ) ??
      runScoredFeatureRoutes(
        resolvedInput,
        analysis,
      ) ??
      createSmartFallbackResponse(
        resolvedInput,
        analysis,
      );
  }

  return attachConversationMetadata(
    response,
    originalMessage,
    resolution.message,
  );
}

export default routeNichMessage;