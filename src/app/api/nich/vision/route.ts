import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import {
  buildVisionLocalPrompt,
  summarizeVisionItems,
  verifyVisionItem,
  type NichVisionApiResponse,
  type NichVisionCategory,
  type NichVisionImageType,
  type NichVisionModelResult,
  type NichVisionPotion,
  type NichVisionRawItem,
  type NichVisionSide,
  type NichVisionVariant,
  type NichVisionVerifiedItem,
} from "@/lib/nich/vision";
import {
  createTradeSessionFromVision,
  formatTradeSessionForCalculation,
  NICH_CATALOG_VERSION,
  NICH_VISION_PROMPT_VERSION,
} from "@/lib/nich/tradeSession";
import { itemList } from "@/lib/search";
import { consumeServerQuota } from "@/lib/nich/serverQuota";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 45_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT = 6;
const DEFAULT_DAILY_LIMIT = 100;
const DEFAULT_VISION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_VISION_CACHE_ENTRIES = 250;
const MAX_IMAGE_DIMENSION = 8192;
const MAX_IMAGE_PIXELS = 40_000_000;

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const IMAGE_TYPES = new Set<NichVisionImageType>(["TRADE", "INVENTORY", "ITEM", "OTHER"]);
const SIDES = new Set<NichVisionSide>(["YOU", "THEM", "NONE"]);
const VARIANTS = new Set<NichVisionVariant>(["NORMAL", "NEON", "MEGA", "UNKNOWN"]);
const POTIONS = new Set<NichVisionPotion>(["NONE", "F", "R", "FR", "UNKNOWN"]);
const CATEGORY_HINTS = new Set<NichVisionCategory>([
  "PET", "PETWEAR", "EGG", "VEHICLE", "FOOD", "GIFT", "STROLLER", "TOY", "STICKER", "OTHER", "UNKNOWN",
]);

const VISION_PIPELINE_VERSION = "vision-v6-stateful-slot-variants-20260817";
const VISION_PET_CATALOG = itemList
  .filter((item) => String(item.CATEGORY) === "PET")
  .map((item) => item.NAME)
  .sort((a, b) => a.localeCompare(b))
  .join(" | ");

const visionResultCache = new Map<string, { response: NichVisionApiResponse; expiresAt: number }>();

type ImageDimensions = { width: number; height: number };

type GeminiInteractionPayload = {
  status?: unknown;
  steps?: Array<{
    type?: unknown;
    content?: Array<{ type?: unknown; text?: unknown }>;
  }>;
  usage?: {
    total_input_tokens?: unknown;
    total_output_tokens?: unknown;
    total_tokens?: unknown;
  };
  error?: { message?: unknown; status?: unknown };
  errors?: Array<{ message?: unknown; code?: unknown }>;
};

type VisionCallResult = {
  modelResult: NichVisionModelResult;
  payload: GeminiInteractionPayload;
};

function parseNumberSetting(value: string | undefined, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function getClientIdentifier(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("cf-connecting-ip")?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

async function consumeVisionMinuteQuota(request: NextRequest) {
  const identifier = getClientIdentifier(request);
  const perMinute = Math.floor(parseNumberSetting(process.env.NICH_GEMINI_VISION_RATE_LIMIT, DEFAULT_RATE_LIMIT, 1, 60));
  const allowed = await consumeServerQuota({
    namespace: "nich-vision-minute",
    identifier,
    limit: perMinute,
    windowSeconds: Math.floor(RATE_LIMIT_WINDOW_MS / 1000),
  });
  return allowed ? null : "Too many screenshot analyses. Please wait a minute and try again.";
}

async function consumeVisionDailyGeminiQuota(identifier: string) {
  const dailyLimit = Math.floor(parseNumberSetting(process.env.NICH_GEMINI_VISION_DAILY_LIMIT, DEFAULT_DAILY_LIMIT, 1, 100_000));
  const allowed = await consumeServerQuota({
    namespace: "nich-gemini-vision-daily",
    identifier,
    limit: dailyLimit,
    windowSeconds: 24 * 60 * 60,
  });
  return allowed ? null : "Nich’s screenshot limit for today has been reached. This limit protects the AI budget.";
}

function getVisionCacheTtlMs() {
  return Math.floor(parseNumberSetting(
    process.env.NICH_GEMINI_VISION_CACHE_TTL_MS,
    DEFAULT_VISION_CACHE_TTL_MS,
    60_000,
    7 * 24 * 60 * 60 * 1000,
  ));
}

function pruneVisionCache(now = Date.now()) {
  for (const [key, entry] of visionResultCache) {
    if (entry.expiresAt <= now) visionResultCache.delete(key);
  }
  while (visionResultCache.size > MAX_VISION_CACHE_ENTRIES) {
    const oldest = visionResultCache.keys().next().value as string | undefined;
    if (!oldest) break;
    visionResultCache.delete(oldest);
  }
}

function clamp01(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
}

function readUInt24LE(buffer: Buffer, offset: number) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function parseImageDimensions(buffer: Buffer, mimeType: string): ImageDimensions | null {
  try {
    if (mimeType === "image/png" && buffer.length >= 24) {
      if (buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") return null;
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }

    if (mimeType === "image/jpeg" && buffer.length >= 10 && buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset + 8 < buffer.length) {
        if (buffer[offset] !== 0xff) { offset += 1; continue; }
        const marker = buffer[offset + 1];
        offset += 2;
        if (marker === 0xd8 || marker === 0xd9) continue;
        if (offset + 2 > buffer.length) break;
        const segmentLength = buffer.readUInt16BE(offset);
        const isStartOfFrame = [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker);
        if (isStartOfFrame && offset + 7 < buffer.length) {
          return { height: buffer.readUInt16BE(offset + 3), width: buffer.readUInt16BE(offset + 5) };
        }
        if (segmentLength < 2) break;
        offset += segmentLength;
      }
      return null;
    }

    if (mimeType === "image/webp" && buffer.length >= 30) {
      if (buffer.subarray(0, 4).toString("ascii") !== "RIFF" || buffer.subarray(8, 12).toString("ascii") !== "WEBP") return null;
      const chunk = buffer.subarray(12, 16).toString("ascii");
      if (chunk === "VP8X" && buffer.length >= 30) {
        return { width: 1 + readUInt24LE(buffer, 24), height: 1 + readUInt24LE(buffer, 27) };
      }
      if (chunk === "VP8 " && buffer.length >= 30) {
        for (let index = 20; index + 7 < Math.min(buffer.length, 64); index += 1) {
          if (buffer[index] === 0x9d && buffer[index + 1] === 0x01 && buffer[index + 2] === 0x2a) {
            return {
              width: buffer.readUInt16LE(index + 3) & 0x3fff,
              height: buffer.readUInt16LE(index + 5) & 0x3fff,
            };
          }
        }
      }
      if (chunk === "VP8L" && buffer.length >= 25 && buffer[20] === 0x2f) {
        const b1 = buffer[21], b2 = buffer[22], b3 = buffer[23], b4 = buffer[24];
        return {
          width: 1 + (((b2 & 0x3f) << 8) | b1),
          height: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6)),
        };
      }
    }
  } catch {
    return null;
  }
  return null;
}

function sanitizeBox(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const box = value as Record<string, unknown>;
  const x = clamp01(box.x), y = clamp01(box.y), width = clamp01(box.width), height = clamp01(box.height);
  if (!width || !height) return undefined;
  return { x, y, width, height };
}

function sanitizeModelResult(value: unknown): NichVisionModelResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const imageType = IMAGE_TYPES.has(record.imageType as NichVisionImageType)
    ? (record.imageType as NichVisionImageType)
    : "OTHER";
  const rawItems = Array.isArray(record.items) ? record.items : [];
  const items: NichVisionRawItem[] = rawItems.slice(0, 36).flatMap((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const item = raw as Record<string, unknown>;
    const rawName = typeof item.rawName === "string" ? item.rawName.trim().slice(0, 160) : "";
    if (!rawName) return [];
    const candidateNames = Array.isArray(item.candidateNames)
      ? item.candidateNames
          .filter((name): name is string => typeof name === "string")
          .map((name) => name.trim().slice(0, 160))
          .filter(Boolean)
          .slice(0, 5)
      : [];
    const candidateScores = Array.isArray(item.candidateScores)
      ? item.candidateScores.flatMap((candidate) => {
          if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return [];
          const entry = candidate as Record<string, unknown>;
          if (typeof entry.itemName !== "string") return [];
          return [{ itemName: entry.itemName.trim().slice(0, 160), score: clamp01(entry.score) }];
        }).slice(0, 5)
      : [];
    const slotNumber = Number(item.slot);
    const box = sanitizeBox(item.box);
    const overallConfidence = clamp01(item.confidence);
    return [{
      rawName,
      side: SIDES.has(item.side as NichVisionSide) ? (item.side as NichVisionSide) : "NONE",
      variant: VARIANTS.has(item.variant as NichVisionVariant) ? (item.variant as NichVisionVariant) : "UNKNOWN",
      potion: POTIONS.has(item.potion as NichVisionPotion) ? (item.potion as NichVisionPotion) : "UNKNOWN",
      quantity: Math.max(1, Math.min(18, Math.floor(Number(item.quantity) || 1))),
      confidence: overallConfidence,
      itemConfidence: clamp01(item.itemConfidence ?? overallConfidence),
      variantConfidence: clamp01(item.variantConfidence ?? overallConfidence),
      sideConfidence: clamp01(item.sideConfidence ?? record.layoutConfidence ?? overallConfidence),
      categoryHint: CATEGORY_HINTS.has(item.categoryHint as NichVisionCategory)
        ? (item.categoryHint as NichVisionCategory)
        : "UNKNOWN",
      ...(candidateNames.length ? { candidateNames } : {}),
      ...(candidateScores.length ? { candidateScores } : {}),
      ...(typeof item.visualEvidence === "string" ? { visualEvidence: item.visualEvidence.slice(0, 300) } : {}),
      ...(typeof item.visibleText === "string" ? { visibleText: item.visibleText.slice(0, 220) } : {}),
      ...(box ? { box } : {}),
      ...(Number.isFinite(slotNumber) ? { slot: Math.max(1, Math.min(18, Math.floor(slotNumber))) } : {}),
    } satisfies NichVisionRawItem];
  });

  const youOccupiedSlots = Number(record.youOccupiedSlots);
  const themOccupiedSlots = Number(record.themOccupiedSlots);
  return {
    imageType,
    layoutConfidence: clamp01(record.layoutConfidence),
    items,
    ...(Number.isFinite(youOccupiedSlots) ? { youOccupiedSlots: Math.max(0, Math.min(18, Math.floor(youOccupiedSlots))) } : {}),
    ...(Number.isFinite(themOccupiedSlots) ? { themOccupiedSlots: Math.max(0, Math.min(18, Math.floor(themOccupiedSlots))) } : {}),
    ...(typeof record.note === "string" ? { note: record.note.slice(0, 500) } : {}),
  };
}

function extractText(payload: GeminiInteractionPayload) {
  return (payload.steps ?? [])
    .filter((step) => step?.type === "model_output")
    .flatMap((step) => step.content ?? [])
    .filter((part) => part?.type === "text")
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

function safeGeminiErrorDetail(payload: GeminiInteractionPayload) {
  if (typeof payload.error?.message === "string") return payload.error.message;
  const recorded = payload.errors?.find((entry) => typeof entry?.message === "string");
  return typeof recorded?.message === "string" ? recorded.message : undefined;
}

const CANDIDATE_SCORE_SCHEMA = {
  type: "object",
  properties: {
    itemName: { type: "string" },
    score: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["itemName", "score"],
} as const;

const VISION_ITEM_SCHEMA = {
  type: "object",
  properties: {
    rawName: { type: "string" },
    side: { type: "string", enum: ["YOU", "THEM", "NONE"] },
    variant: { type: "string", enum: ["NORMAL", "NEON", "MEGA", "UNKNOWN"] },
    potion: { type: "string", enum: ["NONE", "F", "R", "FR", "UNKNOWN"] },
    quantity: { type: "integer", minimum: 1, maximum: 18 },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    itemConfidence: { type: "number", minimum: 0, maximum: 1 },
    variantConfidence: { type: "number", minimum: 0, maximum: 1 },
    sideConfidence: { type: "number", minimum: 0, maximum: 1 },
    categoryHint: { type: "string", enum: ["PET", "PETWEAR", "EGG", "VEHICLE", "FOOD", "GIFT", "STROLLER", "TOY", "STICKER", "OTHER", "UNKNOWN"] },
    candidateNames: { type: "array", maxItems: 5, items: { type: "string" } },
    candidateScores: { type: "array", maxItems: 5, items: CANDIDATE_SCORE_SCHEMA },
    visualEvidence: { type: "string" },
    visibleText: { type: "string" },
    box: {
      type: "object",
      properties: {
        x: { type: "number", minimum: 0, maximum: 1 },
        y: { type: "number", minimum: 0, maximum: 1 },
        width: { type: "number", minimum: 0, maximum: 1 },
        height: { type: "number", minimum: 0, maximum: 1 },
      },
      required: ["x", "y", "width", "height"],
    },
    slot: { type: "integer", minimum: 1, maximum: 18 },
  },
  required: ["rawName", "side", "variant", "potion", "quantity", "confidence", "itemConfidence", "variantConfidence", "sideConfidence", "categoryHint", "candidateNames"],
} as const;

const VISION_SCHEMA = {
  type: "object",
  properties: {
    imageType: { type: "string", enum: ["TRADE", "INVENTORY", "ITEM", "OTHER"] },
    layoutConfidence: { type: "number", minimum: 0, maximum: 1 },
    items: { type: "array", maxItems: 36, items: VISION_ITEM_SCHEMA },
    youOccupiedSlots: { type: "integer", minimum: 0, maximum: 18 },
    themOccupiedSlots: { type: "integer", minimum: 0, maximum: 18 },
    note: { type: "string" },
  },
  required: ["imageType", "layoutConfidence", "items"],
} as const;

const VISION_PROMPT = [
  "You are the visual-recognition layer for NICH, a specialized Adopt Me trading assistant. Accuracy outranks speed. Never invent an item to complete a trade.",
  "First locate the actual Adopt Me/Elvebredd trade UI and ignore browser chrome, ads, banners, taskbars, chat, value labels outside the grids, and unrelated page content.",
  "For the familiar two 3x3 trade grids: LEFT grid is YOU and RIGHT grid is THEM unless visible labels clearly contradict it. Slot numbering is row-major independently on each side: 1 top-left, 2 top-middle, 3 top-right, 4 middle-left, 5 center, 6 middle-right, 7 bottom-left, 8 bottom-middle, 9 bottom-right.",
  "Return one record per visibly occupied trade slot. Empty/Add slots are not items. Do not move a center-adjacent item to the other side. For inventory screenshots, quantity may summarize repeated identical entries when visually justified.",
  "Classify imageType as TRADE, INVENTORY, ITEM, or OTHER. Classify categoryHint for each visible item.",
  "For PET items, rawName and candidateNames MUST use exact canonical spellings from the CSBT catalog below. If the image does not support a catalog identity, keep confidence low and provide only genuinely plausible candidates.",
  "Compare body shape, silhouette, color layout, face, ears/horns/wings/tail, accessories, and markings. Do not shorten a specific multi-word pet to a generic species.",
  "Maintain up to five plausible candidateNames and candidateScores. Candidate scores are visual hypotheses, not database values. Do not fill the list with random pets.",
  "Recognize identity and variants independently. itemConfidence means exact canonical identity confidence. variantConfidence covers NORMAL/NEON/MEGA and F/R badges. sideConfidence covers the assigned trade side/slot. confidence is the conservative overall identity confidence.",
  "Read N/M/F/R/FR badges independently from pet identity. A red/pink R badge means Ride; a blue/purple F badge means Fly. If both F and R badges are visible, potion is FR. If M is visible together with F/R, variant is MEGA and potion is determined separately. NONE potion means you can visibly establish that no Fly/Ride badge is present in that slot; UNKNOWN means the badge area is obscured or genuinely unclear. Never infer potion from species.",
  "Treat the visible pet artwork and the tiny N/M/F/R badges as separate evidence regions. Do not let a badge letter become part of the pet name (R is never Red Dragon; FR is never Frost Dragon).",
  "When multiple catalog names share a prefix, inspect the full icon before choosing. Examples: Frostbite Bear vs Frostbite Cub; Cupid Dragon vs other Cupid-named non-pets. Return the full canonical PET name only when the artwork supports it.",
  "Return a normalized 0..1 box around each visible item/slot when you can localize it. x/y are top-left; width/height are relative to the full screenshot.",
  "If two identities remain plausible, do not bluff: lower itemConfidence and include both. A confidently wrong recognition is worse than asking one targeted clarification.",
  "Do not output prices, values, demand, or W/F/L. NICH resolves canonical IDs and calculates deterministically from CSBT after visual verification.",
  "CURRENT CSBT PET CATALOG (PET names must match exactly):",
  VISION_PET_CATALOG,
].join("\n");

function plainJsonPrompt(basePrompt: string) {
  return `${basePrompt}\nReturn ONLY one valid JSON object matching the requested schema. No markdown fences or commentary.`;
}

function buildFocusedRecheckPrompt(items: NichVisionVerifiedItem[]) {
  const uncertain = items.filter((item) => {
    const variantUnclear = item.category === "PET" && (item.variant === "UNKNOWN" || item.potion === "UNKNOWN");
    return !item.verified || variantUnclear;
  }).slice(0, 4);
  if (!uncertain.length) return null;
  const details = uncertain.map((item) => ({
    side: item.side,
    slot: item.slot,
    firstPrediction: item.itemName ?? item.rawName,
    itemConfidence: item.itemConfidence ?? item.confidence,
    variant: item.variant,
    potion: item.potion,
    candidates: [item.itemName, ...(item.candidateNames ?? []), ...item.alternatives].filter(Boolean).slice(0, 6),
    visualEvidence: item.visualEvidence,
  }));
  return [
    VISION_PROMPT,
    "FOCUSED VERIFICATION PASS:",
    "The first pass left only the slots below uncertain. Re-inspect ONLY these exact side/slot positions in the same screenshot. Do not re-list already settled slots.",
    "Compare each uncertain icon against its supplied candidates and the canonical catalog. Re-check the N/M/F/R badge region independently. Keep the original side and slot unless the UI itself proves they were wrong.",
    "If you still cannot distinguish candidates, keep multiple candidates and low confidence instead of forcing a choice.",
    JSON.stringify(details),
  ].join("\n");
}

function shouldFocusedRecheck(items: NichVisionVerifiedItem[], imageType: NichVisionImageType) {
  if (imageType !== "TRADE") return false;
  if (process.env.NICH_GEMINI_VISION_FOCUSED_RECHECK_ENABLED?.trim().toLowerCase() === "false") return false;
  const uncertain = items.filter((item) => !item.verified || (item.category === "PET" && (item.variant === "UNKNOWN" || item.potion === "UNKNOWN")));
  return uncertain.length > 0 && uncertain.length <= 6;
}

function mergeFocusedItems(original: NichVisionVerifiedItem[], focused: NichVisionVerifiedItem[]) {
  const focusedBySlot = new Map<string, NichVisionVerifiedItem>();
  for (const item of focused) {
    if (item.side === "NONE" || !item.slot) continue;
    focusedBySlot.set(`${item.side}:${item.slot}`, item);
  }

  return original.map((item) => {
    if (item.side === "NONE" || !item.slot) return item;
    const rechecked = focusedBySlot.get(`${item.side}:${item.slot}`);
    if (!rechecked) return item;
    const originalIdentity = item.itemConfidence ?? item.confidence;
    const recheckedIdentity = rechecked.itemConfidence ?? rechecked.confidence;
    const originalVariant = item.variantConfidence ?? item.confidence;
    const recheckedVariant = rechecked.variantConfidence ?? rechecked.confidence;
    const strongerIdentity = rechecked.verified && (!item.verified || recheckedIdentity >= originalIdentity + 0.03);
    const sameCanonical = Boolean(item.itemId && rechecked.itemId && item.itemId === rechecked.itemId);
    const strongerVariant = sameCanonical && recheckedVariant >= originalVariant + 0.08;
    if (strongerIdentity) return rechecked;
    if (strongerVariant) {
      return {
        ...item,
        variant: rechecked.variant,
        potion: rechecked.potion,
        variantConfidence: recheckedVariant,
        visualEvidence: rechecked.visualEvidence || item.visualEvidence,
        candidateNames: rechecked.candidateNames?.length ? rechecked.candidateNames : item.candidateNames,
        candidateScores: rechecked.candidateScores?.length ? rechecked.candidateScores : item.candidateScores,
      };
    }
    return item;
  });
}

function sumUsage(...payloads: GeminiInteractionPayload[]) {
  const sum = (field: "total_input_tokens" | "total_output_tokens" | "total_tokens") => payloads.reduce((total, payload) => {
    const value = Number(payload.usage?.[field]);
    return total + (Number.isFinite(value) ? value : 0);
  }, 0);
  const promptTokens = sum("total_input_tokens");
  const outputTokens = sum("total_output_tokens");
  const totalTokens = sum("total_tokens");
  return {
    ...(promptTokens ? { promptTokens } : {}),
    ...(outputTokens ? { outputTokens } : {}),
    ...(totalTokens ? { totalTokens } : {}),
  };
}

function safeDebugEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.NICH_VISION_DEBUG?.trim().toLowerCase() === "true";
}

function formatVisionError(status: number, detail: string, model: string) {
  if (status === 400) return `Gemini rejected the screenshot request (G36-400). ${detail.slice(0, 220)}`;
  if (status === 401 || status === 403) return "Gemini rejected the API key or project authorization. Check GEMINI_API_KEY in the server/Worker secrets.";
  if (status === 404) return `The configured Gemini model (${model}) isn’t available to this project.`;
  if (status === 429) return "Gemini rate/quota limit was reached. Wait briefly and try again.";
  if (status >= 500) return "Gemini is temporarily unavailable. Your current trade state is safe; try the screenshot again in a moment.";
  return "Nich couldn’t analyze that screenshot right now. Please try again or type the trade manually.";
}

export async function GET() {
  return NextResponse.json(
    {
      enabled: process.env.NICH_GEMINI_VISION_ENABLED?.trim().toLowerCase() !== "false",
      configured: Boolean(process.env.GEMINI_API_KEY?.trim()),
      model: process.env.NICH_GEMINI_VISION_MODEL?.trim() || "gemini-3.6-flash",
      recognitionVersion: VISION_PIPELINE_VERSION,
      promptVersion: NICH_VISION_PROMPT_VERSION,
      catalogVersion: NICH_CATALOG_VERSION,
      focusedRecheck: process.env.NICH_GEMINI_VISION_FOCUSED_RECHECK_ENABLED?.trim().toLowerCase() !== "false",
      dailySafetyLimit: Math.floor(parseNumberSetting(process.env.NICH_GEMINI_VISION_DAILY_LIMIT, DEFAULT_DAILY_LIMIT, 1, 100_000)),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const runId = `vision-${randomUUID()}`;
  if (process.env.NICH_GEMINI_VISION_ENABLED?.trim().toLowerCase() === "false") {
    return NextResponse.json({ ok: false, runId, message: "Screenshot recognition is currently disabled." } satisfies NichVisionApiResponse, { status: 503 });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ ok: false, runId, message: "Gemini Vision is not configured yet. Add GEMINI_API_KEY to the server environment." } satisfies NichVisionApiResponse, { status: 503 });
  }

  const minuteQuotaError = await consumeVisionMinuteQuota(request);
  if (minuteQuotaError) {
    return NextResponse.json({ ok: false, runId, message: minuteQuotaError } satisfies NichVisionApiResponse, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, runId, message: "Invalid screenshot upload." } satisfies NichVisionApiResponse, { status: 400 });
  }

  const image = formData.get("image");
  if (!(image instanceof File)) {
    return NextResponse.json({ ok: false, runId, message: "Choose a screenshot first." } satisfies NichVisionApiResponse, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.has(image.type)) {
    return NextResponse.json({ ok: false, runId, message: "Use a JPG, PNG, or WebP screenshot." } satisfies NichVisionApiResponse, { status: 415 });
  }

  const maxBytes = Math.floor(parseNumberSetting(process.env.NICH_GEMINI_VISION_MAX_IMAGE_BYTES, DEFAULT_MAX_IMAGE_BYTES, 250_000, 15 * 1024 * 1024));
  if (image.size <= 0 || image.size > maxBytes) {
    return NextResponse.json({ ok: false, runId, message: `Screenshot is too large. Keep it under ${Math.ceil(maxBytes / 1024 / 1024)} MB.` } satisfies NichVisionApiResponse, { status: 413 });
  }

  const model = process.env.NICH_GEMINI_VISION_MODEL?.trim() || "gemini-3.6-flash";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.floor(parseNumberSetting(process.env.NICH_GEMINI_VISION_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 5_000, 120_000)));

  try {
    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const dimensions = parseImageDimensions(imageBuffer, image.type);
    if (!dimensions) {
      return NextResponse.json({ ok: false, runId, message: "That image looks malformed or its dimensions could not be verified." } satisfies NichVisionApiResponse, { status: 415 });
    }
    if (
      dimensions.width < 80 || dimensions.height < 80 ||
      dimensions.width > MAX_IMAGE_DIMENSION || dimensions.height > MAX_IMAGE_DIMENSION ||
      dimensions.width * dimensions.height > MAX_IMAGE_PIXELS
    ) {
      return NextResponse.json({ ok: false, runId, message: "That screenshot has unsupported dimensions. Use a normal screenshot under 8192×8192." } satisfies NichVisionApiResponse, { status: 413 });
    }

    const imageHash = createHash("sha256")
      .update(VISION_PIPELINE_VERSION)
      .update("\0")
      .update(NICH_CATALOG_VERSION)
      .update("\0")
      .update(model)
      .update("\0")
      .update(image.type)
      .update("\0")
      .update(imageBuffer)
      .digest("hex");
    const screenshotId = `shot-${imageHash.slice(0, 24)}`;
    const cached = visionResultCache.get(imageHash);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      const cachedSession = cached.response.items && cached.response.imageType === "TRADE"
        ? createTradeSessionFromVision({
            items: cached.response.items,
            layoutConfidence: cached.response.tradeSession?.layoutConfidence ?? 1,
            recognitionVersion: VISION_PIPELINE_VERSION,
            promptVersion: NICH_VISION_PROMPT_VERSION,
            catalogVersion: NICH_CATALOG_VERSION,
            screenshotId,
            runId,
            imageWidth: dimensions.width,
            imageHeight: dimensions.height,
          })
        : undefined;
      return NextResponse.json({
        ...cached.response,
        runId,
        cacheStatus: "HIT",
        ...(cachedSession ? { tradeSession: cachedSession } : {}),
      } satisfies NichVisionApiResponse);
    }
    if (cached) visionResultCache.delete(imageHash);

    const dailyQuotaError = await consumeVisionDailyGeminiQuota(getClientIdentifier(request));
    if (dailyQuotaError) {
      return NextResponse.json({ ok: false, runId, message: dailyQuotaError } satisfies NichVisionApiResponse, { status: 429 });
    }

    const data = imageBuffer.toString("base64");
    const maxOutputTokens = Math.floor(parseNumberSetting(process.env.NICH_GEMINI_VISION_MAX_TOKENS, 1_700, 256, 4_096));
    const requestedThinkingLevel = process.env.NICH_GEMINI_VISION_THINKING_LEVEL?.trim().toLowerCase() || "minimal";
    const thinkingLevel = new Set(["minimal", "low", "medium", "high"]).has(requestedThinkingLevel)
      ? requestedThinkingLevel
      : "minimal";

    const callGemini = async (prompt: string, structured: boolean) => fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        input: [
          { type: "text", text: structured ? prompt : plainJsonPrompt(prompt) },
          { type: "image", mime_type: image.type, data },
        ],
        ...(structured
          ? { response_format: { type: "text", mime_type: "application/json", schema: VISION_SCHEMA } }
          : {}),
        generation_config: { max_output_tokens: maxOutputTokens, thinking_level: thinkingLevel },
      }),
    });

    const readPayload = async (response: Response) => {
      try { return (await response.json()) as GeminiInteractionPayload; }
      catch { return {} as GeminiInteractionPayload; }
    };

    const performVisionCall = async (prompt: string): Promise<VisionCallResult | NextResponse> => {
      let response = await callGemini(prompt, true);
      let payload = await readPayload(response);
      if (!response.ok && response.status === 400) {
        console.warn(`[NICH Vision ${runId}] structured request rejected; retrying prompt-enforced JSON`, safeGeminiErrorDetail(payload) || "HTTP 400");
        response = await callGemini(prompt, false);
        payload = await readPayload(response);
      }
      if (!response.ok) {
        const detail = safeGeminiErrorDetail(payload) || `Gemini Vision request failed with status ${response.status}.`;
        console.warn(`[NICH Vision ${runId}] ${model}:`, detail);
        return NextResponse.json(
          { ok: false, runId, model, message: formatVisionError(response.status, detail, model) } satisfies NichVisionApiResponse,
          { status: 502 },
        );
      }
      const text = extractText(payload);
      let parsed: unknown;
      try {
        parsed = JSON.parse(text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim());
      } catch {
        return NextResponse.json({ ok: false, runId, model, message: "Nich could see the screenshot, but the recognition result was invalid. Try the screenshot again." } satisfies NichVisionApiResponse, { status: 502 });
      }
      const modelResult = sanitizeModelResult(parsed);
      if (!modelResult) {
        return NextResponse.json({ ok: false, runId, model, message: "Nich couldn’t confidently read that screenshot." } satisfies NichVisionApiResponse, { status: 422 });
      }
      return { modelResult, payload };
    };

    const initialCall = await performVisionCall(VISION_PROMPT);
    if (initialCall instanceof NextResponse) return initialCall;

    const modelResult = initialCall.modelResult;
    let items = modelResult.items.map(verifyVisionItem);
    const payloads = [initialCall.payload];
    let focusedRecheckUsed = false;

    if (shouldFocusedRecheck(items, modelResult.imageType)) {
      const focusedPrompt = buildFocusedRecheckPrompt(items);
      if (focusedPrompt) {
        const focusedCall = await performVisionCall(focusedPrompt);
        if (!(focusedCall instanceof NextResponse)) {
          focusedRecheckUsed = true;
          payloads.push(focusedCall.payload);
          const focusedItems = focusedCall.modelResult.items.map(verifyVisionItem);
          items = mergeFocusedItems(items, focusedItems);
        } else {
          console.warn(`[NICH Vision ${runId}] focused verification failed; preserving first-pass state`);
        }
      }
    }

    const sideSlotTotal = (side: "YOU" | "THEM") => items
      .filter((item) => item.side === side)
      .reduce((total, item) => total + Math.max(1, item.quantity || 1), 0);
    const youSlotMismatch = modelResult.imageType === "TRADE" && modelResult.youOccupiedSlots !== undefined && sideSlotTotal("YOU") !== modelResult.youOccupiedSlots;
    const themSlotMismatch = modelResult.imageType === "TRADE" && modelResult.themOccupiedSlots !== undefined && sideSlotTotal("THEM") !== modelResult.themOccupiedSlots;
    const duplicateSlots = modelResult.imageType === "TRADE" && (() => {
      const seen = new Set<string>();
      for (const item of items) {
        if (!item.slot || item.side === "NONE") continue;
        const key = `${item.side}:${item.slot}`;
        if (seen.has(key)) return true;
        seen.add(key);
      }
      return false;
    })();
    const incompleteTradeGrid = Boolean(youSlotMismatch || themSlotMismatch || duplicateSlots);
    const tradeSidesPresent = modelResult.imageType === "TRADE" && sideSlotTotal("YOU") > 0 && sideSlotTotal("THEM") > 0;
    const structurallyConsistentTrade = Boolean(
      modelResult.imageType === "TRADE" && tradeSidesPresent && !incompleteTradeGrid,
    );
    // Gemini's global layoutConfidence can be conservative even when the two
    // 3x3 grids, occupied counts and per-slot sides are internally consistent.
    // Do not poison every recognized slot merely because the global score is
    // 0.7x. Only block/cap the trade for a genuinely broken grid or a severely
    // uncertain layout. Individual sideConfidence still guards each slot.
    const severeLayoutUncertainty = modelResult.imageType === "TRADE" && modelResult.layoutConfidence < 0.55;
    const lowLayoutConfidence = modelResult.imageType === "TRADE" && modelResult.layoutConfidence < 0.82 && !structurallyConsistentTrade;
    const layoutBlocksCalculation = Boolean(incompleteTradeGrid || severeLayoutUncertainty);

    let tradeSession = modelResult.imageType === "TRADE"
      ? createTradeSessionFromVision({
          items,
          layoutConfidence: modelResult.layoutConfidence,
          recognitionVersion: VISION_PIPELINE_VERSION,
          promptVersion: NICH_VISION_PROMPT_VERSION,
          catalogVersion: NICH_CATALOG_VERSION,
          screenshotId,
          runId,
          imageWidth: dimensions.width,
          imageHeight: dimensions.height,
        })
      : undefined;

    if (tradeSession && layoutBlocksCalculation) {
      const all = [...tradeSession.userSide, ...tradeSession.theirSide].map((slot) => ({
        ...slot,
        status: "UNCERTAIN" as const,
        confidence: {
          ...slot.confidence,
          // Force layout-uncertain slots below the auto-confirm gate. Keep the
          // model's original layout score separately on the TradeSession for debug.
          side: Math.min(slot.confidence.side, modelResult.layoutConfidence, 0.69),
          overall: Math.min(slot.confidence.overall, modelResult.layoutConfidence, 0.69),
          level: "LOW" as const,
        },
      }));
      tradeSession = createTradeSessionFromVision({
        items: all.map((slot) => ({
          rawName: slot.rawName ?? slot.canonicalName ?? "Unknown",
          side: slot.side,
          variant: slot.mega ? "MEGA" : slot.neon ? "NEON" : slot.neon === null || slot.mega === null ? "UNKNOWN" : "NORMAL",
          potion: slot.fly === null || slot.ride === null ? "UNKNOWN" : slot.fly && slot.ride ? "FR" : slot.fly ? "F" : slot.ride ? "R" : "NONE",
          quantity: slot.quantity,
          confidence: slot.confidence.item,
          itemConfidence: slot.confidence.item,
          variantConfidence: slot.confidence.variant,
          sideConfidence: slot.confidence.side,
          itemId: slot.canonicalItemId,
          itemName: slot.canonicalName,
          category: slot.category,
          databaseConfidence: slot.canonicalItemId ? 1 : 0,
          verified: Boolean(slot.canonicalItemId),
          alternatives: slot.alternatives.map((candidate) => candidate.itemName),
          slot: slot.gridPosition,
          visualEvidence: slot.visualEvidence,
          visibleText: slot.visibleText,
          box: slot.boundingBox,
        })),
        layoutConfidence: modelResult.layoutConfidence,
        recognitionVersion: VISION_PIPELINE_VERSION,
        promptVersion: NICH_VISION_PROMPT_VERSION,
        catalogVersion: NICH_CATALOG_VERSION,
        screenshotId,
        runId,
        imageWidth: dimensions.width,
        imageHeight: dimensions.height,
      });
    }

    const candidateLocalPrompt = modelResult.imageType === "TRADE" && tradeSession
      ? formatTradeSessionForCalculation(tradeSession)
      : buildVisionLocalPrompt(modelResult.imageType, items);
    const summary = summarizeVisionItems(modelResult.imageType, items);
    const sessionUnresolved = tradeSession?.unresolvedSlots.length ?? 0;
    const uncertainIdentityCount = items.filter((item) => !item.verified).length;
    const unknownVariantCount = modelResult.imageType === "TRADE"
      ? items.filter((item) => item.verified && item.category === "PET" && (item.variant === "UNKNOWN" || item.potion === "UNKNOWN")).length
      : 0;
    const localPrompt = !sessionUnresolved && !layoutBlocksCalculation
      ? candidateLocalPrompt
      : undefined;
    const sideUnclear = modelResult.imageType === "TRADE" && !tradeSession;

    const message = [
      summary || "I couldn’t identify any Adopt Me items confidently.",
      focusedRecheckUsed ? "\n✓ I re-checked the uncertain trade slots before showing this result." : "",
      incompleteTradeGrid ? "\n⚠️ The detected items do not fully match the occupied trade grid, so I preserved the recognized slots but will not calculate an incomplete trade." : "",
      lowLayoutConfidence ? "\n⚠️ The trade-grid structure is still unclear, so I’m keeping the detected slots without calculating yet." : "",
      unknownVariantCount ? `\nI still need ${unknownVariantCount} variant/potion detail${unknownVariantCount === 1 ? "" : "s"} confirmed.` : "",
      sessionUnresolved || uncertainIdentityCount || sideUnclear || layoutBlocksCalculation
        ? "\nI kept everything I recognized. Correct only the unclear slot(s), and I’ll continue from this same trade automatically."
        : "",
    ].filter(Boolean).join("\n");

    const responseBody = {
      ok: Boolean(items.length),
      model,
      imageType: modelResult.imageType,
      items,
      ...(localPrompt ? { localPrompt } : {}),
      ...(tradeSession ? { tradeSession } : {}),
      message,
      runId,
      recognitionVersion: VISION_PIPELINE_VERSION,
      promptVersion: NICH_VISION_PROMPT_VERSION,
      catalogVersion: NICH_CATALOG_VERSION,
      cacheStatus: "MISS" as const,
      image: { width: dimensions.width, height: dimensions.height, bytes: imageBuffer.length, mimeType: image.type },
      ...(safeDebugEnabled()
        ? {
            debug: {
              model,
              layoutConfidence: modelResult.layoutConfidence,
              uncertainSlots: tradeSession?.unresolvedSlots ?? [],
              focusedRecheckUsed,
            },
          }
        : {}),
      usage: sumUsage(...payloads),
    } satisfies NichVisionApiResponse;

    console.info(
      `[NICH Vision ${runId}] type=${modelResult.imageType} items=${items.length} unresolved=${tradeSession?.unresolvedSlots.length ?? uncertainIdentityCount} recheck=${focusedRecheckUsed ? "yes" : "no"} cache=MISS`,
    );

    pruneVisionCache();
    visionResultCache.set(imageHash, { response: responseBody, expiresAt: Date.now() + getVisionCacheTtlMs() });
    return NextResponse.json(responseBody);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.warn(`[NICH Vision ${runId}] ${model} unavailable:`, detail);
    const timeoutMessage = error instanceof Error && error.name === "AbortError"
      ? "Screenshot analysis timed out. Your chat is still intact—try again with a tighter crop or type the unclear item."
      : "Nich couldn’t analyze that screenshot right now. Your current chat is still intact; try again or type the trade manually.";
    return NextResponse.json({ ok: false, runId, model, message: timeoutMessage } satisfies NichVisionApiResponse, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
