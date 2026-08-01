import {
  formatPetValue,
  getAllPetRecords,
  getAvailablePetVariants,
  getRawPetVariantValue,
  parseTradeValueNumber,
  type PetRecord,
  type PetVariant,
} from "./petSearch";

export type NearbyPetResult = {
  name: string;
  category: PetRecord["CATEGORY"];
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
  return parseTradeValueNumber(value);
}

function getVariantValue(
  pet: PetRecord,
  variant: PetVariant,
) {
  return getRawPetVariantValue(
    pet,
    variant,
  );
}

export function findPetsNearValue(
  targetValue: number,
  limit = 5,
): NearbyPetResult[] {
  if (
    !Number.isFinite(
      targetValue,
    ) ||
    targetValue < 0
  ) {
    return [];
  }

  const safeLimit = Math.min(
    Math.max(1, limit),
    20,
  );

  const matches:
    NearbyPetResult[] = [];

  const seen =
    new Set<string>();

  for (
    const pet of getAllPetRecords()
  ) {
    const variants =
      getAvailablePetVariants(
        pet,
      );

    for (const variant of variants) {
      const rawValue =
        getVariantValue(
          pet,
          variant,
        );

      const centerValue =
        getValueCenter(
          rawValue,
        );

      if (centerValue === null) {
        continue;
      }

      const key =
        `${pet.ID}:${variant}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);

      matches.push({
        name: pet.PETS,
        category: pet.CATEGORY,
        variant,
        value:
          formatPetValue(
            rawValue,
          ),
        centerValue,
        difference:
          Math.abs(
            centerValue -
              targetValue,
          ),
      });
    }
  }

  return matches
    .sort(
      (
        firstMatch,
        secondMatch,
      ) => {
        if (
          firstMatch.difference !==
          secondMatch.difference
        ) {
          return (
            firstMatch.difference -
            secondMatch.difference
          );
        }

        const firstRelative =
          firstMatch.difference /
          Math.max(
            firstMatch.centerValue,
            targetValue,
            1,
          );

        const secondRelative =
          secondMatch.difference /
          Math.max(
            secondMatch.centerValue,
            targetValue,
            1,
          );

        if (
          firstRelative !==
          secondRelative
        ) {
          return (
            firstRelative -
            secondRelative
          );
        }

        return firstMatch.name.localeCompare(
          secondMatch.name,
        );
      },
    )
    .slice(0, safeLimit);
}

function parseCompactTarget(
  rawValue: string,
) {
  const normalizedValue =
    rawValue
      .toLowerCase()
      .replace(/,/g, "")
      .trim();

  const match =
    normalizedValue.match(
      /^(\d+(?:\.\d+)?)\s*([km])?$/,
    );

  if (!match) {
    return null;
  }

  const number =
    Number(match[1]);

  if (!Number.isFinite(number)) {
    return null;
  }

  const multiplier =
    match[2] === "k"
      ? 1_000
      : match[2] === "m"
        ? 1_000_000
        : 1;

  return number * multiplier;
}

export function extractNearbyTargetValue(
  message: string,
): number | null {
  const normalizedMessage =
    message
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const patterns = [
    /(?:around|near|about|close to|similar to|value of|worth)\s+(\d[\d,]*(?:\.\d+)?\s*[km]?)/i,
    /(\d[\d,]*(?:\.\d+)?\s*[km]?)\s+(?:value|worth)\b/i,
    /(?:find|show|search)\s+(?:pets?|items?|pet ?wears?)?\s*(?:around|near)?\s*(\d[\d,]*(?:\.\d+)?\s*[km]?)/i,
  ];

  for (const pattern of patterns) {
    const match =
      normalizedMessage.match(
        pattern,
      );

    if (!match) {
      continue;
    }

    const targetValue =
      parseCompactTarget(
        match[1],
      );

    if (
      targetValue !== null &&
      targetValue >= 0
    ) {
      return targetValue;
    }
  }

  return null;
}