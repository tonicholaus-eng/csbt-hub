"use client";

import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import useNich from "./useNich";

type NichButtonProps = {
  open: boolean;
  onClick: () => void;
  onDismiss: () => void;
};

const helperMessages = [
  "Need help?",
  "Ask me anything!",
  "Checking a trade?",
  "Looking for values?",
];

export default function NichButton({
  open,
  onClick,
  onDismiss,
}: NichButtonProps) {
  const shouldReduceMotion = useReducedMotion();

  const { reaction, reactionKey, isReacting } = useNich();

  const [messageIndex, setMessageIndex] = useState(0);
  const [showHelperBubble, setShowHelperBubble] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);

  const hideTimerRef = useRef<number | null>(null);

  const visibleMessage = isReacting
    ? reaction.message
    : helperMessages[messageIndex];

  const visibleEyebrow = isReacting
    ? reaction.eyebrow
    : undefined;

  const showBubble =
    !open && (isReacting || showHelperBubble);

  const mascotAnimation = useMemo(() => {
    if (shouldReduceMotion) {
      return undefined;
    }

    switch (reaction.pose) {
      case "wave":
        return {
          rotate: [0, -7, 7, -5, 5, 0],
          y: [0, -4, 0, -3, 0],
          scale: [1, 1.04, 1, 1.03, 1],
        };

      case "point":
        return {
          rotate: [0, -5, 0],
          x: [0, -4, 0],
          y: [0, -2, 0],
        };

      case "celebrate":
        return {
          rotate: [0, -8, 8, -6, 6, 0],
          y: [0, -8, 0, -6, 0],
          scale: [1, 1.08, 1, 1.05, 1],
        };

      case "walk":
        return {
          rotate: [-4, 4, -4],
          x: [-3, 3, -3],
          y: [0, -3, 0],
        };

      case "idle":
      default:
        return open
          ? undefined
          : {
              rotate: [0, 0, -4, 4, 0],
              y: [0, 0, -2, 0],
            };
    }
  }, [open, reaction.pose, shouldReduceMotion]);

  const mascotTransition = useMemo(() => {
    if (reaction.pose === "celebrate") {
      return {
        duration: 0.75,
        repeat: Infinity,
        ease: "easeInOut" as const,
      };
    }

    if (reaction.pose === "wave") {
      return {
        duration: 1.1,
        repeat: Infinity,
        repeatDelay: 0.35,
        ease: "easeInOut" as const,
      };
    }

    if (reaction.pose === "point") {
      return {
        duration: 1.1,
        repeat: Infinity,
        ease: "easeInOut" as const,
      };
    }

    if (reaction.pose === "walk") {
      return {
        duration: 0.55,
        repeat: Infinity,
        ease: "easeInOut" as const,
      };
    }

    return {
      duration: 1.1,
      repeat: Infinity,
      repeatDelay: 5,
      ease: "easeInOut" as const,
    };
  }, [reaction.pose]);

  useEffect(() => {
    function clearHideTimer() {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    }

    clearHideTimer();

    if (open || isReacting) {
      return clearHideTimer;
    }

    function showNextBubble() {
      setShowHelperBubble(true);

      hideTimerRef.current = window.setTimeout(() => {
        setShowHelperBubble(false);

        setMessageIndex((currentIndex) => {
          return (currentIndex + 1) % helperMessages.length;
        });
      }, 4000);
    }

    const bubbleCycle = window.setInterval(
      showNextBubble,
      14000,
    );

    return () => {
      window.clearInterval(bubbleCycle);
      clearHideTimer();
    };
  }, [open, isReacting]);

  return (
    <div className="fixed bottom-20 right-3 z-[80] flex items-end gap-2 sm:bottom-6 sm:right-6 sm:gap-3">
      <motion.button
        type="button"
        onClick={onDismiss}
        aria-label="Hide Nich assistant"
        title="Hide Nich"
        initial={{ opacity: 0, scale: 0.75, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        whileHover={shouldReduceMotion ? undefined : { scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        transition={{
          duration: shouldReduceMotion ? 0 : 0.22,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="absolute -top-9 right-0 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/40 bg-slate-950/90 text-white shadow-lg backdrop-blur-md outline-none transition-colors hover:bg-red-500 focus-visible:ring-4 focus-visible:ring-yellow-300/60 sm:-top-10 sm:h-8 sm:w-8"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </motion.button>

      <AnimatePresence mode="wait">
        {showBubble && (
          <motion.button
            key={
              isReacting
                ? reactionKey
                : `helper-${messageIndex}`
            }
            type="button"
            onClick={onClick}
            initial={{
              opacity: 0,
              x: 12,
              y: 8,
              scale: 0.92,
            }}
            animate={{
              opacity: 1,
              x: 0,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              x: 8,
              y: 4,
              scale: 0.95,
            }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.3,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="
              relative
              mb-3
              max-w-[205px]
              rounded-2xl
              border
              border-yellow-200/80
              bg-white/95
              px-4
              py-3
              text-left
              shadow-[0_14px_35px_rgba(15,23,42,.18)]
              backdrop-blur-xl
              outline-none
              transition
              hover:-translate-y-0.5
              hover:shadow-[0_18px_40px_rgba(245,158,11,.25)]
              focus-visible:ring-4
              focus-visible:ring-yellow-300/50
            "
          >
            {visibleEyebrow && (
              <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-amber-500">
                {visibleEyebrow}
              </span>
            )}

            <span className="block text-xs font-black text-gray-900 sm:text-sm">
              {visibleMessage}
            </span>

            <span className="mt-1 block text-[10px] font-semibold text-gray-400 sm:text-xs">
              {isReacting
                ? "Nich is reacting"
                : "Tap to ask Nich"}
            </span>

            <span
              aria-hidden="true"
              className="absolute -right-2 bottom-4 h-4 w-4 rotate-45 border-r border-t border-yellow-200/80 bg-white"
            />
          </motion.button>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={onClick}
        aria-label={open ? "Close Ask Nich" : "Open Ask Nich"}
        aria-expanded={open}
        initial={{
          opacity: 0,
          scale: 0.75,
          y: 20,
        }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
        }}
        transition={{
          duration: shouldReduceMotion ? 0 : 0.5,
          ease: [0.22, 1, 0.36, 1],
        }}
        whileHover={
          shouldReduceMotion
            ? undefined
            : {
                y: -5,
                scale: 1.05,
              }
        }
        whileTap={{
          scale: 0.94,
        }}
        className="
          group
          relative
          flex
          h-[72px]
          w-[72px]
          items-center
          justify-center
          rounded-full
          border-2
          border-yellow-300
          bg-gradient-to-br
          from-yellow-100
          via-white
          to-orange-100
          shadow-[0_16px_45px_rgba(15,23,42,.3)]
          outline-none
          transition-shadow
          hover:shadow-[0_20px_55px_rgba(245,158,11,.4)]
          focus-visible:ring-4
          focus-visible:ring-yellow-300/60
          sm:h-20
          sm:w-20
        "
      >
        <motion.span
          aria-hidden="true"
          animate={
            shouldReduceMotion
              ? undefined
              : isReacting
                ? {
                    opacity: [0.35, 0.9, 0.35],
                    scale: [0.9, 1.22, 0.9],
                  }
                : {
                    opacity: [0.3, 0.75, 0.3],
                    scale: [0.9, 1.14, 0.9],
                  }
          }
          transition={{
            duration: isReacting ? 1.1 : 2.6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute -inset-2 -z-10 rounded-full bg-yellow-400/35 blur-xl"
        />

        <motion.div
          key={reactionKey}
          animate={mascotAnimation}
          transition={mascotTransition}
          className="relative h-full w-full overflow-hidden rounded-full bg-yellow-50"
        >
          {!imageFailed ? (
            <Image
              src="/nich/nich-face.png"
              alt="Nich"
              fill
              priority
              unoptimized
              onError={() => setImageFailed(true)}
              className="object-cover object-[38%_8%] transition-transform duration-300 group-hover:scale-105"
              sizes="80px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl">
              👋
            </div>
          )}
        </motion.div>

        <AnimatePresence>
          {reaction.pose === "celebrate" && (
            <motion.span
              aria-hidden="true"
              initial={{
                opacity: 0,
                scale: 0.5,
                y: 8,
              }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1.1, 1, 1.25],
                y: [8, -12, -18, -28],
                rotate: [0, -8, 8, 0],
              }}
              exit={{
                opacity: 0,
                scale: 0.5,
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
              }}
              className="pointer-events-none absolute -left-3 -top-4 text-2xl"
            >
              ✨
            </motion.span>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {reaction.pose === "wave" && (
            <motion.span
              aria-hidden="true"
              initial={{
                opacity: 0,
                scale: 0.5,
              }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1, 0.9, 1.15],
                rotate: [-15, 10, -8, 12],
              }}
              exit={{
                opacity: 0,
              }}
              transition={{
                duration: 1.1,
                repeat: Infinity,
                repeatDelay: 0.4,
              }}
              className="pointer-events-none absolute -left-4 top-0 text-2xl"
            >
              👋
            </motion.span>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {reaction.pose === "point" && (
            <motion.span
              aria-hidden="true"
              initial={{
                opacity: 0,
                x: -6,
              }}
              animate={{
                opacity: [0.4, 1, 0.4],
                x: [-6, -12, -6],
              }}
              exit={{
                opacity: 0,
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
              }}
              className="pointer-events-none absolute -left-6 top-1/2 -translate-y-1/2 text-xl"
            >
              👈
            </motion.span>
          )}
        </AnimatePresence>

        <span className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-[3px] border-white bg-green-400 shadow-sm sm:h-[18px] sm:w-[18px]" />

        <motion.span
          aria-hidden="true"
          animate={{
            rotate: open ? 45 : 0,
            scale: open ? 1 : 0,
          }}
          transition={{
            duration: 0.2,
          }}
          className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gray-950 text-base font-black text-white shadow-lg"
        >
          +
        </motion.span>
      </motion.button>
    </div>
  );
}