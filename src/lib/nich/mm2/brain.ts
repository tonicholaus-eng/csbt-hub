/**
 * The MM2 local brain.
 *
 * Mirrors the role Adopt Me's `brain/router.ts` plays, for MM2, over MM2 data.
 * It shares *no* catalog, resolver, alias table, calculator or context with
 * Adopt Me — only the response shape and the personality rules that are
 * genuinely game-neutral.
 *
 * Contract with the caller:
 *
 *   - a returned response with `aiEligible: false` is final; the API must send
 *     it verbatim and must not "improve" it with a model
 *   - `null` means the local brain declined, and the AI fallback may answer —
 *     but only with MM2 tools and the MM2 domain prompt
 *
 * Declining is a first-class outcome. A confidently wrong number is worse than
 * a slower, honest one.
 */

import type { MM2ValueSource } from "../../../components/mm2/MM2TradeTypes";
import type { NichResponse, NichSuggestion } from "../../../components/nich/assistant/brain/types";
import type { MM2CatalogItem } from "../../mm2/catalog";
import { assertGameContext } from "../game/guard";
import type { NichGameId } from "../game/types";
import { recordNichRoute } from "../telemetry";
import {
  answerItemDemand,
  answerItemLookup,
  answerItemValue,
  answerSourceCompare,
  compareMM2Items,
  formatCatalogList,
  formatComparison,
  mm2CategoryOf,
  mm2ProfilePath,
  queryMM2Catalog,
} from "./engine";
import {
  MM2_SOURCE_LABELS,
  sourceLabelFor,
  toItemSummary,
  type MM2SourceLabel,
  type MM2StructuredResult,
} from "./result";
import { analyzeMM2Message, MM2_ROUTE_THRESHOLD, type MM2Intent, type MM2IntentAnalysis } from "./intent";
import { getMM2ItemById, resolveMM2Item, type MM2ItemResolution } from "./resolver";
import { createMM2Context, updateMM2Context, type MM2NichContext } from "./context";
import {
  evaluateParsedMM2Trade,
  formatMM2TradeResult,
  mm2CalculatorHref,
  parseMM2Trade,
  type MM2TradeParse,
} from "./trade";

const GAME: NichGameId = "mm2";

export type MM2BrainInput = {
  gameId: NichGameId;
  message: string;
  context: MM2NichContext;
};

export type MM2BrainResult = {
  response: NichResponse;
  context: MM2NichContext;
};

const DEFAULT_SOURCE: MM2ValueSource = "SUPREME";

const SUGGESTIONS: NichSuggestion[] = [
  { id: "mm2-top-godly", label: "Top godlies", message: "top 10 godlies" },
  { id: "mm2-high-demand", label: "High demand", message: "high demand weapons" },
  { id: "mm2-wfl", label: "Check a trade", message: "my harvester for their icebreaker" },
];

function nichIntentFor(intent: MM2Intent): NichResponse["intent"] {
  switch (intent) {
    case "GREETING":
      return "greeting";
    case "HELP":
      return "help";
    case "TRADE_WFL":
    case "TRADE_TOTAL":
    case "TRADE_COMPARE":
      return "tradeComparison";
    case "TOP_ITEMS":
    case "CATALOG_FILTER":
    case "VALUE_RANGE_SEARCH":
      return "catalogSearch";
    case "ITEM_VALUE":
    case "ITEM_GCASH":
    case "ITEM_DEMAND":
    case "ITEM_LOOKUP":
    case "ITEM_COMPARE":
    case "SOURCE_COMPARE":
      return "itemLookup";
    default:
      return "fallback";
  }
}

/**
 * A finished local answer.
 *
 * `aiEligible: false` makes it authoritative, and `meta` records that the
 * answer came from the local engine plus exactly which data it read. The
 * console renders those provenance labels verbatim, so they are set here — at
 * the point the data is actually read — rather than inferred later from prose.
 */
function local(
  text: string,
  intent: MM2Intent,
  confidence: number,
  options: {
    sources?: MM2SourceLabel[];
    structured?: MM2StructuredResult;
    extras?: Partial<NichResponse>;
  } = {},
): NichResponse {
  return {
    text,
    intent: nichIntentFor(intent),
    reaction: intent === "GREETING" ? "welcome" : intent.startsWith("TRADE") ? "calculator" : "searchFound",
    localConfidence: confidence,
    aiEligible: false,
    suggestions: SUGGESTIONS,
    meta: {
      gameId: "mm2",
      channel: "LOCAL",
      sources: options.sources ?? [MM2_SOURCE_LABELS.LOCAL_ENGINE],
      ...(options.structured ? { structured: options.structured } : {}),
    },
    ...options.extras,
  };
}

function clarify(query: string, candidates: MM2CatalogItem[]): NichResponse {
  const list = candidates
    .slice(0, 5)
    .map((item) => `• **${item.NAME}** (${mm2CategoryOf(item)})`)
    .join("\n");

  return local(
    `"${query}" matches more than one MM2 weapon and they are not worth the same:\n\n${list}\n\nWhich one do you mean?`,
    "AMBIGUOUS",
    1,
    {
      sources: [MM2_SOURCE_LABELS.LOCAL_ENGINE, MM2_SOURCE_LABELS.CATALOG],
      structured: { kind: "clarify", query, candidates: candidates.slice(0, 5).map(toItemSummary) },
      extras: { intent: "itemLookup", reaction: "searchEmpty" },
    },
  );
}

function notFound(query: string): NichResponse {
  return local(
    `I couldn't find **${query}** in the MM2 catalog. Check the spelling, or try the exact weapon name from /mm2/values.`,
    "AMBIGUOUS",
    1,
    {
      sources: [MM2_SOURCE_LABELS.LOCAL_ENGINE, MM2_SOURCE_LABELS.CATALOG],
      extras: { intent: "itemLookup", reaction: "searchEmpty" },
    },
  );
}

/**
 * Resolve the item(s) a message is about, falling back to conversation memory.
 *
 * A follow-up like "what about gcash?" carries no weapon name, so the most
 * recent MM2 id is reused. That id is MM2's — there is no code path by which an
 * Adopt Me item could be sitting in `recentItemIds`, because the field only
 * exists on the MM2 context type and is only ever written from MM2 resolutions.
 */
function resolveTargets(
  analysis: MM2IntentAnalysis,
  context: MM2NichContext,
  wanted: number,
): { items: MM2CatalogItem[]; failure?: NichResponse } {
  const items: MM2CatalogItem[] = [];

  for (const phrase of analysis.itemPhrases) {
    if (items.length >= Math.max(wanted, analysis.itemPhrases.length)) break;
    const resolution: MM2ItemResolution = resolveMM2Item(phrase, {
      gameId: GAME,
      contextItemIds: context.recentItemIds,
      userAliases: context.aliases,
      category: analysis.category ?? undefined,
    });

    if (resolution.status === "resolved") items.push(resolution.item);
    else if (resolution.status === "ambiguous") return { items, failure: clarify(phrase, resolution.candidates) };
    else if (analysis.itemPhrases.length === 1) return { items, failure: notFound(phrase) };
  }

  if (items.length < wanted) {
    // Pull from memory: the comparison set first, then the most recent items.
    const memoryIds = [...(context.comparisonItemIds ?? []), ...(context.recentItemIds ?? [])];
    for (const id of memoryIds) {
      if (items.length >= wanted) break;
      const item = getMM2ItemById(id);
      if (item && !items.some((existing) => existing.ID === item.ID)) items.push(item);
    }
  }

  return { items };
}

function sourceFor(analysis: MM2IntentAnalysis, context: MM2NichContext): MM2ValueSource {
  if (analysis.intent === "ITEM_GCASH") return "GCASH";
  return analysis.explicitSource ?? context.lastValueSource ?? DEFAULT_SOURCE;
}

/**
 * Route one MM2 message.
 *
 * Returns `null` when the local brain has nothing confident to say, which hands
 * the turn to the AI fallback (still MM2-scoped).
 */
export function routeMM2NichMessage(input: MM2BrainInput): MM2BrainResult | null {
  assertGameContext(GAME, input.gameId, "routeMM2NichMessage");

  const context = input.context?.gameId === "mm2" ? input.context : createMM2Context();
  const analysis = analyzeMM2Message(input.message);

  const finish = (
    response: NichResponse,
    patch: Parameters<typeof updateMM2Context>[1],
    kind: string,
  ): MM2BrainResult => {
    recordNichRoute({ gameId: GAME, channel: "LOCAL", kind, confidence: response.localConfidence });
    return {
      response,
      context: updateMM2Context(context, {
        ...patch,
        lastIntent: analysis.intent,
        lastUserMessage: input.message.slice(0, 500),
      }),
    };
  };

  if (analysis.intent === "GREETING") {
    return finish(
      local(
        "Hey — MM2 Nich here. I read the MM2 weapon catalog directly, so I can give you Supreme or GCash values, demand, comparisons and W/F/L on a trade. What are you looking at?",
        "GREETING",
        1,
      ),
      {},
      "GREETING",
    );
  }

  if (analysis.intent === "HELP") {
    return finish(
      local(
        [
          "Here's what I can answer straight from the MM2 catalog:",
          "",
          "• **Values** — “harvester value”, “gcash value of icebreaker”",
          "• **Demand** — “demand of batwing”, “high demand godlies”",
          "• **Compare** — “harvester vs icepiercer”, “which has better demand?”",
          "• **Search** — “top 10 godlies”, “weapons around 500”, “items between 100 and 200”",
          "• **Trades** — “my harvester for their icebreaker and batwing” → W/F/L",
          "",
          "Values come from the MM2 database, not from a model. If a weapon has no value in the source you asked for, I'll say so instead of estimating one.",
        ].join("\n"),
        "HELP",
        1,
      ),
      {},
      "HELP",
    );
  }

  // --- trades ------------------------------------------------------------
  if (analysis.intent === "TRADE_WFL" || analysis.intent === "TRADE_TOTAL") {
    const source = sourceFor(analysis, context);
    const namesFor = (ids: string[] | undefined) =>
      (ids ?? []).flatMap((id) => {
        const item = getMM2ItemById(id);
        return item ? [item.NAME] : [];
      });

    const parse = parseMM2Trade(input.message, {
      gameId: GAME,
      contextItemIds: context.recentItemIds,
      userAliases: context.aliases,
      // Lets a side written as "both" or "it" resolve against the weapons the
      // conversation is already about. MM2 ids in, MM2 names out.
      contextItemNames: {
        recent: namesFor(context.recentItemIds),
        comparison: namesFor(context.comparisonItemIds),
      },
    });

    const ambiguous = parse.issues.find((issue) => issue.kind === "ambiguous");
    if (ambiguous && ambiguous.kind === "ambiguous") {
      return finish(clarify(ambiguous.phrase, ambiguous.candidates), {}, "TRADE_CLARIFY");
    }

    if (!parse.complete) {
      // An incomplete trade is not a verdict. Say what is missing.
      const unresolved = parse.issues.filter((issue) => issue.kind === "unresolved").map((issue) => issue.phrase);
      if (unresolved.length) {
        return finish(
          local(
            `I couldn't match ${unresolved.map((phrase) => `**${phrase}**`).join(", ")} to an MM2 weapon, so I'm not calling this trade. Give me the exact catalog names and I'll run it.`,
            "TRADE_WFL",
            1,
          ),
          {},
          "TRADE_UNRESOLVED",
        );
      }
      return null;
    }

    const evaluation = evaluateParsedMM2Trade(parse, { valueSource: source, gameId: GAME });
    const href = mm2CalculatorHref(parse, source);

    const sideRows = (items: typeof parse.yourItems) =>
      items.map((entry) => {
        const summary = toItemSummary(entry.item);
        const unit = source === "GCASH" ? summary.gcash : summary.supreme;
        return {
          id: summary.id,
          name: summary.name,
          category: summary.category,
          quantity: entry.quantity,
          unit,
          line: unit === null ? null : unit * entry.quantity,
          href: summary.href,
        };
      });

    return finish(
      local(formatMM2TradeResult(parse, evaluation), analysis.intent, 1, {
        sources: [MM2_SOURCE_LABELS.TRADE_ENGINE, sourceLabelFor(source)],
        structured: {
          kind: "trade",
          verdict: evaluation.verdict,
          source,
          yours: sideRows(parse.yourItems),
          theirs: sideRows(parse.theirItems),
          yourTotal: evaluation.yourTotal,
          theirTotal: evaluation.theirTotal,
          difference: evaluation.difference,
          differencePercent: evaluation.differencePercent,
          missingCount: evaluation.missingCount,
          missingNames: evaluation.missingItems.map((item) => item.NAME),
          calculatorHref: href,
        },
        extras: { navigation: { href, label: "Open in MM2 Calculator" } },
      }),
      {
        lastValueSource: source,
        touchedItemIds: [...parse.yourItems, ...parse.theirItems].map((entry) => entry.item.ID),
        lastTrade: {
          valueSource: source,
          yourItemIds: parse.yourItems.map((entry) => ({ id: entry.item.ID, quantity: entry.quantity })),
          theirItemIds: parse.theirItems.map((entry) => ({ id: entry.item.ID, quantity: entry.quantity })),
        },
      },
      `TRADE_${evaluation.verdict}`,
    );
  }

  // --- catalog search ----------------------------------------------------
  if (
    analysis.intent === "TOP_ITEMS" ||
    analysis.intent === "CATALOG_FILTER" ||
    analysis.intent === "VALUE_RANGE_SEARCH"
  ) {
    const source = sourceFor(analysis, context);
    const result = queryMM2Catalog({
      gameId: GAME,
      source,
      category: analysis.category,
      minValue: analysis.minValue,
      maxValue: analysis.maxValue,
      nearValue: analysis.nearValue,
      minDemand: analysis.minDemand,
      sort: analysis.sort ?? "value-desc",
      limit: analysis.limit ?? 10,
    });

    const scope = analysis.category ? `${analysis.category} weapons` : "MM2 weapons";
    const qualifier = analysis.minDemand
      ? ` with demand ${analysis.minDemand}+`
      : analysis.nearValue !== null
        ? ` closest to ${analysis.nearValue.toLocaleString("en-US")}`
        : analysis.minValue !== null && analysis.maxValue !== null
          ? ` between ${analysis.minValue.toLocaleString("en-US")} and ${analysis.maxValue.toLocaleString("en-US")}`
          : analysis.maxValue !== null
            ? ` under ${analysis.maxValue.toLocaleString("en-US")}`
            : analysis.minValue !== null
              ? ` over ${analysis.minValue.toLocaleString("en-US")}`
              : "";

    const heading = `**${scope}${qualifier}** — by ${analysis.sort === "demand-desc" ? "demand" : analysis.sort === "value-asc" ? "lowest" : "highest"} ${analysis.sort === "demand-desc" ? "" : `${source === "GCASH" ? "GCash" : "Supreme"} value`}`.trim();

    return finish(
      local(formatCatalogList(result, { source, heading, showDemand: analysis.sort === "demand-desc" }), analysis.intent, 1, {
        sources: [
          MM2_SOURCE_LABELS.CATALOG,
          analysis.sort === "demand-desc" ? MM2_SOURCE_LABELS.DEMAND : sourceLabelFor(source),
        ],
        structured: {
          kind: "catalog",
          // The card renders its own emphasis, so strip the prose markdown.
          heading: heading.replaceAll("**", ""),
          source,
          rows: result.items.map(toItemSummary),
          total: result.total,
          showDemand: analysis.sort === "demand-desc",
        },
      }),
      { lastValueSource: source, touchedItemIds: result.items.map((item) => item.ID) },
      analysis.intent,
    );
  }

  // Everything below needs at least one weapon.
  if (analysis.confidence < MM2_ROUTE_THRESHOLD) return null;

  /**
   * "which has better demand?" names no weapons, so intent classification alone
   * reads it as a single-item question. Combined with memory it is obviously a
   * follow-up on the last comparison, and that is a decision only the brain can
   * make — the intent layer has no conversation state.
   */
  const continuesComparison =
    analysis.intent !== "ITEM_COMPARE" &&
    analysis.itemPhrases.length === 0 &&
    analysis.hasComparativeWording &&
    (context.comparisonItemIds?.length ?? 0) >= 2;

  // --- comparison --------------------------------------------------------
  if (analysis.intent === "ITEM_COMPARE" || continuesComparison) {
    const { items, failure } = resolveTargets(analysis, context, 2);
    if (failure) return finish(failure, {}, "COMPARE_CLARIFY");
    if (items.length < 2) return null;

    const source = sourceFor(analysis, context);
    const metric = /\bdemand\b/.test(analysis.normalized) ? ("demand" as const) : ("value" as const);
    // Text and card come from one ranking, so the prose and the card's
    // "VALUE EDGE" figure can never disagree about who won.
    const facts = compareMM2Items(items, { source, metric, gameId: GAME });
    if (!facts) return null;

    return finish(local(formatComparison(facts), "ITEM_COMPARE", 1, {
      sources: [
        MM2_SOURCE_LABELS.LOCAL_ENGINE,
        metric === "demand" ? MM2_SOURCE_LABELS.DEMAND : sourceLabelFor(source),
      ],
      structured: {
        kind: "comparison",
        items: facts.items.map(toItemSummary),
        metric,
        source,
        winnerId: facts.winner?.ID ?? null,
        edge: facts.edge,
        tied: facts.tied,
      },
    }), {
      lastValueSource: source,
      comparisonItemIds: items.map((item) => item.ID),
      touchedItemIds: items.map((item) => item.ID),
    }, "COMPARE");
  }

  // --- single item -------------------------------------------------------
  const { items, failure } = resolveTargets(analysis, context, 1);
  if (failure) return finish(failure, {}, "ITEM_CLARIFY");

  const item = items[0];
  if (!item) return null;

  const source = sourceFor(analysis, context);
  const touched = { touchedItemIds: [item.ID], lastValueSource: source };
  const navigation = { href: mm2ProfilePath(item), label: `Open ${item.NAME}` };

  const summary = toItemSummary(item);
  const extras = { navigation };

  if (analysis.intent === "ITEM_DEMAND") {
    return finish(
      local(answerItemDemand(item, GAME).text, analysis.intent, 1, {
        sources: [MM2_SOURCE_LABELS.LOCAL_ENGINE, MM2_SOURCE_LABELS.DEMAND],
        structured: { kind: "item", item: summary, focus: "DEMAND" },
        extras,
      }),
      touched,
      "DEMAND",
    );
  }

  if (analysis.intent === "SOURCE_COMPARE" || analysis.intent === "ITEM_LOOKUP") {
    const text =
      analysis.intent === "SOURCE_COMPARE"
        ? answerSourceCompare(item, GAME).text
        : answerItemLookup(item, GAME).text;
    return finish(
      local(text, analysis.intent, 1, {
        sources: [MM2_SOURCE_LABELS.LOCAL_ENGINE, MM2_SOURCE_LABELS.SUPREME, MM2_SOURCE_LABELS.GCASH],
        structured: { kind: "item", item: summary, focus: "ALL" },
        extras,
      }),
      touched,
      analysis.intent === "SOURCE_COMPARE" ? "SOURCE_COMPARE" : "ITEM_LOOKUP",
    );
  }

  // ITEM_VALUE / ITEM_GCASH
  return finish(
    local(answerItemValue(item, source, GAME).text, analysis.intent, 1, {
      sources: [MM2_SOURCE_LABELS.LOCAL_ENGINE, sourceLabelFor(source)],
      structured: { kind: "item", item: summary, focus: source === "GCASH" ? "GCASH" : "SUPREME" },
      extras,
    }),
    touched,
    source === "GCASH" ? "GCASH_LOOKUP" : "VALUE_LOOKUP",
  );
}

export type { MM2NichContext, MM2TradeParse };
