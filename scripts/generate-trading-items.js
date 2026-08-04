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
const sourceMetadataPath = path.join(projectRoot, "src", "data", "valueSources.json");
const tradingMetaPath = path.join(projectRoot, "src", "data", "tradingMeta.json");
const homePopularItemsPath = path.join(projectRoot, "src", "data", "homePopularItems.json");
const validationReportPath = path.join(projectRoot, "source-data", "trading-data-validation.json");
const ELVEBREDD_ORIGIN = "https://elvebredd.com";
const CATEGORY_ORDER = { PET: 0, PETWEAR: 1, EGG: 2, TOY: 3 };

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
    if (Object.prototype.hasOwnProperty.call(normalizedRow, normalizedColumn)) {
      return normalizedRow[normalizedColumn];
    }
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

function readSheetRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Worksheet "${sheetName}" was not found in ${excelPath}`);
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

function createItem(row, category, warnings, elveMap) {
  const nameColumns = {
    PET: ["PET NAME", "PETS", "NAME", "ITEM NAME"],
    PETWEAR: [
      "PET NAME",
      "PET WEAR NAME",
      "PETWEAR NAME",
      "ITEM NAME",
      "NAME",
    ],
    EGG: ["EGG NAME", "ITEM NAME", "NAME"],
    TOY: ["TOY NAME", "ITEM NAME", "NAME"],
  };

  const name = cleanText(
    findColumnValue(row, nameColumns[category] ?? ["ITEM NAME", "NAME"]),
  );
  if (!name) return null;

  const imageValue = findColumnValue(row, [
    "PET IMAGE",
    "PET WEAR IMAGE",
    "PETWEAR IMAGE",
    "EGG IMAGE",
    "TOY IMAGE",
    "ITEM IMAGE",
    "IMAGE",
    "IMAGE PATH",
  ]);
  const gcash = readGcashValues(row, name, warnings);
  const workbookElve = readWorkbookElveValues(row, name, warnings);
  const elveRecord = elveMap.get(`${category}:${normalizeName(name)}`);
  const elve = {
    normal: cleanValue(
      elveRecord?.normal ?? workbookElve.normal,
      `${name} Elve Shark Regular`,
      warnings,
    ),
    neon: category === "PET"
      ? cleanValue(
          elveRecord?.neon ?? workbookElve.neon,
          `${name} Elve Shark Neon`,
          warnings,
        )
      : null,
    mega: category === "PET"
      ? cleanValue(
          elveRecord?.mega ?? workbookElve.mega,
          `${name} Elve Shark Mega`,
          warnings,
        )
      : null,
  };

  if (!elveRecord) warnings.push(`${name}: no matching Elve Shark snapshot record; workbook fallback used.`);

  return {
    ID: createId(category, name),
    NAME: name,
    CATEGORY: category,
    IMAGE: createElvebreddImageUrl(imageValue, name, warnings),

    GCASH_NORMAL: gcash.normal,
    GCASH_NEON: category === "PET" ? gcash.neon : null,
    GCASH_MEGA: category === "PET" ? gcash.mega : null,
    ELVE_NORMAL: elve.normal,
    ELVE_NEON: elve.neon,
    ELVE_MEGA: elve.mega,

    // Backward-compatible aliases. Existing code reads NORMAL/NEON/MEGA as GCash.
    NORMAL: gcash.normal,
    NEON: category === "PET" ? gcash.neon : null,
    MEGA: category === "PET" ? gcash.mega : null,
    INGAME_VALUE: elve.normal,
  };
}

function createElveOnlyItem(record, category, warnings) {
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

    // Snapshot-only Eggs and Toys are automatically added with no GCash value.
    // Add them to the workbook later when CSBT wants to maintain a GCash value.
    GCASH_NORMAL: null,
    GCASH_NEON: null,
    GCASH_MEGA: null,
    ELVE_NORMAL: normal,
    ELVE_NEON: null,
    ELVE_MEGA: null,

    // Backward-compatible aliases.
    NORMAL: null,
    NEON: null,
    MEGA: null,
    INGAME_VALUE: normal,
  };
}

function removeDuplicates(items, warnings) {
  const itemMap = new Map();
  for (const item of items) {
    const duplicateKey = `${item.CATEGORY}:${item.NAME.toLowerCase()}`;
    if (itemMap.has(duplicateKey)) {
      warnings.push(`Duplicate removed: ${item.CATEGORY} - ${item.NAME}`);
      continue;
    }
    itemMap.set(duplicateKey, item);
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

  const petRows = readSheetRows(workbook, "Pets");
  const petWearRows = readSheetRows(workbook, "Pet Wear");
  const pets = petRows
    .map((row) => createItem(row, "PET", warnings, elveMap))
    .filter(Boolean);
  const petWear = petWearRows
    .map((row) => createItem(row, "PETWEAR", warnings, elveMap))
    .filter(Boolean);
  const eggRows = readSheetRows(workbook, "Eggs");
  const toyRows = readSheetRows(workbook, "Toys");

  const workbookEggs = eggRows
    .map((row) => createItem(row, "EGG", warnings, elveMap))
    .filter(Boolean);
  const workbookToys = toyRows
    .map((row) => createItem(row, "TOY", warnings, elveMap))
    .filter(Boolean);

  const eggRecords = elveSnapshot.items.filter(
    (item) => item.category === "EGG",
  );
  const toyRecords = elveSnapshot.items.filter(
    (item) => item.category === "TOY",
  );

  const workbookEggNames = new Set(
    workbookEggs.map((item) => normalizeName(item.NAME)),
  );
  const workbookToyNames = new Set(
    workbookToys.map((item) => normalizeName(item.NAME)),
  );

  // Keep future Elve additions automatic. New records that are not yet in the
  // workbook still appear on the site as Elve-only until a GCash value is added.
  const snapshotOnlyEggs = eggRecords
    .filter((item) => !workbookEggNames.has(normalizeName(item.name)))
    .map((item) => createElveOnlyItem(item, "EGG", warnings))
    .filter(Boolean);
  const snapshotOnlyToys = toyRecords
    .filter((item) => !workbookToyNames.has(normalizeName(item.name)))
    .map((item) => createElveOnlyItem(item, "TOY", warnings))
    .filter(Boolean);

  const eggs = [...workbookEggs, ...snapshotOnlyEggs];
  const toys = [...workbookToys, ...snapshotOnlyToys];

  const tradingItems = sortItems(
    removeDuplicates([...pets, ...petWear, ...eggs, ...toys], warnings),
  );

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(tradingItems, null, 2)}\n`, "utf8");

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

  const popularNames = [
    "Frost Dragon",
    "Shadow Dragon",
    "Owl",
    "Crow",
    "Parrot",
    "Giraffe",
    "Balloon Unicorn",
    "Evil Unicorn",
  ];
  const homePopularItems = popularNames
    .map((name) => tradingItems.find((item) => item.NAME === name))
    .filter(Boolean);
  fs.writeFileSync(homePopularItemsPath, `${JSON.stringify(homePopularItems, null, 2)}\n`, "utf8");

  const tradingMeta = {
    totalItems: tradingItems.length,
    totalPets: tradingItems.filter((item) => item.CATEGORY === "PET").length,
    totalPetWear: tradingItems.filter((item) => item.CATEGORY === "PETWEAR").length,
    totalEggs: tradingItems.filter((item) => item.CATEGORY === "EGG").length,
    totalToys: tradingItems.filter((item) => item.CATEGORY === "TOY").length,
    generatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(tradingMetaPath, `${JSON.stringify(tradingMeta, null, 2)}\n`, "utf8");

  const report = {
    generatedAt: new Date().toISOString(),
    pets: pets.length,
    petWear: petWear.length,
    eggs: eggs.length,
    toys: toys.length,
    total: tradingItems.length,
    warnings,
  };
  fs.writeFileSync(validationReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("==========================");
  console.log(`Pets: ${pets.length}`);
  console.log(`Pet Wear: ${petWear.length}`);
  console.log(`Eggs: ${eggs.length}`);
  console.log(`Toys: ${toys.length}`);
  console.log(`Total: ${tradingItems.length}`);
  console.log(`Created: ${outputPath}`);
  console.log(`Value-source metadata: ${sourceMetadataPath}`);
  console.log(`Homepage metadata: ${tradingMetaPath}`);
  console.log(`Homepage popular items: ${homePopularItemsPath}`);
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
