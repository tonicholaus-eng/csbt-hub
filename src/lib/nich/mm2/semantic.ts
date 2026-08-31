/**
 * What the user meant, for MM2.
 *
 * This is the layer the old MM2 brain did not have. Previously a message was
 * matched against a list of phrases and the first hit chose the answer, which
 * meant anything phrased outside the list fell through to "I don't have that
 * one as a straight catalog answer" — including messages whose meaning was
 * obvious from the conversation, like "would you?" two turns into a trade.
 *
 * Here a message is *interpreted* instead:
 *
 *   discourse   — is it a question, a follow-up, a correction, a denial?
 *   concepts    — which trading ideas are present, and how strongly?
 *   entities    — which real catalog weapons are named, and where?
 *   references  — what do "it", "those", "the first one" point at?
 *   state       — what were we already doing?
 *
 * and an intent is *scored* from all five. No single signal decides anything,
 * which is why "would you take that?" (opinion + reference + an active trade)
 * and "wfl" (explicit) both land on the same intent, and why "don't compare
 * harvester" lands on neither.
 *
 * The output is data, never prose. Every weapon in it is a real catalog row —
 * the interpreter can fail to find one, but it cannot invent one.
 */

import type { MM2ValueSource } from "../../../components/mm2/MM2TradeTypes";
import type { MM2CatalogItem } from "../../mm2/catalog";
import { analyzeDiscourse, type DiscourseAnalysis } from "../core/discourse";
import { clamp, extractNumbers, repairChatSpacing, type NumberMention } from "../core/text";
import type { NichGameId } from "../game/types";
import type { MM2Category } from "./aliases";
import type { MM2NichContext } from "./context";
import {
  activeEntities,
  scanMM2Entities,
  type MM2Entity,
  type MM2EntityAmbiguity,
  type MM2EntityScan,
} from "./entities";
import {
  conceptScore,
  detectMM2Concepts,
  expandMM2Shorthand,
  hasConcept,
  type MM2ConceptHits,
} from "./lexicon";
import { getMM2ItemById, resolveMM2Item } from "./resolver";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MM2UserIntent =
  | "item_value"
  | "item_demand"
  | "item_details"
  | "compare_items"
  | "trade_wfl"
  | "trade_adds"
  | "trade_target"
  | "trade_upgrade"
  | "trade_downgrade"
  | "inventory_value"
  | "inventory_target"
  | "recommend_item"
  | "market_question"
  | "explain_concept"
  | "follow_up"
  | "correction"
  | "casual_conversation"
  | "help"
  | "unknown";

/** One side of a trade, as read out of a sentence. */
export type MM2TradeSideRead = {
  entities: MM2Entity[];
  /** Raw value the user said would be added ("+200"), in the active source. */
  adds: number | null;
};

export type MM2TradeRead = {
  yours: MM2TradeSideRead;
  theirs: MM2TradeSideRead;
  /** Both sides carry something. Only a complete read may produce a verdict. */
  complete: boolean;
  /** True when the sides came from remembered state rather than this message. */
  fromMemory: boolean;
  /** How the sides were worked out, for the debug panel. */
  how: "markers" | "split" | "memory" | "modified" | "none";
};

export type MM2NumericRead = {
  around: number | null;
  min: number | null;
  max: number | null;
  /** A price the user floated ("harvester 950?"). Never treated as data. */
  quoted: number | null;
  /** Value the user says they can add on top of what they already have. */
  budgetAdd: number | null;
  limit: number | null;
  percent: number | null;
};

export type MM2ResolvedReference = {
  kind: "single" | "group" | "ordinal" | "mine" | "theirs" | "other";
  phrase: string;
  items: MM2CatalogItem[];
  /** Where the items came from, so a stale reference can be explained. */
  from: "recent" | "comparison" | "candidates" | "inventory" | "trade" | "none";
};

export type MM2Interpretation = {
  raw: string;
  cleaned: string;
  normalized: string;
  primaryIntent: MM2UserIntent;
  secondaryIntents: MM2UserIntent[];
  confidence: number;
  /** FAST when a high-confidence deterministic read was available immediately. */
  path: "FAST" | "SMART";

  discourse: DiscourseAnalysis;
  concepts: MM2ConceptHits;
  scan: MM2EntityScan;

  /** Weapons the answer should be about, after references are resolved. */
  targets: MM2CatalogItem[];
  ambiguities: MM2EntityAmbiguity[];
  unresolved: string[];
  references: MM2ResolvedReference[];

  metric: "value" | "demand" | "liquidity" | "details" | null;
  source: MM2ValueSource | null;
  category: MM2Category | null;
  minDemand: number | null;
  numeric: MM2NumericRead;
  trade: MM2TradeRead | null;
  /** "what should he add" wants weapons; "how much should he add" wants a number. */
  wantsItemsForGap: boolean;
  /** The user is telling me what they own, not asking about it. */
  declaresInventory: boolean;
  /** Set when the message is a correction; the weapon it swaps *in*. */
  correctionTarget: MM2CatalogItem | null;
  /** The chroma twin of the weapon under discussion, when the user asked for it. */
  variantSwitch: MM2CatalogItem | null;
  /** Set when they asked for a chroma that does not exist, so the answer can say so. */
  variantMissingFor: MM2CatalogItem | null;

  scores: Array<{ intent: MM2UserIntent; score: number; why: string[] }>;
  debug: string[];
};

// ---------------------------------------------------------------------------
// Value source
// ---------------------------------------------------------------------------

const GCASH_WORDS = /\b(gcash|g cash|cash|php|peso|pesos)\b/;
const SUPREME_WORDS = /\b(supreme|source value|source values|sv)\b/;

export function readValueSource(normalized: string): MM2ValueSource | null {
  if (GCASH_WORDS.test(normalized)) return "GCASH";
  if (SUPREME_WORDS.test(normalized)) return "SUPREME";
  return null;
}

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

const AROUND = /\b(around|near|about|close to|roughly|approximately|similar to|same as|like)\s*$/;
const UNDER = /\b(under|below|less than|cheaper than|at most|up to|max|maximum|within)\s*$/;
const OVER = /\b(over|above|more than|at least|higher than|minimum|min)\s*$/;
const BETWEEN = /\b(between|from)\b/;
const ADD_CUE = /\b(add|adds|adding|plus|throw in|throws in|on top|more)\s*$/;

function readNumbers(tokens: string[], numbers: NumberMention[], entities: MM2Entity[]): MM2NumericRead {
  const read: MM2NumericRead = {
    around: null,
    min: null,
    max: null,
    quoted: null,
    budgetAdd: null,
    limit: null,
    percent: null,
  };

  const quantityIndexes = new Set(entities.map((entity) => entity.start - 1));
  const joined = tokens.join(" ");

  const ordered = numbers.filter((mention) => !quantityIndexes.has(mention.index));

  if (BETWEEN.test(joined) && ordered.length >= 2) {
    const [low, high] = [...ordered.map((mention) => mention.value)].sort((a, b) => a - b);
    read.min = low;
    read.max = high;
    return read;
  }

  for (const mention of ordered) {
    const before = tokens.slice(Math.max(0, mention.index - 3), mention.index).join(" ");

    if (mention.percent) {
      read.percent = mention.value;
      continue;
    }
    if (UNDER.test(before)) {
      read.max = mention.value;
      continue;
    }
    if (OVER.test(before)) {
      read.min = mention.value;
      continue;
    }
    if (AROUND.test(before)) {
      read.around = mention.value;
      continue;
    }
    if (ADD_CUE.test(before)) {
      read.budgetAdd = mention.value;
      continue;
    }

    // A small integer next to a list request is a count, not a value.
    if (Number.isInteger(mention.value) && mention.value <= 25 && !mention.scaled && /\b(give me|show me|top|best|list|options)\b/.test(joined)) {
      read.limit = mention.value;
      continue;
    }

    read.quoted = mention.value;
  }

  return read;
}

// ---------------------------------------------------------------------------
// Trade reading
// ---------------------------------------------------------------------------

const YOUR_MARKERS = new Set(["my", "mine", "i", "im", "ako", "akin", "me", "we"]);
const THEIR_MARKERS = new Set(["his", "her", "hers", "their", "theirs", "they", "he", "she", "them", "kanya", "kanila"]);
const SPLIT_TOKENS = new Set(["for", "vs", "versus", "against"]);
const REMOVE_CUE = /\b(remove|removes|removed|take out|takes out|drop|drops|dropped|without|minus|takes off|take off)\b/;

type SideLabel = "yours" | "theirs";

function markerSides(tokens: string[]): Array<{ index: number; side: SideLabel }> {
  const markers: Array<{ index: number; side: SideLabel }> = [];
  tokens.forEach((token, index) => {
    if (YOUR_MARKERS.has(token)) markers.push({ index, side: "yours" });
    else if (THEIR_MARKERS.has(token)) markers.push({ index, side: "theirs" });
  });
  return markers;
}

function nearestMarker(
  markers: Array<{ index: number; side: SideLabel }>,
  position: number,
): { index: number; side: SideLabel } | null {
  let found: { index: number; side: SideLabel } | null = null;
  for (const marker of markers) {
    if (marker.index < position) found = marker;
    else break;
  }
  return found;
}

/**
 * Which side a word at `position` belongs to.
 *
 * A possessive claims everything after it *until the trade splits*. That
 * qualifier is the whole trick: in "what if I trade both for batwing", the "I"
 * would otherwise claim Batwing as well, and the trade would be read as the
 * user giving away both sides.
 */
function sideAt(
  markers: Array<{ index: number; side: SideLabel }>,
  splitIndex: number,
  position: number,
): SideLabel | null {
  const marker = nearestMarker(markers, position);
  const splitBetween = splitIndex >= 0 && splitIndex > (marker?.index ?? -1) && splitIndex < position;

  if (marker && !splitBetween) return marker.side;
  if (splitIndex >= 0) return position < splitIndex ? "yours" : "theirs";
  return marker?.side ?? null;
}

/**
 * Work out who is giving what.
 *
 * Side markers are read per *entity* rather than per clause, which is what
 * makes "he offered corrupt and batwing for my harvester" come out right: the
 * weapons on the left belong to them because "he offered" precedes them, even
 * though they sit on the left of the word "for". A single "for" split — the old
 * behaviour — gets that backwards, and a backwards trade produces a confident
 * verdict with the sides swapped.
 */
function readTradeSides(
  tokens: string[],
  entities: MM2Entity[],
  numbers: MM2NumericRead,
  allNumbers: NumberMention[],
): MM2TradeRead | null {
  const usable = entities.filter((entity) => !entity.negated);
  if (!usable.length) return null;

  const markers = markerSides(tokens);
  const splitIndex = tokens.findIndex((token) => SPLIT_TOKENS.has(token));

  const yours: MM2Entity[] = [];
  const theirs: MM2Entity[] = [];
  let how: MM2TradeRead["how"] = "none";

  for (const entity of usable) {
    const side = sideAt(markers, splitIndex, entity.start);
    if (side) {
      how = markers.length ? "markers" : "split";
      (side === "yours" ? yours : theirs).push(entity);
      continue;
    }
    yours.push(entity);
  }

  if (!yours.length || !theirs.length) {
    return {
      yours: { entities: yours, adds: null },
      theirs: { entities: theirs, adds: null },
      complete: false,
      fromMemory: false,
      how,
    };
  }

  // Loose numbers become adds on the side of the weapon they follow.
  const quantityIndexes = new Set(usable.map((entity) => entity.start - 1));
  let yourAdds: number | null = null;
  let theirAdds: number | null = null;

  for (const mention of allNumbers) {
    if (quantityIndexes.has(mention.index)) continue;
    if (mention.percent) continue;
    if (mention.value === numbers.limit) continue;

    const marked = sideAt(markers, splitIndex, mention.index);
    const lastEntityBefore = [...usable].filter((entity) => entity.end <= mention.index).pop();
    const side: SideLabel =
      marked ?? (lastEntityBefore && theirs.includes(lastEntityBefore) ? "theirs" : lastEntityBefore ? "yours" : "theirs");

    if (side === "yours") yourAdds = (yourAdds ?? 0) + mention.value;
    else theirAdds = (theirAdds ?? 0) + mention.value;
  }

  return {
    yours: { entities: yours, adds: yourAdds },
    theirs: { entities: theirs, adds: theirAdds },
    complete: true,
    fromMemory: false,
    how,
  };
}

/** Rebuild the remembered trade as entity-shaped sides. */
function tradeFromMemory(context: MM2NichContext): MM2TradeRead | null {
  const remembered = context.lastTrade;
  if (!remembered) return null;

  const toEntities = (rows: Array<{ id: string; quantity: number }>): MM2Entity[] =>
    rows.flatMap((row) => {
      const item = getMM2ItemById(row.id);
      if (!item) return [];
      return [
        {
          item,
          phrase: item.NAME.toLowerCase(),
          start: -1,
          end: -1,
          quantity: row.quantity,
          confidence: 1,
          kind: "exact-id" as const,
          negated: false,
        },
      ];
    });

  const yours = toEntities(remembered.yourItemIds);
  const theirs = toEntities(remembered.theirItemIds);
  if (!yours.length && !theirs.length) return null;

  return {
    yours: { entities: yours, adds: remembered.yourAdds ?? null },
    theirs: { entities: theirs, adds: remembered.theirAdds ?? null },
    complete: yours.length > 0 && theirs.length > 0,
    fromMemory: true,
    how: "memory",
  };
}

/**
 * Apply "what if they add X" / "what if we drop Y" to the remembered trade.
 *
 * Returns null when the message does not actually modify anything, so a plain
 * follow-up is not mistaken for an edit.
 */
function modifyRememberedTrade(
  base: MM2TradeRead,
  tokens: string[],
  entities: MM2Entity[],
  numbers: NumberMention[],
  normalized: string,
): MM2TradeRead | null {
  const markers = markerSides(tokens);
  const splitIndex = tokens.findIndex((token) => SPLIT_TOKENS.has(token));
  const removing = REMOVE_CUE.test(normalized);

  const yours = { entities: [...base.yours.entities], adds: base.yours.adds };
  const theirs = { entities: [...base.theirs.entities], adds: base.theirs.adds };
  let changed = false;

  for (const entity of entities) {
    if (entity.negated) continue;
    const side = sideAt(markers, splitIndex, entity.start);

    if (removing) {
      const dropFrom = (target: MM2TradeSideRead) => {
        const next = target.entities.filter((existing) => existing.item.ID !== entity.item.ID);
        if (next.length !== target.entities.length) {
          target.entities = next;
          changed = true;
          return true;
        }
        return false;
      };
      if (side === "yours") dropFrom(yours);
      else if (side === "theirs") dropFrom(theirs);
      else if (!dropFrom(yours)) dropFrom(theirs);
      continue;
    }

    const target = side === "yours" ? yours : side === "theirs" ? theirs : null;
    if (!target) continue;
    if (target.entities.some((existing) => existing.item.ID === entity.item.ID)) continue;
    target.entities = [...target.entities, entity];
    changed = true;
  }

  const quantityIndexes = new Set(entities.map((entity) => entity.start - 1));
  for (const mention of numbers) {
    if (quantityIndexes.has(mention.index) || mention.percent) continue;
    const side = sideAt(markers, splitIndex, mention.index) ?? "theirs";
    const target = side === "yours" ? yours : theirs;
    target.adds = removing ? null : mention.value;
    changed = true;
  }

  if (!changed) return null;

  return {
    yours,
    theirs,
    complete: yours.entities.length > 0 && theirs.entities.length > 0,
    fromMemory: true,
    how: "modified",
  };
}

// ---------------------------------------------------------------------------
// References
// ---------------------------------------------------------------------------

function itemsFromIds(ids: readonly string[] | undefined): MM2CatalogItem[] {
  return (ids ?? []).flatMap((id) => {
    const item = getMM2ItemById(id);
    return item ? [item] : [];
  });
}

function resolveReferences(discourse: DiscourseAnalysis, context: MM2NichContext): MM2ResolvedReference[] {
  const recent = itemsFromIds(context.recentItemIds);
  const comparison = itemsFromIds(context.comparisonItemIds);
  const candidates = itemsFromIds(context.candidateItemIds);
  const inventory = itemsFromIds(context.inventoryItemIds);

  return discourse.references.map((reference): MM2ResolvedReference => {
    switch (reference.kind) {
      case "ordinal": {
        const pool = candidates.length ? candidates : recent;
        const index = reference.ordinal === -1 ? pool.length - 1 : (reference.ordinal ?? 0);
        const item = pool[index];
        return {
          kind: "ordinal",
          phrase: reference.phrase,
          items: item ? [item] : [],
          from: candidates.length ? "candidates" : recent.length ? "recent" : "none",
        };
      }
      case "group": {
        if (comparison.length >= 2) return { kind: "group", phrase: reference.phrase, items: comparison, from: "comparison" };
        if (inventory.length >= 2) return { kind: "group", phrase: reference.phrase, items: inventory, from: "inventory" };
        return { kind: "group", phrase: reference.phrase, items: recent.slice(0, 3), from: recent.length ? "recent" : "none" };
      }
      case "other": {
        const pool = comparison.length ? comparison : recent;
        const focused = recent[0];
        const other = pool.find((item) => item.ID !== focused?.ID);
        return { kind: "other", phrase: reference.phrase, items: other ? [other] : [], from: pool.length ? "recent" : "none" };
      }
      case "mine": {
        const items = itemsFromIds(context.lastTrade?.yourItemIds.map((row) => row.id));
        return { kind: "mine", phrase: reference.phrase, items, from: items.length ? "trade" : "none" };
      }
      case "theirs": {
        const items = itemsFromIds(context.lastTrade?.theirItemIds.map((row) => row.id));
        return { kind: "theirs", phrase: reference.phrase, items, from: items.length ? "trade" : "none" };
      }
      default: {
        const item = recent[0];
        return { kind: "single", phrase: reference.phrase, items: item ? [item] : [], from: item ? "recent" : "none" };
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Intent scoring
// ---------------------------------------------------------------------------

type Score = { intent: MM2UserIntent; score: number; why: string[] };

function add(scores: Map<MM2UserIntent, Score>, intent: MM2UserIntent, amount: number, why: string) {
  const current = scores.get(intent) ?? { intent, score: 0, why: [] };
  current.score += amount;
  current.why.push(`${why} (+${amount.toFixed(2)})`);
  scores.set(intent, current);
}

const INTENT_THRESHOLD = 0.85;
const SECONDARY_THRESHOLD = 0.8;

// ---------------------------------------------------------------------------
// Interpretation
// ---------------------------------------------------------------------------

export type MM2InterpretOptions = {
  gameId: NichGameId;
  context: MM2NichContext;
};

export function interpretMM2Message(rawMessage: string, options: MM2InterpretOptions): MM2Interpretation {
  const context = options.context;
  const raw = String(rawMessage ?? "");
  const cleaned = repairChatSpacing(raw);
  const discourse = analyzeDiscourse(cleaned);
  const normalized = expandMM2Shorthand(discourse.normalized);
  const tokens = normalized ? normalized.split(" ") : [];

  const concepts = detectMM2Concepts(normalized, discourse.negatedSpans);
  const scan = scanMM2Entities(normalized, {
    gameId: options.gameId,
    contextItemIds: context.recentItemIds,
    userAliases: context.aliases,
    negatedSpans: discourse.negatedSpans,
  });

  const named = activeEntities(scan);
  const allNumbers = extractNumbers(normalized);
  const numeric = readNumbers(tokens, allNumbers, named);
  const references = resolveReferences(discourse, context);
  const debug: string[] = [];

  // --- source, category, demand floor -------------------------------------
  const source = readValueSource(normalized);
  const category = scan.categories[0] ?? null;
  const minDemand = /\b(high demand|good demand|strong demand|best demand|decent demand)\b/.test(normalized) ? 6 : null;

  // --- corrections --------------------------------------------------------
  let correctionTarget: MM2CatalogItem | null = null;
  if (discourse.correction) {
    const resolution = resolveMM2Item(discourse.correction.replacement, {
      gameId: options.gameId,
      contextItemIds: context.recentItemIds,
      userAliases: context.aliases,
    });
    if (resolution.status === "resolved") {
      correctionTarget = resolution.item;
      debug.push(`correction → ${resolution.item.NAME}`);
    }
  }

  /**
   * "what if mine is chroma".
   *
   * Chroma is the one MM2 category that exists as a *variant* of a named
   * weapon, so a bare "chroma" in a follow-up usually means the chroma version
   * of whatever we are discussing. It is resolved against the catalog like any
   * other name — 44 weapons have a chroma twin and most do not, so this either
   * finds a real row or leaves the subject alone.
   */
  let chromaSwitch: MM2CatalogItem | null = null;
  let chromaMissingFor: MM2CatalogItem | null = null;
  // Only when they pointed at something ("mine is chroma"). A bare "chroma" is
  // a category browse, and turning that into a variant lookup would answer a
  // question about a weapon the user never mentioned.
  const pointsAtSubject = discourse.references.length > 0 || /\b(mine|it|its|that|this|his|her|hers|theirs)\b/.test(discourse.normalized);
  if (scan.categories.includes("CHROMA") && !named.length && pointsAtSubject) {
    const subject = references.flatMap((reference) => reference.items)[0] ?? itemsFromIds(context.recentItemIds)[0] ?? null;
    if (subject && !/^chroma /i.test(subject.NAME)) {
      const variant = resolveMM2Item(`chroma ${subject.NAME}`, { gameId: options.gameId });
      if (variant.status === "resolved") {
        chromaSwitch = variant.item;
        debug.push(`chroma variant → ${variant.item.NAME}`);
      } else {
        chromaMissingFor = subject;
        debug.push(`no chroma variant of ${subject.NAME}`);
      }
    }
  }

  // --- trade reading ------------------------------------------------------
  /**
   * References take part in a trade exactly like named weapons do.
   *
   * "what if I trade both for batwing" has one weapon in the text and two in
   * the conversation. Placing the resolved reference back at the position of
   * the word "both" is what lets the side reader work out that they are on the
   * giving side — position is the whole basis of side assignment, so a
   * reference without one cannot participate.
   */
  const referenceEntities: MM2Entity[] = references.flatMap((reference) => {
    const at = tokens.indexOf(reference.phrase.split(" ")[0]);
    if (at < 0) return [];
    return reference.items.map((item) => ({
      item,
      phrase: reference.phrase,
      start: at,
      end: at + 1,
      quantity: 1,
      confidence: 0.8,
      kind: "context" as const,
      negated: false,
    }));
  });

  const mentions = [...named, ...referenceEntities].sort((a, b) => a.start - b.start);

  const remembered = tradeFromMemory(context);
  let trade = readTradeSides(tokens, mentions, numeric, allNumbers);

  if ((!trade || !trade.complete) && remembered) {
    const modified = modifyRememberedTrade(remembered, tokens, named, allNumbers, normalized);
    if (modified) {
      trade = modified;
      debug.push(`trade modified from memory (${modified.how})`);
    } else if (
      !named.length &&
      (discourse.asksForOpinion ||
        hasConcept(concepts, "TRADE_JUDGEMENT") ||
        hasConcept(concepts, "ADDS") ||
        // "give me options" belongs to the trade on the table, not to a new browse.
        hasConcept(concepts, "LIST"))
    ) {
      trade = remembered;
      debug.push("trade recalled from memory");
    }
  }

  // --- targets ------------------------------------------------------------
  const referencedItems = references.flatMap((reference) => reference.items);
  const targets: MM2CatalogItem[] = [];
  const pushTarget = (item: MM2CatalogItem) => {
    if (!targets.some((existing) => existing.ID === item.ID)) targets.push(item);
  };
  if (correctionTarget) pushTarget(correctionTarget);
  if (chromaSwitch) pushTarget(chromaSwitch);
  for (const entity of named) pushTarget(entity.item);
  for (const item of referencedItems) pushTarget(item);

  // --- metric -------------------------------------------------------------
  const metric: MM2Interpretation["metric"] = hasConcept(concepts, "DEMAND")
    ? "demand"
    : hasConcept(concepts, "LIQUIDITY")
      ? "liquidity"
      : hasConcept(concepts, "VALUE")
        ? "value"
        : hasConcept(concepts, "DETAILS")
          ? "details"
          : null;

  // --- scoring ------------------------------------------------------------
  const scores = new Map<MM2UserIntent, Score>();
  const entityCount = named.length;
  const referenceCount = referencedItems.length;
  const knownCount = targets.length;

  if (discourse.isGreeting && tokens.length <= 5) add(scores, "casual_conversation", 1.4, "greeting");
  if (discourse.isThanks && tokens.length <= 5) add(scores, "casual_conversation", 1.2, "thanks");
  if (discourse.isHelpRequest) add(scores, "help", 1.3, "asked what I can do");

  // Trades
  const judgement = conceptScore(concepts, "TRADE_JUDGEMENT");
  if (judgement) add(scores, "trade_wfl", judgement, "explicit win/fair/lose wording");
  if (trade?.complete && !trade.fromMemory) add(scores, "trade_wfl", 1.1, "two trade sides were read from the message");
  if (trade?.complete && trade.fromMemory) add(scores, "trade_wfl", 0.9, "an active trade is in memory");
  if (discourse.asksForOpinion && (trade?.complete || context.lastTrade)) {
    add(scores, "trade_wfl", 0.8, "opinion asked while a trade is on the table");
  }
  if (hasConcept(concepts, "TRADE_STRUCTURE") && entityCount >= 2 && trade?.complete) {
    add(scores, "trade_wfl", 0.5, "trade structure with weapons on both sides");
  }

  if (trade?.how === "modified") add(scores, "trade_wfl", 1.1, "the remembered trade was edited");
  if (hasConcept(concepts, "ADDS") && (trade?.complete || context.lastTrade)) {
    add(scores, "trade_adds", conceptScore(concepts, "ADDS") + 0.5, "asked about adds on an active trade");
  }
  if (numeric.percent !== null && trade?.complete) add(scores, "trade_adds", 0.3, "a percentage was quoted against a trade");
  /**
   * "give me options" right after a verdict is a request for adds, not a fresh
   * catalog browse — there is a gap on the table and that is what options are
   * for. Without an open trade the same words mean the browse.
   */
  if (conceptScore(concepts, "LIST") && !entityCount && context.lastTrade && numeric.around === null && numeric.min === null && numeric.max === null) {
    add(scores, "trade_adds", 1.0, "asked for options while a trade is open");
  }

  // Comparison
  const compare = conceptScore(concepts, "COMPARE");
  if (compare && knownCount >= 2) add(scores, "compare_items", compare + 0.6, "comparative wording with two weapons");
  if (compare && knownCount === 1 && (context.comparisonItemIds?.length ?? 0) >= 1) {
    add(scores, "compare_items", compare + 0.2, "comparative wording continuing an earlier comparison");
  }
  /**
   * "which has better demand?" names nothing at all. On its own that reads as a
   * single-item question; with two weapons already compared it is obviously the
   * same pair again, and only the conversation state knows that.
   */
  const comparablePool =
    (context.comparisonItemIds?.length ?? 0) >= 2
      ? context.comparisonItemIds ?? []
      : (context.inventoryItemIds?.length ?? 0) >= 2
        ? context.inventoryItemIds ?? []
        : (context.candidateItemIds?.length ?? 0) >= 2
          ? context.candidateItemIds ?? []
          : [];

  if (compare && knownCount === 0 && comparablePool.length >= 2) {
    add(scores, "compare_items", compare + 0.5, "comparative wording with a remembered set");
  }
  /**
   * "what about demand?" straight after a comparison is still that comparison.
   * The words changed the metric, not the subject.
   */
  if (metric && !entityCount && referenceCount === 0 && context.lastSemanticIntent === "compare_items" && (context.comparisonItemIds?.length ?? 0) >= 2) {
    add(scores, "compare_items", 1.05, "a metric follow-up on the pair just compared");
  }
  if (!compare && entityCount >= 2 && !trade?.complete && !hasConcept(concepts, "INVENTORY") && !hasConcept(concepts, "TOTAL")) {
    add(scores, "compare_items", 0.9, "two weapons named side by side");
  }

  // Single-item questions
  if (metric === "value" && knownCount >= 1) add(scores, "item_value", conceptScore(concepts, "VALUE") + 0.4, "value wording with a weapon");
  if (metric === "demand" && knownCount >= 1) add(scores, "item_demand", conceptScore(concepts, "DEMAND") + 0.4, "demand wording with a weapon");
  if (metric === "liquidity" && knownCount >= 1) add(scores, "item_demand", conceptScore(concepts, "LIQUIDITY") + 0.3, "tradeability question about a weapon");
  if (metric === "details" && knownCount >= 1) add(scores, "item_details", 1.2, "asked for a weapon's details");

  /**
   * A question about something the catalog does not contain is still that
   * question. Scoring it keeps the answer as "I couldn't find X" rather than a
   * shrug — and, for a cross-game name like "frost dragon", that honest miss is
   * the whole safety property.
   */
  const tradeShape =
    tokens.some((token) => SPLIT_TOKENS.has(token)) &&
    tokens.some((token) => YOUR_MARKERS.has(token)) &&
    tokens.some((token) => THEIR_MARKERS.has(token));

  if (scan.unresolved.length && tradeShape) {
    add(scores, "trade_wfl", 1.0, "a name I couldn't match inside a trade sentence");
  } else if (scan.unresolved.length && !knownCount && (metric !== null || tokens.length <= 4)) {
    add(scores, metric === "demand" ? "item_demand" : "item_value", 1.0, "asked about a name that is not in the catalog");
  }

  // A bare weapon name, or a weapon plus a floated price, is a lookup.
  if (entityCount === 1 && !metric && !trade?.complete && tokens.length <= 6) {
    add(scores, "item_details", 0.95, "a weapon named on its own");
  }
  if (numeric.quoted !== null && knownCount >= 1 && !trade?.complete) {
    add(scores, "item_value", 1.0, "a price was floated against a weapon");
  }

  // Recommendations
  const recommend = conceptScore(concepts, "RECOMMEND");
  const superlative = conceptScore(concepts, "SUPERLATIVE");
  const list = conceptScore(concepts, "LIST");
  const hasRange = numeric.around !== null || numeric.min !== null || numeric.max !== null;

  if (recommend) add(scores, "recommend_item", recommend, "asked what they can get");
  if (hasRange && (recommend || list || superlative || !knownCount)) {
    add(scores, "recommend_item", 0.9, "a value range was given");
  }
  if (superlative && (list || category || metric === "value" || metric === "demand")) {
    add(scores, "recommend_item", superlative, "asked for a ranked list");
  }
  if (list && (category || hasRange || minDemand !== null)) add(scores, "recommend_item", list, "asked to be shown a set");
  if (minDemand !== null && !knownCount) add(scores, "recommend_item", 0.9, "asked for high-demand weapons");
  if (hasConcept(concepts, "CHEAPER") && knownCount >= 1) add(scores, "recommend_item", 1.0, "asked for a cheaper equivalent");

  // A category on its own ("chroma", "godlies") is a browse request.
  if (category && !entityCount && !knownCount && tokens.length <= 3) {
    add(scores, "recommend_item", 0.95, "a bare category, read as a browse");
  }

  /**
   * "What should I trade first?", "which is my best item?" — ranking the
   * user's own pile. It is a comparison, and the set is the one they listed.
   */
  if (
    (context.inventoryItemIds?.length ?? 0) >= 2 &&
    /\b(first|start with|best item|worst item|weakest|strongest|which one should i|what should i trade)\b/.test(normalized)
  ) {
    add(scores, "compare_items", 1.1, "asked to rank the weapons they listed");
  }

  if (hasConcept(concepts, "UPGRADE")) add(scores, "trade_upgrade", conceptScore(concepts, "UPGRADE") + 0.3, "upgrade wording");
  if (hasConcept(concepts, "DOWNGRADE")) add(scores, "trade_downgrade", conceptScore(concepts, "DOWNGRADE") + 0.3, "downgrade wording");

  // Inventory
  const declaresInventory =
    hasConcept(concepts, "INVENTORY") && entityCount >= 1 && !discourse.isPastTense && !discourse.isHypothetical;
  if (declaresInventory) add(scores, "inventory_value", 1.1, "the user listed what they own");
  if (hasConcept(concepts, "TOTAL") && (entityCount >= 2 || (context.inventoryItemIds?.length ?? 0) >= 1 || referenceCount >= 2)) {
    add(scores, "inventory_value", 1.8, "asked for a combined total");
  }
  if ((recommend || hasConcept(concepts, "AFFORD")) && (context.inventoryItemIds?.length ?? 0) >= 1 && !entityCount) {
    add(scores, "inventory_target", recommend + 0.6, "asked what their listed items can get");
  }

  // Everything else
  if (hasConcept(concepts, "MARKET")) add(scores, "market_question", conceptScore(concepts, "MARKET") + 0.2, "asked about market movement");
  if (hasConcept(concepts, "EXPLAIN") && !knownCount) add(scores, "explain_concept", 1.0, "asked for an explanation");

  const listIntents: MM2UserIntent[] = ["recommend_item", "trade_upgrade", "trade_downgrade", "inventory_target"];
  const pointsAtOne = references.some((reference) => reference.kind === "ordinal" || reference.kind === "single");
  const afterAList = context.lastSemanticIntent ? listIntents.includes(context.lastSemanticIntent) : false;

  // Follow-ups inherit the previous intent when they carry nothing else.
  const bareFollowUp =
    (discourse.isFollowUpOpener || referenceCount > 0) && !entityCount && !metric && !recommend && !judgement;

  if (bareFollowUp && pointsAtOne && afterAList && referencedItems.length) {
    /**
     * "the first one" after a list is a request about that weapon, not a
     * request for the list again. Inheriting the previous intent here would
     * reprint the options the user just picked from.
     */
    add(scores, "item_details", 1.1, "picked one weapon out of the last list");
  } else if (bareFollowUp && context.lastSemanticIntent) {
    add(scores, context.lastSemanticIntent, 0.9, "a follow-up continuing the previous question");
  }

  // A follow-up that names a metric but no weapon reuses what we were discussing.
  if (
    metric &&
    !entityCount &&
    referenceCount === 0 &&
    tokens.length <= 6 &&
    // "something easier to trade" is a request for options, not a question
    // about the weapon we happened to be on.
    !recommend &&
    !list &&
    // …and "frost dragon value" is a question about frost dragon, even mid
    // conversation. Falling back to the last weapon would answer it with
    // somebody else's numbers.
    !scan.unresolved.length &&
    (context.recentItemIds?.length ?? 0) >= 1
  ) {
    const intent: MM2UserIntent = metric === "demand" || metric === "liquidity" ? "item_demand" : metric === "details" ? "item_details" : "item_value";
    add(scores, intent, 0.95, "a metric follow-up on the weapon already under discussion");
    pushTarget(itemsFromIds(context.recentItemIds)[0]);
  }

  /**
   * A bare value source — "gcash?", "supreme" — switches the source on whatever
   * is already under discussion. It carries no verb, no weapon and no question
   * word, so nothing else in the scorer can see it.
   */
  if (source && !entityCount && tokens.length <= 3 && (context.recentItemIds?.length ?? 0) >= 1) {
    const intent = context.lastSemanticIntent && context.lastSemanticIntent !== "unknown" ? context.lastSemanticIntent : "item_value";
    add(scores, intent, 0.95, "a bare value source, applied to the weapon in hand");
  }

  if (discourse.correction && correctionTarget) {
    add(scores, "correction", 1.3, "the user corrected the weapon");
  }

  const ranked = [...scores.values()].sort((a, b) => b.score - a.score);
  const best = ranked[0];

  let primaryIntent: MM2UserIntent = best && best.score >= INTENT_THRESHOLD ? best.intent : "unknown";
  const secondaryIntents = ranked
    .slice(1)
    .filter((entry) => entry.score >= SECONDARY_THRESHOLD && entry.intent !== primaryIntent)
    .map((entry) => entry.intent);

  /**
   * A correction is a *wrapper*, not a destination: "nah I meant icepiercer"
   * means "run the last question again, on Icepiercer". The previous intent is
   * therefore promoted and `correctionTarget` carries the swap.
   */
  if (primaryIntent === "correction" && context.lastSemanticIntent && context.lastSemanticIntent !== "correction") {
    debug.push(`correction re-runs ${context.lastSemanticIntent}`);
    primaryIntent = context.lastSemanticIntent;
  }

  const confidence = clamp(best ? best.score / 2 : 0, 0, 1);

  const fastPath =
    entityCount >= 1 &&
    (primaryIntent === "item_value" || primaryIntent === "item_demand" || primaryIntent === "item_details") &&
    tokens.length <= 6 &&
    !discourse.isHypothetical;

  return {
    raw,
    cleaned,
    normalized,
    primaryIntent,
    secondaryIntents,
    confidence,
    path: fastPath ? "FAST" : "SMART",
    discourse,
    concepts,
    scan,
    targets,
    ambiguities: scan.ambiguities,
    unresolved: scan.unresolved,
    references,
    metric,
    source,
    category,
    minDemand,
    numeric,
    trade,
    // "what should he add" and "give me options" both want weapons back;
    // "how much should he add" wants the figure.
    wantsItemsForGap:
      (/\b(what|which|who)\b/.test(normalized) && hasConcept(concepts, "ADDS")) || hasConcept(concepts, "LIST"),
    declaresInventory,
    correctionTarget,
    variantSwitch: chromaSwitch,
    variantMissingFor: chromaMissingFor,
    scores: ranked,
    debug,
  };
}

export default interpretMM2Message;
