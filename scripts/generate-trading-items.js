const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const projectRoot = process.cwd();

const excelPath = path.join(
  projectRoot,
  "source-data",
  "trading-data.xlsx",
);

const outputPath = path.join(
  projectRoot,
  "src",
  "data",
  "tradingItems.json",
);

const ELVEBREDD_ORIGIN =
  "https://elvebredd.com";

function cleanText(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}

function cleanValue(value) {
  if (
    value === null ||
    value === undefined ||
    cleanText(value) === ""
  ) {
    return null;
  }

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return Number(value.toFixed(10));
  }

  const cleaned = cleanText(value);

  const numericPattern =
    /^-?(?:\d+\.?\d*|\.\d+)$/;

  if (numericPattern.test(cleaned)) {
    return Number(
      Number(cleaned).toFixed(10),
    );
  }

  return cleaned;
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
  return `${category.toLowerCase()}-${slugify(
    name,
  )}`;
}

function normalizeColumnName(value) {
  return cleanText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function normalizeRow(row) {
  const normalizedRow = {};

  for (
    const [columnName, value] of
    Object.entries(row)
  ) {
    normalizedRow[
      normalizeColumnName(columnName)
    ] = value;
  }

  return normalizedRow;
}

function findColumnValue(
  row,
  possibleColumns,
) {
  const normalizedRow =
    normalizeRow(row);

  for (
    const columnName of possibleColumns
  ) {
    const normalizedColumn =
      normalizeColumnName(columnName);

    if (
      Object.prototype.hasOwnProperty.call(
        normalizedRow,
        normalizedColumn,
      )
    ) {
      return normalizedRow[
        normalizedColumn
      ];
    }
  }

  return undefined;
}

function extractImagePath(value) {
  const rawValue = cleanText(value);

  if (!rawValue) {
    return "";
  }

  if (
    rawValue.startsWith("https://") ||
    rawValue.startsWith("http://")
  ) {
    return rawValue;
  }

  /*
   * Some spreadsheet cells contain corrupted text with
   * more than one image path. This extracts every valid
   * /images/pets/... image and uses the final one.
   */
  const imageMatches = [
    ...rawValue.matchAll(
      /\/?images\/pets\/[^"\\{}]+?\.(?:png|webp|jpg|jpeg)/gi,
    ),
  ];

  if (imageMatches.length > 0) {
    let imagePath =
      imageMatches[
        imageMatches.length - 1
      ][0];

    imagePath = imagePath.replace(
      /\\/g,
      "/",
    );

    if (!imagePath.startsWith("/")) {
      imagePath = `/${imagePath}`;
    }

    return imagePath;
  }

  const normalized =
    rawValue.replace(/\\/g, "/");

  if (
    normalized.startsWith(
      "/images/",
    )
  ) {
    return normalized;
  }

  if (
    normalized.startsWith(
      "images/",
    )
  ) {
    return `/${normalized}`;
  }

  return "";
}

function createElvebreddImageUrl(
  spreadsheetValue,
  itemName,
  warnings,
) {
  const extractedPath =
    extractImagePath(
      spreadsheetValue,
    );

  if (
    extractedPath.startsWith(
      "https://",
    ) ||
    extractedPath.startsWith(
      "http://",
    )
  ) {
    return extractedPath;
  }

  if (extractedPath) {
    return new URL(
      extractedPath,
      ELVEBREDD_ORIGIN,
    ).href;
  }

  const fallbackPath =
    `/images/pets/${itemName}.png`;

  warnings.push(
    `${itemName}: missing or invalid Excel image; using ${fallbackPath}`,
  );

  return new URL(
    fallbackPath,
    ELVEBREDD_ORIGIN,
  ).href;
}

function readWorkbook() {
  if (!fs.existsSync(excelPath)) {
    throw new Error(
      `Master Excel file not found: ${excelPath}`,
    );
  }

  if (
    fs.statSync(excelPath).size === 0
  ) {
    throw new Error(
      `Master Excel file is empty: ${excelPath}`,
    );
  }

  return XLSX.readFile(
    excelPath,
  );
}

function readSheetRows(
  workbook,
  sheetName,
) {
  const sheet =
    workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error(
      `Worksheet "${sheetName}" was not found in ${excelPath}`,
    );
  }

  return XLSX.utils.sheet_to_json(
    sheet,
    {
      defval: null,
      raw: true,
    },
  );
}

function createPetItem(
  row,
  warnings,
) {
  const name = cleanText(
    findColumnValue(
      row,
      [
        "PET NAME",
        "PETS",
        "NAME",
        "ITEM NAME",
      ],
    ),
  );

  if (!name) {
    return null;
  }

  const imageValue =
    findColumnValue(
      row,
      [
        "PET IMAGE",
        "IMAGE",
        "IMAGE PATH",
      ],
    );

  return {
    ID: createId(
      "PET",
      name,
    ),

    NAME: name,

    CATEGORY: "PET",

    IMAGE:
      createElvebreddImageUrl(
        imageValue,
        name,
        warnings,
      ),

    INGAME_VALUE:
      cleanValue(
        findColumnValue(
          row,
          [
            "IN GAME VALUE",
            "INGAME VALUE",
            "GAME VALUE",
          ],
        ),
      ),

    NORMAL:
      cleanValue(
        findColumnValue(
          row,
          [
            "REGULAR VALUE",
            "NORMAL VALUE",
            "NORMAL",
            "VALUE",
          ],
        ),
      ),

    NEON:
      cleanValue(
        findColumnValue(
          row,
          [
            "NEON VALUE",
            "NEON",
          ],
        ),
      ),

    MEGA:
      cleanValue(
        findColumnValue(
          row,
          [
            "MEGA VALUE",
            "MEGA",
          ],
        ),
      ),
  };
}

function createPetWearItem(
  row,
  warnings,
) {
  const name = cleanText(
    findColumnValue(
      row,
      [
        "PET NAME",
        "PET WEAR NAME",
        "PETWEAR NAME",
        "ITEM NAME",
        "NAME",
      ],
    ),
  );

  if (!name) {
    return null;
  }

  const imageValue =
    findColumnValue(
      row,
      [
        "PET IMAGE",
        "PET WEAR IMAGE",
        "PETWEAR IMAGE",
        "ITEM IMAGE",
        "IMAGE",
        "IMAGE PATH",
      ],
    );

  return {
    ID: createId(
      "PETWEAR",
      name,
    ),

    NAME: name,

    CATEGORY: "PETWEAR",

    IMAGE:
      createElvebreddImageUrl(
        imageValue,
        name,
        warnings,
      ),

    INGAME_VALUE:
      cleanValue(
        findColumnValue(
          row,
          [
            "IN GAME VALUE",
            "INGAME VALUE",
            "GAME VALUE",
          ],
        ),
      ),

    NORMAL:
      cleanValue(
        findColumnValue(
          row,
          [
            "REGULAR VALUE",
            "NORMAL VALUE",
            "NORMAL",
            "VALUE",
          ],
        ),
      ),

    NEON: null,

    MEGA: null,
  };
}

function removeDuplicates(
  items,
  warnings,
) {
  const itemMap = new Map();

  for (const item of items) {
    const duplicateKey =
      `${item.CATEGORY}:${item.NAME.toLowerCase()}`;

    if (
      itemMap.has(duplicateKey)
    ) {
      warnings.push(
        `Duplicate removed: ${item.CATEGORY} - ${item.NAME}`,
      );

      continue;
    }

    itemMap.set(
      duplicateKey,
      item,
    );
  }

  return Array.from(
    itemMap.values(),
  );
}

function sortItems(items) {
  return [...items].sort(
    (firstItem, secondItem) => {
      if (
        firstItem.CATEGORY !==
        secondItem.CATEGORY
      ) {
        return firstItem.CATEGORY ===
          "PET"
          ? -1
          : 1;
      }

      return firstItem.NAME.localeCompare(
        secondItem.NAME,
        undefined,
        {
          numeric: true,
          sensitivity: "base",
        },
      );
    },
  );
}

function generateTradingItems() {
  console.log(
    "Reading source-data/trading-data.xlsx...",
  );

  const workbook =
    readWorkbook();

  const warnings = [];

  const petRows =
    readSheetRows(
      workbook,
      "Pets",
    );

  const petWearRows =
    readSheetRows(
      workbook,
      "Pet Wear",
    );

  const pets = petRows
    .map((row) =>
      createPetItem(
        row,
        warnings,
      ),
    )
    .filter(Boolean);

  const petWear = petWearRows
    .map((row) =>
      createPetWearItem(
        row,
        warnings,
      ),
    )
    .filter(Boolean);

  const tradingItems =
    sortItems(
      removeDuplicates(
        [
          ...pets,
          ...petWear,
        ],
        warnings,
      ),
    );

  fs.mkdirSync(
    path.dirname(outputPath),
    {
      recursive: true,
    },
  );

  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      tradingItems,
      null,
      2,
    ),
    "utf8",
  );

  console.log(
    "==========================",
  );

  console.log(
    `Pets: ${pets.length}`,
  );

  console.log(
    `Pet Wear: ${petWear.length}`,
  );

  console.log(
    `Total: ${tradingItems.length}`,
  );

  console.log(
    `Created: ${outputPath}`,
  );

  if (warnings.length > 0) {
    console.log(
      "==========================",
    );

    console.warn(
      `Warnings: ${warnings.length}`,
    );

    warnings
      .slice(0, 30)
      .forEach((warning) => {
        console.warn(
          `- ${warning}`,
        );
      });

    if (warnings.length > 30) {
      console.warn(
        `...and ${warnings.length - 30} more warnings.`,
      );
    }
  }
}

try {
  generateTradingItems();
} catch (error) {
  console.error(
    "Generation failed:",
  );

  console.error(error);

  process.exit(1);
}