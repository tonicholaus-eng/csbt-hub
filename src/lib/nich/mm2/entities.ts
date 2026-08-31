/**
 * Finding the weapons inside a sentence.
 *
 * The previous implementation stripped every word it recognised as question
 * grammar and handed whatever survived to the resolver as *one* name. That
 * works for "harvester value" and fails for everything else: "bro he wants my
 * harv for his corrupt and adds" leaves a phrase no catalog contains.
 *
 * This module scans instead of strips. It walks the message left to right,
 * tries the longest plausible span first, and keeps whatever the catalog
 * confirms — so weapons are found wherever they sit in a sentence, together
 * with where they sat, which is what lets the trade layer work out whose side
 * each one is on.
 *
 * Two safeguards keep the scan honest:
 *
 *   - a span is only *attempted* if it is not pure sentence grammar, and
 *   - a single ordinary English word ("saw", "fall", "red" — all real MM2
 *     weapon names) needs a grounding signal nearby before it counts as an
 *     item, because "i saw his offer" is not a Saw.
 */

import type { MM2CatalogItem } from "../../mm2/catalog";
import { COMMON_WORDS, normalizeText, parseCompactNumber } from "../core/text";
import type { NichGameId } from "../game/types";
import { MM2_CATEGORY_PHRASES, MM2_RESERVED_TOKENS, type MM2Category } from "./aliases";
import { resolveMM2Item, type MM2ResolutionKind } from "./resolver";

const MAX_SPAN_WORDS = 4;

export type MM2Entity = {
  item: MM2CatalogItem;
  /** The words the user actually typed for it. */
  phrase: string;
  /** Token index of the first word of the span, in the normalized message. */
  start: number;
  /** Token index one past the last word of the span. */
  end: number;
  quantity: number;
  confidence: number;
  /** How the resolver got there — useful when explaining a low-confidence pick. */
  kind: MM2ResolutionKind;
  /** True when the mention sits inside something the user negated or supposed. */
  negated: boolean;
};

export type MM2EntityAmbiguity = {
  phrase: string;
  start: number;
  candidates: MM2CatalogItem[];
};

export type MM2EntityScan = {
  entities: MM2Entity[];
  ambiguities: MM2EntityAmbiguity[];
  /** Spans that looked like a name attempt but matched nothing in the catalog. */
  unresolved: string[];
  /** Category words the user used ("godlies"), which are never item names. */
  categories: MM2Category[];
  tokens: string[];
};

/**
 * Words that can never start or stand as an item name.
 *
 * Reserved MM2 tokens (category and trade vocabulary) come from the resolver's
 * own table so the two cannot drift apart.
 */
const NEVER_AN_ITEM: ReadonlySet<string> = new Set([
  ...MM2_RESERVED_TOKENS,
  "supreme",
  "gcash",
  "cash",
  "php",
  "peso",
  "pesos",
  "worth",
  "price",
  "cost",
  "demand",
  "compare",
  "versus",
  "vs",
  "add",
  "adds",
  "overpay",
  "underpay",
  "upgrade",
  "downgrade",
  "side",
  "sides",
  "offer",
  "offers",
  "offered",
  "lowball",
  "total",
  "everything",
  "something",
  "anything",
  "nothing",
]);

/**
 * Signals that a bare common word is being used as an item.
 *
 * A possessive or determiner in front ("my saw"), a quantity ("2 saw"), or a
 * value/demand/trade question around it. Without one of these, an ordinary word
 * that happens to be a weapon name is treated as ordinary.
 */
const GROUNDING_BEFORE = new Set([
  "my",
  "mine",
  "his",
  "her",
  "their",
  "them",
  "the",
  "a",
  "an",
  "this",
  "that",
  "your",
  "for",
  "and",
  "plus",
  "with",
  "vs",
  "versus",
  "or",
  "is",
  "are",
]);

const GROUNDING_AFTER = new Set([
  "value",
  "values",
  "worth",
  "price",
  "demand",
  "vs",
  "versus",
  "for",
  "and",
  "plus",
  "or",
]);

/** Resolution kinds that identify a weapon outright rather than by similarity. */
const EXACT_KINDS: ReadonlySet<MM2ResolutionKind> = new Set<MM2ResolutionKind>([
  "exact-id",
  "exact-name",
  "alias",
  "normalized",
]);

/**
 * Words that make a message a question about an item at all.
 *
 * An *approximate* match needs one of these somewhere in the sentence before it
 * is believed. Without that rule the catalog's short names sit two typos away
 * from ordinary English — "cooked" from Cookie, "pointy" from Minty, "hold"
 * from Cold — and a casual sentence turns into a confident item lookup.
 */
const QUESTION_SIGNALS: ReadonlySet<string> = new Set([
  "value",
  "values",
  "worth",
  "price",
  "cost",
  "demand",
  "magkano",
  "wfl",
  "trade",
  "trading",
  "trades",
  "offer",
  "offered",
  "vs",
  "versus",
  "compare",
  "upgrade",
  "downgrade",
]);

function hasQuestionSignal(tokens: string[]): boolean {
  if (tokens.some((token) => QUESTION_SIGNALS.has(token))) return true;
  return tokens.some((token, index) => token === "how" && (tokens[index + 1] === "much" || tokens[index + 1] === "many"));
}

/** Grounding strong enough to believe an approximate match. */
function isStronglyGrounded(tokens: string[], start: number, end: number): boolean {
  if (tokens.length === 1) return true;
  if (hasQuestionSignal(tokens)) return true;

  const before = start > 0 ? tokens[start - 1] : "";
  const after = end < tokens.length ? tokens[end] : "";
  if (parseCompactNumber(before) !== null) return true;

  return (
    ["my", "mine", "his", "her", "their", "your"].includes(before) ||
    GROUNDING_AFTER.has(after)
  );
}

function isGrounded(tokens: string[], start: number, end: number): boolean {
  const before = start > 0 ? tokens[start - 1] : "";
  const after = end < tokens.length ? tokens[end] : "";
  if (GROUNDING_BEFORE.has(before) || GROUNDING_AFTER.has(after)) return true;
  if (parseCompactNumber(before) !== null) return true;
  // A message that is only the word itself is a lookup: "harvester", "saw".
  return tokens.length === 1;
}

/** "2x", "2" or "two" immediately before a span. */
const NUMBER_WORDS: Readonly<Record<string, number>> = Object.freeze({
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
});

function quantityBefore(tokens: string[], start: number): number {
  if (start === 0) return 1;
  const token = tokens[start - 1];

  const word = NUMBER_WORDS[token];
  if (word && word > 1) return word;

  const numeric = /^(\d{1,2})x?$/.exec(token);
  if (numeric) {
    const quantity = Number(numeric[1]);
    if (Number.isFinite(quantity) && quantity >= 1 && quantity <= 99) return quantity;
  }

  return 1;
}

export type MM2EntityScanOptions = {
  gameId: NichGameId;
  contextItemIds?: string[];
  userAliases?: Record<string, string>;
  /** Normalized clauses the user negated; entities inside them are flagged. */
  negatedSpans?: readonly string[];
};

/**
 * Scan a message for MM2 weapons.
 *
 * The message must already be normalized (lowercase, punctuation folded).
 *
 * Words are first grouped into **name runs**: maximal stretches of tokens that
 * could be part of a weapon name, bounded by sentence grammar, numbers and
 * reserved trading vocabulary. Each run is then resolved as a whole before it
 * is resolved in pieces, which is the rule that keeps "frost dragon" — a name
 * MM2 does not have — from being answered as the MM2 weapon "Frost". A run is
 * only broken up when *every* name-like token in it resolves outright, so
 * "harvester icepiercer" still yields two weapons.
 */
export function scanMM2Entities(normalizedMessage: string, options: MM2EntityScanOptions): MM2EntityScan {
  const tokens = normalizedMessage ? normalizedMessage.split(" ").filter(Boolean) : [];

  const entities: MM2Entity[] = [];
  const ambiguities: MM2EntityAmbiguity[] = [];
  const unresolved: string[] = [];
  const categories: MM2Category[] = [];
  const consumed = new Set<number>();

  const negated = (options.negatedSpans ?? []).filter(Boolean);
  const isNegatedSpan = (phrase: string) => negated.some((span) => span.includes(phrase));

  const resolve = (phrase: string) =>
    resolveMM2Item(phrase, {
      gameId: options.gameId,
      contextItemIds: options.contextItemIds,
      userAliases: options.userAliases,
    });

  const pushEntity = (item: MM2Entity["item"], phrase: string, start: number, end: number, confidence: number, kind: MM2ResolutionKind) => {
    for (let index = start; index < end; index += 1) consumed.add(index);
    entities.push({
      item,
      phrase,
      start,
      end,
      quantity: quantityBefore(tokens, start),
      confidence,
      kind,
      negated: isNegatedSpan(phrase),
    });
  };

  const addCategory = (category: MM2Category) => {
    if (!categories.includes(category)) categories.push(category);
  };

  // --- 1: split the message into runs of possible name words ---------------
  const runs: Array<{ start: number; end: number }> = [];
  let open: number | null = null;

  tokens.forEach((token, index) => {
    const nameLike =
      !NEVER_AN_ITEM.has(token) && !COMMON_WORDS.has(token) && parseCompactNumber(token) === null && token.length >= 2;

    if (nameLike) {
      if (open === null) open = index;
      return;
    }
    if (open !== null) {
      runs.push({ start: open, end: index });
      open = null;
    }
  });
  if (open !== null) runs.push({ start: open, end: tokens.length });

  // --- 2: resolve each run, whole before parts -----------------------------
  for (const run of runs) {
    const phrase = tokens.slice(run.start, run.end).join(" ");
    const whole = phrase.split(" ").length <= MAX_SPAN_WORDS ? resolve(phrase) : { status: "notFound" as const, query: phrase };

    if (whole.status === "resolved") {
      /**
       * A single word that only matched *approximately* has to be positioned
       * like an item before it counts as one. Without this, "am i cooked" is a
       * two-edit hop from the weapon "Cookie", and the assistant answers a
       * question nobody asked.
       */
      const fuzzyLoneWord = run.end - run.start === 1 && !EXACT_KINDS.has(whole.kind);
      if (!fuzzyLoneWord || isStronglyGrounded(tokens, run.start, run.end)) {
        pushEntity(whole.item, phrase, run.start, run.end, whole.confidence, whole.kind);
        continue;
      }
    }
    if (whole.status === "ambiguous") {
      ambiguities.push({ phrase, start: run.start, candidates: whole.candidates });
      for (let index = run.start; index < run.end; index += 1) consumed.add(index);
      continue;
    }

    // The run is not one weapon, so try to read it as several.
    const found: Array<{ item: MM2Entity["item"]; phrase: string; start: number; end: number; confidence: number; kind: MM2ResolutionKind }> = [];
    const unclear: MM2EntityAmbiguity[] = [];
    const leftover: number[] = [];

    let cursor = run.start;
    while (cursor < run.end) {
      let handled = false;

      for (let width = Math.min(MAX_SPAN_WORDS, run.end - cursor); width >= 1; width -= 1) {
        const span = tokens.slice(cursor, cursor + width).join(" ");
        const resolution = resolve(span);

        if (resolution.status === "resolved") {
          if (width === 1 && !EXACT_KINDS.has(resolution.kind) && !isStronglyGrounded(tokens, cursor, cursor + 1)) continue;
          found.push({ item: resolution.item, phrase: span, start: cursor, end: cursor + width, confidence: resolution.confidence, kind: resolution.kind });
        } else if (resolution.status === "ambiguous") {
          unclear.push({ phrase: span, start: cursor, candidates: resolution.candidates });
        } else {
          continue;
        }

        cursor += width;
        handled = true;
        break;
      }

      if (!handled) {
        leftover.push(cursor);
        cursor += 1;
      }
    }

    // Category words are legitimate leftovers: "chroma fang" is a weapon, but
    // "top chroma" is a category filter.
    const stillUnknown = leftover.filter((index) => {
      const category = MM2_CATEGORY_PHRASES[tokens[index]];
      if (category) {
        addCategory(category);
        return false;
      }
      return true;
    });

    /**
     * A run that produced a weapon *and* an unresolvable name is one name the
     * catalog does not have — "frost dragon" is not the MM2 weapon "Frost"
     * followed by a puzzle. Reporting the whole phrase back is the honest
     * answer; answering about half of it is not.
     */
    if (found.length && unclear.length) {
      if (isGrounded(tokens, run.start, run.end)) unresolved.push(phrase);
      continue;
    }

    /**
     * A *fuzzy* match that leaves words behind is not a weapon plus filler —
     * it is a name being forced onto something else. "new trader" is not the
     * MM2 weapon "News" followed by a stray word, and accepting it would put a
     * catalog row behind a question that never mentioned one. Exact and alias
     * matches are kept, because "meant icepiercer" really is filler plus a name.
     */
    if (found.length && stillUnknown.length && found.some((entry) => !EXACT_KINDS.has(entry.kind))) {
      if (isGrounded(tokens, run.start, run.end)) unresolved.push(phrase);
      continue;
    }

    if (found.length) {
      for (const entry of found) pushEntity(entry.item, entry.phrase, entry.start, entry.end, entry.confidence, entry.kind);
      continue;
    }

    if (unclear.length) {
      ambiguities.push(...unclear);
      for (const entry of unclear) consumed.add(entry.start);
      continue;
    }

    // Nothing in the run resolved at all. Report it only if the sentence
    // treated it like a name; loose chatter is not a failed lookup.
    if (stillUnknown.length && isGrounded(tokens, run.start, run.end)) unresolved.push(phrase);
  }

  // --- 3: everyday words that are also weapon names ------------------------
  // Handled separately because they can never start a run: "my saw" is a Saw,
  // "i saw his offer" is not, and only the words either side can tell them apart.
  tokens.forEach((token, index) => {
    if (consumed.has(index) || !COMMON_WORDS.has(token)) return;
    if (!isGrounded(tokens, index, index + 1)) return;

    const resolution = resolve(token);
    if (resolution.status !== "resolved" || !EXACT_KINDS.has(resolution.kind)) return;
    pushEntity(resolution.item, token, index, index + 1, resolution.confidence, resolution.kind);
  });

  // --- 4: category words that were never part of a name --------------------
  tokens.forEach((token, index) => {
    if (consumed.has(index)) return;
    const category = MM2_CATEGORY_PHRASES[token];
    if (category) addCategory(category);
  });

  entities.sort((a, b) => a.start - b.start);

  return { entities, ambiguities, unresolved, categories, tokens };
}

/** Drop repeats of the same weapon, keeping the first (and its position). */
export function dedupeEntities(entities: readonly MM2Entity[]): MM2Entity[] {
  const seen = new Set<string>();
  return entities.filter((entity) => {
    if (seen.has(entity.item.ID)) return false;
    seen.add(entity.item.ID);
    return true;
  });
}

/** The entities a message is actually asking about: negated ones do not count. */
export function activeEntities(scan: MM2EntityScan): MM2Entity[] {
  return scan.entities.filter((entity) => !entity.negated);
}

export function detectMM2Categories(normalizedMessage: string): MM2Category[] {
  const found: MM2Category[] = [];
  for (const word of normalizeText(normalizedMessage).split(" ")) {
    const category = MM2_CATEGORY_PHRASES[word];
    if (category && !found.includes(category)) found.push(category);
  }
  return found;
}
