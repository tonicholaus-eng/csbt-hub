import type {
  NichBrainInput,
  NichResponse,
} from "./types";

import {
  analyzeNichMessage,
  type NichMessageAnalysis,
} from "./messageAnalysis";

import { findPetsNearValue } from "../tools/nearbySearch";

function capitalizeVariant(value: string) {
  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}

function convertPetValueToNumber(
  value: string | number,
) {
  if (typeof value === "number") {
    return value;
  }

  const numericValue = Number(
    value.replace(/,/g, "").trim(),
  );

  return Number.isFinite(numericValue)
    ? numericValue
    : 0;
}

export function createNearbyPetsResponse(
  input: NichBrainInput,
  providedAnalysis?: NichMessageAnalysis,
): NichResponse | null {
  const analysis =
    providedAnalysis ??
    analyzeNichMessage(input.message);

  if (!analysis.actions.includes("nearby")) {
    return null;
  }

  const targetValue =
    analysis.nearbyTargetValue;

  if (targetValue === null) {
    return null;
  }

  const nearbyPets = findPetsNearValue(
    targetValue,
    5,
  );

  if (!nearbyPets.length) {
    return {
      text: `I couldn’t find any pets close to ${targetValue} value.`,
      intent: "nearbyValue",
      reaction: "searchEmpty",
      typingDuration: 550,
      suggestions: [
        {
          id: "nearby-try-500",
          label: "Try 500",
          message:
            "Find pets around 500 value",
        },
        {
          id: "nearby-check-pet",
          label: "Check a pet",
          message:
            "What is Frost Dragon worth?",
        },
      ],
      context: {
        lastIntent: "nearbyValue",
        lastNumericValue: targetValue,
      },
    };
  }

  const lastNearbyPet =
    nearbyPets[nearbyPets.length - 1];

  return {
    text: [
      `Here are some pets close to ${targetValue} value:`,
      "",
      ...nearbyPets.map(
        (pet) =>
          `🐾 ${pet.name} (${capitalizeVariant(
            pet.variant,
          )}) — ${pet.value}`,
      ),
      "",
      "Values can change, so verify them before trading.",
    ].join("\n"),

    intent: "nearbyValue",
    reaction: "searchFound",
    typingDuration: 700,

    suggestions: [
      {
        id: `nearby-lower-${targetValue}`,
        label: "Search lower",
        message: `Find pets around ${Math.max(
          0,
          targetValue - 100,
        )} value`,
      },
      {
        id: `nearby-higher-${targetValue}`,
        label: "Search higher",
        message: `Find pets around ${
          targetValue + 100
        } value`,
      },
    ],

    context: {
      lastIntent: "nearbyValue",
      lastNumericValue: targetValue,
      lastPetName: lastNearbyPet.name,
      lastVariant: lastNearbyPet.variant,

      recentPets: nearbyPets.map((pet) => ({
        petName: pet.name,
        variant: pet.variant,
        value: convertPetValueToNumber(
          pet.value,
        ),
        displayValue: String(pet.value),
      })),
    },
  };
}

export default createNearbyPetsResponse;