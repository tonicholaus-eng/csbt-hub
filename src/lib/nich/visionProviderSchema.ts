/**
 * ONE canonical slot-evidence shape for every vision provider.
 *
 * Gemini and Cloudflare Workers AI are given the same JSON schema, but they do
 * not honour it identically: field names drift (`possibleCatalogNames` vs
 * `candidates` vs `names`), confidence arrives as 0.76 / 76 / "76%", and
 * booleans arrive as true / "true" / "yes" / "unknown". A strict parser silently
 * produced empty candidate lists for one provider, which is indistinguishable
 * downstream from "the model saw nothing" — every slot became Unknown.
 *
 * Everything downstream of this file consumes ONLY VisionSlotEvidence.
 */

export type VisionSlotModifiers = {
  neon: boolean | null;
  mega: boolean | null;
  fly: boolean | null;
  ride: boolean | null;
};

export type VisionSlotEvidence = {
  /** Tile label from the crop sheet, e.g. "Y1" / "T3". */
  tile: string;
  /** Free-text visual description of the artwork. */
  description: string;
  animalType?: string;
  bodyColors: string[];
  features: string[];
  orientation?: string;
  /** Item-name text legible in the crop, if any. */
  visibleText?: string;
  /**
   * The provider's own single best name guess. Kept as candidate EVIDENCE — it
   * is fed into catalog resolution, never displayed as a confirmed identity.
   */
  rawSuggestedName?: string;
  /** Provider name hypotheses, best first. Resolved against the catalog later. */
  candidateNames: string[];
  /** Normalized 0..1. */
  visualConfidence: number;
  modifiers: VisionSlotModifiers;
  /** Normalized 0..1 confidence in the badge read specifically. */
  badgeConfidence: number;
  provider: "gemini" | "cloudflare";
};

const SLOT_CONTAINER_KEYS = ["slots", "items", "results", "tiles", "detections", "pets"];
const TILE_KEYS = ["tile", "label", "tileLabel", "id", "slotLabel"];
const DESCRIPTION_KEYS = ["description", "visualEvidence", "visualDescription", "summary", "notes"];
const ANIMAL_KEYS = ["animalType", "animal", "species", "creatureType", "type", "category"];
const COLOR_KEYS = ["bodyColors", "bodyColours", "colors", "colours", "dominantColors", "palette"];
const FEATURE_KEYS = ["features", "visualFeatures", "details", "traits", "observations"];
const ORIENTATION_KEYS = ["orientation", "facing", "pose"];
const VISIBLE_TEXT_KEYS = ["visibleText", "text", "ocr", "label_text", "itemText"];
const RAW_NAME_KEYS = ["rawName", "name", "petName", "itemName", "bestGuess", "guess", "identity", "prediction"];
const CANDIDATE_KEYS = [
  "possibleCatalogNames",
  "candidateNames",
  "candidates",
  "possibleNames",
  "possibleMatches",
  "names",
  "alternatives",
  "options",
];
const CONFIDENCE_KEYS = ["visualConfidence", "confidence", "score", "certainty", "itemConfidence"];
const BADGE_CONFIDENCE_KEYS = ["badgeConfidence", "modifierConfidence", "variantConfidence"];
const NAME_FIELDS_IN_OBJECT = ["itemName", "name", "catalogName", "petName", "value", "label"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function pick(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  // Providers occasionally snake_case or lowercase the schema.
  const lowered = new Map(Object.keys(record).map((key) => [key.toLowerCase().replace(/[^a-z]/g, ""), key]));
  for (const key of keys) {
    const actual = lowered.get(key.toLowerCase().replace(/[^a-z]/g, ""));
    if (actual !== undefined && record[actual] !== undefined && record[actual] !== null) return record[actual];
  }
  return undefined;
}

function toText(value: unknown, maxLength: number) {
  if (typeof value === "string") return value.trim().slice(0, maxLength);
  if (typeof value === "number" && Number.isFinite(value)) return String(value).slice(0, maxLength);
  return "";
}

/** Accepts an array, a comma/semicolon separated string, or an array of objects. */
export function toStringList(value: unknown, maxItems: number, maxLength: number): string[] {
  const raw: unknown[] = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[;,|]/)
      : value === undefined || value === null
        ? []
        : [value];

  const out: string[] = [];
  for (const entry of raw) {
    let text = "";
    if (typeof entry === "string" || typeof entry === "number") {
      text = toText(entry, maxLength);
    } else if (isRecord(entry)) {
      const named = pick(entry, NAME_FIELDS_IN_OBJECT);
      text = toText(named, maxLength);
    }
    text = text.trim();
    if (!text) continue;
    if (out.some((existing) => existing.toLowerCase() === text.toLowerCase())) continue;
    out.push(text);
    if (out.length >= maxItems) break;
  }
  return out;
}

/**
 * Confidence arrives as 0.76, 76, "76", "76%", or "0.76". Anything above 1 is
 * treated as a percentage. Unparseable values become 0 rather than a lucky
 * default, so a broken provider degrades into "needs confirmation".
 */
export function toConfidence(value: unknown): number {
  let numeric: number;
  if (typeof value === "number") {
    numeric = value;
  } else if (typeof value === "string") {
    const cleaned = value.trim().replace(/%$/, "");
    numeric = Number(cleaned);
    if (!Number.isFinite(numeric)) return 0;
    if (value.trim().endsWith("%")) numeric = numeric / 100;
  } else {
    return 0;
  }
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  // 76 means 76%, not "clamp to 1".
  if (numeric > 1) numeric = numeric > 100 ? 1 : numeric / 100;
  return Math.max(0, Math.min(1, numeric));
}

const TRUE_WORDS = new Set(["true", "yes", "y", "1", "present", "visible", "on"]);
const FALSE_WORDS = new Set(["false", "no", "n", "0", "absent", "none", "off"]);

/** true / false / null, where null explicitly means "unreadable — do not guess". */
export function toTriState(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1 ? true : value === 0 ? false : null;
  if (typeof value === "string") {
    const text = value.trim().toLowerCase();
    if (TRUE_WORDS.has(text)) return true;
    if (FALSE_WORDS.has(text)) return false;
    return null;
  }
  return null;
}

function findSlotRows(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (!isRecord(parsed)) return [];
  for (const key of SLOT_CONTAINER_KEYS) {
    const value = parsed[key];
    if (Array.isArray(value)) return value;
  }
  // Some providers return a single object keyed by tile: { "Y1": {...} }.
  const values = Object.values(parsed);
  if (values.length && values.every((value) => isRecord(value))) {
    return Object.entries(parsed).map(([key, value]) => ({ tile: key, ...(value as Record<string, unknown>) }));
  }
  return [];
}

/**
 * Normalize whatever a provider returned into VisionSlotEvidence.
 *
 * Rows whose tile label is not in `allowedTiles` are dropped: the manifest, not
 * the model, owns slot geometry.
 */
export function normalizeProviderSlotEvidence(
  parsed: unknown,
  allowedTiles: Set<string>,
  provider: VisionSlotEvidence["provider"],
  maxSlots = 12,
): VisionSlotEvidence[] {
  const rows = findSlotRows(parsed);
  const seen = new Set<string>();
  const out: VisionSlotEvidence[] = [];

  for (const row of rows) {
    if (!isRecord(row)) continue;
    const tile = toText(pick(row, TILE_KEYS), 8).toUpperCase().replace(/\s+/g, "");
    if (!allowedTiles.has(tile) || seen.has(tile)) continue;
    seen.add(tile);

    const animalType = toText(pick(row, ANIMAL_KEYS), 60);
    const bodyColors = toStringList(pick(row, COLOR_KEYS), 4, 24);
    const features = toStringList(pick(row, FEATURE_KEYS), 6, 80);
    const rawSuggestedName = toText(pick(row, RAW_NAME_KEYS), 120);
    const parsedCandidateNames = toStringList(pick(row, CANDIDATE_KEYS), 7, 120);
    // Preserve BOTH the provider's best guess and its alternatives. The earlier
    // parser chose one or the other, so a useful bestGuess silently disappeared
    // whenever `possibleCatalogNames` was present. That starved the catalog
    // resolver and made otherwise recognizable slots look completely Unknown.
    const candidateNames = [...new Set([
      ...(rawSuggestedName ? [rawSuggestedName] : []),
      ...parsedCandidateNames,
    ].map((name) => name.trim()).filter(Boolean))].slice(0, 7);
    const description = toText(pick(row, DESCRIPTION_KEYS), 300)
      || [bodyColors.join(" "), animalType, features.join("; ")].filter(Boolean).join(" ").trim();

    out.push({
      tile,
      description,
      ...(animalType ? { animalType } : {}),
      bodyColors,
      features,
      ...(toText(pick(row, ORIENTATION_KEYS), 40) ? { orientation: toText(pick(row, ORIENTATION_KEYS), 40) } : {}),
      ...(toText(pick(row, VISIBLE_TEXT_KEYS), 120) ? { visibleText: toText(pick(row, VISIBLE_TEXT_KEYS), 120) } : {}),
      ...(rawSuggestedName ? { rawSuggestedName } : {}),
      // Candidate names are evidence, never the final answer. Keep the best guess
      // in the same ranked family so downstream catalog matching can be tolerant
      // to spacing/letter errors without displaying a model-only string.
      candidateNames,
      visualConfidence: toConfidence(pick(row, CONFIDENCE_KEYS)),
      modifiers: {
        neon: toTriState(pick(row, ["neon", "isNeon", "n"])),
        mega: toTriState(pick(row, ["mega", "isMega", "m"])),
        fly: toTriState(pick(row, ["fly", "isFly", "flyable", "f"])),
        ride: toTriState(pick(row, ["ride", "isRide", "rideable", "r"])),
      },
      badgeConfidence: toConfidence(pick(row, BADGE_CONFIDENCE_KEYS)),
      provider,
    });
    if (out.length >= maxSlots) break;
  }

  return out;
}
