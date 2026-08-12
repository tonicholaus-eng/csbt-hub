"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

type NichIntroMascotProps = {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onDontShowAgain: () => void;
};

type TourStep = {
  eyebrow: string;
  title: string;
  description: string;
  target?: string;
};

type HighlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const desktopSteps: TourStep[] = [
  {
    eyebrow: "Welcome to CSBT HUB",
    title: "Let me show you around.",
    description:
      "This quick tour works like an in-game tutorial: the screen dims while each important feature is highlighted and explained one by one.",
  },
  {
    eyebrow: "Sidebar",
    title: "Your main navigation lives here.",
    description:
      "On PC, the left sidebar is your control center. It keeps core tools, community features, and your account pages easy to reach.",
    target: "sidebar-container",
  },
  {
    eyebrow: "Values",
    title: "Check GCash and Elve Shark values.",
    description:
      "Search pets and items, compare both value systems, and open full item pages with value history, alerts, wishlist, and inventory actions.",
    target: "nav-values",
  },
  {
    eyebrow: "CSBT Exchange",
    title: "Find trades that actually fit you.",
    description:
      "Exchange uses your inventory, wishlist, values, demand, and trading style to rank matches, build offers, negotiate counteroffers, and open locked Trade Rooms.",
    target: "nav-exchange",
  },
  {
    eyebrow: "Calculator",
    title: "Compare both sides before you trade.",
    description:
      "Add each side of a trade, choose GCash or Elve Shark, and quickly see the totals and value difference before you decide.",
    target: "nav-calculator",
  },
  {
    eyebrow: "Inventory",
    title: "Track your whole inventory in one place.",
    description:
      "Add quantities and variants, calculate your estimated total value, see your highest-value items, and save the inventory to your profile.",
    target: "nav-inventory",
  },
  {
    eyebrow: "Community Trade Voting",
    title: "See what other traders think.",
    description:
      "Browse community trades and vote Win, Fair, or Lose. It is a simple way to learn values by seeing how other CSBT members judge offers.",
    target: "nav-trade-feed",
  },
  {
    eyebrow: "Ask Nich",
    title: "Need help? Nich is always nearby.",
    description:
      "Tap Nich anytime for value lookups, trade questions, nearby-value suggestions, or help finding your way around CSBT HUB.",
    target: "nich-button",
  },
];

const mobileSteps: TourStep[] = [
  {
    eyebrow: "Welcome to CSBT HUB",
    title: "Let me show you around.",
    description:
      "This quick mobile tour highlights the main controls one by one so you can learn the site without digging through every page first.",
  },
  {
    eyebrow: "Bottom Navigation",
    title: "Your main tools stay pinned here.",
    description:
      "The most-used features remain at the bottom of the screen, so you can move around CSBT HUB quickly with one thumb.",
    target: "mobile-dock",
  },
  {
    eyebrow: "Values",
    title: "Search GCash and Elve Shark values.",
    description:
      "Open Values to search pets and items, compare value sources, and view detailed item pages with history and personal actions.",
    target: "nav-values",
  },
  {
    eyebrow: "CSBT Exchange",
    title: "Your personalized trading market.",
    description:
      "Exchange finds inventory-aware matches, helps build offers, tracks counteroffers, and keeps accepted trades organized in secure Trade Rooms.",
    target: "nav-exchange",
  },
  {
    eyebrow: "Calculator",
    title: "Compare offers before you trade.",
    description:
      "Build both sides of a trade and see the difference instantly using your selected GCash or Elve Shark value source.",
    target: "nav-calculator",
  },
  {
    eyebrow: "Inventory",
    title: "Save and value your inventory.",
    description:
      "Track items, quantities, and variants, then let CSBT HUB calculate your estimated total inventory value for you.",
    target: "nav-inventory",
  },
  {
    eyebrow: "More",
    title: "More opens the rest of the hub.",
    description:
      "Use More for Demand, Profile, Wishlist, Notifications, Trade Voting, Feedback, Safe Trader Academy, Trading Servers, and other tools.",
    target: "nav-more",
  },
  {
    eyebrow: "Ask Nich",
    title: "Need help while browsing?",
    description:
      "Nich stays available in the corner for quick value questions, trade guidance, and help using the rest of the website.",
    target: "nich-button",
  },
];

function getVisibleTarget(selector: string) {
  const matches = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-tour="${selector}"]`),
  );

  return (
    matches.find((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0
      );
    }) ?? null
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getPointerDetails(rect: HighlightRect) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  if (centerY > viewportHeight * 0.68) {
    return {
      glyph: "↓",
      style: {
        left: centerX - 20,
        top: Math.max(10, rect.top - 52),
      },
      motionAxis: "y" as const,
    };
  }

  if (centerX < viewportWidth * 0.38) {
    return {
      glyph: "←",
      style: {
        left: Math.min(viewportWidth - 48, rect.left + rect.width + 14),
        top: centerY - 20,
      },
      motionAxis: "x" as const,
    };
  }

  if (centerX > viewportWidth * 0.62) {
    return {
      glyph: "→",
      style: {
        left: Math.max(8, rect.left - 52),
        top: centerY - 20,
      },
      motionAxis: "x" as const,
    };
  }

  return {
    glyph: "↓",
    style: {
      left: centerX - 20,
      top: Math.max(10, rect.top - 52),
    },
    motionAxis: "y" as const,
  };
}

export default function NichIntroMascot({
  open,
  onComplete,
  onSkip,
  onDontShowAgain,
}: NichIntroMascotProps) {
  const shouldReduceMotion = useReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false,
  );
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);

  useEffect(() => {
    const updateViewportMode = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);
    return () => window.removeEventListener("resize", updateViewportMode);
  }, []);

  const steps = useMemo(
    () => (isDesktop ? desktopSteps : mobileSteps),
    [isDesktop],
  );
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];

  useEffect(() => {
    if (!open) {
      setStepIndex(0);
      setHighlightRect(null);
      return;
    }

    setStepIndex(0);
  }, [open, isDesktop]);

  useEffect(() => {
    if (!open || !currentStep?.target) {
      setHighlightRect(null);
      return;
    }

    let frame = 0;
    let timeout = 0;

    const updateRect = () => {
      const target = getVisibleTarget(currentStep.target!);
      if (!target) {
        setHighlightRect(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      const padding = currentStep.target === "sidebar-container" ? 5 : 9;

      if (rect.top < 8 || rect.bottom > window.innerHeight - 8) {
        target.scrollIntoView({
          block: "center",
          inline: "center",
          behavior: shouldReduceMotion ? "auto" : "smooth",
        });
      }

      setHighlightRect({
        top: Math.max(5, rect.top - padding),
        left: Math.max(5, rect.left - padding),
        width: Math.min(window.innerWidth - 10, rect.width + padding * 2),
        height: Math.min(window.innerHeight - 10, rect.height + padding * 2),
      });
    };

    timeout = window.setTimeout(() => {
      updateRect();
      frame = window.requestAnimationFrame(updateRect);
    }, shouldReduceMotion ? 0 : 120);

    const handleViewportChange = () => updateRect();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.clearTimeout(timeout);
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [currentStep, open, shouldReduceMotion]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onSkip();
      }
      if (event.key === "ArrowRight") {
        setStepIndex((current) => Math.min(current + 1, steps.length - 1));
      }
      if (event.key === "ArrowLeft") {
        setStepIndex((current) => Math.max(current - 1, 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSkip, open, steps.length]);

  if (!open || !currentStep) {
    return null;
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const isLastStep = stepIndex === steps.length - 1;
  const cardWidth = Math.min(isDesktop ? 390 : 340, viewportWidth - 32);
  const estimatedCardHeight = 330;

  let tooltipStyle: {
    top?: number;
    left?: number;
    right?: number;
    bottom?: number;
    transform?: string;
  } = {
    left: 16,
    right: 16,
    bottom: 96,
  };

  if (highlightRect) {
    const centerX = highlightRect.left + highlightRect.width / 2;
    const centerY = highlightRect.top + highlightRect.height / 2;
    const spaceRight = viewportWidth - (highlightRect.left + highlightRect.width);
    const spaceLeft = highlightRect.left;
    const spaceBelow = viewportHeight - (highlightRect.top + highlightRect.height);
    const spaceAbove = highlightRect.top;

    if (spaceRight >= cardWidth + 28 && centerX < viewportWidth * 0.55) {
      tooltipStyle = {
        left: highlightRect.left + highlightRect.width + 22,
        top: clamp(centerY - estimatedCardHeight / 2, 16, viewportHeight - estimatedCardHeight - 16),
      };
    } else if (spaceLeft >= cardWidth + 28 && centerX > viewportWidth * 0.45) {
      tooltipStyle = {
        left: highlightRect.left - cardWidth - 22,
        top: clamp(centerY - estimatedCardHeight / 2, 16, viewportHeight - estimatedCardHeight - 16),
      };
    } else if (spaceAbove >= estimatedCardHeight + 24 || spaceBelow < estimatedCardHeight + 24) {
      tooltipStyle = {
        left: clamp(centerX - cardWidth / 2, 16, viewportWidth - cardWidth - 16),
        top: clamp(highlightRect.top - estimatedCardHeight - 18, 16, viewportHeight - estimatedCardHeight - 16),
      };
    } else {
      tooltipStyle = {
        left: clamp(centerX - cardWidth / 2, 16, viewportWidth - cardWidth - 16),
        top: clamp(highlightRect.top + highlightRect.height + 18, 16, viewportHeight - estimatedCardHeight - 16),
      };
    }
  } else {
    tooltipStyle = {
      left: viewportWidth / 2,
      top: viewportHeight / 2,
      transform: "translate(-50%, -50%)",
    };
  }

  const pointer = highlightRect ? getPointerDetails(highlightRect) : null;
  const spotlightSize = highlightRect
    ? clamp(Math.min(highlightRect.width, highlightRect.height) * 0.9, 66, 150)
    : 0;

  const goNext = () => {
    if (isLastStep) {
      onComplete();
      return;
    }

    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="CSBT HUB guided feature tour"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
        className="fixed inset-0 z-[120] overflow-hidden"
      >
        {!highlightRect ? (
          <div className="absolute inset-0 bg-slate-950/78 backdrop-blur-[3px]" />
        ) : (
          <>
            <div
              className="pointer-events-auto fixed left-0 top-0 bg-slate-950/78 backdrop-blur-[3px]"
              style={{ width: "100%", height: highlightRect.top }}
            />
            <div
              className="pointer-events-auto fixed left-0 bg-slate-950/78 backdrop-blur-[3px]"
              style={{
                top: highlightRect.top,
                width: highlightRect.left,
                height: highlightRect.height,
              }}
            />
            <div
              className="pointer-events-auto fixed right-0 bg-slate-950/78 backdrop-blur-[3px]"
              style={{
                top: highlightRect.top,
                left: highlightRect.left + highlightRect.width,
                height: highlightRect.height,
              }}
            />
            <div
              className="pointer-events-auto fixed bottom-0 left-0 bg-slate-950/78 backdrop-blur-[3px]"
              style={{
                top: highlightRect.top + highlightRect.height,
                width: "100%",
              }}
            />
          </>
        )}

        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(251,191,36,.07),transparent_42%)]" />

        {highlightRect && (
          <>
            <div
              aria-hidden="true"
              className="fixed z-[122] bg-transparent"
              style={{
                top: highlightRect.top,
                left: highlightRect.left,
                width: highlightRect.width,
                height: highlightRect.height,
              }}
            />

            <motion.div
              aria-hidden="true"
              layout
              transition={{ duration: shouldReduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-none fixed z-[123] rounded-[24px] border-2 border-amber-300 shadow-[0_0_34px_rgba(251,191,36,.55),inset_0_0_20px_rgba(251,191,36,.10)]"
              style={{
                top: highlightRect.top,
                left: highlightRect.left,
                width: highlightRect.width,
                height: highlightRect.height,
              }}
            />

            <motion.div
              aria-hidden="true"
              animate={
                shouldReduceMotion
                  ? undefined
                  : {
                      scale: [0.78, 1.08, 0.78],
                      opacity: [0.25, 0.72, 0.25],
                    }
              }
              transition={{ duration: 1.55, repeat: Infinity, ease: "easeInOut" }}
              className="pointer-events-none fixed z-[124] rounded-full border-2 border-amber-200/90 bg-amber-300/10 shadow-[0_0_40px_rgba(251,191,36,.45)]"
              style={{
                width: spotlightSize,
                height: spotlightSize,
                left: highlightRect.left + highlightRect.width / 2 - spotlightSize / 2,
                top: highlightRect.top + highlightRect.height / 2 - spotlightSize / 2,
              }}
            />

            {pointer && (
              <motion.div
                aria-hidden="true"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={
                  shouldReduceMotion
                    ? { opacity: 1, scale: 1 }
                    : pointer.motionAxis === "x"
                      ? { opacity: 1, scale: 1, x: [0, 8, 0] }
                      : { opacity: 1, scale: 1, y: [0, 8, 0] }
                }
                transition={{
                  opacity: { duration: 0.2 },
                  scale: { duration: 0.2 },
                  x: { duration: 0.85, repeat: Infinity, ease: "easeInOut" },
                  y: { duration: 0.85, repeat: Infinity, ease: "easeInOut" },
                }}
                className="pointer-events-none fixed z-[126] flex h-10 w-10 items-center justify-center rounded-full border border-amber-200 bg-amber-400 text-2xl font-black text-slate-950 shadow-[0_10px_30px_rgba(245,158,11,.45)]"
                style={pointer.style}
              >
                {pointer.glyph}
              </motion.div>
            )}
          </>
        )}

        <motion.div
          key={`${isDesktop ? "desktop" : "mobile"}-${stepIndex}`}
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.3,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="fixed z-[130] overflow-hidden rounded-[28px] border-2 border-amber-300/80 bg-slate-950/96 text-white shadow-[0_30px_90px_rgba(0,0,0,.55)] backdrop-blur-xl"
          style={{ ...tooltipStyle, width: cardWidth }}
        >
          <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-r from-amber-400/20 via-orange-500/12 to-rose-500/12 px-5 py-4">
            <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full border border-amber-300/20" />
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/12 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">
                <span aria-hidden="true">✦</span>
                CSBT Guide
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
                {stepIndex + 1}/{steps.length}
              </span>
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400"
                animate={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
              />
            </div>
          </div>

          <div className="p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
              {currentStep.eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight text-white">
              {currentStep.title}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
              {currentStep.description}
            </p>

            <div className="mt-5 grid grid-cols-[auto_1fr] gap-2.5">
              <button
                type="button"
                onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
                disabled={stepIndex === 0}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 text-sm font-black text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <span aria-hidden="true" className="mr-1.5">◀</span>
                Back
              </button>

              <button
                type="button"
                onClick={goNext}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-amber-200/60 bg-gradient-to-b from-amber-300 to-orange-500 px-5 text-sm font-black text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,.55),0_8px_0_rgba(154,52,18,.35),0_14px_28px_rgba(249,115,22,.25)] transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-1 active:shadow-[inset_0_1px_0_rgba(255,255,255,.45),0_3px_0_rgba(154,52,18,.35)]"
              >
                {isLastStep ? "Start exploring" : stepIndex === 0 ? "Start tour" : "Next"}
                <span aria-hidden="true" className="ml-2">▶</span>
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={onSkip}
                className="text-xs font-black text-slate-300 underline decoration-white/20 underline-offset-4 transition hover:text-white"
              >
                Skip for now
              </button>

              <button
                type="button"
                onClick={onDontShowAgain}
                className="inline-flex items-center gap-1.5 text-xs font-black text-slate-500 transition hover:text-rose-300"
              >
                <span aria-hidden="true">◉</span>
                Don’t show again
              </button>
            </div>

            <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-white/25">
              {isDesktop
                ? "PC: ← → to navigate · Esc to skip"
                : "Use Next / Back to move through the guide"}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
