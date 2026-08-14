/** Shared text helpers used by the deterministic NICH brain. */

export function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function containsWholePhrase(message: string, phrase: string): boolean {
  const normalizedMessage = normalizeText(message);
  const normalizedPhrase = normalizeText(phrase);

  if (!normalizedMessage || !normalizedPhrase) {
    return false;
  }

  return new RegExp(
    `(?:^|\\s)${escapeRegExp(normalizedPhrase)}(?=$|\\s)`,
    "i",
  ).test(normalizedMessage);
}

export function includesAnyWholePhrase(
  message: string,
  phrases: readonly string[],
): boolean {
  return phrases.some((phrase) => containsWholePhrase(message, phrase));
}

export function isExactPhrase(
  message: string,
  phrases: readonly string[],
): boolean {
  const normalizedMessage = normalizeText(message);
  return phrases.some((phrase) => normalizedMessage === normalizeText(phrase));
}

export function startsWithAnyPhrase(
  message: string,
  phrases: readonly string[],
): boolean {
  const normalizedMessage = normalizeText(message);

  return phrases.some((phrase) => {
    const normalizedPhrase = normalizeText(phrase);
    return (
      normalizedMessage === normalizedPhrase ||
      normalizedMessage.startsWith(`${normalizedPhrase} `)
    );
  });
}

export function wordCount(value: string): number {
  const normalized = normalizeText(value);
  return normalized ? normalized.split(" ").length : 0;
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function uniqueBy<T>(
  values: readonly T[],
  getKey: (value: T) => string,
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const value of values) {
    const key = getKey(value);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(value);
  }

  return result;
}

export function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value);
}

export function slugify(value: string): string {
  return normalizeText(value).replace(/\s+/g, "-");
}

/**
 * Lightweight chat cleanup used before deterministic routing.
 *
 * This intentionally fixes formatting habits rather than guessing item names.
 * Item typo/fuzzy resolution stays in petSearch where ambiguity can be checked.
 */
export function normalizeLocalChatMessage(value: string): string {
  let text = value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[×✕✖]/g, "x")
    .replace(/[–—]/g, "-")
    .replace(/[⇄↔]/g, " <-> ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "";

  // Common W/F/L formatting and compact command prefixes.
  text = text
    .replace(/^w\s*\/\s*f\s*\/\s*l\s*/i, "wfl ")
    .replace(/^w\s+f\s+l\s+/i, "wfl ")
    .replace(/^wfl(?=(?:me|my|mine|i|ako)\b)/i, "wfl ")
    .replace(/^(hm|howmuch)(?=[a-z0-9])/i, "$1 ")
    .replace(/^(valuecheck|pricecheck)(?=[a-z0-9])/i, "$1 ")
    .replace(/\b(\d{1,2})x(?=[a-z])/gi, "$1x ");

  // Multi-letter variant codes are safe to split when attached. Single-letter
  // F/R/N/M are intentionally excluded because they collide with normal words.
  text = text.replace(/\b(mfr|nfr|mf|mr|nf|nr|np)(?=[a-z]{2,})/gi, "$1 ");

  // Owner labels are frequently typed without spaces: me:fd, him:nfrowl.
  text = text.replace(/\b(me|mine|my|them|their|him|her|his|hers|ako|akin|kanya|kanila):(?=\S)/gi, "$1: ");

  // Extremely compact two-sided shorthand such as fdvsowl. Only apply when
  // the token itself contains a clear 'vs' bridge.
  text = text.replace(/\b([a-z0-9]{2,})vs([a-z0-9]{2,})\b/gi, "$1 vs $2");

  // Compact lookup suffixes: fdvalue, owlworth, turtleval.
  text = text.replace(/\b([a-z0-9]{2,})(value|worth|price|val)\b/gi, "$1 $2");

  // Common no-space trader phrases. These are syntax-only expansions, not
  // pet-name guesses, so they are safe to do before database matching.
  text = text
    .replace(/\bisthisaw\b/gi, "is this a w")
    .replace(/\bisthisawin\b/gi, "is this a win")
    .replace(/\bisthisafair\b/gi, "is this fair")
    .replace(/\bisthisal\b/gi, "is this a lose")
    .replace(/\bisthisalose\b/gi, "is this a lose")
    .replace(/\bgoodtrade\b/gi, "good trade")
    .replace(/\bbadtrade\b/gi, "bad trade")
    .replace(/\bworthit\b/gi, "worth it")
    .replace(/\bshouldiaccept\b/gi, "should i accept")
    .replace(/\bshouldidecline\b/gi, "should i decline")
    .replace(/\bshoulditrade\b/gi, "should i trade")
    .replace(/\bcaniget\b/gi, "can i get")
    .replace(/\bcaniafford\b/gi, "can i afford")
    .replace(/\bmyinv\b/gi, "my inv")
    .replace(/\bmyinventory\b/gi, "my inventory")
    .replace(/\bdontuse\b/gi, "dont use")
    .replace(/\bdonotuse\b/gi, "do not use")
    .replace(/\bhighdemand\b/gi, "high demand")
    .replace(/\blowdemand\b/gi, "low demand")
    .replace(/\beasytotrade\b/gi, "easy to trade")
    .replace(/\bhardtotrade\b/gi, "hard to trade")
    .replace(/\bhowmuch\b/gi, "how much")
    .replace(/\bhowmany\b/gi, "how many")
    .replace(/\bwhatabout\b/gi, "what about")
    .replace(/\bwhatif\b/gi, "what if")
    .replace(/\bnooverpay\b/gi, "no overpay")
    .replace(/\bnoadds\b/gi, "no adds")
    .replace(/\bnodupes\b/gi, "no duplicates")
    .replace(/\bnodeuplicates\b/gi, "no duplicates");

  // A few very common Taglish/chat contractions that otherwise hurt intent
  // recognition but do not change item identity.
  text = text
    .replace(/\bdiko\b/gi, "di ko")
    .replace(/\bdiako\b/gi, "di ako")
    .replace(/\bwagmo\b/gi, "wag mo")
    .replace(/\bhuwagmo\b/gi, "huwag mo")
    .replace(/\bpwedeba\b/gi, "pwede ba")
    .replace(/\bkayaba\b/gi, "kaya ba")
    .replace(/\bmagkanoba\b/gi, "magkano ba")
    .replace(/\bworthba\b/gi, "worth ba")
    .replace(/\bokaybato\b/gi, "okay ba to")
    .replace(/\bgoodsbato\b/gi, "goods ba to")
    .replace(/\bsulitbato\b/gi, "sulit ba to")
    .replace(/\bpanalobato\b/gi, "panalo ba to")
    .replace(/\blugibato\b/gi, "lugi ba to")
    .replace(/\bkayakoba\b/gi, "kaya ko ba")
    .replace(/\babotkoba\b/gi, "abot ko ba")
    .replace(/\bmeronbaako\b/gi, "meron ba ako")
    .replace(/\bmeronbako\b/gi, "meron ba ko")
    .replace(/\bilanko\b/gi, "ilan ko")
    .replace(/\bwagisama\b/gi, "wag isama")
    .replace(/\bhuwagisama\b/gi, "huwag isama");

  return text.replace(/\s+/g, " ").trim();
}
