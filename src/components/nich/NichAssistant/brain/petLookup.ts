import type {
  NichBrainInput,
  NichContextPet,
  NichResponse,
  NichValueSource,
} from "./types";
import {
  VALUE_SOURCE_LABELS,
  detectValueSource,
} from "../../../../lib/valueSystem";
import {
  analyzeNichMessage,
  type NichMessageAnalysis,
} from "./messageAnalysis";
import {
  detectPetVariant,
  findPetByName,
  formatPetValue,
  getAvailablePetVariants,
  getPetVariantValue,
  getRawPetVariantValue,
  isPetWearRecord,
  normalizeText,
  parseTradeValueNumber,
  type PetMessageMatch,
  type PetRecord,
  type PetVariant,
} from "../tools/petSearch";
import { formatNumber, slugify } from "./language";

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

type AggregatedMatch = PetMessageMatch & { quantity: number };

function aggregateMatches(matches: PetMessageMatch[]): AggregatedMatch[] {
  const grouped = new Map<string, AggregatedMatch>();

  for (const match of matches) {
    const key = `${match.pet.ID}:${match.variant ?? "all"}`;
    const existing = grouped.get(key);

    if (existing) {
      existing.quantity += match.quantity ?? 1;
      continue;
    }

    grouped.set(key, {
      ...match,
      quantity: Math.max(1, Math.floor(match.quantity ?? 1)),
    });
  }

  return Array.from(grouped.values());
}

function formatValueWithQuantity(
  rawValue: string | number | null | undefined,
  quantity: number,
): { valueText: string; totalText?: string; numericValue?: number } {
  const displayValue = formatPetValue(rawValue);
  const numericValue = parseTradeValueNumber(rawValue);

  if (quantity <= 1 || numericValue === null) {
    return { valueText: displayValue, numericValue: numericValue ?? undefined };
  }

  return {
    valueText: displayValue,
    totalText: `${formatNumber(numericValue * quantity)} total`,
    numericValue: numericValue * quantity,
  };
}

function createVariantBlock(
  pet: PetRecord,
  variant: PetVariant,
  quantity: number,
  source: NichValueSource,
): string {
  const label = capitalize(variant);
  const rawValue = getRawPetVariantValue(pet, variant, source);
  const formatted = formatValueWithQuantity(rawValue, quantity);
  const title = quantity > 1 ? `${quantity} × ${label} ${pet.PETS}` : `${label} ${pet.PETS}`;

  return [
    `🐾 ${title}`,
    "",
    `${label} value: ${formatted.valueText}`,
    ...(formatted.totalText ? [`Combined value: ${formatted.totalText}`] : []),
  ].join("\n");
}

function createAllValuesBlock(
  pet: PetRecord,
  quantity: number,
  source: NichValueSource,
): string {
  const variants = getAvailablePetVariants(pet, source);
  const title = quantity > 1 ? `${quantity} × ${pet.PETS}` : pet.PETS;
  const lines = variants.map((variant) => {
    const rawValue = getRawPetVariantValue(pet, variant, source);
    const formatted = formatValueWithQuantity(rawValue, quantity);
    const total = formatted.totalText ? ` · ${formatted.totalText}` : "";
    return `${capitalize(variant)}: ${formatted.valueText}${total}`;
  });

  return [`🐾 ${title}`, "", ...lines].join("\n");
}

function createMatchText(
  match: AggregatedMatch,
  source: NichValueSource,
): string {
  return match.variant
    ? createVariantBlock(match.pet, match.variant, match.quantity, source)
    : createAllValuesBlock(match.pet, match.quantity, source);
}

function createPetSuggestions(
  pet: PetRecord,
  source: NichValueSource,
  selectedVariant?: PetVariant,
) {
  if (isPetWearRecord(pet)) {
    return [
      {
        id: `${slugify(pet.PETS)}-nearby`,
        label: "Find similar value",
        message: `Find items around the value of ${pet.PETS}`,
      },
    ];
  }

  return getAvailablePetVariants(pet, source)
    .filter((variant) => variant !== selectedVariant)
    .map((variant) => ({
      id: `${slugify(pet.PETS)}-${variant}`,
      label: `${capitalize(variant)} value`,
      message: `What is the ${variant} ${pet.PETS} worth using ${source === "ELVE" ? "Elve Shark" : "GCash"}?`,
    }))
    .slice(0, 3);
}

function isVariantOnlyFollowUp(message: string): boolean {
  const variant = detectPetVariant(message);
  if (!variant) return false;

  const normalized = normalizeText(message);
  return new Set([
    variant,
    `the ${variant}`,
    `${variant} value`,
    `${variant} worth`,
    `${variant} one`,
    `what about ${variant}`,
    `how about ${variant}`,
    `and ${variant}`,
    `and the ${variant}`,
  ]).has(normalized);
}

function createVariantFollowUpMatch(
  message: string,
  lastPetName?: string,
): PetMessageMatch | undefined {
  if (!lastPetName || !isVariantOnlyFollowUp(message)) return undefined;

  const pet = findPetByName(lastPetName);
  const variant = detectPetVariant(message);
  if (!pet || !variant) return undefined;

  return {
    pet,
    matchedName: pet.PETS,
    variant,
    lineIndex: 0,
    quantity: 1,
    confidence: 1,
    matchKind: "exact",
  };
}

function applyRememberedVariant(
  message: string,
  matches: PetMessageMatch[],
  lastVariant?: PetVariant,
): PetMessageMatch[] {
  const normalized = normalizeText(message);
  const looksLikeFollowUp =
    normalized.startsWith("and ") ||
    normalized.startsWith("what about ") ||
    normalized.startsWith("how about ");

  if (!looksLikeFollowUp || !lastVariant) return matches;
  return matches.map((match) => ({
    ...match,
    variant: match.variant ?? lastVariant,
  }));
}

function getAnalysisMatches(analysis: NichMessageAnalysis): PetMessageMatch[] {
  if (analysis.pets.length > 0) {
    return analysis.pets;
  }

  if (analysis.itemResolution?.status !== "matched") {
    return [];
  }

  const match = analysis.itemResolution.match;
  return [
    {
      pet: match.pet,
      matchedName: match.matchedName,
      variant: analysis.requestedVariant ?? undefined,
      lineIndex: 0,
      quantity: 1,
      confidence: match.confidence,
      matchKind: match.matchKind,
    },
  ];
}

function createContextPet(
  match: AggregatedMatch,
  source: NichValueSource,
): NichContextPet {
  const variant = match.variant ?? "normal";
  const rawValue = getRawPetVariantValue(match.pet, variant, source);
  const numeric = parseTradeValueNumber(rawValue);

  return {
    petName: match.pet.PETS,
    variant,
    ...(numeric !== null ? { value: numeric * match.quantity } : {}),
    displayValue:
      match.quantity > 1 && numeric !== null
        ? formatNumber(numeric * match.quantity)
        : formatPetValue(rawValue),
  };
}

export function createPetLookupResponse(
  input: NichBrainInput,
  providedAnalysis?: NichMessageAnalysis,
): NichResponse | null {
  const analysis = providedAnalysis ?? analyzeNichMessage(input.message);
  const source = detectValueSource(
    input.message,
    input.context.lastValueSource ?? "GCASH",
  ) as NichValueSource;
  const initialMatches = getAnalysisMatches(analysis);
  const matchesWithMemory = applyRememberedVariant(
    input.message,
    initialMatches,
    input.context.lastVariant,
  );
  const variantFollowUp =
    matchesWithMemory.length === 0
      ? createVariantFollowUpMatch(input.message, input.context.lastPetName)
      : undefined;
  const matches = aggregateMatches(
    variantFollowUp ? [variantFollowUp] : matchesWithMemory,
  );

  if (matches.length === 0) return null;

  const blocks = matches.map((match) => createMatchText(match, source));
  const lastMatch = matches.at(-1)!;
  const recentPets = matches.map((match) => createContextPet(match, source));
  const lastContextPet = recentPets.at(-1)!;
  const totalQuantity = matches.reduce((total, match) => total + match.quantity, 0);

  const text = [
    ...(matches.length > 1
      ? [`I found ${matches.length} item types (${totalQuantity} total items):`, ""]
      : []),
    blocks.join("\n\n"),
    "",
    `Source: ${VALUE_SOURCE_LABELS[source]}. Demand can still affect real trades.`,
  ].join("\n");

  return {
    text,
    intent: "petLookup",
    reaction: "searchFound",
    typingDuration: Math.min(500 + matches.length * 100, 1_100),
    suggestions: createPetSuggestions(lastMatch.pet, source, lastMatch.variant),
    context: {
      lastPetName: lastMatch.pet.PETS,
      lastVariant: lastMatch.variant ?? "normal",
      recentPets,
      lastNumericValue: lastContextPet.value,
      lastIntent: "petLookup",
      lastValueSource: source,
    },
  };
}

export default createPetLookupResponse;
