/**
 * MM2 deterministic answering.
 *
 * Every function here reads the generated MM2 catalog and returns a finished
 * answer. No model is consulted: a value that is already a number in
 * `mm2Items.json` must never cost an AI call, and — more importantly — must
 * never be *restated* by a model that could round it, convert it, or invent one
 * for a weapon that has none.
 *
 * Missing stays missing. 189 weapons have no Supreme value and 160 have no
 * GCash value; those answer "not priced", never 0 and never an estimate.
 */

import { mm2Catalog, type MM2CatalogItem } from "../../mm2/catalog";
import { formatMM2Value, mm2ItemValue, MM2_VALUE_SOURCE_LABELS } from "../../mm2/tradeMath";
import type { MM2ValueSource } from "../../../components/mm2/MM2TradeTypes";
import { assertGameContext } from "../game/guard";
import type { NichGameId } from "../game/types";
import { MM2_CATEGORY_PHRASES, type MM2Category } from "./aliases";

const GAME: NichGameId = "mm2";

/** Profile link for a weapon. Always ID-keyed. */
export function mm2ProfilePath(item: MM2CatalogItem): string {
  return `/mm2/values/${encodeURIComponent(item.ID)}`;
}

export function mm2CategoryOf(item: MM2CatalogItem): string {
  return String(item.CATEGORY ?? "MM2").toUpperCase();
}

export function mm2DemandOf(item: MM2CatalogItem): number | null {
  return typeof item.DEMAND === "number" && Number.isFinite(item.DEMAND) ? item.DEMAND : null;
}

/** "1,000,000 Supreme" / "not priced in Supreme Value". */
export function describeValue(item: MM2CatalogItem, source: MM2ValueSource): string {
  const value = mm2ItemValue(item, source);
  if (value === null) return `no ${MM2_VALUE_SOURCE_LABELS[source]} on record`;
  return `${formatMM2Value(value)} ${MM2_VALUE_SOURCE_LABELS[source]}`;
}

function demandPhrase(item: MM2CatalogItem): string {
  const demand = mm2DemandOf(item);
  if (demand === null) return "Demand: unrated";
  const tier = demand >= 8 ? "very high" : demand >= 6 ? "high" : demand >= 3 ? "moderate" : "low";
  return `Demand: ${demand}/10 (${tier})`;
}

// ---------------------------------------------------------------------------
// Single-item answers
// ---------------------------------------------------------------------------

export type MM2ItemAnswer = {
  text: string;
  item: MM2CatalogItem;
};

/** Full profile line: both sources, demand, category. */
export function answerItemLookup(item: MM2CatalogItem, gameId: NichGameId): MM2ItemAnswer {
  assertGameContext(GAME, gameId, "answerItemLookup");

  const supreme = mm2ItemValue(item, "SUPREME");
  const gcash = mm2ItemValue(item, "GCASH");

  const lines = [
    `**${item.NAME}** — ${mm2CategoryOf(item)}`,
    `Supreme Value: ${supreme === null ? "N/A" : formatMM2Value(supreme)}`,
    `GCash Value: ${gcash === null ? "N/A" : formatMM2Value(gcash)}`,
    demandPhrase(item),
  ];

  if (supreme === null && gcash === null) {
    lines.push("This weapon has no value on record in either source — CSBT does not estimate one.");
  }

  return { text: lines.join("\n"), item };
}

/** One source only, e.g. "harvester value" or "gcash value of harvester". */
export function answerItemValue(
  item: MM2CatalogItem,
  source: MM2ValueSource,
  gameId: NichGameId,
): MM2ItemAnswer {
  assertGameContext(GAME, gameId, "answerItemValue");

  const value = mm2ItemValue(item, source);
  if (value === null) {
    const other: MM2ValueSource = source === "SUPREME" ? "GCASH" : "SUPREME";
    const otherValue = mm2ItemValue(item, other);
    const tail =
      otherValue === null
        ? "It has no value in the other source either."
        : `It does have ${formatMM2Value(otherValue)} in ${MM2_VALUE_SOURCE_LABELS[other]}.`;
    return {
      item,
      text: `**${item.NAME}** (${mm2CategoryOf(item)}) has no ${MM2_VALUE_SOURCE_LABELS[source]} on record. ${tail}`,
    };
  }

  return {
    item,
    text: `**${item.NAME}** (${mm2CategoryOf(item)}) is **${formatMM2Value(value)}** in ${MM2_VALUE_SOURCE_LABELS[source]}. ${demandPhrase(item)}.`,
  };
}

export function answerItemDemand(item: MM2CatalogItem, gameId: NichGameId): MM2ItemAnswer {
  assertGameContext(GAME, gameId, "answerItemDemand");

  const demand = mm2DemandOf(item);
  if (demand === null) {
    return {
      item,
      text: `**${item.NAME}** (${mm2CategoryOf(item)}) is unrated for demand in the MM2 catalog. CSBT does not guess a demand score.`,
    };
  }
  return {
    item,
    text: `**${item.NAME}** (${mm2CategoryOf(item)}) — ${demandPhrase(item)}. Supreme Value ${describeValue(item, "SUPREME").replace(" Supreme Value", "")}.`,
  };
}

/** Both sources side by side for one weapon. */
export function answerSourceCompare(item: MM2CatalogItem, gameId: NichGameId): MM2ItemAnswer {
  assertGameContext(GAME, gameId, "answerSourceCompare");

  const supreme = mm2ItemValue(item, "SUPREME");
  const gcash = mm2ItemValue(item, "GCASH");

  if (supreme === null || gcash === null) {
    return {
      item,
      text:
        `**${item.NAME}** cannot be compared across both sources: ` +
        `Supreme ${supreme === null ? "N/A" : formatMM2Value(supreme)}, ` +
        `GCash ${gcash === null ? "N/A" : formatMM2Value(gcash)}. ` +
        `A missing source stays missing — CSBT will not convert one into the other.`,
    };
  }

  const delta = gcash - supreme;
  const direction = delta === 0 ? "identical in both sources" : delta > 0 ? "higher in GCash" : "higher in Supreme";
  return {
    item,
    text:
      `**${item.NAME}** — Supreme ${formatMM2Value(supreme)} vs GCash ${formatMM2Value(gcash)} ` +
      `(${direction}${delta === 0 ? "" : `, ${formatMM2Value(Math.abs(delta))} apart`}).`,
  };
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

export type MM2CompareMetric = "value" | "demand";

/**
 * The facts behind a comparison.
 *
 * Text and card both come from this one computation. Previously the ranking
 * lived inside the string builder, which meant a card would have had to
 * re-derive the winner — two implementations of "which is worth more" is one
 * too many for a number the user will act on.
 */
export type MM2ComparisonFacts = {
  items: MM2CatalogItem[];
  metric: MM2CompareMetric;
  source: MM2ValueSource;
  /** null when too few weapons are priced/rated to rank honestly. */
  winner: MM2CatalogItem | null;
  runnerUp: MM2CatalogItem | null;
  /** Gap in the compared metric between winner and runner-up. */
  edge: number | null;
  tied: boolean;
  /** How many of the compared weapons carry the metric at all. */
  measurable: number;
};

export function compareMM2Items(
  items: MM2CatalogItem[],
  args: { source: MM2ValueSource; metric: MM2CompareMetric; gameId: NichGameId },
): MM2ComparisonFacts | null {
  assertGameContext(GAME, args.gameId, "compareMM2Items");

  const unique = items.filter((item, position) => items.findIndex((other) => other.ID === item.ID) === position);
  if (unique.length < 2) return null;

  const measure = (item: MM2CatalogItem) =>
    args.metric === "demand" ? mm2DemandOf(item) : mm2ItemValue(item, args.source);

  const measurable = unique.filter((item) => measure(item) !== null);

  const base: MM2ComparisonFacts = {
    items: unique,
    metric: args.metric,
    source: args.source,
    winner: null,
    runnerUp: null,
    edge: null,
    tied: false,
    measurable: measurable.length,
  };

  if (measurable.length < 2) return base;

  const sorted = [...measurable].sort((a, b) => (measure(b) ?? 0) - (measure(a) ?? 0));
  const [winner, runnerUp] = sorted;
  const edge = (measure(winner) ?? 0) - (measure(runnerUp) ?? 0);

  return { ...base, winner, runnerUp, edge, tied: edge === 0 };
}

/** Render comparison facts as prose. */
export function formatComparison(facts: MM2ComparisonFacts): string {
  const measure = (item: MM2CatalogItem) =>
    facts.metric === "demand" ? mm2DemandOf(item) : mm2ItemValue(item, facts.source);

  if (facts.metric === "demand") {
    const rows = facts.items
      .map((item) => `• ${item.NAME} — ${measure(item) === null ? "unrated" : `${measure(item)}/10`}`)
      .join("\n");

    if (!facts.winner || !facts.runnerUp) {
      return `${rows}\n\nI can't rank these by demand — ${facts.measurable === 0 ? "neither" : "only one"} has a demand score in the catalog.`;
    }
    return facts.tied
      ? `${rows}\n\n**${facts.winner.NAME}** and **${facts.runnerUp.NAME}** are tied on demand.`
      : `${rows}\n\n**${facts.winner.NAME}** has the higher demand.`;
  }

  const rows = facts.items
    .map((item) => {
      const value = measure(item);
      return `• ${item.NAME} (${mm2CategoryOf(item)}) — ${value === null ? "N/A" : formatMM2Value(value)}`;
    })
    .join("\n");

  const header = `${MM2_VALUE_SOURCE_LABELS[facts.source]}:`;

  if (!facts.winner || !facts.runnerUp) {
    return `${header}\n${rows}\n\nI can't call a winner — ${facts.measurable === 0 ? "neither weapon has" : "only one weapon has"} a ${MM2_VALUE_SOURCE_LABELS[facts.source]}.`;
  }

  if (facts.tied) {
    return `${header}\n${rows}\n\n**${facts.winner.NAME}** and **${facts.runnerUp.NAME}** are worth exactly the same.`;
  }

  const winnerValue = measure(facts.winner) ?? 0;
  const runnerValue = measure(facts.runnerUp) ?? 0;
  const multiple = runnerValue > 0 ? winnerValue / runnerValue : null;
  const scale =
    multiple !== null && multiple >= 2 ? ` (about ${multiple >= 10 ? Math.round(multiple) : multiple.toFixed(1)}x)` : "";

  return `${header}\n${rows}\n\n**${facts.winner.NAME}** is worth more by ${formatMM2Value(facts.edge ?? 0)}${scale}.`;
}

export function answerCompare(
  items: MM2CatalogItem[],
  args: { source: MM2ValueSource; metric: MM2CompareMetric; gameId: NichGameId },
): string {
  const facts = compareMM2Items(items, args);
  return facts ? formatComparison(facts) : "";
}

// ---------------------------------------------------------------------------
// Catalog search
// ---------------------------------------------------------------------------

export type MM2CatalogQuery = {
  gameId: NichGameId;
  source: MM2ValueSource;
  category?: MM2Category | null;
  minValue?: number | null;
  maxValue?: number | null;
  nearValue?: number | null;
  minDemand?: number | null;
  sort?: "value-desc" | "value-asc" | "demand-desc";
  limit?: number;
};

export type MM2CatalogResult = {
  items: MM2CatalogItem[];
  total: number;
};

/** Filter/sort the catalog deterministically. Unpriced rows never rank. */
export function queryMM2Catalog(query: MM2CatalogQuery): MM2CatalogResult {
  assertGameContext(GAME, query.gameId, "queryMM2Catalog");

  const limit = Math.max(1, Math.min(25, query.limit ?? 10));

  const filtered = mm2Catalog.filter((item) => {
    if (query.category && mm2CategoryOf(item) !== query.category) return false;

    const demand = mm2DemandOf(item);
    if (typeof query.minDemand === "number") {
      if (demand === null || demand < query.minDemand) return false;
    }

    const value = mm2ItemValue(item, query.source);
    const needsValue =
      typeof query.minValue === "number" ||
      typeof query.maxValue === "number" ||
      typeof query.nearValue === "number" ||
      query.sort !== "demand-desc";
    if (needsValue && value === null) return false;

    if (typeof query.minValue === "number" && (value ?? 0) < query.minValue) return false;
    if (typeof query.maxValue === "number" && (value ?? 0) > query.maxValue) return false;

    return true;
  });

  const sorted = [...filtered];
  if (query.sort === "demand-desc") {
    sorted.sort(
      (a, b) =>
        (mm2DemandOf(b) ?? -1) - (mm2DemandOf(a) ?? -1) ||
        (mm2ItemValue(b, query.source) ?? -1) - (mm2ItemValue(a, query.source) ?? -1) ||
        a.NAME.localeCompare(b.NAME),
    );
  } else if (typeof query.nearValue === "number") {
    const target = query.nearValue;
    sorted.sort(
      (a, b) =>
        Math.abs((mm2ItemValue(a, query.source) ?? 0) - target) -
          Math.abs((mm2ItemValue(b, query.source) ?? 0) - target) || a.NAME.localeCompare(b.NAME),
    );
  } else if (query.sort === "value-asc") {
    sorted.sort(
      (a, b) => (mm2ItemValue(a, query.source) ?? 0) - (mm2ItemValue(b, query.source) ?? 0) || a.NAME.localeCompare(b.NAME),
    );
  } else {
    sorted.sort(
      (a, b) => (mm2ItemValue(b, query.source) ?? 0) - (mm2ItemValue(a, query.source) ?? 0) || a.NAME.localeCompare(b.NAME),
    );
  }

  return { items: sorted.slice(0, limit), total: filtered.length };
}

/** Render a catalog result as a numbered MM2 list. */
export function formatCatalogList(
  result: MM2CatalogResult,
  args: { source: MM2ValueSource; heading: string; showDemand?: boolean },
): string {
  if (!result.items.length) {
    return `${args.heading}\n\nNothing in the MM2 catalog matches that.`;
  }

  const rows = result.items.map((item, position) => {
    const value = mm2ItemValue(item, args.source);
    const demand = mm2DemandOf(item);
    const demandSuffix = args.showDemand ? ` · demand ${demand === null ? "N/A" : `${demand}/10`}` : "";
    return `${String(position + 1).padStart(2, "0")}. ${item.NAME} — ${value === null ? "N/A" : formatMM2Value(value)} (${mm2CategoryOf(item)})${demandSuffix}`;
  });

  const more =
    result.total > result.items.length ? `\n\n${result.total - result.items.length} more match in the catalog.` : "";

  return `${args.heading}\n${rows.join("\n")}${more}`;
}

// ---------------------------------------------------------------------------
// Category parsing shared by the intent router
// ---------------------------------------------------------------------------

export function detectMM2Category(normalizedMessage: string): MM2Category | null {
  for (const word of normalizedMessage.split(" ")) {
    const category = MM2_CATEGORY_PHRASES[word];
    if (category) return category;
  }
  return null;
}
