/**
 * Trade reasoning for MM2.
 *
 * Two things are separated here on purpose:
 *
 *   1. `buildMM2TradeFacts` — arithmetic and signals. Pure data, no prose. The
 *      verdict itself still comes from `evaluateMM2Trade`, which is the same
 *      function the MM2 calculator calls, so NICH and the calculator can never
 *      disagree about W/F/L.
 *   2. `narrateMM2Trade` — turns those facts into something a person would say.
 *
 * The narration is allowed to be more nuanced than the verdict, and that is the
 * upgrade: a trade can be +20 value and still worth pausing over if the user is
 * handing away one wanted weapon for three unwanted ones. What it is *not*
 * allowed to do is introduce a fact. Every signal it can mention comes from the
 * catalog: value in the selected source, the demand score, how many weapons are
 * on each side, and which of them are unrated or unpriced. There is no market
 * feed behind MM2, so nothing here claims to know how fast anything sells.
 */

import type { MM2ValueSource } from "../../../components/mm2/MM2TradeTypes";
import type { MM2CatalogItem } from "../../mm2/catalog";
import { evaluateMM2Trade, formatMM2Value, MM2_VALUE_SOURCE_LABELS, type MM2TradeEvaluation } from "../../mm2/tradeMath";
import { getTradeVerdict } from "../../trade/verdict";
import { assertGameContext } from "../game/guard";
import type { NichGameId } from "../game/types";
import { mm2DemandOf } from "./engine";
import { getMM2ItemValue } from "./tools";

const GAME: NichGameId = "mm2";

export type MM2TradeEntry = { item: MM2CatalogItem; quantity: number };

export type MM2TradeSideFacts = {
  entries: MM2TradeEntry[];
  /** Extra raw value the user said would be added on this side. */
  adds: number;
  /** Sum of priced weapons plus adds. */
  total: number;
  /** Weapons with no value in the selected source. */
  unpriced: MM2CatalogItem[];
  /** Mean demand across the weapons that carry a rating, or null when none do. */
  averageDemand: number | null;
  /** Weapons with no demand rating at all. */
  unrated: MM2CatalogItem[];
  /** Total units, counting quantities. */
  unitCount: number;
};

/**
 * A finer reading than WIN/FAIR/LOSE, used only in prose.
 *
 * The authoritative verdict stays exactly what the calculator says. This tier
 * describes *how far* it is from fair, which is what a trader actually asks
 * next.
 */
export type MM2TradeTier =
  | "big win"
  | "win"
  | "slight win"
  | "fair"
  | "slight lose"
  | "lose"
  | "big lose"
  | "unpriced";

export type MM2TradeFacts = {
  source: MM2ValueSource;
  yours: MM2TradeSideFacts;
  theirs: MM2TradeSideFacts;
  evaluation: MM2TradeEvaluation;
  /** Signed: positive means the user gains value. */
  gap: number;
  gapPercent: number;
  tier: MM2TradeTier;
  /** Demand of what they receive minus demand of what they give, when both are rated. */
  demandSwing: number | null;
  /** True when one weapon is being turned into several. */
  splittingUp: boolean;
  /** True when several weapons are being consolidated into one. */
  consolidating: boolean;
  /** Weapons on either side with no demand rating; named, never assumed. */
  unratedNames: string[];
};

function sideFacts(entries: MM2TradeEntry[], adds: number, source: MM2ValueSource): MM2TradeSideFacts {
  const unpriced = entries.filter((entry) => getMM2ItemValue(entry.item, source) === null).map((entry) => entry.item);

  const total =
    entries.reduce((sum, entry) => sum + (getMM2ItemValue(entry.item, source) ?? 0) * entry.quantity, 0) + adds;

  const rated = entries.filter((entry) => mm2DemandOf(entry.item) !== null);
  const averageDemand = rated.length
    ? rated.reduce((sum, entry) => sum + (mm2DemandOf(entry.item) ?? 0), 0) / rated.length
    : null;

  return {
    entries,
    adds,
    total,
    unpriced,
    averageDemand,
    unrated: entries.filter((entry) => mm2DemandOf(entry.item) === null).map((entry) => entry.item),
    unitCount: entries.reduce((count, entry) => count + entry.quantity, 0),
  };
}

function tierFor(evaluation: MM2TradeEvaluation, gainForUser: boolean): MM2TradeTier {
  if (evaluation.verdict === "CHECK" || evaluation.verdict === "READY") return "unpriced";

  const percent = evaluation.differencePercent;
  if (percent <= 5) return "fair";
  if (percent <= 12) return gainForUser ? "slight win" : "slight lose";
  if (percent <= 30) return gainForUser ? "win" : "lose";
  return gainForUser ? "big win" : "big lose";
}

/**
 * Compute everything knowable about a trade.
 *
 * Adds are counted as raw value in the selected source, because that is what a
 * trader means by "+200" — and the total says so explicitly rather than folding
 * it invisibly into a weapon's price.
 */
export function buildMM2TradeFacts(args: {
  yours: MM2TradeEntry[];
  theirs: MM2TradeEntry[];
  yourAdds?: number | null;
  theirAdds?: number | null;
  source: MM2ValueSource;
  gameId?: NichGameId;
}): MM2TradeFacts {
  assertGameContext(GAME, args.gameId ?? GAME, "buildMM2TradeFacts");

  const yourAdds = Math.max(0, args.yourAdds ?? 0);
  const theirAdds = Math.max(0, args.theirAdds ?? 0);

  const yours = sideFacts(args.yours, yourAdds, args.source);
  const theirs = sideFacts(args.theirs, theirAdds, args.source);

  /**
   * The verdict comes from the shared engine, with adds represented as a
   * pseudo-total. `evaluateMM2Trade` prices the weapons; the adds are added on
   * top by re-running the shared verdict rule over the two finished totals, so
   * the FAIR threshold is still the one and only threshold in the codebase.
   */
  const base = evaluateMM2Trade({
    yourItems: args.yours.map((entry, index) => ({ id: `${entry.item.ID}-${index}`, item: entry.item, quantity: entry.quantity })),
    theirItems: args.theirs.map((entry, index) => ({ id: `${entry.item.ID}-${index}`, item: entry.item, quantity: entry.quantity })),
    valueSource: args.source,
  });

  const evaluation: MM2TradeEvaluation =
    yourAdds || theirAdds
      ? {
          ...base,
          ...recomputeWithAdds(base, yours.total, theirs.total),
          yourTotal: yours.total,
          theirTotal: theirs.total,
        }
      : base;

  const gap = evaluation.verdict === "CHECK" ? 0 : theirs.total - yours.total;
  const gapPercent = evaluation.verdict === "CHECK" ? 0 : evaluation.differencePercent;

  const demandSwing =
    yours.averageDemand !== null && theirs.averageDemand !== null
      ? Number((theirs.averageDemand - yours.averageDemand).toFixed(2))
      : null;

  return {
    source: args.source,
    yours,
    theirs,
    evaluation,
    gap,
    gapPercent,
    tier: tierFor(evaluation, gap >= 0),
    demandSwing,
    splittingUp: yours.unitCount === 1 && theirs.unitCount >= 3,
    consolidating: yours.unitCount >= 3 && theirs.unitCount === 1,
    unratedNames: [...yours.unrated, ...theirs.unrated].map((item) => item.NAME),
  };
}

/**
 * Re-run the verdict over totals that include adds.
 *
 * Calls `getTradeVerdict` rather than re-deriving the rule, so the FAIR
 * threshold still exists in exactly one place in CSBT. `missingCount` is
 * carried through untouched: a trade containing an unpriced weapon stays CHECK
 * no matter what is added on top of it.
 */
function recomputeWithAdds(base: MM2TradeEvaluation, yourTotal: number, theirTotal: number) {
  return getTradeVerdict(yourTotal, theirTotal, { missingCount: base.missingCount });
}

// ---------------------------------------------------------------------------
// Narration
// ---------------------------------------------------------------------------

function sideLine(side: MM2TradeSideFacts, source: MM2ValueSource): string {
  const rows = side.entries.map((entry) => {
    const unit = getMM2ItemValue(entry.item, source);
    const quantity = entry.quantity > 1 ? ` ×${entry.quantity}` : "";
    if (unit === null) return `• ${entry.item.NAME}${quantity} — no ${MM2_VALUE_SOURCE_LABELS[source]}`;
    const line = entry.quantity > 1 ? `${formatMM2Value(unit)} × ${entry.quantity} = ${formatMM2Value(unit * entry.quantity)}` : formatMM2Value(unit);
    return `• ${entry.item.NAME}${quantity} — ${line}`;
  });

  if (side.adds > 0) rows.push(`• adds — ${formatMM2Value(side.adds)} (as you quoted it)`);
  return rows.length ? rows.join("\n") : "_(nothing)_";
}

const TIER_HEADLINE: Record<MM2TradeTier, string> = {
  "big win": "Big win for you",
  win: "Win for you",
  "slight win": "Slight win for you",
  fair: "Fair",
  "slight lose": "Slight lose for you",
  lose: "Lose for you",
  "big lose": "Big lose for you",
  unpriced: "CHECK — I can't price this trade",
};

/**
 * The practical read.
 *
 * Value first, because that is the question. Then the things that make a
 * technically-even trade a bad idea — or a technically-down trade a fine one —
 * each stated with the data behind it so the user can disagree with the
 * reasoning rather than just the conclusion.
 */
function advisoryLines(facts: MM2TradeFacts): string[] {
  const lines: string[] = [];

  if (facts.demandSwing !== null && Math.abs(facts.demandSwing) >= 1) {
    const direction = facts.demandSwing > 0 ? "higher" : "lower";
    lines.push(
      `Demand-wise you'd be moving to ${direction} demand — their side averages ${facts.theirs.averageDemand?.toFixed(1)}/10 against your ${facts.yours.averageDemand?.toFixed(1)}/10.`,
    );
  } else if (facts.demandSwing !== null) {
    lines.push(`Demand is roughly level on both sides (${facts.yours.averageDemand?.toFixed(1)}/10 vs ${facts.theirs.averageDemand?.toFixed(1)}/10).`);
  }

  if (facts.unratedNames.length) {
    lines.push(
      `${facts.unratedNames.join(", ")} ${facts.unratedNames.length === 1 ? "has" : "have"} no demand rating in the catalog, so I'm not factoring ${facts.unratedNames.length === 1 ? "it" : "them"} into that.`,
    );
  }

  if (facts.splittingUp) {
    lines.push(
      "You'd be turning one weapon into several smaller ones, which is generally harder to trade back out of than a single clean piece.",
    );
  }

  if (facts.consolidating) {
    lines.push("You'd be consolidating several weapons into one, which is usually easier to move later.");
  }

  return lines;
}

function recommendation(facts: MM2TradeFacts): string {
  if (facts.tier === "unpriced") return "";

  const demandWarning = facts.demandSwing !== null && facts.demandSwing <= -1.5;
  const structuralWarning = facts.splittingUp;

  switch (facts.tier) {
    case "big win":
    case "win":
      return demandWarning
        ? "I'd take it on value, just know you're stepping down in demand."
        : "I'd take it.";
    case "slight win":
      return demandWarning || structuralWarning
        ? "Value is slightly your way, but it's close enough that the demand drop matters more than the number. Your call."
        : "Slightly your way — I'd take it.";
    case "fair":
      return demandWarning || structuralWarning
        ? "It's even on value, so I'd only do it if you actually want what they're offering."
        : "Even trade. Take it if you prefer their side.";
    case "slight lose":
      return "You're a little down. Worth asking for a small add before you accept.";
    case "lose":
    case "big lose":
      return "I'd pass, or ask them to add.";
    default:
      return "";
  }
}

/**
 * Restate a trade the user is already looking at.
 *
 * When nothing about the trade changed — "would you?", "would people take
 * this?" — repeating the full breakdown is noise. The verdict, the gap and the
 * recommendation are what the question actually asked for.
 */
export function summariseMM2Trade(facts: MM2TradeFacts): string {
  if (facts.tier === "unpriced") return narrateMM2Trade(facts);

  const lines = [
    `**${TIER_HEADLINE[facts.tier]}** — ${formatMM2Value(facts.yours.total)} against ${formatMM2Value(facts.theirs.total)} (${facts.gapPercent.toFixed(1)}% ${facts.gap >= 0 ? "your way" : "against you"}), ${MM2_VALUE_SOURCE_LABELS[facts.source]}.`,
  ];

  const advisory = advisoryLines(facts);
  if (advisory.length) lines.push(advisory[0]);

  const verdict = recommendation(facts);
  if (verdict) lines.push(verdict);

  return lines.join("\n\n");
}

export function narrateMM2Trade(facts: MM2TradeFacts): string {
  const label = MM2_VALUE_SOURCE_LABELS[facts.source];
  const lines = [
    `**${TIER_HEADLINE[facts.tier]}** · ${label}`,
    "",
    "**Your side**",
    sideLine(facts.yours, facts.source),
    "",
    "**Their side**",
    sideLine(facts.theirs, facts.source),
  ];

  if (facts.tier === "unpriced") {
    const missing = [...facts.yours.unpriced, ...facts.theirs.unpriced].map((item) => item.NAME);
    lines.push(
      "",
      `${missing.join(", ")} ${missing.length === 1 ? "has" : "have"} no ${label} in the MM2 catalog, so I'm withholding the verdict. CSBT does not estimate a missing value or count it as zero.`,
      `Try ${facts.source === "SUPREME" ? "GCash" : "Supreme"} if that source prices ${missing.length === 1 ? "it" : "them"}.`,
    );
    return lines.join("\n");
  }

  lines.push(
    "",
    `Your total: **${formatMM2Value(facts.yours.total)}**`,
    `Their total: **${formatMM2Value(facts.theirs.total)}**`,
    `Difference: **${formatMM2Value(Math.abs(facts.gap))}** (${facts.gapPercent.toFixed(1)}%) ${facts.gap >= 0 ? "in your favour" : "against you"}`,
  );

  const advisory = advisoryLines(facts);
  if (advisory.length) lines.push("", ...advisory);

  const verdict = recommendation(facts);
  if (verdict) lines.push("", verdict);

  return lines.join("\n");
}

/**
 * How much the lighter side would need to add to reach fair.
 *
 * "Fair" is the shared 5% threshold, so the number quoted here is the smallest
 * add that would actually flip the verdict the calculator returns — not a
 * rounder, friendlier figure.
 */
export function mm2AddNeededForFair(facts: MM2TradeFacts): { side: "yours" | "theirs"; amount: number } | null {
  if (facts.tier === "unpriced") return null;
  if (facts.evaluation.verdict === "FAIR") return null;

  const behind = facts.yours.total < facts.theirs.total ? "yours" : "theirs";
  const higher = Math.max(facts.yours.total, facts.theirs.total);
  const lower = Math.min(facts.yours.total, facts.theirs.total);

  // Adding `x` to the lower side leaves a gap of (higher - lower - x) against a
  // baseline that stays `higher`; fair needs that ratio at or under 5%.
  const amount = Math.max(0, higher - lower - higher * 0.05);
  return amount > 0 ? { side: behind, amount: Math.ceil(amount) } : null;
}
