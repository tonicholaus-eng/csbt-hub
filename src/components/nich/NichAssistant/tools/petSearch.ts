import pets from "../../../../data/pets.json";

export type PetVariant = "normal" | "neon" | "mega";

export type PetRecord = {
  PETS: string;
  NORMAL?: string | number;
  NEON?: string | number;
  MEGA?: string | number;
  IMAGE?: string;
};

export type PetSearchResult = {
  pet: PetRecord;
  matchedName: string;
};

export type PetMessageMatch = PetSearchResult & {
  variant?: PetVariant;
  lineIndex: number;
};

type SearchablePetName = {
  pet: PetRecord;
  searchableName: string;
  normalizedName: string;
  isAlias: boolean;
};

type PositionedPetMatch = PetMessageMatch & {
  start: number;
  end: number;
};

const petRecords = pets as PetRecord[];

const PET_ALIASES: Record<string, string> = {
  "frost drag": "Frost Dragon",
  frost: "Frost Dragon",

  "bat drag": "Bat Dragon",
  "bat dragon": "Bat Dragon",

  "shadow drag": "Shadow Dragon",
  shadow: "Shadow Dragon",

  kanga: "Kangaroo",
  kang: "Kangaroo",

  "evil uni": "Evil Unicorn",
  evil: "Evil Unicorn",

  "arctic rein": "Arctic Reindeer",
  "arctic reindeer": "Arctic Reindeer",

  "giraff": "Giraffe",

  "parr": "Parrot",

  "crow pet": "Crow",

  "turt": "Turtle",

  "albino monk": "Albino Monkey",

  "king monk": "Monkey King",

  "queen bee": "Queen Bee",

  "blue dog": "Blue Dog",

  "pink cat": "Pink Cat",

  "hedge": "Hedgehog",

  "dalma": "Dalmatian",

  "ele": "Elephant",

  "flam": "Flamingo",

  "lion pet": "Lion",

  "cow pet": "Cow",

  "unicorn pet": "Unicorn",
};

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createWholePhraseExpression(phrase: string) {
  const normalizedPhrase = normalizeText(phrase);

  if (!normalizedPhrase) {
    return null;
  }

  return new RegExp(
    `(?:^|\\s)(${escapeRegExp(normalizedPhrase)})(?=$|\\s)`,
    "i",
  );
}

function containsWholePhrase(
  message: string,
  phrase: string,
) {
  const normalizedMessage = normalizeText(message);
  const expression =
    createWholePhraseExpression(phrase);

  if (!normalizedMessage || !expression) {
    return false;
  }

  return expression.test(normalizedMessage);
}

function findPetByExactDatabaseName(
  petName: string,
): PetRecord | undefined {
  const normalizedPetName = normalizeText(petName);

  if (!normalizedPetName) {
    return undefined;
  }

  return petRecords.find(
    (pet) =>
      normalizeText(pet.PETS) ===
      normalizedPetName,
  );
}

const searchablePetNames: SearchablePetName[] = [
  ...petRecords.map((pet) => ({
    pet,
    searchableName: pet.PETS,
    normalizedName: normalizeText(pet.PETS),
    isAlias: false,
  })),

  ...Object.entries(PET_ALIASES).flatMap(
    ([alias, officialName]) => {
      const pet =
        findPetByExactDatabaseName(officialName);

      if (!pet) {
        return [];
      }

      return [
        {
          pet,
          searchableName: alias,
          normalizedName: normalizeText(alias),
          isAlias: true,
        },
      ];
    },
  ),
].sort((firstName, secondName) => {
  const lengthDifference =
    secondName.normalizedName.length -
    firstName.normalizedName.length;

  if (lengthDifference !== 0) {
    return lengthDifference;
  }

  if (
    firstName.isAlias !== secondName.isAlias
  ) {
    return firstName.isAlias ? 1 : -1;
  }

  return firstName.normalizedName.localeCompare(
    secondName.normalizedName,
  );
});

export function formatPetValue(
  value: string | number | undefined,
) {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return "Not listed";
  }

  return String(value).trim();
}

export function getRawPetVariantValue(
  pet: PetRecord,
  variant: PetVariant,
): string | number | undefined {
  switch (variant) {
    case "normal":
      return pet.NORMAL;

    case "neon":
      return pet.NEON;

    case "mega":
      return pet.MEGA;
  }
}

export function getPetVariantValue(
  pet: PetRecord,
  variant: PetVariant,
) {
  return formatPetValue(
    getRawPetVariantValue(pet, variant),
  );
}

export function findPetByName(
  petName: string,
): PetRecord | undefined {
  const normalizedPetName = normalizeText(petName);

  if (!normalizedPetName) {
    return undefined;
  }

  const exactPet =
    findPetByExactDatabaseName(normalizedPetName);

  if (exactPet) {
    return exactPet;
  }

  const aliasTarget =
    PET_ALIASES[normalizedPetName];

  if (!aliasTarget) {
    return undefined;
  }

  return findPetByExactDatabaseName(
    aliasTarget,
  );
}

export function detectPetVariant(
  message: string,
): PetVariant | undefined {
  const normalizedMessage = normalizeText(message);

  if (!normalizedMessage) {
    return undefined;
  }

  if (
    containsWholePhrase(
      normalizedMessage,
      "mega neon",
    ) ||
    containsWholePhrase(
      normalizedMessage,
      "mega",
    ) ||
    containsWholePhrase(
      normalizedMessage,
      "mfr",
    ) ||
    containsWholePhrase(
      normalizedMessage,
      "mr",
    )
  ) {
    return "mega";
  }

  if (
    containsWholePhrase(
      normalizedMessage,
      "neon",
    ) ||
    containsWholePhrase(
      normalizedMessage,
      "nfr",
    ) ||
    containsWholePhrase(
      normalizedMessage,
      "nr",
    )
  ) {
    return "neon";
  }

  if (
    containsWholePhrase(
      normalizedMessage,
      "normal",
    ) ||
    containsWholePhrase(
      normalizedMessage,
      "regular",
    ) ||
    containsWholePhrase(
      normalizedMessage,
      "no potion",
    )
  ) {
    return "normal";
  }

  return undefined;
}

function rangesOverlap(
  firstStart: number,
  firstEnd: number,
  secondStart: number,
  secondEnd: number,
) {
  return (
    firstStart < secondEnd &&
    secondStart < firstEnd
  );
}

function findPositionedPets(
  message: string,
  lineIndex: number,
): PositionedPetMatch[] {
  const normalizedMessage = normalizeText(message);

  if (!normalizedMessage) {
    return [];
  }

  const positionedMatches: PositionedPetMatch[] = [];

  for (const searchablePet of searchablePetNames) {
    const expression =
      createWholePhraseExpression(
        searchablePet.normalizedName,
      );

    if (!expression) {
      continue;
    }

    const match = expression.exec(
      normalizedMessage,
    );

    if (!match || match.index === undefined) {
      continue;
    }

    const leadingWhitespace =
      match[0].length - match[0].trimStart().length;

    const start =
      match.index + leadingWhitespace;

    const end =
      start + searchablePet.normalizedName.length;

    const overlapsExisting =
      positionedMatches.some(
        (existingMatch) =>
          rangesOverlap(
            start,
            end,
            existingMatch.start,
            existingMatch.end,
          ),
      );

    if (overlapsExisting) {
      continue;
    }

    positionedMatches.push({
      pet: searchablePet.pet,
      matchedName: searchablePet.searchableName,
      lineIndex,
      start,
      end,
    });
  }

  return positionedMatches.sort(
    (firstMatch, secondMatch) =>
      firstMatch.start - secondMatch.start,
  );
}

function detectVariantForPosition(
  message: string,
  currentMatch: PositionedPetMatch,
  previousMatch?: PositionedPetMatch,
) {
  const normalizedMessage = normalizeText(message);

  const prefixStart =
    previousMatch?.end ?? 0;

  const nearbyPrefix = normalizedMessage
    .slice(prefixStart, currentMatch.start)
    .trim();

  return detectPetVariant(nearbyPrefix);
}

function findPetsInSection(
  section: string,
  lineIndex: number,
): PetMessageMatch[] {
  const positionedMatches =
    findPositionedPets(section, lineIndex);

  return positionedMatches.map(
    (match, index) => {
      const previousMatch =
        index > 0
          ? positionedMatches[index - 1]
          : undefined;

      return {
        pet: match.pet,
        matchedName: match.matchedName,
        variant: detectVariantForPosition(
          section,
          match,
          previousMatch,
        ),
        lineIndex,
      };
    },
  );
}

function splitMessageIntoSections(
  message: string,
) {
  return message
    .split(
      /\r?\n|,|;|\+|\/|\s+\band\b\s+/gi,
    )
    .map((section) => section.trim())
    .filter(Boolean);
}

export function findPetsInMessage(
  message: string,
): PetMessageMatch[] {
  const sections =
    splitMessageIntoSections(message);

  const sourceSections =
    sections.length > 0 ? sections : [message];

  const matches = sourceSections.flatMap(
    (section, lineIndex) =>
      findPetsInSection(section, lineIndex),
  );

  const seen = new Set<string>();

  return matches.filter((match) => {
    const key = [
      normalizeText(match.pet.PETS),
      match.variant ?? "all",
    ].join(":");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function findPetInMessage(
  message: string,
): PetSearchResult | undefined {
  const normalizedMessage = normalizeText(message);

  if (!normalizedMessage) {
    return undefined;
  }

  const exactMatch =
    findPetByName(normalizedMessage);

  if (exactMatch) {
    return {
      pet: exactMatch,
      matchedName: exactMatch.PETS,
    };
  }

  const firstMatch =
    findPetsInMessage(message)[0];

  if (!firstMatch) {
    return undefined;
  }

  return {
    pet: firstMatch.pet,
    matchedName: firstMatch.matchedName,
  };
}

export function getAllPetRecords() {
  return petRecords;
}