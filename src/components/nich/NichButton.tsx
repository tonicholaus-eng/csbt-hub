"use client";

import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";

type NichButtonProps = {
  open: boolean;
  onClick: () => void;
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
}: NichButtonProps) {
  const shouldReduceMotion = useReducedMotion();

  const [messageIndex, setMessageIndex] = useState(0);
  const [showBubble, setShowBubble] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);

  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    function clearHideTimer() {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    }

    clearHideTimer();

    if (open) {
      setShowBubble(false);
      return clearHideTimer;
    }

    function showNextBubble() {
      setShowBubble(true);

      hideTimerRef.current = window.setTimeout(() => {
        setShowBubble(false);

        setMessageIndex((currentIndex) => {
          return (currentIndex + 1) % helperMessages.length;
        });
      }, 4000);
    }

    const bubbleCycle = window.setInterval(showNextBubble, 14000);

    return () => {
      window.clearInterval(bubbleCycle);
      clearHideTimer();
    };
  }, [open]);

  return (
    <div className="fixed bottom-4 right-4 z-[90] flex items-end gap-2 sm:bottom-6 sm:right-6 sm:gap-3">
      <AnimatePresence>
        {!open && showBubble && (
          <motion.button
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
              max-w-[180px]
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
            <span className="block text-xs font-black text-gray-900 sm:text-sm">
              {helperMessages[messageIndex]}
            </span>

            <span className="mt-1 block text-[10px] font-semibold text-gray-400 sm:text-xs">
              Tap to ask Nich
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
              : {
                  opacity: [0.3, 0.75, 0.3],
                  scale: [0.9, 1.14, 0.9],
                }
          }
          transition={{
            duration: 2.6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute -inset-2 -z-10 rounded-full bg-yellow-400/35 blur-xl"
        />

        <motion.div
          animate={
            shouldReduceMotion || open
              ? undefined
              : {
                  rotate: [0, 0, -4, 4, 0],
                  y: [0, 0, -2, 0],
                }
          }
          transition={{
            duration: 1.1,
            repeat: Infinity,
            repeatDelay: 5,
            ease: "easeInOut",
          }}
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