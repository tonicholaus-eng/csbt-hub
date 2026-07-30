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

function createTradeItemBlock(
  heading: string,
  item: NichTradeItem,
) {
  const adjustmentText =
    getAdjustmentText(item);

  const lines = [
    heading,
    `${item.petCode} ${item.petName}`,
    `Variant: ${capitalize(
      item.variant,
    )}`,
    `Potions: ${getPotionLabel(
      item.potionStatus,
    )}`,
  ];

  if (item.potionAdjustment !== 0) {
    lines.push(
      `Original value: ${item.baseDisplayValue}`,
    );

    if (adjustmentText) {
      lines.push(adjustmentText);
    }
  }

  lines.push(
    `Value used: ${item.displayValue}`,
  );

  return lines;
}

function createNoPotionWarning(
  offered: NichTradeItem,
  requested: NichTradeItem,
) {
  const warningPets = [
    offered,
    requested,
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
    .join(" and ");

  return [
    "",
    `⚠️ Potion warning for ${names}:`,
    "No Fly or Ride potion letters were specified, so Nich used the original database value with no deduction.",
    "Some no-potion pets, especially high-tier pets, may be worth more than the listed value.",
  ];
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
        "I couldn't compare those pets.",
        "",
        "Make sure both pet names are valid and that their values exist in the CSBT database.",
      ].join("\n"),
      intent: "tradeComparison",
      reaction: "searchEmpty",
      typingDuration: 600,
      suggestions: [
        {
          id: "trade-example",
          label: "Try an example",
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
  ).toFixed(1);

  let explanation: string;

  switch (comparison.verdict) {
    case "win":
      explanation =
        `You're gaining about ${difference} value.`;
      break;

    case "lose":
      explanation =
        `You're overpaying by about ${difference} value.`;
      break;

    case "fair":
    default:
      explanation =
        "Both offers are very close in value.";
      break;
  }

  const yourOfferBlock =
    createTradeItemBlock(
      "Your Offer",
      comparison.offered,
    );

  const theirOfferBlock =
    createTradeItemBlock(
      "Their Offer",
      comparison.requested,
    );

  const warningLines =
    createNoPotionWarning(
      comparison.offered,
      comparison.requested,
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
    typingDuration: 900,
    tradeComparison: comparison,
    context: {
      lastIntent:
        "tradeComparison",
      lastTradeComparison:
        comparison,
      lastPetName:
        comparison.requested.petName,
      lastVariant:
        comparison.requested.variant,
      lastNumericValue:
        comparison.requested.value,
      recentPets: [
        {
          petName:
            comparison.offered.petName,
          variant:
            comparison.offered.variant,
          value:
            comparison.offered.value,
          displayValue:
            comparison.offered.displayValue,
        },
        {
          petName:
            comparison.requested.petName,
          variant:
            comparison.requested.variant,
          value:
            comparison.requested.value,
          displayValue:
            comparison.requested.displayValue,
        },
      ],
    },
    suggestions: [
      {
        id: "trade-full-potions",
        label: "Compare FR pets",
        message:
          `WFL me FR ${comparison.offered.petName} him FR ${comparison.requested.petName}`,
      },
      {
        id: "trade-missing-fly",
        label: "Try missing Fly",
        message:
          `WFL me MR ${comparison.offered.petName} him MFR ${comparison.requested.petName}`,
      },
    ],
  };
}

export default createTradeComparisonResponse;