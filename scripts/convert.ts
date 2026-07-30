import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

const projectRoot = process.cwd();
const excelFilePath = path.join(
  projectRoot,
  "ADM-PRICELIST-CSBT-DUPLICATE (1).xlsx",
);
const outputPath = path.join(projectRoot, "src", "data", "pets.json");

const requiredColumns = ["PETS", "NORMAL", "NEON", "MEGA"] as const;

type PetRow = {
  PETS: string;
  NORMAL: string | number;
  NEON: string | number;
  MEGA: string | number;
  IMAGE?: string;
};

function normalizeCell(value: unknown): string | number {
  if (typeof value === "number") {
    return value;
  }

  return String(value ?? "").trim();
}

function slug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’‘`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function main() {
  if (!fs.existsSync(excelFilePath)) {
    throw new Error(`Excel file not found: ${excelFilePath}`);
  }

  const workbook = XLSX.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("The workbook does not contain any worksheets.");
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: true,
  });

  if (rawRows.length === 0) {
    throw new Error(`Worksheet ${JSON.stringify(sheetName)} contains no data rows.`);
  }

  const firstRowKeys = new Set(Object.keys(rawRows[0]));
  const missingColumns = requiredColumns.filter((column) => !firstRowKeys.has(column));

  if (missingColumns.length > 0) {
    throw new Error(`Missing required spreadsheet columns: ${missingColumns.join(", ")}.`);
  }

  const seenNames = new Map<string, number>();

  const pets: PetRow[] = rawRows.map((rawRow, index) => {
    const rowNumber = index + 2;
    const petName = String(rawRow.PETS ?? "").trim();

    if (!petName) {
      throw new Error(`Spreadsheet row ${rowNumber} is missing PETS.`);
    }

    const normalizedName = petName.toLowerCase().replace(/\s+/g, " ");
    const previousRow = seenNames.get(normalizedName);

    if (previousRow !== undefined) {
      throw new Error(`Duplicate pet ${JSON.stringify(petName)} found on spreadsheet rows ${previousRow} and ${rowNumber}.`);
    }

    seenNames.set(normalizedName, rowNumber);

    const normal = normalizeCell(rawRow.NORMAL);
    const neon = normalizeCell(rawRow.NEON);
    const mega = normalizeCell(rawRow.MEGA);

    for (const [field, value] of [
      ["NORMAL", normal],
      ["NEON", neon],
      ["MEGA", mega],
    ] as const) {
      if (String(value).trim() === "") {
        throw new Error(`Spreadsheet row ${rowNumber} (${petName}) is missing ${field}.`);
      }
    }

    return {
      PETS: petName,
      NORMAL: normal,
      NEON: neon,
      MEGA: mega,
      IMAGE: `/pets/${slug(petName)}.webp`,
    };
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(pets, null, 2)}\n`, "utf8");

  console.log(`Converted ${pets.length} rows from ${sheetName}.`);
  console.log(`Saved to ${path.relative(projectRoot, outputPath)}.`);
  console.log("Run npm run data:validate next.");
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}