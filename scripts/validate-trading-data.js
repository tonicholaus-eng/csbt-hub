const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const dataPath = path.join(projectRoot, "src", "data", "tradingItems.json");
const sourcesPath = path.join(projectRoot, "src", "data", "valueSources.json");

function isNumberOrNull(value) {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function main() {
  const items = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const sources = JSON.parse(fs.readFileSync(sourcesPath, "utf8"));
  const errors = [];
  const ids = new Set();

  if (!Array.isArray(items) || items.length < 1_500) errors.push("Trading item database is unexpectedly small.");
  if (sources.defaultSource !== "GCASH") errors.push("GCash must remain the default value source.");
  if (!sources.sources?.ELVE?.updatedAt) errors.push("Elve source metadata is missing updatedAt.");

  for (const [index, item] of items.entries()) {
    if (!item.ID || !item.NAME || !item.CATEGORY) errors.push(`Row ${index + 1}: missing ID, NAME, or CATEGORY.`);
    if (ids.has(item.ID)) errors.push(`Duplicate ID: ${item.ID}`);
    ids.add(item.ID);

    for (const field of ["GCASH_NORMAL", "GCASH_NEON", "GCASH_MEGA", "ELVE_NORMAL", "ELVE_NEON", "ELVE_MEGA"]) {
      if (!isNumberOrNull(item[field])) errors.push(`${item.NAME}: ${field} must be a number or null.`);
    }

    if (item.CATEGORY === "PETWEAR" && (item.GCASH_NEON !== null || item.GCASH_MEGA !== null || item.ELVE_NEON !== null || item.ELVE_MEGA !== null)) {
      errors.push(`${item.NAME}: Pet Wear must not have Neon or Mega values.`);
    }
  }

  if (errors.length > 0) {
    console.error(`Data validation failed with ${errors.length} issue(s):`);
    errors.slice(0, 50).forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log(`Data validation passed: ${items.length} items, ${ids.size} unique IDs.`);
}

main();
