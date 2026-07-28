"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type NichSpeechBubbleProps = {
  open: boolean;
  message: string;
  eyebrow?: string;
  position?: "left" | "right" | "top";
  className?: string;
};

export default function NichSpeechBubble({
  open,
  message,
  eyebrow,
  position = "left",
  className = "",
}: NichSpeechBubbleProps) {
  const shouldReduceMotion = useReducedMotion();

  const arrowClasses = {
    left: `
      -left-3
      bottom-7
      border-b
      border-l
    `,
    right: `
      -right-3
      bottom-7
      border-r
      border-t
    `,
    top: `
      -top-3
      left-1/2
      -translate-x-1/2
      border-l
      border-t
    `,
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={
            shouldReduceMotion
              ? false
              : {
                  opacity: 0,
                  scale: 0.9,
                  y: 8,
                }
          }
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
          }}
          exit={
            shouldReduceMotion
              ? {
                  opacity: 0,
                }
              : {
                  opacity: 0,
                  scale: 0.94,
                  y: 5,
                }
          }
          transition={{
            duration: shouldReduceMotion ? 0 : 0.25,
            ease: [0.22, 1, 0.36, 1],
          }}
          className={`
            pointer-events-none
            relative
            max-w-[240px]
            rounded-2xl
            border
            border-white/80
            bg-white/95
            px-4
            py-3
            text-left
            shadow-[0_16px_45px_rgba(15,23,42,.22)]
            backdrop-blur-xl
            ${className}
          `}
        >
          <span
            aria-hidden="true"
            className={`
              absolute
              h-6
              w-6
              rotate-45
              border-white/80
              bg-white
              ${arrowClasses[position]}
            `}
          />

          {eyebrow && (
            <p className="relative z-10 text-[10px] font-black uppercase tracking-[0.16em] text-amber-500">
              {eyebrow}
            </p>
          )}

          <p
            className={`
              relative
              z-10
              font-black
              leading-snug
              text-slate-950
              ${eyebrow ? "mt-1 text-sm" : "text-sm"}
            `}
          >
            {message}
          </p>

          <motion.span
            aria-hidden="true"
            animate={
              shouldReduceMotion
                ? undefined
                : {
                    scale: [1, 1.25, 1],
                    opacity: [0.45, 1, 0.45],
                  }
            }
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute right-3 top-3 h-2 w-2 rounded-full bg-yellow-400"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}