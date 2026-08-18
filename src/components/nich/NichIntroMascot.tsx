"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import AuthCard from "../account/AuthCard";

type NichIntroMascotProps = {
  open: boolean;
  authRequired?: boolean;
  supabase: SupabaseClient | null;
  manualOpen?: boolean;
  onComplete: () => void;
  onSkip: () => void;
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
  { eyebrow:"Welcome to CSBT HUB", title:"Your trading hub, all in one place.", description:"CSBT combines values, inventory, trading tools, market information, community features, safer-trading resources, and Nich in one connected hub." },
  { eyebrow:"Main Navigation", title:"Everything is grouped by what you want to do.", description:"Use the sidebar like a game launcher. Each category can collapse, so the tools you need stay easy to scan without taking over the page.", target:"sidebar-container" },
  { eyebrow:"Start Here", title:"Begin with the essentials.", description:"Home, Values, and Inventory live here — explore CSBT, check item values, and keep track of what you own.", target:"group-start" },
  { eyebrow:"Trade", title:"Make, check, and review trades here.", description:"CSBT Exchange, Trade Calculator, Trade Opinions, and Trade History are grouped together so your trading workflow stays in one place.", target:"group-trade" },
  { eyebrow:"Market", title:"Follow the market without the noise.", description:"Demand and Wishlist & Alerts help you track market movement and keep an eye on items you care about.", target:"group-market" },
  { eyebrow:"Lounge", title:"This is where the community lives.", description:"Use CSBT Lounge to interact with traders, then jump to Trading Servers when you want more places to trade.", target:"group-lounge" },
  { eyebrow:"Help & Safety", title:"Learn safer trading and get support.", description:"Safe Trader Academy, Ask Nich, Feedback, and About are grouped here whenever you need guidance or help.", target:"group-help" },
  { eyebrow:"My CSBT", title:"Your account and activity live here.", description:"Profile contains your trading identity, while Notifications keeps your offers, alerts, and account activity together.", target:"group-account" },
  { eyebrow:"CSBT Exchange", title:"Find your next trade in CSBT Exchange.", description:"Browse live listings, use inventory-aware Smart Match, build offers, negotiate counteroffers, and continue accepted trades in Trade Rooms.", target:"nav-exchange" },
  { eyebrow:"Nich", title:"Not sure what to do? Ask Nich.", description:"Nich can help with value questions, trade questions, interpreting offers, and navigating CSBT HUB while you browse.", target:"nich-button" },
];
const mobileSteps: TourStep[] = [
  { eyebrow:"Welcome to CSBT HUB", title:"Your trading hub, built for mobile too.", description:"Values, trading, inventory, market tools, community features, and Nich are organized so the important actions stay easy to reach with one thumb." },
  { eyebrow:"Bottom Dock", title:"Your most-used tools stay within thumb reach.", description:"The mobile dock keeps your core actions available without copying the entire desktop sidebar onto a small screen.", target:"mobile-dock" },
  { eyebrow:"Values", title:"Check values quickly.", description:"Search GCash and Elve values and open detailed item pages with the rest of CSBT's value tools.", target:"nav-values" },
  { eyebrow:"CSBT Exchange", title:"Open the CSBT Exchange.", description:"Browse live listings, find inventory-aware matches, make offers, counter, and continue trades in Trade Rooms.", target:"nav-exchange" },
  { eyebrow:"Calculate", title:"Compare a trade before you decide.", description:"Build both sides of an offer and compare them using your selected value source.", target:"nav-calculator" },
  { eyebrow:"Inventory", title:"Keep track of what you own.", description:"Save items, quantities, and variants so CSBT can power inventory-aware tools around the site.", target:"nav-inventory" },
  { eyebrow:"More", title:"Everything else is organized inside More.", description:"Everything beyond the dock is organized in one categorized navigation hub. I’ll open it automatically on the next step.", target:"nav-more" },
  { eyebrow:"CSBT Navigation", title:"The full hub is still only one tap away.", description:"Start Here, Trade, Market, Lounge, Help & Safety, and My CSBT use the same organization as desktop without cramming every link into the bottom dock.", target:"mobile-more-panel" },
  { eyebrow:"Nich", title:"Need help while you browse? Ask Nich.", description:"Nich stays nearby for value questions, trade questions, and help finding the right tool in CSBT HUB.", target:"nich-button" },
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
  authRequired = false,
  supabase,
  manualOpen = false,
  onComplete,
  onSkip,
}: NichIntroMascotProps) {
  const shouldReduceMotion = useReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false,
  );
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const updateViewportMode = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    queueMicrotask(updateViewportMode);
    window.addEventListener("resize", updateViewportMode);
    return () => window.removeEventListener("resize", updateViewportMode);
  }, []);

  const steps = useMemo(
    () => (isDesktop ? desktopSteps : mobileSteps),
    [isDesktop],
  );
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];

  useEffect(() => {
    if (!open || authRequired || isDesktop) return;
    const shouldOpenMore = currentStep?.target === "mobile-more-panel";
    window.dispatchEvent(new CustomEvent("csbt-tour-more", { detail: { open: shouldOpenMore } }));
    return () => { if (shouldOpenMore) window.dispatchEvent(new CustomEvent("csbt-tour-more", { detail: { open: false } })); };
  }, [authRequired, currentStep?.target, isDesktop, open]);

  useEffect(() => {
    if (!open || authRequired || !isDesktop) {
      window.dispatchEvent(new CustomEvent("csbt-tour-sidebar-group", { detail: { action: "restore" } }));
      return;
    }
    if (currentStep?.target === "nav-exchange") window.dispatchEvent(new CustomEvent("csbt-tour-sidebar-group", { detail: { action: "open", groupId: "trade" } }));
    else window.dispatchEvent(new CustomEvent("csbt-tour-sidebar-group", { detail: { action: "restore" } }));
    return () => { if (currentStep?.target === "nav-exchange") window.dispatchEvent(new CustomEvent("csbt-tour-sidebar-group", { detail: { action: "restore" } })); };
  }, [authRequired, currentStep?.target, isDesktop, open]);


  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => cardRef.current?.focus({ preventScroll: true }), 0);
    return () => window.clearTimeout(timer);
  }, [open, stepIndex, isDesktop]);

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => setStepIndex(0));
      queueMicrotask(() => setHighlightRect(null));
      return;
    }

    queueMicrotask(() => setStepIndex(0));
  }, [authRequired, open, isDesktop]);

  useEffect(() => {
    if (!open || authRequired || !currentStep?.target) {
      queueMicrotask(() => setHighlightRect(null));
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
    const observer = new MutationObserver(() => updateRect());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.clearTimeout(timeout);
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
      observer.disconnect();
    };
  }, [authRequired, currentStep, open, shouldReduceMotion]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Account creation/sign-in is a hard gate and cannot be escaped.
      if (authRequired) return;
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
  }, [authRequired, onSkip, open, steps.length]);

  useEffect(() => {
    if (!open || !authRequired) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [authRequired, open]);

  if (!open || !currentStep) {
    return null;
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const isLastStep = stepIndex === steps.length - 1;
  const desktopWidth = authRequired ? 680 : 600;
  const cardWidth = Math.min(isDesktop ? desktopWidth : 430, viewportWidth - 24);
  const estimatedCardHeight = authRequired ? (isDesktop ? 610 : 650) : (isDesktop ? 470 : 520);

  let tooltipStyle: CSSProperties = {
    left: "50%",
    top: "50%",
    // Use the standalone CSS translate property instead of transform. Framer
    // Motion owns `transform` for the enter/exit animation, which previously
    // replaced translate(-50%, -50%) and left the account card offset to the
    // lower-right on desktop/in-app browsers.
    translate: "-50% -50%",
  };

  // On mobile we always keep the card centered in the visual viewport. This is
  // much safer inside Facebook/Roblox in-app browsers than trying to pin it to
  // highlighted controls near the edges.
  if (isDesktop && highlightRect && !authRequired) {
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
      left: "50%",
      top: "50%",
      translate: "-50% -50%",
    };
  }

  const pointer = !authRequired && highlightRect ? getPointerDetails(highlightRect) : null;
  const spotlightSize = !authRequired && highlightRect
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
        {!highlightRect || authRequired ? (
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

        {!authRequired && highlightRect && (
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
              className="pointer-events-none fixed z-[123] rounded-[20px] border border-amber-300/90 shadow-[0_0_28px_rgba(231,180,49,.28),inset_0_0_18px_rgba(231,180,49,.06)]"
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
                      scale: [0.9, 1.02, 0.9],
                      opacity: [0.16, 0.42, 0.16],
                    }
              }
              transition={{ duration: 1.55, repeat: Infinity, ease: "easeInOut" }}
              className="csbt-tour-ring pointer-events-none fixed z-[124] rounded-full border"
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
                      ? { opacity: 1, scale: 1, x: [0, 5, 0] }
                      : { opacity: 1, scale: 1, y: [0, 5, 0] }
                }
                transition={{
                  opacity: { duration: 0.2 },
                  scale: { duration: 0.2 },
                  x: { duration: 0.85, repeat: Infinity, ease: "easeInOut" },
                  y: { duration: 0.85, repeat: Infinity, ease: "easeInOut" },
                }}
                className="csbt-tour-pointer pointer-events-none fixed z-[126] flex h-9 w-9 items-center justify-center rounded-full border text-xl font-black"
                style={pointer.style}
              >
                {pointer.glyph}
              </motion.div>
            )}
          </>
        )}

        <motion.div
          ref={cardRef}
          tabIndex={-1}
          key={`${isDesktop ? "desktop" : "mobile"}-${stepIndex}`}
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.3,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="csbt-tour-card fixed z-[130] max-h-[calc(100dvh-24px)] overflow-y-auto rounded-[26px] border shadow-[var(--shadow-lg)] backdrop-blur-xl"
          style={{ ...tooltipStyle, width: cardWidth }}
        >
          <div className="csbt-tour-header relative overflow-hidden border-b px-5 py-4 sm:px-7 sm:py-5">
            <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full border border-amber-300/20" />
            <div className="flex items-center justify-between gap-3">
              <span className="csbt-tour-badge inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em]">
                <span aria-hidden="true">✦</span>
                CSBT Guide
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--foreground-muted)]">
                {authRequired ? "ACCOUNT" : `${stepIndex + 1}/${steps.length}`}
              </span>
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
              <motion.div
                className="csbt-tour-progress h-full rounded-full"
                animate={{ width: authRequired ? "8%" : `${((stepIndex + 1) / steps.length) * 100}%` }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
              />
            </div>
          </div>

          <div className="p-5 sm:p-7">
            {authRequired ? (
              <>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--brand-primary)]">
                  Account required
                </p>
                <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight text-[var(--foreground)] sm:text-3xl">
                  Create your CSBT HUB account before you continue.
                </h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-[var(--foreground-muted)] sm:text-[15px] sm:leading-7">
                  Your account connects the features that need a trading identity — inventory, wishlist, alerts, Exchange, notifications, saved trades, and your profile. Sign in or create an account to unlock CSBT HUB.
                </p>

                {supabase ? (
                  <div className="mt-5 overflow-hidden rounded-[24px] ring-1 ring-[var(--border)]">
                    <AuthCard supabase={supabase} compact />
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm font-bold text-rose-300">
                    CSBT account services are unavailable right now. Please try again shortly.
                  </div>
                )}

                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-3)] p-4">
                  <span aria-hidden="true" className="text-lg">🔒</span>
                  <p className="text-xs font-bold leading-5 text-[var(--foreground-muted)]">
                    Sign-in is required for new visitors and this step cannot be skipped. After you sign in, the one-time feature guide will continue automatically.
                  </p>
                </div>
              </>
            ) : (
              <>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--brand-primary)]">
                  {currentStep.eyebrow}
                </p>
                <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight text-[var(--foreground)] sm:text-3xl">
                  {currentStep.title}
                </h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-[var(--foreground-muted)] sm:text-[15px] sm:leading-7">
                  {currentStep.description}
                </p>

                <div className="mt-6 grid grid-cols-[auto_1fr] gap-2.5">
                  <button
                    type="button"
                    onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
                    disabled={stepIndex === 0}
                    className="inline-flex min-h-[52px] items-center justify-center rounded-[14px] border border-[var(--border-strong)] bg-[var(--surface-3)] px-5 text-sm font-black text-[var(--foreground)] transition hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <span aria-hidden="true" className="mr-1.5">◀</span>
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={goNext}
                    className="csbt-tour-primary inline-flex min-h-[52px] items-center justify-center rounded-[14px] border px-6 text-sm font-black shadow-[var(--shadow-gold)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[.98]"
                  >
                    {isLastStep ? "Finish guide" : stepIndex === 0 ? "Start tour" : "Next"}
                    <span aria-hidden="true" className="ml-2">▶</span>
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[var(--border)] pt-4">
                  <button
                    type="button"
                    onClick={onSkip}
                    className="text-xs font-black text-[var(--foreground-muted)] underline decoration-[var(--border-strong)] underline-offset-4 transition hover:text-[var(--foreground)]"
                  >
                    {manualOpen ? "Close guide" : "Skip guide"}
                  </button>

                  <span className="text-[10px] font-bold text-[var(--foreground-muted)] opacity-70">
                    You can reopen this anytime from Profile → Guide.
                  </span>
                </div>

                <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--foreground-muted)] opacity-60">
                  {isDesktop
                    ? "PC: ← → to navigate · Esc to close"
                    : "Use Next / Back to move through the guide"}
                </p>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
