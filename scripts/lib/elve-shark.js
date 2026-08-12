const fs = require("fs");
const path = require("path");

const ELVE_URL = "https://www.elvebredd.com/adopt-me-calculator";
const MIN_EXPECTED_RECORDS = 1_500;
const REQUIRED_ITEMS = [
  "Frost Dragon",
  "Bat Dragon",
  "Owl",
  "Turtle",
];
const REQUIRED_CATEGORIES = [
  "PET",
  "PETWEAR",
  "EGG",
  "TOY",
];

const SUPPORTED_CATEGORIES = [
  "PET",
  "PETWEAR",
  "EGG",
  "TOY",
  "VEHICLE",
  "FOOD",
  "GIFT",
  "STROLLER",
  "STICKER",
  "OTHER",
];

function normalizeName(value) {
  return String(value ?? "")
    .replace(/\\u0026/gi, "&")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function toFiniteNumber(value) {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return Number(value.toFixed(10));
  }

  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const parsed = Number(
    String(value)
      .replace(/,/g, "")
      .trim(),
  );

  return Number.isFinite(parsed)
    ? Number(parsed.toFixed(10))
    : null;
}

function categoryFromElveType(value) {
  const type = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  const aliases = {
    pet: "PET",
    pets: "PET",
    petwear: "PETWEAR",
    "pet wear": "PETWEAR",
    egg: "EGG",
    eggs: "EGG",
    toy: "TOY",
    toys: "TOY",
    vehicle: "VEHICLE",
    vehicles: "VEHICLE",
    food: "FOOD",
    foods: "FOOD",
    gift: "GIFT",
    gifts: "GIFT",
    stroller: "STROLLER",
    strollers: "STROLLER",
    sticker: "STICKER",
    stickers: "STICKER",
    other: "OTHER",
    others: "OTHER",
  };

  return aliases[type] ?? null;
}


function rawItemToSnapshotItem(rawItem, fallbackCategory = null) {
  if (!rawItem || typeof rawItem !== "object") return null;

  const category =
    categoryFromElveType(
      rawItem.type ??
        rawItem.category ??
        rawItem.itemType ??
        rawItem.item_type ??
        fallbackCategory,
    ) ?? categoryFromElveType(fallbackCategory);

  const name = String(
    rawItem.name ??
      rawItem.itemName ??
      rawItem.item_name ??
      rawItem.title ??
      "",
  ).trim();

  if (!category || !name) return null;

  const normal =
    toFiniteNumber(rawItem.rvalue) ??
    toFiniteNumber(rawItem.regularValue) ??
    toFiniteNumber(rawItem.regular_value) ??
    toFiniteNumber(rawItem.sharkValue) ??
    toFiniteNumber(rawItem.shark_value) ??
    toFiniteNumber(rawItem.value);

  const neon =
    category === "PET"
      ? toFiniteNumber(rawItem.nvalue) ??
        toFiniteNumber(rawItem.neonValue) ??
        toFiniteNumber(rawItem.neon_value)
      : null;

  const mega =
    category === "PET"
      ? toFiniteNumber(rawItem.mvalue) ??
        toFiniteNumber(rawItem.megaValue) ??
        toFiniteNumber(rawItem.mega_value)
      : null;

  const image =
    rawItem.image ??
    rawItem.imageUrl ??
    rawItem.image_url ??
    rawItem.icon ??
    null;

  return {
    id: rawItem.id ?? rawItem.itemId ?? rawItem.item_id ?? null,
    name,
    category,
    image: typeof image === "string" ? image : null,
    normal,
    neon,
    mega,
    status:
      typeof rawItem.status === "string"
        ? rawItem.status
        : null,
    rarity:
      typeof rawItem.rarity === "string"
        ? rawItem.rarity
        : null,
  };
}

function mergeSnapshotItems(baseItems, extraItems) {
  const merged = new Map();

  for (const item of [...(baseItems ?? []), ...(extraItems ?? [])]) {
    if (!item?.category || !item?.name) continue;
    const key = `${item.category}:${normalizeName(item.name)}`;
    const previous = merged.get(key);

    if (!previous) {
      merged.set(key, item);
      continue;
    }

    merged.set(key, {
      ...previous,
      ...item,
      image: item.image ?? previous.image ?? null,
      normal: item.normal ?? previous.normal ?? null,
      neon: item.neon ?? previous.neon ?? null,
      mega: item.mega ?? previous.mega ?? null,
      status: item.status ?? previous.status ?? null,
      rarity: item.rarity ?? previous.rarity ?? null,
    });
  }

  return Array.from(merged.values()).sort((first, second) => {
    if (first.category !== second.category) {
      return first.category.localeCompare(second.category);
    }

    return first.name.localeCompare(second.name, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });
}

function findPushCallEnd(
  html,
  startIndex,
) {
  let inString = false;
  let escaped = false;
  let squareDepth = 0;
  let curlyDepth = 0;

  for (
    let index = startIndex;
    index < html.length;
    index += 1
  ) {
    const character = html[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }

      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === "[") {
      squareDepth += 1;
    }

    if (character === "]") {
      squareDepth -= 1;
    }

    if (character === "{") {
      curlyDepth += 1;
    }

    if (character === "}") {
      curlyDepth -= 1;
    }

    if (
      character === ")" &&
      squareDepth === 0 &&
      curlyDepth === 0
    ) {
      return index;
    }
  }

  return -1;
}

function findObjectWithInitialPets(value) {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  if (Array.isArray(value.initialPets)) {
    return value;
  }

  if (Array.isArray(value)) {
    for (const child of value) {
      const match =
        findObjectWithInitialPets(child);

      if (match) {
        return match;
      }
    }

    return null;
  }

  for (
    const child of Object.values(value)
  ) {
    const match =
      findObjectWithInitialPets(child);

    if (match) {
      return match;
    }
  }

  return null;
}

function extractInitialPetsPayload(html) {
  const marker = "self.__next_f.push(";
  let cursor = 0;

  while (cursor < html.length) {
    const callStart =
      html.indexOf(marker, cursor);

    if (callStart === -1) {
      break;
    }

    const argumentStart =
      callStart + marker.length;

    const callEnd = findPushCallEnd(
      html,
      argumentStart,
    );

    if (callEnd === -1) {
      break;
    }

    const argumentText = html
      .slice(argumentStart, callEnd)
      .trim();

    cursor = callEnd + 1;

    try {
      const parsedArguments =
        JSON.parse(argumentText);

      const payloadText =
        parsedArguments?.[1];

      if (
        typeof payloadText !== "string" ||
        !payloadText.includes("initialPets")
      ) {
        continue;
      }

      const colonIndex =
        payloadText.indexOf(":");

      const jsonText =
        colonIndex >= 0
          ? payloadText
              .slice(colonIndex + 1)
              .trim()
          : payloadText.trim();

      const parsedPayload =
        JSON.parse(jsonText);

      const result =
        findObjectWithInitialPets(
          parsedPayload,
        );

      if (result) {
        return result;
      }
    } catch {
      // Ignore unrelated or non-JSON Next.js chunks.
    }
  }

  throw new Error(
    "Could not locate Elvebredd initialPets data in the calculator page.",
  );
}

function createSnapshotFromHtml(
  html,
  fetchedAt = new Date().toISOString(),
) {
  const payload =
    extractInitialPetsPayload(html);

  const items = [];
  const unrecognizedTypes = new Set();

  for (const rawItem of payload.initialPets) {
    const converted = rawItemToSnapshotItem(rawItem);

    if (!converted) {
      const category = categoryFromElveType(
        rawItem?.type ?? rawItem?.category ?? rawItem?.itemType ?? rawItem?.item_type,
      );
      if (!category && (rawItem?.type ?? rawItem?.category)) {
        unrecognizedTypes.add(String(rawItem.type ?? rawItem.category));
      }
      continue;
    }

    items.push(converted);
  }

  items.sort((first, second) => {
    if (
      first.category !== second.category
    ) {
      return first.category.localeCompare(
        second.category,
      );
    }

    return first.name.localeCompare(
      second.name,
      undefined,
      {
        numeric: true,
        sensitivity: "base",
      },
    );
  });

  return {
    source: "Elvebredd",
    valueSystem: "Shark",
    sourceUrl: ELVE_URL,
    sourceVersion:
      payload.initialVersion ?? null,
    fetchedAt,
    recordCount: items.length,
    supportedCategories: SUPPORTED_CATEGORIES,
    unrecognizedTypes: Array.from(unrecognizedTypes).sort(),
    items,
  };
}

function validateSnapshot(
  snapshot,
  previousSnapshot,
) {
  if (
    !snapshot ||
    !Array.isArray(snapshot.items)
  ) {
    throw new Error(
      "Elve snapshot is missing its items array.",
    );
  }

  if (
    snapshot.items.length <
    MIN_EXPECTED_RECORDS
  ) {
    throw new Error(
      `Elve snapshot has only ${snapshot.items.length} records; expected at least ${MIN_EXPECTED_RECORDS}.`,
    );
  }

  const names = new Set(
    snapshot.items.map((item) =>
      normalizeName(item.name),
    ),
  );

  const missingRequired =
    REQUIRED_ITEMS.filter(
      (name) =>
        !names.has(normalizeName(name)),
    );

  if (missingRequired.length > 0) {
    throw new Error(
      `Elve snapshot is missing required records: ${missingRequired.join(", ")}.`,
    );
  }

  const categoryCounts =
    snapshot.items.reduce(
      (counts, item) => {
        counts[item.category] =
          (counts[item.category] ?? 0) + 1;

        return counts;
      },
      {},
    );

  const missingCategories =
    REQUIRED_CATEGORIES.filter(
      (category) =>
        !categoryCounts[category],
    );

  if (missingCategories.length > 0) {
    throw new Error(
      `Elve snapshot is missing required categories: ${missingCategories.join(", ")}.`,
    );
  }

  const valuedRecords =
    snapshot.items.filter(
      (item) => item.normal !== null,
    ).length;

  if (valuedRecords < 1_400) {
    throw new Error(
      `Only ${valuedRecords} Elve records have a regular Shark value.`,
    );
  }

  for (const category of [
    "EGG",
    "TOY",
  ]) {
    const valuedCategoryRecords =
      snapshot.items.filter(
        (item) =>
          item.category === category &&
          item.normal !== null,
      ).length;

    if (valuedCategoryRecords < 1) {
      throw new Error(
        `Elve snapshot has no valued ${category} records.`,
      );
    }
  }

  if (
    previousSnapshot?.items?.length
  ) {
    const ratio =
      snapshot.items.length /
      previousSnapshot.items.length;

    if (ratio < 0.85) {
      throw new Error(
        `Elve record count dropped by more than 15% (${previousSnapshot.items.length} to ${snapshot.items.length}).`,
      );
    }
  }
}

function buildSnapshotMap(snapshot) {
  const map = new Map();

  for (
    const item of snapshot.items ?? []
  ) {
    map.set(
      `${item.category}:${normalizeName(
        item.name,
      )}`,
      item,
    );
  }

  return map;
}

function readJsonIfPresent(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(
    fs.readFileSync(filePath, "utf8"),
  );
}

function writeSnapshot(
  snapshot,
  snapshotPath,
  backupPath,
) {
  fs.mkdirSync(
    path.dirname(snapshotPath),
    {
      recursive: true,
    },
  );

  if (
    fs.existsSync(snapshotPath) &&
    backupPath
  ) {
    fs.copyFileSync(
      snapshotPath,
      backupPath,
    );
  }

  fs.writeFileSync(
    snapshotPath,
    `${JSON.stringify(
      snapshot,
      null,
      2,
    )}\n`,
    "utf8",
  );
}

module.exports = {
  ELVE_URL,
  SUPPORTED_CATEGORIES,
  categoryFromElveType,
  mergeSnapshotItems,
  rawItemToSnapshotItem,
  buildSnapshotMap,
  createSnapshotFromHtml,
  normalizeName,
  readJsonIfPresent,
  validateSnapshot,
  writeSnapshot,
};