"use client";

import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { useState } from "react";

type NichIntroProps = {
  open: boolean;
  onComplete: () => void;
};

export default function NichIntro({
  open,
  onComplete,
}: NichIntroProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isLeaving, setIsLeaving] = useState(false);

  function handleComplete() {
    if (isLeaving) {
      return;
    }

    setIsLeaving(true);

    window.setTimeout(
      () => {
        onComplete();
        setIsLeaving(false);
      },
      shouldReduceMotion ? 0 : 900,
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: isLeaving ? 0 : 1,
          }}
          exit={{
            opacity: 0,
          }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.35,
          }}
          className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-slate-950/45 px-4 py-6 backdrop-blur-md"
        >
          <motion.div
            initial={{
              opacity: 0,
              y: 35,
              scale: 0.9,
            }}
            animate={
              isLeaving
                ? {
                    opacity: 0,
                    x: "42vw",
                    y: "42vh",
                    scale: 0.18,
                  }
                : {
                    opacity: 1,
                    x: 0,
                    y: 0,
                    scale: 1,
                  }
            }
            transition={{
              duration: shouldReduceMotion
                ? 0
                : isLeaving
                  ? 0.85
                  : 0.55,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative w-full max-w-md overflow-hidden rounded-[34px] border border-white/80 bg-white shadow-[0_35px_100px_rgba(15,23,42,.45)]"
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-yellow-300 via-amber-300 to-orange-300 px-6 pb-8 pt-7 text-center">
              <div className="pointer-events-none absolute -left-12 -top-12 h-40 w-40 rounded-full bg-white/35 blur-3xl" />

              <div className="pointer-events-none absolute -bottom-16 -right-10 h-44 w-44 rounded-full bg-orange-500/25 blur-3xl" />

              <motion.div
                animate={
                  shouldReduceMotion || isLeaving
                    ? undefined
                    : {
                        y: [0, -7, 0],
                        rotate: [0, -2, 2, 0],
                      }
                }
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative mx-auto h-36 w-36"
              >
                <div className="absolute inset-0 rounded-full bg-white/35 blur-2xl" />

                <div className="relative h-full w-full overflow-hidden rounded-full border-4 border-white bg-yellow-50 shadow-[0_18px_45px_rgba(120,53,15,.3)]">
                  <Image
                    src="/nich/nich-face.png"
                    alt="Nich"
                    fill
                    priority
                    unoptimized
                    className="object-cover object-[38%_8%]"
                    sizes="144px"
                  />
                </div>

                <motion.div
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : {
                          rotate: [0, 14, -8, 14, 0],
                        }
                  }
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    repeatDelay: 2.5,
                    ease: "easeInOut",
                  }}
                  className="absolute -right-5 top-5 text-5xl drop-shadow-lg"
                >
                  👋
                </motion.div>
              </motion.div>

              <motion.div
                initial={{
                  opacity: 0,
                  y: 12,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: shouldReduceMotion ? 0 : 0.2,
                  duration: shouldReduceMotion ? 0 : 0.4,
                }}
                className="relative mt-5"
              >
                <p className="text-sm font-black uppercase tracking-[0.22em] text-amber-900/70">
                  Welcome to CSBT HUB
                </p>

                <h1 className="mt-2 text-4xl font-black tracking-tight text-gray-950">
                  Hi, I&apos;m Nich!
                </h1>

                <p className="mt-3 text-sm font-semibold leading-relaxed text-gray-800 sm:text-base">
                  Your trading buddy for pet values, trade help, and finding
                  your way around the website.
                </p>
              </motion.div>
            </div>

            <div className="bg-white px-6 py-6">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-3 text-center">
                  <div className="text-2xl">🐾</div>
                  <p className="mt-1 text-[11px] font-black text-gray-800">
                    Pet values
                  </p>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-3 text-center">
                  <div className="text-2xl">⚖️</div>
                  <p className="mt-1 text-[11px] font-black text-gray-800">
                    Trade help
                  </p>
                </div>

                <div className="rounded-2xl border border-sky-100 bg-sky-50 p-3 text-center">
                  <div className="text-2xl">🔎</div>
                  <p className="mt-1 text-[11px] font-black text-gray-800">
                    Quick search
                  </p>
                </div>
              </div>

              <motion.button
                type="button"
                onClick={handleComplete}
                disabled={isLeaving}
                whileHover={
                  shouldReduceMotion
                    ? undefined
                    : {
                        y: -2,
                        scale: 1.01,
                      }
                }
                whileTap={{
                  scale: 0.97,
                }}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 px-5 py-4 text-base font-black text-white shadow-[0_14px_35px_rgba(249,115,22,.3)] outline-none transition disabled:cursor-wait focus-visible:ring-4 focus-visible:ring-yellow-300/50"
              >
                {isLeaving ? "See you in the corner!" : "Let’s Go!"}

                <span aria-hidden="true">→</span>
              </motion.button>

              <p className="mt-3 text-center text-[10px] font-semibold text-gray-400">
                You&apos;ll find Nich in the bottom-right corner.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}