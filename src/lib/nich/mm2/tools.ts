/**
 * The MM2 tool layer.
 *
 * Deterministic functions over the generated catalog, each answering exactly
 * one factual question. The conversational layer calls these; it never reads
 * `mm2Catalog` itself and never does its own arithmetic. That separation is the
 * point: a tool can be tested against the data, and language generation can be
 * changed freely without any chance of moving a number.
 *
 * Every function honours the same rule as the rest of MM2 CSBT — a weapon with
 * no value in the requested source is *unpriced*, never zero and never
 * estimated, so it simply does not appear in a value-ranked result.
 */

import type { MM2ValueSource } from "../../../components/mm2/MM2TradeTypes";
import { mm2Catalog, type MM2CatalogItem } from "../../mm2/catalog";
import { mm2ItemValue } from "../../mm2/tradeMath";
import { assertGameContext } from "../game/guard";
import type { NichGameId } from "../game/types";
import type { MM2Category } from "./aliases";
import { mm2CategoryOf, mm2DemandOf } from "./engine";
import { getMM2ItemById } from "./resolver";

const GAME: NichGameId = "mm2";

export type MM2Filters = {
  source: MM2ValueSource;
  category?: MM2Category | null;
  minValue?: number | null;
  maxValue?: number | null;
  minDemand?: number | null;
  /** IDs to leave out — typically what the user already has. */
  excludeIds?: readonly string[];
  limit?: number;
};

function priced(item: MM2CatalogItem, source: MM2ValueSource): number | null {
  return mm2ItemValue(item, source);
}

function matchesFilters(item: MM2CatalogItem, filters: MM2Filters): boolean {
  if (filters.category && mm2CategoryOf(item) !== filters.category) return false;
  if (filters.excludeIds?.some((id) => id.toLowerCase() === item.ID.toLowerCase())) return false;

  if (typeof filters.minDemand === "number") {
    const demand = mm2DemandOf(item);
    if (demand === null || demand < filters.minDemand) return false;
  }

  const value = priced(item, filters.source);
  if (value === null) return false;
  if (typeof filters.minValue === "number" && value < filters.minValue) return false;
  if (typeof filters.maxValue === "number" && value > filters.maxValue) return false;

  return true;
}

function limitOf(filters: MM2Filters): number {
  return Math.max(1, Math.min(25, filters.limit ?? 8));
}

// ---------------------------------------------------------------------------
// Single-weapon facts
// ---------------------------------------------------------------------------

export type MM2ItemFacts = {
  item: MM2CatalogItem;
  supreme: number | null;
  gcash: number | null;
  demand: number | null;
  category: string;
  /** Demand expressed in words. `null` when the weapon is unrated — never guessed. */
  demandTier: "very high" | "high" | "moderate" | "low" | null;
};

export function getMM2ItemFacts(item: MM2CatalogItem, gameId: NichGameId = GAME): MM2ItemFacts {
  assertGameContext(GAME, gameId, "getMM2ItemFacts");

  const demand = mm2DemandOf(item);
  return {
    item,
    supreme: mm2ItemValue(item, "SUPREME"),
    gcash: mm2ItemValue(item, "GCASH"),
    demand,
    category: mm2CategoryOf(item),
    demandTier: demand === null ? null : demand >= 8 ? "very high" : demand >= 6 ? "high" : demand >= 3 ? "moderate" : "low",
  };
}

export function getMM2ItemValue(item: MM2CatalogItem, source: MM2ValueSource): number | null {
  return mm2ItemValue(item, source);
}

export function getMM2Demand(item: MM2CatalogItem): number | null {
  return mm2DemandOf(item);
}

/**
 * How easy a weapon is to move, stated only from data CSBT actually holds.
 *
 * The one input is the catalog's demand score. There is no trade-volume feed
 * behind MM2, so this deliberately says nothing about how fast anything sells;
 * inventing a liquidity metric would be inventing market data.
 */
export function describeMM2Tradeability(item: MM2CatalogItem): string {
  const demand = mm2DemandOf(item);
  if (demand === null) return `${item.NAME} has no demand rating in the catalog, so I can't say how easily it moves.`;
  if (demand >= 8) return `${item.NAME} is rated ${demand}/10 for demand — one of the easier things to trade away.`;
  if (demand >= 6) return `${item.NAME} is rated ${demand}/10 for demand, so it should find takers.`;
  if (demand >= 3) return `${item.NAME} sits at ${demand}/10 demand — moveable, but not instantly.`;
  return `${item.NAME} is only ${demand}/10 for demand, so expect it to sit for a while.`;
}

// ---------------------------------------------------------------------------
// Catalog queries
// ---------------------------------------------------------------------------

export type MM2SearchResult = {
  items: MM2CatalogItem[];
  /** How many weapons matched before the limit was applied. */
  total: number;
};

/** Weapons closest to a target value, nearest first. */
export function findMM2ItemsNearValue(
  target: number,
  filters: MM2Filters & { tolerance?: number },
  gameId: NichGameId = GAME,
): MM2SearchResult {
  assertGameContext(GAME, gameId, "findMM2ItemsNearValue");

  const tolerance = filters.tolerance ?? Math.max(target * 0.25, 1);
  const matched = mm2Catalog.filter((item) => {
    if (!matchesFilters(item, filters)) return false;
    const value = priced(item, filters.source);
    return value !== null && Math.abs(value - target) <= tolerance;
  });

  const sorted = [...matched].sort(
    (a, b) =>
      Math.abs((priced(a, filters.source) ?? 0) - target) - Math.abs((priced(b, filters.source) ?? 0) - target) ||
      (mm2DemandOf(b) ?? -1) - (mm2DemandOf(a) ?? -1) ||
      a.NAME.localeCompare(b.NAME),
  );

  return { items: sorted.slice(0, limitOf(filters)), total: matched.length };
}

/**
 * What a given value trades *up* into.
 *
 * Bounded above as well as below: a weapon worth ten times the starting point
 * is not an upgrade path, it is a different conversation, and listing it as one
 * is how a recommendation stops being useful.
 */
export function findMM2UpgradeTargets(
  fromValue: number,
  filters: MM2Filters & { maxMultiplier?: number },
  gameId: NichGameId = GAME,
): MM2SearchResult {
  assertGameContext(GAME, gameId, "findMM2UpgradeTargets");

  const ceiling = fromValue * (filters.maxMultiplier ?? 2.5);
  const matched = mm2Catalog.filter((item) => {
    if (!matchesFilters(item, filters)) return false;
    const value = priced(item, filters.source) ?? 0;
    return value > fromValue * 1.05 && value <= ceiling;
  });

  const sorted = [...matched].sort(
    (a, b) => (priced(a, filters.source) ?? 0) - (priced(b, filters.source) ?? 0) || a.NAME.localeCompare(b.NAME),
  );

  return { items: sorted.slice(0, limitOf(filters)), total: matched.length };
}

/** What a given value trades *down* into, highest first. */
export function findMM2DowngradeTargets(
  fromValue: number,
  filters: MM2Filters,
  gameId: NichGameId = GAME,
): MM2SearchResult {
  assertGameContext(GAME, gameId, "findMM2DowngradeTargets");

  const matched = mm2Catalog.filter((item) => {
    if (!matchesFilters(item, filters)) return false;
    const value = priced(item, filters.source) ?? 0;
    return value < fromValue * 0.95 && value >= fromValue * 0.2;
  });

  const sorted = [...matched].sort(
    (a, b) => (priced(b, filters.source) ?? 0) - (priced(a, filters.source) ?? 0) || a.NAME.localeCompare(b.NAME),
  );

  return { items: sorted.slice(0, limitOf(filters)), total: matched.length };
}

/**
 * "Something like Harvester but cheaper."
 *
 * Similarity here means what a trader means by it: same catalog category, and a
 * value in the direction they asked for. It is not a claim about how the two
 * weapons look or play.
 */
export function findMM2SimilarItems(
  item: MM2CatalogItem,
  options: { source: MM2ValueSource; direction: "cheaper" | "pricier" | "any"; limit?: number },
  gameId: NichGameId = GAME,
): MM2SearchResult {
  assertGameContext(GAME, gameId, "findMM2SimilarItems");

  const anchor = priced(item, options.source);
  if (anchor === null) return { items: [], total: 0 };

  const category = mm2CategoryOf(item);
  const sameCategory = mm2Catalog.filter((candidate) => {
    if (candidate.ID === item.ID) return false;
    if (mm2CategoryOf(candidate) !== category) return false;
    const value = priced(candidate, options.source);
    if (value === null) return false;
    if (options.direction === "cheaper") return value < anchor;
    if (options.direction === "pricier") return value > anchor;
    return true;
  });

  const sorted = [...sameCategory].sort(
    (a, b) => Math.abs((priced(a, options.source) ?? 0) - anchor) - Math.abs((priced(b, options.source) ?? 0) - anchor),
  );

  return { items: sorted.slice(0, Math.max(1, Math.min(25, options.limit ?? 6))), total: sameCategory.length };
}

/** Highest-demand weapons, optionally inside a value band. */
export function rankMM2ByDemand(filters: MM2Filters, gameId: NichGameId = GAME): MM2SearchResult {
  assertGameContext(GAME, gameId, "rankMM2ByDemand");

  const matched = mm2Catalog.filter((item) => matchesFilters(item, { ...filters, minDemand: filters.minDemand ?? 1 }));
  const sorted = [...matched].sort(
    (a, b) =>
      (mm2DemandOf(b) ?? -1) - (mm2DemandOf(a) ?? -1) ||
      (priced(b, filters.source) ?? -1) - (priced(a, filters.source) ?? -1) ||
      a.NAME.localeCompare(b.NAME),
  );

  return { items: sorted.slice(0, limitOf(filters)), total: matched.length };
}

/**
 * Weapons that would close a value gap, preferring ones people actually want.
 *
 * A gap filled with three low-demand weapons is worse than the same gap filled
 * with one wanted weapon, so demand breaks the tie once the value is close.
 */
export function findMM2AddsForGap(
  gap: number,
  filters: MM2Filters,
  gameId: NichGameId = GAME,
): MM2SearchResult {
  assertGameContext(GAME, gameId, "findMM2AddsForGap");

  const tolerance = Math.max(gap * 0.35, 1);
  const matched = mm2Catalog.filter((item) => {
    if (!matchesFilters(item, filters)) return false;
    const value = priced(item, filters.source);
    return value !== null && Math.abs(value - gap) <= tolerance;
  });

  const sorted = [...matched].sort(
    (a, b) =>
      (mm2DemandOf(b) ?? -1) - (mm2DemandOf(a) ?? -1) ||
      Math.abs((priced(a, filters.source) ?? 0) - gap) - Math.abs((priced(b, filters.source) ?? 0) - gap) ||
      a.NAME.localeCompare(b.NAME),
  );

  return { items: sorted.slice(0, limitOf(filters)), total: matched.length };
}

// ---------------------------------------------------------------------------
// Multi-item arithmetic
// ---------------------------------------------------------------------------

export type MM2InventoryTotal = {
  source: MM2ValueSource;
  rows: Array<{ item: MM2CatalogItem; quantity: number; unit: number | null; line: number | null }>;
  /** Sum of the priced rows only. */
  total: number;
  /** Weapons with no value in this source. Their absence from the total is stated. */
  unpriced: MM2CatalogItem[];
  best: MM2CatalogItem | null;
  worstDemand: MM2CatalogItem | null;
};

export function calculateMM2InventoryTotal(
  entries: ReadonlyArray<{ item: MM2CatalogItem; quantity?: number }>,
  source: MM2ValueSource,
  gameId: NichGameId = GAME,
): MM2InventoryTotal {
  assertGameContext(GAME, gameId, "calculateMM2InventoryTotal");

  const rows = entries.map((entry) => {
    const quantity = Math.max(1, Math.min(99, Math.floor(entry.quantity ?? 1)));
    const unit = priced(entry.item, source);
    return { item: entry.item, quantity, unit, line: unit === null ? null : unit * quantity };
  });

  const unpriced = rows.filter((row) => row.unit === null).map((row) => row.item);
  const total = rows.reduce((sum, row) => sum + (row.line ?? 0), 0);

  const pricedRows = rows.filter((row) => row.unit !== null);
  const best = pricedRows.length
    ? [...pricedRows].sort((a, b) => (b.unit ?? 0) - (a.unit ?? 0))[0].item
    : null;

  const rated = rows.filter((row) => mm2DemandOf(row.item) !== null);
  const worstDemand = rated.length
    ? [...rated].sort((a, b) => (mm2DemandOf(a.item) ?? 0) - (mm2DemandOf(b.item) ?? 0))[0].item
    : null;

  return { source, rows, total, unpriced, best, worstDemand };
}

/**
 * How many other weapons start with this word.
 *
 * Used to add an honest footnote to a short exact match: "Ice" is a real MM2
 * weapon *and* the first word of two dozen others, and the user who typed it
 * may have meant any of them. The answer stays the exact match — guessing
 * otherwise would be worse — but it says what else is there.
 */
export function countMM2NamesStartingWith(word: string, gameId: NichGameId = GAME): number {
  assertGameContext(GAME, gameId, "countMM2NamesStartingWith");

  const prefix = `${word.toLowerCase().trim()} `;
  return mm2Catalog.filter((item) => item.NAME.toLowerCase().startsWith(prefix)).length;
}

/** Resolve stored IDs back to catalog rows, dropping anything that no longer exists. */
export function itemsFromIds(ids: readonly string[] | undefined): MM2CatalogItem[] {
  return (ids ?? []).flatMap((id) => {
    const item = getMM2ItemById(id);
    return item ? [item] : [];
  });
}
