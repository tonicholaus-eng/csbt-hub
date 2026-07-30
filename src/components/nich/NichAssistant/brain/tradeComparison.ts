import type {
  NichBrainInput,
  NichPotionStatus,
  NichResponse,
  NichTradeItem,
} from "./types";

import {
  analyzeNichMessage,
  type NichMessageAnalysis,
} from "./messageAnalysis";

import {
  compareTrade,
} from "../tools/tradeComparison";

function capitalize(value: string) {
  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}

function formatNumber(
  value: number,
) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value
    .toFixed(1)
    .replace(/\.0$/, "");
}

const verdictEmoji = {
  win: "🟢",
  fair: "🟡",
  lose: "🔴",
} as const;

const verdictText = {
  win: "Win",
  fair: "Fair",
  lose: "Lose",
} as const;

function getPotionLabel(
  potionStatus: NichPotionStatus,
) {
  switch (potionStatus) {
    case "flyRide":
      return "Fly + Ride";

    case "flyOnly":
      return "Fly only";

    case "rideOnly":
      return "Ride only";

    case "unspecified":
    default:
      return "Not specified";
  }
}

function getAdjustmentText(
  item: NichTradeItem,
) {
  if (item.potionAdjustment === 0) {
    return null;
  }

  const missingPotion =
    item.potionStatus === "flyOnly"
      ? "missing Ride potion"
      : "missing Fly potion";

  return `Adjustment: ${item.potionAdjustment} (${missingPotion})`;
}

function createTradeItemLines(
  item: NichTradeItem,
  index: number,
) {
  const adjustmentText =
    getAdjustmentText(item);

  const lines = [
    `${index + 1}. ${item.petCode} ${item.petName}`,
    `   Variant: ${capitalize(
      item.variant,
    )}`,
    `   Potions: ${getPotionLabel(
      item.potionStatus,
    )}`,
  ];

  if (item.potionAdjustment !== 0) {
    lines.push(
      `   Original value: ${item.baseDisplayValue}`,
    );

    if (adjustmentText) {
      lines.push(
        `   ${adjustmentText}`,
      );
    }
  }

  lines.push(
    `   Value used: ${item.displayValue}`,
  );

  return lines;
}

function createTradeSideBlock(
  heading: string,
  items: NichTradeItem[],
  total: number,
) {
  const itemLines = items.flatMap(
    createTradeItemLines,
  );

  return [
    `${heading} (${items.length} ${
      items.length === 1
        ? "pet"
        : "pets"
    })`,
    ...itemLines,
    `Total: ${formatNumber(total)}`,
  ];
}

function createNoPotionWarning(
  offeredItems: NichTradeItem[],
  requestedItems: NichTradeItem[],
) {
  const warningPets = [
    ...offeredItems,
    ...requestedItems,
  ].filter(
    (item) =>
      item.hasNoPotionWarning,
  );

  if (warningPets.length === 0) {
    return [];
  }

  const names = warningPets
    .map(
      (item) =>
        `${item.petCode} ${item.petName}`,
    )
    .join(", ");

  return [
    "",
    `⚠️ Potion warning for ${names}:`,
    "No Fly or Ride potion letters were specified, so Nich used the original database value with no deduction.",
    "Some no-potion pets, especially high-tier pets, may be worth more than the listed value.",
  ];
}

function formatTradeSideForMessage(
  items: NichTradeItem[],
) {
  return items
    .map(
      (item) =>
        `${item.petCode} ${item.petName}`,
    )
    .join(" + ");
}

function createRecentPets(
  items: NichTradeItem[],
) {
  return items.map((item) => ({
    petName: item.petName,
    variant: item.variant,
    value: item.value,
    displayValue: item.displayValue,
  }));
}

export function createTradeComparisonResponse(
  input: NichBrainInput,
  providedAnalysis?: NichMessageAnalysis,
): NichResponse | null {
  const analysis =
    providedAnalysis ??
    analyzeNichMessage(input.message);

  const parsed =
    analysis.tradeQuery;

  if (!parsed) {
    return null;
  }

  const comparison =
    compareTrade(
      parsed.offerText,
      parsed.requestText,
    );

  if (!comparison) {
    return {
      text: [
        "I couldn't compare that trade.",
        "",
        "Make sure each side contains at least one valid pet and that every pet has a value in the CSBT database.",
        "",
        "Separate multiple pets with +, commas, or the word “and.”",
      ].join("\n"),
      intent: "tradeComparison",
      reaction: "searchEmpty",
      typingDuration: 650,
      suggestions: [
        {
          id: "trade-multiple-example",
          label: "Try multiple pets",
          message:
            "Me: FR Frost Dragon + Turtle Them: FR Owl + Kangaroo",
        },
        {
          id: "trade-single-example",
          label: "Try one pet each",
          message:
            "WFL me FR Frost Dragon him FR Owl",
        },
      ],
      context: {
        lastIntent:
          "tradeComparison",
      },
    };
  }

  const difference = Math.abs(
    comparison.difference,
  );

  let explanation: string;

  switch (comparison.verdict) {
    case "win":
      explanation =
        `You're gaining about ${formatNumber(
          difference,
        )} value.`;
      break;

    case "lose":
      explanation =
        `You're overpaying by about ${formatNumber(
          difference,
        )} value.`;
      break;

    case "fair":
    default:
      explanation =
        "Both offers are very close in total value.";
      break;
  }

  const yourOfferBlock =
    createTradeSideBlock(
      "Your Offer",
      comparison.offeredItems,
      comparison.offeredValue,
    );

  const theirOfferBlock =
    createTradeSideBlock(
      "Their Offer",
      comparison.requestedItems,
      comparison.requestedValue,
    );

  const warningLines =
    createNoPotionWarning(
      comparison.offeredItems,
      comparison.requestedItems,
    );

  const allItems = [
    ...comparison.offeredItems,
    ...comparison.requestedItems,
  ];

  const lastItem =
    comparison.requestedItems[
      comparison.requestedItems.length - 1
    ];

  const yourOfferMessage =
    formatTradeSideForMessage(
      comparison.offeredItems,
    );

  const theirOfferMessage =
    formatTradeSideForMessage(
      comparison.requestedItems,
    );

  return {
    text: [
      `${verdictEmoji[comparison.verdict]} ${
        verdictText[comparison.verdict]
      }`,
      "",
      ...yourOfferBlock,
      "",
      ...theirOfferBlock,
      "",
      explanation,
      ...warningLines,
      "",
      "This comparison uses the current CSBT values in the database.",
    ].join("\n"),
    intent: "tradeComparison",
    reaction:
      comparison.verdict === "win"
        ? "celebrate"
        : comparison.verdict === "fair"
          ? "calculator"
          : "searchEmpty",
    typingDuration:
      Math.min(
        850 + allItems.length * 100,
        1600,
      ),
    tradeComparison: comparison,
    context: {
      lastIntent:
        "tradeComparison",
      lastTradeComparison:
        comparison,
      lastPetName:
        lastItem.petName,
      lastVariant:
        lastItem.variant,
      lastNumericValue:
        lastItem.value,
      recentPets:
        createRecentPets(allItems),
    },
    suggestions: [
      {
        id: "trade-swap-sides",
        label: "Swap the sides",
        message:
          `WFL me ${theirOfferMessage} them ${yourOfferMessage}`,
      },
      {
        id: "trade-check-all-values",
        label: "Check all values",
        message:
          allItems
            .map(
              (item) =>
                `${item.petCode} ${item.petName}`,
            )
            .join(", "),
      },
    ],
  };
}

export default createTradeComparisonResponse;