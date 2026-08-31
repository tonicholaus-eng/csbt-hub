/**
 * The MM2 local brain.
 *
 * It answers one message, using the semantic interpreter to decide what was
 * meant and the MM2 tool layer to find out what is true. It performs no
 * arithmetic of its own and reads no JSON directly: everything factual comes
 * back from `tools.ts` or `tradeReasoning.ts`, and this file only decides which
 * question was asked and how to say the answer.
 *
 * Contract with the caller:
 *
 *   - a returned response with `aiEligible: false` is final; the API must send
 *     it verbatim and must not "improve" it with a model
 *   - `null` means the local brain declined, and the AI fallback may answer —
 *     but only with MM2 tools and the MM2 domain prompt
 *
 * Declining is still a first-class outcome. The interpreter is much better at
 * recognising a question than it used to be, which makes it *more* important
 * that a low-confidence read hands over rather than guesses: a confidently
 * wrong number is worse than a slower, honest one.
 */

import type { MM2ValueSource } from "../../../components/mm2/MM2TradeTypes";
import type { NichResponse, NichSuggestion } from "../../../components/nich/assistant/brain/types";
import type { MM2CatalogItem } from "../../mm2/catalog";
import { formatMM2Value, MM2_VALUE_SOURCE_LABELS } from "../../mm2/tradeMath";
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
  type MM2CatalogResult,
} from "./engine";
import {
  MM2_SOURCE_LABELS,
  sourceLabelFor,
  toItemSummary,
  type MM2InterpretationDebug,
  type MM2SourceLabel,
  type MM2StructuredResult,
} from "./result";
import type { MM2Intent } from "./intent";
import { createMM2Context, updateMM2Context, type MM2NichContext } from "./context";
import { mm2CalculatorHref, type MM2TradeParse } from "./trade";
import { interpretMM2Message, type MM2Interpretation, type MM2TradeRead, type MM2UserIntent } from "./semantic";
import { hasConcept } from "./lexicon";
import { interpretMM2MessageWithModel, type MM2SemanticAsk } from "./aiSemantic";
import {
  calculateMM2InventoryTotal,
  countMM2NamesStartingWith,
  describeMM2Tradeability,
  findMM2AddsForGap,
  findMM2DowngradeTargets,
  findMM2ItemsNearValue,
  findMM2SimilarItems,
  findMM2UpgradeTargets,
  getMM2ItemValue,
  itemsFromIds,
  rankMM2ByDemand,
  type MM2SearchResult,
} from "./tools";
import {
  buildMM2TradeFacts,
  mm2AddNeededForFair,
  narrateMM2Trade,
  summariseMM2Trade,
  type MM2TradeEntry,
} from "./tradeReasoning";

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

/**
 * The response `intent` field the shared chat UI reads.
 *
 * The semantic intents are finer-grained than the UI's vocabulary, so several
 * map onto one. That is fine — the UI uses this only to pick a reaction and a
 * card family, while the structured payload carries the detail.
 */
function nichIntentFor(intent: MM2UserIntent): NichResponse["intent"] {
  switch (intent) {
    case "casual_conversation":
      return "greeting";
    case "help":
      return "help";
    case "trade_wfl":
    case "trade_adds":
    case "trade_target":
      return "tradeComparison";
    case "trade_upgrade":
    case "trade_downgrade":
    case "recommend_item":
    case "inventory_target":
    case "inventory_value":
      return "catalogSearch";
    case "item_value":
    case "item_demand":
    case "item_details":
    case "compare_items":
      return "itemLookup";
    default:
      return "fallback";
  }
}

/** The legacy intent label, kept so persisted contexts stay readable. */
function legacyIntentFor(intent: MM2UserIntent): MM2Intent {
  switch (intent) {
    case "item_value":
      return "ITEM_VALUE";
    case "item_demand":
      return "ITEM_DEMAND";
    case "item_details":
      return "ITEM_LOOKUP";
    case "compare_items":
      return "ITEM_COMPARE";
    case "trade_wfl":
    case "trade_adds":
    case "trade_target":
      return "TRADE_WFL";
    case "inventory_value":
      return "TRADE_TOTAL";
    case "recommend_item":
    case "trade_upgrade":
    case "trade_downgrade":
    case "inventory_target":
      return "CATALOG_FILTER";
    case "casual_conversation":
      return "GREETING";
    case "help":
      return "HELP";
    default:
      return "GENERAL_CHAT";
  }
}

function reactionFor(intent: MM2UserIntent): NichResponse["reaction"] {
  if (intent === "casual_conversation") return "welcome";
  if (intent === "trade_wfl" || intent === "trade_adds" || intent === "trade_target") return "calculator";
  return "searchFound";
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
  intent: MM2UserIntent,
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
    reaction: reactionFor(intent),
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
    "item_details",
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
    "item_details",
    1,
    {
      sources: [MM2_SOURCE_LABELS.LOCAL_ENGINE, MM2_SOURCE_LABELS.CATALOG],
      extras: { intent: "itemLookup", reaction: "searchEmpty" },
    },
  );
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function sourceFor(interpretation: MM2Interpretation, context: MM2NichContext): MM2ValueSource {
  return interpretation.source ?? context.lastValueSource ?? DEFAULT_SOURCE;
}

/** The weapons an answer is about, falling back to what we were just discussing. */
function targetsFor(interpretation: MM2Interpretation, context: MM2NichContext, wanted = 1): MM2CatalogItem[] {
  const items = [...interpretation.targets];
  if (items.length >= wanted) return items;

  const memory = [
    ...itemsFromIds(context.comparisonItemIds),
    ...itemsFromIds(context.inventoryItemIds),
    ...itemsFromIds(context.recentItemIds),
    ...itemsFromIds(context.candidateItemIds),
  ];
  for (const item of memory) {
    if (items.length >= wanted) break;
    if (!items.some((existing) => existing.ID === item.ID)) items.push(item);
  }
  return items;
}

/**
 * A footnote for a one-word name that is also the start of many others.
 *
 * "ice" is the MM2 weapon Ice and the first word of two dozen more. The exact
 * match is the right answer — it is what they typed — but silently ignoring the
 * other two dozen is how a user ends up quoting the wrong weapon's value.
 */
function siblingsNote(interpretation: MM2Interpretation, item: MM2CatalogItem): string {
  const named = interpretation.scan.entities.find((entity) => entity.item.ID === item.ID);
  if (!named || named.phrase.includes(" ") || named.phrase.length > 6) return "";
  if (!/^(exact-name|normalized)$/.test(named.kind)) return "";

  const siblings = countMM2NamesStartingWith(item.NAME, GAME);
  if (siblings < 3) return "";

  return `\n\n${siblings} other MM2 weapons start with “${item.NAME}” — say the full name if you meant one of those.`;
}

function tradeEntries(side: MM2TradeRead["yours"]): MM2TradeEntry[] {
  return side.entities.map((entity) => ({ item: entity.item, quantity: entity.quantity }));
}

/** Turn a tools result into the catalog card + the numbered list the text shows. */
function catalogResponse(
  result: MM2SearchResult | MM2CatalogResult,
  args: {
    heading: string;
    source: MM2ValueSource;
    showDemand?: boolean;
    intent: MM2UserIntent;
    lead?: string;
  },
): NichResponse {
  const body = formatCatalogList(result, {
    source: args.source,
    heading: args.heading,
    showDemand: args.showDemand,
  });

  return local(args.lead ? `${args.lead}\n\n${body}` : body, args.intent, 1, {
    sources: [MM2_SOURCE_LABELS.CATALOG, args.showDemand ? MM2_SOURCE_LABELS.DEMAND : sourceLabelFor(args.source)],
    structured: {
      kind: "catalog",
      heading: args.heading.replaceAll("**", ""),
      source: args.source,
      rows: result.items.map(toItemSummary),
      total: result.total,
      showDemand: Boolean(args.showDemand),
    },
  });
}

/**
 * Build the development-only interpretation trace.
 *
 * Exported so tests and a dev console can inspect exactly what NICH understood
 * without having to infer it from the prose it produced.
 */
export function describeMM2Interpretation(
  interpretation: MM2Interpretation,
  route: string,
): MM2InterpretationDebug {
  return {
    message: interpretation.raw,
    intent: interpretation.primaryIntent,
    secondaryIntents: interpretation.secondaryIntents,
    confidence: Number(interpretation.confidence.toFixed(2)),
    path: interpretation.path,
    why: interpretation.scores[0]?.why ?? [],
    entities: interpretation.scan.entities.map((entity) => ({
      name: entity.item.NAME,
      phrase: entity.phrase,
      kind: entity.kind,
      confidence: entity.confidence,
    })),
    references: interpretation.references.map((reference) => ({
      phrase: reference.phrase,
      kind: reference.kind,
      resolved: reference.items.map((item) => item.NAME),
      from: reference.from,
    })),
    targets: interpretation.targets.map((item) => item.NAME),
    ambiguous: interpretation.ambiguities.map((ambiguity) => ambiguity.phrase),
    unresolved: interpretation.unresolved,
    metric: interpretation.metric,
    source: interpretation.source,
    category: interpretation.category,
    concepts: [...interpretation.concepts.keys()],
    trade: interpretation.trade
      ? {
          yours: interpretation.trade.yours.entities.map((entity) => entity.item.NAME),
          theirs: interpretation.trade.theirs.entities.map((entity) => entity.item.NAME),
          how: interpretation.trade.how,
          complete: interpretation.trade.complete,
        }
      : null,
    route,
  };
}

/** Attach the trace outside production. Production answers carry no debug field. */
function withDebug(response: NichResponse, interpretation: MM2Interpretation, route: string): NichResponse {
  if (process.env.NODE_ENV === "production") return response;

  const meta = response.meta;
  if (!meta || meta.gameId !== "mm2") return response;

  return { ...response, meta: { ...meta, debug: describeMM2Interpretation(interpretation, route) } };
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

/**
 * Route one MM2 message.
 *
 * Returns `null` when the local brain has nothing confident to say, which hands
 * the turn to the AI fallback (still MM2-scoped).
 */
export function routeMM2NichMessage(input: MM2BrainInput): MM2BrainResult | null {
  assertGameContext(GAME, input.gameId, "routeMM2NichMessage");

  const context = input.context?.gameId === "mm2" ? input.context : createMM2Context();
  const interpretation = interpretMM2Message(input.message, { gameId: GAME, context });
  const intent = interpretation.primaryIntent;
  const source = sourceFor(interpretation, context);

  const finish = (
    response: NichResponse,
    patch: Parameters<typeof updateMM2Context>[1],
    kind: string,
  ): MM2BrainResult => {
    recordNichRoute({ gameId: GAME, channel: "LOCAL", kind, confidence: response.localConfidence });
    return {
      response: withDebug(response, interpretation, kind),
      context: updateMM2Context(context, {
        ...patch,
        lastIntent: legacyIntentFor(intent),
        lastSemanticIntent: intent,
        ...(interpretation.metric ? { lastMetric: interpretation.metric } : {}),
        lastUserMessage: input.message.slice(0, 500),
      }),
    };
  };

  // --- conversation ------------------------------------------------------
  if (intent === "casual_conversation") {
    const text = interpretation.discourse.isThanks
      ? "Anytime. Send me another weapon or a trade whenever."
      : "Hey — MM2 Nich here. I read the MM2 weapon catalog directly, so I can give you Supreme or GCash values, demand, comparisons and W/F/L on a trade. What are you looking at?";
    return finish(local(text, intent, 1), {}, "GREETING");
  }

  if (intent === "help") {
    return finish(
      local(
        [
          "Here's what I can answer straight from the MM2 catalog:",
          "",
          "• **Values** — “how much is harv”, “gcash value of icebreaker”",
          "• **Demand** — “is batwing easy to trade”, “high demand godlies”",
          "• **Compare** — “harv vs icepiercer”, then just “what about demand?”",
          "• **Search** — “top 10 godlies”, “something around 500”, “good demand under 1k”",
          "• **Trades** — “my harv for his corrupt and batwing, would you?” → W/F/L, then “what if he adds 200?”",
          "",
          "You can talk normally — shorthand, typos and follow-ups are fine. Values come from the MM2 database, not from a model: if a weapon has no value in the source you asked for, I'll say so instead of estimating one.",
        ].join("\n"),
        intent,
        1,
      ),
      {},
      "HELP",
    );
  }

  /**
   * They asked for the chroma of something that has none.
   *
   * 44 MM2 weapons have a chroma twin and the rest do not, so this is a real
   * answer rather than a failure — and inventing a "Chroma Harvester" value
   * would be inventing a weapon.
   */
  if (interpretation.variantMissingFor) {
    const subject = interpretation.variantMissingFor;
    return finish(
      local(
        `There's no Chroma ${subject.NAME} in the MM2 catalog — ${subject.NAME} doesn't have a chroma version, so the value stands as it is.`,
        intent === "unknown" ? "item_details" : intent,
        1,
        { sources: [MM2_SOURCE_LABELS.LOCAL_ENGINE, MM2_SOURCE_LABELS.CATALOG], extras: { reaction: "searchEmpty" } },
      ),
      { touchedItemIds: [subject.ID] },
      "VARIANT_MISSING",
    );
  }

  // --- things we could not identify --------------------------------------
  const wantsAnItem =
    intent === "item_value" ||
    intent === "item_demand" ||
    intent === "item_details" ||
    intent === "compare_items" ||
    intent === "trade_wfl" ||
    intent === "trade_adds" ||
    intent === "trade_upgrade" ||
    intent === "trade_downgrade" ||
    intent === "inventory_value";

  if (interpretation.ambiguities.length && (wantsAnItem || intent === "unknown")) {
    const first = interpretation.ambiguities[0];
    return finish(clarify(first.phrase, first.candidates), { candidateItemIds: first.candidates.map((item) => item.ID) }, "CLARIFY");
  }

  const tradeInProgress = Boolean(
    interpretation.trade && (interpretation.trade.yours.entities.length || interpretation.trade.theirs.entities.length),
  );

  if (interpretation.unresolved.length && wantsAnItem) {
    const names = interpretation.unresolved;
    // Only report an unmatched name against a trade when there *is* a trade to
    // spoil. "bro is this ass" has no sides, so asking for them is the answer.
    if ((intent === "trade_wfl" || intent === "trade_adds") && tradeInProgress) {
      return finish(
        local(
          `I couldn't match ${names.map((name) => `**${name}**`).join(", ")} to an MM2 weapon, so I'm not calling this trade. Give me the exact catalog names and I'll run it.`,
          intent,
          1,
          { extras: { reaction: "searchEmpty" } },
        ),
        {},
        "TRADE_UNRESOLVED",
      );
    }
    const tradeIntent = intent === "trade_wfl" || intent === "trade_adds";
    if (!interpretation.targets.length && !tradeIntent) {
      return finish(notFound(names[0]), {}, "NOT_FOUND");
    }
  }

  // --- trades ------------------------------------------------------------
  if ((intent === "trade_wfl" || intent === "trade_adds") && interpretation.trade?.complete) {
    return finish(...tradeAnswer(interpretation, interpretation.trade, source, intent));
  }

  if (intent === "trade_wfl" || intent === "trade_adds") {
    // A trade the brain could only half-read is not a verdict.
    const half = interpretation.trade;
    if (half && (half.yours.entities.length || half.theirs.entities.length)) {
      const empty = half.yours.entities.length ? "their" : "your";
      const known = [...half.yours.entities, ...half.theirs.entities].map((entity) => entity.item.NAME);
      const text =
        half.how === "modified"
          ? `That would leave ${empty === "their" ? "their" : "your"} side empty — nothing against ${known.join(" and ")}. Put something back on that side and I'll re-run it.`
          : `I've got ${known.join(" and ")}, but not both sides of the trade. Tell me what you're giving and what they're giving and I'll run the W/F/L.`;

      return finish(
        local(text, intent, 0.9, { extras: { reaction: "searchEmpty" } }),
        { touchedItemIds: [...half.yours.entities, ...half.theirs.entities].map((entity) => entity.item.ID) },
        "TRADE_INCOMPLETE",
      );
    }

    /**
     * "would you?" / "am I cooked?" with nothing on the table.
     *
     * The intent is unmistakable and the missing part is small, so asking for
     * it is a better answer than handing the turn to a model that has no trade
     * to reason about either.
     */
    return finish(
      local(
        "Send me what you're giving and what they're offering and I'll break it down — value, demand and whether it's worth taking.",
        intent,
        0.9,
        { extras: { reaction: "searchEmpty" } },
      ),
      {},
      "TRADE_NEEDED",
    );
  }

  // --- comparison --------------------------------------------------------
  if (intent === "compare_items") {
    const items = targetsFor(interpretation, context, 2).slice(0, 4);
    if (items.length < 2) return null;

    const metric = interpretation.metric === "demand" || interpretation.metric === "liquidity" ? "demand" : "value";
    // "which is worst" is the same ranking read from the other end.
    const direction = /\b(worst|lowest|least|weakest|cheapest|smallest)\b/.test(interpretation.normalized)
      ? ("lowest" as const)
      : ("highest" as const);
    const facts = compareMM2Items(items, { source, metric, gameId: GAME, direction });
    if (!facts) return null;

    const text =
      interpretation.metric === "liquidity"
        ? `${formatComparison(facts)}\n\nDemand is the only tradeability signal CSBT holds for MM2, so that ranking is what I'd go on.`
        : formatComparison(facts);

    return finish(
      local(text, intent, 1, {
        sources: [MM2_SOURCE_LABELS.LOCAL_ENGINE, metric === "demand" ? MM2_SOURCE_LABELS.DEMAND : sourceLabelFor(source)],
        structured: {
          kind: "comparison",
          items: facts.items.map(toItemSummary),
          metric,
          source,
          winnerId: facts.winner?.ID ?? null,
          edge: facts.edge,
          tied: facts.tied,
        },
      }),
      {
        lastValueSource: source,
        comparisonItemIds: items.map((item) => item.ID),
        candidateItemIds: items.map((item) => item.ID),
        touchedItemIds: items.map((item) => item.ID),
      },
      "COMPARE",
    );
  }

  // --- inventory ---------------------------------------------------------
  if (intent === "inventory_value") {
    const declared = interpretation.scan.entities.filter((entity) => !entity.negated);
    const entries = declared.length
      ? declared.map((entity) => ({ item: entity.item, quantity: entity.quantity }))
      : itemsFromIds(context.inventoryItemIds).map((item) => ({
          item,
          quantity: context.inventoryQuantities?.[item.ID] ?? 1,
        }));

    if (!entries.length) return null;

    const totals = calculateMM2InventoryTotal(entries, source, GAME);
    const lines = [
      `**Your ${entries.length === 1 ? "weapon" : "weapons"}** — ${MM2_VALUE_SOURCE_LABELS[source]}`,
      ...totals.rows.map((row) => {
        const quantity = row.quantity > 1 ? ` ×${row.quantity}` : "";
        return `• ${row.item.NAME}${quantity} — ${row.line === null ? "N/A" : formatMM2Value(row.line)}`;
      }),
      "",
      `Total: **${formatMM2Value(totals.total)}**`,
    ];

    if (totals.unpriced.length) {
      lines.push(
        `${totals.unpriced.map((item) => item.NAME).join(", ")} ${totals.unpriced.length === 1 ? "has" : "have"} no ${MM2_VALUE_SOURCE_LABELS[source]}, so ${totals.unpriced.length === 1 ? "it is" : "they are"} not in that total.`,
      );
    }
    if (totals.best) lines.push(`Your strongest piece is **${totals.best.NAME}**.`);

    return finish(
      local(lines.join("\n"), intent, 1, {
        sources: [MM2_SOURCE_LABELS.LOCAL_ENGINE, sourceLabelFor(source)],
        structured: {
          kind: "catalog",
          heading: `Your weapons — ${MM2_VALUE_SOURCE_LABELS[source]}`,
          source,
          rows: totals.rows.map((row) => toItemSummary(row.item)),
          total: totals.rows.length,
          showDemand: false,
        },
      }),
      {
        lastValueSource: source,
        inventoryItemIds: entries.map((entry) => entry.item.ID),
        inventoryQuantities: Object.fromEntries(entries.map((entry) => [entry.item.ID, entry.quantity])),
        candidateItemIds: entries.map((entry) => entry.item.ID),
        touchedItemIds: entries.map((entry) => entry.item.ID),
        lastTargetValue: totals.total,
      },
      "INVENTORY_TOTAL",
    );
  }

  // --- recommendations ---------------------------------------------------
  if (
    intent === "recommend_item" ||
    intent === "trade_upgrade" ||
    intent === "trade_downgrade" ||
    intent === "inventory_target"
  ) {
    const recommendation = recommend(interpretation, context, source, intent);
    if (!recommendation) return null;

    const [response, patch] = recommendation;
    return finish(response, patch, intent.toUpperCase());
  }

  // --- market / concepts -------------------------------------------------
  if (intent === "market_question") {
    const item = targetsFor(interpretation, context, 1)[0];
    if (!item) return null;

    return finish(
      local(
        [
          `CSBT doesn't track price movement for MM2 — there's no history feed behind the MM2 catalog, so I can't tell you whether **${item.NAME}** is rising or dropping.`,
          "",
          `What I do have is today's numbers: ${answerItemLookup(item, GAME).text.split("\n").slice(1).join(" · ")}`,
        ].join("\n"),
        intent,
        1,
        {
          sources: [MM2_SOURCE_LABELS.LOCAL_ENGINE, MM2_SOURCE_LABELS.CATALOG],
          structured: { kind: "item", item: toItemSummary(item), focus: "ALL" },
          extras: { navigation: { href: mm2ProfilePath(item), label: `Open ${item.NAME}` } },
        },
      ),
      { touchedItemIds: [item.ID] },
      "MARKET",
    );
  }

  if (intent === "explain_concept") {
    const explanation = explainMM2Concept(interpretation.normalized);
    if (!explanation) return null;
    return finish(local(explanation, intent, 1), {}, "EXPLAIN");
  }

  // --- single weapon -----------------------------------------------------
  if (intent === "item_value" || intent === "item_demand" || intent === "item_details") {
    const item = targetsFor(interpretation, context, 1)[0];
    if (!item) return null;

    const summary = toItemSummary(item);
    const extras = { navigation: { href: mm2ProfilePath(item), label: `Open ${item.NAME}` } };
    const touched = { touchedItemIds: [item.ID], lastValueSource: source };

    if (intent === "item_demand") {
      const text =
        interpretation.metric === "liquidity"
          ? `${describeMM2Tradeability(item)} CSBT has no trade-volume feed for MM2, so demand is the only signal behind that.`
          : answerItemDemand(item, GAME).text;

      return finish(
        local(text, intent, 1, {
          sources: [MM2_SOURCE_LABELS.LOCAL_ENGINE, MM2_SOURCE_LABELS.DEMAND],
          structured: { kind: "item", item: summary, focus: "DEMAND" },
          extras,
        }),
        touched,
        "DEMAND",
      );
    }

    if (intent === "item_details") {
      const bothSources = /\b(both|supreme (and|vs|or) gcash|gcash (and|vs|or) supreme|either source)\b/.test(
        interpretation.normalized,
      );
      const base = bothSources ? answerSourceCompare(item, GAME).text : answerItemLookup(item, GAME).text;
      const text = `${base}${siblingsNote(interpretation, item)}`;

      return finish(
        local(text, intent, 1, {
          sources: [MM2_SOURCE_LABELS.LOCAL_ENGINE, MM2_SOURCE_LABELS.SUPREME, MM2_SOURCE_LABELS.GCASH],
          structured: { kind: "item", item: summary, focus: "ALL" },
          extras,
        }),
        touched,
        "ITEM_LOOKUP",
      );
    }

    // item_value, plus the "harvester 950?" case where a price was floated.
    const base = answerItemValue(item, source, GAME).text;
    const quoted = interpretation.numeric.quoted;
    const actual = getMM2ItemValue(item, source);
    const text =
      quoted !== null && actual !== null
        ? `${base}\n\n${quotedPriceVerdict(quoted, actual, interpretation.discourse.isHearsay)}`
        : base;

    return finish(
      local(text, intent, 1, {
        sources: [MM2_SOURCE_LABELS.LOCAL_ENGINE, sourceLabelFor(source)],
        structured: { kind: "item", item: summary, focus: source === "GCASH" ? "GCASH" : "SUPREME" },
        extras,
      }),
      touched,
      source === "GCASH" ? "GCASH_LOOKUP" : "VALUE_LOOKUP",
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// The smart path
// ---------------------------------------------------------------------------

/**
 * Answer a message the deterministic interpreter could not read.
 *
 * The model is used as a *parser*: it says what the message meant, its reading
 * is checked against the catalog, and the resulting plain sentence is answered
 * by `routeMM2NichMessage` — the same function that answers everything else. No
 * value, verdict or weapon name in the reply originates with the model.
 *
 * Returns null when the model is no help either, which leaves the existing AI
 * text fallback exactly as it was.
 */
export async function routeMM2NichMessageWithModel(
  input: MM2BrainInput,
  ask: MM2SemanticAsk,
): Promise<MM2BrainResult | null> {
  assertGameContext(GAME, input.gameId, "routeMM2NichMessageWithModel");

  const direct = routeMM2NichMessage(input);
  if (direct) return direct;

  const context = input.context?.gameId === "mm2" ? input.context : createMM2Context();

  let result: Awaited<ReturnType<typeof interpretMM2MessageWithModel>> = null;
  try {
    result = await interpretMM2MessageWithModel(input.message, { gameId: GAME, context, ask });
  } catch {
    return null;
  }
  if (!result) return null;

  if (result.rewritten) {
    const rerun = routeMM2NichMessage({ ...input, context, message: result.rewritten });
    if (rerun) {
      // Provenance stays truthful: the data is local, the *reading* was not.
      const meta = rerun.response.meta;
      const response: NichResponse =
        meta && meta.gameId === "mm2"
          ? { ...rerun.response, meta: { ...meta, sources: [...meta.sources, MM2_SOURCE_LABELS.AI] } }
          : rerun.response;
      recordNichRoute({ gameId: GAME, channel: "AI", kind: "SEMANTIC_PARSE" });
      return { response, context: rerun.context };
    }
  }

  if (result.parse.rejected.length) {
    return {
      response: notFound(result.parse.rejected[0]),
      context: updateMM2Context(context, { lastUserMessage: input.message.slice(0, 500) }),
    };
  }

  if (result.parse.needsClarification && result.parse.question) {
    return {
      response: local(result.parse.question, "item_details", 0.9, {
        sources: [MM2_SOURCE_LABELS.AI, MM2_SOURCE_LABELS.CONTEXT],
        extras: { reaction: "searchEmpty" },
      }),
      context: updateMM2Context(context, { lastUserMessage: input.message.slice(0, 500) }),
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Trade answers
// ---------------------------------------------------------------------------

function tradeAnswer(
  interpretation: MM2Interpretation,
  trade: MM2TradeRead,
  source: MM2ValueSource,
  intent: MM2UserIntent,
): [NichResponse, Parameters<typeof updateMM2Context>[1], string] {
  const yours = tradeEntries(trade.yours);
  const theirs = tradeEntries(trade.theirs);

  const facts = buildMM2TradeFacts({
    yours,
    theirs,
    yourAdds: trade.yours.adds,
    theirAdds: trade.theirs.adds,
    source,
    gameId: GAME,
  });

  const parse: MM2TradeParse = {
    yourItems: yours.map((entry, index) => ({ id: `${entry.item.ID}-${index}`, item: entry.item, quantity: entry.quantity })),
    theirItems: theirs.map((entry, index) => ({ id: `${entry.item.ID}-${index}`, item: entry.item, quantity: entry.quantity })),
    issues: [],
    complete: true,
  };
  const href = mm2CalculatorHref(parse, source);

  const rows = (entries: MM2TradeEntry[]) =>
    entries.map((entry) => {
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

  /**
   * An unchanged trade recalled from memory gets the short form: the user is
   * asking about the same breakdown that is already on screen above.
   */
  const unchanged = trade.fromMemory && trade.how === "memory";
  const sections = [unchanged ? summariseMM2Trade(facts) : narrateMM2Trade(facts)];

  // "and adds" with no figure cannot be priced, and quietly ignoring it would
  // make the totals look more complete than they are.
  const vagueAdds =
    intent === "trade_wfl" &&
    hasConcept(interpretation.concepts, "ADDS") &&
    trade.yours.adds === null &&
    trade.theirs.adds === null &&
    !interpretation.wantsItemsForGap;
  if (vagueAdds) {
    sections.push("You mentioned adds but not what they are — tell me the weapons or a value and I'll fold them in.");
  }

  // "how much should he add?" is answered on top of the same verdict rather
  // than as a separate turn, because it is the same trade.
  const gap = mm2AddNeededForFair(facts);
  if (intent === "trade_adds" && gap) {
    /**
     * Answer for the side the user asked about, not the side that happens to
     * be behind. "How much should he add?" when *they* are already ahead has a
     * real answer — nothing — and saying it is more useful than quietly
     * answering a different question.
     */
    const askedAboutThem = /\b(he|she|they|him|her|them|their|his)\b/.test(interpretation.normalized);
    const askedAboutMe = /\b(i|me|my|mine)\b/.test(interpretation.normalized);
    const mismatch =
      (askedAboutThem && !askedAboutMe && gap.side === "yours") || (askedAboutMe && !askedAboutThem && gap.side === "theirs");

    if (mismatch) {
      sections.push(
        `They don't need to add anything — you're the one **${formatMM2Value(gap.amount)}** short of fair on this. If you want it even, that's what you'd be putting in.`,
      );
    } else {
      const side = gap.side === "yours" ? "You" : "They";
      sections.push(`${side}'d need about **${formatMM2Value(gap.amount)}** more ${MM2_VALUE_SOURCE_LABELS[source]} to bring this to fair.`);
    }

    if (interpretation.wantsItemsForGap) {
      const adds = findMM2AddsForGap(gap.amount, { source, limit: 5 }, GAME);
      if (adds.items.length) {
        sections.push(
          formatCatalogList(adds, {
            source,
            heading: `Weapons around that add value, highest demand first:`,
            showDemand: true,
          }),
        );
      }
    }
  } else if (gap && facts.gap < 0) {
    // Only worth saying when the user is the one down: telling somebody who is
    // already ahead what they could add is answering a question nobody has.
    sections.push(`About **${formatMM2Value(gap.amount)}** more from them would even it out, if you want to ask.`);
  }

  const response = local(sections.join("\n\n"), intent, 1, {
    sources: [MM2_SOURCE_LABELS.TRADE_ENGINE, sourceLabelFor(source), MM2_SOURCE_LABELS.DEMAND],
    structured: {
      kind: "trade",
      verdict: facts.evaluation.verdict,
      source,
      yours: rows(yours),
      theirs: rows(theirs),
      yourTotal: facts.yours.total,
      theirTotal: facts.theirs.total,
      difference: facts.evaluation.difference,
      differencePercent: facts.evaluation.differencePercent,
      missingCount: facts.evaluation.missingCount,
      missingNames: facts.evaluation.missingItems.map((item) => item.NAME),
      calculatorHref: href,
    },
    extras: { navigation: { href, label: "Open in MM2 Calculator" } },
  });

  return [
    response,
    {
      lastValueSource: source,
      touchedItemIds: [...yours, ...theirs].map((entry) => entry.item.ID),
      lastTrade: {
        valueSource: source,
        yourItemIds: yours.map((entry) => ({ id: entry.item.ID, quantity: entry.quantity })),
        theirItemIds: theirs.map((entry) => ({ id: entry.item.ID, quantity: entry.quantity })),
        yourAdds: trade.yours.adds,
        theirAdds: trade.theirs.adds,
      },
    },
    `TRADE_${facts.evaluation.verdict}`,
  ];
}

function quotedPriceVerdict(quoted: number, actual: number, hearsay: boolean): string {
  const difference = quoted - actual;
  const percent = Math.abs(difference) / Math.max(actual, 1) * 100;
  const lead = hearsay ? "Whoever told you that is off: " : "";

  if (percent <= 5) return `${lead}${formatMM2Value(quoted)} is right about there, so that's a fair number.`;
  if (difference > 0) return `${lead}${formatMM2Value(quoted)} is **${formatMM2Value(difference)} above** the catalog — that's an overpay unless you really want it.`;
  return `${lead}${formatMM2Value(quoted)} is **${formatMM2Value(-difference)} under** the catalog value.`;
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

/**
 * Turn "what can I get for this?" into a catalog query.
 *
 * The anchor — the value everything is measured against — comes from whichever
 * of these the user actually gave: a number, a weapon, the weapons they listed
 * as theirs, or the value the last recommendation was built around. If none of
 * them exist there is nothing to recommend *from*, and the brain declines
 * rather than picking an arbitrary band.
 */
function recommend(
  interpretation: MM2Interpretation,
  context: MM2NichContext,
  source: MM2ValueSource,
  intent: MM2UserIntent,
): [NichResponse, Parameters<typeof updateMM2Context>[1]] | null {
  const { numeric, category, minDemand } = interpretation;
  const limit = numeric.limit ?? 8;
  const anchorItem = interpretation.targets[0] ?? null;

  const inventory = itemsFromIds(context.inventoryItemIds);
  const inventoryTotal = inventory.length
    ? calculateMM2InventoryTotal(
        inventory.map((item) => ({ item, quantity: context.inventoryQuantities?.[item.ID] ?? 1 })),
        source,
        GAME,
      ).total
    : null;

  /**
   * "What can I get for all of them" is a question about the pile, not about
   * whichever weapon in it happened to be named first — so when the subject is
   * the user's own items, their combined value is the anchor.
   */
  const anchorValue =
    (intent === "inventory_target" ? inventoryTotal : null) ??
    (anchorItem ? getMM2ItemValue(anchorItem, source) : null) ??
    numeric.around ??
    context.lastTargetValue ??
    null;

  const budget =
    numeric.budgetAdd !== null && (inventoryTotal !== null || anchorValue !== null)
      ? (inventoryTotal ?? anchorValue ?? 0) + numeric.budgetAdd
      : null;

  const exclude = [
    ...(anchorItem ? [anchorItem.ID] : []),
    ...inventory.map((item) => item.ID),
  ];

  const filters = { source, category, minDemand, excludeIds: exclude, limit };
  const cheaper = hasConcept(interpretation.concepts, "CHEAPER");

  let result: MM2SearchResult | MM2CatalogResult | null = null;
  let heading = "";
  let lead: string | undefined;
  let showDemand = false;

  /**
   * "What can I afford if I add 200?" needs something to add *to*. Without a
   * weapon, a listed inventory or an earlier target, there is no starting
   * point, and picking one would be inventing the premise of the answer.
   */
  if (numeric.budgetAdd !== null && inventoryTotal === null && anchorValue === null) {
    return [
      local(
        `Happy to work that out — what are you starting with? Tell me the weapon (or weapons) you'd be putting in alongside the ${formatMM2Value(numeric.budgetAdd)} and I'll price the whole thing.`,
        intent,
        0.9,
        { extras: { reaction: "searchEmpty" } },
      ),
      {},
    ];
  }

  if (intent === "inventory_target" && inventoryTotal !== null) {
    const result = findMM2ItemsNearValue(
      inventoryTotal + (numeric.budgetAdd ?? 0),
      { ...filters, tolerance: (inventoryTotal + (numeric.budgetAdd ?? 0)) * 0.2 },
      GAME,
    );
    const total = inventoryTotal + (numeric.budgetAdd ?? 0);
    return [
      catalogResponse(result, {
        heading: `**Around ${formatMM2Value(total)} ${MM2_VALUE_SOURCE_LABELS[source]}**`,
        source,
        intent,
        lead: `Your ${inventory.length === 1 ? "weapon is" : "weapons are"} worth ${formatMM2Value(inventoryTotal)}${numeric.budgetAdd ? ` plus the ${formatMM2Value(numeric.budgetAdd)} you'd add` : ""}, so you're trading in this range:`,
      }),
      {
        lastValueSource: source,
        candidateItemIds: result.items.map((item) => item.ID),
        lastTargetValue: total,
      },
    ];
  }

  if (intent === "trade_upgrade" && anchorValue !== null) {
    result = findMM2UpgradeTargets(anchorValue, filters, GAME);
    heading = `**Upgrades from ${formatMM2Value(anchorValue)} ${MM2_VALUE_SOURCE_LABELS[source]}**`;
    lead = anchorItem ? `Trading up from ${anchorItem.NAME}:` : undefined;
  } else if (intent === "trade_downgrade" && anchorValue !== null) {
    result = findMM2DowngradeTargets(anchorValue, filters, GAME);
    heading = `**Downgrades from ${formatMM2Value(anchorValue)} ${MM2_VALUE_SOURCE_LABELS[source]}**`;
  } else if (cheaper && anchorItem) {
    result = findMM2SimilarItems(anchorItem, { source, direction: "cheaper", limit }, GAME);
    heading = `**Cheaper ${mm2CategoryOf(anchorItem)} weapons near ${anchorItem.NAME}**`;
  } else if (budget !== null) {
    result = findMM2ItemsNearValue(budget, { ...filters, tolerance: budget * 0.15 }, GAME);
    heading = `**Around ${formatMM2Value(budget)} ${MM2_VALUE_SOURCE_LABELS[source]}**`;
    lead = `With ${formatMM2Value(budget)} of value to work with:`;
  } else if (numeric.around !== null) {
    result = findMM2ItemsNearValue(numeric.around, { ...filters, tolerance: numeric.around * 0.2 }, GAME);
    heading = `**Around ${formatMM2Value(numeric.around)} ${MM2_VALUE_SOURCE_LABELS[source]}**`;

    /**
     * "Best demand around 300" often has no answer at all: demand 6+ weapons
     * cluster far above that. Rather than an empty list, drop the demand floor
     * and say that is what happened — the ranking is still by demand.
     */
    if (!result.items.length && minDemand !== null) {
      result = findMM2ItemsNearValue(
        numeric.around,
        { ...filters, minDemand: null, tolerance: numeric.around * 0.2 },
        GAME,
      );
      showDemand = true;
      lead = `Nothing around ${formatMM2Value(numeric.around)} is rated ${minDemand}/10 or higher, so here's what's there with its actual demand:`;
    }
  } else if (numeric.min !== null || numeric.max !== null) {
    result = queryMM2Catalog({
      gameId: GAME,
      source,
      category,
      minValue: numeric.min,
      maxValue: numeric.max,
      minDemand,
      sort: "value-desc",
      limit,
    });
    heading = `**MM2 weapons ${numeric.min !== null && numeric.max !== null ? `between ${formatMM2Value(numeric.min)} and ${formatMM2Value(numeric.max)}` : numeric.max !== null ? `under ${formatMM2Value(numeric.max)}` : `over ${formatMM2Value(numeric.min ?? 0)}`}** — ${MM2_VALUE_SOURCE_LABELS[source]}`;
  } else if (minDemand !== null || interpretation.metric === "demand" || interpretation.metric === "liquidity") {
    result = rankMM2ByDemand({ ...filters, minDemand: minDemand ?? 6 }, GAME);
    heading = `**Highest-demand MM2 weapons${category ? ` in ${category}` : ""}**`;
    showDemand = true;
    // "not too expensive" is a real constraint with no number behind it. Say so
    // rather than inventing a ceiling the user never gave.
    if (/\b(expensive|pricey|budget|cheap|afford)\b/.test(interpretation.normalized)) {
      lead = "Ranked by demand — give me a ceiling (“under 500”, say) and I'll trim it to what you can actually reach.";
    }
  } else if (anchorItem) {
    result = findMM2SimilarItems(anchorItem, { source, direction: "any", limit }, GAME);
    heading = `**${mm2CategoryOf(anchorItem)} weapons close to ${anchorItem.NAME}**`;
  } else if (category || hasConcept(interpretation.concepts, "SUPERLATIVE")) {
    const ascending = /\b(cheapest|lowest|least|worst)\b/.test(interpretation.normalized);
    result = queryMM2Catalog({
      gameId: GAME,
      source,
      category,
      sort: ascending ? "value-asc" : "value-desc",
      limit,
    });
    heading = `**${category ? `${category} weapons` : "MM2 weapons"}** — by ${ascending ? "lowest" : "highest"} ${MM2_VALUE_SOURCE_LABELS[source]}`;
  }

  if (!result) return null;

  if (!result.items.length) {
    return [
      local(
        `Nothing in the MM2 catalog matches that${category ? ` in ${category}` : ""}. Widen the range and I'll look again.`,
        intent,
        1,
        { extras: { reaction: "searchEmpty" } },
      ),
      {},
    ];
  }

  return [
    catalogResponse(result, { heading, source, showDemand, intent, lead }),
    {
      lastValueSource: source,
      candidateItemIds: result.items.map((item) => item.ID),
      touchedItemIds: result.items.slice(0, 3).map((item) => item.ID),
      ...(anchorValue !== null ? { lastTargetValue: anchorValue } : {}),
    },
  ];
}

// ---------------------------------------------------------------------------
// Concept explanations
// ---------------------------------------------------------------------------

/**
 * Short answers to "what does X mean?" for MM2 vocabulary.
 *
 * Deliberately small and factual. Anything not on this list is handed to the
 * AI fallback rather than improvised, because an invented definition of a
 * trading term is still an invented fact.
 */
const MM2_GLOSSARY: Array<{ match: RegExp; text: string }> = [
  {
    match: /\b(supreme value|supreme)\b/,
    text: "Supreme Value is the MM2 catalog's source value — it's the default scale CSBT prices MM2 weapons on, and the one the calculator opens with.",
  },
  {
    match: /\bgcash\b/,
    text: "GCash Value is the peso-denominated MM2 value. It's a separate scale from Supreme: CSBT never converts one into the other or averages them.",
  },
  {
    match: /\b(wfl|win fair lose)\b/,
    text: "W/F/L is Win / Fair / Lose. CSBT calls it fair when the two sides are within 5% of each other, and withholds the verdict entirely if any weapon in the trade has no value in the source you're using.",
  },
  {
    match: /\bdemand\b/,
    text: "Demand is a 0–10 rating in the MM2 catalog for how wanted a weapon is. It's separate from value — a cheap weapon can have high demand — and plenty of weapons are unrated, in which case I'll say so rather than guess.",
  },
  {
    match: /\b(godly|godlies|chroma|ancient|vintage)\b/,
    text: "Those are MM2 catalog categories — GODLY, ANCIENT, CHROMA, VINTAGE, LEGENDARY and so on. A category tells you what family a weapon is in, not what it's worth; ask me for values and I'll read the actual numbers.",
  },
  {
    match: /\b(overpay|underpay)\b/,
    text: "An overpay is giving more value than you get back; an underpay is the reverse. Traders often accept a small overpay for something in high demand — I'll tell you the size of the gap and let you decide.",
  },
];

function explainMM2Concept(normalized: string): string | null {
  return MM2_GLOSSARY.find((entry) => entry.match.test(normalized))?.text ?? null;
}

export type { MM2NichContext, MM2TradeParse };
export { interpretMM2Message };
