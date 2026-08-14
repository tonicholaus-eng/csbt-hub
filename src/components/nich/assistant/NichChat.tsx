"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";

import routeNichMessage from "./brain/router";
import useNichLocalData, {
  enrichNichLocalDataForMessage,
} from "./useNichLocalData";
import type {
  NichConversationContext,
  NichIntent,
  NichResponse,
  NichSuggestion,
  NichTradeComparison,
  NichTradeItem,
  PetVariant,
} from "./brain/types";
import {
  initialNichContext,
  resetNichContext,
  updateNichContext,
} from "./memory/context";
import useNich from "./useNich";
import type { NichVisionApiResponse } from "../../../lib/nich/vision";

type NichChatProps = {
  open?: boolean;
  onClose?: () => void;
  variant?: "floating" | "embedded";
  initialPrompt?: string;
};

type ChatMessage = {
  id: string;
  sender: "user" | "nich";
  text: string;
  createdAt: number;
  suggestions?: NichSuggestion[];
  intent?: NichIntent;
  tradeComparison?: NichTradeComparison;
};

type PersistedNichChat = {
  version: 1;
  savedAt: number;
  messages: ChatMessage[];
  context: NichConversationContext;
};

const NICH_CHAT_STORAGE_KEY =
  "csbt-hub:nich-chat:v1";

const NICH_CHAT_STORAGE_VERSION = 1;
const NICH_CHAT_EXPIRY_MS =
  30 * 60 * 1000;
const MAX_SAVED_MESSAGES = 60;
const NICH_VISION_SESSION_CACHE_PREFIX = "csbt-hub:nich-vision:v1:";
const NICH_VISION_SESSION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type CachedNichVisionPayload = {
  savedAt: number;
  payload: NichVisionApiResponse;
};

async function getVisionFileHash(file: File) {
  if (!globalThis.crypto?.subtle) return null;
  try {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

function readVisionSessionCache(hash: string | null): NichVisionApiResponse | null {
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

function writeVisionSessionCache(hash: string | null, payload: NichVisionApiResponse) {
  if (!hash || typeof window === "undefined" || !payload.ok) return;
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
    hasValidTradeComparison
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

function readSavedChat():
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

function saveChat(
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

const initialSuggestions: NichSuggestion[] = [
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

const initialMessages: ChatMessage[] = [
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

function createMessageId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function formatMessageTime(
  timestamp: number,
) {
  return new Intl.DateTimeFormat(
    undefined,
    {
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(timestamp);
}

function shouldCollapseMessage(
  text: string,
) {
  return (
    text.length > 720 ||
    text.split("\n").length > 15
  );
}

function getCollapsedMessageText(
  text: string,
) {
  const lines = text.split("\n");

  if (lines.length > 12) {
    return `${lines
      .slice(0, 12)
      .join("\n")}\n\n…`;
  }

  if (text.length > 620) {
    return `${text.slice(0, 620).trimEnd()}…`;
  }

  return text;
}

function formatTradeNumber(
  value: number,
) {
  return Number.isInteger(value)
    ? String(value)
    : value
        .toFixed(1)
        .replace(/\.0$/, "");
}

function getTradeCardTheme(
  verdict: NichTradeComparison["verdict"],
) {
  switch (verdict) {
    case "win":
      return {
        label: "WIN",
        emoji: "🟢",
        classes:
          "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-100",
      };

    case "lose":
      return {
        label: "LOSE",
        emoji: "🔴",
        classes:
          "border-rose-400/25 bg-rose-400/[0.08] text-rose-100",
      };

    case "fair":
    default:
      return {
        label: "FAIR",
        emoji: "🟡",
        classes:
          "border-amber-400/25 bg-amber-400/[0.08] text-amber-100",
      };
  }
}

function TradeResultCard({
  comparison,
}: {
  comparison: NichTradeComparison;
}) {
  const theme = getTradeCardTheme(
    comparison.verdict,
  );

  const difference = Math.abs(
    comparison.difference,
  );

  return (
    <div
      className={`mb-2 w-full rounded-2xl border p-3 shadow-[0_14px_36px_rgba(0,0,0,.26)] backdrop-blur-xl ${theme.classes}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-base">
            {theme.emoji}
          </span>

          <span className="text-xs font-black tracking-[0.18em]">
            {theme.label}
          </span>
        </div>

        <span className="text-[10px] font-bold opacity-75">
          Difference {formatTradeNumber(
            difference,
          )}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
          <span className="block opacity-65">
            Your total
          </span>
          <strong className="mt-0.5 block text-sm">
            {formatTradeNumber(
              comparison.offeredValue,
            )}
          </strong>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
          <span className="block opacity-65">
            Their total
          </span>
          <strong className="mt-0.5 block text-sm">
            {formatTradeNumber(
              comparison.requestedValue,
            )}
          </strong>
        </div>
      </div>
    </div>
  );
}

async function optimizeNichScreenshot(file: File): Promise<File> {
  const safeOriginal = new Set(["image/jpeg", "image/png", "image/webp"]);

  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 1536;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));

    if (scale === 1 && file.size <= 2_500_000 && safeOriginal.has(file.type)) {
      bitmap.close();
      return file;
    }

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });

    if (!context) {
      bitmap.close();
      return file;
    }

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.9);
    });

    if (!blob) return file;
    return new File([blob], "nich-screenshot.jpg", { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

export default function NichChat({
  open = false,
  onClose,
  variant = "floating",
  initialPrompt,
}: NichChatProps) {
  const shouldReduceMotion = useReducedMotion();
  const router = useRouter();
  const { react } = useNich();

  const isEmbedded = variant === "embedded";
  const isVisible = isEmbedded || open;
  const localData = useNichLocalData(isVisible);

  const [input, setInput] = useState("");
  const [initialPromptApplied, setInitialPromptApplied] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] =
    useState<ChatMessage[]>(initialMessages);

  const [conversationContext, setConversationContext] =
    useState<NichConversationContext>(
      initialNichContext,
    );

  const [isStorageReady, setIsStorageReady] =
    useState(false);
  const [showScrollButton, setShowScrollButton] =
    useState(false);
  const [isHeaderCompact, setIsHeaderCompact] =
    useState(false);
  const [copiedMessageId, setCopiedMessageId] =
    useState<string | null>(null);
  const [expandedMessages, setExpandedMessages] =
    useState<Set<string>>(() => new Set());
  const [showClearConfirmation, setShowClearConfirmation] =
    useState(false);

  const messagesContainerRef =
    useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const responseTimeoutRef = useRef<number | null>(null);
  const navigationTimeoutRef = useRef<number | null>(null);
  const copyResetTimeoutRef = useRef<number | null>(null);
  const requestSequenceRef = useRef(0);

  useEffect(() => {
    if (!initialPrompt || initialPromptApplied) return;
    setInput(initialPrompt.slice(0, 1800));
    setInitialPromptApplied(true);
    window.setTimeout(() => inputRef.current?.focus(), 80);
  }, [initialPrompt, initialPromptApplied]);

  const clearPendingActions = useCallback(() => {
    if (responseTimeoutRef.current !== null) {
      window.clearTimeout(
        responseTimeoutRef.current,
      );
      responseTimeoutRef.current = null;
    }

    if (navigationTimeoutRef.current !== null) {
      window.clearTimeout(
        navigationTimeoutRef.current,
      );
      navigationTimeoutRef.current = null;
    }

    if (copyResetTimeoutRef.current !== null) {
      window.clearTimeout(
        copyResetTimeoutRef.current,
      );
      copyResetTimeoutRef.current = null;
    }
  }, []);

  const clearChat = useCallback(() => {
    clearPendingActions();
    requestSequenceRef.current += 1;

    setInput("");
    setIsTyping(false);
    setMessages([
      {
        ...initialMessages[0],
        createdAt: Date.now(),
      },
    ]);
    setConversationContext(
      resetNichContext(),
    );
    setExpandedMessages(new Set());
    setCopiedMessageId(null);
    setShowClearConfirmation(false);

    try {
      window.localStorage.removeItem(
        NICH_CHAT_STORAGE_KEY,
      );
    } catch {
      // Nich still resets even when storage is unavailable.
    }

    react("welcome");

    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [clearPendingActions, react]);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      messagesEndRef.current?.scrollIntoView({
        behavior:
          shouldReduceMotion
            ? "auto"
            : behavior,
        block: "end",
      });
    },
    [shouldReduceMotion],
  );

  const handleMessagesScroll = useCallback(() => {
    const container =
      messagesContainerRef.current;

    if (!container) {
      return;
    }

    const distanceFromBottom =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight;

    setShowScrollButton(
      distanceFromBottom > 90,
    );
    setIsHeaderCompact(
      container.scrollTop > 36,
    );
  }, []);

  const copyMessage = useCallback(
    async (
      messageId: string,
      text: string,
    ) => {
      try {
        await navigator.clipboard.writeText(
          text,
        );
      } catch {
        const temporaryTextArea =
          document.createElement("textarea");

        temporaryTextArea.value = text;
        temporaryTextArea.style.position =
          "fixed";
        temporaryTextArea.style.opacity =
          "0";

        document.body.appendChild(
          temporaryTextArea,
        );
        temporaryTextArea.select();
        document.execCommand("copy");
        temporaryTextArea.remove();
      }

      setCopiedMessageId(messageId);

      if (
        copyResetTimeoutRef.current !== null
      ) {
        window.clearTimeout(
          copyResetTimeoutRef.current,
        );
      }

      copyResetTimeoutRef.current =
        window.setTimeout(() => {
          setCopiedMessageId(null);
          copyResetTimeoutRef.current = null;
        }, 1600);
    },
    [],
  );

  const toggleExpandedMessage = useCallback(
    (messageId: string) => {
      setExpandedMessages(
        (currentMessages) => {
          const nextMessages = new Set(
            currentMessages,
          );

          if (nextMessages.has(messageId)) {
            nextMessages.delete(messageId);
          } else {
            nextMessages.add(messageId);
          }

          return nextMessages;
        },
      );
    },
    [],
  );

  const latestSuggestions = useMemo(() => {
    for (
      let index = messages.length - 1;
      index >= 0;
      index -= 1
    ) {
      const message = messages[index];

      if (
        message.sender === "nich" &&
        message.suggestions?.length
      ) {
        return message.suggestions;
      }
    }

    return initialSuggestions;
  }, [messages]);

  useEffect(() => {
    const savedChat = readSavedChat();

    if (savedChat) {
      setMessages(savedChat.messages);
      setConversationContext(
        savedChat.context,
      );
    }

    setIsStorageReady(true);
  }, []);

  useEffect(() => {
    if (!isStorageReady) {
      return;
    }

    saveChat(
      messages,
      conversationContext,
    );
  }, [
    conversationContext,
    isStorageReady,
    messages,
  ]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    scrollToBottom("smooth");
  }, [
    isVisible,
    messages,
    isTyping,
    shouldReduceMotion,
    scrollToBottom,
  ]);

  useEffect(() => {
    const textarea = inputRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      150,
    )}px`;
  }, [input]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const focusTimeout = window.setTimeout(() => {
      inputRef.current?.focus();
    }, shouldReduceMotion ? 0 : 250);

    return () => {
      window.clearTimeout(focusTimeout);
    };
  }, [isVisible, shouldReduceMotion]);

  useEffect(() => {
    if (!open || isEmbedded || !onClose) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [open, isEmbedded, onClose]);

  useEffect(() => {
    return () => {
      clearPendingActions();
    };
  }, [clearPendingActions]);

  const sendMessage = useCallback(
    async (messageText: string) => {
      const trimmedMessage = messageText.trim();

      if (!trimmedMessage || isTyping) {
        return;
      }

      if (navigationTimeoutRef.current !== null) {
        window.clearTimeout(
          navigationTimeoutRef.current,
        );
        navigationTimeoutRef.current = null;
      }

      const requestId =
        requestSequenceRef.current + 1;

      requestSequenceRef.current = requestId;

      /*
       * The local brain remains the guaranteed fallback and the source of
       * exact CSBT values. The server may enhance this response with a free
       * local Ollama model or the optional Gemini API.
       */
      const effectiveLocalData =
        await enrichNichLocalDataForMessage(
          localData,
          trimmedMessage,
          conversationContext,
        );

      let response: NichResponse =
        routeNichMessage({
          message: trimmedMessage,
          context: conversationContext,
          localData: effectiveLocalData,
        });

      const history = messages
        .slice(-14)
        .map((message) => ({
          role:
            message.sender === "user"
              ? ("user" as const)
              : ("assistant" as const),
          content: message.text,
        }));

      const userMessage: ChatMessage = {
        id: createMessageId(),
        sender: "user",
        text: trimmedMessage,
        createdAt: Date.now(),
      };

      setMessages((currentMessages) => [
        ...currentMessages,
        userMessage,
      ]);

      setInput("");
      setIsTyping(true);

      react("search");

      if (responseTimeoutRef.current !== null) {
        window.clearTimeout(
          responseTimeoutRef.current,
        );
        responseTimeoutRef.current = null;
      }

      if (response.aiEligible !== false) {
        const requestController =
          new AbortController();

        const requestTimeout =
          window.setTimeout(() => {
            requestController.abort();
          }, 130_000);

        try {
          const apiResponse = await fetch(
            "/api/nich",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              signal:
                requestController.signal,
              body: JSON.stringify({
                message: trimmedMessage,
                context: conversationContext,
                history,
              }),
            },
          );

          if (apiResponse.ok) {
            const payload =
              (await apiResponse.json()) as {
                response?: NichResponse;
              };

            if (
              payload.response &&
              typeof payload.response.text ===
                "string" &&
              typeof payload.response.intent ===
                "string" &&
              typeof payload.response.reaction ===
                "string"
            ) {
              response = payload.response;
            }
          }
        } catch {
          /*
           * Network failures are intentionally silent here because the local
           * NICH brain already produced a complete fallback response.
           */
        } finally {
          window.clearTimeout(
            requestTimeout,
          );
        }
      }

      if (
        requestSequenceRef.current !==
        requestId
      ) {
        return;
      }

      const typingDuration = shouldReduceMotion
        ? 0
        : Math.min(
            response.typingDuration ?? 350,
            700,
          );

      responseTimeoutRef.current =
        window.setTimeout(() => {
          if (
            requestSequenceRef.current !==
            requestId
          ) {
            return;
          }

          const nichMessage: ChatMessage = {
            id: createMessageId(),
            sender: "nich",
            text: response.text,
            createdAt: Date.now(),
            suggestions: response.suggestions,
            intent: response.intent,
            tradeComparison:
              response.tradeComparison,
          };

          setMessages((currentMessages) => [
            ...currentMessages,
            nichMessage,
          ]);

          setConversationContext(
            (currentContext) =>
              updateNichContext(
                currentContext,
                response,
              ),
          );

          react(response.reaction);
          setIsTyping(false);
          responseTimeoutRef.current = null;

          if (response.navigation) {
            const navigationDelay =
              shouldReduceMotion
                ? 0
                : response.navigation.delay ?? 700;

            navigationTimeoutRef.current =
              window.setTimeout(() => {
                onClose?.();
                router.push(
                  response.navigation!.href,
                );
                navigationTimeoutRef.current = null;
              }, navigationDelay);
          }
        }, typingDuration);
    },
    [
      conversationContext,
      isTyping,
      localData,
      messages,
      onClose,
      react,
      router,
      shouldReduceMotion,
    ],
  );

  const analyzeScreenshot = useCallback(
    async (file: File) => {
      if (isTyping) return;

      const requestId = requestSequenceRef.current + 1;
      requestSequenceRef.current = requestId;

      const userMessage: ChatMessage = {
        id: createMessageId(),
        sender: "user",
        text: `📷 Screenshot uploaded: ${file.name}`,
        createdAt: Date.now(),
      };

      setMessages((currentMessages) => [...currentMessages, userMessage]);
      setIsTyping(true);
      react("search");

      try {
        if (file.size > 12 * 1024 * 1024) {
          throw new Error("That image is too large. Please use a screenshot under 12 MB.");
        }

        const optimized = await optimizeNichScreenshot(file);
        const visionHash = await getVisionFileHash(optimized);
        const cachedPayload = readVisionSessionCache(visionHash);

        let payload: NichVisionApiResponse;
        let apiOk = false;

        if (cachedPayload) {
          payload = cachedPayload;
          apiOk = true;
        } else {
          const formData = new FormData();
          formData.append("image", optimized, optimized.name);

          const controller = new AbortController();
          const timeout = window.setTimeout(() => controller.abort(), 60_000);
          let apiResponse: Response;

          try {
            apiResponse = await fetch("/api/nich/vision", {
              method: "POST",
              body: formData,
              signal: controller.signal,
            });
          } finally {
            window.clearTimeout(timeout);
          }

          apiOk = apiResponse.ok;
          try {
            payload = (await apiResponse.json()) as NichVisionApiResponse;
          } catch {
            payload = { ok: false, message: "Nich couldn’t read the screenshot response." };
          }

          if (apiOk) writeVisionSessionCache(visionHash, payload);
        }

        if (requestSequenceRef.current !== requestId) return;

        let response: NichResponse;

        if (apiOk && payload.localPrompt) {
          response = routeNichMessage({
            message: payload.localPrompt,
            context: conversationContext,
            localData,
          });
          response = {
            ...response,
            aiEligible: false,
            localConfidence: 1,
            text: payload.imageType === "TRADE"
              ? response.text
              : [payload.message, "", response.text].filter(Boolean).join("\n"),
          };
        } else {
          response = {
            text: payload.message || "Nich couldn’t analyze that screenshot. Try a clearer crop or type the trade manually.",
            intent: "fallback",
            reaction: "searchEmpty",
            aiEligible: false,
            localConfidence: 1,
            typingDuration: 240,
          };
        }

        const nichMessage: ChatMessage = {
          id: createMessageId(),
          sender: "nich",
          text: response.text,
          createdAt: Date.now(),
          suggestions: response.suggestions,
          intent: response.intent,
          tradeComparison: response.tradeComparison,
        };

        setMessages((currentMessages) => [...currentMessages, nichMessage]);
        setConversationContext((currentContext) => updateNichContext(currentContext, response));
        react(response.reaction);
      } catch (error) {
        if (requestSequenceRef.current !== requestId) return;
        const message = error instanceof Error && error.message
          ? error.message
          : "Nich couldn’t analyze that screenshot. Try again or type the trade manually.";
        setMessages((currentMessages) => [
          ...currentMessages,
          {
            id: createMessageId(),
            sender: "nich",
            text: message,
            createdAt: Date.now(),
            intent: "fallback",
          },
        ]);
        react("searchEmpty");
      } finally {
        if (requestSequenceRef.current === requestId) setIsTyping(false);
      }
    },
    [conversationContext, isTyping, localData, react],
  );

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    sendMessage(input);
  }

  const chatClasses = isEmbedded
    ? `
        relative
        flex
        h-[680px]
        max-h-[78dvh]
        w-full
        flex-col
        overflow-hidden
        rounded-[30px]
        border
        border-white/70
        bg-white/95
        shadow-[0_30px_90px_rgba(15,23,42,.18)]
        backdrop-blur-2xl
        dark:border-white/10
        dark:bg-black/95
        dark:shadow-[0_30px_90px_rgba(0,0,0,.6)]
        sm:h-[720px]
        lg:rounded-[30px]
      `
    : `
        fixed
        inset-0
        z-[89]
        flex
        h-[100dvh]
        max-h-[100dvh]
        flex-col
        overflow-hidden
        rounded-none
        border-0
        bg-white/95
        shadow-[0_30px_90px_rgba(15,23,42,.3)]
        backdrop-blur-2xl
        dark:bg-black/95
        dark:shadow-[0_30px_90px_rgba(0,0,0,.7)]
        lg:left-auto
        lg:top-auto
        lg:bottom-6
        lg:right-6
        lg:h-[700px]
        lg:max-h-[calc(100dvh-3rem)]
        lg:w-[470px]
        lg:rounded-[30px]
        lg:border
        lg:border-white/70
        lg:dark:border-white/10
        lg:w-[490px]
      `;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          role={isEmbedded ? "region" : "dialog"}
          aria-modal={isEmbedded ? undefined : false}
          aria-label="Ask Nich"
          initial={{
            opacity: 0,
            y: shouldReduceMotion ? 0 : 24,
            scale:
              shouldReduceMotion || isEmbedded
                ? 1
                : 0.94,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          exit={{
            opacity: 0,
            y: shouldReduceMotion ? 0 : 18,
            scale:
              shouldReduceMotion || isEmbedded
                ? 1
                : 0.96,
          }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.3,
            ease: [0.22, 1, 0.36, 1],
          }}
          className={chatClasses}
        >
          <style jsx global>{`
            .nich-gold-scrollbar {
              scrollbar-width: thin;
              scrollbar-color: #d6a719 #050505;
            }

            .nich-gold-scrollbar::-webkit-scrollbar {
              width: 7px;
              height: 7px;
            }

            .nich-gold-scrollbar::-webkit-scrollbar-track {
              background: #050505;
            }

            .nich-gold-scrollbar::-webkit-scrollbar-thumb {
              border: 1px solid rgba(255, 221, 103, 0.35);
              border-radius: 999px;
              background: linear-gradient(
                180deg,
                #ffe17a,
                #c58a08
              );
              box-shadow:
                0 0 8px rgba(245, 180, 25, 0.75),
                inset 0 0 4px rgba(255, 255, 255, 0.35);
            }

            .nich-gold-scrollbar::-webkit-scrollbar-thumb:hover {
              background: linear-gradient(
                180deg,
                #fff0a8,
                #e2a91e
              );
            }
          `}</style>

          <AnimatePresence>
            {showClearConfirmation && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[120] flex items-center justify-center bg-black/70 px-5 backdrop-blur-md"
              >
                <motion.div
                  initial={{
                    opacity: 0,
                    y: 12,
                    scale: 0.96,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                  }}
                  exit={{
                    opacity: 0,
                    y: 12,
                    scale: 0.96,
                  }}
                  className="w-full max-w-sm rounded-3xl border border-amber-300/20 bg-[#0a0a0a] p-5 text-white shadow-[0_28px_80px_rgba(0,0,0,.7),0_0_34px_rgba(245,180,25,.12)]"
                >
                  <h3 className="text-lg font-black text-amber-100">
                    Start a new chat?
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-white/60">
                    This clears the current messages and Nich’s remembered pets and trades.
                  </p>

                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowClearConfirmation(false);
                      }}
                      className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-white/75 transition hover:bg-white/10"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={clearChat}
                      className="min-h-11 rounded-xl bg-rose-500 px-4 py-2 text-sm font-black text-white transition hover:bg-rose-600"
                    >
                      Clear chat
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div
            style={{
              paddingTop: isEmbedded
                ? undefined
                : "max(0.75rem, env(safe-area-inset-top))",
            }}
            className={`relative shrink-0 overflow-hidden border-b border-violet-400/15 bg-[linear-gradient(135deg,rgba(124,92,228,.16),rgba(124,92,228,.07))] transition-all duration-300 dark:border-violet-400/15 dark:bg-[linear-gradient(135deg,#15102b,#0b1322)] ${
              isHeaderCompact
                ? "px-4 py-2.5 sm:px-5"
                : "px-4 py-4 sm:px-5"
            }`}
          >
            <div className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full bg-violet-300/10 blur-2xl dark:bg-violet-300/5" />

            <div className="relative flex items-center gap-3">
              <motion.div
                animate={
                  isTyping && !shouldReduceMotion
                    ? {
                        rotate: 360,
                        boxShadow: [
                          "0 0 0 rgba(124,92,228,0)",
                          "0 0 18px rgba(124,92,228,.42)",
                          "0 0 0 rgba(124,92,228,0)",
                        ],
                      }
                    : {
                        rotate: 0,
                      }
                }
                transition={
                  isTyping && !shouldReduceMotion
                    ? {
                        rotate: {
                          duration: 3,
                          ease: "linear",
                          repeat: Infinity,
                        },
                        boxShadow: {
                          duration: 1.5,
                          repeat: Infinity,
                        },
                      }
                    : {
                        duration: 0.25,
                      }
                }
                className={`relative shrink-0 rounded-full bg-violet-500/70 p-[2px] transition-all duration-300 ${
                  isHeaderCompact
                    ? "h-10 w-10"
                    : "h-12 w-12"
                }`}
              >
                <div className="relative h-full w-full overflow-hidden rounded-full border border-violet-400/20 bg-violet-50 dark:bg-[#0b1322]">
                  <Image
                  src="/nich/nich-face.png"
                  alt="Nich"
                  fill
                  unoptimized
                  className="object-cover object-[50%_35%]"
                  sizes="48px"
                />
                </div>
              </motion.div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    className={`truncate font-black text-[var(--foreground)] transition-all duration-300 ${
                      isHeaderCompact
                        ? "text-base"
                        : "text-lg"
                    }`}
                  >
                    Nich
                  </h2>

                  <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-violet-700 ring-1 ring-violet-400/15 dark:text-violet-200">
                    CSBT Assistant
                  </span>
                </div>

                <p className="mt-0.5 text-xs font-semibold text-[var(--foreground-muted)]">
                  {isTyping ? "Nich is thinking..." : "Ready for your next question"}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowClearConfirmation(true);
                  }}
                  aria-label="Start a new Nich chat"
                  title="Start a new chat"
                  className="flex min-h-11 items-center justify-center rounded-xl bg-[var(--surface-2)] px-3 text-[11px] font-black text-[var(--foreground)] shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60 dark:border dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/[0.16]"
                >
                  New chat
                </button>

                {!isEmbedded && onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close Ask Nich"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-2)] text-lg font-black text-[var(--foreground)] shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60 dark:border dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/[0.16]"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden bg-[var(--surface-2)] dark:bg-[#08111e]">
            <div className="pointer-events-none absolute inset-0 z-0 opacity-35 dark:opacity-25 bg-[radial-gradient(circle,rgba(124,92,228,.13)_1px,transparent_1px)] bg-[size:24px_24px]" />
            <div className="pointer-events-none absolute inset-0 z-0 opacity-20 dark:opacity-[0.12] bg-[linear-gradient(rgba(124,92,228,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(124,92,228,.08)_1px,transparent_1px)] bg-[size:72px_72px]" />

            <div
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll}
              className="nich-gold-scrollbar relative z-10 h-full overflow-y-auto overscroll-contain bg-gradient-to-b from-white/90 via-violet-50/10 to-white/90 px-3 py-5 dark:bg-[radial-gradient(circle_at_top,rgba(124,92,228,0.055),transparent_24%),linear-gradient(to_bottom,rgba(0,0,0,.92),rgba(0,0,0,.98))] sm:px-5 sm:py-6"
            >
              <div className="space-y-5 sm:space-y-6">
              {messages.map((message) => {
                const isNich =
                  message.sender === "nich";
                const canCollapse =
                  shouldCollapseMessage(
                    message.text,
                  );
                const isExpanded =
                  expandedMessages.has(
                    message.id,
                  );
                const visibleText =
                  canCollapse && !isExpanded
                    ? getCollapsedMessageText(
                        message.text,
                      )
                    : message.text;

                return (
                  <motion.div
                    key={message.id}
                    initial={{
                      opacity: 0,
                      y: shouldReduceMotion ? 0 : 10,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      duration: shouldReduceMotion
                        ? 0
                        : 0.25,
                    }}
                    className={`flex items-end gap-2.5 ${
                      isNich
                        ? "justify-start"
                        : "justify-end"
                    }`}
                  >
                    {isNich && (
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-violet-400/30 bg-[#0b1322] shadow-[0_0_14px_rgba(124,92,228,.14)]">
                        <Image
                          src="/nich/nich-face.png"
                          alt=""
                          fill
                          unoptimized
                          className="object-cover object-[50%_35%]"
                          sizes="32px"
                        />
                      </div>
                    )}

                    <div
                      className={`flex max-w-[88%] flex-col ${
                        isNich
                          ? "items-start"
                          : "items-end"
                      } sm:max-w-[86%]`}
                    >
                      {isNich &&
                        message.tradeComparison && (
                          <TradeResultCard
                            comparison={
                              message.tradeComparison
                            }
                          />
                        )}

                      <div
                        className={`whitespace-pre-line rounded-[24px] px-5 py-4 text-sm leading-7 shadow-sm ${
                          isNich
                            ? "rounded-bl-md border border-gray-100 bg-white font-medium text-gray-700 dark:border-white/10 dark:bg-black/80 dark:text-slate-100 dark:shadow-[0_12px_28px_rgba(0,0,0,.38)]"
                            : "rounded-br-md bg-[var(--surface-selected)] font-semibold text-[var(--foreground)] ring-1 ring-[var(--border-gold)] dark:border dark:border-amber-400/20 dark:bg-amber-400/[0.07] dark:bg-none dark:text-white dark:shadow-[0_12px_28px_rgba(0,0,0,.42)]"
                        }`}
                      >
                        {visibleText}
                      </div>

                      <div
                        className={`mt-1.5 flex flex-wrap items-center gap-2 px-1 text-[10px] text-gray-400 dark:text-white/35 ${
                          isNich
                            ? "justify-start"
                            : "justify-end"
                        }`}
                      >
                        <span>
                          {formatMessageTime(
                            message.createdAt,
                          )}
                        </span>

                        {isNich && (
                          <button
                            type="button"
                            onClick={() => {
                              void copyMessage(
                                message.id,
                                message.text,
                              );
                            }}
                            className="min-h-8 rounded-md px-1.5 py-0.5 font-bold text-violet-600 transition hover:bg-violet-400/10 hover:text-violet-500 dark:text-violet-300/80 dark:hover:text-violet-200"
                          >
                            {copiedMessageId ===
                            message.id
                              ? "Copied"
                              : "Copy"}
                          </button>
                        )}

                        {canCollapse && (
                          <button
                            type="button"
                            onClick={() => {
                              toggleExpandedMessage(
                                message.id,
                              );
                            }}
                            className="min-h-8 rounded-md px-1.5 py-0.5 font-bold text-violet-600 transition hover:bg-violet-400/10 hover:text-violet-500 dark:text-violet-300/80 dark:hover:text-violet-200"
                          >
                            {isExpanded
                              ? "Show less"
                              : "Show more"}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {isTyping && (
                <motion.div
                  initial={{
                    opacity: 0,
                    y: shouldReduceMotion ? 0 : 8,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  className="flex items-end gap-2"
                >
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-violet-200 bg-violet-50">
                    <Image
                      src="/nich/nich-face.png"
                      alt=""
                      fill
                      unoptimized
                      className="object-cover object-[50%_35%]"
                      sizes="32px"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 rounded-[20px] rounded-bl-md border border-gray-100 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-black/80 dark:shadow-[0_10px_24px_rgba(0,0,0,.35)]">
                    {[0, 1, 2].map((dot) => (
                      <motion.span
                        key={dot}
                        animate={
                          shouldReduceMotion
                            ? undefined
                            : {
                                y: [0, -4, 0],
                                opacity: [
                                  0.4,
                                  1,
                                  0.4,
                                ],
                              }
                        }
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          delay: dot * 0.15,
                        }}
                        className="h-2 w-2 rounded-full bg-violet-400"
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-10 bg-gradient-to-b from-white via-white/70 to-transparent dark:from-black dark:via-black/75" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-12 bg-gradient-to-t from-white via-white/70 to-transparent dark:from-black dark:via-black/80" />

            <AnimatePresence>
              {showScrollButton && (
                <motion.button
                  type="button"
                  initial={{
                    opacity: 0,
                    y: 8,
                    scale: 0.92,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                  }}
                  exit={{
                    opacity: 0,
                    y: 8,
                    scale: 0.92,
                  }}
                  onClick={() => {
                    scrollToBottom("smooth");
                  }}
                  aria-label="Scroll to the newest message"
                  className="absolute bottom-5 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-violet-400/25 bg-[#0b1322]/90 text-lg text-violet-200 shadow-[0_8px_24px_rgba(0,0,0,.24)] transition hover:border-violet-300/45"
                >
                  ↓
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {latestSuggestions.length > 0 && (
            <div className="shrink-0 border-t border-gray-100 bg-white/90 px-3 pt-3 dark:border-white/10 dark:bg-black/95 dark:backdrop-blur-xl sm:px-4">
              <div className="nich-gold-scrollbar flex gap-2 overflow-x-auto pb-2">
                {latestSuggestions.map(
                  (suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() =>
                        sendMessage(
                          suggestion.message,
                        )
                      }
                      disabled={isTyping}
                      className="shrink-0 rounded-full border border-violet-200 bg-violet-50 px-3 py-2 text-[11px] font-bold text-amber-800 transition hover:border-yellow-300 hover:bg-yellow-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-400/20 dark:bg-violet-400/[0.07] dark:text-violet-200 dark:hover:bg-violet-400/12"
                    >
                      {suggestion.label}
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{
              paddingBottom: isEmbedded
                ? undefined
                : "max(0.75rem, env(safe-area-inset-bottom))",
            }}
            className="shrink-0 bg-white px-3 pb-3 pt-2 dark:bg-black sm:px-4 sm:pb-4"
          >
            <div className="flex items-end gap-2 rounded-[22px] border border-gray-200 bg-gray-50 p-2 shadow-inner focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100 dark:border-white/10 dark:bg-white/[0.04] dark:backdrop-blur-md dark:focus-within:ring-violet-400/10">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (file) void analyzeScreenshot(file);
                }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isTyping}
                aria-label="Upload an Adopt Me screenshot"
                title="Analyze a trade or inventory screenshot"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-200 bg-white text-lg shadow-sm transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 dark:border-violet-300/15 dark:bg-violet-400/[0.06] dark:hover:bg-violet-400/10"
              >
                📷
              </button>

              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="Ask Nich about CSBT..."
                rows={1}
                maxLength={300}
                disabled={isTyping}
                className="max-h-24 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm font-medium text-gray-800 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-60 dark:text-white dark:placeholder:text-neutral-500"
              />

              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                aria-label="Send message"
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-lg font-black text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${
                  input.trim() && !isTyping
                    ? "shadow-[0_10px_28px_rgba(124,92,228,.28)]"
                    : "shadow-md"
                }`}
              >
                ➤
              </button>
            </div>

            <p className="mt-2 text-center text-[9px] font-medium text-gray-400 sm:text-[10px]">
              📷 Screenshot recognition uses Gemini only when you upload an image. Values and W/F/L still come from CSBT.
            </p>
          </form>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}