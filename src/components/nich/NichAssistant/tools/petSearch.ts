import tradingItemsData from "../../../../data/tradingItems.json";
import type {
  TradeItem,
  TradeValue,
  ValueSource,
} from "../../../trade/types";
import { getItemValue } from "../../../../lib/valueSystem";

export type PetVariant =
  | "normal"
  | "neon"
  | "mega";

/**
 * Backward-compatible record used throughout Nich.
 *
 * The database now contains both PET and PETWEAR records. PETS remains an
 * alias for NAME so the existing brain and response files continue to work.
 */
export type PetRecord = TradeItem & {
  PETS: string;
};

export type PetSearchResult = {
  pet: PetRecord;
  matchedName: string;
};

export type PetMatchKind =
  | "exact"
  | "alias"
  | "prefix"
  | "token-prefix"
  | "token-subset"
  | "fuzzy";

export type PetMessageMatch =
  PetSearchResult & {
    variant?: PetVariant;
    lineIndex: number;
    quantity?: number;
    confidence?: number;
    matchKind?: PetMatchKind;
  };

export type PetSearchCandidate =
  PetSearchResult & {
    confidence: number;
    distance: number;
    matchKind: PetMatchKind;
  };

export type PetSearchResolution =
  | {
      status: "matched";
      match: PetSearchCandidate;
      candidates: PetSearchCandidate[];
    }
  | {
      status: "ambiguous";
      candidates: PetSearchCandidate[];
    }
  | {
      status: "notFound";
      candidates: [];
    };

type SearchablePetName = {
  pet: PetRecord;
  searchableName: string;
  normalizedName: string;
  isAlias: boolean;
};

type PositionedPetMatch =
  PetMessageMatch & {
    start: number;
    end: number;
  };

type ApproximatePetCandidate = {
  pet: PetRecord;
  matchedName: string;
  normalizedName: string;
  distance: number;
  similarity: number;
  isAlias: boolean;
  matchKind: Exclude<
    PetMatchKind,
    "exact" | "alias"
  >;
};

const petRecords: PetRecord[] = (
  tradingItemsData as TradeItem[]
).map((item) => ({
  ...item,
  PETS: item.NAME,
}));

/**
 * Only keep aliases that are specific enough to avoid matching the wrong
 * item. Broad aliases such as "frost" or "shadow" are intentionally avoided
 * because the unified database contains many similarly named records.
 */
const PET_ALIASES: Record<
  string,
  string
> = {
  "frost drag": "Frost Dragon",
  "frost drg": "Frost Dragon",
  frostdragon: "Frost Dragon",
  "frost dragn": "Frost Dragon",
  "frost dagon": "Frost Dragon",
  "frost dragon pet": "Frost Dragon",

  "bat drag": "Bat Dragon",
  "bat drg": "Bat Dragon",
  batdragon: "Bat Dragon",

  "shadow drag": "Shadow Dragon",
  "shadow drg": "Shadow Dragon",
  shadowdragon: "Shadow Dragon",

  kanga: "Kangaroo",
  kang: "Kangaroo",
  kangroo: "Kangaroo",
  kangro: "Kangaroo",

  "evil uni": "Evil Unicorn",
  eviluni: "Evil Unicorn",
  evilunicorn: "Evil Unicorn",
  "evil unicorn pet": "Evil Unicorn",

  "arctic rein": "Arctic Reindeer",
  "arctic reind": "Arctic Reindeer",
  arcticreindeer: "Arctic Reindeer",

  "albino monk": "Albino Monkey",
  albinomonkey: "Albino Monkey",
  "king monk": "Monkey King",
  monkeyking: "Monkey King",

  giraff: "Giraffe",
  girafe: "Giraffe",
  parr: "Parrot",
  parot: "Parrot",
  turt: "Turtle",
  turtel: "Turtle",
  hedge: "Hedgehog",
  "hedge hog": "Hedgehog",
  dalma: "Dalmatian",
  dalmatain: "Dalmatian",
  ele: "Elephant",
  flam: "Flamingo",
  flamigo: "Flamingo",

  "blue dog pet": "Blue Dog",
  "pink cat pet": "Pink Cat",
  "lion pet": "Lion",
  "cow pet": "Cow",
  "crow pet": "Crow",
  "unicorn pet": "Unicorn",
};

const FUZZY_IGNORED_WORDS =
  new Set([
    "a",
    "about",
    "an",
    "are",
    "around",
    "at",
    "can",
    "check",
    "close",
    "could",
    "do",
    "does",
    "find",
    "for",
    "get",
    "give",
    "how",
    "i",
    "in",
    "is",
    "it",
    "item",
    "items",
    "look",
    "me",
    "near",
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
    "wear",
    "were",
    "what",
    "whats",
    "worth",
    "would",
    "you",

    "pet",
    "pets",
    "petwear",
    "petwears",

    // Variants and potion words should not be treated as item-name words.
    "normal",
    "regular",
    "neon",
    "mega",
    "fly",
    "ride",
    "potion",
    "pot",
    "no",
    "np",
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

    // Trade language.
    "and",
    "adds",
    "against",
    "compare",
    "fair",
    "him",
    "his",
    "her",
    "hers",
    "lose",
    "mine",
    "my",
    "offer",
    "offering",
    "op",
    "other",
    "their",
    "theirs",
    "them",
    "trade",
    "trading",
    "underpay",
    "up",
    "versus",
    "vs",
    "wfl",
    "win",
    "your",
    "yours",
  ]);

const ITEM_QUERY_WORDS = [
  "worth",
  "value",
  "values",
  "price",
  "prices",
  "item",
  "items",
  "pet",
  "pets",
  "pet wear",
  "petwear",
  "petwears",
  "wear",
  "how much",
  "check",
  "show me",
  "tell me",
  "normal",
  "regular",
  "neon",
  "mega",
  "no potion",
  "no pot",
  "np",
  "fr",
  "nfr",
  "mfr",
] as const;

const UNAVAILABLE_VALUE_WORDS =
  new Set([
    "",
    "-",
    "--",
    "n/a",
    "na",
    "none",
    "null",
    "not available",
    "not listed",
    "unavailable",
    "unknown",
    "tbd",
    "trash",
  ]);

export function normalizeText(
  value: string,
) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[-_/]+/g, " ")
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(
      /\b(mfr|nfr|mf|mr|nf|nr|np)(?=[a-z])/g,
      "$1 ",
    )
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getWords(value: string) {
  const normalizedValue =
    normalizeText(value);

  return normalizedValue
    ? normalizedValue.split(" ")
    : [];
}

function singularizeWord(
  word: string,
) {
  if (
    word.length > 4 &&
    word.endsWith("ies")
  ) {
    return `${word.slice(0, -3)}y`;
  }

  if (
    word.length > 4 &&
    /(?:ches|shes|sses|xes|zes)$/.test(
      word,
    )
  ) {
    return word.slice(0, -2);
  }

  if (
    word.length > 3 &&
    word.endsWith("s") &&
    !word.endsWith("ss")
  ) {
    return word.slice(0, -1);
  }

  return word;
}

function createSearchPhraseAlternatives(
  value: string,
) {
  const words = getWords(value).filter(
    (word) =>
      !FUZZY_IGNORED_WORDS.has(word) &&
      !/^\d+$/.test(word) &&
      ![
        "one",
        "two",
        "three",
        "four",
        "five",
        "six",
        "seven",
        "eight",
        "nine",
        "ten",
        "eleven",
        "twelve",
        "thirteen",
        "fourteen",
        "fifteen",
        "sixteen",
        "seventeen",
        "eighteen",
      ].includes(word),
  );

  if (words.length === 0) {
    return [];
  }

  const original = words.join(" ");
  const singular = words
    .map(singularizeWord)
    .join(" ");

  return Array.from(
    new Set([original, singular]),
  ).filter(Boolean);
}

function looksLikeItemRequest(
  value: string,
) {
  const normalizedValue =
    normalizeText(value);

  return ITEM_QUERY_WORDS.some((word) =>
    containsWholePhrase(
      normalizedValue,
      word,
    ),
  );
}

function getRequestedCategory(
  value: string,
): TradeItem["CATEGORY"] | undefined {
  const normalizedValue =
    normalizeText(value);

  if (
    containsWholePhrase(
      normalizedValue,
      "pet wear",
    ) ||
    containsWholePhrase(
      normalizedValue,
      "petwear",
    ) ||
    containsWholePhrase(
      normalizedValue,
      "petwears",
    )
  ) {
    return "PETWEAR";
  }

  return undefined;
}

function calculateEditDistance(
  firstValue: string,
  secondValue: string,
) {
  const first =
    normalizeText(firstValue);
  const second =
    normalizeText(secondValue);

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
      Array<number>(
        second.length + 1,
      ).fill(0),
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

      distances[firstIndex][
        secondIndex
      ] = Math.min(
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
        distances[firstIndex][
          secondIndex
        ] = Math.min(
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

function tokensMatchInOrder(
  queryWords: string[],
  candidateWords: string[],
  allowPrefix: boolean,
) {
  let candidateIndex = 0;

  for (const queryWord of queryWords) {
    let found = false;

    while (
      candidateIndex <
      candidateWords.length
    ) {
      const candidateWord =
        candidateWords[candidateIndex];

      const matches = allowPrefix
        ? candidateWord.startsWith(
            queryWord,
          )
        : candidateWord === queryWord;

      candidateIndex += 1;

      if (matches) {
        found = true;
        break;
      }
    }

    if (!found) {
      return false;
    }
  }

  return true;
}

function getApproximateMatch(
  query: string,
  searchablePet: SearchablePetName,
): Omit<
  ApproximatePetCandidate,
  "pet" | "matchedName" | "isAlias"
> | null {
  const candidate =
    searchablePet.normalizedName;

  if (!query || !candidate) {
    return null;
  }

  if (candidate.startsWith(query)) {
    const coverage =
      query.length / candidate.length;

    if (
      query.length >= 4 &&
      coverage >= 0.38
    ) {
      return {
        normalizedName: candidate,
        distance:
          candidate.length -
          query.length,
        similarity:
          0.91 + Math.min(coverage, 1) * 0.07,
        matchKind: "prefix",
      };
    }
  }

  const queryWords =
    getWords(query);
  const candidateWords =
    getWords(candidate);

  if (
    queryWords.length > 0 &&
    queryWords.length <=
      candidateWords.length &&
    tokensMatchInOrder(
      queryWords,
      candidateWords,
      true,
    )
  ) {
    const coverage =
      queryWords.length /
      candidateWords.length;

    return {
      normalizedName: candidate,
      distance: Math.max(
        0,
        candidate.length -
          query.length,
      ),
      similarity:
        0.88 +
        Math.min(coverage, 1) *
          0.08,
      matchKind: "token-prefix",
    };
  }

  if (
    queryWords.length >= 2 &&
    queryWords.every((queryWord) =>
      candidateWords.includes(
        queryWord,
      ),
    )
  ) {
    const coverage =
      queryWords.length /
      candidateWords.length;

    return {
      normalizedName: candidate,
      distance: Math.max(
        0,
        candidate.length -
          query.length,
      ),
      similarity:
        0.84 +
        Math.min(coverage, 1) *
          0.08,
      matchKind: "token-subset",
    };
  }

  if (
    Math.abs(
      queryWords.length -
        candidateWords.length,
    ) > 1
  ) {
    return null;
  }

  const hasDifferentFirstCharacter =
    query[0] !== candidate[0];

  if (
    hasDifferentFirstCharacter &&
    Math.min(
      query.length,
      candidate.length,
    ) < 7
  ) {
    return null;
  }

  const longestLength = Math.max(
    query.length,
    candidate.length,
  );

  const distance =
    calculateEditDistance(
      query,
      candidate,
    );

  if (
    hasDifferentFirstCharacter &&
    distance > 1
  ) {
    return null;
  }

  if (
    distance >
    getAllowedFuzzyDistance(
      longestLength,
    )
  ) {
    return null;
  }

  const similarity =
    longestLength === 0
      ? 1
      : 1 -
        distance / longestLength;

  const minimumSimilarity =
    longestLength <= 4
      ? 0.76
      : 0.8;

  if (
    similarity <
    minimumSimilarity
  ) {
    return null;
  }

  return {
    normalizedName: candidate,
    distance,
    similarity,
    matchKind: "fuzzy",
  };
}

function rankApproximatePets(
  value: string,
  allowDirectName = false,
): ApproximatePetCandidate[] {
  const searchPhrases =
    createSearchPhraseAlternatives(
      value,
    );

  if (searchPhrases.length === 0) {
    return [];
  }

  const directNameRequest =
    allowDirectName &&
    searchPhrases.some(
      (phrase) =>
        getWords(phrase).length <= 5,
    );

  if (
    !directNameRequest &&
    !looksLikeItemRequest(value)
  ) {
    return [];
  }

  const requestedCategory =
    getRequestedCategory(value);

  const candidatesByPet =
    new Map<
      string,
      ApproximatePetCandidate
    >();

  for (
    const searchablePet of searchablePetNames
  ) {
    /**
     * Aliases are exact shortcuts, not broad fuzzy candidates. Skipping them
     * here prevents a query such as "frost" from being forced to Frost Dragon
     * only because the compact alias "frostdragon" starts with that word.
     */
    if (searchablePet.isAlias) {
      continue;
    }

    if (
      requestedCategory &&
      searchablePet.pet.CATEGORY !==
        requestedCategory
    ) {
      continue;
    }

    for (const phrase of searchPhrases) {
      const match = getApproximateMatch(
        phrase,
        searchablePet,
      );

      if (!match) {
        continue;
      }

      const candidate: ApproximatePetCandidate =
        {
          pet: searchablePet.pet,
          matchedName:
            searchablePet.searchableName,
          isAlias:
            searchablePet.isAlias,
          ...match,
        };

      const existing =
        candidatesByPet.get(
          searchablePet.pet.ID,
        );

      if (
        !existing ||
        candidate.similarity >
          existing.similarity ||
        (candidate.similarity ===
          existing.similarity &&
          candidate.distance <
            existing.distance) ||
        (candidate.similarity ===
          existing.similarity &&
          candidate.distance ===
            existing.distance &&
          !candidate.isAlias &&
          existing.isAlias)
      ) {
        candidatesByPet.set(
          searchablePet.pet.ID,
          candidate,
        );
      }
    }
  }

  return Array.from(
    candidatesByPet.values(),
  ).sort(
    (
      firstCandidate,
      secondCandidate,
    ) => {
      if (
        firstCandidate.similarity !==
        secondCandidate.similarity
      ) {
        return (
          secondCandidate.similarity -
          firstCandidate.similarity
        );
      }

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
        firstCandidate.isAlias !==
        secondCandidate.isAlias
      ) {
        return firstCandidate.isAlias
          ? 1
          : -1;
      }

      return firstCandidate.pet.NAME.localeCompare(
        secondCandidate.pet.NAME,
      );
    },
  );
}

function areCandidatesAmbiguous(
  query: string,
  firstCandidate:
    ApproximatePetCandidate,
  secondCandidate?:
    ApproximatePetCandidate,
) {
  if (
    !secondCandidate ||
    secondCandidate.pet.ID ===
      firstCandidate.pet.ID
  ) {
    return false;
  }

  const queryWords =
    createSearchPhraseAlternatives(
      query,
    )[0]?.split(" ") ?? [];

  const firstCandidateWords =
    getWords(
      firstCandidate.normalizedName,
    );

  const secondCandidateWords =
    getWords(
      secondCandidate.normalizedName,
    );

  const isSharedSingleWordPrefix =
    queryWords.length === 1 &&
    firstCandidateWords[0] ===
      queryWords[0] &&
    secondCandidateWords[0] ===
      queryWords[0];

  return (
    isSharedSingleWordPrefix ||
    (
      Math.abs(
        firstCandidate.similarity -
          secondCandidate.similarity,
      ) < 0.045 &&
      Math.abs(
        firstCandidate.distance -
          secondCandidate.distance,
      ) <= 1
    )
  );
}

function findBestApproximatePet(
  value: string,
  allowDirectName = false,
): ApproximatePetCandidate | undefined {
  const candidates =
    rankApproximatePets(
      value,
      allowDirectName,
    );

  const bestCandidate =
    candidates[0];

  if (!bestCandidate) {
    return undefined;
  }

  if (
    areCandidatesAmbiguous(
      value,
      bestCandidate,
      candidates[1],
    )
  ) {
    return undefined;
  }

  return bestCandidate;
}

function escapeRegExp(
  value: string,
) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

function createWholePhraseExpression(
  phrase: string,
  global = false,
) {
  const normalizedPhrase =
    normalizeText(phrase);

  if (!normalizedPhrase) {
    return null;
  }

  return new RegExp(
    `(?:^|\\s)(${escapeRegExp(
      normalizedPhrase,
    )})(?=$|\\s)`,
    global ? "gi" : "i",
  );
}

function containsWholePhrase(
  message: string,
  phrase: string,
) {
  const normalizedMessage =
    normalizeText(message);

  const expression =
    createWholePhraseExpression(
      phrase,
    );

  if (
    !normalizedMessage ||
    !expression
  ) {
    return false;
  }

  return expression.test(
    normalizedMessage,
  );
}

const recordsByNormalizedName =
  new Map<
    string,
    PetRecord[]
  >();

for (const pet of petRecords) {
  const normalizedName =
    normalizeText(pet.NAME);

  const existing =
    recordsByNormalizedName.get(
      normalizedName,
    ) ?? [];

  existing.push(pet);

  recordsByNormalizedName.set(
    normalizedName,
    existing,
  );
}

function findPetByExactDatabaseName(
  petName: string,
  category?: TradeItem["CATEGORY"],
): PetRecord | undefined {
  const normalizedPetName =
    normalizeText(petName);

  if (!normalizedPetName) {
    return undefined;
  }

  const matches =
    recordsByNormalizedName.get(
      normalizedPetName,
    );

  if (!matches?.length) {
    return undefined;
  }

  if (category) {
    return matches.find(
      (pet) =>
        pet.CATEGORY === category,
    );
  }

  /**
   * Duplicate rows with the same normalized name are resolved consistently.
   * PET is preferred only when a name exists in both categories and no
   * category hint is available.
   */
  return (
    matches.find(
      (pet) =>
        pet.CATEGORY === "PET",
    ) ?? matches[0]
  );
}

const searchablePetNames: SearchablePetName[] =
  [
    ...petRecords.map((pet) => ({
      pet,
      searchableName: pet.NAME,
      normalizedName:
        normalizeText(pet.NAME),
      isAlias: false,
    })),

    ...Object.entries(
      PET_ALIASES,
    ).flatMap(
      ([alias, officialName]) => {
        const pet =
          findPetByExactDatabaseName(
            officialName,
          );

        if (!pet) {
          return [];
        }

        return [
          {
            pet,
            searchableName: alias,
            normalizedName:
              normalizeText(alias),
            isAlias: true,
          },
        ];
      },
    ),
  ].sort(
    (
      firstName,
      secondName,
    ) => {
      const lengthDifference =
        secondName.normalizedName.length -
        firstName.normalizedName.length;

      if (lengthDifference !== 0) {
        return lengthDifference;
      }

      if (
        firstName.isAlias !==
        secondName.isAlias
      ) {
        return firstName.isAlias
          ? 1
          : -1;
      }

      return firstName.normalizedName.localeCompare(
        secondName.normalizedName,
      );
    },
  );

export function isUnavailableTradeValue(
  value: TradeValue,
) {
  if (
    value === undefined ||
    value === null
  ) {
    return true;
  }

  const normalizedValue = String(
    value,
  )
    .trim()
    .toLowerCase()
    .replace(/[.\s]+$/g, "");

  return UNAVAILABLE_VALUE_WORDS.has(
    normalizedValue,
  );
}

function parseCompactNumber(
  value: string,
) {
  const match = value.match(
    /^(-?\d+(?:\.\d+)?)\s*([km])?$/i,
  );

  if (!match) {
    return null;
  }

  const number = Number(match[1]);

  if (!Number.isFinite(number)) {
    return null;
  }

  const multiplier =
    match[2]?.toLowerCase() === "k"
      ? 1_000
      : match[2]?.toLowerCase() ===
          "m"
        ? 1_000_000
        : 1;

  return number * multiplier;
}

/**
 * Converts a CSBT value into one safe comparison number.
 *
 * - "30-40", "30 to 40", and "4000/3970" use the lower value.
 * - "1400+" uses 1400 as a conservative minimum.
 * - Missing and text-only values such as N/A or trash return null.
 */
export function parseTradeValueNumber(
  value: TradeValue,
): number | null {
  if (
    isUnavailableTradeValue(value)
  ) {
    return null;
  }

  if (
    typeof value === "number"
  ) {
    return Number.isFinite(value)
      ? value
      : null;
  }

  const normalizedValue = String(
    value,
  )
    .trim()
    .toLowerCase()
    .replace(/,/g, "");

  const numberTokens =
    normalizedValue.match(
      /\d+(?:\.\d+)?\s*[km]?/gi,
    );

  if (!numberTokens?.length) {
    return null;
  }

  const numbers = numberTokens
    .map((token) =>
      parseCompactNumber(
        token.replace(/\s+/g, ""),
      ),
    )
    .filter(
      (
        number,
      ): number is number =>
        number !== null &&
        Number.isFinite(number),
    );

  if (numbers.length === 0) {
    return null;
  }

  const looksLikeRange =
    numbers.length >= 2 &&
    (normalizedValue.includes("-") ||
      normalizedValue.includes(" to ") ||
      normalizedValue.includes("/") ||
      normalizedValue.includes("–") ||
      normalizedValue.includes("—"));

  if (looksLikeRange) {
    return Math.min(
      numbers[0],
      numbers[1],
    );
  }

  return numbers[0];
}

export function formatPetValue(
  value: TradeValue,
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

export function isPetWearRecord(
  pet: PetRecord,
) {
  return pet.CATEGORY === "PETWEAR";
}

export function getAvailablePetVariants(
  pet: PetRecord,
  source: ValueSource = "GCASH",
): PetVariant[] {
  const variants: PetVariant[] = [];

  if (
    parseTradeValueNumber(
      getRawPetVariantValue(pet, "normal", source),
    ) !== null
  ) {
    variants.push("normal");
  }

  if (
    pet.CATEGORY === "PET"
  ) {
    if (
      parseTradeValueNumber(
        getRawPetVariantValue(pet, "neon", source),
      ) !== null
    ) {
      variants.push("neon");
    }

    if (
      parseTradeValueNumber(
        getRawPetVariantValue(pet, "mega", source),
      ) !== null
    ) {
      variants.push("mega");
    }
  }

  return variants;
}

export function getRawPetVariantValue(
  pet: PetRecord,
  variant: PetVariant,
  source: ValueSource = "GCASH",
): TradeValue {
  const valueType =
    variant === "normal"
      ? "NORMAL"
      : variant === "neon"
        ? "NEON"
        : "MEGA";

  return getItemValue(
    pet,
    source,
    valueType,
  );
}

export function getPetVariantValue(
  pet: PetRecord,
  variant: PetVariant,
  source: ValueSource = "GCASH",
) {
  return formatPetValue(
    getRawPetVariantValue(
      pet,
      variant,
      source,
    ),
  );
}

function toSearchCandidate(
  candidate:
    ApproximatePetCandidate,
): PetSearchCandidate {
  return {
    pet: candidate.pet,
    matchedName:
      candidate.matchedName,
    confidence:
      candidate.similarity,
    distance:
      candidate.distance,
    matchKind:
      candidate.isAlias
        ? "alias"
        : candidate.matchKind,
  };
}

export function findPetSearchCandidates(
  petName: string,
  limit = 5,
  category?: TradeItem["CATEGORY"],
): PetSearchCandidate[] {
  const normalizedPetName =
    normalizeText(petName);

  if (!normalizedPetName) {
    return [];
  }

  const safeLimit = Math.min(
    Math.max(
      Math.floor(limit),
      1,
    ),
    10,
  );

  const exactMatches =
    recordsByNormalizedName.get(
      normalizedPetName,
    ) ?? [];

  const filteredExactMatches =
    category
      ? exactMatches.filter(
          (pet) =>
            pet.CATEGORY ===
            category,
        )
      : exactMatches;

  if (
    filteredExactMatches.length > 0
  ) {
    return filteredExactMatches
      .map((pet) => ({
        pet,
        matchedName: pet.NAME,
        confidence: 1,
        distance: 0,
        matchKind:
          "exact" as const,
      }))
      .slice(0, safeLimit);
  }

  const aliasTarget =
    PET_ALIASES[
      normalizedPetName
    ];

  if (aliasTarget) {
    const aliasPet =
      findPetByExactDatabaseName(
        aliasTarget,
        category,
      );

    if (aliasPet) {
      return [
        {
          pet: aliasPet,
          matchedName:
            normalizedPetName,
          confidence: 0.995,
          distance: 0,
          matchKind: "alias",
        },
      ];
    }
  }

  return rankApproximatePets(
    normalizedPetName,
    true,
  )
    .filter(
      (candidate) =>
        !category ||
        candidate.pet.CATEGORY ===
          category,
    )
    .slice(0, safeLimit)
    .map(toSearchCandidate);
}

export function resolvePetSearch(
  petName: string,
  category?: TradeItem["CATEGORY"],
): PetSearchResolution {
  const candidates =
    findPetSearchCandidates(
      petName,
      5,
      category,
    );

  const bestCandidate =
    candidates[0];

  if (!bestCandidate) {
    return {
      status: "notFound",
      candidates: [],
    };
  }

  if (
    bestCandidate.matchKind ===
      "exact" ||
    bestCandidate.matchKind ===
      "alias"
  ) {
    return {
      status: "matched",
      match: bestCandidate,
      candidates,
    };
  }

  const secondCandidate =
    candidates[1];

  const queryWords =
    createSearchPhraseAlternatives(
      petName,
    )[0]?.split(" ") ?? [];

  const bestWords =
    getWords(
      bestCandidate.pet.NAME,
    );

  const secondWords =
    secondCandidate
      ? getWords(
          secondCandidate.pet.NAME,
        )
      : [];

  const isSharedSingleWordPrefix =
    queryWords.length === 1 &&
    secondCandidate &&
    bestWords[0] ===
      queryWords[0] &&
    secondWords[0] ===
      queryWords[0];

  if (
    secondCandidate &&
    secondCandidate.pet.ID !==
      bestCandidate.pet.ID &&
    (
      isSharedSingleWordPrefix ||
      (
        Math.abs(
          bestCandidate.confidence -
            secondCandidate.confidence,
        ) < 0.045 &&
        Math.abs(
          bestCandidate.distance -
            secondCandidate.distance,
        ) <= 1
      )
    )
  ) {
    return {
      status: "ambiguous",
      candidates,
    };
  }

  return {
    status: "matched",
    match: bestCandidate,
    candidates,
  };
}

export function findPetByName(
  petName: string,
  category?: TradeItem["CATEGORY"],
): PetRecord | undefined {
  const resolution =
    resolvePetSearch(
      petName,
      category,
    );

  return resolution.status ===
    "matched"
    ? resolution.match.pet
    : undefined;
}

export function detectPetVariant(
  message: string,
): PetVariant | undefined {
  const normalizedMessage =
    normalizeText(message);

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
      "mf",
    ) ||
    containsWholePhrase(
      normalizedMessage,
      "mr",
    ) ||
    containsWholePhrase(
      normalizedMessage,
      "m",
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
      "nf",
    ) ||
    containsWholePhrase(
      normalizedMessage,
      "nr",
    ) ||
    containsWholePhrase(
      normalizedMessage,
      "n",
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
    ) ||
    containsWholePhrase(
      normalizedMessage,
      "no pot",
    ) ||
    containsWholePhrase(
      normalizedMessage,
      "np",
    )
  ) {
    return "normal";
  }

  return undefined;
}

const QUANTITY_WORDS: Record<
  string,
  number
> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
};

function parsePetQuantity(
  value: string,
) {
  const normalizedValue =
    normalizeText(value);

  if (!normalizedValue) {
    return 1;
  }

  const numericMatch =
    normalizedValue.match(
      /^(?:x\s*)?(\d{1,2})(?:\s*x)?(?:\s|$)|(?:^|\s)(?:x\s*)?(\d{1,2})(?:\s*x)?\s*$/,
    );

  if (numericMatch) {
    const quantity =
      Number(
        numericMatch[1] ??
          numericMatch[2],
      );

    if (
      Number.isInteger(quantity) &&
      quantity >= 1 &&
      quantity <= 18
    ) {
      return quantity;
    }
  }

  const wordMatch =
    normalizedValue.match(
      /^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen)(?:\s|$)|(?:^|\s)(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen)\s*$/,
    );

  if (wordMatch) {
    return (
      QUANTITY_WORDS[
        wordMatch[1] ??
          wordMatch[2]
      ] ?? 1
    );
  }

  return 1;
}

function detectQuantityForPosition(
  message: string,
  currentMatch:
    PositionedPetMatch,
  previousMatch?:
    PositionedPetMatch,
) {
  if (
    currentMatch.quantity &&
    currentMatch.quantity > 1
  ) {
    return currentMatch.quantity;
  }

  const normalizedMessage =
    normalizeText(message);

  const prefixStart =
    previousMatch?.end ?? 0;

  const nearbyPrefix =
    normalizedMessage.slice(
      prefixStart,
      currentMatch.start,
    );

  return parsePetQuantity(
    nearbyPrefix,
  );
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
  const normalizedMessage =
    normalizeText(message);

  if (!normalizedMessage) {
    return [];
  }

  const positionedMatches:
    PositionedPetMatch[] = [];

  for (
    const searchablePet of searchablePetNames
  ) {
    const expression =
      createWholePhraseExpression(
        searchablePet.normalizedName,
        true,
      );

    if (!expression) {
      continue;
    }

    let match =
      expression.exec(
        normalizedMessage,
      );

    while (match) {
      const leadingWhitespace =
        match[0].length -
        match[0].trimStart().length;

      const start =
        (match.index ?? 0) +
        leadingWhitespace;

      const end =
        start +
        searchablePet.normalizedName.length;

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

      if (!overlapsExisting) {
        positionedMatches.push({
          pet: searchablePet.pet,
          matchedName:
            searchablePet.searchableName,
          lineIndex,
          confidence:
            searchablePet.isAlias
              ? 0.995
              : 1,
          matchKind:
            searchablePet.isAlias
              ? "alias"
              : "exact",
          start,
          end,
        });
      }

      match = expression.exec(
        normalizedMessage,
      );
    }
  }

  return positionedMatches.sort(
    (
      firstMatch,
      secondMatch,
    ) =>
      firstMatch.start -
      secondMatch.start,
  );
}

function splitApproximateFragments(
  value: string,
) {
  return value
    .split(
      /\r?\n|,|;|\+|\s+\/\s+|\s+\b(?:and|with)\b\s+/gi,
    )
    .map((fragment) =>
      fragment.trim(),
    )
    .filter(Boolean);
}

function findUnmatchedRanges(
  message: string,
  positionedMatches:
    PositionedPetMatch[],
) {
  const normalizedMessage =
    normalizeText(message);

  if (!normalizedMessage) {
    return [];
  }

  if (
    positionedMatches.length === 0
  ) {
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

  for (
    const match of positionedMatches
  ) {
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

    cursor = Math.max(
      cursor,
      match.end,
    );
  }

  if (
    cursor <
    normalizedMessage.length
  ) {
    ranges.push({
      start: cursor,
      end: normalizedMessage.length,
      text: normalizedMessage.slice(
        cursor,
      ),
    });
  }

  return ranges.filter(
    (range) =>
      createSearchPhraseAlternatives(
        range.text,
      ).length > 0,
  );
}

function findFuzzyPositionedPets(
  message: string,
  lineIndex: number,
  exactMatches:
    PositionedPetMatch[],
): PositionedPetMatch[] {
  const unmatchedRanges =
    findUnmatchedRanges(
      message,
      exactMatches,
    );

  const approximateMatches:
    PositionedPetMatch[] = [];

  for (const range of unmatchedRanges) {
    const fragments =
      splitApproximateFragments(
        range.text,
      );

    const sourceFragments =
      fragments.length > 0
        ? fragments
        : [range.text];

    let fragmentCursor = 0;

    for (
      const fragment of sourceFragments
    ) {
      const candidate =
        findBestApproximatePet(
          fragment,
          exactMatches.length === 0,
        );

      if (!candidate) {
        fragmentCursor +=
          fragment.length + 1;
        continue;
      }

      const start =
        range.start +
        Math.max(
          0,
          range.text.indexOf(
            fragment,
            fragmentCursor,
          ),
        );

      const end =
        start + fragment.length;

      const overlapsExisting = [
        ...exactMatches,
        ...approximateMatches,
      ].some((existingMatch) =>
        rangesOverlap(
          start,
          end,
          existingMatch.start,
          existingMatch.end,
        ),
      );

      if (!overlapsExisting) {
        approximateMatches.push({
          pet: candidate.pet,
          matchedName:
            candidate.matchedName,
          variant:
            detectPetVariant(
              fragment,
            ),
          lineIndex,
          quantity:
            parsePetQuantity(
              fragment,
            ),
          confidence:
            candidate.similarity,
          matchKind:
            candidate.isAlias
              ? "alias"
              : candidate.matchKind,
          start,
          end,
        });
      }

      fragmentCursor +=
        fragment.length + 1;
    }
  }

  return approximateMatches;
}

function detectVariantForPosition(
  message: string,
  currentMatch:
    PositionedPetMatch,
  previousMatch?:
    PositionedPetMatch,
) {
  const normalizedMessage =
    normalizeText(message);

  const prefixStart =
    previousMatch?.end ?? 0;

  const nearbyPrefix =
    normalizedMessage
      .slice(
        prefixStart,
        currentMatch.start,
      )
      .trim();

  return detectPetVariant(
    nearbyPrefix,
  );
}

function findPetsInSection(
  section: string,
  lineIndex: number,
): PetMessageMatch[] {
  const exactMatches =
    findPositionedPets(
      section,
      lineIndex,
    );

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
    (
      firstMatch,
      secondMatch,
    ) =>
      firstMatch.start -
      secondMatch.start,
  );

  return positionedMatches.map(
    (match, index) => {
      const previousMatch =
        index > 0
          ? positionedMatches[
              index - 1
            ]
          : undefined;

      const requestedVariant =
        match.variant ??
        detectVariantForPosition(
          section,
          match,
          previousMatch,
        );

      return {
        pet: match.pet,
        matchedName:
          match.matchedName,
        variant:
          match.pet.CATEGORY ===
            "PETWEAR"
            ? "normal"
            : requestedVariant,
        lineIndex,
        quantity:
          detectQuantityForPosition(
            section,
            match,
            previousMatch,
          ),
        confidence:
          match.confidence,
        matchKind:
          match.matchKind,
      };
    },
  );
}

function splitMessageIntoSections(
  message: string,
) {
  return message
    .split(
      /\r?\n|,|;|\+|\s+\/\s+/gi,
    )
    .map((section) =>
      section.trim(),
    )
    .filter(Boolean);
}

export function findPetsInMessage(
  message: string,
): PetMessageMatch[] {
  const sections =
    splitMessageIntoSections(
      message,
    );

  const sourceSections =
    sections.length > 0
      ? sections
      : [message];

  const matches =
    sourceSections.flatMap(
      (section, lineIndex) =>
        findPetsInSection(
          section,
          lineIndex,
        ),
    );

  return matches;
}

export function findPetInMessage(
  message: string,
): PetSearchResult | undefined {
  const normalizedMessage =
    normalizeText(message);

  if (!normalizedMessage) {
    return undefined;
  }

  const positionedMatch =
    findPetsInMessage(message)[0];

  if (positionedMatch) {
    return {
      pet: positionedMatch.pet,
      matchedName:
        positionedMatch.matchedName,
    };
  }

  const directMatch =
    findPetByName(
      normalizedMessage,
    );

  if (!directMatch) {
    return undefined;
  }

  return {
    pet: directMatch,
    matchedName:
      directMatch.NAME,
  };
}

export function getAllPetRecords() {
  return petRecords;
}

/**
 * Unified Trading Item aliases.
 *
 * Existing pet-named exports remain available for backward compatibility.
 */
export type TradingItemRecord =
  PetRecord;
export type TradingItemVariant =
  PetVariant;
export const findTradingItemByName =
  findPetByName;
export const findTradingItemCandidates =
  findPetSearchCandidates;
export const resolveTradingItemSearch =
  resolvePetSearch;
export const findTradingItemsInMessage =
  findPetsInMessage;
export const findTradingItemInMessage =
  findPetInMessage;
export const getAllTradingItemRecords =
  getAllPetRecords;