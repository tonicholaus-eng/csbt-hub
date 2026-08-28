import type { NichVisionApiResponse } from "../../../lib/nich/vision";
import type { NichConversationContext, NichIntent, NichSuggestion, NichTradeComparison, NichTradeItem, PetVariant } from "./brain/types";
import { sanitizeNichTradeSession, sanitizeNichUserMemory, type NichTradeSession, type NichUserMemory } from "../../../lib/nich/tradeSession";
import { resetNichContext } from "./memory/context";

export type ChatMessage = {
  id: string;
  sender: "user" | "nich";
  text: string;
  createdAt: number;
  suggestions?: NichSuggestion[];
  intent?: NichIntent;
  tradeComparison?: NichTradeComparison;
  tradeSession?: NichTradeSession;
};

type PersistedNichChat = {
  version: 2;
  savedAt: number;
  messages: ChatMessage[];
  context: NichConversationContext;
};

/**
 * Storage keys are game-namespaced.
 *
 * Adopt Me keeps its existing `:v2` / `:v1:` keys so no signed-in user loses a
 * saved conversation or their aliases on this change. MM2 gets its own
 * namespace: an MM2 turn can never be read back into an Adopt Me conversation,
 * and per-user MM2 aliases cannot resolve against the Adopt Me catalog, because
 * the two never share a storage slot.
 */
const NICH_CHAT_STORAGE_KEY =
  "csbt-hub:nich-chat:v2";
const NICH_USER_MEMORY_PREFIX = "csbt-hub:nich-memory:v1:";

export const NICH_MM2_CHAT_STORAGE_KEY = "csbt-hub:nich-chat:mm2:v1";
export const NICH_MM2_CONTEXT_STORAGE_KEY = "csbt-hub:nich-context:mm2:v1";

export function clearSavedChat() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(NICH_CHAT_STORAGE_KEY);
  } catch {
    // Storage may be unavailable/private; clearing the in-memory chat still works.
  }
}

const NICH_CHAT_STORAGE_VERSION = 2;
const NICH_CHAT_EXPIRY_MS =
  30 * 60 * 1000;
const MAX_SAVED_MESSAGES = 60;
const NICH_VISION_SESSION_CACHE_PREFIX = "csbt-hub:nich-vision:v20-free-plan:";
const NICH_VISION_SESSION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type CachedNichVisionPayload = {
  savedAt: number;
  payload: NichVisionApiResponse;
};

export async function getVisionFileHash(file: File) {
  if (!globalThis.crypto?.subtle) return null;
  try {
    const bytes = await file.arrayBuffer();
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

export function readVisionSessionCache(hash: string | null): NichVisionApiResponse | null {
  if (!hash || typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(`${NICH_VISION_SESSION_CACHE_PREFIX}${hash}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedNichVisionPayload;
    if (!parsed || typeof parsed.savedAt !== "number" || !parsed.payload || Date.now() - parsed.savedAt > NICH_VISION_SESSION_CACHE_TTL_MS) {
      window.sessionStorage.removeItem(`${NICH_VISION_SESSION_CACHE_PREFIX}${hash}`);
      return null;
    }
    return parsed.payload;
  } catch {
    return null;
  }
}

export function writeVisionSessionCache(hash: string | null, payload: NichVisionApiResponse) {
  if (!hash || typeof window === "undefined" || !payload.ok) return;

  // Never freeze an uncertain screenshot result for the rest of the browser
  // session. Re-uploading a blurry/photo screenshot should be allowed to make a
  // fresh focused vision pass instead of replaying the exact same unresolved
  // answer. Fully resolved trades remain cacheable to protect the AI budget.
  if (payload.imageType === "TRADE" && (!payload.tradeSession || payload.tradeSession.unresolvedSlots.length > 0 || !payload.localPrompt)) {
    return;
  }

  try {
    const entry: CachedNichVisionPayload = { savedAt: Date.now(), payload };
    window.sessionStorage.setItem(`${NICH_VISION_SESSION_CACHE_PREFIX}${hash}`, JSON.stringify(entry));
  } catch {
    // Storage may be unavailable/private; vision still works normally.
  }
}

const validVariants =
  new Set<PetVariant>([
    "normal",
    "neon",
    "mega",
  ]);

const validIntents =
  new Set<NichIntent>([
    "greeting",
    "goodbye",
    "thanks",
    "help",
    "petLookup",
    "nearbyValue",
    "calculatorHelp",
    "tradeAdvice",
    "tradeComparison",
    "inventory",
    "offerBuilder",
    "wishlist",
    "exchange",
    "valueHistory",
    "counterOffer",
    "tradingProfile",
    "navigation",
    "fallback",
  ]);

const validPotionStatuses = new Set([
  "flyRide",
  "flyOnly",
  "rideOnly",
  "unspecified",
]);

const validVerdicts = new Set([
  "win",
  "fair",
  "lose",
]);

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function isSuggestion(
  value: unknown,
): value is NichSuggestion {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    typeof value.message === "string"
  );
}

function isChatMessage(
  value: unknown,
): value is ChatMessage {
  if (!isRecord(value)) {
    return false;
  }

  const hasValidSuggestions =
    value.suggestions === undefined ||
    (
      Array.isArray(value.suggestions) &&
      value.suggestions.every(
        isSuggestion,
      )
    );

  const hasValidIntent =
    value.intent === undefined ||
    validIntents.has(
      value.intent as NichIntent,
    );

  const hasValidTradeComparison =
    value.tradeComparison === undefined ||
    sanitizeTradeComparison(
      value.tradeComparison,
    ) !== undefined;

  const hasValidTradeSession =
    value.tradeSession === undefined ||
    sanitizeNichTradeSession(value.tradeSession) !== undefined;

  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    value.id.length <= 200 &&
    (
      value.sender === "user" ||
      value.sender === "nich"
    ) &&
    typeof value.text === "string" &&
    value.text.length > 0 &&
    value.text.length <= 20_000 &&
    (
      value.createdAt === undefined ||
      isFiniteNumber(value.createdAt)
    ) &&
    hasValidSuggestions &&
    hasValidIntent &&
    hasValidTradeComparison &&
    hasValidTradeSession
  );
}

function isTradeItem(
  value: unknown,
): value is NichTradeItem {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.petName === "string" &&
    validVariants.has(
      value.variant as PetVariant,
    ) &&
    typeof value.petCode === "string" &&
    validPotionStatuses.has(
      String(value.potionStatus),
    ) &&
    isFiniteNumber(value.baseValue) &&
    typeof value.baseDisplayValue ===
      "string" &&
    isFiniteNumber(
      value.potionAdjustment,
    ) &&
    isFiniteNumber(value.value) &&
    typeof value.displayValue ===
      "string" &&
    typeof value.hasNoPotionWarning ===
      "boolean"
  );
}

function sanitizeTradeComparison(
  value: unknown,
): NichTradeComparison | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const storedOfferedItems =
    Array.isArray(value.offeredItems)
      ? value.offeredItems.filter(
          isTradeItem,
        )
      : [];

  const storedRequestedItems =
    Array.isArray(value.requestedItems)
      ? value.requestedItems.filter(
          isTradeItem,
        )
      : [];

  const offered =
    isTradeItem(value.offered)
      ? value.offered
      : storedOfferedItems[0];

  const requested =
    isTradeItem(value.requested)
      ? value.requested
      : storedRequestedItems[0];

  const offeredItems =
    storedOfferedItems.length > 0
      ? storedOfferedItems
      : offered
        ? [offered]
        : [];

  const requestedItems =
    storedRequestedItems.length > 0
      ? storedRequestedItems
      : requested
        ? [requested]
        : [];

  if (
    !offered ||
    !requested ||
    offeredItems.length === 0 ||
    requestedItems.length === 0 ||
    !isFiniteNumber(
      value.offeredValue,
    ) ||
    !isFiniteNumber(
      value.requestedValue,
    ) ||
    !isFiniteNumber(value.difference) ||
    !isFiniteNumber(
      value.differencePercent,
    ) ||
    !validVerdicts.has(
      String(value.verdict),
    )
  ) {
    return undefined;
  }

  return {
    offeredItems,
    requestedItems,
    offered,
    requested,
    offeredValue: value.offeredValue,
    requestedValue:
      value.requestedValue,
    difference: value.difference,
    differencePercent:
      value.differencePercent,
    verdict:
      value.verdict as
        | "win"
        | "fair"
        | "lose",
    ...(value.valueSource === "GCASH" ||
    value.valueSource === "ELVE"
      ? { valueSource: value.valueSource }
      : {}),
  };
}

function sanitizeContextPet(
  value: unknown,
) {
  if (
    !isRecord(value) ||
    typeof value.petName !== "string" ||
    !value.petName.trim()
  ) {
    return null;
  }

  const variant =
    validVariants.has(
      value.variant as PetVariant,
    )
      ? (value.variant as PetVariant)
      : undefined;

  return {
    petName: value.petName,
    ...(variant
      ? {
          variant,
        }
      : {}),
    ...(isFiniteNumber(value.value)
      ? {
          value: value.value,
        }
      : {}),
    ...(typeof value.displayValue ===
    "string"
      ? {
          displayValue:
            value.displayValue,
        }
      : {}),
  };
}

function sanitizeConversationContext(
  value: unknown,
): NichConversationContext {
  if (!isRecord(value)) {
    return resetNichContext();
  }

  const recentPets =
    Array.isArray(value.recentPets)
      ? value.recentPets
          .map(sanitizeContextPet)
          .filter(
            (
              pet,
            ): pet is NonNullable<
              ReturnType<
                typeof sanitizeContextPet
              >
            > => pet !== null,
          )
          .slice(0, 8)
      : [];

  const lastTradeComparison =
    sanitizeTradeComparison(
      value.lastTradeComparison,
    );
  const activeTrade = sanitizeNichTradeSession(value.activeTrade);
  const userMemory = sanitizeNichUserMemory(value.userMemory);

  const context:
    NichConversationContext = {
      recentPets,
      turnCount:
        isFiniteNumber(value.turnCount) &&
        value.turnCount >= 0
          ? Math.floor(
              value.turnCount,
            )
          : 0,
  };

  if (
    typeof value.lastPetName ===
      "string"
  ) {
    context.lastPetName =
      value.lastPetName;
  }

  if (
    validVariants.has(
      value.lastVariant as PetVariant,
    )
  ) {
    context.lastVariant =
      value.lastVariant as PetVariant;
  }

  if (
    isFiniteNumber(
      value.lastNumericValue,
    )
  ) {
    context.lastNumericValue =
      value.lastNumericValue;
  }

  if (
    value.lastValueSource === "GCASH" ||
    value.lastValueSource === "ELVE"
  ) {
    context.lastValueSource =
      value.lastValueSource;
  }

  if (isRecord(value.tradingGoal)) {
    const goal = value.tradingGoal;
    const validObjectives = new Set([
      "FAIR",
      "LOWBALL",
      "COMPETITIVE",
      "HIGH_DEMAND",
      "UPGRADE",
      "DOWNGRADE",
    ]);

    context.tradingGoal = {
      ...(typeof goal.targetItemId === "string"
        ? { targetItemId: goal.targetItemId }
        : {}),
      ...(typeof goal.targetItemName === "string"
        ? { targetItemName: goal.targetItemName }
        : {}),
      ...(goal.valueSource === "GCASH" ||
      goal.valueSource === "ELVE"
        ? { valueSource: goal.valueSource }
        : {}),
      ...(typeof goal.objective === "string" &&
      validObjectives.has(goal.objective)
        ? {
            objective:
              goal.objective as NonNullable<
                NichConversationContext["tradingGoal"]
              >["objective"],
          }
        : {}),
      ...(Array.isArray(goal.excludedItemIds)
        ? {
            excludedItemIds:
              goal.excludedItemIds
                .filter(
                  (id): id is string =>
                    typeof id === "string",
                )
                .slice(0, 30),
          }
        : {}),
      ...(Array.isArray(goal.preferredItemIds)
        ? {
            preferredItemIds:
              goal.preferredItemIds
                .filter(
                  (id): id is string =>
                    typeof id === "string",
                )
                .slice(0, 30),
          }
        : {}),
      ...(Array.isArray(goal.allowedCategories)
        ? { allowedCategories: goal.allowedCategories.filter((value): value is string => typeof value === "string").slice(0, 12) }
        : {}),
      ...(Array.isArray(goal.excludedCategories)
        ? { excludedCategories: goal.excludedCategories.filter((value): value is string => typeof value === "string").slice(0, 12) }
        : {}),
      ...(Array.isArray(goal.allowedValueTypes)
        ? {
            allowedValueTypes: goal.allowedValueTypes.filter(
              (value): value is "NORMAL" | "NEON" | "MEGA" => value === "NORMAL" || value === "NEON" || value === "MEGA",
            ),
          }
        : {}),
      ...(isFiniteNumber(goal.minUnitValue) ? { minUnitValue: Math.max(0, goal.minUnitValue) } : {}),
      ...(isFiniteNumber(goal.maxUnitValue) ? { maxUnitValue: Math.max(0, goal.maxUnitValue) } : {}),
      ...(isFiniteNumber(goal.maxCopiesPerItem) ? { maxCopiesPerItem: Math.max(1, Math.min(20, Math.round(goal.maxCopiesPerItem))) } : {}),
      ...(typeof goal.preferFewItems === "boolean" ? { preferFewItems: goal.preferFewItems } : {}),
      ...(typeof goal.preferManyItems === "boolean" ? { preferManyItems: goal.preferManyItems } : {}),
      ...(typeof goal.minimumDemandTier === "string" && ["S", "A", "B", "C", "D"].includes(goal.minimumDemandTier)
        ? { minimumDemandTier: goal.minimumDemandTier as "S" | "A" | "B" | "C" | "D" }
        : {}),
      ...(isFiniteNumber(goal.maxItems)
        ? {
            maxItems: Math.max(
              1,
              Math.min(
                18,
                Math.round(goal.maxItems),
              ),
            ),
          }
        : {}),
      ...(typeof goal.highDemandOnly === "boolean"
        ? {
            highDemandOnly:
              goal.highDemandOnly,
          }
        : {}),
      ...(typeof goal.avoidOverpay === "boolean"
        ? {
            avoidOverpay:
              goal.avoidOverpay,
          }
        : {}),
    };
  }

  if (lastTradeComparison) {
    context.lastTradeComparison =
      lastTradeComparison;
  }

  if (activeTrade) {
    context.activeTrade = activeTrade;
  }

  if (userMemory) {
    context.userMemory = userMemory;
  }

  if (
    validIntents.has(
      value.lastIntent as NichIntent,
    )
  ) {
    context.lastIntent =
      value.lastIntent as NichIntent;
  }

  if (
    typeof value.lastUserMessage ===
      "string"
  ) {
    context.lastUserMessage =
      value.lastUserMessage;
  }

  if (
    typeof value.lastResolvedMessage ===
      "string"
  ) {
    context.lastResolvedMessage =
      value.lastResolvedMessage;
  }

  if (
    isFiniteNumber(
      value.lastUpdatedAt,
    )
  ) {
    context.lastUpdatedAt =
      value.lastUpdatedAt;
  }

  return context;
}

export function readSavedChat():
  | {
      messages: ChatMessage[];
      context: NichConversationContext;
    }
  | null {
  try {
    const savedValue =
      window.localStorage.getItem(
        NICH_CHAT_STORAGE_KEY,
      );

    if (!savedValue) {
      return null;
    }

    const parsed: unknown =
      JSON.parse(savedValue);

    if (
      !isRecord(parsed) ||
      parsed.version !==
        NICH_CHAT_STORAGE_VERSION ||
      !isFiniteNumber(parsed.savedAt) ||
      !Array.isArray(parsed.messages)
    ) {
      window.localStorage.removeItem(
        NICH_CHAT_STORAGE_KEY,
      );

      return null;
    }

    const savedAt = parsed.savedAt;
    const now = Date.now();

    const isExpired =
      now - savedAt >
      NICH_CHAT_EXPIRY_MS;

    const isFromFuture =
      savedAt >
      now + 5 * 60 * 1000;

    if (isExpired || isFromFuture) {
      window.localStorage.removeItem(
        NICH_CHAT_STORAGE_KEY,
      );

      return null;
    }

    const messages =
      parsed.messages
        .filter(isChatMessage)
        .map((message, index) => ({
          ...message,
          createdAt:
            isFiniteNumber(
              message.createdAt,
            )
              ? message.createdAt
              : savedAt + index,
          tradeComparison:
            sanitizeTradeComparison(
              message.tradeComparison,
            ),
          tradeSession: sanitizeNichTradeSession(message.tradeSession),
        }))
        .slice(-MAX_SAVED_MESSAGES);

    if (messages.length === 0) {
      window.localStorage.removeItem(
        NICH_CHAT_STORAGE_KEY,
      );

      return null;
    }

    return {
      messages,
      context:
        sanitizeConversationContext(
          parsed.context,
        ),
    };
  } catch {
    window.localStorage.removeItem(
      NICH_CHAT_STORAGE_KEY,
    );

    return null;
  }
}

export function saveChat(
  messages: ChatMessage[],
  context: NichConversationContext,
) {
  const savedChat: PersistedNichChat = {
    version:
      NICH_CHAT_STORAGE_VERSION,
    savedAt: Date.now(),
    messages:
      messages.slice(
        -MAX_SAVED_MESSAGES,
      ),
    context,
  };

  try {
    window.localStorage.setItem(
      NICH_CHAT_STORAGE_KEY,
      JSON.stringify(savedChat),
    );
  } catch {
    /*
     * Storage can fail in private browsing
     * or when the browser quota is full.
     * Nich should continue working normally.
     */
  }
}

function memoryStorageKey(userId?: string) {
  const suffix = userId?.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100) || "guest";
  return `${NICH_USER_MEMORY_PREFIX}${suffix}`;
}

export function readNichUserMemory(userId?: string): NichUserMemory | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(memoryStorageKey(userId));
    return raw ? sanitizeNichUserMemory(JSON.parse(raw)) : undefined;
  } catch {
    return undefined;
  }
}

export function saveNichUserMemory(memory: NichUserMemory | undefined, userId?: string) {
  if (typeof window === "undefined" || !memory) return;
  const sanitized = sanitizeNichUserMemory(memory);
  if (!sanitized) return;
  try {
    window.localStorage.setItem(memoryStorageKey(userId), JSON.stringify(sanitized));
  } catch {
    // Memory is a convenience layer. The active trade/chat still works if storage is unavailable.
  }
}

export const initialSuggestions: NichSuggestion[] = [
  {
    id: "initial-frost-dragon",
    label: "Frost Dragon value",
    message: "What is Frost Dragon worth?",
  },
  {
    id: "initial-calculator",
    label: "Trade calculator",
    message: "How do I use the calculator?",
  },
  {
    id: "initial-nearby-values",
    label: "Pets around 500",
    message: "Find pets around 500 value",
  },
];

export const initialMessages: ChatMessage[] = [
  {
    id: "nich-welcome",
    sender: "nich",
    text: [
      "Hey! I’m Nich 👋",
      "",
      "Ask me about Adopt Me pet values, trades, or how to use CSBT HUB.",
    ].join("\n"),
    createdAt: Date.now(),
    suggestions: initialSuggestions,
  },
];

export function createMessageId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

