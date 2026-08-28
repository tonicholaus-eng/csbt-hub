/**
 * MM2 trade parsing and evaluation for NICH.
 *
 * The verdict itself is *not* computed here. Parsing produces the same
 * `MM2SelectedTradeItem[]` shape the MM2 calculator holds in state, and the
 * result comes from `evaluateMM2Trade` in `lib/mm2/tradeMath.ts` — the module
 * the calculator UI also calls. That is the whole point: "harvester for
 * icebreaker" typed at NICH and the same two weapons clicked into the
 * calculator run identical arithmetic through an identical verdict function,
 * so they cannot disagree.
 *
 * The AI is never asked to judge a trade. It may be asked to *explain* one.
 */

import type { MM2SelectedTradeItem, MM2ValueSource } from "../../../components/mm2/MM2TradeTypes";
import type { MM2CatalogItem } from "../../mm2/catalog";
import { evaluateMM2Trade, formatMM2Value, mm2ItemValue, MM2_VALUE_SOURCE_LABELS, type MM2TradeEvaluation } from "../../mm2/tradeMath";
import { assertGameContext } from "../game/guard";
import type { NichGameId } from "../game/types";
import { mm2CategoryOf, mm2ProfilePath } from "./engine";
import { mm2Normalize, resolveMM2Item, type MM2ResolveOptions } from "./resolver";

const GAME: NichGameId = "mm2";

export type MM2TradeParseIssue =
  | { kind: "unresolved"; phrase: string }
  | { kind: "ambiguous"; phrase: string; candidates: MM2CatalogItem[] };

/**
 * A selected row whose item is a full catalog row, so `.item.ID` is always
 * present. `MM2Item` makes ID optional for the calculator's looser inputs;
 * everything the resolver produces is canonical.
 */
export type MM2SelectedCatalogItem = Omit<MM2SelectedTradeItem, "item"> & { item: MM2CatalogItem };

export type MM2TradeParse = {
  yourItems: MM2SelectedCatalogItem[];
  theirItems: MM2SelectedCatalogItem[];
  issues: MM2TradeParseIssue[];
  /** True when both sides ended up with at least one resolved weapon. */
  complete: boolean;
};

/** Words that mark the start of the other person's side. */
const SIDE_SPLIT = /\s+(?:for|to get|in exchange for|=>|->|→|\bvs\b|\bversus\b)\s+/;

const YOUR_SIDE_PREFIX = /^(?:my|mine|i give|i am giving|im giving|i'm giving|i offer|i'm offering|im offering|giving|offering|akin|akin ko|bigay ko|side ko|ako)\s+/;
const THEIR_SIDE_PREFIX = /^(?:their|theirs|them|they give|they offer|his|her|kanya|kanila|side nila|side nya|side niya|bigay nya|bigay niya)\s+/;

const LEAD_NOISE = /^(?:wfl|w\/f\/l|win fair lose|is this a? ?(?:win|good|fair|bad)|should i (?:take|accept|do)(?: this| it)?|worth it|check|trade|swap)\b[\s:,-]*/;

/**
 * Hypothetical framing at the head of a side: "what if I trade …", "if I give …".
 * Stripped after the side prefix so what remains is weapons (or a pronoun).
 */
const SIDE_LEAD = /^(?:what if (?:i|we) (?:trade|give|offer|swap)|if (?:i|we) (?:trade|give|offer|swap)|(?:i|we) (?:trade|give|offer|swap)|trade|swap|give|offer)\s+/;

/** Pronouns that stand for several remembered weapons. */
const GROUP_PRONOUNS = new Set(["both", "them", "those", "these", "the two", "the pair", "all of them", "all"]);

/** Pronouns that stand for the single most recent weapon. */
const SINGLE_PRONOUNS = new Set(["it", "that", "this", "the same", "same", "mine", "that one", "this one"]);

/** Split "2x harvester" / "2 harvester" / "harvester x2" into count + name. */
function splitQuantity(phrase: string): { quantity: number; name: string } {
  const leading = /^(\d{1,2})\s*x?\s+(.*)$/i.exec(phrase);
  if (leading) {
    const quantity = Number(leading[1]);
    if (Number.isFinite(quantity) && quantity >= 1 && quantity <= 99) {
      return { quantity, name: leading[2].trim() };
    }
  }
  const trailing = /^(.*?)\s*x\s*(\d{1,2})$/i.exec(phrase);
  if (trailing) {
    const quantity = Number(trailing[2]);
    if (Number.isFinite(quantity) && quantity >= 1 && quantity <= 99) {
      return { quantity, name: trailing[1].trim() };
    }
  }
  return { quantity: 1, name: phrase.trim() };
}

function splitSideIntoPhrases(side: string): string[] {
  return side
    .split(/\s*(?:,|\+|\band\b|\bplus\b|\bat\b)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function toSelected(item: MM2CatalogItem, quantity: number, index: number): MM2SelectedCatalogItem {
  return { id: `${item.ID}-${index}`, item, quantity };
}

/**
 * Parse a natural-language MM2 trade into calculator-shaped sides.
 *
 * Unrecognised phrases are reported, never dropped and never treated as
 * worthless: a trade NICH could not fully read must not produce a verdict.
 */
export function parseMM2Trade(
  message: string,
  options: Pick<MM2ResolveOptions, "gameId" | "contextItemIds" | "userAliases"> & {
    /**
     * Weapon names the conversation is already about, newest first, so a side
     * written as "both" or "it" can be expanded. Supplied by the brain from
     * MM2 context — these are MM2 names by construction.
     */
    contextItemNames?: { recent: string[]; comparison: string[] };
  },
): MM2TradeParse {
  assertGameContext(GAME, options.gameId, "parseMM2Trade");

  const normalized = mm2Normalize(message).replace(LEAD_NOISE, "").trim();
  const [rawYour, ...rest] = normalized.split(SIDE_SPLIT);
  const rawTheir = rest.join(" for ");

  const issues: MM2TradeParseIssue[] = [];
  let counter = 0;

  /** Expand a pronoun to the weapon names it stands for, or null if it isn't one. */
  const expandPronoun = (phrase: string): string[] | null => {
    const names = options.contextItemNames;
    if (!names) return null;
    if (GROUP_PRONOUNS.has(phrase)) {
      const group = names.comparison.length >= 2 ? names.comparison : names.recent.slice(0, 2);
      return group.length ? group : null;
    }
    if (SINGLE_PRONOUNS.has(phrase)) {
      return names.recent[0] ? [names.recent[0]] : null;
    }
    return null;
  };

  const readSide = (side: string, prefix: RegExp): MM2SelectedCatalogItem[] => {
    const cleaned = side.replace(prefix, "").replace(SIDE_LEAD, "").trim();
    if (!cleaned) return [];

    const selected: MM2SelectedCatalogItem[] = [];
    for (const rawPhrase of splitSideIntoPhrases(cleaned)) {
      const { quantity, name } = splitQuantity(rawPhrase.replace(prefix, "").replace(SIDE_LEAD, "").trim());
      if (!name) continue;

      // "trade both for batwing" — resolve the pronoun against what the
      // conversation is already about before treating it as a weapon name.
      const expanded = expandPronoun(name);
      if (expanded) {
        for (const expandedName of expanded) {
          const hit = resolveMM2Item(expandedName, { gameId: options.gameId, userAliases: options.userAliases });
          if (hit.status === "resolved") {
            counter += 1;
            selected.push(toSelected(hit.item, quantity, counter));
          }
        }
        continue;
      }

      const resolution = resolveMM2Item(name, {
        gameId: options.gameId,
        contextItemIds: options.contextItemIds,
        userAliases: options.userAliases,
      });

      if (resolution.status === "resolved") {
        counter += 1;
        selected.push(toSelected(resolution.item, quantity, counter));
      } else if (resolution.status === "ambiguous") {
        issues.push({ kind: "ambiguous", phrase: name, candidates: resolution.candidates });
      } else {
        issues.push({ kind: "unresolved", phrase: name });
      }
    }
    return selected;
  };

  const yourItems = readSide(rawYour ?? "", YOUR_SIDE_PREFIX);
  const theirItems = readSide(rawTheir ?? "", THEIR_SIDE_PREFIX);

  return {
    yourItems,
    theirItems,
    issues,
    complete: yourItems.length > 0 && theirItems.length > 0,
  };
}

// ---------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------

function sideBreakdown(items: MM2SelectedCatalogItem[], source: MM2ValueSource): string {
  if (!items.length) return "_(empty)_";
  return items
    .map((entry) => {
      const unit = mm2ItemValue(entry.item, source);
      const quantitySuffix = entry.quantity > 1 ? ` x${entry.quantity}` : "";
      if (unit === null) return `• ${entry.item.NAME}${quantitySuffix} — no ${MM2_VALUE_SOURCE_LABELS[source]}`;
      const line = entry.quantity > 1 ? `${formatMM2Value(unit)} × ${entry.quantity} = ${formatMM2Value(unit * entry.quantity)}` : formatMM2Value(unit);
      return `• ${entry.item.NAME}${quantitySuffix} — ${line}`;
    })
    .join("\n");
}

const VERDICT_HEADLINE: Record<MM2TradeEvaluation["verdict"], string> = {
  READY: "Nothing to weigh yet",
  CHECK: "CHECK — I can't price this trade",
  WIN: "WIN for you",
  FAIR: "FAIR",
  LOSE: "LOSE for you",
};

/**
 * Render a completed evaluation.
 *
 * CHECK deliberately shows no totals and no gap. A trade containing an unpriced
 * weapon has no honest total, and printing one invites the user to read it as
 * the answer.
 */
export function formatMM2TradeResult(
  parse: MM2TradeParse,
  evaluation: MM2TradeEvaluation,
): string {
  const source = evaluation.valueSource;
  const label = MM2_VALUE_SOURCE_LABELS[source];

  const lines = [
    `**${VERDICT_HEADLINE[evaluation.verdict]}** · ${label}`,
    "",
    "**Your side**",
    sideBreakdown(parse.yourItems, source),
    "",
    "**Their side**",
    sideBreakdown(parse.theirItems, source),
  ];

  if (evaluation.verdict === "CHECK") {
    const names = evaluation.missingItems.map((item) => item.NAME).join(", ");
    lines.push(
      "",
      `${names} ${evaluation.missingItems.length === 1 ? "has" : "have"} no ${label} in the MM2 catalog, so I'm withholding the verdict. CSBT does not estimate a missing value or count it as zero.`,
      `Try switching to ${source === "SUPREME" ? "GCash" : "Supreme"} if that source prices ${evaluation.missingItems.length === 1 ? "it" : "them"}.`,
    );
    return lines.join("\n");
  }

  lines.push(
    "",
    `Your total: **${formatMM2Value(evaluation.yourTotal)}**`,
    `Their total: **${formatMM2Value(evaluation.theirTotal)}**`,
    `Difference: **${formatMM2Value(evaluation.difference)}** (${evaluation.differencePercent.toFixed(1)}%)`,
  );

  if (parse.issues.length) {
    lines.push("", `Not counted: ${parse.issues.map((issue) => issue.phrase).join(", ")}.`);
  }

  return lines.join("\n");
}

/** Evaluate a parsed trade. Thin wrapper so callers never re-implement the call. */
export function evaluateParsedMM2Trade(
  parse: MM2TradeParse,
  args: { valueSource: MM2ValueSource; gameId: NichGameId },
): MM2TradeEvaluation {
  assertGameContext(GAME, args.gameId, "evaluateParsedMM2Trade");
  return evaluateMM2Trade({
    yourItems: parse.yourItems,
    theirItems: parse.theirItems,
    valueSource: args.valueSource,
  });
}

/** Deep-link the parsed trade into the real MM2 calculator. */
export function mm2CalculatorHref(parse: MM2TradeParse, source: MM2ValueSource): string {
  const rows = (items: MM2SelectedCatalogItem[]) =>
    JSON.stringify(items.map((entry) => ({ key: entry.item.ID, quantity: entry.quantity })));

  const params = new URLSearchParams();
  params.set("source", source);
  if (parse.yourItems.length) params.set("your", rows(parse.yourItems));
  if (parse.theirItems.length) params.set("their", rows(parse.theirItems));
  return `/mm2/calculator?${params.toString()}`;
}

export { mm2ProfilePath, mm2CategoryOf };
