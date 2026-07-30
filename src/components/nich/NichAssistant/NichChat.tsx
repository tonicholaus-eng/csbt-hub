"use client";

import Image from "next/image";
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
import type {
  NichConversationContext,
  NichSuggestion,
} from "./brain/types";
import {
  initialNichContext,
  updateNichContext,
} from "./memory/context";
import useNich from "./useNich";

type NichChatProps = {
  open?: boolean;
  onClose?: () => void;
  variant?: "floating" | "embedded";
};

type ChatMessage = {
  id: string;
  sender: "user" | "nich";
  text: string;
  suggestions?: NichSuggestion[];
};

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
    suggestions: initialSuggestions,
  },
];

function createMessageId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export default function NichChat({
  open = false,
  onClose,
  variant = "floating",
}: NichChatProps) {
  const shouldReduceMotion = useReducedMotion();
  const { react } = useNich();

  const isEmbedded = variant === "embedded";
  const isVisible = isEmbedded || open;

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] =
    useState<ChatMessage[]>(initialMessages);

  const [conversationContext, setConversationContext] =
    useState<NichConversationContext>(
      initialNichContext,
    );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const responseTimeoutRef = useRef<number | null>(null);

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
    if (!isVisible) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: shouldReduceMotion ? "auto" : "smooth",
      block: "end",
    });
  }, [
    isVisible,
    messages,
    isTyping,
    shouldReduceMotion,
  ]);

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
      if (responseTimeoutRef.current !== null) {
        window.clearTimeout(
          responseTimeoutRef.current,
        );
      }
    };
  }, []);

  const sendMessage = useCallback(
    (messageText: string) => {
      const trimmedMessage = messageText.trim();

      if (!trimmedMessage || isTyping) {
        return;
      }

      const response = routeNichMessage({
        message: trimmedMessage,
        context: conversationContext,
      });

      const userMessage: ChatMessage = {
        id: createMessageId(),
        sender: "user",
        text: trimmedMessage,
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
      }

      const typingDuration = shouldReduceMotion
        ? 0
        : response.typingDuration ?? 600;

      responseTimeoutRef.current =
        window.setTimeout(() => {
          const nichMessage: ChatMessage = {
            id: createMessageId(),
            sender: "nich",
            text: response.text,
            suggestions: response.suggestions,
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
        }, typingDuration);
    },
    [
      conversationContext,
      isTyping,
      react,
      shouldReduceMotion,
    ],
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
        dark:bg-slate-950/90
        dark:shadow-[0_30px_90px_rgba(0,0,0,.35)]
        sm:h-[720px]
        sm:rounded-[36px]
      `
    : `
        fixed
        inset-x-3
        bottom-24
        z-[89]
        flex
        max-h-[72dvh]
        flex-col
        overflow-hidden
        rounded-[28px]
        border
        border-white/70
        bg-white/95
        shadow-[0_30px_90px_rgba(15,23,42,.3)]
        backdrop-blur-2xl
        sm:inset-x-auto
        sm:bottom-28
        sm:right-6
        sm:h-[620px]
        sm:max-h-[calc(100dvh-150px)]
        sm:w-[410px]
        sm:rounded-[34px]
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
          <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-yellow-300 via-amber-300 to-orange-300 px-4 py-4 sm:px-5">
            <div className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full bg-white/30 blur-2xl" />

            <div className="relative flex items-center gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-white bg-yellow-50 shadow-md">
                <Image
                  src="/nich/nich-face.png"
                  alt="Nich"
                  fill
                  unoptimized
                  className="object-cover object-[50%_35%]"
                  sizes="48px"
                />

                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-black text-gray-950">
                    Nich
                  </h2>

                  <span className="rounded-full bg-white/65 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-800">
                    CSBT Assistant
                  </span>
                </div>

                <p className="mt-0.5 text-xs font-semibold text-gray-700">
                  <span className="mr-1 text-green-600">
                    ●
                  </span>

                  {isTyping
                    ? "Nich is thinking..."
                    : "Online · Your trading buddy"}
                </p>
              </div>

              {!isEmbedded && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close Ask Nich"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70 text-lg font-black text-gray-900 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gradient-to-b from-white via-yellow-50/30 to-orange-50/30 px-3 py-4 dark:from-slate-950 dark:via-amber-950/10 dark:to-orange-950/10 sm:px-4">
            <div className="space-y-4">
              {messages.map((message) => {
                const isNich =
                  message.sender === "nich";

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
                    className={`flex items-end gap-2 ${
                      isNich
                        ? "justify-start"
                        : "justify-end"
                    }`}
                  >
                    {isNich && (
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-yellow-200 bg-yellow-50">
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
                      className={`max-w-[82%] whitespace-pre-line rounded-[22px] px-4 py-3 text-sm leading-relaxed shadow-sm ${
                        isNich
                          ? "rounded-bl-md border border-gray-100 bg-white font-medium text-gray-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200"
                          : "rounded-br-md bg-gradient-to-br from-yellow-300 to-orange-300 font-semibold text-gray-950"
                      }`}
                    >
                      {message.text}
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
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-yellow-200 bg-yellow-50">
                    <Image
                      src="/nich/nich-face.png"
                      alt=""
                      fill
                      unoptimized
                      className="object-cover object-[50%_35%]"
                      sizes="32px"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 rounded-[20px] rounded-bl-md border border-gray-100 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/[0.07]">
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
                        className="h-2 w-2 rounded-full bg-amber-400"
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {latestSuggestions.length > 0 && (
            <div className="shrink-0 border-t border-gray-100 bg-white/90 px-3 pt-3 dark:border-white/10 dark:bg-slate-950/90 sm:px-4">
              <div className="flex gap-2 overflow-x-auto pb-2">
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
                      className="shrink-0 rounded-full border border-yellow-200 bg-yellow-50 px-3 py-2 text-[11px] font-bold text-amber-800 transition hover:border-yellow-300 hover:bg-yellow-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200 dark:hover:bg-amber-400/15"
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
            className="shrink-0 bg-white px-3 pb-3 pt-2 dark:bg-slate-950 sm:px-4 sm:pb-4"
          >
            <div className="flex items-end gap-2 rounded-[22px] border border-gray-200 bg-gray-50 p-2 shadow-inner focus-within:border-yellow-300 focus-within:ring-4 focus-within:ring-yellow-100 dark:border-white/10 dark:bg-white/[0.055] dark:focus-within:ring-yellow-400/10">
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
                className="max-h-24 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm font-medium text-gray-800 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-60 dark:text-white dark:placeholder:text-slate-500"
              />

              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                aria-label="Send message"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 text-lg font-black text-white shadow-md transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
              >
                ➤
              </button>
            </div>

            <p className="mt-2 text-center text-[9px] font-medium text-gray-400 sm:text-[10px]">
              Nich uses the CSBT database. Always
              verify values before trading.
            </p>
          </form>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}