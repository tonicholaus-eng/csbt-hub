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

type FuzzyPetCandidate = {
  pet: PetRecord;
  matchedName: string;
  distance: number;
  similarity: number;
  isAlias: boolean;
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

const FUZZY_IGNORED_WORDS = new Set([
  "a",
  "about",
  "an",
  "are",
  "can",
  "check",
  "could",
  "do",
  "does",
  "find",
  "for",
  "get",
  "give",
  "how",
  "i",
  "is",
  "it",
  "look",
  "me",
  "of",
  "please",
  "pls",
  "price",
  "prices",
  "show",
  "tell",
  "the",
  "this",
  "to",
  "u",
  "up",
  "value",
  "values",
  "was",
  "were",
  "what",
  "whats",
  "worth",
  "would",
  "you",

  // Variant and potion words should not become part of a fuzzy pet name.
  "normal",
  "regular",
  "neon",
  "mega",
  "fly",
  "ride",
  "potion",
  "no",
  "f",
  "r",
  "fr",
  "n",
  "nf",
  "nr",
  "nfr",
  "m",
  "mf",
  "mr",
  "mfr",
]);

const PET_QUERY_WORDS = [
  "worth",
  "value",
  "values",
  "price",
  "how much",
  "check",
  "show me",
  "tell me",
  "normal",
  "regular",
  "neon",
  "mega",
  "no potion",
  "fr",
  "nfr",
  "mfr",
] as const;

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getWords(value: string) {
  const normalizedValue = normalizeText(value);

  return normalizedValue
    ? normalizedValue.split(" ")
    : [];
}

function createFuzzySearchPhrase(value: string) {
  return getWords(value)
    .filter(
      (word) =>
        !FUZZY_IGNORED_WORDS.has(word),
    )
    .join(" ")
    .trim();
}

function looksLikePetRequest(value: string) {
  const normalizedValue = normalizeText(value);

  return PET_QUERY_WORDS.some((word) =>
    containsWholePhrase(
      normalizedValue,
      word,
    ),
  );
}

function calculateEditDistance(
  firstValue: string,
  secondValue: string,
) {
  const first = normalizeText(firstValue);
  const second = normalizeText(secondValue);

  if (first === second) {
    return 0;
  }

  if (!first) {
    return second.length;
  }

  if (!second) {
    return first.length;
  }

  const distances = Array.from(
    { length: first.length + 1 },
    () =>
      Array<number>(second.length + 1)
        .fill(0),
  );

  for (
    let firstIndex = 0;
    firstIndex <= first.length;
    firstIndex += 1
  ) {
    distances[firstIndex][0] =
      firstIndex;
  }

  for (
    let secondIndex = 0;
    secondIndex <= second.length;
    secondIndex += 1
  ) {
    distances[0][secondIndex] =
      secondIndex;
  }

  for (
    let firstIndex = 1;
    firstIndex <= first.length;
    firstIndex += 1
  ) {
    for (
      let secondIndex = 1;
      secondIndex <= second.length;
      secondIndex += 1
    ) {
      const substitutionCost =
        first[firstIndex - 1] ===
        second[secondIndex - 1]
          ? 0
          : 1;

      distances[firstIndex][secondIndex] =
        Math.min(
          distances[firstIndex - 1][
            secondIndex
          ] + 1,
          distances[firstIndex][
            secondIndex - 1
          ] + 1,
          distances[firstIndex - 1][
            secondIndex - 1
          ] + substitutionCost,
        );

      const hasTransposition =
        firstIndex > 1 &&
        secondIndex > 1 &&
        first[firstIndex - 1] ===
          second[secondIndex - 2] &&
        first[firstIndex - 2] ===
          second[secondIndex - 1];

      if (hasTransposition) {
        distances[firstIndex][secondIndex] =
          Math.min(
            distances[firstIndex][
              secondIndex
            ],
            distances[firstIndex - 2][
              secondIndex - 2
            ] + substitutionCost,
          );
      }
    }
  }

  return distances[first.length][
    second.length
  ];
}

function getAllowedFuzzyDistance(
  length: number,
) {
  if (length <= 4) {
    return 1;
  }

  if (length <= 8) {
    return 1;
  }

  if (length <= 14) {
    return 2;
  }

  return 3;
}

function hasCompatibleWordCount(
  firstValue: string,
  secondValue: string,
) {
  return (
    Math.abs(
      getWords(firstValue).length -
        getWords(secondValue).length,
    ) <= 1
  );
}

function findBestFuzzyPet(
  value: string,
  allowDirectName = false,
): FuzzyPetCandidate | undefined {
  const fuzzyPhrase =
    createFuzzySearchPhrase(value);

  if (!fuzzyPhrase) {
    return undefined;
  }

  const directNameRequest =
    allowDirectName &&
    getWords(fuzzyPhrase).length <= 4;

  if (
    !directNameRequest &&
    !looksLikePetRequest(value)
  ) {
    return undefined;
  }

  const candidatesByPet =
    new Map<string, FuzzyPetCandidate>();

  for (const searchablePet of searchablePetNames) {
    if (
      !hasCompatibleWordCount(
        fuzzyPhrase,
        searchablePet.normalizedName,
      )
    ) {
      continue;
    }

    if (
      fuzzyPhrase[0] !==
      searchablePet.normalizedName[0]
    ) {
      continue;
    }

    const longestLength = Math.max(
      fuzzyPhrase.length,
      searchablePet.normalizedName.length,
    );

    const distance = calculateEditDistance(
      fuzzyPhrase,
      searchablePet.normalizedName,
    );

    const allowedDistance =
      getAllowedFuzzyDistance(longestLength);

    if (distance > allowedDistance) {
      continue;
    }

    const similarity =
      longestLength === 0
        ? 1
        : 1 - distance / longestLength;

    const minimumSimilarity =
      longestLength <= 4 ? 0.74 : 0.78;

    if (similarity < minimumSimilarity) {
      continue;
    }

    const petKey = normalizeText(
      searchablePet.pet.PETS,
    );

    const candidate: FuzzyPetCandidate = {
      pet: searchablePet.pet,
      matchedName: searchablePet.searchableName,
      distance,
      similarity,
      isAlias: searchablePet.isAlias,
    };

    const existingCandidate =
      candidatesByPet.get(petKey);

    if (
      !existingCandidate ||
      candidate.distance <
        existingCandidate.distance ||
      (candidate.distance ===
        existingCandidate.distance &&
        candidate.similarity >
          existingCandidate.similarity) ||
      (candidate.distance ===
        existingCandidate.distance &&
        candidate.similarity ===
          existingCandidate.similarity &&
        !candidate.isAlias &&
        existingCandidate.isAlias)
    ) {
      candidatesByPet.set(
        petKey,
        candidate,
      );
    }
  }

  const candidates = Array.from(
    candidatesByPet.values(),
  ).sort((firstCandidate, secondCandidate) => {
    if (
      firstCandidate.distance !==
      secondCandidate.distance
    ) {
      return (
        firstCandidate.distance -
        secondCandidate.distance
      );
    }

    if (
      firstCandidate.similarity !==
      secondCandidate.similarity
    ) {
      return (
        secondCandidate.similarity -
        firstCandidate.similarity
      );
    }

    return Number(firstCandidate.isAlias) -
      Number(secondCandidate.isAlias);
  });

  const bestCandidate = candidates[0];
  const secondCandidate = candidates[1];

  if (!bestCandidate) {
    return undefined;
  }

  // Avoid guessing when two different pets are equally plausible.
  if (
    secondCandidate &&
    secondCandidate.distance ===
      bestCandidate.distance &&
    Math.abs(
      secondCandidate.similarity -
        bestCandidate.similarity,
    ) < 0.03
  ) {
    return undefined;
  }

  return bestCandidate;
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

  if (aliasTarget) {
    return findPetByExactDatabaseName(
      aliasTarget,
    );
  }

  return findBestFuzzyPet(
    normalizedPetName,
    true,
  )?.pet;
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

function findUnmatchedRanges(
  message: string,
  positionedMatches: PositionedPetMatch[],
) {
  const normalizedMessage = normalizeText(message);

  if (!normalizedMessage) {
    return [];
  }

  if (positionedMatches.length === 0) {
    return [
      {
        start: 0,
        end: normalizedMessage.length,
        text: normalizedMessage,
      },
    ];
  }

  const ranges: Array<{
    start: number;
    end: number;
    text: string;
  }> = [];

  let cursor = 0;

  for (const match of positionedMatches) {
    if (cursor < match.start) {
      ranges.push({
        start: cursor,
        end: match.start,
        text: normalizedMessage.slice(
          cursor,
          match.start,
        ),
      });
    }

    cursor = Math.max(cursor, match.end);
  }

  if (cursor < normalizedMessage.length) {
    ranges.push({
      start: cursor,
      end: normalizedMessage.length,
      text: normalizedMessage.slice(cursor),
    });
  }

  return ranges.filter(
    (range) =>
      createFuzzySearchPhrase(range.text)
        .length > 0,
  );
}

function findFuzzyPositionedPets(
  message: string,
  lineIndex: number,
  exactMatches: PositionedPetMatch[],
): PositionedPetMatch[] {
  const unmatchedRanges =
    findUnmatchedRanges(
      message,
      exactMatches,
    );

  return unmatchedRanges.flatMap(
    (range) => {
      const candidate = findBestFuzzyPet(
        range.text,
        exactMatches.length === 0,
      );

      if (!candidate) {
        return [];
      }

      return [
        {
          pet: candidate.pet,
          matchedName:
            candidate.matchedName,
          variant: detectPetVariant(
            range.text,
          ),
          lineIndex,
          start: range.start,
          end: range.end,
        },
      ];
    },
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
  const exactMatches =
    findPositionedPets(section, lineIndex);

  const fuzzyMatches =
    findFuzzyPositionedPets(
      section,
      lineIndex,
      exactMatches,
    );

  const positionedMatches = [
    ...exactMatches,
    ...fuzzyMatches,
  ].sort(
    (firstMatch, secondMatch) =>
      firstMatch.start -
      secondMatch.start,
  );

  return positionedMatches.map(
    (match, index) => {
      const previousMatch =
        index > 0
          ? positionedMatches[index - 1]
          : undefined;

      return {
        pet: match.pet,
        matchedName: match.matchedName,
        variant:
          match.variant ??
          detectVariantForPosition(
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