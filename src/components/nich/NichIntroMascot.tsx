"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import NichMascot, {
  type NichMascotPose,
} from "./NichMascot";

type NichIntroMascotProps = {
  open: boolean;
  onComplete: () => void;
};

type IntroStep =
  | "entering"
  | "greeting"
  | "introducing"
  | "pointing"
  | "leaving";

const introContent: Record<
  Exclude<IntroStep, "entering" | "leaving">,
  {
    eyebrow: string;
    title: string;
    description: string;
  }
> = {
  greeting: {
    eyebrow: "Welcome to CSBT HUB",
    title: "Hi! I’m Nich 😛",
    description:
      "I’m your trading buddy and the official mascot of CSBT HUB.",
  },
  introducing: {
    eyebrow: "Here to help",
    title: "Need pet values?",
    description:
      "I can help you search for pets, understand values, and check your trades.",
  },
  pointing: {
    eyebrow: "You can find me anytime",
    title: "I’ll be right over there!",
    description:
      "Look for me in the bottom-right corner whenever you need help.",
  },
};

function getPose(step: IntroStep): NichMascotPose {
  if (step === "entering" || step === "leaving") {
    return "walk";
  }

  if (step === "greeting") {
    return "wave";
  }

  if (step === "pointing") {
    return "point";
  }

  return "idle";
}

export default function NichIntroMascot({
  open,
  onComplete,
}: NichIntroMascotProps) {
  const shouldReduceMotion = useReducedMotion();

  const [step, setStep] = useState<IntroStep>("entering");
  const [isReady, setIsReady] = useState(false);

  const timersRef = useRef<number[]>([]);
  const completedRef = useRef(false);

  function clearTimers() {
    timersRef.current.forEach((timer) => {
      window.clearTimeout(timer);
    });

    timersRef.current = [];
  }

  function schedule(callback: () => void, delay: number) {
    const timer = window.setTimeout(callback, delay);
    timersRef.current.push(timer);
  }

  function finishIntro() {
    if (completedRef.current) {
      return;
    }

    completedRef.current = true;
    clearTimers();
    setStep("leaving");

    schedule(
      () => {
        onComplete();
      },
      shouldReduceMotion ? 0 : 1100,
    );
  }

  useEffect(() => {
    if (!open) {
      clearTimers();
      completedRef.current = false;
      setStep("entering");
      setIsReady(false);
      return;
    }

    completedRef.current = false;
    setStep("entering");
    setIsReady(true);
    clearTimers();

    if (shouldReduceMotion) {
      setStep("greeting");
      return;
    }

    schedule(() => {
      setStep("greeting");
    }, 1300);

    schedule(() => {
      setStep("introducing");
    }, 4500);

    schedule(() => {
      setStep("pointing");
    }, 7900);

    schedule(() => {
      finishIntro();
    }, 11200);

    return clearTimers;
  }, [open, shouldReduceMotion]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!open) {
        return;
      }

      if (event.key === "Escape") {
        finishIntro();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, shouldReduceMotion]);

  if (!isReady) {
    return null;
  }

  const visibleContent =
    step === "greeting" ||
    step === "introducing" ||
    step === "pointing"
      ? introContent[step]
      : null;

  const mascotPose = getPose(step);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Meet Nich"
          initial={{ opacity: 0 }}
          animate={{
            opacity: step === "leaving" ? 0 : 1,
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.4,
          }}
          className="
            fixed
            inset-0
            z-[120]
            overflow-hidden
            bg-slate-950/50
            backdrop-blur-sm
          "
        >
          <div
            className="
              pointer-events-none
              absolute
              inset-0
              bg-[radial-gradient(circle_at_center,rgba(255,255,255,.16),transparent_58%)]
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              bottom-0
              left-0
              right-0
              h-[35%]
              bg-gradient-to-t
              from-slate-950/35
              to-transparent
            "
          />

          <motion.div
            initial={{
              x: shouldReduceMotion ? 0 : "-48vw",
              opacity: shouldReduceMotion ? 1 : 0,
            }}
            animate={
              step === "leaving"
                ? {
                    x: "44vw",
                    y: "35vh",
                    opacity: 0,
                    scale: 0.18,
                  }
                : step === "entering"
                  ? {
                      x: "-12vw",
                      y: 0,
                      opacity: 1,
                      scale: 1,
                    }
                  : {
                      x: 0,
                      y: 0,
                      opacity: 1,
                      scale: 1,
                    }
            }
            transition={{
              duration: shouldReduceMotion
                ? 0
                : step === "leaving"
                  ? 1.05
                  : step === "entering"
                    ? 1.3
                    : 0.65,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="
              absolute
              bottom-[8vh]
              left-1/2
              z-20
              -translate-x-1/2
              sm:bottom-[6vh]
            "
          >
            <div className="flex items-end gap-4 sm:gap-8">
              <div className="relative">
                <NichMascot
                  pose={mascotPose}
                  size={190}
                  className="sm:hidden"
                />

                <NichMascot
                  pose={mascotPose}
                  size={270}
                  className="hidden sm:block"
                />

                <AnimatePresence>
                  {step === "entering" && !shouldReduceMotion && (
                    <>
                      <motion.span
                        initial={{
                          opacity: 0,
                          scale: 0.6,
                        }}
                        animate={{
                          opacity: [0, 0.7, 0],
                          scale: [0.6, 1, 1.2],
                          x: [-10, -38, -65],
                        }}
                        exit={{ opacity: 0 }}
                        transition={{
                          duration: 0.9,
                          repeat: Infinity,
                          ease: "easeOut",
                        }}
                        className="
                          absolute
                          bottom-3
                          left-10
                          h-3
                          w-10
                          rounded-full
                          bg-yellow-300/70
                          blur-sm
                        "
                      />

                      <motion.span
                        initial={{
                          opacity: 0,
                          scale: 0.6,
                        }}
                        animate={{
                          opacity: [0, 0.65, 0],
                          scale: [0.6, 1, 1.2],
                          x: [-8, -30, -55],
                        }}
                        exit={{ opacity: 0 }}
                        transition={{
                          duration: 0.9,
                          delay: 0.45,
                          repeat: Infinity,
                          ease: "easeOut",
                        }}
                        className="
                          absolute
                          bottom-7
                          left-20
                          h-3
                          w-9
                          rounded-full
                          bg-orange-300/65
                          blur-sm
                        "
                      />
                    </>
                  )}
                </AnimatePresence>
              </div>

              <AnimatePresence mode="wait">
                {visibleContent && (
                  <motion.div
                    key={step}
                    initial={{
                      opacity: 0,
                      x: -18,
                      y: 12,
                      scale: 0.95,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                      y: 0,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      x: 10,
                      y: -8,
                      scale: 0.97,
                    }}
                    transition={{
                      duration: shouldReduceMotion ? 0 : 0.4,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="
                      relative
                      mb-16
                      hidden
                      w-[360px]
                      rounded-[28px]
                      border
                      border-white/80
                      bg-white/95
                      p-6
                      shadow-[0_28px_70px_rgba(15,23,42,.35)]
                      backdrop-blur-xl
                      sm:block
                    "
                  >
                    <span
                      aria-hidden="true"
                      className="
                        absolute
                        -left-4
                        bottom-12
                        h-8
                        w-8
                        rotate-45
                        border-b
                        border-l
                        border-white/80
                        bg-white
                      "
                    />

                    <p
                      className="
                        text-xs
                        font-black
                        uppercase
                        tracking-[0.18em]
                        text-amber-500
                      "
                    >
                      {visibleContent.eyebrow}
                    </p>

                    <h2
                      className="
                        mt-2
                        text-3xl
                        font-black
                        tracking-tight
                        text-slate-950
                      "
                    >
                      {visibleContent.title}
                    </h2>

                    <p
                      className="
                        mt-3
                        text-sm
                        font-semibold
                        leading-6
                        text-slate-600
                      "
                    >
                      {visibleContent.description}
                    </p>

                    <div className="mt-5 flex items-center gap-2">
                      {(
                        [
                          "greeting",
                          "introducing",
                          "pointing",
                        ] as const
                      ).map((item) => (
                        <span
                          key={item}
                          className={`
                            h-2.5
                            rounded-full
                            transition-all
                            duration-300
                            ${
                              step === item
                                ? "w-8 bg-yellow-400"
                                : "w-2.5 bg-slate-200"
                            }
                          `}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {visibleContent && (
              <motion.div
                key={`mobile-${step}`}
                initial={{
                  opacity: 0,
                  y: 20,
                  scale: 0.96,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  y: -10,
                  scale: 0.98,
                }}
                transition={{
                  duration: shouldReduceMotion ? 0 : 0.35,
                }}
                className="
                  absolute
                  left-4
                  right-4
                  top-6
                  z-30
                  rounded-3xl
                  border
                  border-white/80
                  bg-white/95
                  px-5
                  py-4
                  text-center
                  shadow-[0_20px_60px_rgba(15,23,42,.35)]
                  backdrop-blur-xl
                  sm:hidden
                "
              >
                <p
                  className="
                    text-[10px]
                    font-black
                    uppercase
                    tracking-[0.17em]
                    text-amber-500
                  "
                >
                  {visibleContent.eyebrow}
                </p>

                <h2
                  className="
                    mt-1
                    text-2xl
                    font-black
                    tracking-tight
                    text-slate-950
                  "
                >
                  {visibleContent.title}
                </h2>

                <p
                  className="
                    mt-2
                    text-xs
                    font-semibold
                    leading-5
                    text-slate-600
                  "
                >
                  {visibleContent.description}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {shouldReduceMotion && (
            <div
              className="
                absolute
                bottom-5
                left-4
                right-4
                z-40
                flex
                justify-center
              "
            >
              <button
                type="button"
                onClick={finishIntro}
                className="
                  rounded-2xl
                  bg-gradient-to-r
                  from-yellow-400
                  to-orange-500
                  px-7
                  py-3
                  text-sm
                  font-black
                  text-white
                  shadow-lg
                  outline-none
                  focus-visible:ring-4
                  focus-visible:ring-yellow-300/60
                "
              >
                Let’s go
              </button>
            </div>
          )}

          {!shouldReduceMotion && (
            <button
              type="button"
              onClick={finishIntro}
              className="
                absolute
                right-4
                top-4
                z-40
                rounded-full
                border
                border-white/25
                bg-slate-950/35
                px-4
                py-2
                text-xs
                font-black
                text-white
                backdrop-blur-md
                transition
                hover:bg-slate-950/55
                focus-visible:outline-none
                focus-visible:ring-4
                focus-visible:ring-white/30
                sm:right-6
                sm:top-6
              "
            >
              Skip intro
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}