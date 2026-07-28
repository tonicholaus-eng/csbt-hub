"use client";

import Image from "next/image";
import {
  FormEvent,
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

import pets from "../../data/pets.json";

type NichChatProps = {
  open: boolean;
  onClose: () => void;
};

type ChatMessage = {
  id: string;
  sender: "user" | "nich";
  text: string;
};

type PetRecord = {
  PETS: string;
  NORMAL?: string | number;
  NEON?: string | number;
  MEGA?: string | number;
  IMAGE?: string;
};

const quickQuestions = [
  "What is Frost Dragon worth?",
  "How do I use the calculator?",
  "Find pets around 500 value",
];

const petRecords = pets as PetRecord[];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatValue(value: string | number | undefined) {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return "Not listed";
  }

  return String(value).trim();
}

function getValueCenter(value: string | number | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  const numbers = String(value)
    .match(/\d+(?:\.\d+)?/g)
    ?.map(Number)
    .filter((number) => Number.isFinite(number));

  if (!numbers?.length) {
    return null;
  }

  if (numbers.length === 1) {
    return numbers[0];
  }

  return (numbers[0] + numbers[1]) / 2;
}

function findPetInQuestion(question: string) {
  const normalizedQuestion = normalizeText(question);

  const exactPet = petRecords.find(
    (pet) =>
      normalizeText(pet.PETS) === normalizedQuestion,
  );

  if (exactPet) {
    return exactPet;
  }

  return [...petRecords]
    .sort((firstPet, secondPet) => {
      return (
        secondPet.PETS.length - firstPet.PETS.length
      );
    })
    .find((pet) =>
      normalizedQuestion.includes(
        normalizeText(pet.PETS),
      ),
    );
}

function getNearbyPets(targetValue: number) {
  const matches: Array<{
    name: string;
    variant: "Normal" | "Neon" | "Mega";
    value: string;
    difference: number;
  }> = [];

  for (const pet of petRecords) {
    const variants = [
      {
        name: "Normal" as const,
        value: pet.NORMAL,
      },
      {
        name: "Neon" as const,
        value: pet.NEON,
      },
      {
        name: "Mega" as const,
        value: pet.MEGA,
      },
    ];

    for (const variant of variants) {
      const center = getValueCenter(variant.value);

      if (center === null) {
        continue;
      }

      matches.push({
        name: pet.PETS,
        variant: variant.name,
        value: formatValue(variant.value),
        difference: Math.abs(center - targetValue),
      });
    }
  }

  return matches
    .sort(
      (firstMatch, secondMatch) =>
        firstMatch.difference -
        secondMatch.difference,
    )
    .slice(0, 5);
}

function createNichResponse(question: string) {
  const normalizedQuestion = normalizeText(question);

  if (!normalizedQuestion) {
    return "Ask me about a pet value, trades, or how to use CSBT HUB. 🐾";
  }

  if (
    normalizedQuestion === "hi" ||
    normalizedQuestion === "hello" ||
    normalizedQuestion === "hey" ||
    normalizedQuestion.startsWith("hi nich")
  ) {
    return "Hey! 👋 I’m Nich, your CSBT trading buddy. Ask me about a pet value or how to use the trade calculator.";
  }

  if (
    normalizedQuestion.includes("thank") ||
    normalizedQuestion === "thanks"
  ) {
    return "Anytime! 😄 Good luck with your trades.";
  }

  if (
    normalizedQuestion.includes("calculator") ||
    normalizedQuestion.includes("how to trade")
  ) {
    return [
      "Here’s how to use the Trade Calculator:",
      "",
      "1. Add the pets you are offering under Your Offer.",
      "2. Add the pets you are receiving under Their Offer.",
      "3. Choose Normal, Neon, or Mega for each pet.",
      "4. Compare both totals and check the Win, Fair, or Lose result.",
      "",
      "Always double-check values before completing a trade. 🐾",
    ].join("\n");
  }

  const requestedNumber =
    normalizedQuestion.match(
      /(?:around|near|about|value|worth|under|over)\s+(\d+(?:\.\d+)?)/,
    )?.[1];

  if (
    requestedNumber &&
    (normalizedQuestion.includes("pet") ||
      normalizedQuestion.includes("around") ||
      normalizedQuestion.includes("near"))
  ) {
    const targetValue = Number(requestedNumber);
    const nearbyPets = getNearbyPets(targetValue);

    if (nearbyPets.length > 0) {
      return [
        `Here are some pets close to ${targetValue} value:`,
        "",
        ...nearbyPets.map(
          (match) =>
            `🐾 ${match.name} (${match.variant}) — ${match.value}`,
        ),
        "",
        "Values can change, so verify them before trading.",
      ].join("\n");
    }
  }

  const matchingPet = findPetInQuestion(question);

  if (matchingPet) {
    return [
      `🐾 ${matchingPet.PETS}`,
      "",
      `Normal: ${formatValue(matchingPet.NORMAL)}`,
      `Neon: ${formatValue(matchingPet.NEON)}`,
      `Mega: ${formatValue(matchingPet.MEGA)}`,
      "",
      "These are the current CSBT values in the database.",
    ].join("\n");
  }

  if (
    normalizedQuestion.includes("what can you do") ||
    normalizedQuestion.includes("help me")
  ) {
    return [
      "I can help you with:",
      "",
      "🐾 Pet values",
      "🔎 Finding pets near a certain value",
      "⚖️ Using the Trade Calculator",
      "📖 Navigating CSBT HUB",
      "",
      "Try asking: “What is Frost Dragon worth?”",
    ].join("\n");
  }

  return "I’m focused on CSBT HUB and Adopt Me trading. Try asking for a pet’s value, pets around a certain value, or help using the calculator. 🐾";
}

function createMessageId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export default function NichChat({
  open,
  onClose,
}: NichChatProps) {
  const shouldReduceMotion = useReducedMotion();

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [messages, setMessages] = useState<
    ChatMessage[]
  >([
    {
      id: "nich-welcome",
      sender: "nich",
      text: "Hey! I’m Nich 👋\n\nAsk me about Adopt Me pet values, trades, or how to use CSBT HUB.",
    },
  ]);

  const messagesEndRef =
    useRef<HTMLDivElement>(null);

  const visibleQuickQuestions = useMemo(() => {
    return messages.length <= 1
      ? quickQuestions
      : quickQuestions.slice(0, 2);
  }, [messages.length]);

  useEffect(() => {
    if (!open) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: shouldReduceMotion
        ? "auto"
        : "smooth",
    });
  }, [
    messages,
    isTyping,
    open,
    shouldReduceMotion,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [open, onClose]);

  function sendMessage(messageText: string) {
    const trimmedMessage = messageText.trim();

    if (!trimmedMessage || isTyping) {
      return;
    }

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

    window.setTimeout(
      () => {
        const response =
          createNichResponse(trimmedMessage);

        const nichMessage: ChatMessage = {
          id: createMessageId(),
          sender: "nich",
          text: response,
        };

        setMessages((currentMessages) => [
          ...currentMessages,
          nichMessage,
        ]);

        setIsTyping(false);
      },
      shouldReduceMotion ? 0 : 650,
    );
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    sendMessage(input);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          role="dialog"
          aria-modal="false"
          aria-label="Ask Nich"
          initial={{
            opacity: 0,
            y: 24,
            scale: 0.94,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          exit={{
            opacity: 0,
            y: 18,
            scale: 0.96,
          }}
          transition={{
            duration: shouldReduceMotion
              ? 0
              : 0.3,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="
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
          "
        >
          {/* Header */}
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
                <div className="flex items-center gap-2">
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
                  Online · Your trading buddy
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close Ask Nich"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70 text-lg font-black text-gray-900 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gradient-to-b from-white via-yellow-50/30 to-orange-50/30 px-3 py-4 sm:px-4">
            <div className="space-y-4">
              {messages.map((message) => {
                const isNich =
                  message.sender === "nich";

                return (
                  <motion.div
                    key={message.id}
                    initial={{
                      opacity: 0,
                      y: 10,
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
                          ? "rounded-bl-md border border-gray-100 bg-white font-medium text-gray-700"
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
                    y: 8,
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

                  <div className="flex items-center gap-1.5 rounded-[20px] rounded-bl-md border border-gray-100 bg-white px-4 py-3 shadow-sm">
                    {[0, 1, 2].map((dot) => (
                      <motion.span
                        key={dot}
                        animate={
                          shouldReduceMotion
                            ? undefined
                            : {
                                y: [0, -4, 0],
                                opacity: [
                                  0.4, 1, 0.4,
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

          {/* Quick questions */}
          <div className="shrink-0 border-t border-gray-100 bg-white/90 px-3 pt-3 sm:px-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {visibleQuickQuestions.map(
                (question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() =>
                      sendMessage(question)
                    }
                    disabled={isTyping}
                    className="shrink-0 rounded-full border border-yellow-200 bg-yellow-50 px-3 py-2 text-[11px] font-bold text-amber-800 transition hover:border-yellow-300 hover:bg-yellow-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {question}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="shrink-0 bg-white px-3 pb-3 pt-2 sm:px-4 sm:pb-4"
          >
            <div className="flex items-end gap-2 rounded-[22px] border border-gray-200 bg-gray-50 p-2 shadow-inner focus-within:border-yellow-300 focus-within:ring-4 focus-within:ring-yellow-100">
              <textarea
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

                    if (input.trim()) {
                      sendMessage(input);
                    }
                  }
                }}
                placeholder="Ask Nich about CSBT..."
                rows={1}
                maxLength={300}
                className="max-h-24 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm font-medium text-gray-800 outline-none placeholder:text-gray-400"
              />

              <button
                type="submit"
                disabled={
                  !input.trim() || isTyping
                }
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