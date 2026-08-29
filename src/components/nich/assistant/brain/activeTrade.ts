import { detectValueSource } from "../../../../lib/valueSystem";
import { resolveNichItem } from "../../../../lib/nich/itemResolver";
import {
  cloneTradeSession,
  createCanonicalTradeSlot,
  createCorrectionEvent,
  findTradeSlot,
  formatTradeSessionForCalculation,
  getTradeSlots,
  getUnresolvedTradeSlots,
  moveTradeSlot,
  pushTradeHistory,
  refreshTradeSession,
  restorePreviousTradeState,
  type NichTradeSession,
  type NichTradeSide,
  type NichTradeSlot,
  type NichUserMemory,
} from "../../../../lib/nich/tradeSession";
import createTradeComparisonResponse, { createTradeSessionComparisonResponse } from "./tradeComparison";
import type { NichBrainInput, NichResponse } from "./types";

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9'\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slotLabel(slot: NichTradeSlot) {
  const side = slot.side === "YOU" ? "your" : "their";
  const position = slot.gridPosition;
  return `${side} slot ${position}`;
}

function slotVariantLabel(slot: NichTradeSlot) {
  if (slot.mega) return `${slot.fly ? "F" : ""}${slot.ride ? "R" : ""}` ? `M${slot.fly ? "F" : ""}${slot.ride ? "R" : ""}` : "M";
  if (slot.neon) return `N${slot.fly ? "F" : ""}${slot.ride ? "R" : ""}`;
  if (slot.fly || slot.ride) return `${slot.fly ? "F" : ""}${slot.ride ? "R" : ""}`;
  return "NP";
}

function recalcSlotStatus(slot: NichTradeSlot): NichTradeSlot {
  const isPet = (slot.category ?? "PET") === "PET";
  const identityReady = Boolean(slot.canonicalItemId && slot.canonicalName);
  const variantReady = slot.neon !== null && slot.mega !== null && (!isPet || (slot.fly !== null && slot.ride !== null));
  const overall = Math.min(
    slot.confidence.item,
    slot.confidence.variant || 0.35,
    slot.confidence.side,
  );
  const status = identityReady && variantReady && overall >= 0.72
    ? "CONFIRMED"
    : identityReady
      ? "UNCERTAIN"
      : "UNRESOLVED";
  return {
    ...slot,
    status,
    confidence: {
      ...slot.confidence,
      overall,
      level: status === "CONFIRMED" ? (overall >= 0.88 ? "HIGH" : "MEDIUM") : status === "UNCERTAIN" ? "LOW" : "UNRESOLVED",
    },
  };
}

function replaceSlot(session: NichTradeSession, slotId: string, updated: NichTradeSlot) {
  return refreshTradeSession({
    ...session,
    userSide: session.userSide.map((slot) => slot.slotId === slotId ? updated : slot),
    theirSide: session.theirSide.map((slot) => slot.slotId === slotId ? updated : slot),
  });
}

function withHistory(session: NichTradeSession, reason: string) {
  return pushTradeHistory(session, reason);
}

/**
 * Session-local learning from one correction.
 *
 * Trade screenshots routinely contain the same pet twice with different N/F/R/M
 * badges. When the user corrects one slot, other still-unresolved slots whose
 * artwork read the same way get that catalog item as a STRONGER CANDIDATE — not
 * as an automatic answer, and never as persisted training data. It lives only in
 * this screenshot's trade session.
 */
function propagateCorrectionToDuplicateSlots(
  session: NichTradeSession,
  correctedSlot: NichTradeSlot,
  correctedItem: { ID: string; NAME: string },
): NichTradeSession {
  const signature = (slot: NichTradeSlot) => ({
    rawName: normalize(slot.rawName ?? ""),
    evidence: normalize(slot.visualEvidence ?? ""),
  });
  const source = signature(correctedSlot);
  if (!source.rawName && !source.evidence) return session;

  const boost = (slots: NichTradeSlot[]) => slots.map((slot) => {
    if (slot.slotId === correctedSlot.slotId) return slot;
    if (slot.status === "CONFIRMED" || slot.correctedByUser) return slot;
    const own = signature(slot);
    const sameArtwork = (Boolean(source.rawName) && own.rawName === source.rawName)
      || (Boolean(source.evidence) && own.evidence === source.evidence);
    if (!sameArtwork) return slot;
    if (slot.alternatives.some((candidate) => candidate.itemId === correctedItem.ID)) return slot;
    return {
      ...slot,
      alternatives: [
        { itemId: correctedItem.ID, itemName: correctedItem.NAME, score: 0.9, source: "CONTEXT" as const },
        ...slot.alternatives,
      ].slice(0, 6),
    };
  });

  return { ...session, userSide: boost(session.userSide), theirSide: boost(session.theirSide) };
}

function applyItemCorrection(
  session: NichTradeSession,
  slot: NichTradeSlot,
  itemName: string,
  message: string,
  memory?: NichUserMemory,
  recordHistory = true,
) {
  const resolution = resolveNichItem(itemName, {
    userMemory: memory,
    contextualSlots: [slot],
    category: slot.category === "PET" ? "PET" : undefined,
  });
  if (resolution.status !== "resolved" || !resolution.item) return null;

  const historical = recordHistory
    ? withHistory(session, `Correct ${slotLabel(slot)} to ${resolution.item.NAME}`)
    : session;
  const event = createCorrectionEvent({
    tradeSessionId: session.id,
    slotId: slot.slotId,
    originalPrediction: slot.canonicalName ?? slot.rawName,
    correctedItem: resolution.item.NAME,
    confidenceBefore: slot.confidence.item,
    source: "user",
    message,
  });
  const updated = recalcSlotStatus({
    ...slot,
    canonicalItemId: resolution.item.ID,
    canonicalName: resolution.item.NAME,
    category: String(resolution.item.CATEGORY ?? slot.category ?? "OTHER"),
    rawName: resolution.item.NAME,
    alternatives: [],
    source: "CONFIRMED_BY_USER",
    correctedByUser: true,
    confidence: { ...slot.confidence, item: 1, overall: Math.min(1, slot.confidence.variant, slot.confidence.side) },
    correctionHistory: [...slot.correctionHistory, event].slice(-20),
  });
  const next = replaceSlot(historical, slot.slotId, updated);
  const propagated = propagateCorrectionToDuplicateSlots(next, slot, resolution.item);
  return {
    session: { ...propagated, correctionLedger: [...propagated.correctionLedger, event].slice(-60) },
    itemName: resolution.item.NAME,
  };
}

type ParsedVariantState = {
  mega?: boolean;
  neon?: boolean;
  fly?: boolean;
  ride?: boolean;
  label: string;
};

const VARIANT_ONLY_PATTERN = /^(?:mfr|mrf|nfr|nrf|mf|fm|mr|rm|nf|fn|nr|rn|fr|rf|f|r|np|n|m|mega|neon|fly ride|ride fly|fly|ride|normal|no pot|no potion|unpotted)$/i;

function parseVariantPhrase(message: string): ParsedVariantState | null {
  const text = normalize(message);
  const codeMatch = text.match(/\b(mfr|mrf|nfr|nrf|mf|fm|mr|rm|nf|fn|nr|rn|fr|rf|np|mega|neon|fly ride|ride fly|no potion|no pot|unpotted|normal|fly|ride|f|r|m|n)\b/i);
  if (!codeMatch) return null;
  const code = codeMatch[1].toLowerCase();

  // A fully specified shorthand (FR/R/F/NP/NFR/MFR/etc.) describes the
  // complete state of a screenshot slot. Reset mutually exclusive flags so a
  // correction never leaves stale Neon/Mega/Fly/Ride data behind.
  if (code === "mfr" || code === "mrf") return { mega: true, neon: false, fly: true, ride: true, label: "MFR" };
  if (code === "nfr" || code === "nrf") return { mega: false, neon: true, fly: true, ride: true, label: "NFR" };
  if (code === "mf" || code === "fm") return { mega: true, neon: false, fly: true, ride: false, label: "MF" };
  if (code === "mr" || code === "rm") return { mega: true, neon: false, fly: false, ride: true, label: "MR" };
  if (code === "nf" || code === "fn") return { mega: false, neon: true, fly: true, ride: false, label: "NF" };
  if (code === "nr" || code === "rn") return { mega: false, neon: true, fly: false, ride: true, label: "NR" };
  if (code === "fr" || code === "rf" || code === "fly ride" || code === "ride fly") return { mega: false, neon: false, fly: true, ride: true, label: "FR" };
  if (code === "f" || code === "fly") return { mega: false, neon: false, fly: true, ride: false, label: "F" };
  if (code === "r" || code === "ride") return { mega: false, neon: false, fly: false, ride: true, label: "R" };
  if (code === "np" || code === "normal" || code === "no pot" || code === "no potion" || code === "unpotted") return { mega: false, neon: false, fly: false, ride: false, label: "NP" };

  // "Neon"/"Mega" alone only answers the age variant. Keep potion state as-is
  // because the user may still need to confirm F/R separately.
  if (code === "mega" || code === "m") return { mega: true, neon: false, label: "Mega" };
  if (code === "neon" || code === "n") return { mega: false, neon: true, label: "Neon" };
  return null;
}

function isVariantOnlyPhrase(message: string) {
  return VARIANT_ONLY_PATTERN.test(normalize(message));
}

function findSlotsByItemText(session: NichTradeSession, text: string, memory?: NichUserMemory) {
  const slots = getTradeSlots(session);
  const normalizedText = normalize(text);
  const direct = slots.filter((slot) => {
    const name = normalize(slot.canonicalName ?? slot.rawName ?? "");
    if (!name) return false;
    return normalizedText.includes(name) || name.split(" ").some((token) => token.length >= 4 && normalizedText.includes(token));
  });
  if (direct.length === 1) return direct;

  const variantStripped = normalizedText
    .replace(/\b(?:mfr|nfr|mf|mr|nf|nr|fr|np|mega|neon|fly ride|fly|ride|normal|is|are|actually|instead|not|the|pet|one|mine|my|their|theirs|them|his|her)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!variantStripped) return direct;
  const resolution = resolveNichItem(variantStripped, { userMemory: memory, contextualSlots: slots });
  if (resolution.item) {
    const byId = slots.filter((slot) => slot.canonicalItemId === resolution.item!.ID);
    if (byId.length) return byId;
  }
  return direct;
}

function applyVariantChange(
  session: NichTradeSession,
  slot: NichTradeSlot,
  message: string,
  recordHistory = true,
) {
  const parsed = parseVariantPhrase(message);
  if (!parsed) return null;
  const historical = recordHistory
    ? withHistory(session, `Change ${slot.canonicalName ?? slotLabel(slot)} variant`)
    : session;
  const event = createCorrectionEvent({
    tradeSessionId: session.id,
    slotId: slot.slotId,
    originalVariant: slotVariantLabel(slot),
    correctedVariant: parsed.label,
    confidenceBefore: slot.confidence.variant,
    source: "user",
    message,
  });
  const updated = recalcSlotStatus({
    ...slot,
    ...(parsed.mega !== undefined ? { mega: parsed.mega } : {}),
    ...(parsed.neon !== undefined ? { neon: parsed.neon } : {}),
    ...(parsed.fly !== undefined ? { fly: parsed.fly } : {}),
    ...(parsed.ride !== undefined ? { ride: parsed.ride } : {}),
    source: "CONFIRMED_BY_USER",
    correctedByUser: true,
    confidence: { ...slot.confidence, variant: 1 },
    correctionHistory: [...slot.correctionHistory, event].slice(-20),
  });
  const next = replaceSlot(historical, slot.slotId, updated);
  return {
    session: { ...next, correctionLedger: [...next.correctionLedger, event].slice(-60) },
    label: parsed.label,
  };
}

function isUndo(message: string) {
  return /^(?:undo|undo that|go back|revert(?: that)?|actually never ?mind|nevermind)$/i.test(normalize(message));
}

function getOrdinalIndex(token: string, count: number) {
  if (token === "last") return Math.max(0, count - 1);
  return { first: 0, second: 1, third: 2, fourth: 3, fifth: 4, sixth: 5, seventh: 6, eighth: 7, ninth: 8 }[token as "first"] ?? -1;
}

function cleanCorrectionFragment(value: string) {
  return normalize(value)
    .replace(/^(?:and\s+)?(?:yes|yeah|yep|correct|right|no|nah|wait|actually)\s+/i, "")
    .replace(/^(?:wrong|incorrect)\s+(?:it(?:'s| is)?\s+)?(?:a\s+|an\s+)?/i, "")
    .replace(/^(?:the\s+)?(?:other|last|previous)\s+(?:one|pet|item)\s*(?:is|=|:)?\s*/i, "")
    .replace(/^(?:that(?:'s| is)?|it(?:'s| is)?|this is|one is|pet is)\s+(?:a\s+|an\s+)?/i, "")
    .replace(/^(?:is|=|:|a|an)\s+/i, "")
    .replace(/\b(?:confirmed|correct)\b$/i, "")
    .trim();
}

function resolveCorrectionFragment(fragment: string, session: NichTradeSession, slot: NichTradeSlot, memory?: NichUserMemory) {
  const cleaned = cleanCorrectionFragment(fragment);
  if (!cleaned || isVariantOnlyPhrase(cleaned)) return null;
  const resolution = resolveNichItem(cleaned, {
    userMemory: memory,
    contextualSlots: [slot],
    category: slot.category === "PET" ? "PET" : undefined,
  });
  return resolution.status === "resolved" && resolution.item ? resolution.item.NAME : null;
}

type VariantSlotUpdate = { slot: NichTradeSlot; variantText: string };

function extractVariantCodes(text: string) {
  const normalized = normalize(text);
  const matches = normalized.match(/\b(?:mfr|mrf|nfr|nrf|mf|fm|mr|rm|nf|fn|nr|rn|fr|rf|np|mega|neon|fly ride|ride fly|no potion|no pot|unpotted|normal|fly|ride|f|r|m|n)\b/gi) ?? [];
  return matches
    .map((entry) => normalize(entry))
    .filter((entry) => Boolean(parseVariantPhrase(entry)));
}

function orderedSideSlots(session: NichTradeSession, side: NichTradeSide) {
  return (side === "YOU" ? session.userSide : session.theirSide)
    .slice()
    .sort((a, b) => a.gridPosition - b.gridPosition);
}

function parseSequentialVariantCorrections(message: string, session: NichTradeSession): VariantSlotUpdate[] {
  const text = normalize(message);
  const allCodes = extractVariantCodes(text);
  if (!allCodes.length) return [];

  // Strong separator used in natural screenshot replies such as:
  // "fr, r, fr, fr then on the other side it's mfr".
  const sideSeparator = /\b(?:then\s+)?(?:on\s+)?(?:the\s+)?(?:other|their|right)\s+(?:side|offer)?(?:\s+it(?:'s| is)|\s+is|\s*:|\s*=)?\s*/i;
  const separatorMatch = sideSeparator.exec(text);
  if (separatorMatch?.index !== undefined) {
    const leftText = text.slice(0, separatorMatch.index);
    const rightText = text.slice(separatorMatch.index + separatorMatch[0].length);
    const leftCodes = extractVariantCodes(leftText);
    const rightCodes = extractVariantCodes(rightText);
    const leftSlots = orderedSideSlots(session, "YOU");
    const rightSlots = orderedSideSlots(session, "THEM");

    // Only accept positional shorthand when the counts line up. This prevents a
    // stray "R" elsewhere in prose from mutating the wrong pet.
    if (leftCodes.length === leftSlots.length && rightCodes.length === rightSlots.length) {
      return [
        ...leftCodes.map((variantText, index) => ({ slot: leftSlots[index], variantText })),
        ...rightCodes.map((variantText, index) => ({ slot: rightSlots[index], variantText })),
      ];
    }
  }

  // Explicit "left:" / "my side:" and "right:" / "their side:" syntax.
  const leftRight = text.match(/(?:^|\b)(?:left|my side|my offer)\s*(?:is|are|:|=)?\s*(.+?)\s+(?:right|their side|their offer)\s*(?:is|are|:|=)?\s*(.+)$/i);
  if (leftRight) {
    const leftCodes = extractVariantCodes(leftRight[1]);
    const rightCodes = extractVariantCodes(leftRight[2]);
    const leftSlots = orderedSideSlots(session, "YOU");
    const rightSlots = orderedSideSlots(session, "THEM");
    if (leftCodes.length === leftSlots.length && rightCodes.length === rightSlots.length) {
      return [
        ...leftCodes.map((variantText, index) => ({ slot: leftSlots[index], variantText })),
        ...rightCodes.map((variantText, index) => ({ slot: rightSlots[index], variantText })),
      ];
    }
  }

  const unresolvedVariantSlots = getUnresolvedTradeSlots(session)
    .filter((slot) => Boolean(slot.canonicalName))
    .filter((slot) => slot.neon === null || slot.mega === null || slot.fly === null || slot.ride === null)
    .sort((a, b) => (a.side === b.side ? a.gridPosition - b.gridPosition : a.side === "YOU" ? -1 : 1));

  // If every unresolved variant is answered with one shorthand token, map in
  // deterministic grid order (your side first, then their side).
  if (allCodes.length === unresolvedVariantSlots.length && unresolvedVariantSlots.length > 1) {
    return allCodes.map((variantText, index) => ({ slot: unresolvedVariantSlots[index], variantText }));
  }

  return [];
}

function applyVariantUpdates(
  session: NichTradeSession,
  updates: VariantSlotUpdate[],
) {
  if (!updates.length) return null;
  let next = withHistory(session, "Apply screenshot variant corrections");
  const labels: string[] = [];
  const seen = new Set<string>();

  for (const update of updates) {
    if (seen.has(update.slot.slotId)) continue;
    const currentSlot = findTradeSlot(next, update.slot.slotId);
    if (!currentSlot) continue;
    const changed = applyVariantChange(next, currentSlot, update.variantText, false);
    if (!changed) continue;
    next = changed.session;
    labels.push(`${currentSlot.canonicalName ?? slotLabel(currentSlot)} ${changed.label}`);
    seen.add(update.slot.slotId);
  }

  return labels.length ? { session: next, labels } : null;
}

function parseOrdinalCorrections(message: string, session: NichTradeSession, memory?: NichUserMemory) {
  const unresolved = getUnresolvedTradeSlots(session);
  if (!unresolved.length) return [] as Array<{ slot: NichTradeSlot; itemName: string }>;
  const text = normalize(message);
  const regex = /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|last)(?:\s+(?:one|pet|item))?\s*(?:is|=|:)?\s*/g;
  const matches = [...text.matchAll(regex)];
  if (!matches.length) return [];
  const updates: Array<{ slot: NichTradeSlot; itemName: string }> = [];
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const ordinal = match[1];
    const slotIndex = getOrdinalIndex(ordinal, unresolved.length);
    const slot = unresolved[slotIndex];
    if (!slot) continue;
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? text.length;
    const fragment = text.slice(start, end).replace(/\band\s*$/i, "").trim();
    const itemName = resolveCorrectionFragment(fragment, session, slot, memory);
    if (itemName) updates.push({ slot, itemName });
  }
  return updates;
}

function parseNamedPredictionCorrection(message: string, session: NichTradeSession, memory?: NichUserMemory) {
  const match = normalize(message).match(/(?:the\s+)?(?:one|pet|item)\s+(?:you\s+)?(?:called|said|thought|guessed)\s+(.+?)\s+(?:is|was|=)\s+(.+)$/i);
  if (!match) return null;
  const before = normalize(match[1]);
  const slot = getUnresolvedTradeSlots(session).find((entry) => {
    const names = [entry.rawName, entry.canonicalName, ...entry.alternatives.map((candidate) => candidate.itemName)].filter(Boolean).map((name) => normalize(String(name)));
    return names.some((name) => name === before || name.includes(before) || before.includes(name));
  });
  if (!slot) return null;
  const itemName = resolveCorrectionFragment(match[2], session, slot, memory);
  return itemName ? { slot, itemName } : null;
}

function parseSequentialCorrections(message: string, session: NichTradeSession, memory?: NichUserMemory) {
  const unresolved = getUnresolvedTradeSlots(session);
  if (!unresolved.length) return [] as Array<{ slot: NichTradeSlot; itemName: string }>;
  const normalized = normalize(message);
  const parts = normalized
    .split(/\s*(?:,|;|\band\b)\s*/i)
    .map(cleanCorrectionFragment)
    .filter(Boolean);
  if (!parts.length) return [];

  const updates: Array<{ slot: NichTradeSlot; itemName: string }> = [];
  for (let index = 0; index < Math.min(parts.length, unresolved.length); index += 1) {
    const slot = unresolved[index];
    const itemName = resolveCorrectionFragment(parts[index], session, slot, memory);
    if (itemName) updates.push({ slot, itemName });
  }

  if (!updates.length && unresolved.length === 1) {
    const itemName = resolveCorrectionFragment(normalized, session, unresolved[0], memory);
    if (itemName) updates.push({ slot: unresolved[0], itemName });
  }

  // When there are exactly two unresolved slots and the sentence contains two
  // clear canonical/alias resolutions, conversational ordering is intentional.
  if (updates.length < 2 && unresolved.length >= 2) {
    const candidatePhrases = normalized
      .replace(/\b(?:that's|that is|yes|yeah|yep|a|an|the|correct|confirmed)\b/g, " ")
      .split(/\band\b|,|;/)
      .map((part) => part.trim())
      .filter(Boolean);
    const repaired: Array<{ slot: NichTradeSlot; itemName: string }> = [];
    for (let index = 0; index < Math.min(candidatePhrases.length, unresolved.length); index += 1) {
      const itemName = resolveCorrectionFragment(candidatePhrases[index], session, unresolved[index], memory);
      if (itemName) repaired.push({ slot: unresolved[index], itemName });
    }
    if (repaired.length > updates.length) return repaired;
  }
  return updates;
}

function applyItemUpdates(
  session: NichTradeSession,
  updates: Array<{ slot: NichTradeSlot; itemName: string }>,
  message: string,
  memory?: NichUserMemory,
) {
  // One natural-language turn is one undoable mutation, even when it resolves
  // multiple slots (for example: "first is Cabbit, second is Tuxedo Cat").
  let next = withHistory(session, "Apply recognition correction");
  const names: string[] = [];
  const seen = new Set<string>();
  for (const update of updates) {
    if (seen.has(update.slot.slotId)) continue;
    const currentSlot = findTradeSlot(next, update.slot.slotId);
    if (!currentSlot) continue;
    const applied = applyItemCorrection(next, currentSlot, update.itemName, message, memory, false);
    if (!applied) continue;
    next = applied.session;
    names.push(applied.itemName);
    seen.add(update.slot.slotId);
  }
  return names.length ? { session: next, names } : null;
}

function targetSideFromMessage(message: string): NichTradeSide | null {
  const text = normalize(message);
  if (/\b(?:my side|mine|my offer|i have|i get|to me|for me)\b/.test(text)) return "YOU";
  if (/\b(?:their side|theirs|their offer|they have|they add|them|to them|his side|her side)\b/.test(text)) return "THEM";
  return null;
}

const GRID_POSITION_ALIASES: Array<{ pattern: RegExp; position: number }> = [
  { pattern: /\btop[ -]?left\b/, position: 1 },
  { pattern: /\btop(?:[ -]?middle|[ -]?center)\b/, position: 2 },
  { pattern: /\btop[ -]?right\b/, position: 3 },
  { pattern: /\b(?:middle|center)[ -]?left\b/, position: 4 },
  { pattern: /\b(?:middle|center)(?: one| pet| item)?\b/, position: 5 },
  { pattern: /\b(?:middle|center)[ -]?right\b/, position: 6 },
  { pattern: /\bbottom[ -]?left\b/, position: 7 },
  { pattern: /\bbottom(?:[ -]?middle|[ -]?center)\b/, position: 8 },
  { pattern: /\bbottom[ -]?right\b/, position: 9 },
];

function parseDirectSlotCorrection(message: string, session: NichTradeSession, memory?: NichUserMemory) {
  const text = normalize(message);
  const side = targetSideFromMessage(message)
    ?? (/\b(?:your offer|your side)\b/.test(text) ? "YOU" : null);

  const explicit = text.match(/\b(?:my|your|their|his|her)?\s*(?:side\s+)?slot\s*([1-9])\s*(?:is|=|:|was|actually)?\s*(.+)$/i);
  if (explicit) {
    const inferredSide: NichTradeSide = /\b(?:their|his|her)\b/.test(text) ? "THEM" : side ?? "YOU";
    const position = Number(explicit[1]);
    const slot = getTradeSlots(session).find((entry) => entry.side === inferredSide && entry.gridPosition === position);
    if (!slot) return null;
    const itemName = resolveCorrectionFragment(explicit[2], session, slot, memory);
    return itemName ? { slot, itemName } : null;
  }

  const location = GRID_POSITION_ALIASES.find((entry) => entry.pattern.test(text));
  if (!location || !side) return null;
  const slot = getTradeSlots(session).find((entry) => entry.side === side && entry.gridPosition === location.position);
  if (!slot) return null;
  const afterLocation = text.replace(location.pattern, " ")
    .replace(/\b(?:on|in|at|from|my|your|their|his|her|side|offer|the|pet|item|one)\b/g, " ")
    .replace(/\b(?:is|was|actually|=|:)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const itemName = resolveCorrectionFragment(afterLocation, session, slot, memory);
  return itemName ? { slot, itemName } : null;
}

function parseUserAliasMemory(message: string, memory?: NichUserMemory) {
  const match = normalize(message).match(/^(?:whenever i say|when i say|remember that)\s+([a-z0-9-]{1,40})\s+(?:i mean|means|=|is)\s+(.+)$/i);
  if (!match) return null;
  const resolution = resolveNichItem(match[2], { userMemory: memory });
  if (resolution.status !== "resolved" || !resolution.item) return null;
  const alias = normalize(match[1]);
  return {
    alias,
    itemName: resolution.item.NAME,
    memory: {
      ...(memory ?? {}),
      aliases: { ...(memory?.aliases ?? {}), [alias]: resolution.item.NAME },
      updatedAt: Date.now(),
    } satisfies NichUserMemory,
  };
}

function latestCorrectedSlot(session: NichTradeSession) {
  const latest = session.correctionLedger.at(-1);
  return latest ? findTradeSlot(session, latest.slotId) : undefined;
}

function parseContradictionCorrection(message: string, session: NichTradeSession, memory?: NichUserMemory) {
  const text = normalize(message);
  const match = text.match(/^(?:wait\s+)?(?:no|nah|nope)\s+(?:it(?:'s| is)|its|that(?:'s| is))\s+(.+)$/i)
    ?? text.match(/^actually\s+(?:it(?:'s| is)|its|that(?:'s| is))\s+(.+)$/i);
  if (!match) return null;
  const slot = latestCorrectedSlot(session);
  if (!slot) return null;
  const itemName = resolveCorrectionFragment(match[1], session, slot, memory);
  return itemName ? { slot, itemName } : null;
}

function confirmationTarget(session: NichTradeSession, message: string) {
  if (!/^(?:yes|yeah|yep|correct|right|exactly|that'?s right)$/i.test(normalize(message))) return null;
  const unresolved = getUnresolvedTradeSlots(session);
  if (unresolved.length !== 1) return null;
  return unresolved[0].canonicalName ? unresolved[0] : null;
}

const QUANTITY_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
};

function parseQuantityCommand(session: NichTradeSession, message: string, memory?: NichUserMemory) {
  const text = normalize(message);
  const match = text.match(/^(?:i\s+have|i\s+got|they\s+have|they\s+got|make\s+it)\s+(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen)\s+(.+)$/i);
  if (!match) return null;
  const quantity = Math.max(1, Math.min(18, Number(match[1]) || QUANTITY_WORDS[match[1]] || 1));
  const slots = findSlotsByItemText(session, match[2], memory);
  const side = /^(?:they\s+have|they\s+got)/.test(text) ? "THEM" : /^(?:i\s+have|i\s+got)/.test(text) ? "YOU" : null;
  const narrowed = side ? slots.filter((slot) => slot.side === side) : slots;
  if (narrowed.length !== 1) return null;
  const historical = withHistory(session, `Set ${narrowed[0].canonicalName ?? slotLabel(narrowed[0])} quantity to ${quantity}`);
  const updated = { ...narrowed[0], quantity, source: "CONFIRMED_BY_USER" as const, correctedByUser: true };
  return {
    session: replaceSlot(historical, narrowed[0].slotId, updated),
    label: `${narrowed[0].canonicalName ?? "Item"} quantity set to ${quantity}.`,
  };
}

function formatCurrentTradeState(session: NichTradeSession) {
  const formatSide = (slots: NichTradeSlot[]) => slots
    .slice()
    .sort((a, b) => a.gridPosition - b.gridPosition)
    .map((slot, index) => {
      const name = slot.status === "UNRESOLVED"
        ? `Unknown item (slot ${slot.gridPosition})`
        : slot.canonicalName ?? slot.rawName ?? `Unknown slot ${slot.gridPosition}`;
      const variantKnown = slot.neon !== null && slot.mega !== null && slot.fly !== null && slot.ride !== null;
      return `${index + 1}. ${variantKnown ? `${slotVariantLabel(slot)} ` : "? "}${name}`;
    });

  const yourLines = formatSide(session.userSide);
  const theirLines = formatSide(session.theirSide);
  return [
    "Here’s what I kept from the screenshot:",
    "",
    "Your side",
    ...(yourLines.length ? yourLines : ["• No occupied slots detected"]),
    "",
    "Their side",
    ...(theirLines.length ? theirLines : ["• No occupied slots detected"]),
  ].join("\n");
}

function isTradeStateExplanationQuestion(message: string) {
  const text = normalize(message);
  return /^(?:what do you mean|wdym|what did you see|what did you detect|what did you recognize|which ones|show me what you saw|what is unclear|what's unclear|whats unclear|huh|how)$/i.test(text);
}

function unresolvedClarification(session: NichTradeSession, acknowledgement?: string): NichResponse {
  const unresolved = getUnresolvedTradeSlots(session);
  const first = unresolved[0];
  const candidateText = first?.alternatives.slice(0, 3).map((candidate) => candidate.itemName).join(" / ");
  const variantOnly = unresolved.filter((slot) => slot.canonicalName && (slot.fly === null || slot.ride === null || slot.neon === null || slot.mega === null));
  const missing = first
    ? variantOnly.length === unresolved.length && variantOnly.length > 1
      ? `I recognized the item slots. I only need ${variantOnly.length} variant/potion states, in grid order.`
      : first.canonicalName && (first.fly === null || first.ride === null || first.neon === null || first.mega === null)
        ? `I only need the variant/potion for ${first.canonicalName} in ${slotLabel(first)}.`
        : `I only need ${slotLabel(first)} confirmed${candidateText ? ` (${candidateText})` : ""}.`
    : "I still need one trade detail confirmed.";
  return {
    text: [acknowledgement, formatCurrentTradeState(session), missing].filter(Boolean).join("\n\n"),
    intent: "tradeComparison",
    reaction: "search",
    localConfidence: 1,
    aiEligible: false,
    typingDuration: 240,
    tradeSession: session,
    context: {
      activeTrade: session,
      lastIntent: "tradeComparison",
      lastValueSource: session.valueSystem,
    },
  };
}

function calculateSession(
  session: NichTradeSession,
  input: NichBrainInput,
  acknowledgement?: string,
  options: { hypothetical?: boolean } = {},
): NichResponse {
  const prompt = formatTradeSessionForCalculation(session);
  if (!prompt) return unresolvedClarification(session, acknowledgement);
  // Structured TradeSession is the source of truth. Calculate directly from canonical
  // slot IDs first; keep the text parser only as a backward-compatible fallback.
  const calculationInput = {
    ...input,
    context: { ...input.context, lastValueSource: session.valueSystem },
  };
  const calculated = createTradeSessionComparisonResponse(calculationInput, session)
    ?? createTradeComparisonResponse({ ...calculationInput, message: prompt });
  if (!calculated) return unresolvedClarification(session, acknowledgement);

  if (options.hypothetical) {
    return {
      ...calculated,
      text: ["Hypothetical:", calculated.text].join("\n"),
      aiEligible: false,
      context: {
        ...calculated.context,
        activeTrade: input.context.activeTrade,
      },
      tradeSession: undefined,
    };
  }

  const calculatedSession = { ...session, conversationState: "CALCULATED" as const, updatedAt: Date.now() };
  return {
    ...calculated,
    text: [acknowledgement, calculated.text].filter(Boolean).join("\n\n"),
    aiEligible: false,
    tradeSession: calculatedSession,
    context: {
      ...calculated.context,
      activeTrade: calculatedSession,
      lastValueSource: calculatedSession.valueSystem,
    },
  };
}

function applyMoveCommand(session: NichTradeSession, message: string, memory?: NichUserMemory) {
  const side = targetSideFromMessage(message);
  if (!side || !/\b(?:move|i have|mine|my side|their side|they have|not them|not mine)\b/i.test(normalize(message))) return null;
  const slots = findSlotsByItemText(session, message, memory);
  if (slots.length !== 1) return null;
  const historical = withHistory(session, `Move ${slots[0].canonicalName ?? slots[0].slotId} to ${side}`);
  const event = createCorrectionEvent({
    tradeSessionId: session.id,
    slotId: slots[0].slotId,
    originalPrediction: slots[0].canonicalName,
    correctedSide: side,
    confidenceBefore: slots[0].confidence.side,
    source: "user",
    message,
  });
  const moved = moveTradeSlot(historical, slots[0].slotId, side);
  return {
    session: { ...moved, correctionLedger: [...moved.correctionLedger, event].slice(-60) },
    label: `${slots[0].canonicalName ?? "Item"} moved to ${side === "YOU" ? "your" : "their"} side.`,
  };
}

function applyRemoveCommand(session: NichTradeSession, message: string, memory?: NichUserMemory) {
  if (!/^\s*(?:remove|delete|take out)\b/i.test(message)) return null;
  const slots = findSlotsByItemText(session, message, memory);
  if (slots.length !== 1) return null;
  const slot = slots[0];
  const historical = withHistory(session, `Remove ${slot.canonicalName ?? slot.slotId}`);
  return {
    session: refreshTradeSession({
      ...historical,
      userSide: historical.userSide.filter((entry) => entry.slotId !== slot.slotId),
      theirSide: historical.theirSide.filter((entry) => entry.slotId !== slot.slotId),
    }),
    label: `${slot.canonicalName ?? "Item"} removed.`,
  };
}

function nextGridPosition(session: NichTradeSession, side: NichTradeSide) {
  const slots = side === "YOU" ? session.userSide : session.theirSide;
  const used = new Set(slots.map((slot) => slot.gridPosition));
  for (let index = 1; index <= 18; index += 1) if (!used.has(index)) return index;
  return 18;
}

function extractAddItemText(message: string) {
  return normalize(message)
    .replace(/^what if\s+/i, "")
    .replace(/^(?:they|them|he|she|i|me)?\s*(?:add|adds|added|give|gives|put|puts)\s+(?:another\s+|a\s+|an\s+)?/i, "")
    .replace(/\s+(?:to|on)\s+(?:my side|mine|me|their side|them|theirs).*$/i, "")
    .trim();
}

function applyAddCommand(session: NichTradeSession, message: string, memory?: NichUserMemory) {
  const text = normalize(message);
  if (!/\b(?:add|adds|added|give|gives|put|puts)\b/.test(text)) return null;
  const side = targetSideFromMessage(message) ?? (/^(?:they|them|he|she)\b/.test(text) ? "THEM" : "YOU");
  const itemText = extractAddItemText(message);
  const resolution = resolveNichItem(itemText, { userMemory: memory, contextualSlots: getTradeSlots(session) });
  if (resolution.status !== "resolved" || !resolution.item) return null;
  const historical = withHistory(session, `Add ${resolution.item.NAME} to ${side}`);
  const slot = createCanonicalTradeSlot({
    itemName: resolution.item.NAME,
    side,
    gridPosition: nextGridPosition(historical, side),
    source: "CONFIRMED_BY_USER",
  });
  if (!slot) return null;
  const next = refreshTradeSession({
    ...historical,
    userSide: side === "YOU" ? [...historical.userSide, slot] : historical.userSide,
    theirSide: side === "THEM" ? [...historical.theirSide, slot] : historical.theirSide,
  });
  return { session: next, label: `${resolution.item.NAME} added to ${side === "YOU" ? "your" : "their"} side.` };
}

function applyReplaceCommand(session: NichTradeSession, message: string, memory?: NichUserMemory) {
  const match = normalize(message).match(/^replace\s+(.+?)\s+with\s+(.+)$/i);
  if (!match) return null;
  const oldSlots = findSlotsByItemText(session, match[1], memory);
  if (oldSlots.length !== 1) return null;
  const resolution = resolveNichItem(match[2], { userMemory: memory, contextualSlots: [oldSlots[0]] });
  if (resolution.status !== "resolved" || !resolution.item) return null;
  const applied = applyItemCorrection(session, oldSlots[0], resolution.item.NAME, message, memory);
  return applied ? { session: applied.session, label: `${oldSlots[0].canonicalName ?? "Item"} replaced with ${applied.itemName}.` } : null;
}

function updateValueSystem(session: NichTradeSession, message: string) {
  const detected = detectValueSource(message, session.valueSystem) as "GCASH" | "ELVE";
  return detected === session.valueSystem ? session : { ...session, valueSystem: detected, updatedAt: Date.now() };
}

function handleWhatIf(input: NichBrainInput, message: string, memory?: NichUserMemory): NichResponse | null {
  const original = input.context.activeTrade;
  if (!original || !/^\s*(?:what if|how about|without)\b/i.test(message)) return null;
  let branch = cloneTradeSession(original);
  const normalized = normalize(message);
  let label = "";

  if (/^without\b/.test(normalized) || /\bwithout\b/.test(normalized)) {
    const itemText = normalized.replace(/^what if\s+/, "").replace(/^how about\s+/, "").replace(/^without\s+/, "").replace(/.*\bwithout\s+/, "");
    const slots = findSlotsByItemText(branch, itemText, memory);
    if (slots.length !== 1) return null;
    branch = refreshTradeSession({
      ...branch,
      userSide: branch.userSide.filter((slot) => slot.slotId !== slots[0].slotId),
      theirSide: branch.theirSide.filter((slot) => slot.slotId !== slots[0].slotId),
    });
    label = `Without ${slots[0].canonicalName ?? "that item"}`;
  } else {
    const variant = parseVariantPhrase(message);
    const slots = variant ? findSlotsByItemText(branch, message, memory) : [];
    if (variant && slots.length === 1) {
      const changed = applyVariantChange({ ...branch, history: [] }, slots[0], message);
      if (!changed) return null;
      branch = { ...changed.session, history: [] };
      label = `${slots[0].canonicalName ?? "Item"} as ${variant.label}`;
    } else {
      const add = applyAddCommand({ ...branch, history: [] }, message, memory);
      if (!add) return null;
      branch = { ...add.session, history: [] };
      label = add.label;
    }
  }

  const result = calculateSession(branch, input, undefined, { hypothetical: true });
  return { ...result, text: [`${label}:`, result.text].join("\n") };
}

export function handleActiveTradeMessage(input: NichBrainInput): NichResponse | null {
  const active = input.context.activeTrade;
  if (!active) return null;
  const message = input.message.trim();
  const memory = input.context.userMemory ?? input.localData?.nichMemory;

  const aliasMemory = parseUserAliasMemory(message, memory);
  if (aliasMemory) {
    return {
      text: `Got it — when you say “${aliasMemory.alias}”, I’ll treat it as ${aliasMemory.itemName}.`,
      intent: "tradeComparison",
      reaction: "celebrate",
      localConfidence: 1,
      aiEligible: false,
      tradeSession: active,
      context: { activeTrade: active, userMemory: aliasMemory.memory },
    };
  }

  if (isUndo(message)) {
    const restored = restorePreviousTradeState(active);
    if (!restored) {
      return {
        text: "There isn’t a recent trade edit to undo.",
        intent: "tradeComparison",
        reaction: "searchEmpty",
        localConfidence: 1,
        aiEligible: false,
        tradeSession: active,
        context: { activeTrade: active },
      };
    }
    return calculateSession(restored, input, "Undone — I restored the previous trade.");
  }

  const hypothetical = handleWhatIf(input, message, memory);
  if (hypothetical) return hypothetical;

  const session = updateValueSystem(active, message);

  if (isTradeStateExplanationQuestion(message)) {
    return unresolvedClarification(session);
  }

  // Positional screenshot replies such as "FR, R, FR, FR then on the other
  // side MFR" are metadata corrections, not pet names. Handle this BEFORE any
  // item-name correction/fuzzy resolver so R can never turn into Red Dragon and
  // FR can never turn into Frost Dragon.
  const sequentialVariantUpdates = parseSequentialVariantCorrections(message, session);
  if (sequentialVariantUpdates.length) {
    const applied = applyVariantUpdates(session, sequentialVariantUpdates);
    if (applied) {
      const ack = `Got it — I applied the slot variants without changing the pet identities: ${applied.labels.join(", ")}.`;
      return applied.session.unresolvedSlots.length
        ? unresolvedClarification(applied.session, ack)
        : calculateSession(applied.session, input, ack);
    }
  }

  // Screenshot upload itself never implies W/F/L. Once the user explicitly asks
  // for W/F/L/calculation, use the stored screenshot trade. If recognition is
  // still uncertain, show only the confirmation state instead of calculating or
  // guessing the unresolved identities.
  if (/^(?:w\/?f\/?l|calculate|recalculate|analy[sz]e)(?:\s+(?:this|the|my|our))?(?:\s+trade)?$/i.test(normalize(message))) {
    return session.unresolvedSlots.length
      ? unresolvedClarification(session, "I can check that trade, but I need the uncertain slot(s) confirmed first.")
      : calculateSession(session, input);
  }

  // A short answer such as "np" is enough when exactly one unresolved slot
  // already has a known item and only its variant/potion is uncertain.
  const unresolvedNow = getUnresolvedTradeSlots(session);
  const shortVariant = parseVariantPhrase(message);
  if (shortVariant && unresolvedNow.length === 1 && unresolvedNow[0].canonicalName && VARIANT_ONLY_PATTERN.test(normalize(message))) {
    const changed = applyVariantChange(session, unresolvedNow[0], message);
    if (changed) {
      const ack = `Got it — ${unresolvedNow[0].canonicalName} is ${changed.label}.`;
      return changed.session.unresolvedSlots.length
        ? unresolvedClarification(changed.session, ack)
        : calculateSession(changed.session, input, ack);
    }
  }

  const confirmed = confirmationTarget(session, message);
  if (confirmed?.canonicalName) {
    const applied = applyItemUpdates(session, [{ slot: confirmed, itemName: confirmed.canonicalName }], message, memory);
    if (applied) {
      const ack = `Got it — ${applied.names[0]} confirmed.`;
      return applied.session.unresolvedSlots.length
        ? unresolvedClarification(applied.session, ack)
        : calculateSession(applied.session, input, ack);
    }
  }

  const contradiction = parseContradictionCorrection(message, session, memory);
  if (contradiction) {
    const applied = applyItemUpdates(session, [contradiction], message, memory);
    if (applied) {
      const ack = `Updated — ${applied.names[0]} is now confirmed.`;
      return applied.session.unresolvedSlots.length
        ? unresolvedClarification(applied.session, ack)
        : calculateSession(applied.session, input, ack);
    }
  }

  const directSlot = parseDirectSlotCorrection(message, session, memory);
  if (directSlot) {
    const applied = applyItemUpdates(session, [directSlot], message, memory);
    if (applied) {
      const ack = `Got it — ${applied.names[0]} confirmed for ${slotLabel(directSlot.slot)}.`;
      return applied.session.unresolvedSlots.length
        ? unresolvedClarification(applied.session, ack)
        : calculateSession(applied.session, input, ack);
    }
  }

  const namedPrediction = parseNamedPredictionCorrection(message, session, memory);
  if (namedPrediction) {
    const applied = applyItemUpdates(session, [namedPrediction], message, memory);
    if (applied) {
      const ack = `Got it — ${applied.names[0]} confirmed.`;
      return applied.session.unresolvedSlots.length
        ? unresolvedClarification(applied.session, ack)
        : calculateSession(applied.session, input, ack);
    }
  }

  const ordinalUpdates = parseOrdinalCorrections(message, session, memory);
  if (ordinalUpdates.length) {
    const applied = applyItemUpdates(session, ordinalUpdates, message, memory);
    if (applied) {
      const ack = `Got it — ${applied.names.join(" and ")} confirmed.`;
      return applied.session.unresolvedSlots.length
        ? unresolvedClarification(applied.session, ack)
        : calculateSession(applied.session, input, ack);
    }
  }

  const quantity = parseQuantityCommand(session, message, memory);
  if (quantity) return quantity.session.unresolvedSlots.length ? unresolvedClarification(quantity.session, quantity.label) : calculateSession(quantity.session, input, quantity.label);

  // Side changes should be resolved before generic item corrections because
  // "move Cabbit to my side" names a canonical item but does not rename it.
  const move = applyMoveCommand(session, message, memory);
  if (move) return move.session.unresolvedSlots.length ? unresolvedClarification(move.session, move.label) : calculateSession(move.session, input, move.label);

  const replace = applyReplaceCommand(session, message, memory);
  if (replace) return replace.session.unresolvedSlots.length ? unresolvedClarification(replace.session, replace.label) : calculateSession(replace.session, input, replace.label);

  const remove = applyRemoveCommand(session, message, memory);
  if (remove) return remove.session.unresolvedSlots.length ? unresolvedClarification(remove.session, remove.label) : calculateSession(remove.session, input, remove.label);

  if (!/^\s*(?:what if|how about)\b/i.test(message)) {
    const add = applyAddCommand(session, message, memory);
    if (add) return add.session.unresolvedSlots.length ? unresolvedClarification(add.session, add.label) : calculateSession(add.session, input, add.label);
  }

  const variant = parseVariantPhrase(message);
  if (variant && /\b(?:is|are|make|actually|instead|not|except|mine|their|theirs|my)\b/i.test(normalize(message))) {
    const slots = findSlotsByItemText(session, message, memory);
    const side = targetSideFromMessage(message);
    let narrowed = side ? slots.filter((slot) => slot.side === side) : slots;
    // Natural shorthand such as "mine is NFR" is unambiguous when that side
    // contains only one item, so do not force the user to repeat its name.
    if (!narrowed.length && side) {
      const sideSlots = side === "YOU" ? session.userSide : session.theirSide;
      if (sideSlots.length === 1) narrowed = sideSlots;
    }
    if (narrowed.length === 1) {
      const changed = applyVariantChange(session, narrowed[0], message);
      if (changed) {
        const ack = `Got it — ${narrowed[0].canonicalName ?? "that item"} is ${changed.label}.`;
        return changed.session.unresolvedSlots.length
          ? unresolvedClarification(changed.session, ack)
          : calculateSession(changed.session, input, ack);
      }
    }
  }

  const sequentialUpdates = parseSequentialCorrections(message, session, memory);
  if (sequentialUpdates.length) {
    const applied = applyItemUpdates(session, sequentialUpdates, message, memory);
    if (applied) {
      const ack = applied.names.length === 2
        ? `Got it — ${applied.names[0]} for the first one, and ${applied.names[1]} confirmed for the second.`
        : `Got it — ${applied.names.join(" and ")} confirmed.`;
      return applied.session.unresolvedSlots.length
        ? unresolvedClarification(applied.session, ack)
        : calculateSession(applied.session, input, ack);
    }
  }

  // Value-system-only follow-up should recalculate the exact same structured trade.
  if (session.valueSystem !== active.valueSystem && !session.unresolvedSlots.length) {
    return calculateSession(session, input, `Using ${session.valueSystem === "ELVE" ? "Elve Shark" : "GCash"} for this trade.`);
  }

  return null;
}

export default handleActiveTradeMessage;
