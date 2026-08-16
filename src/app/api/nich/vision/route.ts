import { createHash } from "node:crypto";
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
} from "@/lib/nich/vision";
import { itemList } from "@/lib/search";

import { consumeServerQuota } from "@/lib/nich/serverQuota";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 45_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT = 6;
const DEFAULT_DAILY_LIMIT = 100;

const visionResultCache = new Map<string, { response: NichVisionApiResponse; expiresAt: number }>();
const DEFAULT_VISION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_VISION_CACHE_ENTRIES = 250;

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const IMAGE_TYPES = new Set<NichVisionImageType>(["TRADE", "INVENTORY", "ITEM", "OTHER"]);
const SIDES = new Set<NichVisionSide>(["YOU", "THEM", "NONE"]);
const VARIANTS = new Set<NichVisionVariant>(["NORMAL", "NEON", "MEGA", "UNKNOWN"]);
const POTIONS = new Set<NichVisionPotion>(["NONE", "F", "R", "FR", "UNKNOWN"]);
const CATEGORY_HINTS = new Set<NichVisionCategory>([
  "PET", "PETWEAR", "EGG", "VEHICLE", "FOOD", "GIFT", "STROLLER", "TOY", "STICKER", "OTHER", "UNKNOWN",
]);
const VISION_PIPELINE_VERSION = "vision-v4-catalog-candidates-20260816";
const VISION_PET_CATALOG = itemList
  .filter((item) => String(item.CATEGORY) === "PET")
  .map((item) => item.NAME)
  .sort((a, b) => a.localeCompare(b))
  .join(" | ");

function parseNumberSetting(value: string | undefined, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function getClientIdentifier(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
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

/**
 * Count only cache misses against the soft daily Gemini budget. Re-uploading
 * the exact same screenshot can still be rate-limited for abuse, but it does
 * not consume another daily AI-call slot or another paid Gemini request.
 */
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
          .slice(0, 3)
      : [];
    const slotNumber = Number(item.slot);
    return [{
      rawName,
      side: SIDES.has(item.side as NichVisionSide) ? (item.side as NichVisionSide) : "NONE",
      variant: VARIANTS.has(item.variant as NichVisionVariant) ? (item.variant as NichVisionVariant) : "UNKNOWN",
      potion: POTIONS.has(item.potion as NichVisionPotion) ? (item.potion as NichVisionPotion) : "UNKNOWN",
      quantity: Math.max(1, Math.min(18, Math.floor(Number(item.quantity) || 1))),
      confidence: clamp01(item.confidence),
      categoryHint: CATEGORY_HINTS.has(item.categoryHint as NichVisionCategory)
        ? (item.categoryHint as NichVisionCategory)
        : "UNKNOWN",
      ...(candidateNames.length ? { candidateNames } : {}),
      ...(typeof item.visualEvidence === "string" ? { visualEvidence: item.visualEvidence.slice(0, 300) } : {}),
      ...(typeof item.visibleText === "string" ? { visibleText: item.visibleText.slice(0, 220) } : {}),
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

const VISION_SCHEMA = {
  type: "object",
  properties: {
    imageType: { type: "string", enum: ["TRADE", "INVENTORY", "ITEM", "OTHER"] },
    layoutConfidence: { type: "number", minimum: 0, maximum: 1 },
    items: {
      type: "array",
      maxItems: 36,
      items: {
        type: "object",
        properties: {
          rawName: { type: "string" },
          side: { type: "string", enum: ["YOU", "THEM", "NONE"] },
          variant: { type: "string", enum: ["NORMAL", "NEON", "MEGA", "UNKNOWN"] },
          potion: { type: "string", enum: ["NONE", "F", "R", "FR", "UNKNOWN"] },
          quantity: { type: "integer", minimum: 1, maximum: 18 },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          categoryHint: { type: "string", enum: ["PET", "PETWEAR", "EGG", "VEHICLE", "FOOD", "GIFT", "STROLLER", "TOY", "STICKER", "OTHER", "UNKNOWN"] },
          candidateNames: { type: "array", maxItems: 3, items: { type: "string" } },
          visualEvidence: { type: "string" },
          visibleText: { type: "string" },
          slot: { type: "integer", minimum: 1, maximum: 18 },
        },
        required: ["rawName", "side", "variant", "potion", "quantity", "confidence", "categoryHint", "candidateNames"],
      },
    },
    youOccupiedSlots: { type: "integer", minimum: 0, maximum: 18 },
    themOccupiedSlots: { type: "integer", minimum: 0, maximum: 18 },
    note: { type: "string" },
  },
  required: ["imageType", "layoutConfidence", "items"],
} as const;

const VISION_PROMPT = [
  "You are the visual recognition layer for NICH, an Adopt Me trading assistant. Accuracy is more important than answering quickly.",
  "Inspect this screenshot carefully and extract ONLY items you can actually see. Never invent a pet just to complete a trade.",
  "Classify the screenshot as TRADE, INVENTORY, ITEM, or OTHER.",
  "For every detected item, classify categoryHint. For PET items, rawName MUST use one exact canonical name from the current CSBT PET catalog included below.",
  "Do not shorten multi-word pets to a generic species. Shark Puppy is not Shark; Giant Panda is not Panda; King Penguin is not Penguin; Arctic Reindeer is not Reindeer; Strawberry Shortcake Bat Dragon and Chocolate Chip Bat Dragon are not Bat Dragon.",
  "For each item, return candidateNames containing up to 3 exact canonical names ordered from most visually plausible to least. If only one is genuinely plausible, return only one. Do not fill candidateNames with random guesses.",
  "Before choosing rawName, compare visible body shape, colors, face, ears/horns/wings/tail, accessories, and markings against the closest plausible candidates. Put a short description of the decisive visible features in visualEvidence.",
  "If two pets remain visually plausible, lower confidence below 0.90 and keep both in candidateNames. Do NOT confidently choose the shorter or more famous name.",
  "For the CSBT/Adopt Me trade layout with two 3x3 grids, the LEFT grid is YOU and the RIGHT grid is THEM unless a visible label clearly contradicts this.",
  "For TRADE screenshots, report youOccupiedSlots and themOccupiedSlots as the number of visibly occupied trade slots. If multiple identical items occupy separate slots, quantity may summarize them, but its total must match the occupied slots.",
  "Use slot for the visible slot index when you can determine it. Do not duplicate the same visible slot.",
  "Read N/M/F/R/FR badges separately. If no N or M marker is visible and the pet is base form, use NORMAL. If variant is unclear, use UNKNOWN.",
  "NONE potion means you can clearly establish no-potion; UNKNOWN means Fly/Ride status is not visible or unclear. Never infer Fly/Ride from the pet species.",
  "Do not invent prices, values, demand, W/F/L, or calculations. CSBT handles those locally after verification.",
  "Confidence is 0 to 1 for the exact visual identity, not merely for recognizing the general species.",
  "CURRENT CSBT PET CATALOG (PET rawName/candidateNames must use exact spelling from this list):",
  VISION_PET_CATALOG,
].join("\n");

export async function GET() {
  return NextResponse.json(
    {
      enabled: process.env.NICH_GEMINI_VISION_ENABLED?.trim().toLowerCase() !== "false",
      configured: Boolean(process.env.GEMINI_API_KEY?.trim()),
      model: process.env.NICH_GEMINI_VISION_MODEL?.trim() || "gemini-3.6-flash",
      dailySafetyLimit: Math.floor(
        parseNumberSetting(
          process.env.NICH_GEMINI_VISION_DAILY_LIMIT,
          DEFAULT_DAILY_LIMIT,
          1,
          100_000,
        ),
      ),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  if (process.env.NICH_GEMINI_VISION_ENABLED?.trim().toLowerCase() === "false") {
    return NextResponse.json({ ok: false, message: "Screenshot recognition is currently disabled." } satisfies NichVisionApiResponse, { status: 503 });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ ok: false, message: "Gemini Vision is not configured yet. Add GEMINI_API_KEY to the server environment." } satisfies NichVisionApiResponse, { status: 503 });
  }

  const minuteQuotaError = await consumeVisionMinuteQuota(request);
  if (minuteQuotaError) {
    return NextResponse.json({ ok: false, message: minuteQuotaError } satisfies NichVisionApiResponse, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid screenshot upload." } satisfies NichVisionApiResponse, { status: 400 });
  }

  const image = formData.get("image");
  if (!(image instanceof File)) {
    return NextResponse.json({ ok: false, message: "Choose a screenshot first." } satisfies NichVisionApiResponse, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.has(image.type)) {
    return NextResponse.json({ ok: false, message: "Use a JPG, PNG, or WebP screenshot." } satisfies NichVisionApiResponse, { status: 415 });
  }

  const maxBytes = Math.floor(parseNumberSetting(process.env.NICH_GEMINI_VISION_MAX_IMAGE_BYTES, DEFAULT_MAX_IMAGE_BYTES, 250_000, 15 * 1024 * 1024));
  if (image.size <= 0 || image.size > maxBytes) {
    return NextResponse.json({ ok: false, message: `Screenshot is too large. Keep it under ${Math.ceil(maxBytes / 1024 / 1024)} MB.` } satisfies NichVisionApiResponse, { status: 413 });
  }

  const model = process.env.NICH_GEMINI_VISION_MODEL?.trim() || "gemini-3.6-flash";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.floor(parseNumberSetting(process.env.NICH_GEMINI_VISION_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 5_000, 120_000)));

  try {
    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const imageHash = createHash("sha256")
      .update(VISION_PIPELINE_VERSION)
      .update("\0")
      .update(model)
      .update("\0")
      .update(image.type)
      .update("\0")
      .update(imageBuffer)
      .digest("hex");
    const cached = visionResultCache.get(imageHash);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      return NextResponse.json(cached.response);
    }
    if (cached) visionResultCache.delete(imageHash);

    const dailyQuotaError = await consumeVisionDailyGeminiQuota(getClientIdentifier(request));
    if (dailyQuotaError) {
      return NextResponse.json({ ok: false, message: dailyQuotaError } satisfies NichVisionApiResponse, { status: 429 });
    }

    const data = imageBuffer.toString("base64");
    const maxOutputTokens = Math.floor(
      parseNumberSetting(
        process.env.NICH_GEMINI_VISION_MAX_TOKENS,
        1_400,
        256,
        4_096,
      ),
    );
    const requestedThinkingLevel =
      process.env.NICH_GEMINI_VISION_THINKING_LEVEL?.trim().toLowerCase() ||
      "minimal";
    const thinkingLevel = new Set(["minimal", "low", "medium", "high"]).has(
      requestedThinkingLevel,
    )
      ? requestedThinkingLevel
      : "minimal";

    const callGemini = async (structured: boolean) => {
      const textPrompt = structured
        ? VISION_PROMPT
        : `${VISION_PROMPT}\nReturn ONLY one valid JSON object with this exact top-level shape: {"imageType":"TRADE|INVENTORY|ITEM|OTHER","layoutConfidence":0.0,"youOccupiedSlots":0,"themOccupiedSlots":0,"items":[{"rawName":"exact canonical item name","side":"YOU|THEM|NONE","variant":"NORMAL|NEON|MEGA|UNKNOWN","potion":"NONE|F|R|FR|UNKNOWN","quantity":1,"confidence":0.0,"categoryHint":"PET|PETWEAR|EGG|VEHICLE|FOOD|GIFT|STROLLER|TOY|STICKER|OTHER|UNKNOWN","candidateNames":["exact candidate name"],"visualEvidence":"short visible description","visibleText":"optional string","slot":1}],"note":"optional string"}. No markdown fences or commentary.`;

      return fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          input: [
            { type: "text", text: textPrompt },
            { type: "image", mime_type: image.type, data },
          ],
          ...(structured
            ? {
                response_format: {
                  type: "text",
                  mime_type: "application/json",
                  schema: VISION_SCHEMA,
                },
              }
            : {}),
          generation_config: {
            max_output_tokens: maxOutputTokens,
            thinking_level: thinkingLevel,
          },
        }),
      });
    };

    const readPayload = async (response: Response) => {
      try {
        return (await response.json()) as GeminiInteractionPayload;
      } catch {
        return {} as GeminiInteractionPayload;
      }
    };

    let response = await callGemini(true);
    let payload = await readPayload(response);

    // A few Gemini API surfaces can temporarily disagree on structured-output
    // schema support. If the structured request is rejected, retry once using
    // the same official Interactions image format with prompt-enforced JSON.
    if (!response.ok && response.status === 400) {
      const firstDetail = safeGeminiErrorDetail(payload);
      console.warn(
        `[NICH Gemini Vision: ${model}] structured request rejected; retrying plain JSON`,
        firstDetail || "HTTP 400",
      );
      response = await callGemini(false);
      payload = await readPayload(response);
    }

    if (!response.ok) {
      const detail =
        safeGeminiErrorDetail(payload) ||
        `Gemini Vision request failed with status ${response.status}.`;
      console.warn(`[NICH Gemini Vision: ${model}]`, detail);

      const message =
        response.status === 400
          ? `Gemini rejected the screenshot request (G36-400). ${detail.slice(0, 220)}`
          : response.status === 401 || response.status === 403
            ? "Gemini rejected the API key or project authorization. Check that GEMINI_API_KEY belongs to the paid Gemini project."
            : response.status === 404
              ? `The configured Gemini model (${model}) isn’t available to this project.`
              : response.status === 429
                ? "Gemini rate/quota limit was reached. Wait briefly and try again."
                : response.status >= 500
                  ? "Gemini is temporarily unavailable. Please try the screenshot again in a moment."
                  : "Nich couldn’t analyze that screenshot right now. Please try again or type the trade manually.";

      return NextResponse.json(
        { ok: false, message } satisfies NichVisionApiResponse,
        { status: 502 },
      );
    }

    const text = extractText(payload);
    let parsed: unknown;
    try {
      const normalizedText = text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      parsed = JSON.parse(normalizedText);
    } catch {
      return NextResponse.json({ ok: false, message: "Nich could see the screenshot, but the recognition result was incomplete. Please try another screenshot." } satisfies NichVisionApiResponse, { status: 502 });
    }

    const modelResult = sanitizeModelResult(parsed);
    if (!modelResult) {
      return NextResponse.json({ ok: false, message: "Nich couldn’t confidently read that screenshot." } satisfies NichVisionApiResponse, { status: 422 });
    }

    const items = modelResult.items.map(verifyVisionItem);
    const candidateLocalPrompt = buildVisionLocalPrompt(modelResult.imageType, items);
    const summary = summarizeVisionItems(modelResult.imageType, items);
    const uncertainCount = items.filter((item) => !item.verified).length;
    const ambiguousTradeProperties =
      modelResult.imageType === "TRADE" &&
      items.some(
        (item) =>
          item.verified &&
          item.category === "PET" &&
          item.variant === "UNKNOWN",
      );
    const unknownPotionCount =
      modelResult.imageType === "TRADE"
        ? items.filter(
            (item) => item.verified && item.category === "PET" && item.potion === "UNKNOWN",
          ).length
        : 0;
    const lowLayoutConfidence =
      modelResult.imageType === "TRADE" &&
      modelResult.layoutConfidence < 0.82;

    const sideSlotTotal = (side: "YOU" | "THEM") =>
      items
        .filter((item) => item.side === side)
        .reduce((total, item) => total + Math.max(1, item.quantity || 1), 0);
    const youSlotMismatch =
      modelResult.imageType === "TRADE" &&
      modelResult.youOccupiedSlots !== undefined &&
      sideSlotTotal("YOU") !== modelResult.youOccupiedSlots;
    const themSlotMismatch =
      modelResult.imageType === "TRADE" &&
      modelResult.themOccupiedSlots !== undefined &&
      sideSlotTotal("THEM") !== modelResult.themOccupiedSlots;
    const duplicateSlots =
      modelResult.imageType === "TRADE" &&
      (() => {
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

    const localPrompt =
      uncertainCount === 0 &&
      !ambiguousTradeProperties &&
      !lowLayoutConfidence &&
      !incompleteTradeGrid
        ? candidateLocalPrompt
        : undefined;
    const sideUnclear =
      modelResult.imageType === "TRADE" &&
      !candidateLocalPrompt;

    const message = [
      summary || "I couldn’t identify any Adopt Me items confidently.",
      unknownPotionCount && localPrompt
        ? `\nℹ️ Potion status wasn’t visible for ${unknownPotionCount} pet${unknownPotionCount === 1 ? "" : "s"}. I’ll use NICH’s normal unspecified-potion baseline and flag that in the trade result.`
        : "",
      incompleteTradeGrid
        ? "\n⚠️ The number of detected items doesn’t match the occupied trade slots, so I won’t calculate a possibly incomplete trade."
        : "",
      uncertainCount || sideUnclear || ambiguousTradeProperties || lowLayoutConfidence || incompleteTradeGrid
        ? "\nI won’t calculate W/F/L from uncertain item/variant/side recognition. Correct the unclear item(s) or upload a clearer screenshot."
        : "",
    ].filter(Boolean).join("\n");

    const responseBody = {
      ok: Boolean(items.length),
      model,
      imageType: modelResult.imageType,
      items,
      ...(localPrompt ? { localPrompt } : {}),
      message,
      usage: {
        ...(Number.isFinite(Number(payload.usage?.total_input_tokens)) ? { promptTokens: Number(payload.usage?.total_input_tokens) } : {}),
        ...(Number.isFinite(Number(payload.usage?.total_output_tokens)) ? { outputTokens: Number(payload.usage?.total_output_tokens) } : {}),
        ...(Number.isFinite(Number(payload.usage?.total_tokens)) ? { totalTokens: Number(payload.usage?.total_tokens) } : {}),
      },
    } satisfies NichVisionApiResponse;

    pruneVisionCache();
    visionResultCache.set(imageHash, {
      response: responseBody,
      expiresAt: Date.now() + getVisionCacheTtlMs(),
    });

    return NextResponse.json(responseBody);
  } catch (error) {
    console.warn(`[NICH Gemini Vision: ${model}] unavailable:`, error);
    return NextResponse.json({ ok: false, message: "Nich couldn’t analyze that screenshot right now. Please try again or type the trade manually." } satisfies NichVisionApiResponse, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
