/**
 * Game-neutral discourse analysis.
 *
 * This is the half of "what did they mean?" that has nothing to do with pets or
 * weapons: is this a question or a statement, is it a follow-up on the previous
 * turn, is something being *denied* rather than asked about, is it hypothetical,
 * is the user correcting me, and what are they pointing at when they say "it"
 * or "the first one".
 *
 * Keeping it here rather than inside a game's brain matters for one specific
 * reason: negation and hypotheticals are the cases where keyword routing is
 * actively wrong, not merely limited. "don't compare harvester" contains every
 * token a comparison router looks for. Detecting the "don't" is what stops the
 * comparison from running, and that logic is identical in both games.
 */

import { normalizeText, ORDINAL_INDEX, tokenize } from "./text";

/**
 * Lowercased text that keeps the punctuation people use to *structure* a
 * message: commas separate clauses, a leading asterisk marks a correction, a
 * colon labels a trade side. `normalizeText` deletes all of it, which is right
 * for matching a name and wrong for reading a sentence.
 */
export function softNormalize(value: string): string {
  return String(value ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9,:;.+*/?\-\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type ReferenceKind =
  | "single" // it, that, this, the same one
  | "group" // them, those, both, all of them
  | "ordinal" // the first one, the second
  | "mine" // my side, mine
  | "theirs" // his, hers, their side
  | "other"; // the other one

export type DiscourseReference = {
  kind: ReferenceKind;
  /** Surface form as typed, for debugging and for explaining the resolution. */
  phrase: string;
  /** Zero-based index for `kind: "ordinal"`; -1 means "the last one". */
  ordinal?: number;
};

export type CorrectionSignal = {
  /** What the user is replacing the previous entity with, as raw text. */
  replacement: string;
  /** The thing being rejected, when they said it ("not laser, luger"). */
  rejected?: string;
  /** How the correction was phrased, for debugging. */
  phrase: string;
};

export type DiscourseAnalysis = {
  normalized: string;
  tokens: string[];
  /** Ends in "?" or opens with an interrogative, or is an implied question. */
  isQuestion: boolean;
  /** "what about…", "and…", "then…" — depends on the previous turn to mean anything. */
  isFollowUpOpener: boolean;
  /** Short enough that it cannot be a self-contained request. */
  isTerse: boolean;
  references: DiscourseReference[];
  correction: CorrectionSignal | null;
  /** Spans the user negated, normalized. A concept inside one is not requested. */
  negatedSpans: string[];
  /** "what if", "would", "hypothetically" — do not mutate stored state from this. */
  isHypothetical: boolean;
  /** "I used to have", "I had" — a past possession is not a current one. */
  isPastTense: boolean;
  /** "someone said", "he told me" — a number in here is hearsay, never data. */
  isHearsay: boolean;
  /** Asking for an opinion rather than a figure ("would you", "should i"). */
  asksForOpinion: boolean;
  isGreeting: boolean;
  isThanks: boolean;
  isHelpRequest: boolean;
};

const INTERROGATIVES = /^(what|whats|which|who|how|hows|why|when|where|is|are|can|could|would|should|do|does|did|will|any|got|magkano|ano|alin|paano|ilan|meron)\b/;

const FOLLOW_UP_OPENERS =
  /^(what about|whats about|how about|hows about|what abt|and|also|then|ok|okay|now|so|but|plus|kamusta naman|paano naman|eh|and what about|what if)\b/;

const HYPOTHETICAL = /\b(what if|if i|if he|if she|if they|if we|if my|if his|if her|if their|hypothetically|suppose|assuming|say i|lets say|would it|imagine)\b/;

const PAST_TENSE = /\b(used to|i had|i used|previously|before i|i traded away|i sold|i lost|no longer|not anymore)\b/;

const HEARSAY = /\b(someone said|somebody said|they say|they said|he said|she said|people say|i heard|allegedly|apparently|my friend said|a guy said)\b/;

const OPINION = /\b(would you|would u|wud u|would ya|do you think|dyou think|what do you think|wdyt|should i|shud i|shall i|is it worth|worth it|do i take|do i accept|would you do it|is this ass|am i cooked|am i getting|are they lowballing|is he lowballing|is she lowballing|is that a lowball|advice|opinion|thoughts)\b/;

const GREETING = /^(hi|hii+|hey+|hello+|yo+|sup|wassup|whats up|good (morning|afternoon|evening)|kumusta|kamusta|musta)\b/;

const THANKS = /\b(thanks|thank you|ty|tysm|salamat|appreciate it)\b/;

const HELP = /\b(help|what can you do|what do you do|how do i use|commands|guide me|how does this work|anong kaya mo)\b/;

/**
 * Negation cues.
 *
 * A cue negates the rest of its clause, not the whole message: in "harvester
 * value but not corrupt" only the tail is denied. Clauses end at a comma or a
 * coordinating conjunction, which is close enough to how people actually type
 * and cheap enough to run on every turn.
 */
const NEGATION_CUES = [
  "dont",
  "do not",
  "dont want",
  "not",
  "no need to",
  "never",
  "isnt",
  "arent",
  "wasnt",
  "cant",
  "stop",
  "without",
  "except",
  "besides",
  "i dont mean",
  "i didnt mean",
  "wag",
  "huwag",
  "hindi",
];

const CLAUSE_BREAK = /\s*(?:[,;.]|\s(?:but|however|though|tho|instead)\s)\s*/;

function splitClauses(soft: string): string[] {
  return soft
    .split(CLAUSE_BREAK)
    .map((clause) => normalizeText(clause))
    .filter(Boolean);
}

function findNegatedSpans(soft: string): string[] {
  const spans: string[] = [];

  for (const clause of splitClauses(soft)) {
    for (const cue of NEGATION_CUES) {
      const pattern = new RegExp(`(?:^|\\s)${cue.replace(/\s+/g, "\\s+")}(?=\\s|$)`);
      const match = pattern.exec(clause);
      if (!match) continue;

      const tail = clause.slice(match.index + match[0].length).trim();
      if (tail) spans.push(tail);
      break;
    }
  }

  return spans;
}

/** True when `phrase` sits inside something the user negated. */
export function isNegated(phrase: string, analysis: Pick<DiscourseAnalysis, "negatedSpans">): boolean {
  const target = normalizeText(phrase);
  if (!target) return false;
  return analysis.negatedSpans.some((span) => span === target || span.includes(target));
}

const REFERENCE_PATTERNS: Array<{ kind: ReferenceKind; pattern: RegExp }> = [
  { kind: "group", pattern: /\b(both|the two|the pair|all of (?:them|those|these)|all three|them all|those|these|them)\b/ },
  { kind: "other", pattern: /\b(the other one|the other|other one)\b/ },
  { kind: "mine", pattern: /\b(my side|mine|my offer|my items|my stuff|akin|side ko)\b/ },
  { kind: "theirs", pattern: /\b(their side|theirs|his side|her side|his|hers|their offer|kanya|kanila)\b/ },
  { kind: "single", pattern: /\b(it|that one|this one|that|this|the same|same one|that weapon|that item|yun|yan)\b/ },
];

const ORDINAL_REFERENCE =
  /\b(?:the\s+)?(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|sixth|6th|seventh|7th|eighth|8th|last)(?:\s+(?:one|item|weapon|option|pick))?\b/g;

function findReferences(normalized: string): DiscourseReference[] {
  const references: DiscourseReference[] = [];

  for (const match of normalized.matchAll(ORDINAL_REFERENCE)) {
    const word = match[1];
    references.push({
      kind: "ordinal",
      phrase: match[0],
      ordinal: word === "last" ? -1 : (ORDINAL_INDEX[word] ?? 0),
    });
  }

  for (const { kind, pattern } of REFERENCE_PATTERNS) {
    const match = pattern.exec(normalized);
    if (match) references.push({ kind, phrase: match[1] ?? match[0] });
  }

  return references;
}

/**
 * Corrections.
 *
 * Ordered longest-cue-first so "no i meant X" is not read as the bare "no X"
 * form with "i meant X" as the replacement.
 */
/**
 * Numbered rather than named groups because the project targets ES2017, where
 * named capture groups are a syntax error. `replacement` and `rejected` say
 * which capture holds which half of the correction.
 */
const CORRECTION_PATTERNS: Array<{ pattern: RegExp; replacement: number; rejected?: number }> = [
  { pattern: /^(?:nah|no|nope|wait|sorry|my bad)?\s*,?\s*i\s+(?:actually\s+)?mean(?:t)?\s+(.+)$/, replacement: 1 },
  { pattern: /^(?:nah|no|nope|wait)\s*,?\s*(?:not|its not|it isnt)\s+([a-z0-9 ]+?)\s*,\s*(.+)$/, rejected: 1, replacement: 2 },
  { pattern: /^(?:not|its not|it isnt)\s+([a-z0-9 ]+?)\s*,\s*(.+)$/, rejected: 1, replacement: 2 },
  { pattern: /^(?:nah|no|nope)\s*,?\s*([a-z0-9 ()]{2,})$/, replacement: 1 },
  { pattern: /^\*\s*(.+)$/, replacement: 1 },
  { pattern: /^(?:i\s+said|its)\s+(.+)$/, replacement: 1 },
  { pattern: /^swap\s+([a-z0-9 ]+?)\s+(?:with|for)\s+(.+)$/, rejected: 1, replacement: 2 },
];

function findCorrection(soft: string): CorrectionSignal | null {
  const text = soft.replace(/\?+$/, "").trim();

  for (const entry of CORRECTION_PATTERNS) {
    const match = entry.pattern.exec(text);
    const replacement = match?.[entry.replacement]?.trim();
    if (!match || !replacement) continue;

    const rejected = entry.rejected === undefined ? undefined : match[entry.rejected]?.trim();

    return {
      replacement: normalizeText(replacement),
      rejected: rejected ? normalizeText(rejected) : undefined,
      phrase: match[0],
    };
  }

  return null;
}

export function analyzeDiscourse(rawMessage: string): DiscourseAnalysis {
  const raw = String(rawMessage ?? "");
  const soft = softNormalize(raw);
  const normalized = normalizeText(raw);
  const tokens = tokenize(normalized);

  return {
    normalized,
    tokens,
    isQuestion: /\?/.test(raw) || INTERROGATIVES.test(normalized),
    isFollowUpOpener: FOLLOW_UP_OPENERS.test(normalized),
    isTerse: tokens.length <= 4,
    references: findReferences(normalized),
    correction: findCorrection(soft),
    negatedSpans: findNegatedSpans(soft),
    isHypothetical: HYPOTHETICAL.test(normalized),
    isPastTense: PAST_TENSE.test(normalized),
    isHearsay: HEARSAY.test(normalized),
    asksForOpinion: OPINION.test(normalized),
    isGreeting: GREETING.test(normalized),
    isThanks: THANKS.test(normalized),
    isHelpRequest: HELP.test(normalized),
  };
}

export default analyzeDiscourse;
