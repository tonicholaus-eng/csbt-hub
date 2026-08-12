const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { normalizeName, readJsonIfPresent } = require("./lib/elve-shark");

const projectRoot = process.cwd();
const excelPath = path.join(projectRoot, "source-data", "trading-data.xlsx");
const backupPath = path.join(projectRoot, "source-data", "trading-data.pre-elve-sync.backup.xlsx");
const snapshotPath = path.join(projectRoot, "source-data", "elve-shark-values.json");

const CATEGORY_CONFIG = {
  PET: {
    sheet: "Pets",
    nameHeaders: ["PET NAME", "ITEM NAME", "NAME"],
    imageHeaders: ["PET IMAGE", "ITEM IMAGE", "IMAGE"],
    headers: [
      "PET NAME",
      "PET IMAGE",
      "GCASH REGULAR VALUE",
      "GCASH NEON VALUE",
      "GCASH MEGA VALUE",
      "ELVE SHARK REGULAR VALUE",
      "ELVE SHARK NEON VALUE",
      "ELVE SHARK MEGA VALUE",
    ],
    elve: {
      normal: "ELVE SHARK REGULAR VALUE",
      neon: "ELVE SHARK NEON VALUE",
      mega: "ELVE SHARK MEGA VALUE",
    },
  },
  PETWEAR: {
    sheet: "Pet Wear",
    nameHeaders: ["PET NAME", "PET WEAR NAME", "ITEM NAME", "NAME"],
    imageHeaders: ["PET IMAGE", "PET WEAR IMAGE", "ITEM IMAGE", "IMAGE"],
    headers: [
      "PET NAME",
      "PET IMAGE",
      "GCASH REGULAR VALUE",
      "GCASH NEON VALUE",
      "GCASH MEGA VALUE",
      "ELVE SHARK REGULAR VALUE",
      "ELVE SHARK NEON VALUE",
      "ELVE SHARK MEGA VALUE",
    ],
    elve: { normal: "ELVE SHARK REGULAR VALUE" },
  },
  EGG: regularOnly("Eggs"),
  VEHICLE: regularOnly("Vehicles"),
  FOOD: regularOnly("Food"),
  GIFT: regularOnly("Gifts"),
  STROLLER: regularOnly("Strollers"),
  TOY: regularOnly("Toys"),
  STICKER: regularOnly("Stickers"),
  OTHER: regularOnly("Other"),
};

function regularOnly(sheet) {
  return {
    sheet,
    nameHeaders: ["ITEM NAME", "NAME"],
    imageHeaders: ["ITEM IMAGE", "IMAGE"],
    headers: [
      "ITEM NAME",
      "ITEM IMAGE",
      "GCASH REGULAR VALUE",
      "ELVE SHARK REGULAR VALUE",
    ],
    elve: { normal: "ELVE SHARK REGULAR VALUE" },
  };
}

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function findHeaderIndex(headerRow, candidates) {
  const normalized = headerRow.map(normalizeHeader);
  for (const candidate of candidates) {
    const index = normalized.indexOf(normalizeHeader(candidate));
    if (index >= 0) return index;
  }
  return -1;
}

function ensureSheet(workbook, config) {
  let sheet = workbook.Sheets[config.sheet];
  if (!sheet) {
    sheet = XLSX.utils.aoa_to_sheet([config.headers]);
    XLSX.utils.book_append_sheet(workbook, sheet, config.sheet);
  }

  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });

  if (!rows.length) rows.push([...config.headers]);

  const headerRow = rows[0];
  for (const header of config.headers) {
    if (findHeaderIndex(headerRow, [header]) < 0) headerRow.push(header);
  }

  return { sheet, rows };
}

function copyTemplateStyle(workbook, targetSheet, rowIndex, columnCount) {
  const template = workbook.Sheets.Eggs;
  if (!template) return;

  for (let col = 0; col < columnCount; col += 1) {
    const targetAddress = XLSX.utils.encode_cell({ r: rowIndex, c: col });
    const templateCol = Math.min(col, 3);
    const templateAddress = XLSX.utils.encode_cell({ r: 1, c: templateCol });
    const templateCell = template[templateAddress];
    if (!targetSheet[targetAddress]) targetSheet[targetAddress] = { t: "z" };
    if (templateCell?.s) targetSheet[targetAddress].s = templateCell.s;
  }
}

function updateSheet(workbook, snapshotItems, category, config) {
  const { sheet, rows } = ensureSheet(workbook, config);
  const headerRow = rows[0];
  const nameIndex = findHeaderIndex(headerRow, config.nameHeaders);
  const imageIndex = findHeaderIndex(headerRow, config.imageHeaders);
  const elveNormalIndex = findHeaderIndex(headerRow, [config.elve.normal]);
  const elveNeonIndex = config.elve.neon
    ? findHeaderIndex(headerRow, [config.elve.neon])
    : -1;
  const elveMegaIndex = config.elve.mega
    ? findHeaderIndex(headerRow, [config.elve.mega])
    : -1;

  if (nameIndex < 0 || elveNormalIndex < 0) {
    throw new Error(`Could not locate required columns in ${config.sheet}.`);
  }

  const existingRows = new Map();
  for (let row = 1; row < rows.length; row += 1) {
    const name = rows[row]?.[nameIndex];
    if (name) existingRows.set(normalizeName(name), row);
  }

  let added = 0;
  let updated = 0;

  const records = snapshotItems
    .filter((item) => item.category === category)
    .sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, {
      numeric: true,
      sensitivity: "base",
    }));

  for (const record of records) {
    const key = normalizeName(record.name);
    let rowIndex = existingRows.get(key);

    if (rowIndex === undefined) {
      rowIndex = rows.length;
      rows.push(Array(headerRow.length).fill(null));
      existingRows.set(key, rowIndex);
      rows[rowIndex][nameIndex] = record.name;
      added += 1;
    } else {
      updated += 1;
    }

    if (imageIndex >= 0 && record.image) rows[rowIndex][imageIndex] = record.image;
    rows[rowIndex][elveNormalIndex] = record.normal ?? null;
    if (elveNeonIndex >= 0) rows[rowIndex][elveNeonIndex] = record.neon ?? null;
    if (elveMegaIndex >= 0) rows[rowIndex][elveMegaIndex] = record.mega ?? null;
  }

  // Rewrite only this worksheet's cell grid. GCash and any extra columns remain
  // untouched because rows were read from the existing workbook first.
  const rebuilt = XLSX.utils.aoa_to_sheet(rows);
  if (sheet["!cols"]) rebuilt["!cols"] = sheet["!cols"];
  if (sheet["!rows"]) rebuilt["!rows"] = sheet["!rows"];
  if (sheet["!merges"]) rebuilt["!merges"] = sheet["!merges"];

  // Carry existing cell styles when possible, and use Eggs row 2 as a style
  // template for newly appended regular-only rows.
  for (const address of Object.keys(sheet)) {
    if (address.startsWith("!")) continue;
    if (sheet[address]?.s && rebuilt[address]) rebuilt[address].s = sheet[address].s;
  }
  for (let row = Math.max(1, rows.length - added); row < rows.length; row += 1) {
    copyTemplateStyle(workbook, rebuilt, row, headerRow.length);
  }

  workbook.Sheets[config.sheet] = rebuilt;
  return { category, sheet: config.sheet, records: records.length, added, updated };
}

function main() {
  if (!fs.existsSync(excelPath)) throw new Error(`Master workbook not found: ${excelPath}`);
  const snapshot = readJsonIfPresent(snapshotPath);
  if (!snapshot?.items?.length) throw new Error(`Elve snapshot not found or empty: ${snapshotPath}`);

  fs.copyFileSync(excelPath, backupPath);
  const workbook = XLSX.readFile(excelPath, { cellStyles: true });

  const results = [];
  for (const [category, config] of Object.entries(CATEGORY_CONFIG)) {
    results.push(updateSheet(workbook, snapshot.items, category, config));
  }

  XLSX.writeFile(workbook, excelPath, { bookType: "xlsx", cellStyles: true });

  console.log("Synced Elve Shark values into source-data/trading-data.xlsx.");
  console.log(`Backup: ${backupPath}`);
  for (const result of results) {
    console.log(`${result.category}: ${result.records} Elve records (${result.added} new workbook rows).`);
  }
}

try {
  main();
} catch (error) {
  console.error("Master workbook sync failed:");
  console.error(error);
  process.exit(1);
}
