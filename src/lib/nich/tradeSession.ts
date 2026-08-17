import tradingMeta from "../../data/tradingMeta.json";
import { getItem, getItemById, normalizeSearchText, searchItems } from "../search";

export type NichTradeSide = "YOU" | "THEM";
export type NichTradeSource =
  | "CONFIRMED_BY_VISION"
  | "LIKELY_BY_VISION"
  | "CONFIRMED_BY_USER"
  | "RESOLVED_FROM_CONTEXT"
  | "CANONICAL_DATABASE_MATCH"
  | "UNKNOWN";
export type NichTradeSlotStatus = "CONFIRMED" | "UNCERTAIN" | "UNRESOLVED";
export type NichConfidenceLevel = "HIGH" | "MEDIUM" | "LOW" | "UNRESOLVED";
export type NichTradeValueSystem = "GCASH" | "ELVE";

export type NichTradeConfidence = {
  item: number;
  variant: number;
  side: number;
  overall: number;
  level: NichConfidenceLevel;
};

export type NichTradeCandidate = {
  itemId: string;
  itemName: string;
  score: number;
  source: "VISION" | "CATALOG" | "CONTEXT" | "USER_ALIAS";
};

export type NichTradeCorrectionEvent = {
  eventId: string;
  tradeSessionId: string;
  slotId: string;
  timestamp: number;
  originalPrediction?: string;
  originalVariant?: string;
  correctedItem?: string;
  correctedVariant?: string;
  correctedSide?: NichTradeSide;
  confidenceBefore?: number;
  source: "user" | "context";
  message?: string;
};

export type NichTradeSlot = {
  slotId: string;
  side: NichTradeSide;
  gridPosition: number;
  canonicalItemId?: string;
  canonicalName?: string;
  rawName?: string;
  category?: string;
  quantity: number;
  neon: boolean | null;
  mega: boolean | null;
  fly: boolean | null;
  ride: boolean | null;
  confidence: NichTradeConfidence;
  alternatives: NichTradeCandidate[];
  source: NichTradeSource;
  status: NichTradeSlotStatus;
  correctedByUser: boolean;
  correctionHistory: NichTradeCorrectionEvent[];
  visualEvidence?: string;
  visibleText?: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
};

export type NichTradeHistorySnapshot = {
  id: string;
  createdAt: number;
  reason: string;
  userSide: NichTradeSlot[];
  theirSide: NichTradeSlot[];
  valueSystem: NichTradeValueSystem;
};

export type NichTradeSession = {
  id: string;
  screenshotId?: string;
  createdAt: number;
  updatedAt: number;
  userSide: NichTradeSlot[];
  theirSide: NichTradeSlot[];
  unresolvedSlots: string[];
  confirmedSlots: string[];
  valueSystem: NichTradeValueSystem;
  recognitionVersion: string;
  promptVersion: string;
  catalogVersion: string;
  conversationState:
    | "RECOGNIZED"
    | "NEEDS_CORRECTION"
    | "READY_TO_CALCULATE"
    | "CALCULATED";
  correctionLedger: NichTradeCorrectionEvent[];
  history: NichTradeHistorySnapshot[];
  runId?: string;
  layoutConfidence?: number;
  imageWidth?: number;
  imageHeight?: number;
};

export type NichUserMemory = {
  preferredValueSource?: NichTradeValueSystem;
  aliases?: Record<string, string>;
  responseStyle?: "concise" | "balanced";
  updatedAt?: number;
};

export type VisionTradeItemLike = {
  rawName: string;
  side: "YOU" | "THEM" | "NONE";
  variant: "NORMAL" | "NEON" | "MEGA" | "UNKNOWN";
  potion: "NONE" | "F" | "R" | "FR" | "UNKNOWN";
  quantity: number;
  confidence: number;
  itemConfidence?: number;
  variantConfidence?: number;
  sideConfidence?: number;
  categoryHint?: string;
  itemId?: string;
  itemName?: string;
  category?: string;
  databaseConfidence: number;
  verified: boolean;
  alternatives: string[];
  candidateScores?: Array<{ itemName: string; score: number }>;
  visualEvidence?: string;
  visibleText?: string;
  box?: { x: number; y: number; width: number; height: number };
  slot?: number;
};

export const NICH_TRADE_SESSION_VERSION = "trade-session-v2-20260816";
export const NICH_VISION_PROMPT_VERSION = "nich-vision-prompt-v8-multiview-candidate-audit-20260817";
export const NICH_CATALOG_VERSION = `catalog-${tradingMeta.totalItems}-${tradingMeta.generatedAt}`;

function clamp01(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
}

function createId(prefix: string) {
  if (globalThis.crypto && "randomUUID" in globalThis.crypto) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function confidenceLevel(score: number): NichConfidenceLevel {
  if (score >= 0.88) return "HIGH";
  if (score >= 0.72) return "MEDIUM";
  if (score >= 0.5) return "LOW";
  return "UNRESOLVED";
}

function variantFromVision(item: VisionTradeItemLike) {
  return {
    neon: item.variant === "NEON" ? true : item.variant === "UNKNOWN" ? null : false,
    mega: item.variant === "MEGA" ? true : item.variant === "UNKNOWN" ? null : false,
    fly: item.potion === "F" || item.potion === "FR" ? true : item.potion === "UNKNOWN" ? null : false,
    ride: item.potion === "R" || item.potion === "FR" ? true : item.potion === "UNKNOWN" ? null : false,
  };
}

function buildCandidateList(item: VisionTradeItemLike): NichTradeCandidate[] {
  const seen = new Set<string>();
  const candidates: NichTradeCandidate[] = [];
  const scored = new Map((item.candidateScores ?? []).map((entry) => [normalizeSearchText(entry.itemName), clamp01(entry.score)]));

  const push = (name: string, source: NichTradeCandidate["source"], fallbackScore: number) => {
    const canonical = getItem(name) ?? searchItems(name, 1)[0];
    if (!canonical || seen.has(canonical.ID)) return;
    seen.add(canonical.ID);
    candidates.push({
      itemId: canonical.ID,
      itemName: canonical.NAME,
      score: scored.get(normalizeSearchText(canonical.NAME)) ?? fallbackScore,
      source,
    });
  };

  if (item.itemName) push(item.itemName, "VISION", Math.max(item.confidence, item.databaseConfidence));
  for (const name of item.alternatives) push(name, "VISION", Math.max(0.25, item.confidence - candidates.length * 0.12));
  return candidates.slice(0, 6);
}

function createSlot(
  item: VisionTradeItemLike,
  side: NichTradeSide,
  fallbackPosition: number,
  layoutConfidence: number,
): NichTradeSlot {
  const variants = variantFromVision(item);
  const itemConfidence = clamp01(item.itemConfidence ?? item.confidence);
  const variantConfidence = clamp01(item.variantConfidence ?? (item.variant === "UNKNOWN" || item.potion === "UNKNOWN" ? 0.35 : item.confidence));
  const sideConfidence = clamp01(item.sideConfidence ?? layoutConfidence);
  const requiresPotionCertainty = String(item.category ?? item.categoryHint ?? "PET") === "PET";
  const identityReady = Boolean(item.verified && item.itemId && item.itemName);
  const variantReady = item.variant !== "UNKNOWN" && (!requiresPotionCertainty || item.potion !== "UNKNOWN");
  const overall = Math.min(itemConfidence || 0, variantConfidence || 0, sideConfidence || 0);
  const status: NichTradeSlotStatus = identityReady && variantReady && overall >= 0.72
    ? "CONFIRMED"
    : identityReady
      ? "UNCERTAIN"
      : "UNRESOLVED";

  return {
    slotId: `${side.toLowerCase()}-${item.slot ?? fallbackPosition}`,
    side,
    gridPosition: item.slot ?? fallbackPosition,
    ...(item.itemId ? { canonicalItemId: item.itemId } : {}),
    ...(item.itemName ? { canonicalName: item.itemName } : {}),
    rawName: item.rawName,
    category: item.category ?? item.categoryHint,
    quantity: Math.max(1, Math.min(18, Math.floor(Number(item.quantity) || 1))),
    ...variants,
    confidence: {
      item: itemConfidence,
      variant: variantConfidence,
      side: sideConfidence,
      overall,
      level: status === "CONFIRMED" ? confidenceLevel(overall) : status === "UNCERTAIN" ? "LOW" : "UNRESOLVED",
    },
    alternatives: buildCandidateList(item),
    source: status === "CONFIRMED" ? "CONFIRMED_BY_VISION" : identityReady ? "LIKELY_BY_VISION" : "UNKNOWN",
    status,
    correctedByUser: false,
    correctionHistory: [],
    ...(item.visualEvidence ? { visualEvidence: item.visualEvidence } : {}),
    ...(item.visibleText ? { visibleText: item.visibleText } : {}),
    ...(item.box ? { boundingBox: item.box } : {}),
  };
}

export function refreshTradeSession(session: NichTradeSession): NichTradeSession {
  const slots = [...session.userSide, ...session.theirSide];
  const unresolvedSlots = slots.filter((slot) => slot.status !== "CONFIRMED").map((slot) => slot.slotId);
  const confirmedSlots = slots.filter((slot) => slot.status === "CONFIRMED").map((slot) => slot.slotId);
  return {
    ...session,
    updatedAt: Date.now(),
    unresolvedSlots,
    confirmedSlots,
    conversationState: unresolvedSlots.length ? "NEEDS_CORRECTION" : session.conversationState === "CALCULATED" ? "CALCULATED" : "READY_TO_CALCULATE",
  };
}

export function createTradeSessionFromVision(args: {
  items: VisionTradeItemLike[];
  layoutConfidence: number;
  valueSystem?: NichTradeValueSystem;
  recognitionVersion: string;
  promptVersion?: string;
  catalogVersion?: string;
  screenshotId?: string;
  runId?: string;
  imageWidth?: number;
  imageHeight?: number;
}): NichTradeSession | undefined {
  const tradeItems = args.items.filter((item) => item.side === "YOU" || item.side === "THEM");
  if (!tradeItems.length) return undefined;
  let youFallback = 1;
  let themFallback = 1;
  const userSide: NichTradeSlot[] = [];
  const theirSide: NichTradeSlot[] = [];

  for (const item of tradeItems) {
    if (item.side === "YOU") {
      userSide.push(createSlot(item, "YOU", youFallback++, args.layoutConfidence));
    } else if (item.side === "THEM") {
      theirSide.push(createSlot(item, "THEM", themFallback++, args.layoutConfidence));
    }
  }

  const now = Date.now();
  const base: NichTradeSession = {
    id: createId("trade"),
    ...(args.screenshotId ? { screenshotId: args.screenshotId } : {}),
    createdAt: now,
    updatedAt: now,
    userSide: userSide.sort((a, b) => a.gridPosition - b.gridPosition),
    theirSide: theirSide.sort((a, b) => a.gridPosition - b.gridPosition),
    unresolvedSlots: [],
    confirmedSlots: [],
    valueSystem: args.valueSystem ?? "GCASH",
    recognitionVersion: args.recognitionVersion,
    promptVersion: args.promptVersion ?? NICH_VISION_PROMPT_VERSION,
    catalogVersion: args.catalogVersion ?? NICH_CATALOG_VERSION,
    conversationState: "RECOGNIZED",
    correctionLedger: [],
    history: [],
    ...(args.runId ? { runId: args.runId } : {}),
    layoutConfidence: clamp01(args.layoutConfidence),
    ...(args.imageWidth ? { imageWidth: args.imageWidth } : {}),
    ...(args.imageHeight ? { imageHeight: args.imageHeight } : {}),
  };
  return refreshTradeSession(base);
}

export function getTradeSlots(session: NichTradeSession) {
  return [...session.userSide, ...session.theirSide];
}

export function findTradeSlot(session: NichTradeSession, slotId: string) {
  return getTradeSlots(session).find((slot) => slot.slotId === slotId);
}

export function getUnresolvedTradeSlots(session: NichTradeSession) {
  return getTradeSlots(session).filter((slot) => slot.status !== "CONFIRMED");
}

export function cloneTradeSession(session: NichTradeSession): NichTradeSession {
  return JSON.parse(JSON.stringify(session)) as NichTradeSession;
}

export function createHistorySnapshot(session: NichTradeSession, reason: string): NichTradeHistorySnapshot {
  return {
    id: createId("history"),
    createdAt: Date.now(),
    reason,
    userSide: cloneTradeSession(session).userSide,
    theirSide: cloneTradeSession(session).theirSide,
    valueSystem: session.valueSystem,
  };
}

export function pushTradeHistory(session: NichTradeSession, reason: string) {
  return {
    ...session,
    history: [...session.history, createHistorySnapshot(session, reason)].slice(-12),
  };
}

export function restorePreviousTradeState(session: NichTradeSession): NichTradeSession | null {
  const previous = session.history.at(-1);
  if (!previous) return null;
  return refreshTradeSession({
    ...session,
    userSide: previous.userSide,
    theirSide: previous.theirSide,
    valueSystem: previous.valueSystem,
    history: session.history.slice(0, -1),
    conversationState: "READY_TO_CALCULATE",
  });
}

export function createCorrectionEvent(args: Omit<NichTradeCorrectionEvent, "eventId" | "timestamp">): NichTradeCorrectionEvent {
  return {
    ...args,
    eventId: createId("correction"),
    timestamp: Date.now(),
  };
}

export function replaceTradeSlot(session: NichTradeSession, updatedSlot: NichTradeSlot): NichTradeSession {
  const replace = (slots: NichTradeSlot[]) => slots.map((slot) => slot.slotId === updatedSlot.slotId ? updatedSlot : slot);
  return refreshTradeSession({
    ...session,
    userSide: updatedSlot.side === "YOU"
      ? replace(session.userSide.filter((slot) => slot.slotId !== updatedSlot.slotId || slot.side === "YOU"))
      : session.userSide.filter((slot) => slot.slotId !== updatedSlot.slotId),
    theirSide: updatedSlot.side === "THEM"
      ? replace(session.theirSide.filter((slot) => slot.slotId !== updatedSlot.slotId || slot.side === "THEM"))
      : session.theirSide.filter((slot) => slot.slotId !== updatedSlot.slotId),
  });
}

export function moveTradeSlot(session: NichTradeSession, slotId: string, side: NichTradeSide): NichTradeSession {
  const slot = findTradeSlot(session, slotId);
  if (!slot) return session;
  const moved = { ...slot, side };
  const without = {
    ...session,
    userSide: session.userSide.filter((entry) => entry.slotId !== slotId),
    theirSide: session.theirSide.filter((entry) => entry.slotId !== slotId),
  };
  const target = side === "YOU" ? without.userSide : without.theirSide;
  const used = new Set(target.map((entry) => entry.gridPosition));
  let gridPosition = moved.gridPosition;
  if (used.has(gridPosition)) {
    gridPosition = 1;
    while (used.has(gridPosition) && gridPosition <= 18) gridPosition += 1;
  }
  const finalSlot = { ...moved, gridPosition, slotId: `${side.toLowerCase()}-${gridPosition}` };
  return refreshTradeSession({
    ...without,
    userSide: side === "YOU" ? [...without.userSide, finalSlot].sort((a, b) => a.gridPosition - b.gridPosition) : without.userSide,
    theirSide: side === "THEM" ? [...without.theirSide, finalSlot].sort((a, b) => a.gridPosition - b.gridPosition) : without.theirSide,
  });
}

export function createCanonicalTradeSlot(args: {
  itemName: string;
  side: NichTradeSide;
  gridPosition: number;
  quantity?: number;
  neon?: boolean;
  mega?: boolean;
  fly?: boolean;
  ride?: boolean;
  source?: NichTradeSource;
}): NichTradeSlot | null {
  const item = getItem(args.itemName) ?? searchItems(args.itemName, 1)[0];
  if (!item) return null;
  return {
    slotId: `${args.side.toLowerCase()}-${args.gridPosition}`,
    side: args.side,
    gridPosition: args.gridPosition,
    canonicalItemId: item.ID,
    canonicalName: item.NAME,
    rawName: args.itemName,
    category: String(item.CATEGORY ?? "OTHER"),
    quantity: Math.max(1, Math.min(18, Math.floor(args.quantity ?? 1))),
    neon: args.neon ?? false,
    mega: args.mega ?? false,
    fly: args.fly ?? false,
    ride: args.ride ?? false,
    confidence: { item: 1, variant: 1, side: 1, overall: 1, level: "HIGH" },
    alternatives: [],
    source: args.source ?? "CANONICAL_DATABASE_MATCH",
    status: "CONFIRMED",
    correctedByUser: args.source === "CONFIRMED_BY_USER",
    correctionHistory: [],
  };
}

function slotVariantCode(slot: NichTradeSlot) {
  const base = slot.mega ? "M" : slot.neon ? "N" : "";
  const potion = `${slot.fly ? "F" : ""}${slot.ride ? "R" : ""}`;
  if (!base && !potion) return "NP";
  return `${base}${potion}` || "NP";
}

export function formatTradeSlotToken(slot: NichTradeSlot) {
  if (!slot.canonicalName || slot.status !== "CONFIRMED") return null;
  const quantity = slot.quantity > 1 ? `${slot.quantity}x ` : "";
  return `${quantity}${slotVariantCode(slot)} ${slot.canonicalName}`.trim();
}

export function formatTradeSessionForCalculation(session: NichTradeSession) {
  if (session.unresolvedSlots.length) return null;
  const userTokens = session.userSide.map(formatTradeSlotToken).filter((token): token is string => Boolean(token));
  const theirTokens = session.theirSide.map(formatTradeSlotToken).filter((token): token is string => Boolean(token));
  if (!userTokens.length || !theirTokens.length) return null;
  const source = session.valueSystem === "ELVE" ? "Elve Shark" : "GCash";
  return `WFL me ${userTokens.join(" + ")} them ${theirTokens.join(" + ")} using ${source}`;
}

export function getCanonicalItemForSlot(slot: NichTradeSlot) {
  if (slot.canonicalItemId) return getItemById(slot.canonicalItemId);
  if (slot.canonicalName) return getItem(slot.canonicalName);
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function boolOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : value === null ? null : null;
}

function sanitizeCandidate(value: unknown): NichTradeCandidate | null {
  if (!isRecord(value) || typeof value.itemName !== "string") return null;
  const item = (typeof value.itemId === "string" ? getItemById(value.itemId) : undefined) ?? getItem(value.itemName);
  if (!item) return null;
  return {
    itemId: item.ID,
    itemName: item.NAME,
    score: clamp01(value.score),
    source: value.source === "CONTEXT" || value.source === "USER_ALIAS" || value.source === "CATALOG" ? value.source : "VISION",
  };
}

function sanitizeCorrection(value: unknown, sessionId: string): NichTradeCorrectionEvent | null {
  if (!isRecord(value) || typeof value.slotId !== "string") return null;
  return {
    eventId: typeof value.eventId === "string" ? value.eventId.slice(0, 180) : createId("correction"),
    tradeSessionId: sessionId,
    slotId: value.slotId.slice(0, 80),
    timestamp: Number.isFinite(Number(value.timestamp)) ? Number(value.timestamp) : Date.now(),
    ...(typeof value.originalPrediction === "string" ? { originalPrediction: value.originalPrediction.slice(0, 180) } : {}),
    ...(typeof value.originalVariant === "string" ? { originalVariant: value.originalVariant.slice(0, 40) } : {}),
    ...(typeof value.correctedItem === "string" ? { correctedItem: value.correctedItem.slice(0, 180) } : {}),
    ...(typeof value.correctedVariant === "string" ? { correctedVariant: value.correctedVariant.slice(0, 40) } : {}),
    ...(value.correctedSide === "YOU" || value.correctedSide === "THEM" ? { correctedSide: value.correctedSide } : {}),
    ...(Number.isFinite(Number(value.confidenceBefore)) ? { confidenceBefore: clamp01(value.confidenceBefore) } : {}),
    source: value.source === "context" ? "context" : "user",
    ...(typeof value.message === "string" ? { message: value.message.slice(0, 500) } : {}),
  };
}

function sanitizeSlot(value: unknown, sessionId: string): NichTradeSlot | null {
  if (!isRecord(value) || (value.side !== "YOU" && value.side !== "THEM")) return null;
  const canonical = (typeof value.canonicalItemId === "string" ? getItemById(value.canonicalItemId) : undefined)
    ?? (typeof value.canonicalName === "string" ? getItem(value.canonicalName) : undefined);
  const gridPosition = Math.max(1, Math.min(18, Math.floor(Number(value.gridPosition) || 1)));
  const status = value.status === "CONFIRMED" || value.status === "UNCERTAIN" ? value.status : "UNRESOLVED";
  const confidenceRecord = isRecord(value.confidence) ? value.confidence : {};
  const itemScore = clamp01(confidenceRecord.item);
  const variantScore = clamp01(confidenceRecord.variant);
  const sideScore = clamp01(confidenceRecord.side);
  const overall = clamp01(confidenceRecord.overall);
  const corrections = Array.isArray(value.correctionHistory)
    ? value.correctionHistory.map((entry) => sanitizeCorrection(entry, sessionId)).filter((entry): entry is NichTradeCorrectionEvent => Boolean(entry)).slice(-20)
    : [];
  return {
    slotId: typeof value.slotId === "string" ? value.slotId.slice(0, 80) : `${String(value.side).toLowerCase()}-${gridPosition}`,
    side: value.side,
    gridPosition,
    ...(canonical ? { canonicalItemId: canonical.ID, canonicalName: canonical.NAME, category: String(canonical.CATEGORY ?? "OTHER") } : {}),
    ...(typeof value.rawName === "string" ? { rawName: value.rawName.slice(0, 180) } : {}),
    quantity: Math.max(1, Math.min(18, Math.floor(Number(value.quantity) || 1))),
    neon: boolOrNull(value.neon),
    mega: boolOrNull(value.mega),
    fly: boolOrNull(value.fly),
    ride: boolOrNull(value.ride),
    confidence: {
      item: itemScore,
      variant: variantScore,
      side: sideScore,
      overall,
      level: value.status === "CONFIRMED" ? confidenceLevel(overall) : value.status === "UNCERTAIN" ? "LOW" : "UNRESOLVED",
    },
    alternatives: Array.isArray(value.alternatives)
      ? value.alternatives.map(sanitizeCandidate).filter((entry): entry is NichTradeCandidate => Boolean(entry)).slice(0, 6)
      : [],
    source: ["CONFIRMED_BY_VISION", "LIKELY_BY_VISION", "CONFIRMED_BY_USER", "RESOLVED_FROM_CONTEXT", "CANONICAL_DATABASE_MATCH"].includes(String(value.source))
      ? value.source as NichTradeSource
      : "UNKNOWN",
    status,
    correctedByUser: value.correctedByUser === true,
    correctionHistory: corrections,
    ...(typeof value.visualEvidence === "string" ? { visualEvidence: value.visualEvidence.slice(0, 500) } : {}),
    ...(typeof value.visibleText === "string" ? { visibleText: value.visibleText.slice(0, 300) } : {}),
    ...(isRecord(value.boundingBox)
      ? {
          boundingBox: {
            x: clamp01(value.boundingBox.x),
            y: clamp01(value.boundingBox.y),
            width: clamp01(value.boundingBox.width),
            height: clamp01(value.boundingBox.height),
          },
        }
      : {}),
  };
}

export function sanitizeNichTradeSession(value: unknown): NichTradeSession | undefined {
  if (!isRecord(value) || typeof value.id !== "string") return undefined;
  const sessionId = value.id.slice(0, 180);
  const userSide = Array.isArray(value.userSide)
    ? value.userSide.map((entry) => sanitizeSlot(entry, sessionId)).filter((entry): entry is NichTradeSlot => Boolean(entry)).slice(0, 18)
    : [];
  const theirSide = Array.isArray(value.theirSide)
    ? value.theirSide.map((entry) => sanitizeSlot(entry, sessionId)).filter((entry): entry is NichTradeSlot => Boolean(entry)).slice(0, 18)
    : [];
  if (!userSide.length && !theirSide.length) return undefined;
  const now = Date.now();
  const correctionLedger = Array.isArray(value.correctionLedger)
    ? value.correctionLedger.map((entry) => sanitizeCorrection(entry, sessionId)).filter((entry): entry is NichTradeCorrectionEvent => Boolean(entry)).slice(-60)
    : [];
  const session: NichTradeSession = {
    id: sessionId,
    ...(typeof value.screenshotId === "string" ? { screenshotId: value.screenshotId.slice(0, 180) } : {}),
    createdAt: Number.isFinite(Number(value.createdAt)) ? Number(value.createdAt) : now,
    updatedAt: Number.isFinite(Number(value.updatedAt)) ? Number(value.updatedAt) : now,
    userSide,
    theirSide,
    unresolvedSlots: [],
    confirmedSlots: [],
    valueSystem: value.valueSystem === "ELVE" ? "ELVE" : "GCASH",
    recognitionVersion: typeof value.recognitionVersion === "string" ? value.recognitionVersion.slice(0, 120) : NICH_TRADE_SESSION_VERSION,
    promptVersion: typeof value.promptVersion === "string" ? value.promptVersion.slice(0, 120) : NICH_VISION_PROMPT_VERSION,
    catalogVersion: typeof value.catalogVersion === "string" ? value.catalogVersion.slice(0, 180) : NICH_CATALOG_VERSION,
    conversationState: value.conversationState === "CALCULATED" ? "CALCULATED" : "RECOGNIZED",
    correctionLedger,
    history: [],
    ...(typeof value.runId === "string" ? { runId: value.runId.slice(0, 180) } : {}),
    ...(Number.isFinite(Number(value.layoutConfidence)) ? { layoutConfidence: clamp01(value.layoutConfidence) } : {}),
    ...(Number.isFinite(Number(value.imageWidth)) ? { imageWidth: Math.max(1, Math.floor(Number(value.imageWidth))) } : {}),
    ...(Number.isFinite(Number(value.imageHeight)) ? { imageHeight: Math.max(1, Math.floor(Number(value.imageHeight))) } : {}),
  };
  if (Array.isArray(value.history)) {
    session.history = value.history.slice(-12).flatMap((entry) => {
      if (!isRecord(entry)) return [];
      const snapshotUser = Array.isArray(entry.userSide)
        ? entry.userSide.map((slot) => sanitizeSlot(slot, sessionId)).filter((slot): slot is NichTradeSlot => Boolean(slot))
        : [];
      const snapshotThem = Array.isArray(entry.theirSide)
        ? entry.theirSide.map((slot) => sanitizeSlot(slot, sessionId)).filter((slot): slot is NichTradeSlot => Boolean(slot))
        : [];
      return [{
        id: typeof entry.id === "string" ? entry.id.slice(0, 180) : createId("history"),
        createdAt: Number.isFinite(Number(entry.createdAt)) ? Number(entry.createdAt) : now,
        reason: typeof entry.reason === "string" ? entry.reason.slice(0, 220) : "trade edit",
        userSide: snapshotUser,
        theirSide: snapshotThem,
        valueSystem: entry.valueSystem === "ELVE" ? "ELVE" as const : "GCASH" as const,
      }];
    });
  }
  return refreshTradeSession(session);
}

export function sanitizeNichUserMemory(value: unknown): NichUserMemory | undefined {
  if (!isRecord(value)) return undefined;
  const aliases: Record<string, string> = {};
  if (isRecord(value.aliases)) {
    for (const [rawAlias, rawItemName] of Object.entries(value.aliases).slice(0, 120)) {
      if (typeof rawItemName !== "string") continue;
      const alias = normalizeSearchText(rawAlias).slice(0, 50);
      const item = getItem(rawItemName);
      if (alias && item) aliases[alias] = item.NAME;
    }
  }
  return {
    ...(value.preferredValueSource === "GCASH" || value.preferredValueSource === "ELVE" ? { preferredValueSource: value.preferredValueSource } : {}),
    ...(Object.keys(aliases).length ? { aliases } : {}),
    ...(value.responseStyle === "concise" || value.responseStyle === "balanced" ? { responseStyle: value.responseStyle } : {}),
    ...(Number.isFinite(Number(value.updatedAt)) ? { updatedAt: Number(value.updatedAt) } : {}),
  };
}
