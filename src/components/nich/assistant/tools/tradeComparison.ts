import type {
  NichPotionStatus,
  NichTradeComparison,
  NichTradeItem,
} from "../brain/types";
import type { ValueSource } from "../../../trade/types";

import {
  findPetInMessage,
  findPetSpansInSection,
  findPetsInMessage,
  formatPetValue,
  getRawPetVariantValue,
  isPetWearRecord,
  normalizeText,
  parseTradeValueNumber,
  resolvePetSearch,
  type PetRecord,
  type PetVariant,
} from "./petSearch";

export type ParsedTradeItem = {
  text: string;
  petName: string;
  variant: PetVariant;
  potionStatus: NichPotionStatus;
  code: string;
};

export type ParsedTradeQuery = {
  offerText: string;
  requestText: string;
  offerItems: ParsedTradeItem[];
  requestItems: ParsedTradeItem[];

  /**
   * Backward-compatible details for the first item on each side.
   */
  offerPet: string;
  offerVariant: PetVariant;
  offerPotionStatus: NichPotionStatus;
  offerCode: string;
  requestPet: string;
  requestVariant: PetVariant;
  requestPotionStatus: NichPotionStatus;
  requestCode: string;
};

export type PartialParsedTradeQuery = {
  offerText: string;
  requestText: string;
  offerItems: ParsedTradeItem[];
  requestItems: ParsedTradeItem[];
  unresolvedOfferTexts: string[];
  unresolvedRequestTexts: string[];
};

type TradePetDetails = {
  variant: PetVariant;
  potionStatus: NichPotionStatus;
  code: string;
  hasNoPotionWarning: boolean;
};

type QuantityResult = {
  quantity: number;
  itemText: string;
};

const MISSING_FLY_ADJUSTMENT = -20;
const MISSING_RIDE_ADJUSTMENT = -10;
const MAX_ITEMS_PER_SIDE = 9;

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
};

function getNumericValue(
  value:
    | string
    | number
    | null
    | undefined,
): number | null {
  return parseTradeValueNumber(value);
}

function formatNumericValue(
  value: number,
) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value
    .toFixed(1)
    .replace(/\.0$/, "");
}

function containsWholePhrase(
  message: string,
  phrase: string,
) {
  const normalizedMessage =
    normalizeText(message);

  const normalizedPhrase =
    normalizeText(phrase);

  if (
    !normalizedMessage ||
    !normalizedPhrase
  ) {
    return false;
  }

  const escapedPhrase =
    normalizedPhrase.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

  return new RegExp(
    `(?:^|\\s)${escapedPhrase}(?=$|\\s)`,
    "i",
  ).test(normalizedMessage);
}

function isStrongAttachedPetResolution(
  resolution: ReturnType<typeof resolvePetSearch>,
  fragment: string,
) {
  if (resolution.status !== "matched") return false;

  const { match } = resolution;
  if (match.matchKind === "exact" || match.matchKind === "alias") return true;

  // Approximate code splitting is allowed for long compact trader forms such
  // as nfrballoonuni, but never for ordinary words beginning with FR/NF/etc.
  // Example: "frost" must not become FR + Ostrich ("ost").
  const compactFragment = normalizeText(fragment).replace(/\s+/g, "");
  if (compactFragment.length < 5) return false;

  return (
    (match.matchKind === "prefix" || match.matchKind === "token-prefix") &&
    match.confidence >= 0.93
  );
}

function detectTradeCode(
  text: string,
) {
  const codes = [
    "mfr",
    "nfr",
    "np",
    "fr",
    "mf",
    "mr",
    "nf",
    "nr",
    "m",
    "n",
    "f",
    "r",
  ];

  const explicit = codes.find((code) =>
    containsWholePhrase(text, code),
  );

  if (explicit) return explicit;

  // Traders often attach multi-letter potion/variant codes to the pet name:
  // "frbatdrag", "nfrkanga", "mfrparrot", or "batdragfr".
  // Only multi-letter codes are auto-split here because single F/R/N/M
  // prefixes are too easy to confuse with normal item names.
  const compactTokens = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const attachedCodes = ["mfr", "nfr", "np", "fr", "mf", "mr", "nf", "nr"] as const;
  for (const rawToken of compactTokens) {
    const token = rawToken.replace(/^x?\d{1,2}x?/, "");
    for (const code of attachedCodes) {
      if (token.length >= code.length + 2 && token.startsWith(code)) {
        const remainder = token.slice(code.length);
        const resolution = resolvePetSearch(remainder);
        if (isStrongAttachedPetResolution(resolution, remainder)) {
          return code;
        }
      }

      if (token.length >= code.length + 2 && token.endsWith(code)) {
        const base = token.slice(0, -code.length);
        const resolution = resolvePetSearch(base);
        if (isStrongAttachedPetResolution(resolution, base)) {
          return code;
        }
      }
    }
  }

  return undefined;
}

function containsNoPotion(
  text: string,
) {
  return (
    containsWholePhrase(
      text,
      "no potion",
    ) ||
    containsWholePhrase(
      text,
      "no pot",
    ) ||
    containsWholePhrase(
      text,
      "np",
    )
  );
}

function containsWrittenPotion(
  text: string,
) {
  return (
    containsWholePhrase(
      text,
      "fly",
    ) ||
    containsWholePhrase(
      text,
      "ride",
    ) ||
    containsWholePhrase(
      text,
      "fly ride",
    ) ||
    containsWholePhrase(
      text,
      "ride fly",
    )
  );
}

function detectWrittenPotionStatus(
  text: string,
): NichPotionStatus {
  const hasFly =
    containsWholePhrase(
      text,
      "fly",
    );

  const hasRide =
    containsWholePhrase(
      text,
      "ride",
    );

  if (hasFly && hasRide) {
    return "flyRide";
  }

  if (hasFly) {
    return "flyOnly";
  }

  if (hasRide) {
    return "rideOnly";
  }

  return "unspecified";
}

function createWrittenCode(
  variant: PetVariant,
  text: string,
) {
  if (containsNoPotion(text)) {
    return variant === "mega"
      ? "M"
      : variant === "neon"
        ? "N"
        : "NP";
  }

  const potionStatus =
    detectWrittenPotionStatus(text);

  const variantPrefix =
    variant === "mega"
      ? "M"
      : variant === "neon"
        ? "N"
        : "";

  switch (potionStatus) {
    case "flyRide":
      return `${variantPrefix}FR`;

    case "flyOnly":
      return `${variantPrefix}F`;

    case "rideOnly":
      return `${variantPrefix}R`;

    case "unspecified":
    default:
      return (
        variantPrefix ||
        "Normal"
      );
  }
}

function detectTradePetDetails(
  text: string,
): TradePetDetails {
  const code =
    detectTradeCode(text);

  switch (code) {
    case "mfr":
      return {
        variant: "mega",
        potionStatus: "flyRide",
        code: "MFR",
        hasNoPotionWarning: false,
      };

    case "mf":
      return {
        variant: "mega",
        potionStatus: "flyOnly",
        code: "MF",
        hasNoPotionWarning: false,
      };

    case "mr":
      return {
        variant: "mega",
        potionStatus: "rideOnly",
        code: "MR",
        hasNoPotionWarning: false,
      };

    case "m":
      return {
        variant: "mega",
        potionStatus: "unspecified",
        code: "M",
        hasNoPotionWarning: true,
      };

    case "nfr":
      return {
        variant: "neon",
        potionStatus: "flyRide",
        code: "NFR",
        hasNoPotionWarning: false,
      };

    case "nf":
      return {
        variant: "neon",
        potionStatus: "flyOnly",
        code: "NF",
        hasNoPotionWarning: false,
      };

    case "nr":
      return {
        variant: "neon",
        potionStatus: "rideOnly",
        code: "NR",
        hasNoPotionWarning: false,
      };

    case "n":
      return {
        variant: "neon",
        potionStatus: "unspecified",
        code: "N",
        hasNoPotionWarning: true,
      };

    case "np":
      return {
        variant: "normal",
        potionStatus: "unspecified",
        code: "NP",
        hasNoPotionWarning: true,
      };

    case "fr":
      return {
        variant: "normal",
        potionStatus: "flyRide",
        code: "FR",
        hasNoPotionWarning: false,
      };

    case "f":
      return {
        variant: "normal",
        potionStatus: "flyOnly",
        code: "F",
        hasNoPotionWarning: false,
      };

    case "r":
      return {
        variant: "normal",
        potionStatus: "rideOnly",
        code: "R",
        hasNoPotionWarning: false,
      };
  }

  if (
    containsWholePhrase(
      text,
      "mega",
    )
  ) {
    return {
      variant: "mega",
      potionStatus:
        detectWrittenPotionStatus(
          text,
        ),
      code: createWrittenCode(
        "mega",
        text,
      ),
      hasNoPotionWarning:
        !containsWrittenPotion(text),
    };
  }

  if (
    containsWholePhrase(
      text,
      "neon",
    )
  ) {
    return {
      variant: "neon",
      potionStatus:
        detectWrittenPotionStatus(
          text,
        ),
      code: createWrittenCode(
        "neon",
        text,
      ),
      hasNoPotionWarning:
        !containsWrittenPotion(text),
    };
  }

  if (containsNoPotion(text)) {
    return {
      variant: "normal",
      potionStatus: "unspecified",
      code: "NP",
      hasNoPotionWarning: true,
    };
  }

  const writtenPotionStatus =
    detectWrittenPotionStatus(text);

  if (
    writtenPotionStatus !==
    "unspecified"
  ) {
    return {
      variant: "normal",
      potionStatus:
        writtenPotionStatus,
      code: createWrittenCode(
        "normal",
        text,
      ),
      hasNoPotionWarning: false,
    };
  }

  return {
    variant: "normal",
    potionStatus: "unspecified",
    code: "Normal",
    hasNoPotionWarning: true,
  };
}

function normalizeDetailsForItem(
  pet: PetRecord,
  details: TradePetDetails,
): TradePetDetails {
  if (!isPetWearRecord(pet)) {
    return details;
  }

  /**
   * Pet Wear has only one database value and never receives potion or
   * Normal/Neon/Mega adjustments.
   */
  return {
    variant: "normal",
    potionStatus: "unspecified",
    code: "Item",
    hasNoPotionWarning: false,
  };
}

function getPotionAdjustment(
  potionStatus: NichPotionStatus,
  source: ValueSource,
) {
  if (source === "ELVE") return 0;
  switch (potionStatus) {
    case "flyOnly":
      return MISSING_RIDE_ADJUSTMENT;

    case "rideOnly":
      return MISSING_FLY_ADJUSTMENT;

    case "flyRide":
    case "unspecified":
    default:
      return 0;
  }
}

function expandAttachedTradeCodes(value: string) {
  const codes = ["mfr", "nfr", "fr", "mf", "mr", "nf", "nr", "np"] as const;

  return value
    .split(/(\s+|[,+;|])/g)
    .map((part) => {
      if (!part || /^(?:\s+|[,+;|])$/.test(part)) return part;

      const quantityPrefix = part.match(/^(x?\d{1,2}x?)(.+)$/i);
      const prefix = quantityPrefix?.[1] ?? "";
      const token = quantityPrefix?.[2] ?? part;
      const lower = token.toLowerCase();

      for (const code of codes) {
        if (lower.startsWith(code) && token.length >= code.length + 2) {
          const remainder = token.slice(code.length);
          const resolution = resolvePetSearch(remainder);
          if (isStrongAttachedPetResolution(resolution, remainder)) {
            return `${prefix}${code} ${remainder}`;
          }
        }

        if (lower.endsWith(code) && token.length >= code.length + 2) {
          const base = token.slice(0, -code.length);
          const resolution = resolvePetSearch(base);
          if (isStrongAttachedPetResolution(resolution, base)) {
            return `${prefix}${base} ${code}`;
          }
        }
      }

      return part;
    })
    .join("");
}

function normalizeTradeSeparators(
  value: string,
) {
  return expandAttachedTradeCodes(
    value
    .replace(
      /\bfly\s+and\s+ride\b/gi,
      "fly ride",
    )
    .replace(
      /\bride\s+and\s+fly\b/gi,
      "ride fly",
    )
    .replace(
      /\bplus\b/gi,
      "+",
    )
    .replace(/\s*&\s*/g, " + ")
    .replace(/(\d{1,2})x(?=[a-z])/gi, "$1x ")
    .replace(
      /\bwith adds?\b/gi,
      "+",
    )
    .replace(/[×]/g, "x"),
  );
}

function extractQuantity(
  text: string,
): QuantityResult {
  let itemText = text.trim();
  let quantity = 1;

  const leadingNumeric =
    itemText.match(
      /^(?:x\s*)?(\d+)\s*(?:x)?\s+(.+)$/i,
    );

  if (leadingNumeric) {
    const parsedQuantity =
      Number(leadingNumeric[1]);

    if (
      Number.isInteger(
        parsedQuantity,
      ) &&
      parsedQuantity >= 1 &&
      parsedQuantity <=
        MAX_ITEMS_PER_SIDE
    ) {
      quantity =
        parsedQuantity;
      itemText =
        leadingNumeric[2].trim();
    }
  } else {
    const leadingWord =
      itemText.match(
        /^(one|two|three|four|five|six|seven|eight|nine)\s+(.+)$/i,
      );

    if (leadingWord) {
      quantity =
        QUANTITY_WORDS[
          leadingWord[1].toLowerCase()
        ] ?? 1;

      itemText =
        leadingWord[2].trim();
    }
  }

  const trailingQuantity =
    itemText.match(
      /^(.+?)\s+x\s*(\d+)$/i,
    );

  if (trailingQuantity) {
    const parsedQuantity =
      Number(
        trailingQuantity[2],
      );

    if (
      Number.isInteger(
        parsedQuantity,
      ) &&
      parsedQuantity >= 1 &&
      parsedQuantity <=
        MAX_ITEMS_PER_SIDE
    ) {
      quantity =
        parsedQuantity;
      itemText =
        trailingQuantity[1].trim();
    }
  }

  return {
    quantity,
    itemText,
  };
}

function splitStrongTradeSeparators(
  value: string,
) {
  return value
    .split(
      /\r?\n|,|;|\+|\||\s+\/\s+/gi,
    )
    .map((item) =>
      item.trim(),
    )
    .filter(Boolean);
}

function splitConjunctionChunk(
  chunk: string,
) {
  const potentialItems =
    chunk
      .split(
        /\s+\b(?:and|with)\b\s+/gi,
      )
      .map((item) =>
        item.trim(),
      )
      .filter(Boolean);

  if (
    potentialItems.length <= 1
  ) {
    return [chunk];
  }

  const allPartsRecognized =
    potentialItems.every(
      (item) =>
        Boolean(
          findPetInMessage(
            extractQuantity(
              item,
            ).itemText,
          ),
        ),
    );

  if (allPartsRecognized) {
    return potentialItems;
  }

  /**
   * Keep official names containing "and" intact unless the complete chunk
   * clearly contains several database items.
   */
  const detectedItems =
    findPetsInMessage(chunk);

  return detectedItems.length > 1
    ? potentialItems
    : [chunk];
}

function resolvesAsOneTradeItem(value: string) {
  const normalized = normalizeText(value);
  if (!normalized) return false;

  const codeMatches = normalized.match(/(?:^|\s)(?:mfr|nfr|fr|mf|mr|nf|nr|np)(?=\s|$)/g) ?? [];
  if (codeMatches.length > 1) return false;

  const resolution = resolvePetSearch(value);
  if (resolution.status !== "matched") return false;

  const { match } = resolution;
  if (match.matchKind === "exact" || match.matchKind === "alias") return true;
  if (match.matchKind === "prefix" || match.matchKind === "token-prefix") {
    return match.confidence >= 0.94;
  }
  if (match.matchKind === "token-subset") {
    return match.confidence >= 0.92;
  }
  return match.matchKind === "fuzzy" && match.confidence >= 0.9;
}

function splitDenseTradeChunk(chunk: string) {
  const expandedChunk = expandAttachedTradeCodes(chunk);

  // Before splitting a dense-looking phrase, give the COMPLETE phrase a
  // chance to resolve to one catalog item. This is critical for natural
  // shorthand such as "balloon uni", where both "Balloon" and "Unicorn"
  // also exist as independent database items.
  if (resolvesAsOneTradeItem(expandedChunk)) {
    return [expandedChunk];
  }

  // Dense-side splitting must be conservative. Low-confidence token-prefix
  // matches can mistake quantity/variant text such as “2x fr” for unrelated
  // items (for example an item name beginning with the same letters).
  const spans = findPetSpansInSection(expandedChunk).filter(
    (span) => span.matchKind !== "token-prefix" && (span.confidence ?? 0) >= 0.94,
  );
  if (spans.length <= 1) return [expandedChunk];

  const normalized = normalizeText(expandedChunk);
  const pieces: string[] = [];
  let cursor = 0;

  for (const span of spans) {
    const end = Math.min(normalized.length, span.end);
    const piece = normalized.slice(cursor, end).trim();
    if (piece) pieces.push(piece);
    cursor = end;
  }

  const trailing = normalized.slice(cursor).trim();
  if (trailing && pieces.length > 0) {
    pieces[pieces.length - 1] = `${pieces[pieces.length - 1]} ${trailing}`.trim();
  }

  return pieces.length === spans.length ? pieces : [chunk];
}

function splitTradeSideIntoItems(
  value: string,
) {
  const normalizedValue =
    normalizeTradeSeparators(
      value,
    );

  return splitStrongTradeSeparators(
    normalizedValue,
  )
    .flatMap(
      splitConjunctionChunk,
    )
    .flatMap(
      splitDenseTradeChunk,
    )
    .map((item) =>
      item.trim(),
    )
    .filter(Boolean);
}

function parseTradeItem(
  text: string,
): ParsedTradeItem | null {
  const {
    itemText,
  } = extractQuantity(text);

  const result =
    findPetInMessage(itemText);

  if (!result) {
    return null;
  }

  const details =
    normalizeDetailsForItem(
      result.pet,
      detectTradePetDetails(
        itemText,
      ),
    );

  return {
    text: itemText,
    petName: result.pet.PETS,
    variant: details.variant,
    potionStatus:
      details.potionStatus,
    code: details.code,
  };
}

function parseTradeSide(
  text: string,
) {
  const chunks =
    splitTradeSideIntoItems(text);

  if (
    chunks.length === 0
  ) {
    return [];
  }

  const parsedItems:
    ParsedTradeItem[] = [];

  for (const chunk of chunks) {
    const quantity =
      extractQuantity(
        chunk,
      ).quantity;

    const parsedItem =
      parseTradeItem(chunk);

    if (!parsedItem) {
      /**
       * Never silently ignore an unknown chunk. A partial trade comparison is
       * more dangerous than returning a clarification request.
       */
      return [];
    }

    for (
      let count = 0;
      count < quantity;
      count += 1
    ) {
      if (
        parsedItems.length >=
        MAX_ITEMS_PER_SIDE
      ) {
        return parsedItems;
      }

      parsedItems.push({
        ...parsedItem,
        text: parsedItem.text,
      });
    }
  }

  return parsedItems;
}

function createTradeItem(
  text: string,
  source: ValueSource,
): NichTradeItem | null {
  const {
    itemText,
  } = extractQuantity(text);

  const result =
    findPetInMessage(itemText);

  if (!result) {
    return null;
  }

  const details =
    normalizeDetailsForItem(
      result.pet,
      detectTradePetDetails(
        itemText,
      ),
    );

  const rawValue =
    getRawPetVariantValue(
      result.pet,
      details.variant,
      source,
    );

  const baseValue =
    getNumericValue(rawValue);

  if (baseValue === null) {
    return null;
  }

  const potionAdjustment =
    isPetWearRecord(result.pet)
      ? 0
      : getPotionAdjustment(
          details.potionStatus,
          source,
        );

  const adjustedValue =
    Math.max(
      0,
      baseValue +
        potionAdjustment,
    );

  return {
    petName: result.pet.PETS,
    variant: details.variant,
    petCode: details.code,
    potionStatus:
      details.potionStatus,
    baseValue,
    baseDisplayValue:
      formatPetValue(rawValue),
    potionAdjustment,
    value: adjustedValue,
    displayValue:
      formatNumericValue(
        adjustedValue,
      ),
    hasNoPotionWarning:
      details.hasNoPotionWarning,
  };
}

function createTradeItems(
  text: string,
  source: ValueSource,
): NichTradeItem[] | null {
  const chunks =
    splitTradeSideIntoItems(text);

  if (
    chunks.length === 0
  ) {
    return null;
  }

  const items:
    NichTradeItem[] = [];

  for (const chunk of chunks) {
    const quantity =
      extractQuantity(
        chunk,
      ).quantity;

    const item =
      createTradeItem(chunk, source);

    if (!item) {
      return null;
    }

    for (
      let count = 0;
      count < quantity;
      count += 1
    ) {
      if (
        items.length >=
        MAX_ITEMS_PER_SIDE
      ) {
        return items;
      }

      items.push({
        ...item,
      });
    }
  }

  return items;
}

function sumTradeItems(
  items: NichTradeItem[],
) {
  return items.reduce(
    (total, item) =>
      total + item.value,
    0,
  );
}

export function compareTrade(
  offerText: string,
  requestText: string,
  source: ValueSource = "GCASH",
): NichTradeComparison | null {
  const offeredItems =
    createTradeItems(
      offerText,
      source,
    );

  const requestedItems =
    createTradeItems(
      requestText,
      source,
    );

  if (
    !offeredItems?.length ||
    !requestedItems?.length
  ) {
    return null;
  }

  const offeredValue =
    sumTradeItems(
      offeredItems,
    );

  const requestedValue =
    sumTradeItems(
      requestedItems,
    );

  const difference =
    requestedValue -
    offeredValue;

  const comparisonBase =
    Math.max(
      offeredValue,
      requestedValue,
      1,
    );

  const differencePercent =
    (difference /
      comparisonBase) *
    100;

  const absolutePercent =
    Math.abs(
      differencePercent,
    );

  let verdict:
    NichTradeComparison["verdict"];

  if (absolutePercent <= 5) {
    verdict = "fair";
  } else if (difference > 0) {
    verdict = "win";
  } else {
    verdict = "lose";
  }

  return {
    offeredItems,
    requestedItems,

    // Keep these fields so older Nich code remains compatible.
    offered: offeredItems[0],
    requested:
      requestedItems[0],

    offeredValue,
    requestedValue,
    difference,
    differencePercent,
    verdict,
    valueSource: source,
  };
}

const tradeSeparators = [
  /\s+versus\s+/i,
  /\s+against\s+/i,
  /\s+compared\s+to\s+/i,
  /\s+in\s+exchange\s+for\s+/i,
  /\s+kapalit(?:\s+ng)?\s+/i,
  /\s+para\s+sa\s+/i,
  /\s+for\s+/i,
  /\s+vs\.?\s+/i,
  /\s*<->\s*/i,
  /\s*<=>\s*/i,
  /\s*<>\s*/i,
  /\s*↔\s*/i,
  /\s*=\s*/i,
  /\s*=>\s*/i,
  /\s*->\s*/i,
  /\s*⇄\s*/i,
];

const YOUR_OWNER_PATTERN = [
  "my offer",
  "my side",
  "my pets",
  "my items",
  "what i give",
  "what im giving",
  "ako",
  "akin",
  "sakin",
  "ko",
  "im giving",
  "i am giving",
  "i give",
  "im trading",
  "i am trading",
  "i offer",
  "i have",
  "mine",
  "my",
  "me",
  "im",
  "i am",
  "i",
].join("|");

const THEIR_OWNER_PATTERN = [
  "their offer",
  "their side",
  "their pets",
  "their items",
  "what they give",
  "what hes giving",
  "what shes giving",
  "kanya",
  "kanila",
  "sa kanya",
  "sa kanila",
  "siya",
  "sila",
  "his offer",
  "her offer",
  "his",
  "hers",
  "him",
  "her",
  "theirs",
  "he",
  "she",
  "trader",
  "other trader",
  "other guy",
  "other person",
  "they are giving",
  "theyre giving",
  "they give",
  "he is giving",
  "hes giving",
  "she is giving",
  "shes giving",
  "other persons offer",
  "other person",
  "other trader",
  "someone else",
  "theirs",
  "their",
  "them",
  "they",
  "his",
  "him",
  "he",
  "hers",
  "her",
  "she",
  "yours",
  "your",
  "you",
].join("|");

function cleanTradeSide(
  value: string,
) {
  return value
    .replace(
      /^(?:wfl|w\/f\/l|w f l)\s*/i,
      "",
    )
    .replace(
      /^(?:is|are|compare|check|trade|trading|have|has|giving|give|gives|offering|offer|offers|receiving|receive|receives|get|gets|getting|got|gets me|gives me|i got|he got|she got|they got)\s+/i,
      "",
    )
    .replace(
      /^(?:your offer|my offer|their offer|his offer|her offer)\s*:?\s*/i,
      "",
    )
    .replace(
      /\s+(?:and|while)$/i,
      "",
    )
    .replace(
      /\s+(?:fair|good|bad|a win|a lose|win|lose|worth it|worth|better|wfl|w|f|l|big w|small w|big l|small l|op|up|overpay|underpay|panalo|lugi|talo|tabla|sakto)\??$/i,
      "",
    )
    .replace(
      /\s+(?:ba|po|naman|rn|right now|ngayon)\??$/i,
      "",
    )
    .trim();
}

function stripWflPrefix(
  message: string,
) {
  return message
    .replace(
      /^\s*(?:wfl|w\/f\/l|w f l|win fair lose)\s*[:\-]?\s*/i,
      "",
    )
    .trim();
}

function splitGiveReceiveTradeMessage(
  message: string,
) {
  const withoutWfl = stripWflPrefix(message);

  const giveReceivePatterns = [
    /^(?:i\s+give|im\s+giving|i\s+am\s+giving|giving|i\s+offer|im\s+offering)\s+(.+?)\s+(?:(?:and|then|while)\s+)?(?:i\s+)?(?:get|receive|am\s+getting|am\s+receiving|getting|receiving)\s+(.+)$/i,
    /^(?:bigay\s+ko|bibigay\s+ko|offer\s+ko|ipapalit\s+ko)\s+(.+?)\s+(?:(?:tapos|tas|kapalit|and)\s+)?(?:kuha\s+ko|makukuha\s+ko|receive\s+ko)\s+(.+)$/i,
  ];

  for (const pattern of giveReceivePatterns) {
    const match = withoutWfl.match(pattern);
    if (!match) continue;
    const offerText = cleanTradeSide(match[1]);
    const requestText = cleanTradeSide(match[2]);
    if (offerText && requestText) return { offerText, requestText };
  }

  // Reverse wording: "I get Owl for my Frost" / "they give Owl for my Frost".
  const receiveForMine = withoutWfl.match(
    /^(?:i\s+(?:get|receive|am\s+getting|am\s+receiving)|im\s+(?:getting|receiving)|i\s+(?:was|got)\s+offered|got\s+offered|someone\s+offered\s+me|they\s+(?:give|offer|gave|offered)(?:\s+me)?|theyre\s+(?:giving|offering)|he\s+(?:gives|offers|gave|offered)(?:\s+me)?|she\s+(?:gives|offers|gave|offered)(?:\s+me)?|trader\s+(?:gives|offers|gave|offered)(?:\s+me)?|other\s+(?:trader|guy|person)\s+(?:gives|offers|gave|offered)(?:\s+me)?)\s+(.+?)\s+for\s+(?:my\s+|mine\s+|my\s+offer\s+)?(.+)$/i,
  );

  if (receiveForMine) {
    const requestText = cleanTradeSide(receiveForMine[1]);
    const offerText = cleanTradeSide(receiveForMine[2]);
    if (offerText && requestText) return { offerText, requestText };
  }

  return null;
}

function splitTwoPartyVerbTradeMessage(
  message: string,
) {
  const withoutWfl = stripWflPrefix(message);

  const patterns = [
    /^(?:i\s+(?:give|offer|have|trade)|im\s+(?:giving|offering|trading)|i\s+am\s+(?:giving|offering|trading))\s+(.+?)\s+(?:and|then|while|but)\s+(?:they|them|he|him|she|her|trader|other\s+(?:trader|guy|person))\s+(?:give|gives|offer|offers|have|has|trade|trades|is\s+giving|are\s+giving|is\s+offering|are\s+offering)\s+(.+)$/i,
    /^(?:i\s+(?:have|got)|ive\s+got)\s+(.+?)[,;]?\s+(?:and\s+)?(?:they|he|she|trader|other\s+(?:trader|guy|person))\s+(?:have|has|got)\s+(.+)$/i,
    /^(?:bigay\s+ko|offer\s+ko|akin|side\s+ko)\s+(.+?)\s+(?:(?:and|tapos|tas|habang)\s+)?(?:bigay\s+(?:nya|niya)|offer\s+(?:nya|niya)|kanya|side\s+(?:nya|niya))\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = withoutWfl.match(pattern);
    if (!match) continue;
    const offerText = cleanTradeSide(match[1]);
    const requestText = cleanTradeSide(match[2]);
    if (offerText && requestText) return { offerText, requestText };
  }

  return null;
}

function splitOwnershipTradeMessage(
  message: string,
) {
  const withoutWfl =
    stripWflPrefix(message)
      .replace(/^(me|mine|my|ako)(?=(?:mfr|nfr|fr|nf|nr|mf|mr|np)[a-z])/i, "$1 ")
      .replace(/\b(them|him|her|their)(?=(?:mfr|nfr|fr|nf|nr|mf|mr|np)[a-z])/gi, "$1 ");

  const ownershipExpression =
    new RegExp(
      `^(?:${YOUR_OWNER_PATTERN})\\s*[:=\\-]?\\s*(.+?)[,;]?\\s+(?:(?:and|then|while|but)\\s+)?(?:${THEIR_OWNER_PATTERN})\\s*[:=\\-]?\\s*(.+)$`,
      "i",
    );

  const match =
    withoutWfl.match(
      ownershipExpression,
    );

  if (!match) {
    return null;
  }

  const offerText =
    cleanTradeSide(
      match[1],
    );

  const requestText =
    cleanTradeSide(
      match[2],
    );

  if (
    !offerText ||
    !requestText
  ) {
    return null;
  }

  return {
    offerText,
    requestText,
  };
}

function splitLabelledTradeMessage(
  message: string,
) {
  const withoutWfl =
    stripWflPrefix(message);

  const labelledMatch =
    withoutWfl.match(
      /^(?:my|your)\s+offer\s*:\s*(.+?)\s+(?:their|his|her)\s+offer\s*:\s*(.+)$/i,
    );

  if (!labelledMatch) {
    return null;
  }

  const offerText =
    cleanTradeSide(
      labelledMatch[1],
    );

  const requestText =
    cleanTradeSide(
      labelledMatch[2],
    );

  if (
    !offerText ||
    !requestText
  ) {
    return null;
  }

  return {
    offerText,
    requestText,
  };
}

function splitTradeMessage(
  message: string,
) {
  const labelledTrade =
    splitLabelledTradeMessage(
      message,
    );

  if (labelledTrade) {
    return labelledTrade;
  }

  const giveReceiveTrade =
    splitGiveReceiveTradeMessage(message);

  if (giveReceiveTrade) {
    return giveReceiveTrade;
  }

  const twoPartyVerbTrade =
    splitTwoPartyVerbTradeMessage(message);

  if (twoPartyVerbTrade) {
    return twoPartyVerbTrade;
  }

  const ownershipTrade =
    splitOwnershipTradeMessage(
      message,
    );

  if (ownershipTrade) {
    return ownershipTrade;
  }

  const withoutWfl =
    stripWflPrefix(message);

  for (
    const separator of tradeSeparators
  ) {
    const separatorMatch =
      withoutWfl.match(separator);

    if (
      !separatorMatch ||
      separatorMatch.index ===
        undefined
    ) {
      continue;
    }

    const start =
      separatorMatch.index;

    const end =
      start +
      separatorMatch[0].length;

    const offerText =
      cleanTradeSide(
        withoutWfl.slice(
          0,
          start,
        ),
      );

    const requestText =
      cleanTradeSide(
        withoutWfl.slice(end),
      );

    if (
      !offerText ||
      !requestText
    ) {
      continue;
    }

    return {
      offerText,
      requestText,
    };
  }

  return null;
}

function parseTradeSideLenient(text: string) {
  const chunks = splitTradeSideIntoItems(text);
  const items: ParsedTradeItem[] = [];
  const unresolvedTexts: string[] = [];

  for (const chunk of chunks) {
    const quantity = extractQuantity(chunk).quantity;
    const parsedItem = parseTradeItem(chunk);

    if (!parsedItem) {
      unresolvedTexts.push(chunk);
      continue;
    }

    for (let count = 0; count < quantity; count += 1) {
      if (items.length >= MAX_ITEMS_PER_SIDE) break;
      items.push({ ...parsedItem });
    }
  }

  return { items, unresolvedTexts };
}

/**
 * Keeps the side structure and every item NICH can safely resolve even when
 * one part is vague/unknown. This is used only for clarification — never to
 * calculate a misleading partial W/F/L.
 */
export function parseTradeMessageLenient(
  message: string,
): PartialParsedTradeQuery | null {
  const tradeSides = splitTradeMessage(message);
  if (!tradeSides) return null;

  const offer = parseTradeSideLenient(tradeSides.offerText);
  const request = parseTradeSideLenient(tradeSides.requestText);

  if (
    offer.items.length === 0 &&
    request.items.length === 0 &&
    offer.unresolvedTexts.length === 0 &&
    request.unresolvedTexts.length === 0
  ) {
    return null;
  }

  return {
    offerText: tradeSides.offerText,
    requestText: tradeSides.requestText,
    offerItems: offer.items,
    requestItems: request.items,
    unresolvedOfferTexts: offer.unresolvedTexts,
    unresolvedRequestTexts: request.unresolvedTexts,
  };
}

export function parseTradeMessage(
  message: string,
): ParsedTradeQuery | null {
  const normalizedMessage =
    normalizeText(message);

  if (!normalizedMessage) {
    return null;
  }

  const tradeSides =
    splitTradeMessage(message);

  if (!tradeSides) {
    return null;
  }

  const offerItems =
    parseTradeSide(
      tradeSides.offerText,
    );

  const requestItems =
    parseTradeSide(
      tradeSides.requestText,
    );

  if (
    offerItems.length === 0 ||
    requestItems.length === 0
  ) {
    return null;
  }

  const firstOffer =
    offerItems[0];

  const firstRequest =
    requestItems[0];

  return {
    offerText:
      tradeSides.offerText,
    requestText:
      tradeSides.requestText,
    offerItems,
    requestItems,

    // Keep the original first-item fields for compatibility.
    offerPet:
      firstOffer.petName,
    offerVariant:
      firstOffer.variant,
    offerPotionStatus:
      firstOffer.potionStatus,
    offerCode:
      firstOffer.code,
    requestPet:
      firstRequest.petName,
    requestVariant:
      firstRequest.variant,
    requestPotionStatus:
      firstRequest.potionStatus,
    requestCode:
      firstRequest.code,
  };
}