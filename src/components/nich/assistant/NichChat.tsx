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
  persistNichUserMemoryToSupabase,
} from "./useNichLocalData";
import type {
  NichConversationContext,
  NichResponse,
  NichSuggestion,
  NichTradeComparison,
} from "./brain/types";
import {
  initialNichContext,
  resetNichContext,
  updateNichContext,
} from "./memory/context";
import useNich from "./useNich";
import {
  clearSavedChat,
  createMessageId,
  getVisionFileHash,
  initialMessages,
  initialSuggestions,
  readSavedChat,
  readNichUserMemory,
  readVisionSessionCache,
  saveChat,
  saveNichUserMemory,
  writeVisionSessionCache,
  type ChatMessage,
} from "./NichChatPersistence";
import type { NichVisionApiResponse } from "../../../lib/nich/vision";
import {
  VISION_SLOT_SHEET_MAX_TILES,
  type VisionSlotRef,
} from "../../../lib/nich/visionSlots";
import { buildSlotCropSheet } from "./visionSlotSheet";
import {
  inferScreenshotIntent,
  screenshotRouteMessage,
  tradeSessionNames,
  uniqueNames,
  type NichScreenshotIntent,
} from "../../../lib/nich/screenshotIntent";
import type { NichTradeSession, NichUserMemory } from "../../../lib/nich/tradeSession";
import NichTradeReviewCard from "./NichTradeReviewCard";
import { useBirthdayEventActive } from "../../../hooks/useBirthdayEventActive";
import { birthdayEvent, openBirthdayEvent } from "../../../config/birthdayEvent";
import { PartyHat } from "../../birthday/BirthdayIcons";

type NichChatProps = {
  open?: boolean;
  onClose?: () => void;
  variant?: "floating" | "embedded";
  initialPrompt?: string;
};

type PendingNichScreenshot = {
  file: File;
  safeFileName: string;
  uploadMessageId: string;
};

type VisionReviewRequest = {
  intent: NichScreenshotIntent;
  question: string;
};

const SCREENSHOT_ACTION_SUGGESTIONS: NichSuggestion[] = [
  {
    id: "vision-wfl",
    label: "W/F/L this trade",
    message: "W/F/L this trade",
  },
  {
    id: "vision-values",
    label: "How much are these?",
    message: "How much are these?",
  },
  {
    id: "vision-identify",
    label: "What pets/items are these?",
    message: "What pets/items are these?",
  },
  {
    id: "vision-demand",
    label: "Check demand",
    message: "What is the demand for these?",
  },
];

function recognitionSummary(
  names: string[],
  unresolvedCount: number,
) {
  const listed = uniqueNames(names);
  if (!listed.length && unresolvedCount) {
    return `I found the item slots, but ${unresolvedCount} ${unresolvedCount === 1 ? "item is" : "items are"} still uncertain. Tap Edit on any slot and search the CSBT catalog to correct it.`;
  }
  if (!listed.length) {
    return "I couldn’t identify a catalog item confidently from that screenshot. Try a clearer crop or use Edit when a review slot is available.";
  }

  const summary = `I recognized: ${listed.join(", ")}.`;
  return unresolvedCount
    ? `${summary}\n\n${unresolvedCount} ${unresolvedCount === 1 ? "slot still needs" : "slots still need"} confirmation. You can tap Edit and search the CSBT catalog.`
    : `${summary}\n\nYou can still tap Edit on any item if I got one wrong.`;
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

type NichPreparedScreenshot = {
  primary: File;
  fallbackZoom: { file: File; width: number; height: number } | null;
  width: number;
  height: number;
};

function canvasBlob(canvas: HTMLCanvasElement, type: "image/jpeg", quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

async function prepareNichScreenshot(file: File): Promise<NichPreparedScreenshot> {
  try {
    const bitmap = await createImageBitmap(file);
    const sourceWidth = bitmap.width;
    const sourceHeight = bitmap.height;
    const longestSide = Math.max(sourceWidth, sourceHeight);

    const renderToJpeg = async (
      draw: (context: CanvasRenderingContext2D, width: number, height: number) => void,
      width: number,
      height: number,
      qualitySteps: number[],
    ) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) return null;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      draw(context, width, height);
      for (const quality of qualitySteps) {
        const blob = await canvasBlob(canvas, "image/jpeg", quality);
        if (blob && blob.size <= 1_850_000) return blob;
      }
      return null;
    };

    const buildTradeZoomFallback = async () => {
      if (sourceWidth < 520 || sourceHeight < 220) return null;
      const leftX = Math.max(0, Math.round(sourceWidth * 0.01));
      const cropY = Math.max(0, Math.round(sourceHeight * 0.03));
      const cropH = Math.max(1, Math.round(sourceHeight * 0.94));
      const cropW = Math.max(1, Math.round(sourceWidth * 0.38));
      const rightX = Math.max(0, Math.round(sourceWidth * 0.61));
      const leftW = Math.min(cropW, sourceWidth - leftX);
      const rightW = Math.min(cropW, sourceWidth - rightX);
      if (leftW < 80 || rightW < 80) return null;

      const panelWidth = 760;
      const panelHeight = Math.max(280, Math.round((cropH / Math.max(leftW, rightW)) * panelWidth));
      const gutter = 28;
      const labelHeight = 44;
      const outWidth = panelWidth * 2 + gutter * 3;
      const outHeight = panelHeight + gutter * 2 + labelHeight;
      const blob = await renderToJpeg(
        (context) => {
          context.fillStyle = "#f5efe7";
          context.fillRect(0, 0, outWidth, outHeight);
          context.font = "bold 24px Inter, Arial, sans-serif";
          context.fillStyle = "#3d3d45";
          context.fillText("LEFT / YOU", gutter, 30);
          context.fillText("RIGHT / THEM", panelWidth + gutter * 2, 30);
          context.filter = "contrast(1.06) saturate(1.04)";
          context.drawImage(bitmap, leftX, cropY, leftW, cropH, gutter, labelHeight + gutter, panelWidth, panelHeight);
          context.drawImage(bitmap, rightX, cropY, rightW, cropH, panelWidth + gutter * 2, labelHeight + gutter, panelWidth, panelHeight);
          context.filter = "none";
        },
        outWidth,
        outHeight,
        [0.92, 0.86, 0.8],
      );
      return blob ? {
        file: new File([blob], "nich-trade-zoom.jpg", { type: "image/jpeg", lastModified: Date.now() }),
        width: outWidth,
        height: outHeight,
      } : null;
    };

    if ((file.type === "image/png" || file.type === "image/webp") && file.size <= 1_950_000 && longestSide <= 2200) {
      const fallbackZoom = await buildTradeZoomFallback();
      bitmap.close();
      return { primary: file, fallbackZoom, width: sourceWidth, height: sourceHeight };
    }

    const targetLongest = longestSide < 1050
      ? Math.min(1500, Math.round(longestSide * 1.35))
      : Math.min(1600, longestSide);
    const scale = targetLongest / Math.max(1, longestSide);
    let width = Math.max(1, Math.round(sourceWidth * scale));
    let height = Math.max(1, Math.round(sourceHeight * scale));

    let blob = await renderToJpeg(
      (context, w, h) => {
        context.filter = "contrast(1.04) saturate(1.03)";
        context.drawImage(bitmap, 0, 0, w, h);
        context.filter = "none";
      },
      width,
      height,
      [0.9, 0.84, 0.78],
    );

    if (!blob) {
      const smallerScale = Math.min(1, 1320 / Math.max(width, height));
      width = Math.max(1, Math.round(width * smallerScale));
      height = Math.max(1, Math.round(height * smallerScale));
      blob = await renderToJpeg(
        (context, w, h) => {
          context.filter = "contrast(1.04) saturate(1.03)";
          context.drawImage(bitmap, 0, 0, w, h);
          context.filter = "none";
        },
        width,
        height,
        [0.76],
      );
    }

    const fallbackZoom = await buildTradeZoomFallback();
    bitmap.close();
    if (blob) {
      return {
        primary: new File([blob], "nich-vision.jpg", { type: "image/jpeg", lastModified: Date.now() }),
        fallbackZoom,
        width,
        height,
      };
    }
  } catch {
    // Fall through to original file.
  }

  return { primary: file, fallbackZoom: null, width: 1, height: 1 };
}

/**
 * Bumped whenever recognition semantics change. It is part of the session cache
 * key, so an old (possibly wrong) cached recognition can never be replayed after
 * a pipeline fix.
 */
const NICH_VISION_CLIENT_VERSION = "vision-v34-smart-catalog-recognition-20260829";

async function postNichVisionScreenshot(
  file: File,
  width: number,
  height: number,
  clientVersion: string,
  mode: "primary" | "trade-zoom-fallback" | "slot-crops",
  signal: AbortSignal,
  intent: NichScreenshotIntent,
  options?: { stage?: "layout" | "slots"; manifestHeader?: string },
) {
  const visionHash = await getVisionFileHash(file);
  const stage = options?.stage ?? "layout";
  const visionCacheKey = visionHash ? `${clientVersion}:${visionHash}:${intent}:${stage}` : null;
  const cachedPayload = mode !== "trade-zoom-fallback" ? readVisionSessionCache(visionCacheKey) : null;
  if (cachedPayload) {
    return { payload: cachedPayload, apiOk: cachedPayload.ok };
  }

  const apiResponse = await fetch("/api/nich/vision", {
    method: "POST",
    body: file,
    signal,
    cache: "no-store",
    headers: {
      "Content-Type": file.type || "image/jpeg",
      "X-Nich-Vision-Client": clientVersion,
      "X-Nich-Image-Bytes": String(file.size),
      "X-Nich-Image-Width": String(width),
      "X-Nich-Image-Height": String(height),
      "X-Nich-Vision-Mode": mode,
      "X-Nich-Vision-Intent": intent,
      "X-Nich-Vision-Stage": stage,
      ...(options?.manifestHeader ? { "X-Nich-Vision-Manifest": options.manifestHeader } : {}),
      ...(visionHash ? { "X-Nich-Vision-Hash": visionHash } : {}),
    },
  });

  let payload: NichVisionApiResponse;
  try {
    payload = (await apiResponse.json()) as NichVisionApiResponse;
  } catch {
    payload = { ok: false, message: "Nich couldn’t read the screenshot response." };
  }

  const apiOk = apiResponse.ok && payload.ok;
  if (apiOk && mode !== "trade-zoom-fallback") writeVisionSessionCache(visionCacheKey, payload);
  return { payload, apiOk };
}

/**
 * Slot references for the crop pass, taken from the layout pass's bounding
 * boxes. Slots without a usable box are skipped rather than guessed at.
 */
function slotRefsFromLayout(payload: NichVisionApiResponse): VisionSlotRef[] {
  return (payload.items ?? [])
    .filter((item) => item.box && item.box.width > 0.005 && item.box.height > 0.005)
    .map((item, index) => ({
      side: item.side,
      slot: item.slot ?? index + 1,
      box: item.box!,
      variantHint: item.variant,
      potionHint: item.potion,
      categoryHint: item.category ?? item.categoryHint,
      identityHints: [...new Set([
        ...(item.itemName ? [item.itemName] : []),
        ...(item.rawName ? [item.rawName] : []),
        ...(item.candidateNames ?? []),
        ...(item.alternatives ?? []),
      ].map((name) => name.trim()).filter((name) => name && !/^unknown|unidentified/i.test(name)))].slice(0, 5),
    }))
    .slice(0, VISION_SLOT_SHEET_MAX_TILES);
}

function shouldAutoRetryWithTradeZoom(payload: NichVisionApiResponse) {
  const message = (payload.message || "").toLowerCase();
  if (payload.ok === false) {
    return message.includes("trade screenshot")
      || message.includes("occupied item slots")
      || message.includes("tighter crop")
      || message.includes("compressed copy");
  }

  // A successful whole-image pass can still be visually weak for one or two
  // tiny slots. Only spend a second Gemini request when a trade has a small,
  // actionable unresolved set; this keeps normal screenshots on the cheap path.
  const unresolved = payload.tradeSession?.unresolvedSlots.length ?? 0;
  const total = payload.tradeSession
    ? payload.tradeSession.userSide.length + payload.tradeSession.theirSide.length
    : 0;
  // If the slot-crop pass could not run (usually missing/weak boxes), the zoom
  // fallback is our rescue path. v33 only retried up to 3 unresolved slots,
  // which meant a 4-9 item trade full of Unknown cards never got a second look.
  return Boolean(payload.tradeSession && unresolved > 0 && unresolved <= Math.max(9, total));
}

function visionPayloadQuality(payload: NichVisionApiResponse) {
  if (!payload.ok || !payload.tradeSession) return -1_000;
  const session = payload.tradeSession;
  const totalSlots = session.userSide.length + session.theirSide.length;
  const unresolved = session.unresolvedSlots.length;
  const corrected = [...session.userSide, ...session.theirSide].filter((slot) => slot.correctedByUser).length;
  return totalSlots * 20 - unresolved * 18 + session.confirmedSlots.length * 6 + corrected * 2;
}

function recordVisionCorrectionMetric(session: NonNullable<NichVisionApiResponse["tradeSession"]>, command: string) {
  if (typeof window === "undefined") return;
  const match = command.match(/^(my|their) slot (\d+) is (.+)$/i);
  if (!match) return;
  const side = match[1].toLowerCase() === "my" ? "YOU" : "THEM";
  const gridPosition = Number(match[2]);
  const correctedItem = match[3].trim();
  const sourceSlot = (side === "YOU" ? session.userSide : session.theirSide)
    .find((slot) => slot.gridPosition === gridPosition);
  if (!sourceSlot) return;

  const key = "nichVisionCorrections:v1";
  try {
    const previous = JSON.parse(window.localStorage.getItem(key) || "[]") as unknown[];
    const entries = Array.isArray(previous) ? previous.slice(-199) : [];
    entries.push({
      at: Date.now(),
      predicted: sourceSlot.canonicalName ?? sourceSlot.rawName ?? "Unknown",
      corrected: correctedItem,
      side,
      slot: gridPosition,
      recognitionVersion: session.recognitionVersion,
    });
    window.localStorage.setItem(key, JSON.stringify(entries));
  } catch {
    // Analytics are best-effort and must never interfere with a correction.
  }
}

function explicitlyRequestsValueSource(message: string) {
  return /\b(?:gcash|elve(?:\s+shark|bredd)?|in[- ]?game\s+value)\b/i.test(message);
}

function mergeNichMemory(localMemory?: NichUserMemory, remoteMemory?: NichUserMemory) {
  if (!localMemory) return remoteMemory;
  if (!remoteMemory) return localMemory;
  const localIsNewer = (localMemory.updatedAt ?? 0) >= (remoteMemory.updatedAt ?? 0);
  const preferred = localIsNewer ? localMemory : remoteMemory;
  return {
    preferredValueSource: preferred.preferredValueSource ?? (localIsNewer ? remoteMemory.preferredValueSource : localMemory.preferredValueSource),
    responseStyle: preferred.responseStyle ?? (localIsNewer ? remoteMemory.responseStyle : localMemory.responseStyle),
    aliases: {
      ...(localIsNewer ? remoteMemory.aliases : localMemory.aliases),
      ...(localIsNewer ? localMemory.aliases : remoteMemory.aliases),
    },
    updatedAt: Math.max(localMemory.updatedAt ?? 0, remoteMemory.updatedAt ?? 0) || Date.now(),
  } satisfies NichUserMemory;
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
  const birthdayActive = useBirthdayEventActive();
  const isVisible = isEmbedded || open;
  const localData = useNichLocalData(isVisible);

  const [input, setInput] = useState("");
  const [initialPromptApplied, setInitialPromptApplied] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isVisionProcessing, setIsVisionProcessing] = useState(false);
  const [pendingScreenshot, setPendingScreenshot] =
    useState<PendingNichScreenshot | null>(null);
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
  const visionReviewRequestRef =
    useRef<Map<string, VisionReviewRequest>>(new Map());

  useEffect(() => {
    if (!initialPrompt || initialPromptApplied) return;
    queueMicrotask(() => setInput(initialPrompt.slice(0, 1800)));
    queueMicrotask(() => setInitialPromptApplied(true));
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
    setIsVisionProcessing(false);
    setPendingScreenshot(null);
    visionReviewRequestRef.current.clear();
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

    clearSavedChat();

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
    if (pendingScreenshot) {
      return SCREENSHOT_ACTION_SUGGESTIONS;
    }

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
        const nonVisionSuggestions = message.suggestions.filter(
          (suggestion) => !suggestion.id.startsWith("vision-"),
        );
        if (nonVisionSuggestions.length) return nonVisionSuggestions;
      }
    }

    return initialSuggestions;
  }, [messages, pendingScreenshot]);

  useEffect(() => {
    const savedChat = readSavedChat();

    if (savedChat) {
      queueMicrotask(() => setMessages(savedChat.messages));
      queueMicrotask(() => setConversationContext(
        savedChat.context,
      ));
    }

    queueMicrotask(() => setIsStorageReady(true));
  }, []);

  useEffect(() => {
    if (!localData.loaded) return;

    const localMemory = readNichUserMemory(localData.userId);
    const mergedMemory = mergeNichMemory(localMemory, localData.nichMemory);
    if (!mergedMemory) return;

    saveNichUserMemory(mergedMemory, localData.userId);

    queueMicrotask(() => {
      setConversationContext((current) => ({
        ...current,
        userMemory: mergeNichMemory(current.userMemory, mergedMemory),
        lastValueSource: current.lastValueSource ?? mergedMemory.preferredValueSource,
      }));
    });
  }, [localData.loaded, localData.nichMemory, localData.userId]);

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
          gameId: "adopt-me",
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
                // This chat surface is the Adopt Me one. The game is stated by
                // the client, never inferred by the server from the message.
                gameId: "adopt-me",
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

      if (explicitlyRequestsValueSource(trimmedMessage)) {
        const selectedSource = response.context?.lastValueSource ?? response.tradeComparison?.valueSource;
        if (selectedSource === "GCASH" || selectedSource === "ELVE") {
          const currentMemory = response.context?.userMemory ?? conversationContext.userMemory ?? localData.nichMemory;
          response = {
            ...response,
            context: {
              ...response.context,
              userMemory: {
                ...(currentMemory ?? {}),
                preferredValueSource: selectedSource,
                updatedAt: Date.now(),
              },
            },
          };
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
            tradeSession: response.tradeSession,
          };

          const updatedMemory = response.context?.userMemory;
          if (updatedMemory) {
            saveNichUserMemory(updatedMemory, localData.userId);
            void persistNichUserMemoryToSupabase(localData.userId, updatedMemory);
          }

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

  const resolveVisionResponse = useCallback(
    ({
      question,
      intent,
      tradeSession,
      recentPets,
      baseContext,
    }: {
      question: string;
      intent: NichScreenshotIntent;
      tradeSession?: NichTradeSession;
      recentPets: NonNullable<NichConversationContext["recentPets"]>;
      baseContext: NichConversationContext;
    }): NichResponse => {
      const confirmedNames = uniqueNames([
        ...tradeSessionNames(tradeSession),
        ...recentPets.map((pet) => pet.petName),
      ]);
      const unresolvedCount = tradeSession?.unresolvedSlots.length ?? 0;
      const activeContext: NichConversationContext = {
        ...baseContext,
        activeTrade: tradeSession,
        recentPets,
        lastPetName: recentPets.length === 1 ? recentPets[0].petName : undefined,
        lastVariant: recentPets.length === 1 ? recentPets[0].variant : undefined,
        lastTradeComparison: undefined,
        ...(tradeSession ? { lastValueSource: tradeSession.valueSystem } : {}),
        lastUpdatedAt: Date.now(),
      };

      if (intent === "IDENTIFY") {
        return {
          text: recognitionSummary(confirmedNames, unresolvedCount),
          intent: "petLookup",
          reaction: unresolvedCount ? "search" : "celebrate",
          localConfidence: 1,
          aiEligible: false,
          typingDuration: 220,
          tradeSession,
          context: activeContext,
        };
      }

      if (tradeSession && unresolvedCount > 0) {
        const text =
          intent === "WFL"
            ? `I found the trade, but ${unresolvedCount} ${unresolvedCount === 1 ? "slot needs" : "slots need"} confirmation before I calculate W/F/L. Tap Edit on any wrong item and search the CSBT catalog.`
            : intent === "VALUES"
              ? `I found the items, but ${unresolvedCount} ${unresolvedCount === 1 ? "slot needs" : "slots need"} confirmation before I give you the values. Tap Edit on any wrong item and search the CSBT catalog.`
              : intent === "DEMAND"
                ? `I found the items, but ${unresolvedCount} ${unresolvedCount === 1 ? "slot needs" : "slots need"} confirmation before I compare demand. Tap Edit on any wrong item and search the CSBT catalog.`
                : recognitionSummary(confirmedNames, unresolvedCount);

        return {
          text,
          intent: intent === "WFL" ? "tradeComparison" : "petLookup",
          reaction: "search",
          localConfidence: 1,
          aiEligible: false,
          typingDuration: 220,
          tradeSession,
          context: activeContext,
        };
      }

      if (intent === "WFL") {
        if (!tradeSession) {
          return {
            text: "I couldn’t find a clear two-sided trade in that screenshot. Try a tighter crop of the trade window, or choose “How much are these?” if you only want item values.",
            intent: "fallback",
            reaction: "searchEmpty",
            localConfidence: 1,
            aiEligible: false,
            typingDuration: 220,
            context: activeContext,
          };
        }

        const routed = routeNichMessage({
          gameId: "adopt-me",
          message: "W/F/L this trade",
          context: activeContext,
          localData,
        });
        return {
          ...routed,
          aiEligible: false,
          localConfidence: 1,
          tradeSession: routed.tradeSession ?? tradeSession,
          context: {
            ...activeContext,
            ...routed.context,
            activeTrade: routed.tradeSession ?? tradeSession,
          },
        };
      }

      if (intent === "VALUES" || intent === "DEMAND") {
        if (!confirmedNames.length) {
          return {
            text:
              intent === "VALUES"
                ? "I couldn’t identify any CSBT catalog items confidently enough to price them. Try a clearer crop, or use the item editor if a review card appears."
                : "I couldn’t identify any CSBT catalog items confidently enough to check demand. Try a clearer crop, or use the item editor if a review card appears.",
            intent: "fallback",
            reaction: "searchEmpty",
            localConfidence: 1,
            aiEligible: false,
            typingDuration: 220,
            tradeSession,
            context: activeContext,
          };
        }

        // Avoid the active-trade correction router for a value/demand request:
        // we want the same recognized items, but not an automatic W/F/L result.
        const lookupContext: NichConversationContext = {
          ...activeContext,
          activeTrade: undefined,
        };
        const routed = routeNichMessage({
          gameId: "adopt-me",
          message: screenshotRouteMessage(intent, question, confirmedNames),
          context: lookupContext,
          localData,
        });
        return {
          ...routed,
          aiEligible: false,
          localConfidence: 1,
          tradeSession,
          context: {
            ...activeContext,
            ...routed.context,
            activeTrade: tradeSession,
            recentPets,
          },
        };
      }

      const routed = routeNichMessage({
        gameId: "adopt-me",
        message: screenshotRouteMessage(intent, question, confirmedNames),
        context: activeContext,
        localData,
      });
      return {
        ...routed,
        tradeSession: routed.tradeSession ?? tradeSession,
        context: {
          ...activeContext,
          ...routed.context,
          activeTrade: routed.tradeSession ?? tradeSession,
          recentPets,
        },
      };
    },
    [localData],
  );

  const applyTradeReviewCommand = useCallback(
    (messageId: string, session: NonNullable<ChatMessage["tradeSession"]>, command: string) => {
      const trimmedCommand = command.trim();
      if (!trimmedCommand) return;

      recordVisionCorrectionMetric(session, trimmedCommand);

      const correctionResponse = routeNichMessage({
        gameId: "adopt-me",
        message: trimmedCommand,
        context: {
          ...conversationContext,
          activeTrade: session,
          lastValueSource: session.valueSystem,
        },
        localData,
      });

      if (!correctionResponse.tradeSession) return;

      const updatedSession = correctionResponse.tradeSession;
      const reviewRequest = visionReviewRequestRef.current.get(messageId);
      const recentPets: NonNullable<NichConversationContext["recentPets"]> =
        [...updatedSession.userSide, ...updatedSession.theirSide]
          .filter((slot) => slot.status === "CONFIRMED" && slot.canonicalName)
          .map((slot) => ({
            petName: slot.canonicalName!,
            ...(slot.mega
              ? { variant: "mega" as const }
              : slot.neon
                ? { variant: "neon" as const }
                : { variant: "normal" as const }),
          }));

      const response = reviewRequest
        ? resolveVisionResponse({
            question: reviewRequest.question,
            intent: reviewRequest.intent,
            tradeSession: updatedSession,
            recentPets,
            baseContext: {
              ...conversationContext,
              activeTrade: updatedSession,
              lastValueSource: updatedSession.valueSystem,
            },
          })
        : correctionResponse;

      // Review-card actions are UI edits, not chat turns. Update the existing
      // recognition card in place so confirming/correcting several slots does
      // not spam a new user bubble + NICH response for every click. For
      // screenshot-driven flows, re-run the ORIGINAL selected goal (W/F/L,
      // values, identify, demand) after each correction instead of silently
      // switching to W/F/L.
      setMessages((currentMessages) => currentMessages.map((message) => {
        if (message.id !== messageId) return message;
        return {
          ...message,
          text: response.text,
          tradeSession: response.tradeSession ?? updatedSession,
          tradeComparison: response.tradeComparison,
          intent: response.intent,
          suggestions: response.suggestions,
        };
      }));

      setConversationContext((currentContext) => updateNichContext(currentContext, response));

      const updatedMemory = response.context?.userMemory;
      if (updatedMemory) {
        saveNichUserMemory(updatedMemory, localData.userId);
        void persistNichUserMemoryToSupabase(localData.userId, updatedMemory);
      }
    },
    [conversationContext, localData, resolveVisionResponse],
  );

  const queueScreenshot = useCallback(
    (file: File) => {
      if (isTyping) return;

      if (file.size > 12 * 1024 * 1024) {
        setMessages((currentMessages) => [
          ...currentMessages,
          {
            id: createMessageId(),
            sender: "nich",
            text: "That image is too large. Please use a screenshot under 12 MB.",
            createdAt: Date.now(),
            intent: "fallback",
          },
        ]);
        react("searchEmpty");
        return;
      }

      const safeFileName = file.name.length > 54
        ? `${file.name.slice(0, 28)}…${file.name.slice(-18)}`
        : file.name;
      const uploadMessageId = createMessageId();
      const chooserMessageId = createMessageId();

      setPendingScreenshot({
        file,
        safeFileName,
        uploadMessageId,
      });
      setInput("");
      setIsVisionProcessing(false);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: uploadMessageId,
          sender: "user",
          text: `📷 Screenshot attached: ${safeFileName}`,
          createdAt: Date.now(),
        },
        {
          id: chooserMessageId,
          sender: "nich",
          text: "What do you want me to check from this screenshot?",
          createdAt: Date.now(),
          intent: "help",
          suggestions: SCREENSHOT_ACTION_SUGGESTIONS,
        },
      ]);
      react("idle");

      window.requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    },
    [isTyping, react],
  );

  const answerPendingScreenshot = useCallback(
    async (questionText: string) => {
      const pending = pendingScreenshot;
      const question = questionText.trim();
      if (!pending || !question || isTyping) return;

      const intent = inferScreenshotIntent(question);
      const requestId = requestSequenceRef.current + 1;
      requestSequenceRef.current = requestId;

      // The image is not sent to any vision model until the user has selected
      // an intent (or typed a custom question). This restores the old NICH flow:
      // attach -> choose what you want -> then analyze.
      setPendingScreenshot(null);
      setInput("");
      setIsVisionProcessing(true);
      setIsTyping(true);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createMessageId(),
          sender: "user",
          text: question,
          createdAt: Date.now(),
        },
      ]);
      react("search");

      try {
        const prepared = await prepareNichScreenshot(pending.file);
        const optimized = prepared.primary;

        let payload: NichVisionApiResponse;
        let apiOk = false;
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 92_000);

        try {
          // PASS 1 — layout. Finds the occupied slots and their bounding boxes.
          // Its pet names are treated as hypotheses only.
          const primaryAttempt = await postNichVisionScreenshot(
            optimized,
            prepared.width,
            prepared.height,
            NICH_VISION_CLIENT_VERSION,
            "primary",
            controller.signal,
            intent,
          );
          payload = primaryAttempt.payload;
          apiOk = primaryAttempt.apiOk;

          // PASS 2 — identity from enlarged slot crops. Each detected slot is cut
          // from the ORIGINAL screenshot and enlarged onto one contact sheet, so
          // identity is decided from artwork that is actually legible.
          let slotStageSucceeded = false;
          const slotRefs = apiOk ? slotRefsFromLayout(payload) : [];
          if (slotRefs.length) {
            const sheet = await buildSlotCropSheet(pending.file, slotRefs, {
              imageType: payload.imageType ?? "TRADE",
              layoutConfidence: payload.layoutConfidence ?? payload.debug?.layoutConfidence ?? 0.8,
            });
            if (sheet) {
              const layoutPayload = payload;
              const slotAttempt = await postNichVisionScreenshot(
                sheet.file,
                sheet.width,
                sheet.height,
                NICH_VISION_CLIENT_VERSION,
                "slot-crops",
                controller.signal,
                intent,
                { stage: "slots", manifestHeader: sheet.manifestHeader },
              );
              if (slotAttempt.apiOk) {
                payload = slotAttempt.payload;
                apiOk = true;
                slotStageSucceeded = true;
              } else {
                // The crop pass is an accuracy upgrade, not a hard requirement.
                // Falling back keeps the layout result, which stays conservative
                // about identities on its own.
                payload = layoutPayload;
              }
            }
          }

          // Once the crop pass has run, never let the cheaper whole-image zoom
          // retry overwrite it. That retry scores payloads by how few slots are
          // unresolved, which would reward a confident wrong read over an honest
          // "needs confirmation".
          if (!slotStageSucceeded && prepared.fallbackZoom && shouldAutoRetryWithTradeZoom(payload)) {
            const primaryPayload = payload;
            const primaryApiOk = apiOk;
            const fallbackAttempt = await postNichVisionScreenshot(
              prepared.fallbackZoom.file,
              prepared.fallbackZoom.width,
              prepared.fallbackZoom.height,
              NICH_VISION_CLIENT_VERSION,
              "trade-zoom-fallback",
              controller.signal,
              intent,
            );
            if (
              fallbackAttempt.apiOk &&
              visionPayloadQuality(fallbackAttempt.payload) > visionPayloadQuality(primaryPayload)
            ) {
              payload = fallbackAttempt.payload;
              apiOk = true;
            } else {
              payload = primaryPayload;
              apiOk = primaryApiOk;
            }
          }
        } finally {
          window.clearTimeout(timeout);
        }

        if (requestSequenceRef.current !== requestId) return;

        if (!apiOk) {
          setMessages((currentMessages) => [
            ...currentMessages,
            {
              id: createMessageId(),
              sender: "nich",
              text:
                payload.message ||
                "Nich couldn’t analyze that screenshot. Try a clearer crop or type the item/trade manually.",
              createdAt: Date.now(),
              intent: "fallback",
            },
          ]);
          react("searchEmpty");
          return;
        }

        const screenshotTrade = payload.tradeSession
          ? {
              ...payload.tradeSession,
              valueSystem:
                conversationContext.lastValueSource ??
                conversationContext.userMemory?.preferredValueSource ??
                localData.nichMemory?.preferredValueSource ??
                payload.tradeSession.valueSystem,
            }
          : undefined;

        const verifiedItems = (payload.items ?? [])
          .filter((item) => item.verified && item.itemName)
          .slice(0, 18);

        const recentPets: NonNullable<NichConversationContext["recentPets"]> =
          verifiedItems.map((item) => ({
            petName: item.itemName!,
            ...(item.variant === "NEON"
              ? { variant: "neon" as const }
              : item.variant === "MEGA"
                ? { variant: "mega" as const }
                : { variant: "normal" as const }),
          }));

        const baseContext: NichConversationContext = {
          ...conversationContext,
          activeTrade: screenshotTrade,
          recentPets,
          lastPetName: recentPets.length === 1 ? recentPets[0].petName : undefined,
          lastVariant: recentPets.length === 1 ? recentPets[0].variant : undefined,
          lastTradeComparison: undefined,
          ...(screenshotTrade ? { lastValueSource: screenshotTrade.valueSystem } : {}),
          lastUpdatedAt: Date.now(),
        };

        const response = resolveVisionResponse({
          question,
          intent,
          tradeSession: screenshotTrade,
          recentPets,
          baseContext,
        });

        const nichMessage: ChatMessage = {
          id: createMessageId(),
          sender: "nich",
          text: response.text,
          createdAt: Date.now(),
          suggestions: response.suggestions,
          intent: response.intent,
          tradeComparison: response.tradeComparison,
          tradeSession: response.tradeSession ?? screenshotTrade,
        };

        if (nichMessage.tradeSession) {
          visionReviewRequestRef.current.set(nichMessage.id, {
            intent,
            question,
          });
        }

        setMessages((currentMessages) => [...currentMessages, nichMessage]);
        setConversationContext((currentContext) =>
          updateNichContext(currentContext, response),
        );

        const updatedMemory = response.context?.userMemory;
        if (updatedMemory) {
          saveNichUserMemory(updatedMemory, localData.userId);
          void persistNichUserMemoryToSupabase(localData.userId, updatedMemory);
        }

        react(response.reaction);
      } catch (error) {
        if (requestSequenceRef.current !== requestId) return;
        const message =
          error instanceof Error && error.message
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
        if (requestSequenceRef.current === requestId) {
          setIsVisionProcessing(false);
          setIsTyping(false);
        }
      }
    },
    [
      conversationContext,
      isTyping,
      localData,
      pendingScreenshot,
      react,
      resolveVisionResponse,
    ],
  );

  const submitCurrentInput = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;
    if (pendingScreenshot) {
      void answerPendingScreenshot(trimmed);
      return;
    }
    void sendMessage(trimmed);
  }, [answerPendingScreenshot, input, isTyping, pendingScreenshot, sendMessage]);

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    submitCurrentInput();
  }

  const chatClasses = isEmbedded
    ? `
        nich-theme-shell
        nich-smart-shell
        nich-smart-embedded
        relative
        flex
        h-[690px]
        max-h-[80dvh]
        w-full
        flex-col
        overflow-hidden
        rounded-[28px]
        border
        backdrop-blur-2xl
        sm:h-[735px]
        lg:h-[790px]
        lg:max-h-[calc(100dvh-4rem)]
      `
    : `
        nich-theme-shell
        nich-smart-shell
        nich-smart-floating
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
        backdrop-blur-2xl
        lg:left-auto
        lg:top-auto
        lg:bottom-6
        lg:right-6
        lg:h-[710px]
        lg:max-h-[calc(100dvh-3rem)]
        lg:w-[490px]
        lg:rounded-[28px]
        lg:border
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
            .nich-smart-scrollbar {
              scrollbar-width: thin;
              scrollbar-color: color-mix(in srgb, var(--purple) 65%, var(--foreground-muted)) transparent;
            }

            .nich-smart-scrollbar::-webkit-scrollbar {
              width: 6px;
              height: 6px;
            }

            .nich-smart-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }

            .nich-smart-scrollbar::-webkit-scrollbar-thumb {
              border: 1px solid color-mix(in srgb, var(--purple) 28%, transparent);
              border-radius: 999px;
              background: linear-gradient(180deg, color-mix(in srgb, var(--purple) 82%, white), var(--purple));
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
                  className="nich-smart-confirm w-full max-w-sm rounded-[22px] border p-5 shadow-[var(--shadow-lg)]"
                >
                  <h3 className="text-lg font-black text-[var(--foreground)]">
                    Start a new chat?
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
                    This clears the current messages and Nich’s remembered pets and trades.
                  </p>

                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowClearConfirmation(false);
                      }}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface-3)] px-4 py-2 text-sm font-bold text-[var(--foreground-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
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
            className={`nich-smart-header relative shrink-0 overflow-hidden border-b transition-all duration-300 ${
              isHeaderCompact
                ? "px-4 py-3 sm:px-5 lg:px-6"
                : "px-4 py-4 sm:px-5 lg:px-6 lg:py-5"
            }`}
          >
            <div className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full bg-[color-mix(in_srgb,var(--purple)_14%,transparent)] blur-2xl" />

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
                className={`nich-smart-avatar relative shrink-0 rounded-full p-[2px] transition-all duration-300 ${
                  isHeaderCompact
                    ? "h-10 w-10"
                    : "h-12 w-12"
                }`}
              >
                <div className="relative h-full w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <Image
                  src="/nich/nich-face.png"
                  alt="Nich"
                  fill
                  unoptimized
                  className="object-cover object-[50%_35%]"
                  sizes="48px"
                />
                </div>
                {birthdayActive && <PartyHat aria-hidden="true" className="birthday-nich-chat-hat h-7 w-7"/>}
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

                  <span className="nich-smart-badge rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[.11em]">
                    CSBT Assistant
                  </span>
                </div>

                <p className="mt-1 flex items-center gap-2 text-xs font-semibold text-[var(--foreground-muted)]">
                  <span className={`h-1.5 w-1.5 rounded-full ${isTyping ? "bg-[var(--purple)]" : "bg-[var(--green)]"}`} aria-hidden="true" />
                  {isVisionProcessing ? "Reading screenshot for your selected check…" : isTyping ? "Analyzing with CSBT data…" : "Local-first · Built around CSBT market data"}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {birthdayActive && <button type="button" onClick={() => openBirthdayEvent("nich")} className="birthday-nich-trigger hidden min-h-11 rounded-xl px-3 text-[11px] font-black sm:inline-flex" aria-label={`Open ${birthdayEvent.person.name} birthday scan`}>🎂 <span>{birthdayEvent.person.name}&apos;s Birthday</span></button>}
                <button
                  type="button"
                  onClick={() => {
                    setShowClearConfirmation(true);
                  }}
                  aria-label="Start a new Nich chat"
                  title="Start a new chat"
                  className="nich-smart-new-chat flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3.5 text-[11px] font-black transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color-mix(in_srgb,var(--purple)_20%,transparent)]"
                >
                  <span aria-hidden="true">✦</span> New chat
                </button>

                {!isEmbedded && onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close Ask Nich"
                    className="nich-smart-new-chat flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-black transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color-mix(in_srgb,var(--purple)_20%,transparent)]"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="nich-theme-stage nich-smart-stage relative min-h-0 flex-1 overflow-hidden">
            <div className="nich-smart-stage-glow pointer-events-none absolute inset-0 z-0" />

            <div
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll}
              className="nich-theme-messages nich-smart-messages nich-smart-scrollbar relative z-10 h-full overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8"
            >
              <div className="space-y-6 sm:space-y-7">
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
                    {isNich && !(message.tradeSession && variant === "floating") && (
                      <div className="nich-smart-message-avatar relative h-8 w-8 shrink-0 overflow-hidden rounded-full">
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
                      className={`flex min-w-0 flex-col ${
                        isNich && message.tradeSession
                          ? "max-w-full flex-1 items-stretch"
                          : isNich
                            ? "max-w-[88%] items-start sm:max-w-[86%]"
                            : "max-w-[88%] items-end sm:max-w-[86%]"
                      }`}
                    >
                      {isNich && message.tradeSession && (
                        <NichTradeReviewCard
                          session={message.tradeSession}
                          compact={variant === "floating"}
                          onCommand={(command) => {
                            applyTradeReviewCommand(message.id, message.tradeSession!, command);
                          }}
                        />
                      )}

                      {isNich &&
                        message.tradeComparison && (
                          <TradeResultCard
                            comparison={
                              message.tradeComparison
                            }
                          />
                        )}

                      {!(isNich && message.tradeSession && variant === "floating") && (
                        <div
                          className={`whitespace-pre-line rounded-[20px] px-5 py-4 text-sm leading-7 ${
                            isNich
                              ? "nich-smart-response rounded-bl-[8px] font-medium text-[var(--foreground)]"
                              : "nich-smart-user rounded-br-[8px] font-semibold text-[var(--foreground)]"
                          }`}
                        >
                          {isNich && <span className="nich-smart-response-mark mr-2 inline-flex align-middle" aria-hidden="true">✦</span>}
                          {visibleText}
                        </div>
                      )}

                      <div
                        className={`mt-1.5 flex flex-wrap items-center gap-2 px-1 text-[10px] text-[color-mix(in_srgb,var(--foreground-muted)_64%,transparent)] ${
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
                            className="nich-smart-message-action min-h-8 rounded-md px-1.5 py-0.5 font-bold transition"
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
                            className="nich-smart-message-action min-h-8 rounded-md px-1.5 py-0.5 font-bold transition"
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

              {isTyping && !isVisionProcessing && (
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
                  <div className="nich-smart-message-avatar relative h-8 w-8 shrink-0 overflow-hidden rounded-full">
                    <Image
                      src="/nich/nich-face.png"
                      alt=""
                      fill
                      unoptimized
                      className="object-cover object-[50%_35%]"
                      sizes="32px"
                    />
                  </div>

                  <div className="nich-smart-typing flex items-center gap-1.5 rounded-[20px] rounded-bl-[8px] px-4 py-3">
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
                        className="h-2 w-2 rounded-full bg-[var(--purple)]"
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="nich-smart-fade-top pointer-events-none absolute inset-x-0 top-0 z-20 h-10" />
            <div className="nich-smart-fade-bottom pointer-events-none absolute inset-x-0 bottom-0 z-20 h-12" />

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
                  className="nich-smart-scroll-button absolute bottom-5 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full text-lg transition"
                >
                  ↓
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {latestSuggestions.length > 0 && (
            <div className="nich-theme-bottom nich-smart-actions shrink-0 border-t px-4 pt-4 backdrop-blur-xl sm:px-5 lg:px-6">
              <div className="nich-smart-scrollbar flex gap-2.5 overflow-x-auto pb-3">
                {latestSuggestions.map(
                  (suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() => {
                        if (pendingScreenshot && suggestion.id.startsWith("vision-")) {
                          void answerPendingScreenshot(suggestion.message);
                          return;
                        }
                        void sendMessage(suggestion.message);
                      }}
                      disabled={isTyping}
                      className="nich-smart-chip shrink-0 rounded-full px-3.5 py-2.5 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-50"
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
            className="nich-theme-bottom nich-smart-composer-wrap shrink-0 px-4 pb-4 pt-2 sm:px-5 sm:pb-5 lg:px-6"
          >
            <div className="nich-smart-composer flex items-end gap-2 rounded-[20px] border p-2 transition">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (file) queueScreenshot(file);
                }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isTyping}
                aria-label="Upload an Adopt Me screenshot"
                title="Analyze a trade or inventory screenshot"
                className="nich-smart-upload flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 16V5m0 0L8.5 8.5M12 5l3.5 3.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 14.5v2.75A1.75 1.75 0 0 0 6.75 19h10.5A1.75 1.75 0 0 0 19 17.25V14.5" strokeLinecap="round"/></svg>
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
                    submitCurrentInput();
                  }
                }}
                placeholder="Ask Nich about CSBT..."
                rows={1}
                maxLength={300}
                disabled={isTyping}
                className="max-h-24 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm font-semibold text-[var(--foreground)] outline-none placeholder:text-[color-mix(in_srgb,var(--foreground-muted)_72%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                aria-label="Send message"
                className={`nich-smart-send flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  input.trim() && !isTyping
                    ? "is-ready"
                    : ""
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true"><path d="M12 3.5l1.15 3.35a5.5 5.5 0 0 0 3.5 3.5L20 11.5l-3.35 1.15a5.5 5.5 0 0 0-3.5 3.5L12 19.5l-1.15-3.35a5.5 5.5 0 0 0-3.5-3.5L4 11.5l3.35-1.15a5.5 5.5 0 0 0 3.5-3.5L12 3.5Z" fill="currentColor"/><circle cx="18.5" cy="5.5" r="1.5" fill="currentColor" opacity=".7"/></svg>
              </button>
            </div>

            <p className="nich-smart-note mt-3 flex items-center justify-center gap-1.5 text-center text-xs font-semibold">
              <span aria-hidden="true">◇</span> Attach a screenshot, choose what you want checked, then NICH analyzes it. Wrong item? Tap Edit and search the CSBT catalog. Values and W/F/L still come from CSBT.
            </p>
          </form>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}