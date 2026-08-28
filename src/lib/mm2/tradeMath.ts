/**
 * The authoritative MM2 trade arithmetic.
 *
 * Extracted from `MM2TradeCalculator.tsx`, which held the only copy of
 * `getItemValue` / `totalFor` / `missingFor`. NICH now has to answer "wfl" for
 * MM2, and `CLAUDE.md` treats calculator semantics as correctness-critical, so
 * the two surfaces share this module instead of growing a second
 * implementation that can drift.
 *
 * The rules encoded here are exactly the ones the calculator already shipped:
 *
 *   - SUPREME reads SOURCE_VALUE, GCASH reads GCASH_VALUE. Never the other,
 *     and never a substitute when the selected source is empty.
 *   - A non-finite or absent value is *missing*, not zero. 189 of the 1,099
 *     weapons have no Supreme value at all, and 160 have no GCash value, so
 *     treating missing as zero would silently price them.
 *   - Missing units are counted per unit (quantity-aware), because one missing
 *     weapon added five times is five unpriced units.
 *   - The verdict itself comes from `lib/trade/verdict.ts`, shared with Adopt
 *     Me, so the FAIR threshold can never diverge between games.
 */

import { getTradeVerdict, type TradeVerdictResult } from "../trade/verdict";
import type { MM2Item, MM2SelectedTradeItem, MM2ValueSource } from "../../components/mm2/MM2TradeTypes";

export type { MM2ValueSource };

export const MM2_VALUE_SOURCE_LABELS: Record<MM2ValueSource, string> = {
  SUPREME: "Supreme Value",
  GCASH: "GCash Value",
};

export const MM2_VALUE_SOURCE_SHORT_LABELS: Record<MM2ValueSource, string> = {
  SUPREME: "Supreme",
  GCASH: "GCash",
};

/** The field each source reads. Kept as data so it cannot be mistyped inline. */
const SOURCE_FIELD: Record<MM2ValueSource, "SOURCE_VALUE" | "GCASH_VALUE"> = {
  SUPREME: "SOURCE_VALUE",
  GCASH: "GCASH_VALUE",
};

/**
 * The value of one weapon in the selected source, or `null` when the catalog
 * has no value for it.
 *
 * Returning `null` rather than `0` is the whole point: the caller is forced to
 * decide what an unpriced weapon means, and every caller in CSBT answers
 * "withhold the verdict".
 */
export function mm2ItemValue(item: MM2Item, source: MM2ValueSource): number | null {
  const value = item[SOURCE_FIELD[source]];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeQuantity(quantity: number): number {
  const rounded = Math.floor(Number(quantity) || 1);
  return Math.max(1, Math.min(99, rounded));
}

/** Total for one side of a trade in the selected source. Missing values add 0. */
export function mm2TotalFor(items: MM2SelectedTradeItem[], source: MM2ValueSource): number {
  return items.reduce(
    (total, entry) => total + (mm2ItemValue(entry.item, source) ?? 0) * safeQuantity(entry.quantity),
    0,
  );
}

/** How many *units* on one side have no value in the selected source. */
export function mm2MissingFor(items: MM2SelectedTradeItem[], source: MM2ValueSource): number {
  return items.reduce(
    (count, entry) =>
      count + (mm2ItemValue(entry.item, source) === null ? safeQuantity(entry.quantity) : 0),
    0,
  );
}

export type MM2TradeEvaluation = TradeVerdictResult & {
  valueSource: MM2ValueSource;
  yourTotal: number;
  theirTotal: number;
  yourMissing: number;
  theirMissing: number;
  /** Weapons on either side with no value in the selected source. */
  missingItems: MM2Item[];
};

/**
 * Evaluate a complete MM2 trade.
 *
 * This is the single function both the MM2 calculator UI and MM2 NICH call, so
 * the same weapons on the same sides in the same source cannot produce two
 * different verdicts.
 */
export function evaluateMM2Trade(args: {
  yourItems: MM2SelectedTradeItem[];
  theirItems: MM2SelectedTradeItem[];
  valueSource: MM2ValueSource;
}): MM2TradeEvaluation {
  const { yourItems, theirItems, valueSource } = args;

  const yourTotal = mm2TotalFor(yourItems, valueSource);
  const theirTotal = mm2TotalFor(theirItems, valueSource);
  const yourMissing = mm2MissingFor(yourItems, valueSource);
  const theirMissing = mm2MissingFor(theirItems, valueSource);

  const missingItems = [...yourItems, ...theirItems]
    .filter((entry) => mm2ItemValue(entry.item, valueSource) === null)
    .map((entry) => entry.item);

  const verdict = getTradeVerdict(yourTotal, theirTotal, {
    missingCount: yourMissing + theirMissing,
  });

  return {
    ...verdict,
    valueSource,
    yourTotal,
    theirTotal,
    yourMissing,
    theirMissing,
    missingItems,
  };
}

/** Catalog-consistent number formatting, shared by the calculator and NICH. */
export function formatMM2Value(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}
