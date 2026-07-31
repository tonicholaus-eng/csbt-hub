const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

function slugify(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const cleaned = String(value).trim();

  return cleaned || null;
}

function findValue(row, possibleColumns) {
  for (const column of possibleColumns) {
    if (row[column] !== undefined) {
      return row[column];
    }
  }

  return undefined;
}

function readFirstSheet(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath);
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error(`No worksheet found in: ${filePath}`);
  }

  return XLSX.utils.sheet_to_json(
    workbook.Sheets[firstSheetName],
    {
      defval: null,
    },
  );
}

function convertPetWear() {
  const inputPath = path.join(
    process.cwd(),
    "source-data",
    "petwear.xlsx",
  );

  const outputPath = path.join(
    process.cwd(),
    "src",
    "data",
    "petwear.json",
  );

  const rows = readFirstSheet(inputPath);

  const petwear = rows
    .map((row) => {
      const name = cleanValue(
        findValue(row, [
          "PET WEAR NAME",
          "PETWEAR NAME",
          "ITEM NAME",
          "NAME",
          "Pet Wear Name",
          "Name",
        ]),
      );

      if (!name) {
        return null;
      }

      const spreadsheetImage = cleanValue(
        findValue(row, [
          "PET WEAR IMAGE",
          "PETWEAR IMAGE",
          "ITEM IMAGE",
          "IMAGE",
          "Image",
        ]),
      );

      const regularValue = cleanValue(
        findValue(row, [
          "REGULAR VALUE",
          "NORMAL VALUE",
          "VALUE",
          "Regular Value",
          "Value",
        ]),
      );

      return {
        NAME: name,
        CATEGORY: "PETWEAR",
        IMAGE:
          spreadsheetImage ||
          `/petwear/${slugify(name)}.webp`,
        NORMAL: regularValue,
      };
    })
    .filter(Boolean);

  fs.mkdirSync(path.dirname(outputPath), {
    recursive: true,
  });

  fs.writeFileSync(
    outputPath,
    JSON.stringify(petwear, null, 2),
    "utf8",
  );

  console.log(
    `Created ${outputPath} with ${petwear.length} pet-wear items.`,
  );
}

convertPetWear();