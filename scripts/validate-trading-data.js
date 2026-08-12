const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const dataPath = path.join(projectRoot, "src", "data", "tradingItems.json");
const sourcesPath = path.join(projectRoot, "src", "data", "valueSources.json");
const ALLOWED_CATEGORIES = new Set([
  "PET",
  "PETWEAR",
  "EGG",
  "VEHICLE",
  "FOOD",
  "GIFT",
  "STROLLER",
  "TOY",
  "STICKER",
  "OTHER",
]);
const REGULAR_ONLY_CATEGORIES = new Set([
  "PETWEAR",
  "EGG",
  "VEHICLE",
  "FOOD",
  "GIFT",
  "STROLLER",
  "TOY",
  "STICKER",
  "OTHER",
]);

function isNumberOrNull(value) {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function main() {
  const items = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const sources = JSON.parse(fs.readFileSync(sourcesPath, "utf8"));
  const errors = [];
  const ids = new Set();
  const categoryCounts = {};

  if (!Array.isArray(items) || items.length < 1_500) {
    errors.push("Trading item database is unexpectedly small.");
  }
  if (sources.defaultSource !== "GCASH") {
    errors.push("GCash must remain the default value source.");
  }
  if (!sources.sources?.ELVE?.updatedAt) {
    errors.push("Elve source metadata is missing updatedAt.");
  }

  for (const [index, item] of items.entries()) {
    if (!item.ID || !item.NAME || !item.CATEGORY) {
      errors.push(`Row ${index + 1}: missing ID, NAME, or CATEGORY.`);
    }

    if (!ALLOWED_CATEGORIES.has(item.CATEGORY)) {
      errors.push(`${item.NAME || `Row ${index + 1}`}: unsupported category ${item.CATEGORY}.`);
    }

    categoryCounts[item.CATEGORY] = (categoryCounts[item.CATEGORY] ?? 0) + 1;

    if (ids.has(item.ID)) errors.push(`Duplicate ID: ${item.ID}`);
    ids.add(item.ID);

    if (item.RARITY !== null && item.RARITY !== undefined && typeof item.RARITY !== "string") {
      errors.push(`${item.NAME}: RARITY must be a string or null.`);
    }

    if (item.DEMAND_TIER !== null && item.DEMAND_TIER !== undefined && !["S", "A", "B", "C", "D"].includes(item.DEMAND_TIER)) {
      errors.push(`${item.NAME}: DEMAND_TIER must be S/A/B/C/D or null.`);
    }

    for (const field of [
      "GCASH_NORMAL",
      "GCASH_NEON",
      "GCASH_MEGA",
      "ELVE_NORMAL",
      "ELVE_NEON",
      "ELVE_MEGA",
    ]) {
      if (!isNumberOrNull(item[field])) {
        errors.push(`${item.NAME}: ${field} must be a number or null.`);
      }
    }

    if (
      REGULAR_ONLY_CATEGORIES.has(item.CATEGORY) &&
      (
        item.GCASH_NEON !== null ||
        item.GCASH_MEGA !== null ||
        item.ELVE_NEON !== null ||
        item.ELVE_MEGA !== null
      )
    ) {
      errors.push(`${item.NAME}: ${item.CATEGORY} must not have Neon or Mega values.`);
    }

    const hasGcash = typeof item.GCASH_NORMAL === "number" && item.GCASH_NORMAL > 0;
    const hasElve = typeof item.ELVE_NORMAL === "number" && item.ELVE_NORMAL > 0;
    if (!hasGcash && !hasElve) {
      errors.push(`${item.NAME}: must have at least one positive regular value source.`);
    }
  }

  for (const category of ["PET", "PETWEAR", "EGG", "TOY"]) {
    if (!categoryCounts[category]) {
      errors.push(`Trading item database has no ${category} records.`);
    }
  }

  if (errors.length > 0) {
    console.error(`Data validation failed with ${errors.length} issue(s):`);
    errors.slice(0, 50).forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  const summary = Array.from(ALLOWED_CATEGORIES)
    .map((category) => `${category} ${categoryCounts[category] ?? 0}`)
    .join(", ");
  console.log(
    `Data validation passed: ${items.length} items, ${ids.size} unique IDs (${summary}).`,
  );
}

main();
