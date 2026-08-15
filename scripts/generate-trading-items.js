const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const {
  buildSnapshotMap,
  normalizeName,
  readJsonIfPresent,
} = require("./lib/elve-shark");

const projectRoot = process.cwd();
const excelPath = path.join(projectRoot, "source-data", "trading-data.xlsx");
const elveSnapshotPath = path.join(projectRoot, "source-data", "elve-shark-values.json");
const outputPath = path.join(projectRoot, "src", "data", "tradingItems.json");
const clientIndexPath = path.join(projectRoot, "src", "data", "tradingItemsIndex.json");
const sourceMetadataPath = path.join(projectRoot, "src", "data", "valueSources.json");
const tradingMetaPath = path.join(projectRoot, "src", "data", "tradingMeta.json");
const validationReportPath = path.join(projectRoot, "source-data", "trading-data-validation.json");
const ELVEBREDD_ORIGIN = "https://elvebredd.com";
const CATEGORY_CONFIG = {
  PET: { order: 0, sheet: "Pets", regularOnly: false },
  PETWEAR: { order: 1, sheet: "Pet Wear", regularOnly: true },
  EGG: { order: 2, sheet: "Eggs", regularOnly: true },
  VEHICLE: { order: 3, sheet: "Vehicles", regularOnly: true },
  FOOD: { order: 4, sheet: "Food", regularOnly: true },
  GIFT: { order: 5, sheet: "Gifts", regularOnly: true },
  STROLLER: { order: 6, sheet: "Strollers", regularOnly: true },
  TOY: { order: 7, sheet: "Toys", regularOnly: true },
  STICKER: { order: 8, sheet: "Stickers", regularOnly: true },
  OTHER: { order: 9, sheet: "Other", regularOnly: true },
};

const CATEGORY_ORDER = Object.fromEntries(
  Object.entries(CATEGORY_CONFIG).map(([category, config]) => [
    category,
    config.order,
  ]),
);

function cleanText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function roundNumber(value) {
  return Number(Number(value).toFixed(10));
}

/**
 * CSBT's master-value rule: when a cell contains a range, use its lower bound.
 * Examples: 7-9 -> 7, 5 to 10 -> 5, 1400+ -> 1400.
 */
function cleanValue(value, fieldLabel, warnings) {
  if (value === null || value === undefined || cleanText(value) === "") return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    return roundNumber(value);
  }

  const cleaned = cleanText(value)
    .replace(/[`´]/g, "")
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const singleMatch = cleaned.match(/^(-?(?:\d+\.?\d*|\.\d+))\s*\+?$/);
  if (singleMatch) return roundNumber(singleMatch[1]);

  const rangeMatch = cleaned.match(
    /^(-?(?:\d+\.?\d*|\.\d+))\s*(?:-|–|—|to)\s*(-?(?:\d+\.?\d*|\.\d+))\s*\+?$/i,
  );

  if (rangeMatch) {
    const first = Number(rangeMatch[1]);
    const second = Number(rangeMatch[2]);
    if (Number.isFinite(first) && Number.isFinite(second)) {
      return roundNumber(Math.min(first, second));
    }
  }

  warnings.push(`${fieldLabel}: invalid value "${cleaned}"; stored as null.`);
  return null;
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createId(category, name) {
  return `${category.toLowerCase()}-${slugify(name)}`;
}

function normalizeColumnName(value) {
  return cleanText(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function normalizeRow(row) {
  const normalizedRow = {};
  for (const [columnName, value] of Object.entries(row)) {
    normalizedRow[normalizeColumnName(columnName)] = value;
  }
  return normalizedRow;
}

function findColumnValue(row, possibleColumns) {
  const normalizedRow = normalizeRow(row);
  for (const columnName of possibleColumns) {
    const normalizedColumn = normalizeColumnName(columnName);
    if (!Object.prototype.hasOwnProperty.call(normalizedRow, normalizedColumn)) {
      continue;
    }

    // A workbook can legitimately contain more than one alias column (for
    // example ITEM NAME plus an older PET NAME column).  A blank value in
    // the first alias must not hide a populated value in a later alias.
    const value = normalizedRow[normalizedColumn];
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    return value;
  }
  return undefined;
}

function extractImagePath(value) {
  const rawValue = cleanText(value);
  if (!rawValue) return "";
  if (rawValue.startsWith("https://") || rawValue.startsWith("http://")) return rawValue;

  const imageMatches = [
    ...rawValue.matchAll(/\/?images\/pets\/[^"\\{}]+?\.(?:png|webp|jpg|jpeg)/gi),
  ];

  if (imageMatches.length > 0) {
    let imagePath = imageMatches[imageMatches.length - 1][0].replace(/\\/g, "/");
    if (!imagePath.startsWith("/")) imagePath = `/${imagePath}`;
    return imagePath;
  }

  const normalized = rawValue.replace(/\\/g, "/");
  if (normalized.startsWith("/images/")) return normalized;
  if (normalized.startsWith("images/")) return `/${normalized}`;
  return "";
}

function createElvebreddImageUrl(spreadsheetValue, itemName, warnings) {
  const extractedPath = extractImagePath(spreadsheetValue);
  if (extractedPath.startsWith("https://") || extractedPath.startsWith("http://")) {
    return extractedPath;
  }
  if (extractedPath) return new URL(extractedPath, ELVEBREDD_ORIGIN).href;

  const fallbackPath = `/images/pets/${itemName}.png`;
  warnings.push(`${itemName}: missing or invalid Excel image; using ${fallbackPath}`);
  return new URL(fallbackPath, ELVEBREDD_ORIGIN).href;
}

function readWorkbook() {
  if (!fs.existsSync(excelPath)) throw new Error(`Master Excel file not found: ${excelPath}`);
  if (fs.statSync(excelPath).size === 0) throw new Error(`Master Excel file is empty: ${excelPath}`);
  return XLSX.readFile(excelPath);
}

function readSheetRows(workbook, sheetName, required = true) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    if (required) {
      throw new Error(`Worksheet "${sheetName}" was not found in ${excelPath}`);
    }
    return [];
  }
  return XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });
}

function readGcashValues(row, name, warnings) {
  return {
    normal: cleanValue(
      findColumnValue(row, ["GCASH REGULAR VALUE", "GCASH NORMAL VALUE", "REGULAR VALUE", "NORMAL VALUE", "NORMAL", "VALUE"]),
      `${name} GCash Regular`,
      warnings,
    ),
    neon: cleanValue(
      findColumnValue(row, ["GCASH NEON VALUE", "NEON VALUE", "NEON"]),
      `${name} GCash Neon`,
      warnings,
    ),
    mega: cleanValue(
      findColumnValue(row, ["GCASH MEGA VALUE", "MEGA VALUE", "MEGA"]),
      `${name} GCash Mega`,
      warnings,
    ),
  };
}

function readWorkbookElveValues(row, name, warnings) {
  return {
    normal: cleanValue(
      findColumnValue(row, ["ELVE SHARK REGULAR VALUE", "ELVE REGULAR VALUE", "IN GAME REGULAR VALUE", "IN GAME VALUE", "INGAME VALUE", "GAME VALUE"]),
      `${name} Elve Shark Regular`,
      warnings,
    ),
    neon: cleanValue(
      findColumnValue(row, ["ELVE SHARK NEON VALUE", "ELVE NEON VALUE", "IN GAME NEON VALUE"]),
      `${name} Elve Shark Neon`,
      warnings,
    ),
    mega: cleanValue(
      findColumnValue(row, ["ELVE SHARK MEGA VALUE", "ELVE MEGA VALUE", "IN GAME MEGA VALUE"]),
      `${name} Elve Shark Mega`,
      warnings,
    ),
  };
}


function readOptionalMetadata(row) {
  const rarity = cleanText(findColumnValue(row, ["RARITY", "PET RARITY", "ITEM RARITY"]));
  const demandRaw = cleanText(findColumnValue(row, ["DEMAND TIER", "CSBT DEMAND TIER"])).toUpperCase();
  const demandTier = ["S", "A", "B", "C", "D"].includes(demandRaw) ? demandRaw : null;
  return { rarity: rarity || null, demandTier };
}

function readPotionValues(row, source, name, warnings) {
  const sourcePrefix = source === "GCASH" ? "GCASH" : "ELVE";
  const result = {};

  const definitions = {
    NORMAL: {
      NO_POTION: [`${sourcePrefix} NO POT VALUE`, `${sourcePrefix} NO POTION VALUE`, `${sourcePrefix} REGULAR NO POT VALUE`, `${sourcePrefix} REGULAR NO POTION VALUE`],
      RIDE: [`${sourcePrefix} R VALUE`, `${sourcePrefix} RIDE VALUE`, `${sourcePrefix} REGULAR R VALUE`, `${sourcePrefix} REGULAR RIDE VALUE`],
      FLY: [`${sourcePrefix} F VALUE`, `${sourcePrefix} FLY VALUE`, `${sourcePrefix} REGULAR F VALUE`, `${sourcePrefix} REGULAR FLY VALUE`],
      FLY_RIDE: [`${sourcePrefix} FR VALUE`, `${sourcePrefix} FLY RIDE VALUE`, `${sourcePrefix} REGULAR FR VALUE`, `${sourcePrefix} REGULAR FLY RIDE VALUE`],
    },
    NEON: {
      NO_POTION: [`${sourcePrefix} NEON NO POT VALUE`, `${sourcePrefix} NEON NO POTION VALUE`],
      RIDE: [`${sourcePrefix} NEON R VALUE`, `${sourcePrefix} NEON RIDE VALUE`],
      FLY: [`${sourcePrefix} NEON F VALUE`, `${sourcePrefix} NEON FLY VALUE`],
      FLY_RIDE: [`${sourcePrefix} NEON FR VALUE`, `${sourcePrefix} NEON FLY RIDE VALUE`],
    },
    MEGA: {
      NO_POTION: [`${sourcePrefix} MEGA NO POT VALUE`, `${sourcePrefix} MEGA NO POTION VALUE`],
      RIDE: [`${sourcePrefix} MEGA R VALUE`, `${sourcePrefix} MEGA RIDE VALUE`],
      FLY: [`${sourcePrefix} MEGA F VALUE`, `${sourcePrefix} MEGA FLY VALUE`],
      FLY_RIDE: [`${sourcePrefix} MEGA FR VALUE`, `${sourcePrefix} MEGA FLY RIDE VALUE`],
    },
  };

  for (const [valueType, statuses] of Object.entries(definitions)) {
    const variant = {};
    for (const [status, columns] of Object.entries(statuses)) {
      const value = cleanValue(findColumnValue(row, columns), `${name} ${sourcePrefix} ${valueType} ${status}`, warnings);
      if (value !== null) variant[status] = value;
    }
    if (Object.keys(variant).length > 0) result[valueType] = variant;
  }

  return Object.keys(result).length > 0 ? result : null;
}

function createItem(row, category, warnings, elveMap, elveSnapshotFetchedAt) {
  const nameColumns = {
    PET: ["PET NAME", "PETS", "NAME", "ITEM NAME"],
    PETWEAR: ["PET NAME", "PET WEAR NAME", "PETWEAR NAME", "ITEM NAME", "NAME"],
    EGG: ["EGG NAME", "ITEM NAME", "NAME"],
    TOY: ["TOY NAME", "ITEM NAME", "NAME"],
    VEHICLE: ["VEHICLE NAME", "ITEM NAME", "NAME"],
    FOOD: ["FOOD NAME", "ITEM NAME", "NAME"],
    GIFT: ["GIFT NAME", "ITEM NAME", "NAME"],
    STROLLER: ["STROLLER NAME", "ITEM NAME", "NAME"],
    STICKER: ["STICKER NAME", "ITEM NAME", "NAME"],
    OTHER: ["ITEM NAME", "NAME"],
  };

  const name = cleanText(
    findColumnValue(row, nameColumns[category] ?? ["ITEM NAME", "NAME"]),
  );
  if (!name) return null;

  const normalizedName = normalizeName(name);
  const helperOnlyNames = new Set(["add", "addbig", "addsmall", "bigadd"]);
  if (normalizedName === "nan" || (category === "OTHER" && helperOnlyNames.has(normalizedName))) {
    warnings.push(`${name}: ignored Elve helper/placeholder record.`);
    return null;
  }

  const imageValue = findColumnValue(row, [
    "PET IMAGE",
    "PET WEAR IMAGE",
    "PETWEAR IMAGE",
    "EGG IMAGE",
    "TOY IMAGE",
    "VEHICLE IMAGE",
    "FOOD IMAGE",
    "GIFT IMAGE",
    "STROLLER IMAGE",
    "STICKER IMAGE",
    "ITEM IMAGE",
    "IMAGE",
    "IMAGE PATH",
  ]);
  const gcash = readGcashValues(row, name, warnings);
  const workbookElve = readWorkbookElveValues(row, name, warnings);
  const metadata = readOptionalMetadata(row);
  const gcashPotionValues = category === "PET" ? readPotionValues(row, "GCASH", name, warnings) : null;
  const elvePotionValues = category === "PET" ? readPotionValues(row, "ELVE", name, warnings) : null;
  const elveRecord = elveMap.get(`${category}:${normalizeName(name)}`);
  const elve = {
    normal: cleanValue(
      elveRecord?.normal ?? workbookElve.normal,
      `${name} Elve Shark Regular`,
      warnings,
    ),
    neon: !CATEGORY_CONFIG[category]?.regularOnly
      ? cleanValue(
          elveRecord?.neon ?? workbookElve.neon,
          `${name} Elve Shark Neon`,
          warnings,
        )
      : null,
    mega: !CATEGORY_CONFIG[category]?.regularOnly
      ? cleanValue(
          elveRecord?.mega ?? workbookElve.mega,
          `${name} Elve Shark Mega`,
          warnings,
        )
      : null,
  };

  if (!elveRecord) warnings.push(`${name}: no matching Elve Shark snapshot record; workbook fallback used.`);

  // Keep legitimate zero-valued Elve items in the searchable master database,
  // but omit rows that have no regular value at all from either source.
  if (gcash.normal === null && elve.normal === null) {
    warnings.push(`${name}: skipped because neither GCash nor Elve has a regular value.`);
    return null;
  }

  return {
    ID: createId(category, name),
    NAME: name,
    CATEGORY: category,
    IMAGE: createElvebreddImageUrl(imageValue, name, warnings),

    GCASH_NORMAL: gcash.normal,
    GCASH_NEON: !CATEGORY_CONFIG[category]?.regularOnly ? gcash.neon : null,
    GCASH_MEGA: !CATEGORY_CONFIG[category]?.regularOnly ? gcash.mega : null,
    ELVE_NORMAL: elve.normal,
    ELVE_NEON: elve.neon,
    ELVE_MEGA: elve.mega,
    RARITY: metadata.rarity || cleanText(elveRecord?.rarity) || null,
    DEMAND_TIER: metadata.demandTier,
    UPDATED_AT: elveSnapshotFetchedAt,
    ...(gcashPotionValues || elvePotionValues
      ? {
          POTION_VALUES: {
            ...(gcashPotionValues ? { GCASH: gcashPotionValues } : {}),
            ...(elvePotionValues ? { ELVE: elvePotionValues } : {}),
          },
        }
      : {}),

    // Backward-compatible aliases. Existing code reads NORMAL/NEON/MEGA as GCash.
    NORMAL: gcash.normal,
    NEON: !CATEGORY_CONFIG[category]?.regularOnly ? gcash.neon : null,
    MEGA: !CATEGORY_CONFIG[category]?.regularOnly ? gcash.mega : null,
    INGAME_VALUE: elve.normal,
  };
}

function createElveOnlyItem(record, category, warnings, elveSnapshotFetchedAt) {
  const name = cleanText(record?.name);
  if (!name) return null;

  const normal = cleanValue(
    record?.normal,
    `${name} Elve Shark Regular`,
    warnings,
  );

  if (normal === null || normal <= 0) {
    return null;
  }

  return {
    ID: createId(category, name),
    NAME: name,
    CATEGORY: category,
    IMAGE: createElvebreddImageUrl(record?.image, name, warnings),

    // Snapshot-only items are automatically added with no GCash value.
    // Add them to the matching workbook sheet later when CSBT wants to maintain a GCash value.
    GCASH_NORMAL: null,
    GCASH_NEON: null,
    GCASH_MEGA: null,
    ELVE_NORMAL: normal,
    ELVE_NEON: !CATEGORY_CONFIG[category]?.regularOnly
      ? cleanValue(record?.neon, `${name} Elve Shark Neon`, warnings)
      : null,
    ELVE_MEGA: !CATEGORY_CONFIG[category]?.regularOnly
      ? cleanValue(record?.mega, `${name} Elve Shark Mega`, warnings)
      : null,

    // Backward-compatible aliases.
    NORMAL: null,
    NEON: null,
    MEGA: null,
    INGAME_VALUE: normal,
    RARITY: cleanText(record?.rarity) || null,
    DEMAND_TIER: null,
    UPDATED_AT: elveSnapshotFetchedAt,
  };
}

function itemCompletenessScore(item) {
  const fields = [
    "GCASH_NORMAL", "GCASH_NEON", "GCASH_MEGA",
    "ELVE_NORMAL", "ELVE_NEON", "ELVE_MEGA",
  ];

  let score = 0;
  for (const field of fields) {
    if (typeof item[field] === "number" && Number.isFinite(item[field])) score += 1;
  }
  if (typeof item.GCASH_NORMAL === "number" && item.GCASH_NORMAL > 0) score += 6;
  if (item.RARITY) score += 1;
  if (item.DEMAND_TIER) score += 1;
  return score;
}

function mergeDuplicateItem(preferred, fallback) {
  const merged = { ...fallback, ...preferred };
  const valueFields = [
    "GCASH_NORMAL", "GCASH_NEON", "GCASH_MEGA",
    "ELVE_NORMAL", "ELVE_NEON", "ELVE_MEGA",
    "NORMAL", "NEON", "MEGA", "INGAME_VALUE",
  ];

  for (const field of valueFields) {
    if (merged[field] === null || merged[field] === undefined) {
      merged[field] = fallback[field] ?? preferred[field] ?? null;
    }
  }

  if (!merged.RARITY) merged.RARITY = fallback.RARITY ?? null;
  if (!merged.DEMAND_TIER) merged.DEMAND_TIER = fallback.DEMAND_TIER ?? null;
  if (!merged.POTION_VALUES && fallback.POTION_VALUES) merged.POTION_VALUES = fallback.POTION_VALUES;
  return merged;
}

function removeDuplicates(items, warnings) {
  const itemMap = new Map();

  for (const item of items) {
    // IDs are the canonical key used by URLs, history, inventory, and Exchange.
    // Punctuation aliases such as "Mr Whiskerpips" and "Mr. Whiskerpips"
    // intentionally collapse to the same ID and must become one record.
    const duplicateKey = item.ID;
    const previous = itemMap.get(duplicateKey);

    if (!previous) {
      itemMap.set(duplicateKey, item);
      continue;
    }

    const preferred = itemCompletenessScore(item) > itemCompletenessScore(previous)
      ? item
      : previous;
    const fallback = preferred === item ? previous : item;
    itemMap.set(duplicateKey, mergeDuplicateItem(preferred, fallback));
    warnings.push(`Duplicate ID merged: ${item.ID} (${previous.NAME} / ${item.NAME})`);
  }

  return Array.from(itemMap.values());
}

function sortItems(items) {
  return [...items].sort((firstItem, secondItem) => {
    const categoryDifference =
      (CATEGORY_ORDER[firstItem.CATEGORY] ?? 99) -
      (CATEGORY_ORDER[secondItem.CATEGORY] ?? 99);

    if (categoryDifference !== 0) return categoryDifference;

    return firstItem.NAME.localeCompare(secondItem.NAME, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });
}

function generateTradingItems() {
  console.log("Reading source-data/trading-data.xlsx...");
  const workbook = readWorkbook();
  const warnings = [];
  const elveSnapshot = readJsonIfPresent(elveSnapshotPath);
  if (!elveSnapshot?.items?.length) throw new Error(`Elve Shark snapshot not found or empty: ${elveSnapshotPath}`);
  const elveMap = buildSnapshotMap(elveSnapshot);

  const categoryItems = {};

  for (const [category, config] of Object.entries(CATEGORY_CONFIG)) {
    const rows = readSheetRows(
      workbook,
      config.sheet,
      category === "PET" || category === "PETWEAR" || category === "EGG" || category === "TOY",
    );

    const workbookItems = rows
      .map((row) => createItem(row, category, warnings, elveMap, elveSnapshot.fetchedAt || null))
      .filter(Boolean);

    const snapshotRecords = elveSnapshot.items.filter(
      (item) => item.category === category,
    );

    const workbookNames = new Set(
      workbookItems.map((item) => normalizeName(item.NAME)),
    );

    const snapshotOnlyItems = snapshotRecords
      .filter((item) => !workbookNames.has(normalizeName(item.name)))
      .map((item) => createElveOnlyItem(item, category, warnings, elveSnapshot.fetchedAt || null))
      .filter(Boolean);

    categoryItems[category] = [...workbookItems, ...snapshotOnlyItems];
  }

  const tradingItems = sortItems(
    removeDuplicates(Object.values(categoryItems).flat(), warnings),
  );

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(tradingItems, null, 2)}\n`, "utf8");

  // Compact runtime index used by client-side search, calculator, inventory,
  // wishlist, Exchange and Nich. Keep this tuple order in sync with
  // src/lib/clientItemIndex.ts. The full JSON remains available for server/data jobs.
  const clientIndex = tradingItems.map((item) => [
    item.ID, item.NAME, item.CATEGORY, item.IMAGE ?? "",
    item.GCASH_NORMAL ?? null, item.GCASH_NEON ?? null, item.GCASH_MEGA ?? null,
    item.ELVE_NORMAL ?? null, item.ELVE_NEON ?? null, item.ELVE_MEGA ?? null,
    item.RARITY ?? null, item.DEMAND_TIER ?? null, item.UPDATED_AT ?? null, item.POTION_VALUES ?? null,
  ]);
  fs.writeFileSync(clientIndexPath, `${JSON.stringify(clientIndex)}\n`, "utf8");

  const sourceMetadata = {
    defaultSource: "GCASH",
    sources: {
      GCASH: {
        label: "GCash Value",
        description: "CSBT community cash values from source-data/trading-data.xlsx.",
      },
      ELVE: {
        label: "Elve Shark Value",
        source: elveSnapshot.source,
        valueSystem: elveSnapshot.valueSystem,
        sourceUrl: elveSnapshot.sourceUrl,
        updatedAt: elveSnapshot.fetchedAt,
        sourceVersion: elveSnapshot.sourceVersion,
        recordCount: elveSnapshot.recordCount,
      },
    },
  };
  fs.writeFileSync(sourceMetadataPath, `${JSON.stringify(sourceMetadata, null, 2)}\n`, "utf8");

  const categoryCounts = Object.fromEntries(
    Object.keys(CATEGORY_CONFIG).map((category) => [
      category,
      tradingItems.filter((item) => item.CATEGORY === category).length,
    ]),
  );

  const tradingMeta = {
    schemaVersion: 3,
    totalItems: tradingItems.length,
    categoryCounts,
    totalPets: categoryCounts.PET ?? 0,
    totalPetWear: categoryCounts.PETWEAR ?? 0,
    totalEggs: categoryCounts.EGG ?? 0,
    totalVehicles: categoryCounts.VEHICLE ?? 0,
    totalFood: categoryCounts.FOOD ?? 0,
    totalGifts: categoryCounts.GIFT ?? 0,
    totalStrollers: categoryCounts.STROLLER ?? 0,
    totalToys: categoryCounts.TOY ?? 0,
    totalStickers: categoryCounts.STICKER ?? 0,
    totalOther: categoryCounts.OTHER ?? 0,
    generatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(tradingMetaPath, `${JSON.stringify(tradingMeta, null, 2)}\n`, "utf8");

  const report = {
    generatedAt: new Date().toISOString(),
    categories: Object.fromEntries(
      Object.entries(categoryItems).map(([category, items]) => [
        category,
        items.length,
      ]),
    ),
    total: tradingItems.length,
    warnings,
  };
  fs.writeFileSync(validationReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("==========================");
  for (const [category, items] of Object.entries(categoryItems)) {
    console.log(`${category}: ${items.length}`);
  }
  console.log(`Total: ${tradingItems.length}`);
  console.log(`Created: ${outputPath}`);
  console.log(`Client search index: ${clientIndexPath}`);
  console.log(`Value-source metadata: ${sourceMetadataPath}`);
  console.log(`Homepage metadata: ${tradingMetaPath}`);
  console.log(`Warnings: ${warnings.length}`);
  warnings.slice(0, 30).forEach((warning) => console.warn(`- ${warning}`));
  if (warnings.length > 30) console.warn(`...and ${warnings.length - 30} more warnings.`);
}

try {
  generateTradingItems();
} catch (error) {
  console.error("Generation failed:");
  console.error(error);
  process.exit(1);
}
