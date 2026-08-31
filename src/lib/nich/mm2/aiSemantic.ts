/**
 * The AI semantic fallback for MM2.
 *
 * The local interpreter handles the overwhelming majority of MM2 messages, and
 * every answer it produces is computed from the catalog. This module is for the
 * remainder: a sentence whose *meaning* the deterministic layer could not read.
 *
 * The division of labour is strict, and it is the whole safety property:
 *
 *   the model may say what the user meant.
 *   the model may not say what anything is worth.
 *
 * So the model is asked for a small JSON object — an intent, some item phrases,
 * which side of a trade each one is on — and every phrase it returns is then
 * re-resolved against `mm2Catalog` here. A weapon the model invents resolves to
 * nothing and is dropped; a weapon it misspells resolves through the same
 * resolver a user's typo does. Nothing the model writes reaches the user as
 * prose, and no number it produces is used at all.
 *
 * The interpretation it yields is fed back through the ordinary local brain, so
 * the answer a "smart path" turn produces is built by exactly the same code
 * that answers "harvester value".
 */

import type { MM2CatalogItem } from "../../mm2/catalog";
import type { NichGameId } from "../game/types";
import type { MM2NichContext } from "./context";
import { getMM2ItemById, resolveMM2Item } from "./resolver";
import { mm2ItemValue } from "../../mm2/tradeMath";
import type { MM2UserIntent } from "./semantic";

/** The intents the model is allowed to choose from. Anything else is discarded. */
const ALLOWED_INTENTS: readonly MM2UserIntent[] = [
  "item_value",
  "item_demand",
  "item_details",
  "compare_items",
  "trade_wfl",
  "trade_adds",
  "trade_upgrade",
  "trade_downgrade",
  "inventory_value",
  "inventory_target",
  "recommend_item",
  "market_question",
  "explain_concept",
  "casual_conversation",
  "unknown",
];

export type MM2SemanticParse = {
  intent: MM2UserIntent;
  /** Item phrases as the model read them, before any catalog check. */
  yours: string[];
  theirs: string[];
  subjects: string[];
  needsClarification: boolean;
  question: string | null;
};

export type MM2GroundedParse = {
  intent: MM2UserIntent;
  yours: MM2CatalogItem[];
  theirs: MM2CatalogItem[];
  subjects: MM2CatalogItem[];
  /** Phrases the model produced that no MM2 weapon matches. Never guessed at. */
  rejected: string[];
  needsClarification: boolean;
  question: string | null;
};

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

/**
 * The candidate slice sent with the question.
 *
 * The MM2 catalog is 1,099 rows; sending it would be slow, expensive and
 * pointless, because the model is not the thing that looks values up. What it
 * needs is enough context to *disambiguate* — the weapons already in play — so
 * only those are included, names only, with no values attached.
 */
export function buildMM2SemanticCandidates(context: MM2NichContext, limit = 12): string[] {
  const ids = [
    ...(context.recentItemIds ?? []),
    ...(context.comparisonItemIds ?? []),
    ...(context.candidateItemIds ?? []),
    ...(context.inventoryItemIds ?? []),
  ];

  const names: string[] = [];
  for (const id of ids) {
    const item = getMM2ItemById(id);
    if (item && !names.includes(item.NAME)) names.push(item.NAME);
    if (names.length >= limit) break;
  }
  return names;
}

export const MM2_SEMANTIC_SYSTEM_PROMPT = `
You are a parser for an MM2 (Murder Mystery 2) trading assistant. You do not talk to the user.

Read the message and reply with ONE JSON object and nothing else:

{
  "intent": "item_value" | "item_demand" | "item_details" | "compare_items" | "trade_wfl" | "trade_adds" | "trade_upgrade" | "trade_downgrade" | "inventory_value" | "inventory_target" | "recommend_item" | "market_question" | "explain_concept" | "casual_conversation" | "unknown",
  "yours": [weapon names the user is giving away],
  "theirs": [weapon names the other person is giving],
  "subjects": [weapon names the question is simply about],
  "needsClarification": boolean,
  "question": string or null
}

Rules:
- Copy weapon names as the user wrote them. Do NOT correct, expand or invent names. If you are unsure a word is a weapon, leave it out.
- NEVER output a value, price, demand number or verdict. You are not being asked what anything is worth.
- "yours"/"theirs" are only for trades. For a plain question use "subjects".
- If the message refers to something from earlier ("it", "those", "the first one"), leave the arrays empty and set intent from the wording alone.
- If the message is genuinely ambiguous, set needsClarification true and put the question you would ask in "question".
- Output JSON only. No prose, no markdown, no code fences.
`.trim();

export function buildMM2SemanticUserPrompt(message: string, context: MM2NichContext): string {
  const candidates = buildMM2SemanticCandidates(context);
  return [
    candidates.length ? `WEAPONS ALREADY IN THIS CONVERSATION\n${candidates.join(", ")}` : "",
    context.lastTrade
      ? `A TRADE IS OPEN: the user is giving ${context.lastTrade.yourItemIds.length} weapon(s) and receiving ${context.lastTrade.theirItemIds.length}.`
      : "",
    `MESSAGE\n${message}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

// ---------------------------------------------------------------------------
// Parsing and grounding
// ---------------------------------------------------------------------------

function readStringArray(value: unknown, limit = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && entry.length <= 60)
    .slice(0, limit);
}

/**
 * Read the model's JSON.
 *
 * Tolerant of the wrappers models add (code fences, a stray sentence) and
 * strict about everything inside: an unknown intent becomes "unknown" rather
 * than being passed along, so a hallucinated label cannot select a code path.
 */
export function parseMM2SemanticJSON(raw: string): MM2SemanticParse | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }

  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  const intent = ALLOWED_INTENTS.includes(record.intent as MM2UserIntent)
    ? (record.intent as MM2UserIntent)
    : "unknown";

  const question = typeof record.question === "string" ? record.question.slice(0, 200) : null;

  return {
    intent,
    yours: readStringArray(record.yours),
    theirs: readStringArray(record.theirs),
    subjects: readStringArray(record.subjects),
    needsClarification: record.needsClarification === true,
    question,
  };
}

/**
 * Check every name the model produced against the catalog.
 *
 * This is the step that makes the fallback safe to use. A model that returns
 * "Chroma Harvester" — a weapon that does not exist — contributes nothing here;
 * the name lands in `rejected` and the caller tells the user it could not be
 * found, exactly as it would for a user's own typo.
 */
export function groundMM2SemanticParse(
  parse: MM2SemanticParse,
  options: { gameId: NichGameId; context: MM2NichContext },
): MM2GroundedParse {
  const rejected: string[] = [];

  const ground = (phrases: string[]): MM2CatalogItem[] =>
    phrases.flatMap((phrase) => {
      const resolution = resolveMM2Item(phrase, {
        gameId: options.gameId,
        contextItemIds: options.context.recentItemIds,
        userAliases: options.context.aliases,
      });

      if (resolution.status === "resolved") return [resolution.item];
      rejected.push(phrase);
      return [];
    });

  return {
    intent: parse.intent,
    yours: ground(parse.yours),
    theirs: ground(parse.theirs),
    subjects: ground(parse.subjects),
    rejected,
    needsClarification: parse.needsClarification,
    question: parse.question,
  };
}

/**
 * Rewrite the model's reading as a plain MM2 sentence.
 *
 * The rewritten message is then answered by the ordinary local brain, so the
 * numbers, the verdict and the wording all come from the deterministic path.
 * The model's contribution ends here — it decided what the question was, not
 * what the answer is.
 *
 * Returns null when there is nothing solid enough to re-run.
 */
export function rewriteMM2MessageFromParse(parse: MM2GroundedParse): string | null {
  if (parse.yours.length && parse.theirs.length) {
    const side = (items: MM2CatalogItem[]) => items.map((item) => item.NAME).join(" and ");
    return `wfl my ${side(parse.yours)} for their ${side(parse.theirs)}`;
  }

  const subjects = parse.subjects.map((item) => item.NAME);
  if (!subjects.length) return null;

  switch (parse.intent) {
    case "item_demand":
      return `demand of ${subjects[0]}`;
    case "item_details":
      return `${subjects[0]}`;
    case "compare_items":
      return subjects.length >= 2 ? `${subjects[0]} vs ${subjects[1]}` : null;
    case "trade_upgrade":
      return `what should I upgrade ${subjects[0]} into`;
    case "trade_downgrade":
      return `what can I downgrade ${subjects[0]} into`;
    case "recommend_item":
      return `what can I get for ${subjects[0]}`;
    case "inventory_value":
      return `I have ${subjects.join(" and ")}`;
    default:
      return `${subjects[0]} value`;
  }
}

/** True when a weapon has no value in either source — used only for messaging. */
export function isFullyUnpricedMM2Item(item: MM2CatalogItem): boolean {
  return mm2ItemValue(item, "SUPREME") === null && mm2ItemValue(item, "GCASH") === null;
}

export type MM2SemanticAsk = (prompts: { system: string; user: string }) => Promise<string | null>;

/**
 * Run the fallback end to end.
 *
 * `ask` is injected rather than imported so this module has no provider,
 * network or environment dependency of its own — the API route owns those, and
 * the tests can drive the whole path with a stub.
 */
export async function interpretMM2MessageWithModel(
  message: string,
  options: { gameId: NichGameId; context: MM2NichContext; ask: MM2SemanticAsk },
): Promise<{ parse: MM2GroundedParse; rewritten: string | null } | null> {
  const raw = await options.ask({
    system: MM2_SEMANTIC_SYSTEM_PROMPT,
    user: buildMM2SemanticUserPrompt(message, options.context),
  });

  const parsed = raw ? parseMM2SemanticJSON(raw) : null;
  if (!parsed) return null;

  const grounded = groundMM2SemanticParse(parsed, { gameId: options.gameId, context: options.context });
  return { parse: grounded, rewritten: rewriteMM2MessageFromParse(grounded) };
}
