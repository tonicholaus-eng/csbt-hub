import { Buffer } from "node:buffer";

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

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
import {
  decodeSlotManifest,
  slotTileLabel,
  type VisionSlotManifest,
  type VisionSlotManifestEntry,
} from "@/lib/nich/visionSlots";
import { type NichCatalogMatchVote } from "@/lib/nich/visionRecognition";
import {
  normalizeProviderSlotEvidence,
  type VisionSlotEvidence,
} from "@/lib/nich/visionProviderSchema";
import { runSlotRecognitionPipeline } from "@/lib/nich/visionSlotPipeline";
import { getItemById } from "@/lib/search";

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

const VISION_PIPELINE_VERSION = "vision-v34-smart-catalog-recognition-20260829";
const VISION_RELEASE = "csbt-nich-vision-v34-smart-catalog-recognition";
const CLOUDFLARE_VISION_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";

/** Two-stage recognition: LAYOUT finds slots, SLOTS identifies enlarged crops. */
type VisionStage = "layout" | "slots";

/**
 * Catalog-image verification is the precision backstop: the crop is compared
 * against real CSBT catalog artwork instead of being named freely. It costs one
 * extra model call per ambiguous slot, so it is capped hard.
 */
const CATALOG_MATCH_MAX_SLOTS = 3;
const CATALOG_MATCH_MAX_CANDIDATES = 4;
const CATALOG_IMAGE_MAX_BYTES = 400_000;
const CATALOG_IMAGE_FETCH_TIMEOUT_MS = 3_500;

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

type CloudflareAiBinding = {
  run: (model: string, input: Record<string, unknown>) => Promise<unknown>;
};

type CloudflareAiResponse = {
  response?: unknown;
  result?: unknown;
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

/**
 * One screenshot now costs two requests (layout, then slot crops). Each stage
 * gets its OWN quota namespace at the same limit, so a normal user still gets
 * the configured number of screenshots per minute/day, while a caller hitting
 * either stage directly is still capped.
 */
async function consumeVisionMinuteQuota(request: NextRequest, stage: string) {
  const identifier = getClientIdentifier(request);
  const perMinute = Math.floor(parseNumberSetting(process.env.NICH_GEMINI_VISION_RATE_LIMIT, DEFAULT_RATE_LIMIT, 1, 60));
  const allowed = await consumeServerQuota({
    namespace: `nich-vision-minute-${stage}`,
    identifier,
    limit: perMinute,
    windowSeconds: Math.floor(RATE_LIMIT_WINDOW_MS / 1000),
  });
  return allowed ? null : "Too many screenshot analyses. Please wait a minute and try again.";
}

async function consumeVisionDailyGeminiQuota(identifier: string, stage: string) {
  const dailyLimit = Math.floor(parseNumberSetting(process.env.NICH_GEMINI_VISION_DAILY_LIMIT, DEFAULT_DAILY_LIMIT, 1, 100_000));
  const allowed = await consumeServerQuota({
    namespace: `nich-gemini-vision-daily-${stage}`,
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

function sanitizeStringList(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
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
      ...(typeof item.animalType === "string" ? { animalType: item.animalType.slice(0, 60) } : {}),
      ...(Array.isArray(item.bodyColors) ? { bodyColors: sanitizeStringList(item.bodyColors, 5, 24) } : {}),
      ...(Array.isArray(item.features) ? { features: sanitizeStringList(item.features, 6, 80) } : {}),
      ...(typeof item.orientation === "string" ? { orientation: item.orientation.slice(0, 40) } : {}),
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

function isGeminiLocationRestriction(status: number, detail: string) {
  if (status !== 400) return false;
  const normalized = detail.toLowerCase();
  return normalized.includes("user location is not supported")
    || normalized.includes("not available in your current location")
    || normalized.includes("location is not supported")
    || normalized.includes("unsupported location")
    || (normalized.includes("failed_precondition") && normalized.includes("location"));
}

function extractCloudflareAiText(payload: unknown) {
  if (typeof payload === "string") return payload.trim();
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "";
  const record = payload as CloudflareAiResponse;
  if (typeof record.response === "string") return record.response.trim();
  if (typeof record.result === "string") return record.result.trim();
  if (record.result && typeof record.result === "object" && !Array.isArray(record.result)) {
    const nested = record.result as CloudflareAiResponse;
    if (typeof nested.response === "string") return nested.response.trim();
  }
  return "";
}

function getWorkersAiBinding(): CloudflareAiBinding | null {
  try {
    const context = getCloudflareContext();
    const env = context.env as unknown as { AI?: CloudflareAiBinding };
    return env.AI ?? null;
  } catch {
    // Local `next dev` can run without Cloudflare bindings. In production the
    // binding is provided by wrangler.jsonc.
    return null;
  }
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
  "Before declaring either side empty, inspect every cell in BOTH grids carefully; trades often have 3-4 items on one side and only 1 small item on the other.",
  "If exact identity is unclear but one or more real Adopt Me items are plausible, keep the best plausible name in rawName/candidateNames with LOW itemConfidence; uncertainty should lower confidence, not erase useful candidates. If you genuinely cannot narrow it at all, use a short visual description such as 'blue round pet'. Do not omit the slot and do not invent fantasy names.",
  "Read N/M/F/R badges separately from identity. N=NEON, M=MEGA, F=Fly, R=Ride, FR=Fly+Ride.",
  "Ignore empty/+ cells, buttons, usernames, arrows, center totals, prices, and browser/app chrome.",
  "A normalized bounding box is REQUIRED for every occupied slot so local geometry can recover LEFT=YOU / RIGHT=THEM and the browser can enlarge each icon for recognition.",
].join("\n");



const VISION_PROMPT = [
  "Analyze this image as an Adopt Me trading screenshot. Return only the requested structured result.",
  "1) Classify imageType as TRADE, INVENTORY, ITEM, or OTHER.",
  "1b) Before choosing ITEM/OTHER, explicitly check for two opposing item grids, a central separator/arrow/total, trade buttons, or the blue in-game Adopt Me trade window. If those trade-layout cues exist, classify as TRADE even when pet artwork is tiny or unreadable.",
  "2) For TRADE: LEFT grid=YOU and RIGHT grid=THEM unless visible labels clearly prove otherwise. Slot order is row-major independently on each side.",
  "3) Return exactly one item for each occupied slot. Ignore empty/+ cells, buttons, usernames, arrows, prices, center totals, browser chrome, and unrelated UI.",
  "4) Pet identity and N/M/F/R badges are separate evidence. N=NEON, M=MEGA, F=Fly, R=Ride, FR=Fly+Ride. Never turn R into Red Dragon or FR into Frost Dragon.",
  "5) Give USEFUL identity hypotheses without pretending they are certain. rawName is your single best visual guess when one exists; candidateNames should contain up to 5 plausible Adopt Me names, best first. NICH treats these only as low-trust evidence and resolves them against the real CSBT catalog, so a tentative real guess is useful while an invented fantasy name is not. If you cannot narrow the icon at all, use a short visual description and low confidence instead. Always also fill animalType, bodyColors, features and orientation from what you can actually see.",
  "5b) A box is REQUIRED for every occupied slot: normalized x/y/width/height covering the pet icon plus its badge corner. NICH crops and enlarges each box before deciding the identity, so an accurate box matters more than a confident name.",
  "6) For side/layout confidence, use grid geometry. A blurry pet does not make the trade grid unclear. For trades, always include slot numbers independently on each side.",
  "8) For INVENTORY use side=NONE and ignore tabs/currency/buttons. Only use quantity>1 when a visible count proves it.",
  "9) For ITEM use side=NONE; readable item-name text is stronger evidence than a vague icon guess.",
  "10) For collages, analyze the largest/clearest relevant Adopt Me panel only; do not merge separate screenshots.",
  "11) If you do not know a new/recent pet, describe it in rawName, keep confidence low, and do not invent a plausible-sounding name.",
  "12) Do not output prices, demand, or W/F/L. NICH resolves catalog IDs and values after vision.",
  "Valid trade UIs include the blue in-game Adopt Me window and calculator/value-site layouts with two opposing 3x3 grids, including coral/pink grids with a center numeric total.",
].join("\n");

type ScreenshotVisionIntent = "WFL" | "VALUES" | "IDENTIFY" | "DEMAND" | "GENERAL";

function parseScreenshotVisionIntent(value: string | null): ScreenshotVisionIntent {
  switch ((value ?? "").trim().toUpperCase()) {
    case "WFL":
    case "VALUES":
    case "IDENTIFY":
    case "DEMAND":
      return (value ?? "").trim().toUpperCase() as ScreenshotVisionIntent;
    default:
      return "GENERAL";
  }
}

function promptForScreenshotIntent(basePrompt: string, intent: ScreenshotVisionIntent) {
  const focus =
    intent === "WFL"
      ? [
          "USER GOAL: W/F/L trade check.",
          "Prioritize proving the two-sided trade layout, detecting EVERY occupied slot on both sides, and keeping side/slot geometry exact.",
          "Do not guess pet identities to complete the trade. If identity is uncertain, return the occupied slot with low confidence and candidateNames.",
        ]
      : intent === "VALUES"
        ? [
            "USER GOAL: item values.",
            "Identify every relevant visible Adopt Me item accurately, whether the screenshot is a trade, inventory, or item grid.",
            "Do not force a trade classification just because several items are visible. Exact catalog identity matters more than producing a complete answer.",
          ]
        : intent === "IDENTIFY"
          ? [
              "USER GOAL: identify the visible pets/items.",
              "Focus on exact catalog identity. Be conservative: an uncertain icon must remain low-confidence with candidateNames rather than receiving a plausible invented name.",
              "Do not infer W/F/L, values, or demand.",
            ]
          : intent === "DEMAND"
            ? [
                "USER GOAL: demand check.",
                "Identify every relevant visible Adopt Me item accurately. Demand will be looked up locally after vision.",
                "Do not invent demand or values and do not force a trade classification.",
              ]
            : [
                "USER GOAL: general screenshot question.",
                "Identify visible Adopt Me items conservatively and preserve the real image layout. Do not assume the user wants W/F/L.",
              ];

  return `${basePrompt}\n\n${focus.join("\\n")}`;
}


function plainJsonPrompt(basePrompt: string) {
  return `${basePrompt}
Return ONLY one valid JSON object. No markdown fences or commentary.
Use exactly this compact shape:
{"imageType":"TRADE|INVENTORY|ITEM|OTHER","layoutConfidence":0.0,"youOccupiedSlots":0,"themOccupiedSlots":0,"items":[{"rawName":"visible item name or short visual description","side":"YOU|THEM|NONE","variant":"NORMAL|NEON|MEGA|UNKNOWN","potion":"NONE|F|R|FR|UNKNOWN","quantity":1,"confidence":0.0,"categoryHint":"PET|PETWEAR|EGG|VEHICLE|FOOD|GIFT|STROLLER|TOY|STICKER|OTHER|UNKNOWN","candidateNames":[],"animalType":"","bodyColors":[],"features":[],"orientation":"","box":{"x":0.0,"y":0.0,"width":0.0,"height":0.0},"slot":1}]}
For TRADE, include one item object for every occupied slot even when identity is uncertain, and always include its box.`;
}

/* ------------------------------------------------------------------------- *
 * Stage 2 — enlarged slot crops
 *
 * The browser crops every detected slot from the ORIGINAL bitmap and lays the
 * crops out on one labelled contact sheet, so each pet occupies a few hundred
 * pixels instead of a few dozen. This pass reads that sheet.
 *
 * It must produce EVIDENCE, not identities. Identity is resolved afterwards,
 * strictly against the CSBT catalog, by verifyVisionItemFromEvidence().
 * ------------------------------------------------------------------------- */

function slotEvidenceIdentityCoverage(evidence: VisionSlotEvidence[], expectedTiles: number) {
  if (!expectedTiles) return 0;
  const named = evidence.filter((entry) => Boolean(entry.rawSuggestedName || entry.candidateNames.length)).length;
  return named / expectedTiles;
}

function mergeProviderSlotEvidence(primary: VisionSlotEvidence[], secondary: VisionSlotEvidence[]) {
  const byTile = new Map(secondary.map((entry) => [entry.tile, entry]));
  const merged = primary.map((entry) => {
    const other = byTile.get(entry.tile);
    if (!other) return entry;
    byTile.delete(entry.tile);
    const candidateNames = [...new Set([
      ...(entry.rawSuggestedName ? [entry.rawSuggestedName] : []),
      ...entry.candidateNames,
      ...(other.rawSuggestedName ? [other.rawSuggestedName] : []),
      ...other.candidateNames,
    ].map((name) => name.trim()).filter(Boolean))].slice(0, 7);
    const preferOtherName = !entry.rawSuggestedName && Boolean(other.rawSuggestedName);
    const primaryBadgeWins = entry.badgeConfidence >= other.badgeConfidence;
    return {
      ...entry,
      ...(preferOtherName ? { rawSuggestedName: other.rawSuggestedName } : {}),
      description: [entry.description, other.description].filter(Boolean).join(" | ").slice(0, 300),
      animalType: entry.animalType || other.animalType,
      bodyColors: [...new Set([...entry.bodyColors, ...other.bodyColors])].slice(0, 5),
      features: [...new Set([...entry.features, ...other.features])].slice(0, 7),
      orientation: entry.orientation || other.orientation,
      visibleText: entry.visibleText || other.visibleText,
      candidateNames,
      visualConfidence: Math.max(entry.visualConfidence, other.visualConfidence * 0.96),
      modifiers: primaryBadgeWins ? entry.modifiers : other.modifiers,
      badgeConfidence: Math.max(entry.badgeConfidence, other.badgeConfidence),
      // Keep the primary provider label for diagnostics; the description/candidate
      // union still records that a supplemental provider was used at route level.
      provider: entry.provider,
    } satisfies VisionSlotEvidence;
  });
  return [...merged, ...byTile.values()];
}

function buildSlotEvidencePrompt(tiles: VisionSlotManifestEntry[]) {
  const labels = tiles.map((tile) => tile.tile);
  const priorHintLines = tiles
    .filter((tile) => tile.identityHints?.length)
    .map((tile) => `${tile.tile}: ${tile.identityHints!.join(" | ")}`);
  return [
    "This image is a contact sheet of enlarged Adopt Me trade/inventory slot crops. Each tile is labelled above it.",
    `Analyze exactly these tiles and no others: ${labels.join(", ")}.`,
    ...(priorHintLines.length
      ? [
          "",
          "LOW-TRUST WHOLE-IMAGE HYPOTHESES from the earlier layout pass are listed below. They are clues, NOT answers. Challenge them against the enlarged artwork; keep a matching one when it truly fits, replace it when the crop supports something else, and never copy one blindly.",
          ...priorHintLines,
        ]
      : []),
    "",
    "TASK A — VISUAL EVIDENCE (per tile). Describe what the artwork actually shows. Do NOT try to be the authority on the pet's name:",
    "  animalType: the creature category you can see, e.g. dragon, dog, cat, bird, bug, fish, horse, bear, monkey, rabbit, undead.",
    "  bodyColors: 1-3 dominant colours actually visible.",
    "  features: short concrete observations, e.g. 'long wings', 'skeletal ribcage', 'horned head', 'fluffy mane', 'candy frosting'.",
    "  orientation: e.g. side-facing, front-facing, three-quarter.",
    "  visibleText: any item-name text legible in the tile, otherwise \"\".",
    "  visualConfidence: 0..1 — how well you can actually SEE the artwork, not how sure you are of a name.",
    "",
    "TASK B — BEST GUESS + ALTERNATIVES (candidate evidence, not authority). If you can identify a likely Adopt Me item, ALWAYS put your single best guess in bestGuess even when you are not certain. Uncertainty belongs in visualConfidence and alternatives — do not erase a useful guess just because it needs confirmation.",
    "possibleCatalogNames should contain up to 5 plausible Adopt Me catalog names, best first. Include bestGuess again as candidate #1 when it is plausible. If you know common community shorthand (for example 'uni horn' meaning Unicorn Horn), prefer the canonical full item name, but minor spacing/letter uncertainty is acceptable because NICH resolves names against the real catalog afterwards.",
    "Only leave bestGuess and possibleCatalogNames empty when you genuinely cannot narrow the artwork to any meaningful item candidate. Never invent a fantasy-sounding pet just to fill the field.",
    "",
    "TASK C — BADGES (separate from identity). Read the small N/M/F/R badges in the tile corner, not the artwork:",
    "  neon: true when a green N badge is visible, false when clearly absent, null when unreadable.",
    "  mega: true when an M badge is visible, false when clearly absent, null when unreadable.",
    "  fly: true when an F badge is visible, false when clearly absent, null when unreadable.",
    "  ride: true when an R badge is visible, false when clearly absent, null when unreadable.",
    "Badge letters are NEVER part of a pet name. An unreadable badge must be null — never guess it, and never let a badge change your species reading.",
    "",
    "Tiles that look like the same species are allowed to BE the same species. Do not force different tiles to be different pets.",
    "",
    "Return ONLY one JSON object, no markdown fences:",
    '{"slots":[{"tile":"Y1","bestGuess":"","animalType":"","bodyColors":[],"features":[],"orientation":"","visibleText":"","possibleCatalogNames":[],"visualConfidence":0.0,"neon":null,"mega":null,"fly":null,"ride":null,"badgeConfidence":0.0}]}',
  ].join("\n");
}

/* --------------------------- catalog-image match -------------------------- */

type CatalogImagePart = { itemId: string; itemName: string; base64: string; mimeType: string };

async function fetchCatalogImage(itemId: string): Promise<CatalogImagePart | null> {
  const item = getItemById(itemId);
  if (!item?.IMAGE) return null;
  let url: URL;
  try {
    url = new URL(item.IMAGE);
  } catch {
    return null;
  }
  // Catalog artwork is served over HTTPS by the value provider. Anything else is
  // not fetched: recognition abstains instead of reaching an unexpected host.
  if (url.protocol !== "https:") return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CATALOG_IMAGE_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url.toString(), { signal: controller.signal, cache: "force-cache" });
    if (!response.ok) return null;
    const mimeType = (response.headers.get("content-type") || "image/png").split(";")[0].trim().toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) return null;
    const bytes = await response.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > CATALOG_IMAGE_MAX_BYTES) return null;
    return { itemId: item.ID, itemName: item.NAME, base64: Buffer.from(bytes).toString("base64"), mimeType };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function buildCatalogMatchPrompt(tile: string, candidates: CatalogImagePart[]) {
  const letters = candidates.map((candidate, index) => String.fromCharCode(65 + index));
  return [
    `IMAGE 1 is a contact sheet of Adopt Me slot crops. Look ONLY at the tile labelled ${tile}.`,
    ...candidates.map((candidate, index) => `IMAGE ${index + 2} is candidate ${letters[index]}: official catalog artwork for "${candidate.itemName}".`),
    "",
    `Which candidate artwork is the same pet as tile ${tile}?`,
    "Compare silhouette, head/ear/horn shape, wings, tail, body palette, markings and accessories.",
    "You may ONLY answer with one of these choices: " + [...letters, "NONE"].join(", ") + ".",
    "Answer NONE if no candidate is genuinely the same pet. NONE is the correct answer whenever you are unsure — a wrong match is much worse than no match.",
    "confidence is 0..1 and must reflect how certain the visual comparison is.",
    "",
    'Return ONLY: {"tile":"' + tile + '","choice":"A|B|C|D|NONE","confidence":0.0,"reason":"short visual justification"}',
  ].join("\n");
}

function sanitizeCatalogMatchResult(value: unknown, candidates: CatalogImagePart[]): NichCatalogMatchVote | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const choice = String(record.choice ?? "").trim().toUpperCase();
  const confidence = clamp01(record.confidence);
  const reason = typeof record.reason === "string" ? record.reason.slice(0, 200) : undefined;
  if (choice === "NONE") return { chosenItemId: null, confidence, ...(reason ? { reason } : {}) };
  if (!/^[A-Z]$/.test(choice)) return null;
  const index = choice.charCodeAt(0) - 65;
  const candidate = candidates[index];
  if (!candidate) return null;
  return { chosenItemId: candidate.itemId, confidence, ...(reason ? { reason } : {}) };
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
      : "Use candidatesToCompare as a shortlist, including known visual-confusion rescues. If none actually matches the artwork, return a short neutral visual description with LOW confidence. Do NOT invent or introduce a different pet name outside the shortlist.",
    "For each listed slot, return an exact pet identity only when visually defensible. If identity is unclear, rawName must be a short visual description (for example 'dark dog-like pet') with LOW confidence; candidateNames may contain up to 3 shortlist possibilities. Never invent a plausible-sounding pet name.",
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
      transport: "gemini-interactions+cloudflare-workers-ai-vision-fallback",
      cloudflareVisionFallback: true,
      cloudflareVisionModel: CLOUDFLARE_VISION_MODEL,
      freePlanOptimized: true,
      thinkingLevel: process.env.NICH_GEMINI_VISION_THINKING_LEVEL?.trim().toLowerCase() || "low",
      effectivePrimaryThinkingLevel: "model-default",
      fallbackModel: normalizeFallbackVisionModel(process.env.NICH_GEMINI_VISION_FAST_MODEL),
      mediaResolutionMode: "model-default-no-optional-config",
      interactionRequestMode: "baseline-model-text-inline-image-with-workers-ai-location-fallback",
      screenshotPrepMode: "preserve-original-or-auto-trade-zoom-fallback",
      visualDisambiguation: "confusion-family-targeted-audit-v2",
      recognitionMode: "slot-crop-evidence-catalog-constrained",
      slotCropRecognition: true,
      catalogImageMatching: process.env.NICH_VISION_CATALOG_MATCH_ENABLED?.trim().toLowerCase() !== "false",
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

  const visionStage: VisionStage = request.headers.get("x-nich-vision-stage")?.trim().toLowerCase() === "slots"
    ? "slots"
    : "layout";
  const slotManifest: VisionSlotManifest | null = visionStage === "slots"
    ? decodeSlotManifest(request.headers.get("x-nich-vision-manifest"))
    : null;

  const minuteQuotaError = await consumeVisionMinuteQuota(request, visionStage);
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
  const screenshotIntent = parseScreenshotVisionIntent(request.headers.get("x-nich-vision-intent"));
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

  const dailyQuotaError = await consumeVisionDailyGeminiQuota(getClientIdentifier(request), visionStage);
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
      options?: { extraImages?: Array<{ base64: string; mimeType: string }>; rawPrompt?: boolean },
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
              { type: "text", text: options?.rawPrompt ? prompt : plainJsonPrompt(prompt) },
              { type: "image", data: inlineImageBase64, mime_type: mimeType },
              // Catalog artwork for image-to-catalog comparison, when supplied.
              ...(options?.extraImages ?? []).map((image) => ({
                type: "image",
                data: image.base64,
                mime_type: image.mimeType,
              })),
            ],
          }),
        });
      } finally {
        clearTimeout(timer);
      }
    };

    /**
     * Structured-JSON call that does NOT go through sanitizeModelResult, used by
     * the slot-evidence and catalog-match passes which have their own schemas.
     */
    const performStructuredCall = async (
      prompt: string,
      modelOverride: string,
      callTimeoutMs: number,
      options?: { extraImages?: Array<{ base64: string; mimeType: string }> },
    ): Promise<{ parsed: unknown; payload: GeminiVisionPayload } | null> => {
      let response: Response;
      try {
        response = await callGemini(prompt, modelOverride, callTimeoutMs, {
          ...(options?.extraImages ? { extraImages: options.extraImages } : {}),
          rawPrompt: true,
        });
      } catch {
        return null;
      }
      const payload = await readPayload(response);
      if (!response.ok) {
        const detail = safeGeminiErrorDetail(payload) || `status ${response.status}`;
        console.warn(`[NICH Vision ${runId}] structured pass failed: ${detail.slice(0, 240)}`);
        return null;
      }
      const parsed = extractBalancedJsonObject(extractText(payload));
      if (parsed === null) return null;
      return { parsed, payload };
    };

    const readPayload = async (response: Response) => {
      try { return await response.json() as GeminiVisionPayload; }
      catch { return {} as GeminiVisionPayload; }
    };

    let cloudflareFallbackUsed = false;

    /**
     * Workers AI backup for the structured slot-evidence pass.
     *
     * Both providers feed the SAME catalog-constrained resolver — only the raw
     * description comes from the model. Multi-image catalog comparison is not
     * available on this binding, so a slot that would have needed it stays
     * unconfirmed rather than being accepted on looser evidence.
     */
    const performCloudflareStructuredCall = async (prompt: string, callTimeoutMs: number) => {
      const ai = getWorkersAiBinding();
      if (!ai) return null;
      try {
        const timeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("WORKERS_AI_TIMEOUT")), Math.max(1_000, callTimeoutMs));
        });
        const inference = ai.run(CLOUDFLARE_VISION_MODEL, {
          messages: [
            { role: "system", content: "You are NICH's backup screenshot reader. Follow the user's JSON-only schema exactly." },
            { role: "user", content: prompt },
          ],
          image: `data:${mimeType};base64,${inlineImageBase64}`,
          max_tokens: 3072,
        });
        const raw = await Promise.race([inference, timeout]);
        return extractBalancedJsonObject(extractCloudflareAiText(raw));
      } catch (error) {
        console.warn(`[NICH Vision ${runId}] Workers AI structured pass failed: ${(error instanceof Error ? error.message : String(error)).slice(0, 200)}`);
        return null;
      }
    };

    const performCloudflareVisionFallback = async (
      prompt: string,
      callTimeoutMs: number,
    ): Promise<VisionCallResult | NextResponse> => {
      const ai = getWorkersAiBinding();
      if (!ai) {
        console.error(`[NICH Vision ${runId}] Workers AI fallback binding is unavailable`);
        return NextResponse.json({
          ok: false,
          runId,
          model: CLOUDFLARE_VISION_MODEL,
          message: "Screenshot recognition is temporarily unavailable from this server region. Please try again shortly or type the trade manually.",
        } satisfies NichVisionApiResponse, { status: 503 });
      }

      const dataUrl = `data:${mimeType};base64,${inlineImageBase64}`;
      try {
        const timeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("WORKERS_AI_TIMEOUT")), Math.max(1_000, callTimeoutMs));
        });
        const inference = ai.run(CLOUDFLARE_VISION_MODEL, {
          messages: [
            { role: "system", content: "You are NICH's backup screenshot recognizer. Follow the user's JSON-only schema exactly." },
            { role: "user", content: plainJsonPrompt(prompt) },
          ],
          image: dataUrl,
          max_tokens: 4096,
        });
        const raw = await Promise.race([inference, timeout]);
        const text = extractCloudflareAiText(raw);
        const parsed = extractBalancedJsonObject(text);
        if (parsed === null) {
          console.warn(`[NICH Vision ${runId}] Workers AI fallback returned non-JSON output; textLength=${text.length}`);
          return NextResponse.json({
            ok: false,
            runId,
            model: CLOUDFLARE_VISION_MODEL,
            message: "Nich's backup screenshot reader could not return a valid recognition result. Please try again or type the trade manually.",
          } satisfies NichVisionApiResponse, { status: 422 });
        }
        const modelResult = sanitizeModelResult(parsed);
        if (!modelResult) {
          return NextResponse.json({
            ok: false,
            runId,
            model: CLOUDFLARE_VISION_MODEL,
            message: "Nich's backup screenshot reader could not confidently read that screenshot.",
          } satisfies NichVisionApiResponse, { status: 422 });
        }
        cloudflareFallbackUsed = true;
        console.info(`[NICH Vision ${runId}] recovered with Cloudflare Workers AI model ${CLOUDFLARE_VISION_MODEL}`);
        return { modelResult, payload: {} as GeminiVisionPayload };
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        console.error(`[NICH Vision ${runId}] Workers AI fallback failed: ${detail.slice(0, 500)}`);
        return NextResponse.json({
          ok: false,
          runId,
          model: CLOUDFLARE_VISION_MODEL,
          message: detail === "WORKERS_AI_TIMEOUT"
            ? "Nich's backup screenshot reader timed out. Please try again."
            : "Screenshot recognition is temporarily unavailable. Please try again or type the trade manually.",
        } satisfies NichVisionApiResponse, { status: 502 });
      }
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
        if (isGeminiLocationRestriction(response.status, detail)) {
          console.warn(`[NICH Vision ${runId}] Gemini rejected Cloudflare egress by location; switching to Workers AI vision fallback`);
          return performCloudflareVisionFallback(prompt, Math.min(18_000, Math.max(6_000, callTimeoutMs)));
        }
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

    /* ===================================================================== *
     * STAGE 2 — identity from enlarged slot crops.
     *
     * The body is a contact sheet of crops the browser cut from the ORIGINAL
     * screenshot. The vision model only supplies visual evidence; the CSBT
     * catalog supplies the identity, and an ambiguous slot is verified against
     * real catalog artwork before it can be accepted.
     * ===================================================================== */
    if (visionStage === "slots") {
      if (!slotManifest) {
        return NextResponse.json({
          ok: false,
          runId,
          model,
          message: "The slot-recognition pass was missing its slot manifest.",
        } satisfies NichVisionApiResponse, { status: 400 });
      }

      const tiles = slotManifest.tiles;
      const allowedTiles = new Set(tiles.map((tile) => tile.tile));
      const evidenceCall = await performStructuredCall(
        buildSlotEvidencePrompt(tiles),
        model,
        Math.min(30_000, Math.max(12_000, deadline - Date.now() - 16_000)),
      );

      // ONE canonical evidence shape for both providers. Gemini and Workers AI
      // do not honour the schema identically (field names, 0..1 vs 0..100
      // confidence, string booleans); a strict parser silently produced empty
      // candidate lists, which downstream is indistinguishable from "saw
      // nothing" — and every slot became Unknown.
      let evidence: VisionSlotEvidence[] = evidenceCall
        ? normalizeProviderSlotEvidence(evidenceCall.parsed, allowedTiles, "gemini")
        : [];
      let slotCloudflareFallbackUsed = false;
      let slotCloudflareSupplementUsed = false;

      // A structurally valid Gemini response can still be useless for identity
      // if it describes every tile but refuses to emit a best guess/candidate.
      // In that case, ask Workers AI for an independent second opinion and merge
      // the evidence instead of accepting a page full of Unknown cards.
      const identityCoverage = slotEvidenceIdentityCoverage(evidence, tiles.length);
      if (!evidence.length || identityCoverage < 0.6) {
        const fallback = await performCloudflareStructuredCall(buildSlotEvidencePrompt(tiles), 14_000);
        const fallbackEvidence = fallback
          ? normalizeProviderSlotEvidence(fallback, allowedTiles, "cloudflare")
          : [];
        if (!evidence.length) {
          evidence = fallbackEvidence;
          slotCloudflareFallbackUsed = evidence.length > 0;
        } else if (fallbackEvidence.length) {
          evidence = mergeProviderSlotEvidence(evidence, fallbackEvidence);
          slotCloudflareSupplementUsed = true;
        }
      }

      if (!evidence.length) {
        return NextResponse.json({
          ok: false,
          runId,
          model,
          message: "Nich enlarged the trade slots but could not read them clearly. Try the original (uncompressed) screenshot.",
        } satisfies NichVisionApiResponse, { status: 422 });
      }

      const slotPayloads: GeminiVisionPayload[] = evidenceCall ? [evidenceCall.payload] : [];
      const catalogMatchDiagnostics: Array<Record<string, unknown>> = [];
      const catalogMatchEnabled = process.env.NICH_VISION_CATALOG_MATCH_ENABLED?.trim().toLowerCase() !== "false"
        // Catalog-image verification uses Gemini. It remains available when
        // Cloudflare merely supplemented a weak Gemini identity read; disable it
        // only when Gemini was unavailable and Cloudflare carried the whole pass.
        && !slotCloudflareFallbackUsed;

      /** Compare one ambiguous crop against real catalog artwork. */
      const verifySlot = async (item: NichVisionVerifiedItem): Promise<NichCatalogMatchVote | null> => {
        if (!catalogMatchEnabled || Date.now() > deadline - 8_000) return null;
        const tile = slotTileLabel(item.side, item.slot ?? 1);
        const artwork = (await Promise.all(
          (item.topCandidates ?? [])
            .slice(0, CATALOG_MATCH_MAX_CANDIDATES)
            .map((candidate) => fetchCatalogImage(candidate.itemId)),
        )).filter((part): part is CatalogImagePart => Boolean(part));

        if (artwork.length < 2) {
          catalogMatchDiagnostics.push({ tile, skipped: "catalog-artwork-unavailable" });
          return null;
        }

        const matchCall = await performStructuredCall(
          buildCatalogMatchPrompt(tile, artwork),
          fastModel,
          Math.min(12_000, Math.max(5_000, deadline - Date.now() - 3_000)),
          { extraImages: artwork.map((part) => ({ base64: part.base64, mimeType: part.mimeType })) },
        );
        if (matchCall) slotPayloads.push(matchCall.payload);
        const vote = matchCall ? sanitizeCatalogMatchResult(matchCall.parsed, artwork) : null;
        if (!vote) {
          catalogMatchDiagnostics.push({ tile, skipped: "verifier-returned-no-usable-answer" });
          return null;
        }
        catalogMatchDiagnostics.push({
          tile,
          compared: artwork.map((part) => part.itemName),
          chosen: vote.chosenItemId ? getItemById(vote.chosenItemId)?.NAME ?? vote.chosenItemId : "NONE",
          confidence: vote.confidence,
          ...(vote.reason ? { reason: vote.reason } : {}),
        });
        return vote;
      };

      const pipeline = await runSlotRecognitionPipeline({
        evidence,
        tiles,
        layoutConfidence: slotManifest.layoutConfidence,
        maxVerifiedSlots: CATALOG_MATCH_MAX_SLOTS,
        verifySlot,
      });
      const decided = pipeline.items;
      const catalogImageMatchUsed = pipeline.catalogImageMatchUsed;

      if (safeDebugEnabled()) {
        for (const row of pipeline.diagnostics) {
          console.info(`[NICH Vision ${runId}] [Slot ${row.slot}] ` + JSON.stringify(row));
        }
      }

      const items = consolidateTradeSlotDetections(decided, slotManifest.imageType);
      const tradeSession = slotManifest.imageType === "TRADE"
        ? createTradeSessionFromVision({
            items,
            layoutConfidence: slotManifest.layoutConfidence,
            recognitionVersion: VISION_PIPELINE_VERSION,
            promptVersion: NICH_VISION_PROMPT_VERSION,
            catalogVersion: NICH_CATALOG_VERSION,
            screenshotId,
            runId,
            imageWidth: dimensions.width,
            imageHeight: dimensions.height,
          })
        : undefined;

      const unresolved = tradeSession?.unresolvedSlots.length ?? items.filter((item) => !item.verified).length;
      const localPrompt = tradeSession
        ? (unresolved ? undefined : formatTradeSessionForCalculation(tradeSession) ?? undefined)
        : buildVisionLocalPrompt(slotManifest.imageType, items);

      const summary = summarizeVisionItems(slotManifest.imageType, items);
      const message = [
        summary,
        "\n✓ I enlarged each slot and matched it against the CSBT catalog instead of naming it from the full screenshot.",
        catalogImageMatchUsed ? "✓ Uncertain slots were compared against the real catalog artwork." : "",
        unresolved
          ? `\n${unresolved} item${unresolved === 1 ? "" : "s"} need confirmation before I calculate anything. Use Edit on the marked slot(s) — I will not guess.`
          : "",
      ].filter(Boolean).join("\n");

      const responseBody = {
        ok: Boolean(items.length),
        model,
        imageType: slotManifest.imageType,
        items,
        ...(localPrompt ? { localPrompt } : {}),
        ...(tradeSession ? { tradeSession } : {}),
        message,
        runId,
        recognitionVersion: VISION_PIPELINE_VERSION,
        promptVersion: NICH_VISION_PROMPT_VERSION,
        catalogVersion: NICH_CATALOG_VERSION,
        cacheStatus: "MISS" as const,
        layoutConfidence: slotManifest.layoutConfidence,
        image: { width: dimensions.width, height: dimensions.height, bytes: actualBytes, mimeType },
        ...(safeDebugEnabled() ? {
          debug: {
            model,
            stage: "slots",
            layoutConfidence: slotManifest.layoutConfidence,
            uncertainSlots: tradeSession?.unresolvedSlots ?? [],
            focusedRecheckUsed: false,
            catalogImageMatchUsed,
            cloudflareFallbackUsed: slotCloudflareFallbackUsed,
            cloudflareSupplementUsed: slotCloudflareSupplementUsed,
            identityCoverageBeforeSupplement: Number(identityCoverage.toFixed(3)),
            catalogMatches: catalogMatchDiagnostics,
            // Per-slot reasoning: provider, raw suggestion, resolved catalog
            // candidates, margin and exactly why the slot ended in its state.
            slots: pipeline.diagnostics,
          },
        } : {}),
        usage: sumUsage(...slotPayloads),
      } satisfies NichVisionApiResponse;

      console.info(`[NICH Vision ${runId}] stage=slots tiles=${tiles.length} items=${items.length} unresolved=${unresolved} catalogMatch=${catalogImageMatchUsed ? "yes" : "no"}`);
      return NextResponse.json(responseBody);
    }

    let fastRecoveryUsed = false;
    const intentVisionPrompt = promptForScreenshotIntent(VISION_PROMPT, screenshotIntent);
    const intentFastVisionPrompt = promptForScreenshotIntent(FAST_VISION_PROMPT, screenshotIntent);
    let initialCall = await performVisionCall(
      intentVisionPrompt,
      model,
      Math.min(34_000, Math.max(20_000, deadline - Date.now() - 14_000)),
      true,
    );

    if (initialCall instanceof NextResponse && Date.now() < deadline - 8_000) {
      console.warn(`[NICH Vision ${runId}] primary compact pass unavailable; falling back to ${fastModel}`);
      fastRecoveryUsed = true;
      initialCall = await performVisionCall(
        intentFastVisionPrompt,
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
    // A common mobile screenshot failure is recognizing the populated left grid but
    // missing the single item on the opposite side (or vice versa). Re-verify any
    // non-trivial one-sided trade before trusting that the other grid is truly empty.
    const initialYouCount = initialItems.filter((item) => item.side === "YOU").length;
    const initialThemCount = initialItems.filter((item) => item.side === "THEM").length;
    const oneSidedTradeNeedsVerification = modelResult.imageType === "TRADE"
      && initialItems.length >= 2
      && (initialYouCount === 0 || initialThemCount === 0);
    let emptyTradeRecoveryUsed = false;

    if ((severeUnderDetection || possibleTradeMisclassification || oneSidedTradeNeedsVerification) && Date.now() < deadline - 6_000) {
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
        const recoveredYouCount = recoveredItems.filter((item) => item.side === "YOU").length;
        const recoveredThemCount = recoveredItems.filter((item) => item.side === "THEM").length;
        const recoveredBothSides = recoveredYouCount > 0 && recoveredThemCount > 0;
        const initialBothSides = initialYouCount > 0 && initialThemCount > 0;
        const improvedSideCoverage = oneSidedTradeNeedsVerification && !initialBothSides && recoveredBothSides;
        if (
          recoveredItems.length > initialItems.length
          || improvedSideCoverage
          || (possibleTradeMisclassification && recoveredModel.imageType === "TRADE" && recoveredItems.length > 0)
        ) {
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
      cloudflareFallbackUsed ? "\n✓ Gemini's regional endpoint was unavailable, so NICH automatically used the Cloudflare vision backup." : "",
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
      model: cloudflareFallbackUsed ? CLOUDFLARE_VISION_MODEL : model,
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
      layoutConfidence: modelResult.layoutConfidence,
      image: { width: dimensions.width, height: dimensions.height, bytes: actualBytes, mimeType, detailIncluded: false, recoveryZoomsIncluded: false },
      ...(safeDebugEnabled() ? {
        debug: {
          model: cloudflareFallbackUsed ? CLOUDFLARE_VISION_MODEL : model,
          cloudflareFallbackUsed,
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

    console.info(`[NICH Vision ${runId}] type=${modelResult.imageType} items=${items.length} unresolved=${tradeSession?.unresolvedSlots.length ?? uncertainIdentityCount} recheck=${focusedRecheckUsed ? "yes" : "no"} transport=${cloudflareFallbackUsed ? "workers-ai-vision-fallback" : "gemini-inline-data"}`);
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
