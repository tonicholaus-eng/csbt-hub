import type {
  NichBrainInput,
  NichContextPet,
  NichResponse,
} from "./types";

import {
  analyzeNichMessage,
  type NichMessageAnalysis,
} from "./messageAnalysis";

import {
  detectPetVariant,
  findPetByName,
  formatPetValue,
  getPetVariantValue,
  getRawPetVariantValue,
  normalizeText,
  type PetMessageMatch,
  type PetRecord,
  type PetVariant,
} from "../tools/petSearch";

function capitalizeVariant(
  variant: PetVariant,
) {
  return (
    variant.charAt(0).toUpperCase() +
    variant.slice(1)
  );
}

function parseNumericValue(
  value: string | number | undefined,
) {
  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  const normalizedValue = String(value)
    .replace(/,/g, "")
    .match(/-?\d+(?:\.\d+)?/);

  if (!normalizedValue) {
    return undefined;
  }

  const numericValue = Number(
    normalizedValue[0],
  );

  return Number.isFinite(numericValue)
    ? numericValue
    : undefined;
}

function createAllValuesText(
  pet: PetRecord,
) {
  return [
    `🐾 ${pet.PETS}`,
    "",
    `Normal: ${formatPetValue(pet.NORMAL)}`,
    `Neon: ${formatPetValue(pet.NEON)}`,
    `Mega: ${formatPetValue(pet.MEGA)}`,
  ].join("\n");
}

function createVariantValueText(
  pet: PetRecord,
  variant: PetVariant,
) {
  const label =
    capitalizeVariant(variant);

  return [
    `🐾 ${label} ${pet.PETS}`,
    "",
    `${label} value: ${getPetVariantValue(
      pet,
      variant,
    )}`,
  ].join("\n");
}

function createMatchText(
  match: PetMessageMatch,
) {
  if (match.variant) {
    return createVariantValueText(
      match.pet,
      match.variant,
    );
  }

  return createAllValuesText(match.pet);
}

function createPetSuggestions(
  petName: string,
  selectedVariant?: PetVariant,
) {
  const variants: PetVariant[] = [
    "normal",
    "neon",
    "mega",
  ];

  return variants
    .filter(
      (variant) =>
        variant !== selectedVariant,
    )
    .map((variant) => ({
      id: `${petName}-${variant}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      label: `${capitalizeVariant(
        variant,
      )} value`,
      message: `What is the ${variant} ${petName} worth?`,
    }));
}

function isVariantOnlyFollowUp(
  message: string,
) {
  const variant =
    detectPetVariant(message);

  if (!variant) {
    return false;
  }

  const normalizedMessage =
    normalizeText(message);

  const followUpWords = new Set([
    variant,
    `the ${variant}`,
    `${variant} value`,
    `${variant} worth`,
    `${variant} one`,
    `what about ${variant}`,
    `how about ${variant}`,
    `and ${variant}`,
    `and the ${variant}`,
  ]);

  if (
    followUpWords.has(normalizedMessage)
  ) {
    return true;
  }

  return (
    normalizedMessage.startsWith(
      "what about",
    ) ||
    normalizedMessage.startsWith(
      "how about",
    )
  );
}

function createVariantFollowUpMatch(
  message: string,
  lastPetName?: string,
): PetMessageMatch | undefined {
  if (
    !lastPetName ||
    !isVariantOnlyFollowUp(message)
  ) {
    return undefined;
  }

  const pet =
    findPetByName(lastPetName);

  const variant =
    detectPetVariant(message);

  if (!pet || !variant) {
    return undefined;
  }

  return {
    pet,
    matchedName: pet.PETS,
    variant,
    lineIndex: 0,
  };
}

function createPetFollowUpMatches(
  message: string,
  matches: PetMessageMatch[],
  lastVariant?: PetVariant,
) {
  const normalizedMessage =
    normalizeText(message);

  const looksLikeFollowUp =
    normalizedMessage.startsWith("and ") ||
    normalizedMessage.startsWith(
      "what about ",
    ) ||
    normalizedMessage.startsWith(
      "how about ",
    );

  if (
    !looksLikeFollowUp ||
    !lastVariant
  ) {
    return matches;
  }

  return matches.map((match) => ({
    ...match,
    variant:
      match.variant ?? lastVariant,
  }));
}

function buildResponseText(
  matches: PetMessageMatch[],
) {
  if (matches.length === 1) {
    return [
      createMatchText(matches[0]),
      "",
      "These are the current CSBT values in the database.",
    ].join("\n");
  }

  const petBlocks = matches.map(
    (match) => createMatchText(match),
  );

  return [
    `I found ${matches.length} pets:`,
    "",
    petBlocks.join("\n\n"),
    "",
    "These are the current CSBT values in the database.",
  ].join("\n");
}

function createContextPet(
  match: PetMessageMatch,
): NichContextPet {
  const rememberedVariant =
    match.variant ?? "normal";

  const rawValue =
    getRawPetVariantValue(
      match.pet,
      rememberedVariant,
    );

  return {
    petName: match.pet.PETS,
    variant: rememberedVariant,
    value: parseNumericValue(rawValue),
    displayValue:
      formatPetValue(rawValue),
  };
}

function createRecentPets(
  matches: PetMessageMatch[],
) {
  return matches.map(createContextPet);
}

function getLastNumericValue(
  matches: PetMessageMatch[],
) {
  const lastMatch =
    matches[matches.length - 1];

  if (!lastMatch) {
    return undefined;
  }

  const variant =
    lastMatch.variant ?? "normal";

  return parseNumericValue(
    getRawPetVariantValue(
      lastMatch.pet,
      variant,
    ),
  );
}

export function createPetLookupResponse(
  input: NichBrainInput,
  providedAnalysis?: NichMessageAnalysis,
): NichResponse | null {
  const analysis =
    providedAnalysis ??
    analyzeNichMessage(input.message);

  const matchesWithMemory =
    createPetFollowUpMatches(
      input.message,
      analysis.pets,
      input.context.lastVariant,
    );

  const variantFollowUp =
    matchesWithMemory.length === 0
      ? createVariantFollowUpMatch(
          input.message,
          input.context.lastPetName,
        )
      : undefined;

  const matches = variantFollowUp
    ? [variantFollowUp]
    : matchesWithMemory;

  if (matches.length === 0) {
    return null;
  }

  const lastMatch =
    matches[matches.length - 1];

  const recentPets =
    createRecentPets(matches);

  return {
    text: buildResponseText(matches),
    intent: "petLookup",
    reaction: "searchFound",
    typingDuration:
      matches.length > 1
        ? Math.min(
            650 + matches.length * 100,
            1200,
          )
        : 600,
    suggestions: createPetSuggestions(
      lastMatch.pet.PETS,
      lastMatch.variant,
    ),
    context: {
      lastPetName:
        lastMatch.pet.PETS,
      lastVariant:
        lastMatch.variant ?? "normal",
      recentPets,
      lastNumericValue:
        getLastNumericValue(matches),
      lastIntent: "petLookup",
    },
  };
}

export default createPetLookupResponse;