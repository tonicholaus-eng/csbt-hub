const fs = require("fs");
const path = require("path");

const ELVE_URL = "https://www.elvebredd.com/adopt-me-calculator";
const MIN_EXPECTED_RECORDS = 1_500;
const REQUIRED_ITEMS = ["Frost Dragon", "Bat Dragon", "Owl", "Turtle"];

function normalizeName(value) {
  return String(value ?? "")
    .replace(/\\u0026/gi, "&")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function toFiniteNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number(value.toFixed(10));
  }

  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? Number(parsed.toFixed(10)) : null;
}

function categoryFromElveType(value) {
  const type = String(value ?? "").trim().toLowerCase();
  if (type === "pets") return "PET";
  if (type === "pet wear") return "PETWEAR";
  return null;
}

function findPushCallEnd(html, startIndex) {
  let inString = false;
  let escaped = false;
  let squareDepth = 0;
  let curlyDepth = 0;

  for (let index = startIndex; index < html.length; index += 1) {
    const character = html[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === "[") squareDepth += 1;
    if (character === "]") squareDepth -= 1;
    if (character === "{") curlyDepth += 1;
    if (character === "}") curlyDepth -= 1;

    if (character === ")" && squareDepth === 0 && curlyDepth === 0) {
      return index;
    }
  }

  return -1;
}

function findObjectWithInitialPets(value) {
  if (!value || typeof value !== "object") return null;

  if (Array.isArray(value.initialPets)) {
    return value;
  }

  if (Array.isArray(value)) {
    for (const child of value) {
      const match = findObjectWithInitialPets(child);
      if (match) return match;
    }
    return null;
  }

  for (const child of Object.values(value)) {
    const match = findObjectWithInitialPets(child);
    if (match) return match;
  }

  return null;
}

function extractInitialPetsPayload(html) {
  const marker = "self.__next_f.push(";
  let cursor = 0;

  while (cursor < html.length) {
    const callStart = html.indexOf(marker, cursor);
    if (callStart === -1) break;

    const argumentStart = callStart + marker.length;
    const callEnd = findPushCallEnd(html, argumentStart);
    if (callEnd === -1) break;

    const argumentText = html.slice(argumentStart, callEnd).trim();
    cursor = callEnd + 1;

    try {
      const parsedArguments = JSON.parse(argumentText);
      const payloadText = parsedArguments?.[1];

      if (typeof payloadText !== "string" || !payloadText.includes("initialPets")) {
        continue;
      }

      const colonIndex = payloadText.indexOf(":");
      const jsonText = colonIndex >= 0 ? payloadText.slice(colonIndex + 1).trim() : payloadText.trim();
      const parsedPayload = JSON.parse(jsonText);
      const result = findObjectWithInitialPets(parsedPayload);

      if (result) return result;
    } catch {
      // Ignore unrelated or non-JSON React Server Component chunks.
    }
  }

  throw new Error("Could not locate Elvebredd initialPets data in the calculator page.");
}

function createSnapshotFromHtml(html, fetchedAt = new Date().toISOString()) {
  const payload = extractInitialPetsPayload(html);
  const items = [];

  for (const rawItem of payload.initialPets) {
    const category = categoryFromElveType(rawItem.type);
    const name = String(rawItem.name ?? "").trim();

    if (!category || !name) continue;

    const normal = toFiniteNumber(rawItem.rvalue) ?? toFiniteNumber(rawItem.value);
    const neon = category === "PET" ? toFiniteNumber(rawItem.nvalue) : null;
    const mega = category === "PET" ? toFiniteNumber(rawItem.mvalue) : null;

    items.push({
      id: rawItem.id ?? null,
      name,
      category,
      image: typeof rawItem.image === "string" ? rawItem.image : null,
      normal,
      neon,
      mega,
      status: typeof rawItem.status === "string" ? rawItem.status : null,
      rarity: typeof rawItem.rarity === "string" ? rawItem.rarity : null,
    });
  }

  items.sort((first, second) => {
    if (first.category !== second.category) return first.category.localeCompare(second.category);
    return first.name.localeCompare(second.name, undefined, { numeric: true, sensitivity: "base" });
  });

  return {
    source: "Elvebredd",
    valueSystem: "Shark",
    sourceUrl: ELVE_URL,
    sourceVersion: payload.initialVersion ?? null,
    fetchedAt,
    recordCount: items.length,
    items,
  };
}

function validateSnapshot(snapshot, previousSnapshot) {
  if (!snapshot || !Array.isArray(snapshot.items)) {
    throw new Error("Elve snapshot is missing its items array.");
  }

  if (snapshot.items.length < MIN_EXPECTED_RECORDS) {
    throw new Error(`Elve snapshot has only ${snapshot.items.length} records; expected at least ${MIN_EXPECTED_RECORDS}.`);
  }

  const names = new Set(snapshot.items.map((item) => normalizeName(item.name)));
  const missingRequired = REQUIRED_ITEMS.filter((name) => !names.has(normalizeName(name)));
  if (missingRequired.length > 0) {
    throw new Error(`Elve snapshot is missing required records: ${missingRequired.join(", ")}.`);
  }

  const valuedRecords = snapshot.items.filter((item) => item.normal !== null).length;
  if (valuedRecords < 1_400) {
    throw new Error(`Only ${valuedRecords} Elve records have a regular Shark value.`);
  }

  if (previousSnapshot?.items?.length) {
    const ratio = snapshot.items.length / previousSnapshot.items.length;
    if (ratio < 0.85) {
      throw new Error(`Elve record count dropped by more than 15% (${previousSnapshot.items.length} to ${snapshot.items.length}).`);
    }
  }
}

function buildSnapshotMap(snapshot) {
  const map = new Map();
  for (const item of snapshot.items ?? []) {
    map.set(`${item.category}:${normalizeName(item.name)}`, item);
  }
  return map;
}

function readJsonIfPresent(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeSnapshot(snapshot, snapshotPath, backupPath) {
  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });

  if (fs.existsSync(snapshotPath) && backupPath) {
    fs.copyFileSync(snapshotPath, backupPath);
  }

  fs.writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
}


module.exports = {
  ELVE_URL,
  buildSnapshotMap,
  createSnapshotFromHtml,
  normalizeName,
  readJsonIfPresent,
  validateSnapshot,
  writeSnapshot,
};
