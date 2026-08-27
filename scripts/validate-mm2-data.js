const fs = require("fs");
const path = require("path");

const itemsPath = path.join(process.cwd(), "src", "data", "mm2Items.json");
const items = JSON.parse(fs.readFileSync(itemsPath, "utf8"));
const errors = [];
const ids = new Set();

if (!Array.isArray(items)) errors.push("mm2Items.json must contain an array.");

for (const [index, item] of (Array.isArray(items) ? items : []).entries()) {
  const label = item?.NAME || `row ${index + 1}`;
  if (!item?.ID) errors.push(`${label}: missing ID.`);
  if (!item?.NAME) errors.push(`${label}: missing NAME.`);
  if (ids.has(item?.ID)) errors.push(`${label}: duplicate ID ${item.ID}.`);
  if (item?.ID) ids.add(item.ID);

  for (const field of ["CSBT_VALUE", "SOURCE_VALUE", "VALUE"]) {
    if (item?.[field] !== null && item?.[field] !== undefined && (!Number.isFinite(item[field]) || item[field] < 0)) {
      errors.push(`${label}: ${field} must be null or a non-negative number.`);
    }
  }

  if (item?.SOURCE_NAME === "" ) errors.push(`${label}: empty source name.`);

  if (item?.DEMAND !== null && item?.DEMAND !== undefined && (!Number.isFinite(item.DEMAND) || item.DEMAND < 0 || item.DEMAND > 10)) {
    errors.push(`${label}: DEMAND must be between 0 and 10.`);
  }
}

if (errors.length) {
  console.error("MM2 data validation failed:\n" + errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(`MM2 data validation passed (${items.length} items).`);
