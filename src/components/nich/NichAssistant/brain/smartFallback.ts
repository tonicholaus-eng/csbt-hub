import {
  analyzeNichMessage,
  type NichMessageAnalysis,
} from "./messageAnalysis";

import type {
  NichBrainInput,
  NichContextPet,
  NichResponse,
  NichSuggestion,
} from "./types";

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(
  message: string,
  phrases: string[],
) {
  return phrases.some((phrase) =>
    message.includes(phrase),
  );
}

function createSuggestion(
  id: string,
  label: string,
  message: string,
): NichSuggestion {
  return {
    id,
    label,
    message,
  };
}

function getRecentPets(
  input: NichBrainInput,
) {
  return input.context.recentPets ?? [];
}

function formatPet(
  pet: NichContextPet,
) {
  const variant =
    pet.variant &&
    pet.variant !== "normal"
      ? `${
          pet.variant.charAt(0).toUpperCase() +
          pet.variant.slice(1)
        } `
      : "";

  return `${variant}${pet.petName}`;
}

function getComparablePets(
  input: NichBrainInput,
) {
  return getRecentPets(input).filter(
    (
      pet,
    ): pet is NichContextPet & {
      value: number;
    } =>
      typeof pet.value === "number" &&
      Number.isFinite(pet.value),
  );
}

function isHighestValueQuestion(
  message: string,
) {
  return includesAny(message, [
    "which is highest",
    "which one is highest",
    "which pet is highest",
    "which has the highest value",
    "which one has the highest value",
    "which is worth the most",
    "which one is worth the most",
    "most valuable",
    "highest value",
    "best value",
  ]);
}

function isLowestValueQuestion(
  message: string,
) {
  return includesAny(message, [
    "which is lowest",
    "which one is lowest",
    "which pet is lowest",
    "which has the lowest value",
    "which one has the lowest value",
    "which is worth the least",
    "which one is worth the least",
    "least valuable",
    "lowest value",
  ]);
}

function createValueRankingResponse(
  input: NichBrainInput,
  direction: "highest" | "lowest",
): NichResponse | null {
  const comparablePets =
    getComparablePets(input);

  if (comparablePets.length < 2) {
    return null;
  }

  const sortedPets = [
    ...comparablePets,
  ].sort((firstPet, secondPet) => {
    if (direction === "highest") {
      return (
        secondPet.value - firstPet.value
      );
    }

    return firstPet.value - secondPet.value;
  });

  const selectedPet = sortedPets[0];

  const rankedLines = sortedPets.map(
    (pet, index) =>
      `${index + 1}. ${formatPet(
        pet,
      )} — ${
        pet.displayValue ?? pet.value
      }`,
  );

  return {
    text: [
      `${formatPet(selectedPet)} has the ${
        direction === "highest"
          ? "highest"
          : "lowest"
      } value from the pets we just checked.`,
      "",
      ...rankedLines,
      "",
      "This ranking uses the current CSBT values in the database.",
    ].join("\n"),
    intent: "petLookup",
    reaction: "searchFound",
    typingDuration: 650,
    suggestions: [
      createSuggestion(
        "ranking-compare-first-two",
        "Compare top two",
        `${formatPet(
          sortedPets[0],
        )} for ${formatPet(sortedPets[1])}`,
      ),
      createSuggestion(
        "ranking-check-mega",
        "Check Mega values",
        sortedPets
          .map(
            (pet) =>
              `Mega ${pet.petName}`,
          )
          .join(", "),
      ),
    ],
    context: {
      lastIntent: "petLookup",
      lastPetName: selectedPet.petName,
      lastVariant:
        selectedPet.variant ?? "normal",
      lastNumericValue:
        selectedPet.value,
      recentPets: sortedPets,
    },
  };
}

function createIdentityResponse(): NichResponse {
  return {
    text: [
      "I’m Nich, the CSBT HUB assistant. 👋",
      "",
      "I’m programmed to help with Adopt Me pet values, variants, trade comparisons, nearby-value searches, and CSBT HUB questions.",
      "",
      "I’m not ChatGPT, but I can remember recent pets and understand different ways of asking CSBT-related questions.",
    ].join("\n"),
    intent: "help",
    reaction: "wave",
    typingDuration: 600,
    suggestions: [
      createSuggestion(
        "identity-pet-value",
        "Check a pet",
        "What is Frost Dragon worth?",
      ),
      createSuggestion(
        "identity-trade",
        "Compare a trade",
        "Frost Dragon for Owl",
      ),
      createSuggestion(
        "identity-capabilities",
        "What can you do?",
        "What can you do?",
      ),
    ],
  };
}

function createHowAreYouResponse(): NichResponse {
  return {
    text: [
      "I’m doing great and ready to help. 😄",
      "",
      "What are we checking today—a pet value, a trade, or pets near a certain value?",
    ].join("\n"),
    intent: "greeting",
    reaction: "welcome",
    typingDuration: 450,
    suggestions: [
      createSuggestion(
        "mood-pet",
        "Pet value",
        "What is Owl worth?",
      ),
      createSuggestion(
        "mood-trade",
        "Check a trade",
        "Frost Dragon for Owl",
      ),
      createSuggestion(
        "mood-nearby",
        "Nearby values",
        "Find pets around 500 value",
      ),
    ],
  };
}

function createCreatorResponse(): NichResponse {
  return {
    text: [
      "I was programmed as the assistant for CSBT HUB.",
      "",
      "My answers come from the website’s local pet database and the conversation rules built into my brain. I don’t use a paid AI service.",
    ].join("\n"),
    intent: "help",
    reaction: "wave",
    typingDuration: 550,
    suggestions: [
      createSuggestion(
        "creator-help",
        "What can you do?",
        "What can you do?",
      ),
      createSuggestion(
        "creator-pet",
        "Check a pet",
        "What is Frost Dragon worth?",
      ),
    ],
  };
}

function createMemoryResponse(
  input: NichBrainInput,
): NichResponse {
  const recentPets =
    getRecentPets(input);

  if (recentPets.length === 0) {
    return {
      text: [
        "I remember information from our recent messages, but we haven’t checked any pets yet.",
        "",
        "Try asking about several pets, then you can say things like “compare those,” “the first one,” or “what about Mega?”",
      ].join("\n"),
      intent: "help",
      reaction: "wave",
      typingDuration: 600,
      suggestions: [
        createSuggestion(
          "memory-check-pets",
          "Check several pets",
          "How much are Owl, Crow, and Parrot?",
        ),
      ],
    };
  }

  return {
    text: [
      "Yes—I remember the recent pets from this conversation:",
      "",
      ...recentPets.map(
        (pet, index) =>
          `${index + 1}. ${formatPet(pet)}`,
      ),
      "",
      "You can refer to them as the first pet, second pet, last pet, or ask me to compare them.",
    ].join("\n"),
    intent: "help",
    reaction: "wave",
    typingDuration: 600,
    suggestions:
      recentPets.length >= 2
        ? [
            createSuggestion(
              "memory-compare",
              "Compare those",
              "Compare those",
            ),
            createSuggestion(
              "memory-highest",
              "Highest value",
              "Which one has the highest value?",
            ),
          ]
        : [
            createSuggestion(
              "memory-neon",
              "Check Neon",
              "What about Neon?",
            ),
          ],
  };
}

function createNearbyClarificationResponse(
  analysis: NichMessageAnalysis,
): NichResponse | null {
  const asksForNearby =
    analysis.actions.includes("nearby") ||
    includesAny(
      analysis.normalizedMessage,
      [
        "similar pets",
        "similar value",
        "pets around",
        "pets near",
        "close in value",
      ],
    );

  if (
    !asksForNearby ||
    analysis.nearbyTargetValue !== null
  ) {
    return null;
  }

  return {
    text: [
      "What value should I search around?",
      "",
      "Give me a number such as 100, 500, or 1,000.",
    ].join("\n"),
    intent: "nearbyValue",
    reaction: "calculator",
    typingDuration: 500,
    suggestions: [
      createSuggestion(
        "nearby-100",
        "Around 100",
        "Find pets around 100 value",
      ),
      createSuggestion(
        "nearby-500",
        "Around 500",
        "Find pets around 500 value",
      ),
      createSuggestion(
        "nearby-1000",
        "Around 1,000",
        "Find pets around 1000 value",
      ),
    ],
  };
}

function createTradeClarificationResponse(
  analysis: NichMessageAnalysis,
): NichResponse | null {
  const looksLikeTrade =
    analysis.actions.includes("compare") ||
    analysis.actions.includes("trade") ||
    includesAny(
      analysis.normalizedMessage,
      [
        "my offer",
        "their offer",
        "me for",
        "him for",
        "her for",
        "wfl",
        "win fair lose",
        "is this fair",
        "good trade",
      ],
    );

  if (
    !looksLikeTrade ||
    analysis.tradeQuery
  ) {
    return null;
  }

  return {
    text: [
      "I can check that trade, but I need one valid pet on each side.",
      "",
      "You can type it like:",
      "“Frost Dragon for Owl”",
      "",
      "Or with trade codes:",
      "“WFL me FR Frost Dragon him FR Owl”",
    ].join("\n"),
    intent: "tradeComparison",
    reaction: "calculator",
    typingDuration: 650,
    suggestions: [
      createSuggestion(
        "trade-simple-example",
        "Simple example",
        "Frost Dragon for Owl",
      ),
      createSuggestion(
        "trade-code-example",
        "FR example",
        "WFL me FR Frost Dragon him FR Owl",
      ),
    ],
  };
}

function createPetClarificationResponse(
  analysis: NichMessageAnalysis,
): NichResponse | null {
  const mentionsPetValue =
    analysis.actions.includes("lookup") ||
    includesAny(
      analysis.normalizedMessage,
      [
        "pet value",
        "pet worth",
        "how much is",
        "how much are",
        "check this pet",
        "check the pet",
      ],
    );

  if (
    !mentionsPetValue ||
    analysis.pets.length > 0
  ) {
    return null;
  }

  return {
    text: [
      "Which pet would you like me to check?",
      "",
      "You can include Normal, Neon, or Mega, and you can give me several pet names at once.",
    ].join("\n"),
    intent: "petLookup",
    reaction: "searchEmpty",
    typingDuration: 550,
    suggestions: [
      createSuggestion(
        "pet-frost",
        "Frost Dragon",
        "What is Frost Dragon worth?",
      ),
      createSuggestion(
        "pet-multiple",
        "Several pets",
        "How much are Owl, Crow, and Parrot?",
      ),
      createSuggestion(
        "pet-variant",
        "Mega pet",
        "What is Mega Turtle worth?",
      ),
    ],
  };
}

function createNumberSuggestionResponse(
  analysis: NichMessageAnalysis,
): NichResponse | null {
  if (
    analysis.numbers.length !== 1 ||
    analysis.pets.length > 0
  ) {
    return null;
  }

  const value = analysis.numbers[0];

  if (value < 0) {
    return null;
  }

  return {
    text: [
      `Do you want me to find pets close to ${value} value?`,
      "",
      "You can also tell me a pet name if you were asking about something else.",
    ].join("\n"),
    intent: "nearbyValue",
    reaction: "calculator",
    typingDuration: 500,
    suggestions: [
      createSuggestion(
        `number-nearby-${value}`,
        `Search around ${value}`,
        `Find pets around ${value} value`,
      ),
      createSuggestion(
        "number-check-pet",
        "Check a pet",
        "What is Frost Dragon worth?",
      ),
    ],
    context: {
      lastNumericValue: value,
    },
  };
}

function createUnknownPetResponse(
  analysis: NichMessageAnalysis,
): NichResponse | null {
  const likelyContainsPetRequest =
    includesAny(
      analysis.normalizedMessage,
      [
        "worth",
        "value",
        "normal",
        "neon",
        "mega",
        "nfr",
        "mfr",
        "fr",
      ],
    );

  if (
    !likelyContainsPetRequest ||
    analysis.pets.length > 0
  ) {
    return null;
  }

  return {
    text: [
      "I think you may be asking about a pet, but I couldn’t match the name to the CSBT database.",
      "",
      "Try checking the spelling or send only the pet name and variant.",
      "",
      "Example: “Neon Frost Dragon”",
    ].join("\n"),
    intent: "petLookup",
    reaction: "searchEmpty",
    typingDuration: 600,
    suggestions: [
      createSuggestion(
        "unknown-pet-example",
        "Try an example",
        "Neon Frost Dragon",
      ),
      createSuggestion(
        "unknown-pet-list",
        "Check several pets",
        "Owl, Crow, and Parrot",
      ),
    ],
  };
}

function createGeneralFallbackResponse(): NichResponse {
  return {
    text: [
      "I’m not completely sure what you mean yet. 🤔",
      "",
      "I can help if you:",
      "🐾 Give me a pet name",
      "⚖️ Put one pet on each side of a trade",
      "🔎 Give me a value to search around",
      "🧮 Ask about the Trade Calculator",
      "",
      "Try saying your question in another way and I’ll do my best to understand it.",
    ].join("\n"),
    intent: "fallback",
    reaction: "searchEmpty",
    typingDuration: 650,
    suggestions: [
      createSuggestion(
        "smart-fallback-pet",
        "Check a pet",
        "What is Frost Dragon worth?",
      ),
      createSuggestion(
        "smart-fallback-trade",
        "Compare a trade",
        "Frost Dragon for Owl",
      ),
      createSuggestion(
        "smart-fallback-nearby",
        "Nearby values",
        "Find pets around 500 value",
      ),
    ],
  };
}

export function createSmartFallbackResponse(
  input: NichBrainInput,
  providedAnalysis?: NichMessageAnalysis,
): NichResponse {
  const analysis =
    providedAnalysis ??
    analyzeNichMessage(input.message);

  const normalizedMessage =
    normalizeText(input.message);

  if (
    isHighestValueQuestion(
      normalizedMessage,
    )
  ) {
    const response =
      createValueRankingResponse(
        input,
        "highest",
      );

    if (response) {
      return response;
    }
  }

  if (
    isLowestValueQuestion(
      normalizedMessage,
    )
  ) {
    const response =
      createValueRankingResponse(
        input,
        "lowest",
      );

    if (response) {
      return response;
    }
  }

  if (
    includesAny(normalizedMessage, [
      "who are you",
      "what are you",
      "are you nich",
      "tell me about yourself",
      "are you chatgpt",
      "are you an ai",
      "are you ai",
    ])
  ) {
    return createIdentityResponse();
  }

  if (
    includesAny(normalizedMessage, [
      "how are you",
      "how r u",
      "how you doing",
      "hows it going",
      "are you okay",
      "you good",
      "whats up",
      "what is up",
      "wyd",
    ])
  ) {
    return createHowAreYouResponse();
  }

  if (
    includesAny(normalizedMessage, [
      "who made you",
      "who created you",
      "who programmed you",
      "how were you made",
      "who built you",
    ])
  ) {
    return createCreatorResponse();
  }

  if (
    includesAny(normalizedMessage, [
      "do you remember",
      "what do you remember",
      "remember the pets",
      "which pets did i ask",
      "what pets did i ask",
    ])
  ) {
    return createMemoryResponse(input);
  }

  const nearbyClarification =
    createNearbyClarificationResponse(
      analysis,
    );

  if (nearbyClarification) {
    return nearbyClarification;
  }

  const tradeClarification =
    createTradeClarificationResponse(
      analysis,
    );

  if (tradeClarification) {
    return tradeClarification;
  }

  const petClarification =
    createPetClarificationResponse(
      analysis,
    );

  if (petClarification) {
    return petClarification;
  }

  const numberSuggestion =
    createNumberSuggestionResponse(
      analysis,
    );

  if (numberSuggestion) {
    return numberSuggestion;
  }

  const unknownPetResponse =
    createUnknownPetResponse(analysis);

  if (unknownPetResponse) {
    return unknownPetResponse;
  }

  return createGeneralFallbackResponse();
}

export default createSmartFallbackResponse;