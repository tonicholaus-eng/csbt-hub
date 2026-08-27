import mm2Items from "../../data/mm2Items.json";

/**
 * Canonical shape of one row in src/data/mm2Items.json.
 *
 * Mirrors exactly what scripts/generate-mm2-items.js writes. Nullability is not
 * decorative: of the 1,099 generated weapons, 189 legitimately have no Supreme
 * value and no demand (171 UNTRADABLE, 16 EVO variants, 2 PET). Those fields
 * must stay nullable so callers are forced to handle "unpriced" rather than
 * silently treating it as zero.
 *
 * CSBT_VALUE is null for every row; it exists because the master workbook
 * reserves that column for manual curation. GCASH_VALUE was also empty when
 * this comment was first written, but the current dataset prices 939 of the
 * 1,099 weapons with it, so callers must treat it as real data.
 */
export type MM2CatalogItem = {
  ID: string;
  NAME: string;
  IMAGE?: string;
  TYPE?: string;
  CATEGORY?: string;
  CSBT_VALUE?: number | null;
  SOURCE_VALUE?: number | null;
  GCASH_VALUE?: number | null;
  VALUE?: number | null;
  DEMAND?: number | null;
  SOURCE_NAME?: string | null;
  SOURCE_URL?: string | null;
  NOTES?: string | null;
  UPDATED_AT?: string | null;
  LAST_SOURCE_SYNC?: string | null;
};

/** The generated MM2 catalog, typed once so callers never need `any`. */
export const mm2Catalog = mm2Items as MM2CatalogItem[];

/** Absolute image URL for a catalog row, or null when the row has no image. */
export function mm2ImageUrl(item: Pick<MM2CatalogItem, "IMAGE">): string | null {
  if (!item.IMAGE) return null;
  if (/^https?:\/\//i.test(item.IMAGE)) return item.IMAGE;
  const clean = item.IMAGE.replace(/^\.\.\//, "/").replace(/^\/+/, "/");
  return `https://supremevalues.com${clean}`;
}

/** Finite Supreme value, or null when the weapon is unpriced. */
export function mm2SupremeValue(item: Pick<MM2CatalogItem, "SOURCE_VALUE">): number | null {
  return typeof item.SOURCE_VALUE === "number" && Number.isFinite(item.SOURCE_VALUE)
    ? item.SOURCE_VALUE
    : null;
}

/** Finite demand score (0-10), or null when the weapon is unrated. */
export function mm2Demand(item: Pick<MM2CatalogItem, "DEMAND">): number | null {
  return typeof item.DEMAND === "number" && Number.isFinite(item.DEMAND) ? item.DEMAND : null;
}

// ---------------------------------------------------------------------------
// Canonical weapon-profile resolution
// ---------------------------------------------------------------------------

/**
 * The canonical profile URL for a weapon. Always keyed by ID.
 *
 * IDs are unique across all 1,099 weapons even after aggressive normalization,
 * whereas names are not: five pairs collapse to the same key once punctuation
 * and spacing are stripped (e.g. "Rainbow (Gun)" RARE/41 vs "Rainbow Gun"
 * GODLY/420). Linking by name meant one of each pair was unreachable and its
 * URL rendered the other weapon's value.
 */
export function mm2ProfileHref(item: Pick<MM2CatalogItem, "ID">): string {
  return `/mm2/values/${encodeURIComponent(item.ID)}`;
}

/** Loose key used only as a last-resort fallback for older, non-canonical URLs. */
function looseKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[_-]/g, " ")
    .replace(/[^a-z0-9]+/g, "");
}

export type MM2Resolution =
  | { status: "found"; item: MM2CatalogItem; canonical: boolean }
  | { status: "ambiguous"; slug: string; candidates: MM2CatalogItem[] }
  | { status: "missing" };

/**
 * Resolve a weapon-profile URL segment to exactly one catalog row.
 *
 * Order matters, and each step is unambiguous before the next is tried:
 *   1. exact ID            - canonical, 1,099/1,099 unique
 *   2. exact NAME          - 1,099/1,099 unique, so old ?name URLs stay correct
 *   3. loose normalized    - ONLY when it matches a single weapon
 *
 * When the loose key matches more than one weapon the caller is told it is
 * ambiguous rather than being handed `.find()`'s first hit. Guessing is what
 * made "Rainbow Gun" render Rainbow (Gun)'s value - a 10x error on a page whose
 * entire purpose is showing a value.
 */
export function resolveMM2Item(raw: string): MM2Resolution {
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // Malformed percent-encoding: fall back to the raw segment.
  }
  const trimmed = decoded.trim();
  if (!trimmed) return { status: "missing" };

  const lower = trimmed.toLowerCase();

  const byId = mm2Catalog.find((item) => item.ID.toLowerCase() === lower);
  if (byId) return { status: "found", item: byId, canonical: true };

  const byName = mm2Catalog.find((item) => item.NAME.toLowerCase().trim() === lower);
  if (byName) return { status: "found", item: byName, canonical: false };

  const key = looseKey(trimmed);
  if (!key) return { status: "missing" };

  const loose = mm2Catalog.filter(
    (item) => looseKey(item.NAME) === key || looseKey(item.ID) === key,
  );
  if (loose.length === 1) return { status: "found", item: loose[0], canonical: false };
  if (loose.length > 1) return { status: "ambiguous", slug: trimmed, candidates: loose };

  return { status: "missing" };
}
