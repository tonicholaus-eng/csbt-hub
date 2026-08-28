import { Buffer } from "node:buffer";

import { NextRequest, NextResponse } from "next/server";

import { parseNichGameId } from "@/lib/nich/game/types";

import {
  buildVisionLocalPrompt,
  consolidateTradeSlotDetections,
  repairTradeGeometry,
  mergeVisionCrossCheck,
  shouldBlockTradeLayout,
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
import { consumeServerQuota } from "@/lib/nich/serverQuota";

export const runtime = "nodejs";
export const maxDuration = 90;

const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT = 6;
const DEFAULT_DAILY_LIMIT = 100;
const MAX_IMAGE_DIMENSION = 8192;

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const IMAGE_TYPES = new Set<NichVisionImageType>(["TRADE", "INVENTORY", "ITEM", "OTHER"]);
const SIDES = new Set<NichVisionSide>(["YOU", "THEM", "NONE"]);
const VARIANTS = new Set<NichVisionVariant>(["NORMAL", "NEON", "MEGA", "UNKNOWN"]);
const POTIONS = new Set<NichVisionPotion>(["NONE", "F", "R", "FR", "UNKNOWN"]);
const CATEGORY_HINTS = new Set<NichVisionCategory>([
  "PET", "PETWEAR", "EGG", "VEHICLE", "FOOD", "GIFT", "STROLLER", "TOY", "STICKER", "OTHER", "UNKNOWN",
]);

const VISION_PIPELINE_VERSION = "vision-v29-cloudflare-inline-data-20260818";
const VISION_RELEASE = "csbt-nich-vision-v29-cloudflare-inline-data";

type ImageDimensions = { width: number; height: number };

type GeminiInteractionPayload = {
  status?: unknown;
  id?: unknown;
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

type GeminiGenerateContentPayload = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: unknown;
      }>;
    };
    finishReason?: unknown;
    finishMessage?: unknown;
  }>;
  usageMetadata?: {
    promptTokenCount?: unknown;
    candidatesTokenCount?: unknown;
    totalTokenCount?: unknown;
  };
  error?: { message?: unknown; status?: unknown };
};

type GeminiVisionPayload = GeminiInteractionPayload | GeminiGenerateContentPayload;

type VisionCallResult = {
  modelResult: NichVisionModelResult;
  payload: GeminiVisionPayload;
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

function clamp01(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
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


function extractText(payload: GeminiVisionPayload) {
  const interactionText = ((payload as GeminiInteractionPayload).steps ?? [])
    .filter((step) => step?.type === "model_output")
    .flatMap((step) => step.content ?? [])
    .filter((part) => part?.type === "text")
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
  if (interactionText) return interactionText;

  return (((payload as GeminiGenerateContentPayload).candidates ?? [])[0]?.content?.parts ?? [])
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}


function extractBalancedJsonObject(text: string) {
  const source = text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  if (!source) return null;

  try {
    return JSON.parse(source) as unknown;
  } catch {
    // Gemini structured output should be raw JSON, but occasionally a model/backend
    // can prepend or append text. Recover the first complete JSON object without
    // attempting to "repair" missing/truncated fields.
  }

  const start = source.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(source.slice(start, index + 1)) as unknown;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function safeGeminiErrorDetail(payload: GeminiVisionPayload) {
  if (typeof payload.error?.message === "string") return payload.error.message;
  const recorded = (payload as GeminiInteractionPayload).errors?.find((entry) => typeof entry?.message === "string");
  return typeof recorded?.message === "string" ? recorded.message : undefined;
}

// v26+ uses prompt-enforced compact JSON through the baseline Interactions
// request. The old response-schema constants were intentionally removed so
// production lint stays clean and there is no misleading dead configuration.

const FAST_VISION_PROMPT = [
  "Inspect this Adopt Me screenshot and return structured JSON only.",
  "If it is a trade: LEFT grid=YOU, RIGHT grid=THEM. Return one record per occupied slot in row-major order. Ignore empty/+ cells, buttons, usernames, arrows, and center totals.",
  "Identify pet artwork separately from N/M/F/R badges. N=NEON, M=MEGA, F=Fly, R=Ride, FR=Fly+Ride. Badge letters are never pet names.",
  "Use an exact Adopt Me item name only when visually defensible. If unsure, lower confidence and provide up to 3 plausible candidateNames instead of guessing.",
  "Photographed, blurry, compressed, cropped, blue in-game, and coral/pink calculator trade UIs are all valid trades.",
].join("\n");

const EMPTY_TRADE_RECOVERY_PROMPT = [
  "This is a recovery/verification pass for a screenshot that may be an Adopt Me trade. The first pass either missed the occupied slots or may have classified the screenshot incorrectly.",
  "First inspect the layout. If it visibly contains two opposing Adopt Me/value-calculator trade grids, set imageType=TRADE and find EVERY visibly occupied item/pet slot even if you cannot identify the exact pet.",
  "If it is genuinely not a trade, do not force a trade result: return the correct imageType and only items that are visibly defensible.",
  "LEFT grid=YOU, RIGHT grid=THEM. Return one item record per occupied slot in row-major order on each side.",
  "If exact identity is unclear, rawName must be a short visual description such as 'blue round pet' and itemConfidence must be low. Do not omit the slot and do not invent a pet name.",
  "Read N/M/F/R badges separately from identity. N=NEON, M=MEGA, F=Fly, R=Ride, FR=Fly+Ride.",
  "Ignore empty/+ cells, buttons, usernames, arrows, center totals, prices, and browser/app chrome.",
  "Return normalized bounding boxes when possible so local geometry can recover the side and slot.",
].join("\n");



const VISION_PROMPT = [
  "Analyze this image as an Adopt Me trading screenshot. Return only the requested structured result.",
  "1) Classify imageType as TRADE, INVENTORY, ITEM, or OTHER.",
  "1b) Before choosing ITEM/OTHER, explicitly check for two opposing item grids, a central separator/arrow/total, trade buttons, or the blue in-game Adopt Me trade window. If those trade-layout cues exist, classify as TRADE even when pet artwork is tiny or unreadable.",
  "2) For TRADE: LEFT grid=YOU and RIGHT grid=THEM unless visible labels clearly prove otherwise. Slot order is row-major independently on each side.",
  "3) Return exactly one item for each occupied slot. Ignore empty/+ cells, buttons, usernames, arrows, prices, center totals, browser chrome, and unrelated UI.",
  "4) Pet identity and N/M/F/R badges are separate evidence. N=NEON, M=MEGA, F=Fly, R=Ride, FR=Fly+Ride. Never turn R into Red Dragon or FR into Frost Dragon.",
  "5) Use exact canonical Adopt Me names only when the artwork supports them. If two pets are plausible, lower confidence and return up to 3 candidateNames instead of bluffing.",
  "6) For side/layout confidence, use grid geometry. A blurry pet does not make the trade grid unclear. For trades, always include slot numbers independently on each side.",
  "8) For INVENTORY use side=NONE and ignore tabs/currency/buttons. Only use quantity>1 when a visible count proves it.",
  "9) For ITEM use side=NONE; readable item-name text is stronger evidence than a vague icon guess.",
  "10) For collages, analyze the largest/clearest relevant Adopt Me panel only; do not merge separate screenshots.",
  "11) If you do not know a new/recent pet, describe it in rawName, keep confidence low, and do not invent a plausible-sounding name.",
  "12) Do not output prices, demand, or W/F/L. NICH resolves catalog IDs and values after vision.",
  "Valid trade UIs include the blue in-game Adopt Me window and calculator/value-site layouts with two opposing 3x3 grids, including coral/pink grids with a center numeric total.",
].join("\n");

function plainJsonPrompt(basePrompt: string) {
  return `${basePrompt}
Return ONLY one valid JSON object. No markdown fences or commentary.
Use exactly this compact shape:
{"imageType":"TRADE|INVENTORY|ITEM|OTHER","layoutConfidence":0.0,"youOccupiedSlots":0,"themOccupiedSlots":0,"items":[{"rawName":"visible item name or short visual description","side":"YOU|THEM|NONE","variant":"NORMAL|NEON|MEGA|UNKNOWN","potion":"NONE|F|R|FR|UNKNOWN","quantity":1,"confidence":0.0,"categoryHint":"PET|PETWEAR|EGG|VEHICLE|FOOD|GIFT|STROLLER|TOY|STICKER|OTHER|UNKNOWN","candidateNames":[],"slot":1}]}
For TRADE, include one item object for every occupied slot even when identity is uncertain.`;
}

const VISUAL_RESCUE_CANDIDATES: Array<{ match: RegExp; add: string[] }> = [
  { match: /glormy/i, add: ["Frostbite Bear", "Frostbite Cub"] },
  { match: /frostbite/i, add: ["Glormy Dolphin", "Glormy Hound", "Glormy Leo", "Glormy Crab"] },
  { match: /strawberry/i, add: ["Cabbit"] },
  { match: /cabbit/i, add: ["Strawberry Shortcake Bat Dragon", "Strawberry Penguin"] },
  { match: /tuxedo/i, add: ["Siamese Cat"] },
  { match: /siamese/i, add: ["Tuxedo Cat"] },
  { match: /elephant/i, add: ["Bush Elephant", "Elephant"] },
  { match: /bush elephant/i, add: ["Elephant"] },
  { match: /sugar axolotl|sugar skull dog/i, add: ["Sugar Axolotl", "Sugar Skull Dog"] },
];

function expandVisualCandidates(names: string[]) {
  const result = new Set(names.filter(Boolean));
  const haystack = names.join(" | ");
  for (const rule of VISUAL_RESCUE_CANDIDATES) {
    if (!rule.match.test(haystack)) continue;
    for (const name of rule.add) result.add(name);
  }
  return [...result].slice(0, 10);
}

function buildFocusedRecheckPrompt(items: NichVisionVerifiedItem[], auditAllPetSlots = false) {
  const selected = items.filter((item) => {
    if (item.side === "NONE" || !item.slot) return false;
    const variantUnclear = item.category === "PET" && (item.variant === "UNKNOWN" || item.potion === "UNKNOWN");
    return auditAllPetSlots ? item.category === "PET" : !item.verified || variantUnclear;
  }).slice(0, 9);
  if (!selected.length) return null;

  const details = selected.map((item) => {
    const names = [item.itemName, item.rawName, ...(item.candidateNames ?? []), ...item.alternatives]
      .filter((name): name is string => Boolean(name));
    return auditAllPetSlots
      ? {
          side: item.side,
          slot: item.slot,
          variantHint: item.variant,
          potionHint: item.potion,
          // Candidate order is deliberately alphabetical so the verifier cannot
          // infer which name came from the first pass.
          candidatesToCompare: expandVisualCandidates(names).sort((a, b) => a.localeCompare(b)),
          instruction: "Choose by artwork, not by candidate order. If none matches, return an uncertain description instead of forcing a name.",
        }
      : {
          side: item.side,
          slot: item.slot,
          firstPrediction: item.itemName ?? item.rawName,
          firstPredictionConfidence: item.itemConfidence ?? item.confidence,
          variant: item.variant,
          potion: item.potion,
          candidatesToCompare: expandVisualCandidates(names),
          visualEvidence: item.visualEvidence,
        };
  });

  return [
    "You are the independent visual verification pass for an Adopt Me trade screenshot.",
    "Do NOT trust the first-pass pet names. Re-identify every listed slot from the artwork. When firstPrediction is present it is only a hypothesis to challenge; in blind-audit rows it is intentionally omitted.",
    "The screenshot may be either the blue in-game Adopt Me trade UI OR a value-calculator trade UI with two 3x3 grids. LEFT=YOU and RIGHT=THEM. Keep the listed side and slot unless the visible grid clearly proves otherwise.",
    "Focus on silhouette, face, ears/horns, wings, tail, body color, markings, accessories, and event-specific styling. Treat tiny N/M/F/R badges separately from identity.",
    "Never collapse a more specific current pet into a generic species merely because their silhouette is similar. In particular, explicitly discriminate Bush Elephant vs Elephant and Sugar Axolotl vs Sugar Skull Dog whenever either appears in candidatesToCompare.",
    auditAllPetSlots
      ? "This is a blind candidate audit: the first-pass choice is intentionally hidden and candidate order is arbitrary. Compare every candidate to the artwork. For known confusion families, explicitly use silhouette, ears/horns/wings/tail, face shape, body palette and markings to discriminate them."
      : "Use candidatesToCompare as a shortlist, including known visual-confusion rescues. If none actually matches the artwork, return a different exact Adopt Me pet name rather than forcing the shortlist. Never invent a non-existent pet.",
    "For each listed slot, return rawName as your independently chosen exact pet identity, plus up to 3 candidateNames for genuinely close alternatives. If identity is not visually defensible, lower confidence instead of bluffing.",
    "Re-read N/M/F/R badges independently. R means Ride, F means Fly, M means Mega; badge letters are never part of the pet name.",
    "Return only the listed slots. imageType must be TRADE. layoutConfidence measures only the left/right grid geometry.",
    JSON.stringify(details),
  ].join("\n");
}

function shouldFocusedRecheck(
  items: NichVisionVerifiedItem[],
  imageType: NichVisionImageType,
) {
  if (imageType !== "TRADE") return false;
  if (process.env.NICH_GEMINI_VISION_FOCUSED_RECHECK_ENABLED?.trim().toLowerCase() === "false") return false;
  const tradePets = items.filter((item) => item.category === "PET" && item.side !== "NONE");
  const uncertain = tradePets.filter((item) => !item.verified || item.variant === "UNKNOWN" || item.potion === "UNKNOWN");
  // Keep the expensive second Gemini pass targeted. The previous pipeline audited
  // nearly every icon-only trade, doubling latency and causing otherwise-good
  // screenshots to time out. Recheck only genuinely unresolved slots.
  return uncertain.length > 0 && uncertain.length <= 6;
}

function shouldAuditAllPetSlots(items: NichVisionVerifiedItem[], dimensions: ImageDimensions) {
  const tradePets = items.filter((item) => item.category === "PET" && item.side !== "NONE");
  if (!tradePets.length || tradePets.length > 9) return false;
  return Math.min(dimensions.width, dimensions.height) < 900
    || tradePets.some((item) => item.verificationReason !== "exact-visible-text");
}

function downgradeUnauditedPetIdentities(items: NichVisionVerifiedItem[]) {
  return items.map((item) => {
    if (item.category !== "PET" || item.side === "NONE" || !item.verified || item.verificationReason === "exact-visible-text") return item;
    return {
      ...item,
      verified: false,
      confidence: Math.min(item.confidence, 0.69),
      itemConfidence: Math.min(item.itemConfidence ?? item.confidence, 0.69),
      verificationReason: "independent-audit-unavailable",
    };
  });
}

function sumUsage(...payloads: GeminiVisionPayload[]) {
  let promptTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;
  for (const payload of payloads) {
    const interaction = payload as GeminiInteractionPayload;
    const generated = payload as GeminiGenerateContentPayload;
    promptTokens += Number(interaction.usage?.total_input_tokens ?? generated.usageMetadata?.promptTokenCount ?? 0) || 0;
    outputTokens += Number(interaction.usage?.total_output_tokens ?? generated.usageMetadata?.candidatesTokenCount ?? 0) || 0;
    totalTokens += Number(interaction.usage?.total_tokens ?? generated.usageMetadata?.totalTokenCount ?? 0) || 0;
  }
  return {
    ...(promptTokens ? { promptTokens } : {}),
    ...(outputTokens ? { outputTokens } : {}),
    ...(totalTokens ? { totalTokens } : {}),
  };
}

function recoverTradeImageType(result: NichVisionModelResult): NichVisionModelResult {
  if (result.imageType === "TRADE") return result;
  const hasYou = result.items.some((item) => item.side === "YOU");
  const hasThem = result.items.some((item) => item.side === "THEM");
  const explicitCounts = (result.youOccupiedSlots ?? 0) > 0 && (result.themOccupiedSlots ?? 0) > 0;
  if ((hasYou && hasThem) || explicitCounts) {
    return { ...result, imageType: "TRADE", layoutConfidence: Math.max(result.layoutConfidence, 0.72) };
  }
  return result;
}

function safeDebugEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.NICH_VISION_DEBUG?.trim().toLowerCase() === "true";
}

function formatVisionError(status: number, detail: string, model: string) {
  if (status === 400) return `Gemini rejected the Interactions vision request (G36-400). ${detail.slice(0, 260)}`;
  if (status === 401 || status === 403) return "Gemini rejected the API key or project authorization. Check GEMINI_API_KEY in the server/Worker secrets.";
  if (status === 404) return `The configured Gemini model (${model}) isn’t available to this project.`;
  if (status === 429) return "Gemini rate/quota limit was reached. Wait briefly and try again.";
  if (status >= 500) return "Gemini is temporarily unavailable. Your current trade state is safe; try the screenshot again in a moment.";
  return "Nich couldn’t analyze that screenshot right now. Please try again or type the trade manually.";
}

const STABLE_PRIMARY_VISION_MODEL = "gemini-3.6-flash";
const STABLE_FALLBACK_VISION_MODEL = "gemini-3.5-flash-lite";

function normalizePrimaryVisionModel(value: string | undefined) {
  const configured = value?.trim() || STABLE_PRIMARY_VISION_MODEL;
  // Keep NICH on Google's current stable production vision model. Older local
  // .env files have carried experimental/non-current IDs such as 3.7; those
  // should never silently break screenshot recognition.
  return configured === STABLE_PRIMARY_VISION_MODEL
    ? configured
    : STABLE_PRIMARY_VISION_MODEL;
}

function normalizeFallbackVisionModel(value: string | undefined) {
  const configured = value?.trim() || STABLE_FALLBACK_VISION_MODEL;
  return configured === STABLE_FALLBACK_VISION_MODEL || configured === STABLE_PRIMARY_VISION_MODEL
    ? configured
    : STABLE_FALLBACK_VISION_MODEL;
}


export async function GET() {
  return NextResponse.json(
    {
      enabled: process.env.NICH_GEMINI_VISION_ENABLED?.trim().toLowerCase() !== "false",
      configured: Boolean(process.env.GEMINI_API_KEY?.trim()),
      model: normalizePrimaryVisionModel(process.env.NICH_GEMINI_VISION_MODEL),
      configuredModel: process.env.NICH_GEMINI_VISION_MODEL?.trim() || STABLE_PRIMARY_VISION_MODEL,
      recognitionVersion: VISION_PIPELINE_VERSION,
      release: VISION_RELEASE,
      promptVersion: NICH_VISION_PROMPT_VERSION,
      catalogVersion: NICH_CATALOG_VERSION,
      focusedRecheck: process.env.NICH_GEMINI_VISION_FOCUSED_RECHECK_ENABLED?.trim().toLowerCase() !== "false",
      transport: "gemini-inline-data+interactions-v1beta-baseline",
      freePlanOptimized: true,
      thinkingLevel: process.env.NICH_GEMINI_VISION_THINKING_LEVEL?.trim().toLowerCase() || "low",
      effectivePrimaryThinkingLevel: "model-default",
      fallbackModel: normalizeFallbackVisionModel(process.env.NICH_GEMINI_VISION_FAST_MODEL),
      mediaResolutionMode: "model-default-no-optional-config",
      interactionRequestMode: "baseline-model-text-inline-image",
      screenshotPrepMode: "preserve-original-or-auto-trade-zoom-fallback",
      visualDisambiguation: "confusion-family-targeted-audit-v2",
      dailySafetyLimit: Math.floor(parseNumberSetting(process.env.NICH_GEMINI_VISION_DAILY_LIMIT, DEFAULT_DAILY_LIMIT, 1, 100_000)),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const runId = `vision-${globalThis.crypto.randomUUID()}`;
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

  /**
   * Screenshot recognition is game-scoped.
   *
   * Everything below this point — the prompt, the candidate audit, the trade
   * session builder and the item resolver it calls — is Adopt Me's. Running an
   * MM2 screenshot through it would fuzzy-match MM2 weapon names against the
   * Adopt Me pet catalog, which is exactly the failure this architecture
   * forbids. Until MM2 vision exists, an MM2 screenshot is declined rather than
   * misread.
   *
   * The caller states the game in a header; a missing header stays Adopt Me
   * only because this endpoint has always been Adopt Me and no MM2 client
   * exists yet. An explicit "mm2" is refused, never silently downgraded.
   */
  const requestedGame = parseNichGameId(request.headers.get("x-nich-game") ?? "adopt-me");
  if (requestedGame !== "adopt-me") {
    return NextResponse.json(
      {
        ok: false,
        runId,
        message:
          "Screenshot recognition is only available for Adopt Me right now. " +
          "For MM2, type the weapons and I'll run the trade from the MM2 catalog.",
      } satisfies NichVisionApiResponse,
      { status: 501 },
    );
  }

  const mimeType = (request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json({ ok: false, runId, message: "Use a JPG, PNG, or WebP screenshot." } satisfies NichVisionApiResponse, { status: 415 });
  }

  const maxBytes = Math.floor(parseNumberSetting(process.env.NICH_GEMINI_VISION_MAX_IMAGE_BYTES, 2 * 1024 * 1024, 250_000, 6 * 1024 * 1024));
  const declaredBytes = Number(request.headers.get("x-nich-image-bytes") || request.headers.get("content-length") || 0);
  if (!Number.isFinite(declaredBytes) || declaredBytes <= 0 || declaredBytes > maxBytes) {
    return NextResponse.json({ ok: false, runId, message: `Screenshot is too large. NICH v20 keeps uploads under ${Math.ceil(maxBytes / 1024 / 1024)} MB to protect the Cloudflare Free CPU budget.` } satisfies NichVisionApiResponse, { status: 413 });
  }
  if (!request.body) {
    return NextResponse.json({ ok: false, runId, message: "The screenshot upload was empty." } satisfies NichVisionApiResponse, { status: 400 });
  }

  const headerDimension = (name: string) => {
    const value = Math.floor(Number(request.headers.get(name)) || 0);
    return Math.max(1, Math.min(MAX_IMAGE_DIMENSION, value || 1));
  };
  const dimensions: ImageDimensions = {
    width: headerDimension("x-nich-image-width"),
    height: headerDimension("x-nich-image-height"),
  };
  const clientHash = (request.headers.get("x-nich-vision-hash") || "").trim().toLowerCase();
  const screenshotId = /^[a-f0-9]{64}$/.test(clientHash)
    ? `shot-${clientHash.slice(0, 24)}`
    : `shot-${runId.slice(-24)}`;

  const configuredModel = process.env.NICH_GEMINI_VISION_MODEL?.trim() || STABLE_PRIMARY_VISION_MODEL;
  const model = normalizePrimaryVisionModel(process.env.NICH_GEMINI_VISION_MODEL);
  const fastModel = normalizeFallbackVisionModel(process.env.NICH_GEMINI_VISION_FAST_MODEL);
  if (configuredModel !== model) {
    console.warn(`[NICH Vision ${runId}] ignoring unsupported/non-stable configured model '${configuredModel}', using '${model}'`);
  }
  const overallTimeoutMs = Math.floor(parseNumberSetting(process.env.NICH_GEMINI_VISION_TIMEOUT_MS, 52_000, 15_000, 90_000));
  const deadline = Date.now() + overallTimeoutMs;

  const dailyQuotaError = await consumeVisionDailyGeminiQuota(getClientIdentifier(request));
  if (dailyQuotaError) {
    return NextResponse.json({ ok: false, runId, message: dailyQuotaError } satisfies NichVisionApiResponse, { status: 429 });
  }

  // v29 uses inline image data for the normal screenshot path. Google recommends
  // inline data for small, transient media, which matches NICH's browser-compressed
  // screenshots and avoids the Gemini Files upload endpoint that can reject
  // Cloudflare egress with FAILED_PRECONDITION / unsupported location.
  let imageBytes: ArrayBuffer;
  try {
    imageBytes = await request.arrayBuffer();
  } catch {
    return NextResponse.json({ ok: false, runId, model, message: "The screenshot body could not be read." } satisfies NichVisionApiResponse, { status: 400 });
  }

  const actualBytes = imageBytes.byteLength;
  if (actualBytes <= 0) {
    return NextResponse.json({ ok: false, runId, model, message: "The screenshot upload was empty." } satisfies NichVisionApiResponse, { status: 400 });
  }
  if (actualBytes > maxBytes) {
    return NextResponse.json({ ok: false, runId, model, message: `Screenshot is too large after browser preparation. Keep it under ${Math.ceil(maxBytes / 1024 / 1024)} MB.` } satisfies NichVisionApiResponse, { status: 413 });
  }

  // The client already compresses screenshots before upload. At the configured 2 MB
  // ceiling, base64 remains comfortably inside Gemini's inline-input limit while
  // removing the extra resumable-upload round trip entirely.
  const inlineImageBase64 = Buffer.from(imageBytes).toString("base64");

  try {
    // Stability-first path: the exact minimal Interactions request is model + text
    // + inline image data. Do not add optional response-format/generation settings
    // here unless the deployed backend is verified to accept them.
    const callGemini = async (
      prompt: string,
      modelOverride: string,
      callTimeoutMs: number,
    ) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.max(1_000, callTimeoutMs));
      try {
        return await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: modelOverride,
            input: [
              { type: "text", text: plainJsonPrompt(prompt) },
              { type: "image", data: inlineImageBase64, mime_type: mimeType },
            ],
          }),
        });
      } finally {
        clearTimeout(timer);
      }
    };

    const readPayload = async (response: Response) => {
      try { return await response.json() as GeminiVisionPayload; }
      catch { return {} as GeminiVisionPayload; }
    };

    const performVisionCall = async (
      prompt: string,
      modelOverride: string,
      callTimeoutMs: number,
      _allowPromptJsonFallback = true,
    ): Promise<VisionCallResult | NextResponse> => {
      void _allowPromptJsonFallback;
      let response: Response;
      try {
        response = await callGemini(prompt, modelOverride, callTimeoutMs);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          console.warn(`[NICH Vision ${runId}] ${modelOverride} baseline interaction timed out after ${callTimeoutMs}ms`);
          return NextResponse.json({ ok: false, runId, model: modelOverride, message: "Screenshot recognition pass timed out." } satisfies NichVisionApiResponse, { status: 504 });
        }
        throw error;
      }

      const payload = await readPayload(response);
      if (!response.ok) {
        const detail = safeGeminiErrorDetail(payload) || `Gemini Vision request failed with status ${response.status}.`;
        console.error(`[NICH Vision ${runId}] Interactions baseline HTTP ${response.status}: ${detail.slice(0, 500)}`);
        return NextResponse.json({ ok: false, runId, model: modelOverride, message: formatVisionError(response.status, detail, modelOverride) } satisfies NichVisionApiResponse, { status: 502 });
      }

      const text = extractText(payload);
      const parsed = extractBalancedJsonObject(text);
      if (parsed === null) {
        console.warn(`[NICH Vision ${runId}] baseline output was not valid JSON; textLength=${text.length}`);
        return NextResponse.json({
          ok: false,
          runId,
          model: modelOverride,
          message: "Gemini read the screenshot but returned an invalid recognition format. NICH will try the lightweight fallback automatically.",
        } satisfies NichVisionApiResponse, { status: 422 });
      }

      const modelResult = sanitizeModelResult(parsed);
      if (!modelResult) {
        return NextResponse.json({ ok: false, runId, model: modelOverride, message: "Nich couldn’t confidently read that screenshot." } satisfies NichVisionApiResponse, { status: 422 });
      }
      return { modelResult, payload };
    };

    let fastRecoveryUsed = false;
    let initialCall = await performVisionCall(
      VISION_PROMPT,
      model,
      Math.min(34_000, Math.max(20_000, deadline - Date.now() - 14_000)),
      true,
    );

    if (initialCall instanceof NextResponse && Date.now() < deadline - 8_000) {
      console.warn(`[NICH Vision ${runId}] primary compact pass unavailable; falling back to ${fastModel}`);
      fastRecoveryUsed = true;
      initialCall = await performVisionCall(
        FAST_VISION_PROMPT,
        fastModel,
        Math.min(14_000, Math.max(7_000, deadline - Date.now() - 2_000)),
        false,
      );
    }

    if (initialCall instanceof NextResponse) return initialCall;

    let modelResult = recoverTradeImageType(initialCall.modelResult);
    let initialItems = consolidateTradeSlotDetections(
      repairTradeGeometry(modelResult.items, modelResult.imageType),
      modelResult.imageType,
    );
    const expectedOccupied = (modelResult.youOccupiedSlots ?? 0) + (modelResult.themOccupiedSlots ?? 0);
    const severeUnderDetection = modelResult.imageType === "TRADE"
      && (initialItems.length === 0 || (expectedOccupied >= 3 && initialItems.length + 1 < expectedOccupied));
    const possibleTradeMisclassification = modelResult.imageType !== "INVENTORY"
      && modelResult.imageType !== "TRADE"
      && initialItems.length === 0;
    let emptyTradeRecoveryUsed = false;

    if ((severeUnderDetection || possibleTradeMisclassification) && Date.now() < deadline - 6_000) {
      const recoveryCall = await performVisionCall(
        EMPTY_TRADE_RECOVERY_PROMPT,
        fastModel,
        Math.min(9_000, Math.max(4_500, deadline - Date.now() - 1_000)),
        false,
      );
      if (!(recoveryCall instanceof NextResponse)) {
        const recoveredModel = recoverTradeImageType(recoveryCall.modelResult);
        const recoveredItems = consolidateTradeSlotDetections(
          repairTradeGeometry(recoveredModel.items, recoveredModel.imageType),
          recoveredModel.imageType,
        );
        if (recoveredItems.length > initialItems.length || (possibleTradeMisclassification && recoveredModel.imageType === "TRADE" && recoveredItems.length > 0)) {
          emptyTradeRecoveryUsed = true;
          modelResult = recoveredModel;
          initialItems = recoveredItems;
          initialCall = recoveryCall;
        }
      }
    }

    let items = initialItems.map((item) => verifyVisionItem(item));
    const payloads: GeminiVisionPayload[] = [initialCall.payload];
    let focusedRecheckUsed = false;
    const auditAllPetSlots = modelResult.imageType === "TRADE"
      && process.env.NICH_GEMINI_VISION_FULL_AUDIT_ENABLED?.trim().toLowerCase() === "true"
      && shouldAuditAllPetSlots(items, dimensions);
    let identityAuditSucceeded = !auditAllPetSlots;

    if (shouldFocusedRecheck(items, modelResult.imageType) && Date.now() < deadline - 4_000) {
      const focusedPrompt = buildFocusedRecheckPrompt(items, auditAllPetSlots);
      if (focusedPrompt) {
        const focusedCall = await performVisionCall(
          focusedPrompt,
          fastModel,
          Math.min(7_000, Math.max(3_500, deadline - Date.now() - 1_000)),
          false,
        );
        if (!(focusedCall instanceof NextResponse)) {
          focusedRecheckUsed = true;
          identityAuditSucceeded = true;
          payloads.push(focusedCall.payload);
          const focusedRawItems = consolidateTradeSlotDetections(
            repairTradeGeometry(focusedCall.modelResult.items, modelResult.imageType),
            modelResult.imageType,
          );
          const focusedItems = focusedRawItems.map((item) => verifyVisionItem(item, { allowConfusionFamilyConfirmation: true }));
          items = mergeVisionCrossCheck(items, focusedItems);
        }
      }
    }

    if (auditAllPetSlots && !identityAuditSucceeded) items = downgradeUnauditedPetIdentities(items);

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
    const structurallyConsistentTrade = Boolean(modelResult.imageType === "TRADE" && tradeSidesPresent && !incompleteTradeGrid);
    const lowLayoutConfidence = modelResult.imageType === "TRADE" && modelResult.layoutConfidence < 0.82 && !structurallyConsistentTrade;
    const layoutBlocksCalculation = shouldBlockTradeLayout({
      imageType: modelResult.imageType,
      layoutConfidence: modelResult.layoutConfidence,
      incompleteTradeGrid,
      structurallyConsistentTrade,
    });

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
    const localPrompt = !sessionUnresolved && !layoutBlocksCalculation ? candidateLocalPrompt : undefined;
    const sideUnclear = modelResult.imageType === "TRADE" && !tradeSession;
    const hasActionableRecognition = items.length > 0;
    const message = [
      summary || "I couldn’t identify any Adopt Me items confidently.",
      focusedRecheckUsed ? "\n✓ I re-checked the uncertain trade slots before showing this result." : "",
      fastRecoveryUsed ? "\n✓ NICH used the lightweight fallback when the primary read could not finish cleanly." : "",
      emptyTradeRecoveryUsed ? "\n✓ The first pass missed occupied slots, so I ran a dedicated slot-recovery pass." : "",
      incompleteTradeGrid && hasActionableRecognition ? "\n⚠️ The detected items do not fully match the occupied trade grid, so I preserved the recognized slots but will not calculate an incomplete trade." : "",
      lowLayoutConfidence && hasActionableRecognition ? "\n⚠️ Some side/slot geometry is uncertain. The exact affected slots are listed above." : "",
      unknownVariantCount ? `\nI still need ${unknownVariantCount} variant/potion detail${unknownVariantCount === 1 ? "" : "s"} confirmed; those slots are marked above.` : "",
      hasActionableRecognition && (sessionUnresolved || uncertainIdentityCount || sideUnclear || layoutBlocksCalculation)
        ? "\nI preserved the recognized trade state. Correct only the slot(s) marked with ?, and I’ll continue automatically."
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
      image: { width: dimensions.width, height: dimensions.height, bytes: actualBytes, mimeType, detailIncluded: false, recoveryZoomsIncluded: false },
      ...(safeDebugEnabled() ? {
        debug: {
          model,
          layoutConfidence: modelResult.layoutConfidence,
          uncertainSlots: tradeSession?.unresolvedSlots ?? [],
          focusedRecheckUsed,
          fastRecoveryUsed,
          emptyTradeRecoveryUsed,
          identityAuditSucceeded,
          multiViewUsed: false,
        },
      } : {}),
      usage: sumUsage(...payloads),
    } satisfies NichVisionApiResponse;

    console.info(`[NICH Vision ${runId}] type=${modelResult.imageType} items=${items.length} unresolved=${tradeSession?.unresolvedSlots.length ?? uncertainIdentityCount} recheck=${focusedRecheckUsed ? "yes" : "no"} transport=inline-data`);
    return NextResponse.json(responseBody);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.warn(`[NICH Vision ${runId}] ${model} unavailable:`, detail);
    const timeoutMessage = error instanceof Error && error.name === "AbortError"
      ? "Screenshot analysis timed out. Your chat is still intact—try again once."
      : safeDebugEnabled()
        ? `Local vision error: ${detail.slice(0, 420)}`
        : "Nich couldn’t analyze that screenshot right now. Your current chat is still intact; try again or type the trade manually.";
    return NextResponse.json({ ok: false, runId, model, message: timeoutMessage } satisfies NichVisionApiResponse, { status: 502 });
  }
}
