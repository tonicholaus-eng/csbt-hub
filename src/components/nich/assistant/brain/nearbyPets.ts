import type { NichBrainInput, NichResponse, NichValueSource } from "./types";
import { VALUE_SOURCE_LABELS, detectValueSource } from "../../../../lib/valueSystem";
import {
  analyzeNichMessage,
  type NichMessageAnalysis,
} from "./messageAnalysis";
import { findPetsNearValue } from "../tools/nearbySearch";
import { formatNumber, uniqueBy } from "./language";

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getSearchStep(targetValue: number): number {
  if (targetValue < 25) return 5;
  if (targetValue < 100) return 10;
  if (targetValue < 500) return 50;
  if (targetValue < 2_000) return 100;
  return Math.max(250, Math.round(targetValue * 0.1 / 50) * 50);
}

function formatDifference(targetValue: number, value: number): string {
  const difference = value - targetValue;
  if (difference === 0) return "exact match";

  const sign = difference > 0 ? "+" : "−";
  return `${sign}${formatNumber(Math.abs(difference))}`;
}

export function createNearbyPetsResponse(
  input: NichBrainInput,
  providedAnalysis?: NichMessageAnalysis,
): NichResponse | null {
  const analysis = providedAnalysis ?? analyzeNichMessage(input.message);
  const source = detectValueSource(
    input.message,
    input.context.lastValueSource ?? "GCASH",
  ) as NichValueSource;

  if (!analysis.actions.includes("nearby")) {
    return null;
  }

  const targetValue = analysis.nearbyTargetValue;
  if (targetValue === null) {
    return null;
  }

  const category = analysis.requestedCategory;
  const allMatches = findPetsNearValue(targetValue, 20, source).filter((item) =>
    category ? item.category === category : true,
  );

  // Prefer different item names so one pet's three variants do not dominate.
  const uniqueNames = uniqueBy(
    allMatches,
    (item) => item.name.toLowerCase(),
  );
  const nearbyItems = [
    ...uniqueNames,
    ...allMatches.filter(
      (item) => !uniqueNames.some(
        (unique) => unique.name === item.name && unique.variant === item.variant,
      ),
    ),
  ].slice(0, 6);

  if (nearbyItems.length === 0) {
    const label =
      category === "PET" ? "pets"
      : category === "PETWEAR" ? "Pet Wear items"
      : category === "EGG" ? "eggs"
      : category === "VEHICLE" ? "vehicles"
      : category === "FOOD" ? "food items"
      : category === "GIFT" ? "gifts"
      : category === "STROLLER" ? "strollers"
      : category === "TOY" ? "toys"
      : category === "STICKER" ? "stickers"
      : "items";

    return {
      text: `I couldn’t find any ${label} close to ${formatNumber(targetValue)} value.`,
      intent: "nearbyValue",
      reaction: "searchEmpty",
      typingDuration: 450,
      suggestions: [
        {
          id: "nearby-try-lower",
          label: "Search lower",
          message: `Find items around ${Math.max(0, targetValue - getSearchStep(targetValue))} value`,
        },
        {
          id: "nearby-try-higher",
          label: "Search higher",
          message: `Find items around ${targetValue + getSearchStep(targetValue)} value`,
        },
      ],
      context: {
        lastIntent: "nearbyValue",
        lastNumericValue: targetValue,
        lastValueSource: source,
      },
    };
  }

  const lines = nearbyItems.map((item) =>
    `🐾 ${item.name} (${capitalize(item.variant)}) — ${item.value} · ${formatDifference(
      targetValue,
      item.centerValue,
    )}`,
  );
  const lastItem = nearbyItems.at(-1)!;
  const step = getSearchStep(targetValue);

  return {
    text: [
      `Closest matches to ${formatNumber(targetValue)} value:`,
      "",
      ...lines,
      "",
      `Source: ${VALUE_SOURCE_LABELS[source]}. The difference shown is from your target.`,
    ].join("\n"),
    intent: "nearbyValue",
    reaction: "searchFound",
    typingDuration: 600,
    suggestions: [
      {
        id: `nearby-lower-${targetValue}`,
        label: "Search lower",
        message: `Find items around ${Math.max(0, targetValue - step)} value`,
      },
      {
        id: `nearby-higher-${targetValue}`,
        label: "Search higher",
        message: `Find items around ${targetValue + step} value`,
      },
      {
        id: "nearby-compare-first-two",
        label: "Compare top two",
        message: "Compare the first two",
      },
    ],
    context: {
      lastIntent: "nearbyValue",
      lastNumericValue: targetValue,
      lastPetName: lastItem.name,
      lastVariant: lastItem.variant,
      lastValueSource: source,
      recentPets: nearbyItems.map((item) => ({
        petName: item.name,
        variant: item.variant,
        value: item.centerValue,
        displayValue: item.value,
      })),
    },
  };
}

export default createNearbyPetsResponse;
