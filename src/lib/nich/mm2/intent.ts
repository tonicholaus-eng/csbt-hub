/**
 * MM2 local intent classification.
 *
 * Runs before any model call. Its job is to recognise the questions that the
 * catalog can already answer exactly, and to be honest about the rest: an
 * intent it is not confident about returns `GENERAL_CHAT` so the AI fallback
 * can take it, rather than forcing a deterministic answer onto a question it
 * misread.
 *
 * All parsing is MM2-shaped. "Supreme", "GCash", "godly", "chroma", "wfl" are
 * MM2 vocabulary; there is no pet/neon/mega/potion handling here because those
 * concepts do not exist in this game.
 */

import type { MM2ValueSource } from "../../../components/mm2/MM2TradeTypes";
import type { MM2Category } from "./aliases";
import { detectMM2Category } from "./engine";
import { mm2Normalize } from "./resolver";

export type MM2Intent =
  | "ITEM_VALUE"
  | "ITEM_GCASH"
  | "ITEM_DEMAND"
  | "ITEM_LOOKUP"
  | "ITEM_COMPARE"
  | "VALUE_RANGE_SEARCH"
  | "CATALOG_FILTER"
  | "TOP_ITEMS"
  | "TRADE_WFL"
  | "TRADE_TOTAL"
  | "TRADE_COMPARE"
  | "SOURCE_COMPARE"
  | "GREETING"
  | "HELP"
  | "GENERAL_CHAT"
  | "AMBIGUOUS";

export type MM2IntentAnalysis = {
  intent: MM2Intent;
  /** 0-1. Below ROUTE_THRESHOLD the brain defers to the AI fallback. */
  confidence: number;
  /** Value source the user named, or null when they did not name one. */
  explicitSource: MM2ValueSource | null;
  category: MM2Category | null;
  /** Candidate item phrases, in the order they appeared. */
  itemPhrases: string[];
  /** Numeric filters for catalog queries. */
  minValue: number | null;
  maxValue: number | null;
  nearValue: number | null;
  minDemand: number | null;
  limit: number | null;
  sort: "value-desc" | "value-asc" | "demand-desc" | null;
  /** True when the phrasing depends on an earlier turn ("what about gcash?"). */
  isFollowUp: boolean;
  /**
   * True when the wording is comparative ("which is better?", "vs").
   * The brain combines this with conversation memory: comparative wording plus
   * no named weapons plus a remembered comparison means "the same two again".
   */
  hasComparativeWording: boolean;
  /** Raw normalized message, kept for the trade parser. */
  normalized: string;
};

/** Deterministic answers are only used at or above this confidence. */
export const MM2_ROUTE_THRESHOLD = 0.6;

const GREETINGS = /^(hi|hey|hello|yo|sup|kumusta|kamusta|good (morning|afternoon|evening))\b/;
const HELP = /\b(help|what can you do|how do (i|you)|commands|guide me)\b/;

const WFL_WORDS = /\b(wfl|w\/f\/l|win fair lose|is this (a )?(win|good|fair|bad)|worth it|should i (take|accept|do) (this|it)|fair trade|good trade|bad trade)\b/;
const TRADE_STRUCTURE = /\b(for|vs|versus|against|trade|swap|offering|offer)\b/;
const TRADE_VERB = /\b(trade|trades|trading|traded|swap|swapping|give|giving|offer|offering)\b/;
const MY_SIDE = /\b(my|mine|i give|im giving|i'm giving|i offer|giving|akin|akin ko|bigay ko|side ko)\b/;
const THEIR_SIDE = /\b(their|theirs|them|they give|they offer|his|her|kanya|kanila|side nila)\b/;

const DEMAND_WORDS = /\b(demand|demanded|wanted|popular|popularity)\b/;
const VALUE_WORDS = /\b(value|worth|price|cost|magkano|how much|hm)\b/;
const COMPARE_WORDS = /\b(vs|versus|compare|comparison|better|worse|higher|lower|more|less|which|alin)\b/;
const TOP_WORDS = /\b(top|best|highest|most expensive|richest|priciest|strongest)\b/;
const BOTTOM_WORDS = /\b(cheapest|lowest|worst|least expensive)\b/;
const LIST_WORDS = /\b(show|list|give me|what are|which are)\b/;

const SOURCE_COMPARE_WORDS = /\b(supreme (vs|versus|or|and) gcash|gcash (vs|versus|or) supreme|both (values|sources)|either source|compare (the )?(value )?sources)\b/;

const FOLLOW_UP_WORDS = /^(what about|how about|and|ok what about|then|also|kamusta naman|paano naman)\b/;
const PRONOUN_REFERENCE = /\b(it|its|it's|that one|this one|the same|same|them|those)\b/;

/**
 * Value source, only when the user actually named one.
 *
 * Returning `null` rather than a default matters: the caller decides the
 * fallback (usually the session's sticky source, then SUPREME, which is what
 * the MM2 calculator opens with).
 */
export function detectMM2ValueSource(message: string): MM2ValueSource | null {
  const normalized = mm2Normalize(message);
  if (/\b(gcash|g cash|cash|php|peso|pesos)\b/.test(normalized)) return "GCASH";
  if (/\b(supreme|source value|source values|sv)\b/.test(normalized)) return "SUPREME";
  return null;
}

/** Parse "1k", "2.5m", "500", "1,200". */
function parseNumberToken(token: string): number | null {
  const match = /^(\d+(?:[.,]\d+)?)\s*([km])?$/i.exec(token.trim());
  if (!match) return null;
  const base = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(base)) return null;
  const suffix = match[2]?.toLowerCase();
  if (suffix === "k") return base * 1_000;
  if (suffix === "m") return base * 1_000_000;
  return base;
}

function extractNumbers(normalized: string): number[] {
  const numbers: number[] = [];
  for (const token of normalized.match(/\d+(?:[.,]\d+)?\s*[km]?/gi) ?? []) {
    const parsed = parseNumberToken(token.replace(/\s+/g, ""));
    if (parsed !== null) numbers.push(parsed);
  }
  return numbers;
}

/**
 * Strip the question scaffolding so what remains is (hopefully) a weapon name.
 *
 * Deliberately conservative: it removes only words that are unambiguously
 * question grammar in MM2 phrasing. Anything it is unsure about stays, and the
 * resolver — which knows the catalog — gets the final say.
 */
const STRIP_PATTERNS: RegExp[] = [
  /\b(whats|what is|what|hows|how much is|how much|how many|magkano ang|magkano|hm|value of|price of|worth of|cost of)\b/g,
  /\b(the|a|an|is|are|for|of|in|on|me|please|pls|po|ba|ang|ng|yung|yun)\b/g,
  /\b(gcash|g cash|supreme|source value|source values|value|values|worth|price|cost|demand)\b/g,
  /\b(mm2|murder mystery|murder mystery 2|weapon|weapons|item|items|knife|gun)\b/g,
  /\b(tell|show|give|list|find|search|check|lookup|look up)\b/g,
  // Follow-up scaffolding. Without this, "what about gcash?" leaves the word
  // "about" behind and the resolver dutifully reports that it cannot find a
  // weapon called About, instead of reusing the one already under discussion.
  /\b(compare|compares|comparison|versus|vs|against|between)\b/g,
  /\b(about|regarding|which|who|whose|has|have|had|does|do|did|better|worse|higher|lower|bigger|smaller|one|ones|same|then|also|okay|ok|now|instead|too)\b/g,
  /\b(it|its|that|this|those|these|them|they|there)\b/g,
  /[?!.]+/g,
];

export function extractItemPhrases(rawMessage: string): string[] {
  const normalized = mm2Normalize(rawMessage);
  if (!normalized) return [];

  // Split on comparison/trade separators first so each side keeps its own words.
  // "to" is a separator because "compare it to icepiercer" is the natural way
  // to ask a follow-up comparison, and without it the whole clause was handed
  // to the resolver as one weapon name.
  const segments = normalized
    .split(/\s+(?:vs|versus|against|compared to|compare to|to|than|with|or|and|for)\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const phrases: string[] = [];
  for (const segment of segments) {
    let cleaned = segment;
    for (const pattern of STRIP_PATTERNS) cleaned = cleaned.replace(pattern, " ");
    cleaned = cleaned.replace(/\b\d+(?:[.,]\d+)?\s*[km]?\b/g, " ");
    cleaned = cleaned.replace(/\s+/g, " ").trim();
    if (cleaned) phrases.push(cleaned);
  }

  return phrases;
}

export function analyzeMM2Message(rawMessage: string): MM2IntentAnalysis {
  const normalized = mm2Normalize(rawMessage);
  const numbers = extractNumbers(normalized);
  const explicitSource = detectMM2ValueSource(rawMessage);
  const category = detectMM2Category(normalized);
  const itemPhrases = extractItemPhrases(rawMessage);
  /**
   * A pronoun is a follow-up marker regardless of how many weapons are also
   * named. "compare it to icepiercer" names one weapon and refers to another;
   * treating that as a complete question loses the "it".
   */
  const isFollowUp = FOLLOW_UP_WORDS.test(normalized) || PRONOUN_REFERENCE.test(normalized);

  const base: MM2IntentAnalysis = {
    intent: "GENERAL_CHAT",
    confidence: 0,
    explicitSource,
    category,
    itemPhrases,
    minValue: null,
    maxValue: null,
    nearValue: null,
    minDemand: null,
    limit: null,
    sort: null,
    isFollowUp,
    hasComparativeWording: COMPARE_WORDS.test(normalized),
    normalized,
  };

  if (!normalized) return { ...base, intent: "GENERAL_CHAT", confidence: 0 };

  if (GREETINGS.test(normalized)) return { ...base, intent: "GREETING", confidence: 0.95 };
  if (HELP.test(normalized)) return { ...base, intent: "HELP", confidence: 0.9 };

  // --- trades ------------------------------------------------------------
  // "what if I trade both for batwing?" states no explicit sides, but a trade
  // verb plus "for" is unambiguous in MM2 phrasing and the parser can read it.
  const looksLikeTrade =
    WFL_WORDS.test(normalized) ||
    (TRADE_STRUCTURE.test(normalized) && MY_SIDE.test(normalized) && THEIR_SIDE.test(normalized)) ||
    (TRADE_VERB.test(normalized) && /\bfor\b/.test(normalized));

  if (looksLikeTrade) {
    return { ...base, intent: "TRADE_WFL", confidence: 0.9 };
  }

  if (/\b(my side|their side|total|totals|sum|add up|how much is my side)\b/.test(normalized)) {
    return { ...base, intent: "TRADE_TOTAL", confidence: 0.8 };
  }

  // --- source comparison -------------------------------------------------
  if (SOURCE_COMPARE_WORDS.test(normalized)) {
    return { ...base, intent: "SOURCE_COMPARE", confidence: 0.85 };
  }

  /**
   * A bare value-source word — "gcash?", "supreme" — is a follow-up that
   * switches source on the weapon already under discussion. Without this it
   * classified as GENERAL_CHAT and fell through to the AI, which is both
   * slower and less accurate than the number already in the catalog.
   */
  if (explicitSource !== null && itemPhrases.length === 0 && normalized.split(" ").length <= 3) {
    return {
      ...base,
      intent: explicitSource === "GCASH" ? "ITEM_GCASH" : "ITEM_VALUE",
      confidence: 0.8,
      isFollowUp: true,
    };
  }

  // --- ranked / filtered catalog ----------------------------------------
  const wantsList = TOP_WORDS.test(normalized) || BOTTOM_WORDS.test(normalized) || LIST_WORDS.test(normalized);
  const limitFromNumber = numbers.find((value) => Number.isInteger(value) && value >= 1 && value <= 25) ?? null;

  if (/\b(between|from)\b/.test(normalized) && numbers.length >= 2) {
    const [first, second] = [...numbers].sort((a, b) => a - b);
    return {
      ...base,
      intent: "VALUE_RANGE_SEARCH",
      confidence: 0.88,
      minValue: first,
      maxValue: second,
      sort: "value-desc",
      limit: 10,
    };
  }

  if (/\b(around|near|about|close to|roughly|approximately|~)\b/.test(normalized) && numbers.length >= 1) {
    return {
      ...base,
      intent: "VALUE_RANGE_SEARCH",
      confidence: 0.86,
      nearValue: numbers[numbers.length - 1],
      limit: 10,
    };
  }

  if (/\b(under|below|less than|cheaper than|at most)\b/.test(normalized) && numbers.length >= 1) {
    return { ...base, intent: "VALUE_RANGE_SEARCH", confidence: 0.84, maxValue: numbers[numbers.length - 1], sort: "value-desc", limit: 10 };
  }

  if (/\b(over|above|more than|at least|higher than)\b/.test(normalized) && numbers.length >= 1 && !DEMAND_WORDS.test(normalized)) {
    return { ...base, intent: "VALUE_RANGE_SEARCH", confidence: 0.84, minValue: numbers[numbers.length - 1], sort: "value-desc", limit: 10 };
  }

  if (DEMAND_WORDS.test(normalized) && (wantsList || /\bhigh demand\b/.test(normalized)) && itemPhrases.length === 0) {
    return {
      ...base,
      intent: "TOP_ITEMS",
      confidence: 0.85,
      minDemand: 6,
      sort: "demand-desc",
      limit: limitFromNumber ?? 10,
    };
  }

  if (wantsList && (category || VALUE_WORDS.test(normalized) || DEMAND_WORDS.test(normalized))) {
    const sort = DEMAND_WORDS.test(normalized)
      ? ("demand-desc" as const)
      : BOTTOM_WORDS.test(normalized)
        ? ("value-asc" as const)
        : ("value-desc" as const);
    return { ...base, intent: "TOP_ITEMS", confidence: 0.82, sort, limit: limitFromNumber ?? 10 };
  }

  if (category && wantsList) {
    return { ...base, intent: "CATALOG_FILTER", confidence: 0.8, sort: "value-desc", limit: limitFromNumber ?? 10 };
  }

  // --- comparison between named weapons ---------------------------------
  if (COMPARE_WORDS.test(normalized) && (itemPhrases.length >= 2 || isFollowUp)) {
    return {
      ...base,
      intent: "ITEM_COMPARE",
      confidence: itemPhrases.length >= 2 ? 0.88 : 0.7,
    };
  }

  // --- single item ------------------------------------------------------
  if (DEMAND_WORDS.test(normalized)) {
    return { ...base, intent: "ITEM_DEMAND", confidence: itemPhrases.length ? 0.86 : 0.66 };
  }

  if (explicitSource === "GCASH" && (VALUE_WORDS.test(normalized) || itemPhrases.length || isFollowUp)) {
    return { ...base, intent: "ITEM_GCASH", confidence: itemPhrases.length || isFollowUp ? 0.86 : 0.6 };
  }

  if (VALUE_WORDS.test(normalized)) {
    return { ...base, intent: "ITEM_VALUE", confidence: itemPhrases.length ? 0.86 : 0.64 };
  }

  if (/\b(what category|which category|what rarity|which rarity|what type)\b/.test(normalized)) {
    return { ...base, intent: "ITEM_LOOKUP", confidence: 0.84 };
  }

  // A bare weapon name is a lookup. Confidence stays modest so a bare word that
  // happens to match nothing falls through to the AI rather than to a guess.
  if (itemPhrases.length === 1 && normalized.split(" ").length <= 4) {
    return { ...base, intent: "ITEM_LOOKUP", confidence: 0.62 };
  }

  return base;
}
