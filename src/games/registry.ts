// Uses the COMPACT client index, not the full tradingItems.json.
//
// The full dataset is 1.7 MB and was being pulled into every client chunk that
// touches the game registry - Exchange, Trade Opinions and the Lounge, for both
// games. clientItemIndex is the tuple-encoded 629 KB projection that already
// backs lib/search.ts, so this also stops a second copy of the Adopt Me catalog
// being bundled alongside it.
//
// Verified value-equivalent for everything this module reads: the compact index
// omits the legacy aliases NORMAL/NEON/MEGA and INGAME_VALUE, and across all
// 3,382 items there are 0 rows where a canonical GCASH_*/ELVE_* value is null
// while its legacy alias is present, and 0 rows where ELVE_NORMAL and
// INGAME_VALUE disagree. See tests/gameRegistry.test.ts.
import { clientItemList } from "../lib/clientItemIndex";
import mm2Items from "../data/mm2Items.json";
import type { TradeItem } from "../components/trade/types";
import type {
  CSBTGameAdapter,
  CSBTGameId,
  CSBTGameItem,
  CSBTGameScope,
  CSBTItemVariant,
  CSBTValueSource,
} from "./types";

function normalize(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, " ");
}

function numeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function mm2ImageUrl(image?: string | null) {
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) return image;
  const clean = image.replace(/^\.\.\//, "/").replace(/^\/+/, "/");
  return `https://supremevalues.com${clean}`;
}

const adoptRaw = clientItemList;
const adoptItems: CSBTGameItem[] = adoptRaw.map((item) => ({
  id: item.ID,
  name: item.NAME,
  image: item.IMAGE || null,
  category: String(item.CATEGORY ?? "OTHER"),
  rarity: item.RARITY ?? null,
  demandLabel: item.DEMAND_TIER ? `Tier ${item.DEMAND_TIER}` : null,
  demandScore: null,
  raw: item,
}));

const mm2Raw = mm2Items as Array<{
  ID?: string;
  NAME: string;
  IMAGE?: string;
  CATEGORY?: string;
  TYPE?: string;
  SOURCE_VALUE?: number | null;
  GCASH_VALUE?: number | null;
  DEMAND?: number | null;
}>;
const mm2GameItems: CSBTGameItem[] = mm2Raw.map((item) => ({
  id: String(item.ID ?? item.NAME),
  name: item.NAME,
  image: mm2ImageUrl(item.IMAGE),
  category: String(item.CATEGORY ?? item.TYPE ?? "OTHER"),
  rarity: null,
  demandLabel: typeof item.DEMAND === "number" ? `${item.DEMAND}/10` : null,
  demandScore: typeof item.DEMAND === "number" ? item.DEMAND : null,
  raw: item,
}));

/**
 * Build the id/name lookup for a game.
 *
 * Exact ids and exact names are unique in both catalogs, so they are always
 * safe. Normalized keys are not: in MM2, normalize("Rainbow (Gun)") and
 * normalize("Rainbow Gun") both produce "rainbow gun", and those are different
 * weapons worth 41 and 420 respectively.
 *
 * The previous implementation let the last write win, so getItem() could return
 * a weapon 10x the requested value. A colliding normalized key is now dropped
 * entirely: an ambiguous lookup resolves to undefined rather than to a
 * confidently wrong item. Exact lookups still work for both weapons.
 */
function buildLookup(items: CSBTGameItem[]) {
  const map = new Map<string, CSBTGameItem>();
  // Exact keys are authoritative and must survive normalized-key collisions.
  const exact = new Set<string>();

  const setExact = (key: string, item: CSBTGameItem) => {
    if (!key || map.has(key)) return;
    map.set(key, item);
    exact.add(key);
  };

  for (const item of items) setExact(item.id.toLowerCase().trim(), item);
  for (const item of items) setExact(item.name.toLowerCase().trim(), item);

  // Normalized keys second. They never overwrite an exact key, and a normalized
  // key claimed by two different items is dropped rather than resolved wrongly.
  const loose = new Map<string, CSBTGameItem | null>();
  const claim = (key: string, item: CSBTGameItem) => {
    if (!key || exact.has(key)) return;
    const existing = loose.get(key);
    if (existing === undefined) loose.set(key, item);
    else if (existing !== null && existing.id !== item.id) loose.set(key, null);
  };

  for (const item of items) {
    claim(normalize(item.id), item);
    claim(normalize(item.name), item);
  }
  for (const [key, item] of loose) {
    if (item) map.set(key, item);
  }

  return map;
}

function lookupItem(map: Map<string, CSBTGameItem>, value: string) {
  const raw = String(value ?? "");
  return map.get(raw.toLowerCase().trim()) ?? map.get(normalize(raw));
}

function buildSearch(items: CSBTGameItem[]) {
  return (query: string, limit = 12) => {
    const q = normalize(query);
    if (!q) return [];
    const scored = items.flatMap((item) => {
      const name = normalize(item.name);
      const category = normalize(item.category);
      let score = 0;
      if (name === q) score = 1000;
      else if (name.startsWith(q)) score = 850;
      else if (name.includes(q)) score = 700;
      else if (category.includes(q)) score = 300;
      else {
        const words = q.split(" ").filter(Boolean);
        if (words.length && words.every((word) => name.includes(word))) score = 500;
      }
      return score ? [{ item, score }] : [];
    });
    return scored
      .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
      .slice(0, Math.max(1, limit))
      .map((entry) => entry.item);
  };
}

const adoptLookup = buildLookup(adoptItems);
const mm2Lookup = buildLookup(mm2GameItems);

const adoptAdapter: CSBTGameAdapter = {
  id: "adopt-me",
  shortName: "Adopt Me",
  name: "Adopt Me",
  icon: "🐾",
  description: "CSBT's primary trading database with GCash and Elve values.",
  homeHref: "/",
  valuesHref: "/values",
  calculatorHref: "/calculator",
  demandHref: "/demand",
  valueSources: [
    { id: "GCASH", label: "GCash Values", shortLabel: "GCash", symbol: "₱" },
    { id: "ELVE", label: "Elve Shark Values", shortLabel: "Elve", symbol: "🦈" },
  ],
  items: adoptItems,
  getItem: (value) => lookupItem(adoptLookup, value),
  searchItems: buildSearch(adoptItems),
  getVariants(item, source) {
    const raw = item.raw as TradeItem;
    const variants: CSBTItemVariant[] = [];
    const prefix = source === "ELVE" ? "ELVE" : "GCASH";
    if (numeric(raw[`${prefix}_NORMAL` as keyof TradeItem]) !== null || (source === "GCASH" && numeric(raw.NORMAL) !== null)) variants.push("NORMAL");
    if (numeric(raw[`${prefix}_NEON` as keyof TradeItem]) !== null || (source === "GCASH" && numeric(raw.NEON) !== null)) variants.push("NEON");
    if (numeric(raw[`${prefix}_MEGA` as keyof TradeItem]) !== null || (source === "GCASH" && numeric(raw.MEGA) !== null)) variants.push("MEGA");
    return variants.length ? variants : ["NORMAL"];
  },
  getValue(item, source, variant = "NORMAL") {
    const raw = item.raw as TradeItem;
    const direct = numeric(raw[`${source}_${variant}` as keyof TradeItem]);
    if (direct !== null) return direct;
    if (source === "GCASH") return numeric(raw[variant as keyof TradeItem]);
    if (source === "ELVE" && variant === "NORMAL") return numeric(raw.INGAME_VALUE);
    return null;
  },
  getDemandLabel: (item) => item.demandLabel ?? null,
  itemProfileHref: (item) => `/values/${encodeURIComponent(item.id)}`,
};

const mm2Adapter: CSBTGameAdapter = {
  id: "mm2",
  shortName: "MM2",
  name: "Murder Mystery 2",
  icon: "🔪",
  description: "MM2 weapon values and demand powered by the MM2 database.",
  homeHref: "/mm2",
  valuesHref: "/mm2/values",
  calculatorHref: "/mm2/calculator",
  demandHref: "/mm2/demand",
  valueSources: [
    { id: "SUPREME", label: "Supreme Values", shortLabel: "Supreme", symbol: "◈" },
  ],
  items: mm2GameItems,
  getItem: (value) => lookupItem(mm2Lookup, value),
  searchItems: buildSearch(mm2GameItems),
  getVariants: () => ["NORMAL"],
  getValue(item, source) {
    const raw = item.raw as (typeof mm2Raw)[number];
    if (source === "SUPREME") return numeric(raw.SOURCE_VALUE);
    if (source === "GCASH") return numeric(raw.GCASH_VALUE);
    return null;
  },
  getDemandLabel: (item) => item.demandLabel ?? null,
  itemProfileHref: (item) => `/mm2/values/${encodeURIComponent(item.id)}`,
};

const REGISTRY: Record<CSBTGameId, CSBTGameAdapter> = {
  "adopt-me": adoptAdapter,
  mm2: mm2Adapter,
};

export function getGameAdapter(gameId: CSBTGameId) {
  return REGISTRY[gameId];
}

export function getGameItem(gameId: CSBTGameId, idOrName: string) {
  return REGISTRY[gameId].getItem(idOrName);
}

export function getGameValue(
  gameId: CSBTGameId,
  itemIdOrName: string,
  source: CSBTValueSource,
  variant: CSBTItemVariant = "NORMAL",
) {
  const adapter = REGISTRY[gameId];
  const item = adapter.getItem(itemIdOrName);
  return item ? adapter.getValue(item, source, variant) : null;
}

export function parseGameId(value: string | null | undefined, fallback: CSBTGameId = "adopt-me"): CSBTGameId {
  return value === "mm2" ? "mm2" : value === "adopt-me" || value === "adopt" ? "adopt-me" : fallback;
}

export function parseGameScope(value: string | null | undefined, fallback: CSBTGameScope = "adopt-me"): CSBTGameScope {
  if (value === "all") return "all";
  return parseGameId(value, fallback === "all" ? "adopt-me" : fallback);
}

export function gameQueryValue(gameId: CSBTGameId) {
  return gameId;
}

export function sourceSymbol(source: CSBTValueSource) {
  if (source === "GCASH") return "₱";
  if (source === "ELVE") return "🦈";
  return "◈";
}

export function sourceLabel(source: CSBTValueSource) {
  if (source === "GCASH") return "GCash";
  if (source === "ELVE") return "Elve";
  return "Supreme";
}

export function buildCalculatorHref(
  gameId: CSBTGameId,
  rows: { your: Array<{ itemId: string; variant?: CSBTItemVariant; quantity?: number }>; their: Array<{ itemId: string; variant?: CSBTItemVariant; quantity?: number }> },
  source: CSBTValueSource,
) {
  const params = new URLSearchParams();
  params.set("source", source);
  if (gameId === "mm2") {
    if (rows.your.length) params.set("your", JSON.stringify(rows.your.map((row) => ({ key: row.itemId, quantity: Math.max(1, row.quantity ?? 1) }))));
    if (rows.their.length) params.set("their", JSON.stringify(rows.their.map((row) => ({ key: row.itemId, quantity: Math.max(1, row.quantity ?? 1) }))));
    return `/mm2/calculator?${params.toString()}`;
  }

  const encode = (items: typeof rows.your) => items
    .map((row) => `${encodeURIComponent(row.itemId)}~${row.variant ?? "NORMAL"}~${Math.max(1, row.quantity ?? 1)}`)
    .join(",");
  if (rows.your.length) params.set("your", encode(rows.your));
  if (rows.their.length) params.set("their", encode(rows.their));
  return `/calculator?${params.toString()}`;
}
