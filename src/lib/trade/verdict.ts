/**
 * The single source of truth for CSBT's Win / Fair / Lose verdict.
 *
 * Before this module the same rule was hard-coded in four places
 * (TradeCalculator's mobile bar, TradeSummary, MM2TradeSummary and
 * MM2TradeBalanceFinder). They happened to agree, but nothing enforced it, and
 * `CLAUDE.md` treats calculator semantics as correctness-critical.
 *
 * The thresholds below are unchanged from the previous implementations.
 */

export type TradeVerdict = "READY" | "CHECK" | "WIN" | "FAIR" | "LOSE";

export type TradeVerdictResult = {
  verdict: TradeVerdict;
  /** Absolute value gap between the two sides. 0 when the verdict is READY or CHECK. */
  difference: number;
  /** Gap as a percentage of the larger side. 0 when the verdict is READY or CHECK. */
  differencePercent: number;
  /** How many selected units could not be priced in the active value source. */
  missingCount: number;
};

/**
 * A trade is FAIR when the two sides are within this percentage of each other.
 * Shared by both games so they can never drift apart.
 */
export const FAIR_THRESHOLD_PERCENT = 5;

function safeTotal(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

/**
 * Decide the verdict for a trade.
 *
 * `missingCount` is the number of selected units that have no value in the
 * active value source. When it is above zero the verdict is **CHECK** and the
 * W/F/L call is withheld: CSBT does not estimate a missing value, and it does
 * not treat one as zero, because either would produce a confident verdict on a
 * trade it cannot actually price.
 */
export function getTradeVerdict(
  yourTotal: number,
  theirTotal: number,
  options: { missingCount?: number } = {},
): TradeVerdictResult {
  const missingCount = Math.max(0, Math.floor(options.missingCount ?? 0));
  const yours = safeTotal(yourTotal);
  const theirs = safeTotal(theirTotal);

  if (yours === 0 && theirs === 0 && missingCount === 0) {
    return { verdict: "READY", difference: 0, differencePercent: 0, missingCount: 0 };
  }

  if (missingCount > 0) {
    return { verdict: "CHECK", difference: 0, differencePercent: 0, missingCount };
  }

  const difference = Math.abs(theirs - yours);
  const baseline = Math.max(yours, theirs, 1);
  const differencePercent = (difference / baseline) * 100;

  if (differencePercent <= FAIR_THRESHOLD_PERCENT) {
    return { verdict: "FAIR", difference, differencePercent, missingCount: 0 };
  }

  return {
    verdict: theirs > yours ? "WIN" : "LOSE",
    difference,
    differencePercent,
    missingCount: 0,
  };
}
