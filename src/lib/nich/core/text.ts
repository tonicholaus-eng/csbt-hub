/**
 * Game-neutral text primitives for NICH.
 *
 * Nothing in this module knows what a pet or a weapon is. It handles the parts
 * of "understanding a chat message" that are identical in Adopt Me and MM2:
 * folding the way people actually type, splitting into tokens, measuring how
 * close two strings are, and reading the numbers out of trader shorthand.
 *
 * It exists because both games were growing their own copy of the same four
 * helpers, and a normalizer that disagrees with itself between two callers is
 * how "1.5k" becomes 1.5 on one screen and 1,500 on another.
 */

/** Case, punctuation and spacing folded away; word boundaries preserved. */
export function normalizeText(value: string): string {
  return String(value ?? "")
    .normalize("NFKD")
    .toLowerCase()
    // Apostrophes are removed rather than spaced, so "traveler's" folds to
    // "travelers" and stays one token for the alias table.
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Everything folded away *including* spaces. Only for collision/prefix work. */
export function squashText(value: string): string {
  return normalizeText(value).replace(/\s+/g, "");
}

export function tokenize(value: string): string[] {
  const normalized = normalizeText(value);
  return normalized ? normalized.split(" ") : [];
}

/**
 * Repair the way people type in chat, without guessing at meaning.
 *
 * Every rule here is syntax-only: spacing, punctuation and a small set of
 * run-together phrases. Nothing maps one word onto another word, because that
 * is interpretation and it belongs to the layer that can check the result
 * against a catalog.
 */
export function repairChatSpacing(value: string): string {
  let text = String(value ?? "")
    .normalize("NFKC")
    .replace(/[​-‍﻿]/g, "")
    .replace(/[×✕✖]/g, "x")
    .replace(/[–—]/g, "-")
    .replace(/[⇄↔]/g, " <-> ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "";

  text = text
    .replace(/\bw\s*\/\s*f\s*\/\s*l\b/gi, "wfl")
    .replace(/\b(\d{1,2})x(?=[a-z])/gi, "$1x ")
    .replace(/\b(me|mine|my|them|their|him|her|his|hers|they|theirs)\s*:\s*/gi, "$1: ");

  // Run-together phrases people type constantly. These are fixed multi-word
  // English/Taglish expressions, not item names.
  const glued: Array<[RegExp, string]> = [
    [/\bhowmuch\b/gi, "how much"],
    [/\bhowmany\b/gi, "how many"],
    [/\bwhatabout\b/gi, "what about"],
    [/\bwhatif\b/gi, "what if"],
    [/\bworthit\b/gi, "worth it"],
    [/\bgoodtrade\b/gi, "good trade"],
    [/\bbadtrade\b/gi, "bad trade"],
    [/\bshouldi\b/gi, "should i"],
    [/\bshoulditake\b/gi, "should i take"],
    [/\bshoulditrade\b/gi, "should i trade"],
    [/\bcaniget\b/gi, "can i get"],
    [/\bcanitrade\b/gi, "can i trade"],
    [/\bcaniafford\b/gi, "can i afford"],
    [/\bwouldu\b/gi, "would you"],
    [/\bwouldyou\b/gi, "would you"],
    [/\bhighdemand\b/gi, "high demand"],
    [/\blowdemand\b/gi, "low demand"],
    [/\beasytotrade\b/gi, "easy to trade"],
    [/\bhardtotrade\b/gi, "hard to trade"],
    [/\bmagkanoba\b/gi, "magkano ba"],
    [/\bworthba\b/gi, "worth ba"],
  ];
  for (const [pattern, replacement] of glued) text = text.replace(pattern, replacement);

  // "harvestervalue" / "harvworth" — split the trailing question word off so the
  // remainder can be resolved as a name.
  text = text.replace(/\b([a-z]{3,})(value|values|worth|price|demand)\b/gi, "$1 $2");

  return text.replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

/** "1k" → 1000, "1.5m" → 1500000, "1,200" → 1200. null when not a number. */
export function parseCompactNumber(token: string): number | null {
  const match = /^(\d+(?:[.,]\d+)?)\s*([kmb])?$/i.exec(String(token ?? "").trim());
  if (!match) return null;

  const base = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(base)) return null;

  switch (match[2]?.toLowerCase()) {
    case "k":
      return base * 1_000;
    case "m":
      return base * 1_000_000;
    case "b":
      return base * 1_000_000_000;
    default:
      return base;
  }
}

export type NumberMention = {
  value: number;
  /** Token index in the normalized message, so callers can read what it modifies. */
  index: number;
  /** True when the raw token carried a k/m suffix ("1k"), which is never a count. */
  scaled: boolean;
  /** True when the number was written as a percentage ("20%" / "20 percent"). */
  percent: boolean;
};

/** Every number in a message, in order, with enough context to interpret it. */
export function extractNumbers(message: string): NumberMention[] {
  const raw = String(message ?? "").toLowerCase();
  const tokens = raw.split(/\s+/).filter(Boolean);
  const mentions: NumberMention[] = [];

  tokens.forEach((token, index) => {
    const cleaned = token.replace(/[^0-9.,kmb%]/gi, "");
    if (!cleaned) return;

    const percent = /%/.test(cleaned) || tokens[index + 1] === "percent";
    const value = parseCompactNumber(cleaned.replace(/%/g, ""));
    if (value === null) return;

    mentions.push({
      value,
      index,
      scaled: /[kmb]$/i.test(cleaned.replace(/%/g, "")),
      percent,
    });
  });

  return mentions;
}

// ---------------------------------------------------------------------------
// Similarity
// ---------------------------------------------------------------------------

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[b.length];
}

/**
 * Damerau-style distance: a single transposition counts as one edit.
 *
 * "icepicer" → "icepiercer" and "harvsetter" → "harvester" are one slip of the
 * fingers, and charging two edits for them is why plain Levenshtein rejects
 * real typos at a threshold that is otherwise safe.
 */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) rows[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) rows[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      }
    }
  }

  return rows[a.length][b.length];
}

/** True when `short` is the initials of the words in `phrase` ("cf" ← "chroma fang"). */
export function isAcronymOf(short: string, phrase: string): boolean {
  const letters = squashText(short);
  if (letters.length < 2) return false;

  const words = normalizeText(phrase).split(" ").filter(Boolean);
  if (words.length !== letters.length) return false;

  return words.every((word, index) => word.startsWith(letters[index]));
}

// ---------------------------------------------------------------------------
// Function words
// ---------------------------------------------------------------------------

/**
 * Ordinary English/Taglish chat words.
 *
 * Used to keep a catalog lookup from firing on a sentence's grammar. Several
 * real MM2 weapons are spelled like everyday words ("Saw", "Fall", "Sit",
 * "Red"), so a bare occurrence of one of these needs a grounding signal — a
 * possessive, a quantity, or a value/trade question around it — before it is
 * read as an item.
 */
export const COMMON_WORDS: ReadonlySet<string> = new Set(
  (
    "a an the this that these those there here it its is am are was were be been being do does did doing done " +
    "have has had having will would shall should can could may might must not no nor never dont doesnt didnt cant wont " +
    "i me my mine myself we us our ours you your yours he him his she her hers they them their theirs someone somebody " +
    "and or but if then than so because as at by for from in into of off on once out over to too under until up upon with without " +
    "what which who whom whose when where why how all any both each few more most other others some such only own same " +
    "just now still even also maybe idk wanna gonna gotta lemme kinda sorta really pretty quite " +
    "get gets got getting give gives giving take takes taking want wants wanted need needs needed think thinks know knows " +
    "say says said tell tells told see sees saw seen look looks looking make makes made keep keeps kept " +
    "good bad better best worse worst nice great okay ok fine cool bruh bro yo dude man sir lol lmao ngl imo tbh fr bet " +
    "rn now today tomorrow yesterday soon later ever again please pls thanks thank ty sorry yes yeah yep nah nope no " +
    "much many little lot lots big small high low cheap expensive worth price value cost " +
    "one two three four five six seven eight nine ten ones thing things stuff guy people person " +
    "isnt arent wasnt werent hasnt havent aint wouldnt couldnt shouldnt " +
    "easier harder easy hard faster slower cheaper pricier safer better worse new old " +
    "advice strategy tip tips help mean means meant like likes about around near under over between " +
    "another instead both either neither everything anything something nothing every " +
    "ba po yung yun ito yan ako akin ikaw kayo siya kanya kanila natin namin ang ng sa naman lang din rin may meron " +
    "magkano ilan paano bakit kailan saan sino ano kung pag pero at o hindi wag huwag"
  ).split(/\s+/),
);

/** Ordinal words a user can point with. Index is zero-based. */
export const ORDINAL_INDEX: Readonly<Record<string, number>> = Object.freeze({
  first: 0,
  "1st": 0,
  one: 0,
  second: 1,
  "2nd": 1,
  two: 1,
  third: 2,
  "3rd": 2,
  three: 2,
  fourth: 3,
  "4th": 3,
  four: 3,
  fifth: 4,
  "5th": 4,
  five: 4,
  sixth: 5,
  "6th": 5,
  six: 5,
  seventh: 6,
  "7th": 6,
  seven: 6,
  eighth: 7,
  "8th": 7,
  eight: 7,
});

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
