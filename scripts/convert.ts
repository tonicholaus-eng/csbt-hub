import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

// Change this if your Excel file name changes
const excelFile = "ADM-PRICELIST-CSBT-DUPLICATE (1).xlsx";

// Read the workbook
const workbook = XLSX.readFile(excelFile);

// Get the first sheet
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Convert sheet to JSON
const data = XLSX.utils.sheet_to_json(sheet);

// Save to src/data/pets.json
const outputPath = path.join(__dirname, "../src/data/pets.json");

fs.writeFileSync(
  outputPath,
  JSON.stringify(data, null, 2),
  "utf8"
);

console.log("✅ Conversion complete!");
console.log(`Saved ${data.length} rows to src/data/pets.json`);