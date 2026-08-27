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
 * CSBT_VALUE and GCASH_VALUE are currently null for every row; they exist
 * because the master workbook reserves those columns for manual curation.
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
