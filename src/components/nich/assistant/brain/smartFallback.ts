import {
  analyzeNichMessage,
  type NichMessageAnalysis,
} from "./messageAnalysis";
import {
  containsWholePhrase,
  formatNumber,
  includesAnyWholePhrase,
  normalizeText,
} from "./language";
import type {
  NichBrainInput,
  NichContextPet,
  NichResponse,
  NichSuggestion,
} from "./types";

function createSuggestion(
  id: string,
  label: string,
  message: string,
): NichSuggestion {
  return { id, label, message };
}

function getRecentPets(input: NichBrainInput): NichContextPet[] {
  return input.context.recentPets ?? [];
}

function formatPet(pet: NichContextPet): string {
  const variant =
    pet.variant && pet.variant !== "normal"
      ? `${pet.variant.charAt(0).toUpperCase()}${pet.variant.slice(1)} `
      : "";
  return `${variant}${pet.petName}`;
}

function getComparablePets(input: NichBrainInput) {
  return getRecentPets(input).filter(
    (pet): pet is NichContextPet & { value: number } =>
      typeof pet.value === "number" && Number.isFinite(pet.value),
  );
}

function createValueRankingResponse(
  input: NichBrainInput,
  direction: "highest" | "lowest",
): NichResponse | null {
  const comparable = getComparablePets(input);
  if (comparable.length < 2) return null;

  const sorted = [...comparable].sort((a, b) =>
    direction === "highest" ? b.value - a.value : a.value - b.value,
  );
  const selected = sorted[0];

  return {
    text: [
      `${formatPet(selected)} has the ${direction} value from the items we just checked.`,
      "",
      ...sorted.map(
        (pet, index) =>
          `${index + 1}. ${formatPet(pet)} — ${pet.displayValue ?? formatNumber(pet.value)}`,
      ),
      "",
      "This ranking uses the current CSBT database values.",
    ].join("\n"),
    intent: "petLookup",
    reaction: "searchFound",
    typingDuration: 500,
    suggestions: [
      createSuggestion(
        "ranking-compare-first-two",
        "Compare top two",
        `${formatPet(sorted[0])} for ${formatPet(sorted[1])}`,
      ),
      createSuggestion(
        "ranking-check-mega",
        "Check Mega values",
        sorted.map((pet) => `Mega ${pet.petName}`).join(", "),
      ),
    ],
    context: {
      lastIntent: "petLookup",
      lastPetName: selected.petName,
      lastVariant: selected.variant ?? "normal",
      lastNumericValue: selected.value,
      recentPets: sorted,
    },
  };
}

function createIdentityResponse(): NichResponse {
  return {
    text: [
      "I’m Nich, the CSBT HUB assistant. 👋",
      "",
      "I combine the website’s deterministic CSBT database tools with an optional free local AI model. Exact values and W/F/L calculations still come from the CSBT engine.",
    ].join("\n"),
    intent: "help",
    reaction: "wave",
    typingDuration: 450,
    suggestions: [
      createSuggestion("identity-pet", "Check a pet", "What is Frost Dragon worth?"),
      createSuggestion("identity-trade", "Compare a trade", "Frost Dragon for Owl"),
      createSuggestion("identity-help", "What can you do?", "What can you do?"),
    ],
  };
}

function createHowAreYouResponse(): NichResponse {
  return {
    text: "I’m ready to help. 😄 Send a pet, a trade, or a value range.",
    intent: "greeting",
    reaction: "welcome",
    typingDuration: 300,
    suggestions: [
      createSuggestion("mood-pet", "Pet value", "What is Owl worth?"),
      createSuggestion("mood-trade", "Check a trade", "Frost Dragon for Owl"),
    ],
  };
}

function createMemoryResponse(input: NichBrainInput): NichResponse {
  const recentPets = getRecentPets(input);

  if (recentPets.length === 0) {
    return {
      text: [
        "I remember recent items inside this chat, but we haven’t checked any yet.",
        "",
        "After checking several pets, you can say “compare those,” “the second one,” or “make them all Mega.”",
      ].join("\n"),
      intent: "help",
      reaction: "wave",
      typingDuration: 450,
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
      "I remember these recent items:",
      "",
      ...recentPets.map((pet, index) => `${index + 1}. ${formatPet(pet)}`),
      "",
      "You can refer to them by position, compare them, or change their variants.",
    ].join("\n"),
    intent: "help",
    reaction: "wave",
    typingDuration: 450,
    suggestions:
      recentPets.length >= 2
        ? [
            createSuggestion("memory-compare", "Compare those", "Compare those"),
            createSuggestion(
              "memory-highest",
              "Highest value",
              "Which one has the highest value?",
            ),
          ]
        : [createSuggestion("memory-neon", "Check Neon", "What about Neon?")],
  };
}

function createDemandVsValueResponse(): NichResponse {
  return {
    text: [
      "Equal listed value does not always mean an equally good trade.",
      "",
      "A single high-demand pet is usually easier to trade than a bundle of low-demand pets. The bundle can be harder to move, may require several separate trades, and often forces the owner to accept underpays to convert it back into a strong pet.",
      "",
      "Three common examples:",
      "1. One high-tier pet for many low-tier legendaries — the total may match, but the downgrade is harder to trade.",
      "2. One stable-demand pet for several event pets — event pets can have uneven demand even when their values add up.",
      "3. One clean, recognizable item for many niche items — fewer traders may want the niche bundle.",
      "",
      "Negotiation strategy: ask for fewer but stronger items, require a small demand premium for a downgrade, and avoid accepting a large bundle unless you already know how you will retrade each item.",
    ].join("\n"),
    intent: "tradeAdvice",
    reaction: "calculator",
    localConfidence: 0.99,
    aiEligible: false,
    typingDuration: 700,
    suggestions: [
      createSuggestion("advice-compare", "Compare a trade", "WFL me Frost Dragon them Owl"),
      createSuggestion("advice-upgrade", "Upgrade strategy", "How do I make a good upgrade?"),
      createSuggestion("advice-safety", "Trade safely", "How do I avoid trade scams?"),
    ],
  };
}

function createUpgradeDowngradeResponse(message: string): NichResponse {
  const asksUpgrade = containsWholePhrase(message, "upgrade");

  return {
    text: asksUpgrade
      ? [
          "For an upgrade, combine several easier-to-trade items into one stronger item.",
          "",
          "Aim for good-demand adds, avoid filling your offer with weak items, and expect the owner of the stronger pet to ask for a small overpay because they are giving up liquidity.",
          "",
          "A clean offer is usually better than the same value spread across many unwanted pets.",
        ].join("\n")
      : [
          "A downgrade can be good only when the items you receive are easy to retrade.",
          "",
          "Ask for a demand premium, prefer fewer strong items, and avoid bundles that only look good because many weak values were added together.",
        ].join("\n"),
    intent: "tradeAdvice",
    reaction: "calculator",
    localConfidence: 0.99,
    aiEligible: false,
    typingDuration: 550,
    suggestions: [
      createSuggestion("strategy-check", "Check an offer", "Frost Dragon for Owl + Turtle"),
      createSuggestion("strategy-demand", "Demand vs value", "Why can demand matter more than value?"),
    ],
  };
}

function createNegotiationResponse(): NichResponse {
  return {
    text: [
      "Use a simple three-step counteroffer:",
      "",
      "1. State the issue clearly: “The total is close, but most of the offer is low demand.”",
      "2. Ask for one specific change: replace two weak pets with one stronger, easier-to-trade pet.",
      "3. Set a limit: decide the minimum offer you will accept before continuing.",
      "",
      "Do not negotiate against yourself by repeatedly lowering your demand. Let the other trader improve the offer.",
    ].join("\n"),
    intent: "tradeAdvice",
    reaction: "calculator",
    localConfidence: 0.99,
    aiEligible: false,
    typingDuration: 550,
    suggestions: [
      createSuggestion("negotiation-compare", "Check their offer", "WFL me Frost Dragon them Owl + Turtle"),
      createSuggestion("negotiation-adds", "Find possible adds", "Find pets around 100 value"),
    ],
  };
}

function createSafetyResponse(): NichResponse {
  return {
    text: [
      "Keep every part of the deal inside the official trade window.",
      "",
      "Never trust-trade, lend pets to prove ownership, click login links, share verification codes, or accept promises of a second trade afterward. Recheck every item before the final confirmation because scammers may swap similar-looking pets or remove an item at the last second.",
    ].join("\n"),
    intent: "tradeAdvice",
    reaction: "searchEmpty",
    localConfidence: 0.99,
    aiEligible: false,
    typingDuration: 500,
    suggestions: [
      createSuggestion("safety-values", "Check values", "What is Frost Dragon worth?"),
      createSuggestion("safety-trade", "Check a trade", "Frost Dragon for Owl"),
    ],
  };
}

function createHoldOrTradeResponse(message: string): NichResponse {
  const asksHold = includesAnyWholePhrase(message, ["hold", "keep", "keep it", "keep or trade", "should i keep"]);
  return {
    text: [
      asksHold
        ? "For a hold-vs-trade decision, check three things locally: value trend, demand/liquidity, and what you can upgrade into right now."
        : "For a sell/trade decision, compare the current value to recent movement and the quality of the upgrade you can get.",
      "",
      "A rising, high-demand item is usually safer to hold unless the offer gives you a clear upgrade or meaningful demand premium. A flat/falling or hard-to-trade item is a stronger candidate to move when a clean offer appears.",
      "",
      "Send the item name (or ask ‘is Frost rising?’) and I can use your local CSBT demand/history data instead of guessing.",
    ].join("\n"),
    intent: "tradeAdvice",
    reaction: "calculator",
    localConfidence: 0.98,
    aiEligible: false,
    typingDuration: 520,
  };
}

function createProfitFlipResponse(): NichResponse {
  return {
    text: [
      "For flipping, don’t chase raw value alone.",
      "",
      "Prefer items with strong demand, short retrade time, and a clear buyer pool. Small reliable gains on liquid items are usually safer than a large paper profit on items nobody wants.",
      "",
      "Before taking a flip: check the W/F/L, demand, recent trend, and whether the item helps you move toward a better upgrade target.",
    ].join("\n"),
    intent: "tradeAdvice",
    reaction: "calculator",
    localConfidence: 0.99,
    aiEligible: false,
    typingDuration: 500,
  };
}

function createOverpayUnderpayResponse(message: string): NichResponse {
  const aboutOverpay = includesAnyWholePhrase(message, ["overpay", "over paying", "op"]);
  return {
    text: [
      aboutOverpay
        ? "An overpay is not automatically bad. It can make sense when you are upgrading into a much stronger or more liquid item."
        : "An underpay can still be accepted when your side has stronger demand or the other trader wants your specific item badly.",
      "",
      "The important part is whether the extra/missing value is justified by demand, liquidity, upgrade quality, and how difficult the bundle is to retrade.",
      "",
      "Send the full trade and I’ll calculate the listed gap locally first.",
    ].join("\n"),
    intent: "tradeAdvice",
    reaction: "calculator",
    localConfidence: 0.99,
    aiEligible: false,
    typingDuration: 480,
  };
}

function createNoPotionResponse(): NichResponse {
  return {
    text: [
      "No-potion value can behave differently from ordinary listed value, especially on older/high-tier pets.",
      "",
      "NICH only applies the potion rules that are explicitly encoded in CSBT data. If a screenshot/text does not show F/R/FR, I won’t invent a potion status. For rare no-potion premiums, treat the listed result as a baseline and verify current collector demand.",
    ].join("\n"),
    intent: "tradeAdvice",
    reaction: "calculator",
    localConfidence: 0.99,
    aiEligible: false,
    typingDuration: 480,
  };
}

function createTradeAdviceResponse(normalizedMessage: string): NichResponse | null {
  if (includesAnyWholePhrase(normalizedMessage, ["no potion", "no pot", "no-potion", "np premium", "potion premium"])) {
    return createNoPotionResponse();
  }

  if (includesAnyWholePhrase(normalizedMessage, ["flip", "flipping", "profit", "make profit", "resell", "retrade for profit"])) {
    return createProfitFlipResponse();
  }

  if (includesAnyWholePhrase(normalizedMessage, ["hold", "keep or trade", "should i keep", "should i sell", "sell or keep", "trade it or keep"])) {
    return createHoldOrTradeResponse(normalizedMessage);
  }

  if (includesAnyWholePhrase(normalizedMessage, ["overpay", "underpay", "over paying", "under paying"])) {
    return createOverpayUnderpayResponse(normalizedMessage);
  }

  if (
    includesAnyWholePhrase(normalizedMessage, [
      "low demand",
      "high demand",
      "demand more than value",
      "demand matter",
      "combined value",
      "several low demand",
      "bundle",
      "liquidity",
      "tradeability",
      "tradability",
    ])
  ) {
    return createDemandVsValueResponse();
  }

  if (includesAnyWholePhrase(normalizedMessage, ["upgrade", "downgrade"])) {
    return createUpgradeDowngradeResponse(normalizedMessage);
  }

  if (
    includesAnyWholePhrase(normalizedMessage, [
      "negotiate",
      "negotiation",
      "counteroffer",
      "counter offer",
    ])
  ) {
    return createNegotiationResponse();
  }

  if (
    includesAnyWholePhrase(normalizedMessage, [
      "scam",
      "safe trade",
      "avoid getting scammed",
      "trust trade",
      "verification code",
    ])
  ) {
    return createSafetyResponse();
  }

  return null;
}

function createNearbyClarificationResponse(
  analysis: NichMessageAnalysis,
): NichResponse | null {
  const asksNearby =
    analysis.actions.includes("nearby") ||
    includesAnyWholePhrase(analysis.normalizedMessage, [
      "similar pets",
      "similar value",
      "pets around",
      "pets near",
      "close in value",
    ]);

  if (!asksNearby || analysis.nearbyTargetValue !== null) return null;

  return {
    text: "What value should I search around? Give me a number such as 100, 500, or 1,000.",
    intent: "nearbyValue",
    reaction: "calculator",
    typingDuration: 350,
    suggestions: [
      createSuggestion("nearby-100", "Around 100", "Find pets around 100 value"),
      createSuggestion("nearby-500", "Around 500", "Find pets around 500 value"),
      createSuggestion("nearby-1000", "Around 1,000", "Find pets around 1000 value"),
    ],
  };
}

function createTradeClarificationResponse(
  analysis: NichMessageAnalysis,
): NichResponse | null {
  const looksLikeTrade =
    analysis.hasTradeStructure ||
    analysis.actions.includes("compare") ||
    includesAnyWholePhrase(analysis.normalizedMessage, [
      "my offer",
      "their offer",
      "wfl",
      "win fair lose",
      "is this fair",
      "good trade",
    ]);

  if (!looksLikeTrade || analysis.tradeQuery) return null;

  return {
    text: [
      "I can check that trade, but I need at least one valid item on each side.",
      "",
      "Example: “Frost Dragon for Owl”",
      "Or: “WFL me FR Frost Dragon them FR Owl”",
    ].join("\n"),
    intent: "tradeComparison",
    reaction: "calculator",
    typingDuration: 450,
    suggestions: [
      createSuggestion("trade-simple", "Simple example", "Frost Dragon for Owl"),
      createSuggestion("trade-coded", "FR example", "WFL me FR Frost Dragon them FR Owl"),
    ],
  };
}

function createPetClarificationResponse(
  analysis: NichMessageAnalysis,
): NichResponse | null {
  const asksValue =
    analysis.actions.includes("lookup") ||
    includesAnyWholePhrase(analysis.normalizedMessage, [
      "pet value",
      "pet worth",
      "how much is",
      "how much are",
      "check this pet",
      "check the pet",
    ]);

  if (!asksValue || analysis.pets.length > 0) return null;

  return {
    text: "Which item would you like me to check? Include the official name and, for pets, Normal, Neon, or Mega when needed.",
    intent: "petLookup",
    reaction: "searchEmpty",
    typingDuration: 400,
    suggestions: [
      createSuggestion("pet-frost", "Frost Dragon", "What is Frost Dragon worth?"),
      createSuggestion("pet-multiple", "Several pets", "How much are Owl, Crow, and Parrot?"),
      createSuggestion("pet-variant", "Mega pet", "What is Mega Turtle worth?"),
    ],
  };
}

function createNumberSuggestionResponse(
  analysis: NichMessageAnalysis,
): NichResponse | null {
  if (!analysis.isStandaloneNumber || analysis.numbers.length !== 1) return null;

  const value = analysis.numbers[0];
  if (value < 0) return null;

  return {
    text: `Do you want me to find items close to ${formatNumber(value)} value?`,
    intent: "nearbyValue",
    reaction: "calculator",
    typingDuration: 300,
    suggestions: [
      createSuggestion(
        `number-nearby-${value}`,
        `Search around ${formatNumber(value)}`,
        `Find pets around ${value} value`,
      ),
      createSuggestion("number-check-pet", "Check a pet", "What is Frost Dragon worth?"),
    ],
    context: { lastNumericValue: value },
  };
}

function createUnknownPetResponse(
  analysis: NichMessageAnalysis,
): NichResponse | null {
  const likelyLookup =
    analysis.isDirectLookup ||
    includesAnyWholePhrase(analysis.normalizedMessage, [
      "worth",
      "value",
      "normal",
      "neon",
      "mega",
      "nfr",
      "mfr",
    ]);

  if (!likelyLookup || analysis.pets.length > 0) return null;

  return {
    text: [
      "I think you are asking about an item, but I couldn’t match the name to the CSBT database.",
      "",
      "Send only the official item name and variant, for example: “Neon Frost Dragon.”",
    ].join("\n"),
    intent: "petLookup",
    reaction: "searchEmpty",
    typingDuration: 450,
    suggestions: [
      createSuggestion("unknown-example", "Try an example", "Neon Frost Dragon"),
      createSuggestion("unknown-list", "Check several pets", "Owl, Crow, and Parrot"),
    ],
  };
}

function createGeneralFallbackResponse(): NichResponse {
  return {
    text: [
      "I’m not fully sure what you mean yet. 🤔",
      "",
      "Try giving me an item name, a complete two-sided trade, or a target value. For broader trading advice, mention the exact goal—such as upgrading, downgrading, demand, or negotiation.",
    ].join("\n"),
    intent: "fallback",
    reaction: "searchEmpty",
    typingDuration: 450,
    suggestions: [
      createSuggestion("fallback-pet", "Check a pet", "What is Frost Dragon worth?"),
      createSuggestion("fallback-trade", "Compare a trade", "Frost Dragon for Owl"),
      createSuggestion("fallback-advice", "Trading advice", "How do I make a good upgrade?"),
    ],
  };
}

export function createSmartFallbackResponse(
  input: NichBrainInput,
  providedAnalysis?: NichMessageAnalysis,
): NichResponse {
  const analysis = providedAnalysis ?? analyzeNichMessage(input.message);
  const normalized = normalizeText(input.message);

  if (includesAnyWholePhrase(normalized, ["which is highest", "highest value", "worth the most", "most valuable"])) {
    const response = createValueRankingResponse(input, "highest");
    if (response) return response;
  }

  if (includesAnyWholePhrase(normalized, ["which is lowest", "lowest value", "worth the least", "least valuable"])) {
    const response = createValueRankingResponse(input, "lowest");
    if (response) return response;
  }

  if (
    includesAnyWholePhrase(normalized, [
      "who are you",
      "what are you",
      "are you nich",
      "tell me about yourself",
      "are you chatgpt",
      "are you an ai",
    ])
  ) {
    return createIdentityResponse();
  }

  if (
    includesAnyWholePhrase(normalized, [
      "how are you",
      "how r u",
      "how you doing",
      "hows it going",
      "are you okay",
      "you good",
      "whats up",
    ])
  ) {
    return createHowAreYouResponse();
  }

  if (
    includesAnyWholePhrase(normalized, [
      "who made you",
      "who created you",
      "who programmed you",
      "how were you made",
      "who built you",
    ])
  ) {
    return {
      text: "I was built for CSBT HUB. My exact values come from the local CSBT database, and optional free AI can improve natural-language explanations.",
      intent: "help",
      reaction: "wave",
      typingDuration: 400,
    };
  }

  if (
    includesAnyWholePhrase(normalized, [
      "do you remember",
      "what do you remember",
      "remember the pets",
      "which pets did i ask",
      "what pets did i ask",
    ])
  ) {
    return createMemoryResponse(input);
  }

  const adviceResponse = createTradeAdviceResponse(normalized);
  if (adviceResponse) return adviceResponse;

  return (
    createNearbyClarificationResponse(analysis) ??
    createTradeClarificationResponse(analysis) ??
    createPetClarificationResponse(analysis) ??
    createNumberSuggestionResponse(analysis) ??
    createUnknownPetResponse(analysis) ??
    createGeneralFallbackResponse()
  );
}

export default createSmartFallbackResponse;
