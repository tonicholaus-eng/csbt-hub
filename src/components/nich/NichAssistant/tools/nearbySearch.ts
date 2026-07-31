import {
  formatPetValue,
  getAllPetRecords,
  type PetVariant,
} from "./petSearch";

export type NearbyPetResult = {
  name: string;
  variant: PetVariant;
  value: string;
  centerValue: number;
  difference: number;
};

function getValueCenter(
  value:
    | string
    | number
    | null
    | undefined,
): number | null {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const numbers = String(value)
    .replace(/,/g, "")
    .match(/\d+(?:\.\d+)?/g)
    ?.map(Number)
    .filter((number) =>
      Number.isFinite(number),
    );

  if (!numbers?.length) {
    return null;
  }

  if (numbers.length === 1) {
    return numbers[0];
  }

  return (
    numbers[0] + numbers[1]
  ) / 2;
}

export function findPetsNearValue(
  targetValue: number,
  limit = 5,
): NearbyPetResult[] {
  if (!Number.isFinite(targetValue)) {
    return [];
  }

  const matches: NearbyPetResult[] = [];

  for (const pet of getAllPetRecords()) {
    const variants = [
      {
        variant: "normal" as const,
        value: pet.NORMAL,
      },
      {
        variant: "neon" as const,
        value: pet.NEON,
      },
      {
        variant: "mega" as const,
        value: pet.MEGA,
      },
    ];

    for (const item of variants) {
      const centerValue =
        getValueCenter(item.value);

      if (centerValue === null) {
        continue;
      }

      matches.push({
        name: pet.PETS,
        variant: item.variant,
        value: formatPetValue(
          item.value,
        ),
        centerValue,
        difference: Math.abs(
          centerValue - targetValue,
        ),
      });
    }
  }

  return matches
    .sort(
      (firstMatch, secondMatch) =>
        firstMatch.difference -
        secondMatch.difference,
    )
    .slice(0, Math.max(1, limit));
}

export function extractNearbyTargetValue(
  message: string,
): number | null {
  const normalizedMessage = message
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const match =
    normalizedMessage.match(
      /(?:around|near|about|close to|value|worth)\s+(\d+(?:\.\d+)?)/,
    );

  if (!match) {
    return null;
  }

  const targetValue = Number(match[1]);

  return Number.isFinite(targetValue)
    ? targetValue
    : null;
}