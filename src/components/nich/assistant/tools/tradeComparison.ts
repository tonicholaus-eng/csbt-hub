import type {
  NichPotionStatus,
  NichTradeComparison,
  NichTradeItem,
} from "../brain/types";
import type { ValueSource } from "../../../trade/types";

import {
  findPetInMessage,
  findPetsInMessage,
  formatPetValue,
  getRawPetVariantValue,
  isPetWearRecord,
  normalizeText,
  parseTradeValueNumber,
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

  return codes.find((code) =>
    containsWholePhrase(text, code),
  );
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

function normalizeTradeSeparators(
  value: string,
) {
  return value
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
    .replace(
      /\bwith adds?\b/gi,
      "+",
    )
    .replace(/[×]/g, "x");
}

function extractQuantity(
  text: string,
): QuantityResult {
  let itemText = text.trim();
  let quantity = 1;

  const leadingNumeric =
    itemText.match(
      /^(?:x\s*)?(\d+)\s*(?:x\s*)?\s+(.+)$/i,
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
      /\r?\n|,|;|\+|\s+\/\s+/gi,
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
  /\s*=>\s*/i,
  /\s*->\s*/i,
  /\s*⇄\s*/i,
];

const YOUR_OWNER_PATTERN = [
  "my offer",
  "my side",
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
  "kanya",
  "kanila",
  "sa kanya",
  "sa kanila",
  "siya",
  "sila",
  "his offer",
  "her offer",
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
      /^(?:is|are|compare|check|trade|trading|have|has|giving|give|gives|offering|offer|offers|receiving|receive|receives|get|gets|getting)\s+/i,
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
      /\s+(?:fair|good|bad|a win|a lose|win|lose|worth it|worth|better|wfl|op|up|overpay|underpay|panalo|lugi)\??$/i,
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

function splitOwnershipTradeMessage(
  message: string,
) {
  const withoutWfl =
    stripWflPrefix(message);

  const ownershipExpression =
    new RegExp(
      `^(?:${YOUR_OWNER_PATTERN})\\s*[:\\-]?\\s+(.+?)\\s+(?:and\\s+|while\\s+)?(?:${THEIR_OWNER_PATTERN})\\s*[:\\-]?\\s+(.+)$`,
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